"""Voice a pilot script with the locked narrator (VOICE.md) and align it. usage: python3 voice.py <pilot_dir>"""
import json, pathlib, re, subprocess, sys, time, urllib.request
REPO = pathlib.Path(__file__).resolve().parents[2]
ns = {"__file__": str(REPO / "lab/voice/tts_v2.py")}; exec((REPO / "lab/voice/tts_v2.py").read_text().split("TAKES = [")[0], ns)
KEY = ns["KEY"]
d = pathlib.Path(sys.argv[1]); md = (d / "script.md").read_text()
text = " ".join(l[2:].strip() for l in md.splitlines() if l.startswith("> "))
emph = re.search(r"Emphasis words: (.+)", md).group(1).rstrip(".")
direction = re.search(r"## Direction.*?\n(.+?)\n\n", (REPO / "VOICE.md").read_text(), re.S).group(1).strip()
direction = direction.replace("punch the key words,", f"punch the key words ({emph}),")
req = urllib.request.Request("https://openrouter.ai/api/v1/audio/speech", data=json.dumps(
    {"model": "google/gemini-3.8-flash-tts", "voice": "Puck", "input": text, "instructions": direction, "response_format": "pcm"}).encode(),
    headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=300) as r: pcm, gen = r.read(), r.headers.get("X-Generation-Id")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0", "-b:a", "160k", str(d / "voice.mp3")], input=pcm, check=True)
cost = None
for _ in range(10):
    time.sleep(3)
    try:
        cost = json.load(urllib.request.urlopen(urllib.request.Request(f"https://openrouter.ai/api/v1/generation?id={gen}", headers={"Authorization": f"Bearer {KEY}"})))["data"]["total_cost"]
        break
    except Exception:
        pass
subprocess.run([sys.executable, str(REPO / "lab/voice/align.py"), str(d / "voice.mp3"), str(d / "voice.words.json")], check=True)
(d / "voice.json").write_text(json.dumps({"model": "google/gemini-3.8-flash-tts", "voice": "Puck", "seconds": round(len(pcm) / 48000, 2), "usd": cost, "direction": direction, "text": text}, indent=1))
print(d.name, round(len(pcm) / 48000, 1), "s", cost, "USD")
