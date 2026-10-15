#!/usr/bin/env python3
"""Generate instrumental music beds with Google Lyria 3 Clip through OpenRouter.

Usage: python3 gen_beds.py <bed_id> [<bed_id> ...]     (ids from BEDS below)
       python3 gen_beds.py --probe                      (one call, prints the response shape)

The API key is read at run time from /root/.config/signal-delay/.env and is never
printed or written anywhere. Every paid call is appended to beds/paid_calls.json
with the cost reported by GET /api/v1/generation?id=<id>.

Note: the request asks for audio format wav, but Lyria 3 Clip returns a 30.8 s
192 kbps 44.1 kHz stereo MP3, so the raw file is saved as <name>_raw.mp3.
"""
import base64, json, os, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
BEDS_DIR = os.path.join(HERE, "beds")
LOG = os.path.join(BEDS_DIR, "paid_calls.json")
MODEL = "google/lyria-3-clip-preview"
BUDGET_USD = 0.80

COMMON = ("Instrumental only, no vocals, no singing, no spoken words, no choir. "
          "Background music for a fast science explainer with a voice-over on top: keep the 1 to 4 kHz "
          "midrange sparse and uncluttered, no lead melody fighting a voice, light and modern, "
          "consistent energy from start to end with no big intro or outro so it can loop. ")

BEDS = {
    "bedA_pluck": dict(mood="playful, curious", bpm=120,
        prompt="Playful synth pluck and soft kick, 120 BPM, curious and upbeat nerdy electronic, "
               "short staccato plucks, round sub bass, soft four-on-the-floor kick, gentle hi-hats. Steady groove the whole time: "
               "no breakdown, no stops, no silence, drums never drop out."),
    "bedB_lofi": dict(mood="warm, relaxed-curious", bpm=115,
        prompt="Lofi electronic with warm bass, 115 BPM, mellow but upbeat, dusty soft drums, "
               "warm rounded bassline, airy pad, subtle vinyl texture, curious late-night science vibe."),
    "bedC_chip": dict(mood="bright, excited", bpm=122,
        prompt="Bright chiptune-tinged electronic pop, 122 BPM, excited and nerdy, soft square-wave "
               "arpeggios kept quiet and high, punchy kick, bouncy bass, cheerful but not busy."),
    "bedD_tense": dict(mood="tense, building, for big reveals", bpm=120,
        prompt="Tense pulsing electronic bed for big science reveals, 120 BPM, driving eighth-note "
               "sub bass pulse, muted ticking percussion, low dark pad, suspenseful but not scary, "
               "steady tension without a drop."),
    "bedE_arp": dict(mood="spacey, wonder", bpm=118,
        prompt="Spacey synth arpeggio, 118 BPM, sense of wonder about outer space, gentle sparkling "
               "arpeggio in the high register, deep soft bass, light electronic drums, wide airy reverb."),
    "bedF_house": dict(mood="bouncy, upbeat", bpm=124,
        prompt="Bouncy minimal house, 124 BPM, upbeat and playful, tight kick and clap, rubbery "
               "bassline, minimal percussion, very few chords, clean and modern."),
}


def key():
    with open("/root/.config/signal-delay/.env") as f:
        for line in f:
            line = line.strip()
            if line.startswith("OPENROUTER_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("OPENROUTER_API_KEY not found")


def load_log():
    if os.path.exists(LOG):
        return json.load(open(LOG))
    return []


def spent(log):
    return sum((c.get("usd") or 0.05) for c in log)  # unknown cost counts as 0.05 to stay safe


def get_cost(gen_id, k, tries=8):
    for i in range(tries):
        req = urllib.request.Request(f"https://openrouter.ai/api/v1/generation?id={gen_id}",
                                     headers={"Authorization": f"Bearer {k}"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.load(r)["data"]
                return d.get("total_cost"), d
        except urllib.error.HTTPError as e:
            if e.code == 404:
                time.sleep(3 + 2 * i)
                continue
            raise
    return None, None


def call(prompt, k, seed=None):
    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "modalities": ["text", "audio"],
        "audio": {"format": "wav"},
        "stream": True,
    }
    if seed is not None:
        body["seed"] = seed
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions",
                                 data=json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {k}",
                                          "Content-Type": "application/json"})
    chunks, text, gen_id, shapes = [], [], None, []
    with urllib.request.urlopen(req, timeout=600) as r:
        for raw in r:
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("data: "):
                continue
            data = line[6:]
            if data == "[DONE]":
                break
            c = json.loads(data)
            gen_id = gen_id or c.get("id")
            if "error" in c:
                raise RuntimeError(json.dumps(c["error"])[:500])
            for ch in c.get("choices", []):
                delta = ch.get("delta", {})
                a = delta.get("audio") or {}
                if a.get("data"):
                    chunks.append(a["data"])
                if a.get("transcript"):
                    text.append(a["transcript"])
                if delta.get("content"):
                    text.append(delta["content"])
                if len(shapes) < 4:
                    shapes.append({kk: (type(v).__name__ if kk != "audio" else {ak: type(av).__name__ for ak, av in v.items()})
                                   for kk, v in delta.items()})
    return gen_id, base64.b64decode("".join(chunks)) if chunks else b"", "".join(text), shapes


def main():
    args = sys.argv[1:]
    k = key()
    log = load_log()
    jobs = [("probe", BEDS["bedA_pluck"])] if args == ["--probe"] else [(a, BEDS[a]) for a in args]
    for name, spec in jobs:
        if spent(log) + 0.05 > BUDGET_USD:
            print("budget stop", spent(log)); break
        prompt = COMMON + spec["prompt"]
        t0 = time.time()
        gen_id, audio, text, shapes = call(prompt, k)
        out = os.path.join(BEDS_DIR, "raw", f"{name}_raw.mp3")
        if audio:
            open(out, "wb").write(audio)
        cost, meta = get_cost(gen_id, k) if gen_id else (None, None)
        entry = dict(time=time.strftime("%Y-%m-%dT%H:%M:%S"), name=name, model=MODEL,
                     generation_id=gen_id, usd=cost, seconds=round(time.time() - t0, 1),
                     bytes=len(audio), text=text[:400], prompt=prompt,
                     native_tokens_completion=(meta or {}).get("native_tokens_completion"))
        log.append(entry)
        json.dump(log, open(LOG, "w"), indent=2)
        print(json.dumps({k2: v for k2, v in entry.items() if k2 != "prompt"}), "\nshapes:", shapes)
    print("total spent so far: $%.4f" % sum((c.get("usd") or 0) for c in log))


if __name__ == "__main__":
    main()
