#!/usr/bin/env python3
"""Upload one approved Short to Signal Delay as private with a scheduled publish time.

usage:
  python3 pipeline/youtube_upload.py <short_dir> --publish-at 2026-10-16T15:00:00Z [--dry-run]

<short_dir> holds out/final.mp4 and metadata.json (title, description, tags, ai_disclosure,
made_for_kids). Credentials come from the environment, never from the repo:
  YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN   (the Signal Delay token from Hermes' ytmint.py)
The script never prints them. --dry-run prints the request body and uploads nothing.
On success it writes upload.json in <short_dir> with the video ID and the schedule.
"""
import argparse, json, os, sys, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

TOKEN_URL = "https://oauth2.googleapis.com/token"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
CATEGORY_SCIENCE_TECH = "28"


def body_for(meta, publish_at):
    return {
        "snippet": {
            "title": meta["title"],
            "description": meta["description"],
            "tags": meta.get("tags", []),
            "categoryId": CATEGORY_SCIENCE_TECH,
            "defaultLanguage": "en",
            "defaultAudioLanguage": "en",
        },
        "status": {
            "privacyStatus": "private",
            "publishAt": publish_at,
            "selfDeclaredMadeForKids": bool(meta.get("made_for_kids", False)),
            "containsSyntheticMedia": bool(meta.get("ai_disclosure", True)),
            "embeddable": True,
            "license": "youtube",
        },
    }


def check(meta, video, publish_at):
    errs = []
    if len(meta["title"]) > 100: errs.append("title over 100 characters")
    if len(meta["description"]) > 5000: errs.append("description over 5000 characters")
    if sum(len(t) + 1 for t in meta.get("tags", [])) > 500: errs.append("tags over 500 characters")
    if "<" in meta["description"] or ">" in meta["description"]: errs.append("description contains < or >")
    if not video.exists(): errs.append(f"missing {video}")
    when = datetime.fromisoformat(publish_at.replace("Z", "+00:00"))
    if when <= datetime.now(timezone.utc): errs.append("publish time is in the past")
    return errs


def access_token():
    need = ["YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"]
    missing = [k for k in need if not os.environ.get(k)]
    if missing:
        sys.exit("missing environment variables: " + ", ".join(missing))
    data = urllib.parse.urlencode({
        "client_id": os.environ["YT_CLIENT_ID"],
        "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": os.environ["YT_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }).encode()
    with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=data)) as r:
        return json.load(r)["access_token"]


def upload(video, body, token):
    size = video.stat().st_size
    init = urllib.request.Request(UPLOAD_URL, data=json.dumps(body).encode(), method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": str(size),
    })
    with urllib.request.urlopen(init) as r:
        session = r.headers["Location"]
    put = urllib.request.Request(session, data=video.read_bytes(), method="PUT", headers={
        "Authorization": f"Bearer {token}", "Content-Type": "video/mp4", "Content-Length": str(size)})
    with urllib.request.urlopen(put, timeout=600) as r:
        return json.load(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("short_dir")
    ap.add_argument("--publish-at", required=True, help="RFC 3339 UTC, e.g. 2026-10-16T15:00:00Z")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    d = Path(a.short_dir)
    meta = json.loads((d / "metadata.json").read_text())
    video = d / "out" / "final.mp4"
    body = body_for(meta, a.publish_at)
    errs = check(meta, video, a.publish_at)
    if errs:
        sys.exit("not uploading: " + "; ".join(errs))
    if (d / "upload.json").exists():
        sys.exit(f"not uploading: {d / 'upload.json'} exists (already uploaded)")
    if a.dry_run:
        print(json.dumps(body, indent=2, ensure_ascii=False))
        print(f"video: {video} ({video.stat().st_size / 1e6:.1f} MB)")
        return
    res = upload(video, body, access_token())
    rec = {"video_id": res["id"], "url": f"https://youtube.com/shorts/{res['id']}",
           "publish_at": a.publish_at, "uploaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "privacy": res["status"]["privacyStatus"]}
    (d / "upload.json").write_text(json.dumps(rec, indent=2) + "\n")
    print(json.dumps(rec, indent=2))


if __name__ == "__main__":
    main()
