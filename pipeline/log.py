#!/usr/bin/env python3
"""Append-only pipeline logs: pipeline/log/runs.jsonl (one line per run) and pipeline/log/published.jsonl.

usage:
  python3 pipeline/log.py run <short_dir> --outcome uploaded [--series "By the Numbers"] [--short-id ID] [--date YYYY-MM-DD]
                          [--cost step=USD ...] [--duration step=SECONDS ...] [--note TEXT]
  python3 pipeline/log.py published <short_dir>      # from <short_dir>/upload.json and metadata.json
  python3 pipeline/log.py show [--days 7]            # recent runs, spend per step, spend against the weekly budget

run: costs and durations are collected from <short_dir> when present, then --cost/--duration add or override:
  voice.json   -> costs.voice (cost.total_usd or usd), durations.voice (elapsed_s), takes, verified
  costs.json   -> any step: {"step": {"usd": 0.01, "seconds": 12.3}, ...}  (a convention other tools may write)
published: one line per video_id; a second call for the same video_id does nothing (safe to re-run).
Lines are never rewritten or deleted. Outcomes: researched, scripted, voiced, rendered, approved, uploaded,
published, rejected, failed, skipped.
"""
import argparse, json, os, pathlib, sys
from datetime import datetime, timedelta, timezone

LOG_DIR = pathlib.Path(os.environ.get("DOWNLINK_LOG_DIR") or pathlib.Path(__file__).resolve().parent / "log")  # env override for tests
RUNS = LOG_DIR / "runs.jsonl"
PUBLISHED = LOG_DIR / "published.jsonl"
SERIES = ["Launch Day", "Just Discovered", "How Does That Work", "By the Numbers"]
OUTCOMES = ["researched", "scripted", "voiced", "rendered", "approved", "uploaded", "published", "rejected", "failed", "skipped"]
WEEKLY_BUDGET_USD = 4.0  # PLAYBOOK.md, Spending


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def norm_series(s):
    if not s:
        return None
    for x in SERIES:
        if x.lower() == s.strip().lower():
            return x
    raise SystemExit(f"unknown series {s!r}; expected one of {SERIES}")


def read_jsonl(path):
    if not path.exists():
        return []
    out = []
    for i, line in enumerate(path.read_text().splitlines(), 1):
        if line.strip():
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                print(f"warning: {path}:{i} is not JSON; skipped", file=sys.stderr)
    return out


def _append(path, rec):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a") as f:
        f.write(json.dumps(rec, ensure_ascii=False, sort_keys=False) + "\n")


def _meta(d):
    f = d / "metadata.json"
    return json.loads(f.read_text()) if f.exists() else {}


def collect_costs(d):
    costs, durs, extra = {}, {}, {}
    vj = d / "voice.json"
    if vj.exists():
        v = json.loads(vj.read_text())
        usd = (v.get("cost") or {}).get("total_usd", v.get("usd"))
        usd = (usd or 0) + sum(s.get("usd") or 0 for s in v.get("splices", []))
        if usd:
            costs["voice"] = round(usd, 6)
        if v.get("elapsed_s"):
            durs["voice"] = v["elapsed_s"]
        extra["voice"] = {"takes": v.get("takes_tried"), "verified": v.get("verified"), "seconds": v.get("seconds"),
                          "estimated": (v.get("cost") or {}).get("estimated")}
    cj = d / "costs.json"
    if cj.exists():
        for step, x in json.loads(cj.read_text()).items():
            if x.get("usd") is not None:
                costs[step] = x["usd"]
            if x.get("seconds") is not None:
                durs[step] = x["seconds"]
    return costs, durs, extra


def _kv(items, what):
    out = {}
    for it in items or []:
        if "=" not in it:
            raise SystemExit(f"--{what} wants step=value, got {it!r}")
        k, v = it.split("=", 1)
        out[k] = float(v)
    return out


def append_run(short_dir, outcome, series=None, short_id=None, date=None, cost=None, duration=None, note=None):
    d = pathlib.Path(short_dir)
    if outcome not in OUTCOMES:
        raise SystemExit(f"unknown outcome {outcome!r}; expected one of {OUTCOMES}")
    meta = _meta(d)
    costs, durs, extra = collect_costs(d)
    costs.update(cost or {})
    durs.update(duration or {})
    rec = {"logged": now_iso(), "date": date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
           "short_id": short_id or d.name, "series": norm_series(series or meta.get("series")),
           "title": meta.get("title"), "outcome": outcome,
           "costs_usd": costs, "cost_total_usd": round(sum(costs.values()), 6), "durations_s": durs,
           "details": extra or None, "note": note, "short_dir": str(d)}
    _append(RUNS, rec)
    return rec


def append_published(short_dir, upload=None, meta=None):
    """One line per video_id. Returns the record, or None when the video is already logged."""
    d = pathlib.Path(short_dir)
    upload = upload or json.loads((d / "upload.json").read_text())
    meta = meta if meta is not None else _meta(d)
    if any(r.get("video_id") == upload["video_id"] for r in read_jsonl(PUBLISHED)):
        return None
    when = upload.get("publish_at") or upload.get("uploaded_at")
    rec = {"logged": now_iso(), "date": when[:10], "publish_at": upload.get("publish_at"),
           "short_id": d.name, "series": norm_series(meta.get("series")), "title": meta.get("title"),
           "video_id": upload["video_id"], "url": upload.get("url"), "privacy_at_upload": upload.get("privacy"),
           "uploaded_at": upload.get("uploaded_at"), "short_dir": str(d)}
    if not rec["series"]:
        print(f"warning: {d / 'metadata.json'} has no series; series_rotation.py cannot use this line", file=sys.stderr)
    _append(PUBLISHED, rec)
    return rec


def show(days):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    runs = [r for r in read_jsonl(RUNS) if r.get("date", "") >= since]
    pub = [r for r in read_jsonl(PUBLISHED) if r.get("date", "") >= since]
    per_step = {}
    for r in runs:
        for k, v in (r.get("costs_usd") or {}).items():
            per_step[k] = per_step.get(k, 0) + v
    total = sum(per_step.values())
    print(f"last {days} days (since {since}): {len(runs)} runs, {len(pub)} published")
    for r in runs[-15:]:
        print(f"  {r['date']}  {r['short_id']:<24} {r.get('series') or '-':<18} {r['outcome']:<9} {r.get('cost_total_usd', 0):.4f} USD")
    for k, v in sorted(per_step.items()):
        print(f"  spend {k:<12} {v:.4f} USD")
    weekly = total * 7 / days if days else total
    print(f"  spend total  {total:.4f} USD (about {weekly:.2f} USD per week; budget {WEEKLY_BUDGET_USD:.2f})")
    if weekly > WEEKLY_BUDGET_USD:
        print("  OVER BUDGET")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="append one run line")
    r.add_argument("short_dir")
    r.add_argument("--outcome", required=True, choices=OUTCOMES)
    r.add_argument("--series")
    r.add_argument("--short-id")
    r.add_argument("--date")
    r.add_argument("--cost", action="append", help="step=USD")
    r.add_argument("--duration", action="append", help="step=SECONDS")
    r.add_argument("--note")
    p = sub.add_parser("published", help="append the published line from upload.json")
    p.add_argument("short_dir")
    s = sub.add_parser("show", help="recent runs and spend")
    s.add_argument("--days", type=int, default=7)
    a = ap.parse_args()
    if a.cmd == "run":
        rec = append_run(a.short_dir, a.outcome, a.series, a.short_id, a.date, _kv(a.cost, "cost"), _kv(a.duration, "duration"), a.note)
        print(json.dumps(rec, indent=1, ensure_ascii=False))
    elif a.cmd == "published":
        rec = append_published(a.short_dir)
        print(json.dumps(rec, indent=1, ensure_ascii=False) if rec else "already logged")
    else:
        show(a.days)


if __name__ == "__main__":
    main()
