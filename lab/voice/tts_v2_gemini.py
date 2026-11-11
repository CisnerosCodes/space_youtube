"""Gemini TTS takes (PCM only), converted to MP3; plus a transcript check of the Seed take."""
import base64, json, pathlib, subprocess, time, urllib.request
ROOT = pathlib.Path(__file__).parent
ns = {"__file__": str(ROOT / "tts_v2.py")}; exec((ROOT / "tts_v2.py").read_text().split("TAKES = [")[0], ns)
KEY, TEXT, CHARACTER, CAT = ns["KEY"], ns["TEXT"], ns["CHARACTER"], ns["CAT"]

def call(path, body, accept_json=False):
    req = urllib.request.Request(f"https://openrouter.ai/api/v1/{path}", data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read(), dict(r.headers)

def cost(gen):
    for _ in range(8):
        time.sleep(3)
        try:
            req = urllib.request.Request(f"https://openrouter.ai/api/v1/generation?id={gen}", headers={"Authorization": f"Bearer {KEY}"})
            return json.load(urllib.request.urlopen(req, timeout=30))["data"].get("total_cost")
        except Exception: pass

log = json.loads((ROOT / "out_v2" / "log.json").read_text())
log = [l for l in log if not l["take"].startswith("gemini")]
for name, voice in [("gemini_puck_cat", "Puck"), ("gemini_fenrir_cat", "Fenrir")]:
    pcm, h = call("audio/speech", {"model": "google/gemini-3.8-flash-tts", "voice": voice, "input": TEXT,
                                   "instructions": CHARACTER + CAT, "response_format": "pcm"})
    out = ROOT / "out_v2" / f"{name}.mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0", "-b:a", "128k", str(out)], input=pcm, check=True)
    dur = len(pcm) / 48000
    log.append({"take": name, "model": "google/gemini-3.8-flash-tts", "voice": voice, "chars": len(TEXT), "seconds": round(dur, 1),
                "usd": cost(h.get("X-Generation-Id") or h.get("x-generation-id"))})
    print(log[-1])
(ROOT / "out_v2" / "log.json").write_text(json.dumps(log, indent=2))

seed = base64.b64encode((ROOT / "out_v2" / "seed_mascot_voice.mp3").read_bytes()).decode()
r, h = call("audio/transcriptions", {"model": "openai/whisper-large-v3", "input_audio": {"data": seed, "format": "mp3"},
                                     "response_format": "verbose_json", "timestamp_granularities": ["word"]})
d = json.loads(r); print("SEED TRANSCRIPT:", d.get("text")); print("words:", len(d.get("words") or []), "first:", (d.get("words") or [])[:3])
