#!/usr/bin/env python3
"""Publish gate for the unattended daily run: replaces the human approval step.

usage:
  python3 pipeline/autopublish.py <short_dir> [--dry-run] [--veto-minutes 120] [--publish-at RFC3339]

Every gate below must pass, or nothing is uploaded. The Short is uploaded private with a scheduled publish
time (default 12:00 America/New_York today; at least --veto-minutes after the upload), so the owner can still
delete or reschedule it in YouTube Studio before it goes public.

Gates:
  files      out/final.mp4, metadata.json, script.md, factcheck.md, review.md, voice.json exist
  metadata   title under 70 characters, ai_disclosure true, made_for_kids false, description has Sources: and Credits:
  voice      voice.json says verified (every content word heard as written)
  build      out/build_report.json: no problems, credit audit 0 misses, caption sync within 2 frames, at most 3 impacts a second
  captions   out/caption_sync.json (when present): every word within 2 frames
  flashes    out/pse.json (required for anime): at most 3 flashes in any second
  mix        out/mix.report.json: integrated loudness -14 LUFS plus or minus 1, true peak at or below -1.5 dBTP
  video      ffprobe: 1080x1920, 15 to 60 seconds
  quotes     pipeline/quotecheck.py refetches every source now and every quote still matches (exit 0)
  once       not already uploaded; no other Short scheduled within 20 hours of this one (one Short a day)

Writes <short_dir>/out/gate.json. On success, appends an auto_approved line to pipeline/log/queue.jsonl and runs
pipeline/youtube_upload.py (which writes upload.json and the published.jsonl line).
Exit 0: uploaded (or would be, with --dry-run). Exit 1: a gate failed, nothing uploaded. Exit 2: the upload failed.
"""
import argparse, json, math, subprocess, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
QUEUE = ROOT / "pipeline" / "log" / "queue.jsonl"
PUBLISHED = ROOT / "pipeline" / "log" / "published.jsonl"


def read_jsonl(p):
    if not p.exists():
        return []
    return [json.loads(l) for l in p.read_text().splitlines() if l.strip()]


def load(p):
    try:
        return json.loads(p.read_text())
    except (OSError, ValueError):
        return None


def parse_utc(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)


def publish_time(now, veto_minutes, override=None):
    if override:
        return parse_utc(override)
    ny = ZoneInfo("America/New_York")
    target = now.astimezone(ny).replace(hour=12, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    earliest = now + timedelta(minutes=veto_minutes)
    if target < earliest:  # a late run: keep the veto window, round up to the next quarter hour
        q = math.ceil(earliest.timestamp() / 900) * 900
        target = datetime.fromtimestamp(q, timezone.utc)
    return target


def gates(d, when, skip_quotes=False):
    fails, info = [], {}
    need = ["out/final.mp4", "metadata.json", "script.md", "factcheck.md", "review.md", "voice.json"]
    missing = [n for n in need if not (d / n).exists()]
    if missing:
        fails.append("files: missing " + ", ".join(missing))

    meta = load(d / "metadata.json") or {}
    title, desc = meta.get("title", ""), meta.get("description", "")
    if not title or len(title) >= 70:
        fails.append(f"metadata: title must be 1 to 69 characters (has {len(title)})")
    if meta.get("ai_disclosure") is not True:
        fails.append("metadata: ai_disclosure must be true")
    if meta.get("made_for_kids") is not False:
        fails.append("metadata: made_for_kids must be false")
    if "Sources:" not in desc or "Credits:" not in desc:
        fails.append("metadata: description needs a Sources: and a Credits: section")

    voice = load(d / "voice.json") or {}
    if voice.get("verified") is not True:
        fails.append("voice: voice.json is not verified")

    br = load(d / "out" / "build_report.json")
    if br is None:
        fails.append("build: out/build_report.json missing")
    else:
        info["style"] = br.get("style")
        if br.get("problems"):
            fails.append(f"build: {len(br['problems'])} problems")
        ca = br.get("creditAudit") or {}
        if ca.get("photoMisses", 1) or ca.get("illustrationMisses", 1):
            fails.append(f"build: credit audit misses {ca}")
        cs = br.get("captionSync") or {}
        if cs.get("maxAbsDelta", 99) > 2 or cs.get("oobWordFrames", 1):
            fails.append(f"build: caption sync {cs}")
        if br.get("maxImpactsPerSecond", 99) > 3:
            fails.append(f"build: {br.get('maxImpactsPerSecond')} impacts in one second")

    sync = load(d / "out" / "caption_sync.json")
    if sync is not None and (sync.get("maxAbsDiffFrames", 99) > 2 or sync.get("outsideTwoFrames")):
        fails.append(f"captions: max {sync.get('maxAbsDiffFrames')} frames off")

    pse = load(d / "out" / "pse.json")
    if pse is None and info.get("style") == "anime":
        fails.append("flashes: out/pse.json missing (run lab/ultra/anime/tools/pse.py)")
    elif pse is not None and pse.get("worst_flashes_per_second", 99) > 3:
        fails.append(f"flashes: {pse['worst_flashes_per_second']} in one second")

    mix = (load(d / "out" / "mix.report.json") or {}).get("final") or {}
    lufs, tp = mix.get("integrated_lufs"), mix.get("true_peak_dbtp")
    info["lufs"], info["true_peak"] = lufs, tp
    if lufs is None or not -15.0 <= lufs <= -13.0 or tp is None or tp > -1.5:
        fails.append(f"mix: {lufs} LUFS, {tp} dBTP (need -14 plus or minus 1, at or below -1.5)")

    video = d / "out" / "final.mp4"
    if video.exists():
        try:
            pr = json.loads(subprocess.run(
                ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
                 "-of", "json", str(video)], capture_output=True, text=True, check=True).stdout)
            w, h = pr["streams"][0]["width"], pr["streams"][0]["height"]
            secs = float(pr["format"]["duration"])
            info["video"] = f"{w}x{h}, {secs:.1f} s"
            if (w, h) != (1080, 1920) or not 15 <= secs <= 60:
                fails.append(f"video: {w}x{h}, {secs:.1f} s (need 1080x1920, 15 to 60 s)")
        except (subprocess.CalledProcessError, KeyError, IndexError, ValueError) as e:
            fails.append(f"video: ffprobe failed ({e})")

    if skip_quotes:
        info["quotes"] = "skipped (--skip-quotecheck)"
    else:
        r = subprocess.run([sys.executable, str(ROOT / "pipeline" / "quotecheck.py"), str(d)],
                           capture_output=True, text=True, cwd=ROOT)
        info["quotes"] = f"quotecheck exit {r.returncode}"
        if r.returncode != 0:
            fails.append(f"quotes: quotecheck exit {r.returncode}: {(r.stdout + r.stderr).strip()[-400:]}")

    if (d / "upload.json").exists():
        fails.append("once: upload.json exists (already uploaded)")
    for rec in read_jsonl(PUBLISHED):
        if rec.get("short_id") == d.name:
            fails.append(f"once: {d.name} is already in published.jsonl ({rec.get('video_id')})")
        at = rec.get("publish_at")
        if at and abs((parse_utc(at) - when).total_seconds()) < 20 * 3600:
            fails.append(f"once: {rec.get('short_id')} is already scheduled at {at}, within 20 hours")
    return fails, info


def main():
    ap = argparse.ArgumentParser(description="Publish gate for the unattended daily run.")
    ap.add_argument("short_dir")
    ap.add_argument("--dry-run", action="store_true", help="run every gate and the uploader's dry run; upload nothing")
    ap.add_argument("--veto-minutes", type=int, default=120, help="minimum minutes between upload and going public")
    ap.add_argument("--publish-at", help="override the publish time (RFC 3339 UTC)")
    ap.add_argument("--skip-quotecheck", action="store_true", help="tests only; never in a real run")
    a = ap.parse_args()
    d = Path(a.short_dir).resolve()
    rel = d.relative_to(ROOT) if d.is_relative_to(ROOT) else d
    now = datetime.now(timezone.utc)
    when = publish_time(now, a.veto_minutes, a.publish_at)
    publish_at = when.strftime("%Y-%m-%dT%H:%M:%SZ")
    fails, info = gates(d, when, a.skip_quotecheck)
    report = {"checked": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "publish_at": publish_at, "passed": not fails,
              "fails": fails, "info": info, "dry_run": a.dry_run}
    (d / "out").mkdir(exist_ok=True)
    (d / "out" / "gate.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if fails:
        print(f"NOT UPLOADED: {len(fails)} gate(s) failed", file=sys.stderr)
        sys.exit(1)
    meta = load(d / "metadata.json")
    up = [sys.executable, str(ROOT / "pipeline" / "youtube_upload.py"), str(d), "--publish-at", publish_at]
    if a.dry_run:
        sys.exit(subprocess.run(up + ["--dry-run"], cwd=ROOT).returncode)
    line = {"queued": report["checked"], "short_id": d.name, "dir": str(rel), "status": "auto_approved",
            "approved": report["checked"], "approved_by": "autopublish gates", "publish_at": publish_at,
            "series": meta.get("series"), "title": meta.get("title"), "video": f"{rel}/out/final.mp4",
            "review": f"{rel}/review.md"}
    with QUEUE.open("a") as f:
        f.write(json.dumps(line, ensure_ascii=False) + "\n")
    r = subprocess.run(up, cwd=ROOT)
    sys.exit(0 if r.returncode == 0 else 2)


if __name__ == "__main__":
    main()
