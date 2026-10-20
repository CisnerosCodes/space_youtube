#!/usr/bin/env python3
"""Fetch candidate stories for a date window and write research/<date>/candidates.json.

usage:
  python3 pipeline/research.py [--date 2026-10-19] [--days 7] [--ahead 10] [--no-images] [--refresh]
  python3 pipeline/research.py --next-event [--match MMX] [--after 2026-10-20T00:00:00Z] [--include-starlink]

Sources (every URL was fetched and checked on Oct 19, 2026):
  Launch Library 2 (The Space Devs) 2.3.0: upcoming launches in the next --ahead days, launches in the window.
  NASA (www.nasa.gov/feed/, paged): nasa.gov news releases, missions, blogs. "/news-release/feed/" returns the
    same mixed feed, so news releases are flagged by their URL (/news-release/) instead.
  NASA Science (science.nasa.gov/feed/, paged; its XML has a missing space in a namespace, repaired here).
  ESA (esa.int rssfeed: Space_Science, Human_and_Robotic_Exploration, Space_Transportation, Operations).
  ESA/Webb (esawebb.org/news/feed/).
  JPL (www.jpl.nasa.gov/feeds/news; needs a browser User-Agent and Accept header, else 403; its XML has a broken
    tag, so items are read with a tolerant parser).
APOD items are skipped (APOD images are often copyrighted), as are pages that are not news (people, meetings,
solicitations, catalog entries, education, podcasts, galleries, top-level pages).

Each candidate: id, title, url, published (UTC), source, summary, suggested_series (Launch Day, Just Discovered,
How Does That Work, By the Numbers) with the keyword scores behind it, and images: the top 3 results of a
NASA Image and Video Library search (images-api.nasa.gov) with nasa_id, credit and a public-domain flag.
The series and the image query are heuristics for the research desk, not decisions.

--next-event prints the next real dated event for the NEXT card, from Launch Library 2 only: status Go or TBC,
time known at least to the day. It never invents one; it exits 1 when nothing qualifies.
LL2's free tier allows 15 calls per hour, so responses are cached in research/<date>/raw/ for 30 minutes.
"""
import argparse, html, json, re, sys, time, urllib.parse, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import REPO, http, iso, utc_now  # noqa: E402

LL2 = "https://ll.thespacedevs.com/2.3.0"
FEEDS = [
    # (source name, url, pages to read at most)
    ("NASA", "https://www.nasa.gov/feed/", 6),
    ("NASA Science", "https://science.nasa.gov/feed/", 6),
    ("ESA Space Science", "https://www.esa.int/rssfeed/Our_Activities/Space_Science", 1),
    ("ESA Exploration", "https://www.esa.int/rssfeed/Our_Activities/Human_and_Robotic_Exploration", 1),
    ("ESA Transportation", "https://www.esa.int/rssfeed/Our_Activities/Space_Transportation", 1),
    ("ESA Operations", "https://www.esa.int/rssfeed/Our_Activities/Operations", 1),
    ("ESA/Webb", "https://esawebb.org/news/feed/", 1),
    ("JPL", "https://www.jpl.nasa.gov/feeds/news", 1),
]
NASA_IMAGES = "https://images-api.nasa.gov/search"
SERIES = ["Launch Day", "Just Discovered", "How Does That Work", "By the Numbers"]
SERIES_WORDS = {
    "By the Numbers": r"record|longest|farthest|fastest|largest|biggest|smallest|oldest|most distant|"
                      r"million|billion|thousand|percent|times (?:more|less|faster|bigger|larger)|"
                      r"\b\d[\d,.]*\s*(?:km|kilomet\w*|miles?|feet|meters?|days?|hours?|years?|times|percent|%|degrees|tons?|pounds|light-years?)\b",
    "Just Discovered": r"discover|\bfinds?\b|\bfound\b|reveal|captures?|spots?|detects?|\bnew\b|webb|hubble|chandra|"
                       r"euclid|telescope|study|paper|image|galax|star|planet|nebula|comet|asteroid|black hole|origin",
    "How Does That Work": r"\bhow\b|test(?:s|ing|ed)?\b|engine|spacewalk|dock|solar arrays?|instrument|technolog|assembl|"
                          r"roll[- ]?out|navigation|autonav|heat shield|propuls|antenna|laser|batter(?:y|ies)|maintenance|"
                          r"encapsulat|thermal|parachute|robotic arm|lander|spacesuit|life support",
    "Launch Day": r"launch|liftoff|lifts off|rocket|countdown|falcon|h3|ariane|vega|starship|new glenn|soyuz|atlas|vulcan",
}
SKIP_TITLE = re.compile(r"^APOD:|seminar|lecture series|webinar|\bmeeting\b|colloquium|workshop|call for proposals|"
                        r"job opportunit|job opening|registration|^TB \d", re.I)
# pages that are not news: people, solicitations, catalogs, meeting pages, education, podcasts, galleries
SKIP_PATH = re.compile(r"^/(people|researchers|exoplanet-catalog|exoplanets/star-catalog|organizations|learning-resources|"
                       r"podcasts|gallery)/|/meetings/|/community/|/nesc/", re.I)
STOP = set("""a an the of to in on at by for from with and or but as is are was were be it its this that these those new
image images marks sets names name names welcomes shows show finds find helps help readies completes boost boosts
nasa nasa's esa esa's how what why who when where will can may into over after before about up out more most just
your our their his her them they we you one two three via s""".split())
UA_HEADERS = {"Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8"}


# ---------- caching (LL2 is rate limited) ----------

def cached_json(url, cache_file, max_age_s=1800, refresh=False):
    if cache_file and cache_file.exists() and not refresh:
        c = json.loads(cache_file.read_text())
        if time.time() - c["fetched_ts"] < max_age_s:
            return c["data"], c["fetched"]
    body, _ = http(url, accept="application/json", timeout=60)
    data = json.loads(body)
    if cache_file:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps({"url": url, "fetched": iso(), "fetched_ts": time.time(), "data": data}))
    return data, iso()


# ---------- Launch Library 2 ----------

def ll2_launches(kind, t0, t1, raw_dir, refresh=False, limit=50):
    q = urllib.parse.urlencode({"net__gte": iso(t0), "net__lte": iso(t1), "limit": limit, "mode": "normal",
                                "ordering": "net" if kind == "upcoming" else "-net"})
    url = f"{LL2}/launches/{kind}/?{q}"
    data, fetched = cached_json(url, raw_dir / f"ll2_{kind}_{t0:%Y%m%d}_{t1:%Y%m%d}.json" if raw_dir else None, refresh=refresh)
    return data.get("results", []), url, fetched


def launch_fields(L):
    m = L.get("mission") or {}
    pad = L.get("pad") or {}
    return {
        "net": L.get("net"), "net_precision": (L.get("net_precision") or {}).get("name"),
        "status": (L.get("status") or {}).get("abbrev"), "status_name": (L.get("status") or {}).get("name"),
        "provider": (L.get("launch_service_provider") or {}).get("name"),
        "rocket": ((L.get("rocket") or {}).get("configuration") or {}).get("full_name"),
        "mission": m.get("name"), "mission_type": m.get("type"), "orbit": (m.get("orbit") or {}).get("name"),
        "mission_description": m.get("description"),
        "pad": pad.get("name"), "location": (pad.get("location") or {}).get("name"),
        "ll2_url": L.get("url"), "webcast_live": L.get("webcast_live"),
        "image_note": "LL2 images carry third-party licenses (often 'Unknown'); do not use them on screen.",
    }


def launch_candidate(L, kind):
    f = launch_fields(L)
    title = L.get("name", "")
    summary = (f["mission_description"] or "").strip()
    return {
        "id": "ll2-" + (L.get("slug") or L.get("id", "")),
        "title": title, "url": f"https://ll.thespacedevs.com/2.3.0/launches/{L.get('id')}/",
        "published": f["net"], "source": "Launch Library 2 " + ("upcoming" if kind == "upcoming" else "recent"),
        "summary": summary[:400], "launch": f,
        "suggested_series": "Launch Day" if kind == "upcoming" else ("How Does That Work" if f["status"] == "Success" else "Launch Day"),
        "series_scores": {"Launch Day": 3},
        "image_query": (f["mission"] or title.split("|")[-1]).strip(),
    }


# ---------- RSS ----------

def _text(s):
    s = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", s or "", flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def parse_rss(body):
    """ElementTree first; on malformed XML (science.nasa.gov, JPL), a tolerant regex reader."""
    items = []
    try:
        b = re.sub(rb'"(xmlns:)', rb'" \1', body)
        root = ET.fromstring(b)
        for it in root.iter("item"):
            items.append({"title": it.findtext("title") or "", "link": it.findtext("link") or "",
                          "pubDate": it.findtext("pubDate") or "", "description": it.findtext("description") or "",
                          "categories": [c.text or "" for c in it.findall("category")]})
        return items
    except ET.ParseError:
        pass
    t = body.decode("utf-8", "replace")
    for blk in re.findall(r"<item\b.*?</item>", t, flags=re.S):
        def tag(name):
            m = re.search(rf"<{name}\b[^>]*>(.*?)</{name}>", blk, flags=re.S)
            return m.group(1) if m else ""
        items.append({"title": _text(tag("title")), "link": _text(tag("link")), "pubDate": _text(tag("pubDate")),
                      "description": tag("description"), "categories": [_text(c) for c in re.findall(r"<category\b[^>]*>(.*?)</category>", blk, flags=re.S)]})
    return items


def fetch_feed(name, url, pages, t0):
    out, status = [], []
    for p in range(1, pages + 1):
        u = url if p == 1 else f"{url}?paged={p}"
        try:
            body, _ = http(u, headers=UA_HEADERS, timeout=60)
        except Exception as e:
            status.append(f"page {p}: {e}")
            break
        items = parse_rss(body)
        status.append(f"page {p}: {len(items)} items")
        oldest = None
        for it in items:
            try:
                pub = parsedate_to_datetime(it["pubDate"]).astimezone(timezone.utc)
            except Exception:
                pub = None
            it["published"] = pub
            oldest = pub if oldest is None or (pub and pub < oldest) else oldest
            out.append(it)
        if not items or (oldest and oldest < t0):
            break
    return out, status


def score_series(text):
    t = text.lower()
    return {s: len(re.findall(rx, t)) for s, rx in SERIES_WORDS.items()}


FLAGS = [
    ("leadership or staff news", r"\bnames?\b.*\b(director|administrator|chief|deputy|acting)\b|\bappoint|\bretire"),
    ("media advisory (an event to cover, not a story yet)", r"^nasa (to|will) (host|discuss|provide|preview|broadcast|hold)|news conference|media (accreditation|teleconference)|coverage"),
    ("earth science", r"hurricane|wildfire|\bfires?\b|sea ice|el ni|flood|drought|mountains|rainforest|coast"),
    ("multimedia page (check the article it belongs to)", r"^press conference|^video:|^welcome home|facts and figures"),
]


def flags_for(title, it):
    t = title.lower()
    f = [name for name, rx in FLAGS if re.search(rx, t)]
    if any("Earth Observatory" in c for c in it.get("categories", [])) and "earth science" not in f:
        f.append("earth science")
    return f


def feed_candidate(name, it):
    title = _text(it["title"])
    summary = _text(it["description"])[:400]
    st, ss = score_series(title), score_series(summary)
    scores = {k: 3 * st[k] + ss[k] for k in st}  # a title match counts three times a summary match
    scores["By the Numbers"] += 5 * len(re.findall(r"record|farthest|longest|fastest|largest|biggest|most distant", title.lower()))
    scores["Launch Day"] = min(scores["Launch Day"], 1)  # an article is rarely a launch-day story; LL2 covers launches
    best = max(SERIES[1:], key=lambda s: (scores[s], -SERIES.index(s)))
    if scores[best] == 0:
        best = "Just Discovered"
    slug = re.sub(r"[^a-z0-9]+", "-", urllib.parse.urlparse(it["link"]).path.lower()).strip("-")[-80:]
    return {
        "id": f"{name.lower().replace(' ', '-').replace('/', '-')}-{slug}", "title": title, "url": it["link"].strip(),
        "published": iso(it["published"]) if it["published"] else None, "source": name,
        "news_release": "/news-release/" in it["link"], "categories": [c for c in it.get("categories", []) if c][:6],
        "summary": summary, "suggested_series": best, "series_scores": scores, "flags": flags_for(title, it),
        "image_query": " ".join([w for w in re.findall(r"[A-Za-z0-9']+", title) if w.lower() not in STOP][:4]),
    }


# ---------- NASA images ----------

COPYRIGHT_HINT = re.compile(r"©|copyright|getty|reuters|associated press|\bap photo|courtesy of|all rights reserved", re.I)


def nasa_images(query, n=3):
    """Search with the query; the API ANDs its terms, so drop trailing words until something matches."""
    words = query.split()
    coll, tried = None, []
    while words:
        q = " ".join(words)
        tried.append(q)
        url = NASA_IMAGES + "?" + urllib.parse.urlencode({"q": q, "media_type": "image", "page_size": 25})
        try:
            body, _ = http(url, accept="application/json", timeout=40)
            coll = json.loads(body)["collection"]
        except Exception as e:
            return {"query": q, "usable": False, "top": [], "error": str(e)}
        if coll.get("items"):
            break
        words = words[:-1]
    if not coll or not coll.get("items"):
        return {"query": query, "tried": tried, "usable": False, "top": [], "total_hits": 0}
    query = tried[-1]
    top = []
    for item in coll.get("items", []):
        d = (item.get("data") or [{}])[0]
        desc = " ".join(str(d.get(k, "")) for k in ("description", "photographer", "secondary_creator", "title"))
        credit = d.get("secondary_creator") or d.get("photographer") or (f"NASA/{d['center']}" if d.get("center") else "NASA")
        pd = not COPYRIGHT_HINT.search(desc) and not re.search(r"\bESA\b|JAXA|Roscosmos|SpaceX", credit or "")
        top.append({"nasa_id": d.get("nasa_id"), "title": d.get("title"), "date_created": (d.get("date_created") or "")[:10],
                    "center": d.get("center"), "credit": credit, "public_domain_likely": bool(pd),
                    "note": None if pd else "credit or text names a third party or a copyright; check before use",
                    "preview": ((item.get("links") or [{}])[0]).get("href"),
                    "page": f"https://images.nasa.gov/details/{d.get('nasa_id')}"})
    top.sort(key=lambda x: (not x["public_domain_likely"], -int(x["date_created"].replace("-", "") or 0)))
    return {"query": query, "total_hits": (coll.get("metadata") or {}).get("total_hits"),
            "usable": any(x["public_domain_likely"] for x in top[:n]), "top": top[:n],
            "note": "NASA media are generally not copyrighted in the US; acknowledge NASA, keep third-party credits, no implied endorsement. "
                    "A hit only means the search matched; check that the image shows what the narration says."}


# ---------- next event ----------

GOOD_PRECISION = {"Second", "Minute", "Hour", "Morning", "Afternoon", "Day"}


def _local(dt, tz):
    try:
        from zoneinfo import ZoneInfo
        return dt.astimezone(ZoneInfo(tz)), tz
    except Exception:
        return dt, "UTC"


def next_event(a):
    after = datetime.fromisoformat(a.after.replace("Z", "+00:00")) if a.after else utc_now()
    raw_dir = REPO / "research" / f"{utc_now():%Y-%m-%d}" / "raw"
    launches, url, fetched = ll2_launches("upcoming", after, after + timedelta(days=a.horizon), raw_dir, a.refresh, limit=100)
    rx = re.compile(a.match, re.I) if a.match else None
    skipped = []
    for L in launches:
        f = launch_fields(L)
        name = L.get("name", "")
        why = None
        if rx and not rx.search(name + " " + (f["mission"] or "") + " " + (f["mission_description"] or "")):
            continue
        if f["status"] not in ("Go", "TBC"):
            why = f"status {f['status']}"
        elif f["net_precision"] not in GOOD_PRECISION:
            why = f"time only known to the {f['net_precision']}"
        elif not a.include_starlink and not rx and re.search(r"starlink|kuiper|qianfan|guowang", name, re.I):
            why = "constellation batch (pass --include-starlink to allow)"
        if why:
            skipped.append({"name": name, "net": f["net"], "why": why})
            continue
        net = datetime.fromisoformat(f["net"].replace("Z", "+00:00"))
        loc, tzname = _local(net, a.tz)
        mission = f["mission"] or name.split("|")[-1].strip()
        card = f"{mission} launches on {f['rocket']}. {loc:%a} {loc.day} {loc:%b}."
        out = {"event": "launch", "name": name, "mission": mission, "provider": f["provider"], "rocket": f["rocket"],
               "net_utc": f["net"], "net_local": loc.isoformat(timespec="minutes"), "tz": tzname,
               "net_precision": f["net_precision"], "status": f["status"], "pad": f["pad"], "location": f["location"],
               "mission_description": f["mission_description"], "card_draft": card,
               "source": f"Launch Library 2 (The Space Devs), {url}, fetched {fetched}", "ll2_url": f["ll2_url"],
               "skipped_before": skipped[:10],
               "note": "Recheck the time on the day of publishing; launches slip. Rewrite the card hook by hand if needed, keep the date."}
        print(json.dumps(out, indent=1, ensure_ascii=False))
        return 0
    print(json.dumps({"event": None, "why": "no Go/TBC launch with a known day in the window", "skipped": skipped[:20],
                      "source": url, "fetched": fetched}, indent=1))
    return 1


# ---------- main ----------

def collect(a):
    day = datetime.fromisoformat(a.date).replace(tzinfo=timezone.utc) if a.date else utc_now().replace(hour=0, minute=0, second=0, microsecond=0)
    t_end = day + timedelta(days=1)
    t0 = day - timedelta(days=a.days)
    out_dir = REPO / "research" / f"{day:%Y-%m-%d}"
    raw_dir = out_dir / "raw"
    sources, cands = [], []
    now = utc_now()
    up_from = max(now, day)
    try:
        ups, url, fetched = ll2_launches("upcoming", up_from, up_from + timedelta(days=a.ahead), raw_dir, a.refresh)
        cands += [launch_candidate(L, "upcoming") for L in ups]
        sources.append({"name": "Launch Library 2 upcoming", "url": url, "fetched": fetched, "items": len(ups)})
    except Exception as e:
        sources.append({"name": "Launch Library 2 upcoming", "error": str(e)})
    try:
        prev, url, fetched = ll2_launches("previous", t0, min(t_end, now), raw_dir, a.refresh)
        cands += [launch_candidate(L, "previous") for L in prev]
        sources.append({"name": "Launch Library 2 recent", "url": url, "fetched": fetched, "items": len(prev)})
    except Exception as e:
        sources.append({"name": "Launch Library 2 recent", "error": str(e)})
    skipped = 0
    for name, url, pages in FEEDS:
        items, status = fetch_feed(name, url, pages, t0)
        kept = 0
        for it in items:
            if it["published"] is None or not (t0 <= it["published"] < t_end):
                continue
            path = urllib.parse.urlparse(it["link"].strip()).path
            if (SKIP_TITLE.search(_text(it["title"])) or "APOD" in it.get("categories", []) or SKIP_PATH.search(path)
                    or path.strip("/").count("/") == 0 and "nasa.gov" in it["link"]):
                skipped += 1
                continue
            cands.append(feed_candidate(name, it))
            kept += 1
        sources.append({"name": name, "url": url, "fetched": iso(), "pages": status, "in_window": kept})
    # the same story often appears in two NASA feeds: keep the first by URL
    seen, uniq = set(), []
    for c in cands:
        k = c["url"].rstrip("/")
        if k in seen:
            continue
        seen.add(k); uniq.append(c)
    if not a.no_images:
        for i, c in enumerate(uniq):
            c["images"] = nasa_images(c.pop("image_query", ""))
            time.sleep(0.1)
    else:
        for c in uniq:
            c["image_query_draft"] = c.pop("image_query", "")
    doc = {"generated": iso(), "date": f"{day:%Y-%m-%d}", "window": {"from": iso(t0), "to": iso(t_end)},
           "launch_window": {"from": iso(up_from), "to": iso(up_from + timedelta(days=a.ahead))},
           "sources": sources, "skipped_not_news": skipped,
           "counts": {s: sum(1 for c in uniq if c["suggested_series"] == s) for s in SERIES},
           "note": "Candidates only. Every fact must still be checked against the source page before a script uses it "
                   "(see lab/research/2026-10-15_pilot_candidates.md for the quote-table method).",
           "candidates": uniq}
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "candidates.json").write_text(json.dumps(doc, indent=1, ensure_ascii=False))
    for s in sources:
        print(f"{s['name']:<28} {s.get('items', s.get('in_window', '')):>4}  {s.get('error', '')}")
    print(f"{len(uniq)} candidates -> {out_dir / 'candidates.json'}  ({doc['counts']})")
    for c in uniq[:60]:
        img = c.get("images", {})
        fl = " [" + "; ".join(x.split(" (")[0] for x in c.get("flags", [])) + "]" if c.get("flags") else ""
        print(f"  {(c['published'] or '')[:10]}  {c['suggested_series']:<18} {'img' if img.get('usable') else '   '}  {c['source']:<20} {c['title'][:64]}{fl}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--date", help="research date YYYY-MM-DD (default today, UTC); the window ends at the end of this day")
    ap.add_argument("--days", type=int, default=7, help="days back from --date for news and recent launches (default 7)")
    ap.add_argument("--ahead", type=int, default=10, help="days ahead for upcoming launches (default 10)")
    ap.add_argument("--no-images", action="store_true", help="skip the NASA image search")
    ap.add_argument("--refresh", action="store_true", help="ignore the 30 minute LL2 cache")
    ap.add_argument("--next-event", action="store_true", help="print the next real dated event (LL2) for the NEXT card")
    ap.add_argument("--match", help="with --next-event: regex on launch name or mission (e.g. 'Artemis|MMX')")
    ap.add_argument("--after", help="with --next-event: only events after this UTC time (default now)")
    ap.add_argument("--horizon", type=int, default=30, help="with --next-event: days to look ahead (default 30)")
    ap.add_argument("--tz", default="America/New_York", help="with --next-event: time zone for the card date")
    ap.add_argument("--include-starlink", action="store_true", help="with --next-event: allow constellation batches")
    a = ap.parse_args()
    if a.next_event:
        sys.exit(next_event(a))
    collect(a)


if __name__ == "__main__":
    main()
