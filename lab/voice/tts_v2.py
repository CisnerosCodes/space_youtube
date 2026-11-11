"""Voice test v2: younger, nerdier narrator with a faint cat quality. Logs cost per take."""
import base64, json, os, pathlib, subprocess, time, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).parent
ENV = pathlib.Path.home() / ".config/signal-delay/.env"
KEY = os.environ.get("OPENROUTER_API_KEY") or dict(
    l.strip().split("=", 1) for l in ENV.read_text().splitlines() if "=" in l)["OPENROUTER_API_KEY"]
TEXT = " ".join(l[2:].strip() for l in (ROOT / "script_mmx_v2.md").read_text().splitlines() if l.startswith("> "))
CHARACTER = ("young, excited, nerdy guy in his early twenties, a little scrawny, talking fast because he loves this; "
             "warm, curious, slightly breathless on the big facts")
CAT = "; a faint purring softness on a few r sounds and a light curious upward lilt at some phrase ends; never meow, never cartoonish"
ELEVEN_TEXT = "[excited] " + TEXT.replace("Why?", "[curious] Why?").replace("Liftoff", "[excited] Liftoff")
MASCOT = "data:image/png;base64," + base64.b64encode((ROOT.parent / "mascot" / "A.png").read_bytes()).decode()

TAKES = [
    ("fish_ethan_young",     {"model": "fish-audio/drama-3", "voice": "536d3a5e000945adb7038665781a4aca", "input": TEXT, "instructions": CHARACTER}),
    ("fish_ethan_young_cat", {"model": "fish-audio/drama-3", "voice": "536d3a5e000945adb7038665781a4aca", "input": TEXT, "instructions": CHARACTER + CAT}),
    ("gemini_puck_cat",      {"model": "google/gemini-3.8-flash-tts", "voice": "Puck", "input": TEXT, "instructions": CHARACTER + CAT}),
    ("gemini_fenrir_cat",    {"model": "google/gemini-3.8-flash-tts", "voice": "Fenrir", "input": TEXT, "instructions": CHARACTER + CAT}),
    ("eleven_liam",          {"model": "elevenlabs/eleven-v4-turbo", "voice": "liam", "input": ELEVEN_TEXT}),
    ("eleven_charlie",       {"model": "elevenlabs/eleven-v4-turbo", "voice": "charlie", "input": ELEVEN_TEXT}),
    ("seed_mascot_voice",    {"model": "bytedance-seed/seed-audio-1-0",
                              "input": "A young, excited, nerdy narrator with a faint feline softness reads this space news aloud, clearly: " + TEXT,
                              "input_references": [{"type": "image_url", "image_url": {"url": MASCOT}}]}),
]

def post(body):
    req = urllib.request.Request("https://openrouter.ai/api/v1/audio/speech", data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "X-Title": "Signal Delay voice test v2"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read(), dict(r.headers)

def cost(gen_id):
    for _ in range(8):
        time.sleep(3)
        try:
            req = urllib.request.Request(f"https://openrouter.ai/api/v1/generation?id={gen_id}", headers={"Authorization": f"Bearer {KEY}"})
            d = json.load(urllib.request.urlopen(req, timeout=30))["data"]
            return d.get("total_cost")
        except Exception:
            pass
    return None

log = []
for name, body in TAKES:
    body = {**body, "response_format": "mp3"}
    try:
        audio, headers = post(body)
    except urllib.error.HTTPError as e:
        log.append({"take": name, "error": f"{e.code} {e.read()[:400]!r}"}); print(name, "ERROR", log[-1]["error"]); continue
    path = ROOT / "out_v2" / f"{name}.mp3"; path.write_bytes(audio)
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,format_name", "-of", "json", str(path)], capture_output=True, text=True).stdout
    dur = float(json.loads(probe or "{}").get("format", {}).get("duration", 0) or 0)
    gen = headers.get("X-Generation-Id") or headers.get("x-generation-id")
    log.append({"take": name, "model": body["model"], "voice": body.get("voice", "designed from mascot image"), "chars": len(body["input"]),
                "seconds": round(dur, 1), "usd": cost(gen) if gen else None})
    print(log[-1])
(ROOT / "out_v2" / "log.json").write_text(json.dumps(log, indent=2))
