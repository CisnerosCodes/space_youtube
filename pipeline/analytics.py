#!/usr/bin/env python3
"""Pull per-Short analytics and compute the PLAYBOOK review-gate metrics.

usage:
  python3 pipeline/analytics.py [--date 2026-10-25] [--videos ID,ID] [--all-uploads] [--start 2026-10-17] [--reach]
  python3 pipeline/analytics.py --dry-run            # print the API requests, call nothing
  python3 pipeline/analytics.py --fixture [file]     # run on canned responses (default pipeline/fixtures/analytics_fixture.json)

Credentials: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (the channel token minted with youtube.upload, youtube and
yt-analytics.readonly: the Analytics and Reporting APIs need the last one, videos.list the youtube scope). Never printed.

Videos: the video_ids in pipeline/log/published.jsonl, or --videos, or --all-uploads (the channel's uploads playlist).
Writes pipeline/log/analytics/<date>.json and pipeline/log/review.md (fixture runs write under pipeline/log/fixture/).

What the APIs expose for Shorts (read on Oct 19, 2026 in Google's docs: developers.google.com/youtube/analytics/metrics,
/channel_reports, /dimensions, /revision_history and /youtube/reporting/v1/reports/channel_reports):
  available  views                  since Aug 27, 2026 a view counts when playback starts (first frame, autoplay too);
                                    for Shorts this already applied from Mar 31, 2025 (plays and replays).
  available  engagedViews           the old count: playback past the first frame or a tap to play. Core metric.
  available  averageViewDuration, averageViewPercentage (excludes looping-clip traffic), estimatedMinutesWatched,
             subscribersGained, subscribersLost, likes, comments, shares   (per video, per day: dimensions=day, filters=video==ID)
  available  audienceWatchRatio, relativeRetentionPerformance by elapsedVideoTimeRatio (the retention curve, one video per
             query): gives retention at 15 s directly. audienceWatchRatio is plays of that moment / views, so replays can
             push it over 1.0, and the denominator is the new "views". Low-traffic videos may return no rows.
  available  insightTrafficSourceType = SHORTS ("referred by swiping vertically from the previous video in the Shorts
             viewing experience"): how many views came from the Shorts feed.
  available  creatorContentType = SHORTS (dimension to split Shorts from long-form in channel reports).
  available  video_thumbnail_impressions, video_thumbnail_impressions_ctr: Reporting API (bulk) reach reports
             channel_reach_basic_a1 (since Jan 15, 2026). A job must exist before data accrues; --reach creates it.
             These are thumbnail impressions ("thumbnail is displayed"), not Shorts-feed impressions.
  NOT available  "Stayed to watch" vs "Swiped away" (Studio only; no API metric or dimension mentions swiping away),
             Shorts-feed impressions, and the "Shown in feed" count. Read these in Studio by hand.
"""
import argparse, csv, io, json, os, pathlib, re, statistics, sys, urllib.parse
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import log as runlog  # noqa: E402

ANALYTICS = "https://youtubeanalytics.googleapis.com/v2/reports"
DATA = "https://www.googleapis.com/youtube/v3"
REPORTING = "https://youtubereporting.googleapis.com/v1"
TOKEN_URL = "https://oauth2.googleapis.com/token"
DAILY_METRICS = ["views", "engagedViews", "estimatedMinutesWatched", "averageViewDuration", "averageViewPercentage",
                 "subscribersGained", "subscribersLost", "likes", "comments", "shares"]
FALLBACK_METRICS = [m for m in DAILY_METRICS if m != "engagedViews"]
REACH_REPORT = "channel_reach_basic_a1"
FIXTURE = pathlib.Path(__file__).resolve().parent / "fixtures" / "analytics_fixture.json"
GATE = {"median_views": 1000, "subs_per_1000": 3.0, "retention_15s_pct": 70.0, "shorts_needed": 30}


# ---------- transport ----------

class Live:
    def __init__(self):
        need = ["YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"]
        missing = [k for k in need if not os.environ.get(k)]
        if missing:
            sys.exit("missing environment variables: " + ", ".join(missing))
        import urllib.request
        self.req = urllib.request
        data = urllib.parse.urlencode({"client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
                                       "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
        with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=data), timeout=30) as r:
            tok = json.load(r)
        self.token = tok["access_token"]
        self.scopes = tok.get("scope", "")

    def get(self, url, params=None, raw=False, method="GET", body=None):
        u = url + ("?" + urllib.parse.urlencode(params) if params else "")
        h = {"Authorization": f"Bearer {self.token}"}
        data = None
        if body is not None:
            data = json.dumps(body).encode(); h["Content-Type"] = "application/json"
        try:
            with self.req.urlopen(self.req.Request(u, headers=h, data=data, method=method), timeout=60) as r:
                b = r.read()
        except self.req.HTTPError as e:
            raise ApiError(e.code, e.read()[:600].decode("utf-8", "replace"), url) from None
        return b.decode("utf-8", "replace") if raw else json.loads(b)


class ApiError(Exception):
    def __init__(self, code, body, url):
        super().__init__(f"HTTP {code} {url}: {body}")
        self.code = code


class DryRun:
    scopes = "(dry run)"

    def get(self, url, params=None, raw=False, method="GET", body=None):
        print(method, url + ("?" + urllib.parse.urlencode(params) if params else ""), json.dumps(body) if body else "")
        if "videos" in url and "youtube/v3" in url:
            ids = (params or {}).get("id", "").split(",")
            return {"items": [{"id": i, "snippet": {"title": "(dry run)", "publishedAt": "2026-10-17T16:00:00Z"},
                               "contentDetails": {"duration": "PT36S"}, "statistics": {}} for i in ids if i]}
        return {"rows": [], "columnHeaders": [], "jobs": [], "reports": [], "items": []}


class Fixture:
    """Answers from a JSON file of canned API responses (synthetic numbers; see the file's note)."""
    scopes = "(fixture)"

    def __init__(self, path):
        self.f = json.loads(pathlib.Path(path).read_text())

    def get(self, url, params=None, raw=False, method="GET", body=None):
        p = params or {}
        if url.endswith("/videos"):
            ids = set(p["id"].split(","))
            return {"items": [v for v in self.f["videos.list"]["items"] if v["id"] in ids]}
        if url == ANALYTICS:
            vid = re.search(r"video==([\w-]+)", p.get("filters", "")).group(1)
            dims = p.get("dimensions", "")
            kind = {"day": "daily", "": "totals", "elapsedVideoTimeRatio": "retention", "insightTrafficSourceType": "traffic"}[dims]
            r = self.f["reports"].get(vid, {}).get(kind)
            if r is None:
                return {"columnHeaders": [], "rows": []}
            return r
        if url.endswith("/jobs") and method == "GET":
            return self.f.get("reporting.jobs", {"jobs": []})
        if "/reports" in url and url.startswith(REPORTING):
            return self.f.get("reporting.reports", {"reports": []})
        if url.startswith("fixture://"):
            return self.f["reporting.csv"][url]
        raise KeyError(url)


# ---------- queries ----------

def rows(resp):
    cols = [c["name"] for c in resp.get("columnHeaders", [])]
    return [dict(zip(cols, r)) for r in resp.get("rows", []) or []]


def query(api, video, start, end, dims, metrics, extra=None):
    p = {"ids": "channel==MINE", "startDate": start, "endDate": end, "metrics": ",".join(metrics), "filters": f"video=={video}"}
    if dims:
        p["dimensions"] = dims
    if dims == "day":
        p["sort"] = "day"
    p.update(extra or {})
    return api.get(ANALYTICS, p)


def metrics_query(api, video, start, end, dims):
    """Try with engagedViews; if the API refuses the combination (400), retry without it and say so."""
    try:
        return rows(query(api, video, start, end, dims, DAILY_METRICS)), None
    except ApiError as e:
        if e.code != 400:
            raise
        return rows(query(api, video, start, end, dims, FALLBACK_METRICS)), f"engagedViews refused: {e}"


def iso_duration(s):
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    if not m:
        return None
    d, h, mi, se = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + se


def at_ratio(curve, r):
    """Linear interpolation of audienceWatchRatio at elapsed ratio r."""
    pts = sorted((float(c["elapsedVideoTimeRatio"]), float(c["audienceWatchRatio"])) for c in curve if c.get("audienceWatchRatio") is not None)
    if not pts:
        return None
    if r <= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= r <= x1:
            return y0 + (y1 - y0) * (r - x0) / (x1 - x0) if x1 > x0 else y0
    return pts[-1][1]


def video_ids(api, a):
    if a.videos:
        return [v.strip() for v in a.videos.split(",") if v.strip()]
    if a.all_uploads:
        ch = api.get(f"{DATA}/channels", {"part": "contentDetails", "mine": "true"})
        pl = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        ids, tok = [], None
        while True:
            p = {"part": "contentDetails", "playlistId": pl, "maxResults": 50}
            if tok:
                p["pageToken"] = tok
            r = api.get(f"{DATA}/playlistItems", p)
            ids += [i["contentDetails"]["videoId"] for i in r.get("items", [])]
            tok = r.get("nextPageToken")
            if not tok:
                return ids
    return [r["video_id"] for r in runlog.read_jsonl(runlog.PUBLISHED) if r.get("video_id")]


def reach(api, ids, setup):
    """Thumbnail impressions from the Reporting API reach report (bulk CSV). Creates the job with --reach."""
    out = {"report_type": REACH_REPORT, "by_video": {}}
    jobs = api.get(f"{REPORTING}/jobs").get("jobs", [])
    job = next((j for j in jobs if j.get("reportTypeId") == REACH_REPORT), None)
    if not job and setup:
        job = api.get(f"{REPORTING}/jobs", method="POST", body={"reportTypeId": REACH_REPORT, "name": "downlink-cat-reach"})
        out["note"] = "reporting job created now; YouTube generates the first reports within about 48 hours"
    if not job:
        out["note"] = "no reporting job for the reach report; run with --reach once to create it"
        return out
    out["job_id"] = job.get("id")
    reps = api.get(f"{REPORTING}/jobs/{job['id']}/reports").get("reports", [])
    want = set(ids)
    for rep in reps:
        text = api.get(rep["downloadUrl"], raw=True)
        for row in csv.DictReader(io.StringIO(text)):
            if row.get("video_id") in want:
                v = out["by_video"].setdefault(row["video_id"], {"thumbnail_impressions": 0, "ctr_weighted": 0.0})
                imp = float(row.get("video_thumbnail_impressions") or 0)
                v["thumbnail_impressions"] += imp
                v["ctr_weighted"] += imp * float(row.get("video_thumbnail_impressions_ctr") or 0)
    for v in out["by_video"].values():
        v["thumbnail_ctr"] = round(v.pop("ctr_weighted") / v["thumbnail_impressions"], 4) if v["thumbnail_impressions"] else None
    out["reports_read"] = len(reps)
    return out


# ---------- review gate ----------

def fmt(x, nd=1):
    return "n/a" if x is None else (f"{x:,.{nd}f}" if isinstance(x, float) else f"{x:,}")


def review(doc):
    vids = [v for v in doc["videos"] if v.get("totals")]
    n = len(vids)
    views = [v["totals"].get("views", 0) or 0 for v in vids]
    engaged = [v["totals"].get("engagedViews") for v in vids if v["totals"].get("engagedViews") is not None]
    subs = sum(v["totals"].get("subscribersGained", 0) or 0 for v in vids)
    lost = sum(v["totals"].get("subscribersLost", 0) or 0 for v in vids)
    tv = sum(views)
    med_views = statistics.median(views) if views else None
    subs_k = subs / tv * 1000 if tv else None
    r15 = [v["retention"]["at_15s_pct"] for v in vids if (v.get("retention") or {}).get("at_15s_pct") is not None]
    avp = [v["totals"].get("averageViewPercentage") for v in vids if v["totals"].get("averageViewPercentage") is not None]
    if r15:
        ret, ret_label = statistics.median(r15), f"retention at 15 s (median of {len(r15)} retention curves, audienceWatchRatio)"
    elif avp:
        ret, ret_label = statistics.median(avp), "PROXY: median average view percentage (no retention curve returned); not retention at 15 s"
    else:
        ret, ret_label = None, "no data"

    def mark(val, target):
        return "n/a" if val is None else ("PASS" if val > target else "MISS")
    L = []
    title = "Review gate" + (" (FIXTURE DATA, synthetic)" if doc.get("fixture") else "")
    L += [f"# {title}", "", f"Generated {doc['generated']} from `{doc['file']}`. Shorts with data: {n}. "
          f"The gate applies after the first {GATE['shorts_needed']} Shorts"
          + (f"; with {n} it is preliminary." if n < GATE["shorts_needed"] else "."), ""]
    L += ["| Metric | Value | Target | Result | Source |", "|---|---|---|---|---|",
          f"| Median views per Short | {fmt(med_views, 0) if med_views is not None else 'n/a'} | above 1,000 | {mark(med_views, GATE['median_views'])} | Analytics `views` (plays from the first frame) |",
          f"| Subscribers per 1,000 views | {fmt(subs_k, 2) if subs_k is not None else 'n/a'} | above 3 | {mark(subs_k, GATE['subs_per_1000'])} | subscribersGained / views x 1,000 ({subs} gained, {lost} lost, {tv:,} views) |",
          f"| Retention at 15 s | {fmt(ret) + '%' if ret is not None else 'n/a'} | above 70% | {mark(ret, GATE['retention_15s_pct'])} | {ret_label} |",
          "| Stayed to watch vs swiped away | not in the API | (track) | read in Studio | Studio only |", ""]
    if engaged:
        L += [f"Median engaged views per Short: {fmt(statistics.median(engaged), 0)} (`engagedViews`, the pre-2025 count; for reference).", ""]
    L += ["## Per Short", "", "| Date | Series | Title | Length | Views | Engaged | Avg view % | Avg dur s | Ret 15 s | Subs +/- | From Shorts feed |",
          "|---|---|---|---|---|---|---|---|---|---|---|"]
    for v in sorted(vids, key=lambda v: v.get("published_at") or ""):
        t = v["totals"]; r = v.get("retention") or {}; tr = v.get("traffic") or {}
        feed = tr.get("SHORTS", {}).get("views") if tr else None
        share = f"{feed / t['views'] * 100:.0f}%" if feed is not None and t.get("views") else "n/a"
        L.append(f"| {(v.get('published_at') or '')[:10]} | {v.get('series') or '-'} | {(v.get('title') or v['video_id'])[:60]} | "
                 f"{v.get('duration_s') or '?'} s | {fmt(t.get('views'))} | {fmt(t.get('engagedViews'))} | {fmt(t.get('averageViewPercentage'))} | "
                 f"{fmt(t.get('averageViewDuration'))} | {fmt(r.get('at_15s_pct')) + '%' if r.get('at_15s_pct') is not None else 'n/a'} | "
                 f"{t.get('subscribersGained', 0)}/-{t.get('subscribersLost', 0)} | {share} |")
    rv = (doc.get("reach") or {}).get("by_video") or {}
    if doc.get("reach"):
        L += ["", "Thumbnail impressions (Reporting API `channel_reach_basic_a1`; thumbnails shown, not Shorts-feed impressions): "
              + ("; ".join(f"{k}: {fmt(v['thumbnail_impressions'], 0)}, CTR {fmt(v['thumbnail_ctr'] * 100 if v['thumbnail_ctr'] is not None else None, 1)}%" for k, v in rv.items()) or "no rows yet")
              + (f" ({doc['reach']['note']})" if doc["reach"].get("note") else "")]
    L += ["", "## How to read this", "",
          "- Views: since Aug 27, 2026 YouTube counts a view when playback starts (first frame, autoplay included); Shorts have counted plays and replays since Mar 31, 2025. Studio's Content tab shows the same number.",
          "- Retention at 15 s is `audienceWatchRatio` interpolated at 15 s / length on the curve from the Analytics API. It is plays of that moment divided by views, so replays (Shorts loop) can push it above 100%. When no curve comes back (low traffic), the table uses average view percentage instead and says PROXY.",
          "- Stayed to watch / swiped away, Shorts-feed impressions: not exposed by any API (Oct 19, 2026); copy them from Studio by hand if needed.",
          "- Data lags 48 to 72 hours; recent days are incomplete.",
          "- If any target is missed after 30 Shorts, change the format before adding volume (PLAYBOOK.md)."]
    if doc.get("errors"):
        L += ["", "## Errors", ""] + [f"- {e}" for e in doc["errors"]]
    return "\n".join(L) + "\n"


# ---------- main ----------

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"), help="report date and end date (YYYY-MM-DD)")
    ap.add_argument("--start", help="first day to query (default: each video's publish day)")
    ap.add_argument("--videos", help="comma-separated video IDs (default: pipeline/log/published.jsonl)")
    ap.add_argument("--all-uploads", action="store_true", help="every video in the channel's uploads playlist")
    ap.add_argument("--reach", action="store_true", help="also read (and if needed create) the Reporting API reach job")
    ap.add_argument("--fixture", nargs="?", const=str(FIXTURE), help="use canned responses instead of the API")
    ap.add_argument("--dry-run", action="store_true", help="print the requests; no credentials needed, nothing written")
    a = ap.parse_args()

    if a.fixture:
        api = Fixture(a.fixture)
        if not a.videos:
            a.videos = ",".join(v["id"] for v in api.f["videos.list"]["items"])
        out_dir = runlog.LOG_DIR / "fixture"
    elif a.dry_run:
        api = DryRun()
        a.videos = a.videos or "VIDEO_ID_1"
        out_dir = None
    else:
        api = Live()
        out_dir = runlog.LOG_DIR
    ids = video_ids(api, a)
    if not ids:
        sys.exit("no videos: published.jsonl is empty; pass --videos or --all-uploads")
    pub_lines = api.f.get("published", []) if a.fixture else runlog.read_jsonl(runlog.PUBLISHED)
    pub = {r["video_id"]: r for r in pub_lines if r.get("video_id")}
    meta = {}
    for k in range(0, len(ids), 50):
        r = api.get(f"{DATA}/videos", {"part": "snippet,contentDetails,statistics", "id": ",".join(ids[k:k + 50])})
        for it in r.get("items", []):
            meta[it["id"]] = it
    doc = {"generated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "date": a.date, "end_date": a.date,
           "fixture": bool(a.fixture), "scopes": getattr(api, "scopes", None), "videos": [], "errors": []}
    for vid in ids:
        m = meta.get(vid, {})
        sn, cd, st = m.get("snippet", {}), m.get("contentDetails", {}), m.get("statistics", {})
        published = (sn.get("publishedAt") or pub.get(vid, {}).get("publish_at") or a.date)[:10]
        start = a.start or published
        dur = iso_duration(cd.get("duration"))
        v = {"video_id": vid, "title": sn.get("title") or pub.get(vid, {}).get("title"), "series": pub.get(vid, {}).get("series"),
             "published_at": sn.get("publishedAt") or pub.get(vid, {}).get("publish_at"), "duration_s": dur,
             "data_api_statistics": st, "window": [start, a.date]}
        if start > a.date:
            v["note"] = "not yet published in the window"
            doc["videos"].append(v)
            continue
        try:
            v["daily"], warn = metrics_query(api, vid, start, a.date, "day")
            tot, _ = metrics_query(api, vid, start, a.date, "")
            v["totals"] = tot[0] if tot else {}
            if warn:
                doc["errors"].append(f"{vid}: {warn}")
            curve = rows(query(api, vid, start, a.date, "elapsedVideoTimeRatio", ["audienceWatchRatio", "relativeRetentionPerformance"]))
            r15 = at_ratio(curve, 15 / dur) if curve and dur else None
            v["retention"] = {"points": len(curve), "at_15s_ratio": round(r15, 4) if r15 is not None else None,
                              "at_15s_pct": round(r15 * 100, 1) if r15 is not None else None,
                              "relative_at_15s": at_ratio([{"elapsedVideoTimeRatio": c["elapsedVideoTimeRatio"], "audienceWatchRatio": c.get("relativeRetentionPerformance")} for c in curve], 15 / dur) if curve and dur else None,
                              "method": "audienceWatchRatio interpolated at elapsedVideoTimeRatio = 15 s / duration", "curve": curve}
            tr = rows(query(api, vid, start, a.date, "insightTrafficSourceType", ["views", "engagedViews"]))
            v["traffic"] = {r["insightTrafficSourceType"]: {"views": r.get("views"), "engagedViews": r.get("engagedViews")} for r in tr}
        except ApiError as e:
            doc["errors"].append(f"{vid}: {e}")
        doc["videos"].append(v)
    if a.reach:
        try:
            doc["reach"] = reach(api, ids, setup=not a.fixture)
        except (ApiError, KeyError) as e:
            doc["errors"].append(f"reach: {e}")
    if out_dir is None:
        return
    fn = out_dir / "analytics" / f"{a.date}.json"
    fn.parent.mkdir(parents=True, exist_ok=True)
    doc["file"] = str(fn.relative_to(runlog.LOG_DIR.parent)) if fn.is_relative_to(runlog.LOG_DIR.parent) else str(fn)
    fn.write_text(json.dumps(doc, indent=1, ensure_ascii=False))
    md = review(doc)
    (out_dir / "review.md").write_text(md)
    print(md)
    print(f"wrote {fn} and {out_dir / 'review.md'}")


if __name__ == "__main__":
    main()
