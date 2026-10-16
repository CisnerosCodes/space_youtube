"""Generate the voice test through OpenRouter's /audio/speech endpoint and log cost per take.
usage: python3 tts.py  (reads OPENROUTER_API_KEY from env or ~/.config/signal-delay/.env)"""
import json, os, pathlib, subprocess, time, urllib.request

ROOT = pathlib.Path(__file__).parent
ENV = pathlib.Path.home() / ".config/signal-delay/.env"
KEY = os.environ.get("OPENROUTER_API_KEY") or dict(
    l.strip().split("=", 1) for l in ENV.read_text().splitlines() if "=" in l)["OPENROUTER_API_KEY"]

TEXT = " ".join(l[2:].strip() for l in (ROOT / "script_mmx.md").read_text().splitlines() if l.startswith("> "))
DIRECTION = "curious, clear science explainer; brisk but unhurried; warm; slight lift on the questions; no announcer voice"

TAKES = [
    ("fish_ethan",     "fish-audio/drama-3",          "536d3a5e000945adb7038665781a4aca", True),
    ("fish_jordan",    "fish-audio/drama-3",          "79d0bd3e4e5444b18f7b6d89b5927bf1", True),
    ("fish_hannah",    "fish-audio/drama-3",          "9a9cf47702da476aa4629e2506d4a857", True),
    ("eleven_george",  "elevenlabs/eleven-v4-turbo",  "george",  False),
    ("eleven_will",    "elevenlabs/eleven-v4-turbo",  "will",    False),
    ("eleven_jessica", "elevenlabs/eleven-v4-turbo",  "jessica", False),
]

def post(body):
    req = urllib.request.Request("https://openrouter.ai/api/v1/audio/speech", data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "X-Title": "Signal Delay voice test"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read(), dict(r.headers)

def cost(gen_id):
    for _ in range(6):
        time.sleep(3)
        try:
            req = urllib.request.Request(f"https://openrouter.ai/api/v1/generation?id={gen_id}", headers={"Authorization": f"Bearer {KEY}"})
            d = json.load(urllib.request.urlopen(req, timeout=30))["data"]
            return d.get("total_cost"), d.get("provider_name")
        except Exception:
            pass
    return None, None

log = []
for name, model, voice, fish in TAKES:
    body = {"model": model, "input": TEXT, "voice": voice, "response_format": "mp3"}
    if fish:
        body["instructions"] = DIRECTION
    try:
        audio, headers = post(body)
    except urllib.error.HTTPError as e:
        log.append({"take": name, "error": f"{e.code} {e.read()[:300]!r}"}); print(name, "ERROR", log[-1]["error"]); continue
    path = ROOT / "out" / f"{name}.mp3"; path.write_bytes(audio)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                               capture_output=True, text=True).stdout.strip() or 0)
    gen = headers.get("X-Generation-Id") or headers.get("x-generation-id")
    usd, provider = cost(gen) if gen else (None, None)
    log.append({"take": name, "model": model, "voice": voice, "chars": len(TEXT), "seconds": round(dur, 1), "usd": usd, "provider": provider, "generation": gen})
    print(log[-1])
(ROOT / "out" / "log.json").write_text(json.dumps(log, indent=2))
