"""Voice test v3: Gemini Puck with creator-style (influencer) delivery on script v3."""
import json, pathlib, subprocess, time, urllib.request
ROOT = pathlib.Path(__file__).parent
ns = {"__file__": str(ROOT / "tts_v2.py")}; exec((ROOT / "tts_v2.py").read_text().split("TAKES = [")[0], ns)
KEY = ns["KEY"]
TEXT = " ".join(l[2:].strip() for l in (ROOT / "script_mmx_v3.md").read_text().splitlines() if l.startswith("> "))
BASE = ("You are a young, nerdy science creator in your early twenties, a little scrawny, filming a vertical video for your followers. "
        "Talk like a popular creator on TikTok or YouTube Shorts, not a narrator: conversational, a grin in your voice, genuinely hyped. "
        "Hit the hook hard, take a tiny beat before each reveal, punch the key words (falling, fifty million, grab, nobody, finally), "
        "speed up through setup lines and slow down on the payoff. ")
CAT = "Faint cat hints only: a soft purring roll on a few r sounds and a curious upward lilt at some line ends. Never meow."
TAKES = [
    ("puck_creator_high",  BASE + "Energy: high, fast, almost breathless with excitement. " + CAT),
    ("puck_creator_mid",   BASE + "Energy: medium-high, like telling a friend something wild you just learned. " + CAT),
    ("puck_creator_morecat", BASE + "Energy: high. A little more cat: a playful purr on the r in 'Mars' and 'drops', a small 'mrr'-like rise on 'Why bother?'. Still natural, never a meow."),
]
def call(body):
    req = urllib.request.Request("https://openrouter.ai/api/v1/audio/speech", data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r: return r.read(), dict(r.headers)
def cost(gen):
    for _ in range(8):
        time.sleep(3)
        try:
            req = urllib.request.Request(f"https://openrouter.ai/api/v1/generation?id={gen}", headers={"Authorization": f"Bearer {KEY}"})
            return json.load(urllib.request.urlopen(req, timeout=30))["data"].get("total_cost")
        except Exception: pass
log = []
for name, direction in TAKES:
    pcm, h = call({"model": "google/gemini-3.8-flash-tts", "voice": "Puck", "input": TEXT, "instructions": direction, "response_format": "pcm"})
    out = ROOT / "out_v3" / f"{name}.mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0", "-b:a", "160k", str(out)], input=pcm, check=True)
    log.append({"take": name, "voice": "Puck", "seconds": round(len(pcm) / 48000, 1), "usd": cost(h.get("X-Generation-Id") or h.get("x-generation-id")), "direction": direction})
    print({k: v for k, v in log[-1].items() if k != "direction"})
(ROOT / "out_v3" / "log.json").write_text(json.dumps(log, indent=2))
