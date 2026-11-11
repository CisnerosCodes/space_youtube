"""Word timestamps for a voice take via OpenRouter STT (whisper-large-v3). usage: python3 align.py <take.mp3> <out.json>"""
import base64, json, pathlib, sys, urllib.request
ROOT = pathlib.Path(__file__).parent
ns = {"__file__": str(ROOT / "tts_v2.py")}; exec((ROOT / "tts_v2.py").read_text().split("TAKES = [")[0], ns)
src, dst = map(pathlib.Path, sys.argv[1:3])
body = {"model": "openai/whisper-large-v3", "input_audio": {"data": base64.b64encode(src.read_bytes()).decode(), "format": src.suffix[1:]},
        "response_format": "verbose_json", "timestamp_granularities": ["word"], "language": "en"}
req = urllib.request.Request("https://openrouter.ai/api/v1/audio/transcriptions", data=json.dumps(body).encode(),
    headers={"Authorization": f"Bearer {ns['KEY']}", "Content-Type": "application/json"})
d = json.load(urllib.request.urlopen(req, timeout=300))
words = [{"w": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in d.get("words", [])]
dst.write_text(json.dumps({"audio": src.name, "duration": d.get("duration"), "text": d.get("text", "").strip(), "words": words}, indent=1))
print(len(words), "words,", d.get("duration"), "s ->", dst)
