#!/usr/bin/env python3
"""Which series may run on a given day (PLAYBOOK.md: never two of the same series in a row; rotate the four).

usage:
  python3 pipeline/series_rotation.py [--date 2026-10-20] [--json] [--log pipeline/log/published.jsonl]

Reads pipeline/log/published.jsonl (written by youtube_upload.py or log.py published). For the date:
- the Short scheduled just before it and the one scheduled just after it (a gap can be filled later) block their series;
- the allowed series are ordered by how long ago each last ran (never used first), so the four rotate;
- if a Short is already scheduled for that date, it says so.
It also lists the titles of the last 14 days, for the rule that no title pattern repeats within 14 days.
Exit 0 always (it advises; it does not block).
"""
import argparse, json, pathlib, sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from log import PUBLISHED, SERIES, read_jsonl  # noqa: E402


def advise(entries, date):
    rows = sorted([e for e in entries if e.get("series") and e.get("date")], key=lambda e: (e.get("publish_at") or e["date"]))
    before = [e for e in rows if e["date"] < date]
    after = [e for e in rows if e["date"] > date]
    same = [e for e in rows if e["date"] == date]
    prev, nxt = (before[-1] if before else None), (after[0] if after else None)
    blocked = {}
    if prev:
        blocked[prev["series"]] = f"ran on {prev['date']} ({prev.get('short_id')})"
    if nxt:
        blocked.setdefault(nxt["series"], f"scheduled on {nxt['date']} ({nxt.get('short_id')})")
    last_used = {s: max((e["date"] for e in before if e["series"] == s), default=None) for s in SERIES}
    allowed = [s for s in SERIES if s not in blocked]
    allowed.sort(key=lambda s: (last_used[s] is not None, last_used[s] or "", SERIES.index(s)))
    since = (datetime.fromisoformat(date) - timedelta(days=14)).strftime("%Y-%m-%d")
    recent = [{"date": e["date"], "series": e["series"], "title": e.get("title")} for e in before if e["date"] >= since]
    return {"date": date, "allowed": allowed, "prefer": allowed[0] if allowed else None, "blocked": blocked,
            "last_used": last_used, "already_scheduled": [{"short_id": e.get("short_id"), "series": e["series"]} for e in same],
            "recent_titles_14d": recent, "published_lines": len(rows)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"), help="YYYY-MM-DD (default today, UTC)")
    ap.add_argument("--log", default=str(PUBLISHED))
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    r = advise(read_jsonl(pathlib.Path(a.log)), a.date)
    if a.json:
        print(json.dumps(r, indent=1, ensure_ascii=False))
        return
    print(f"{a.date}: allowed {', '.join(r['allowed'])}; prefer {r['prefer']}")
    for s, why in r["blocked"].items():
        print(f"  not {s}: {why}")
    for s in SERIES:
        print(f"  last {s:<18} {r['last_used'][s] or 'never'}")
    if r["already_scheduled"]:
        print("  already scheduled that day: " + ", ".join(f"{x['short_id']} ({x['series']})" for x in r["already_scheduled"]))
    if r["published_lines"] == 0:
        print(f"  note: {a.log} has no lines yet; every series is allowed")
    for t in r["recent_titles_14d"]:
        print(f"  14d  {t['date']}  {t['series']:<18} {t['title']}")


if __name__ == "__main__":
    main()
