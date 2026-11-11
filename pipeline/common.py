"""Shared helpers for the Downlink Cat pipeline tools (standard library only).

- openrouter_key(): the OpenRouter key from $OPENROUTER_API_KEY or ~/.config/signal-delay/.env (never printed).
- http(): urllib request with the house User-Agent, retries on 429 and 5xx.
- generation_cost(): OpenRouter cost lookup by generation id, retried while it answers 404.
"""
import json, os, pathlib, time, urllib.error, urllib.request
from datetime import datetime, timezone

REPO = pathlib.Path(__file__).resolve().parents[1]
ENV_FILE = pathlib.Path.home() / ".config/signal-delay/.env"
BROWSER_UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
              "Chrome/126.0 Safari/537.36 DownlinkCat-pipeline")
OPENROUTER = "https://openrouter.ai/api/v1"


def utc_now():
    return datetime.now(timezone.utc)


def iso(dt=None):
    return (dt or utc_now()).isoformat(timespec="seconds").replace("+00:00", "Z")


def openrouter_key():
    key = os.environ.get("OPENROUTER_API_KEY")
    if key:
        return key
    if not ENV_FILE.exists():
        raise SystemExit(f"OPENROUTER_API_KEY is not set and {ENV_FILE} does not exist")
    env = dict(l.strip().split("=", 1) for l in ENV_FILE.read_text().splitlines() if "=" in l and not l.lstrip().startswith("#"))
    if "OPENROUTER_API_KEY" not in env:
        raise SystemExit(f"OPENROUTER_API_KEY is missing from {ENV_FILE}")
    return env["OPENROUTER_API_KEY"].strip().strip('"').strip("'")


def http(url, data=None, headers=None, method=None, timeout=60, tries=3, accept=None):
    """Return (body bytes, response headers). Retries 429 and 5xx with backoff; other HTTP errors raise."""
    h = {"User-Agent": BROWSER_UA, "Accept": accept or "*/*", "Accept-Language": "en-US,en;q=0.9"}
    h.update(headers or {})
    if isinstance(data, (dict, list)):
        data = json.dumps(data).encode()
        h.setdefault("Content-Type", "application/json")
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=h, method=method)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read(), dict(r.headers)
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                time.sleep(int(e.headers.get("Retry-After") or 0) or 3 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            last = e
            if attempt < tries - 1:
                time.sleep(3 * (attempt + 1))
                continue
            raise
    raise last


def get_json(url, **kw):
    body, _ = http(url, accept="application/json", **kw)
    return json.loads(body)


def generation_cost(gen_id, key=None, tries=12):
    """USD cost of an OpenRouter generation. The endpoint often answers 404 for the first seconds
    (sometimes for a minute) after an audio call, so retry with a growing wait. None if it never shows."""
    if not gen_id:
        return None
    key = key or openrouter_key()
    wait = 2
    for _ in range(tries):
        time.sleep(wait)
        try:
            d = get_json(f"{OPENROUTER}/generation?id={gen_id}", headers={"Authorization": f"Bearer {key}"}, tries=1, timeout=30)
            c = d.get("data", {}).get("total_cost")
            if c is not None:
                return c
        except urllib.error.HTTPError as e:
            if e.code not in (404, 429, 500, 502, 503):
                return None
        except Exception:
            pass
        wait = min(wait + 2, 12)
    return None
