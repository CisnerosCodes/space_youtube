#!/usr/bin/env python3
"""Voice a Short with the locked narrator (VOICE.md), then verify the take against the script.

usage:
  python3 pipeline/voice.py <short_dir> [--takes 3] [--alias MeerKAT=Miracat] [--force]
  python3 pipeline/voice.py <short_dir> --verify-only [--audio some.mp3]
  python3 pipeline/voice.py <short_dir> --splice-last-line

<short_dir>/script.md holds the narration as lines starting with "> " and an "Emphasis words: ..." line.

Voice (same as lab/pilots/voice.py): google/gemini-3.8-flash-tts, voice Puck, PCM 24 kHz mono 16-bit, MP3 160k
with ffmpeg, the VOICE.md direction with the script's emphasis words named in it.

Verify: transcribe with openai/whisper-large-v3 (word timestamps, as lab/voice/align.py), re-transcribe every gap
over --gap seconds (default 1.0) on a clipped segment and insert the words Whisper dropped (marked "src": "gap",
"approx": true: their times come from the clip, clamped into the gap), then diff the transcript against the
script with pipeline/wordnorm.py (numbers, ordinals, punctuation, "Downlink Cat" = "down link cat"). Any
content-word difference re-voices, at most --takes takes in all; the best take is kept.

Writes in <short_dir>: voice.mp3, voice.words.json (align.py format plus gap words), voice.json (model, voice,
seconds, cost per take with the cost lookup retried while it answers 404, takes tried, diff result), and
work/voice/ (every take, its transcripts and gap clips). Exit 0 when the kept take matches; exit 2 with the
diff when every take has a content difference (the best take is still written, with "verified": false).

--splice-last-line re-voices only the final sentence (method from lab/pilots/p2_webb_frb/FOLLOWUPS.md): one take of
the last two sentences (for natural intonation), its first word of the last sentence aligned onto the original's
onset (20 ms RMS), cut in the pause at the quietest point, at a zero crossing, 10 ms crossfade, take gain set so
the tail matches the original tail loudness (ffmpeg ebur128). The previous files are kept as voice.orig.mp3 and
voice.words.orig.json (or with a time stamp if those exist). Words before the cut keep their times; the tail
comes from a re-transcription of the spliced file.
"""
import argparse, array, base64, difflib, json, math, pathlib, re, shutil, subprocess, sys, time, wave
from datetime import datetime, timezone

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import REPO, OPENROUTER, generation_cost, http, iso, openrouter_key  # noqa: E402
import wordnorm  # noqa: E402

TTS_MODEL, VOICE, STT_MODEL = "google/gemini-3.8-flash-tts", "Puck", "openai/whisper-large-v3"
SR = 24000
USD_PER_TTS_SECOND = 0.000227  # measured on the pilots: 0.006854 USD / 30.24 s and 0.008143 USD / 35.92 s
MAX_TAKES = 3


# ---------- script and direction ----------

def read_script(d):
    md = (d / "script.md").read_text()
    text = wordnorm.script_text_from_md(md)
    if not text:
        sys.exit(f"{d / 'script.md'}: no narration lines (lines must start with '> ')")
    m = re.search(r"Emphasis words: (.+)", md)
    emph = m.group(1).strip().rstrip(".") if m else None
    return text, emph


def direction_for(emph):
    v = (REPO / "VOICE.md").read_text()
    direction = re.search(r"## Direction.*?\n(.+?)\n\n", v, re.S).group(1).strip()
    if emph:
        direction = direction.replace("punch the key words,", f"punch the key words ({emph}),")
    return direction


def sentences(text):
    return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]


# ---------- OpenRouter calls ----------

def tts(text, direction, key):
    body = {"model": TTS_MODEL, "voice": VOICE, "input": text, "instructions": direction, "response_format": "pcm"}
    pcm, headers = http(f"{OPENROUTER}/audio/speech", data=body, timeout=300,
                        headers={"Authorization": f"Bearer {key}", "X-Title": "Downlink Cat voice"})
    gen = headers.get("X-Generation-Id") or headers.get("x-generation-id")
    if len(pcm) < SR:  # under half a second of audio: an error body, not speech
        raise RuntimeError(f"TTS returned {len(pcm)} bytes: {pcm[:200]!r}")
    return pcm, gen


def transcribe(path, key):
    """align.py logic. Returns (doc, usd)."""
    path = pathlib.Path(path)
    body = {"model": STT_MODEL, "input_audio": {"data": base64.b64encode(path.read_bytes()).decode(), "format": path.suffix[1:]},
            "response_format": "verbose_json", "timestamp_granularities": ["word"], "language": "en"}
    raw, headers = http(f"{OPENROUTER}/audio/transcriptions", data=body, timeout=300,
                        headers={"Authorization": f"Bearer {key}"})
    d = json.loads(raw)
    words = [{"w": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in d.get("words", [])]
    usd = (d.get("usage") or {}).get("cost")
    doc = {"audio": path.name, "duration": d.get("duration"), "text": d.get("text", "").strip(), "words": words}
    return doc, usd, headers.get("X-Generation-Id")


# ---------- audio helpers ----------

def ffmpeg(*args, inp=None):
    return subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], input=inp, check=True,
                          capture_output=True).stdout


def pcm_to_files(pcm, wav, mp3):
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
    ffmpeg("-i", str(wav), "-b:a", "160k", str(mp3))


def decode(path):
    a = array.array("f")
    a.frombytes(ffmpeg("-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"))
    return a


def write_wav(samples, path):
    ints = array.array("h", (max(-32768, min(32767, int(round(s * 32767)))) for s in samples))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(ints.tobytes())


def clip(src, a, b, dst):
    ffmpeg("-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", str(src), "-b:a", "160k", str(dst))


def rms_db(x, i0, n):
    i0 = max(0, i0); seg = x[i0:i0 + n]
    if not seg:
        return -120.0
    e = sum(v * v for v in seg) / len(seg)
    return 10 * math.log10(e) if e > 1e-12 else -120.0


def lufs(samples):
    if len(samples) < int(0.45 * SR):
        return None
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                          "-af", "ebur128", "-f", "null", "-"], input=samples.tobytes(), capture_output=True).stderr.decode()
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    return float(m[-1]) if m else None


def find_pause(x, t_a, t_b, win=0.02, hop=0.005):
    """The longest silent run (20 ms RMS under max(-45 dBFS, loudest window - 30 dB)) between t_a and t_b.
    Returns (speech end, next onset) in seconds. Waveform-based, because Whisper word ends are unreliable."""
    n, h = int(win * SR), int(hop * SR)
    i0, i1 = max(0, int(t_a * SR)), min(len(x) - n, int(t_b * SR))
    levels = [(i, rms_db(x, i, n)) for i in range(i0, i1, h)]
    if not levels:
        return t_a, t_b
    thr = max(-45.0, max(v for _, v in levels) - 30.0)
    best, run = None, None
    for i, v in levels:
        if v < thr:
            run = (run[0], i) if run else (i, i)
            if best is None or run[1] - run[0] > best[1] - best[0]:
                best = run
        else:
            run = None
    if best is None:
        return t_a, t_a
    return (best[0] + n / 2) / SR, (best[1] + n / 2) / SR


# ---------- verification ----------

def _norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def fill_gaps(mp3, doc, key, workdir, tag, min_gap=1.0):
    """Re-transcribe every gap over min_gap seconds on a clip and insert the words Whisper dropped."""
    words, dur = list(doc["words"]), float(doc.get("duration") or 0)
    gaps, usd, offset_idx = [], 0.0, 0
    spans = []
    for i in range(len(words) + 1):
        a = words[i - 1]["end"] if i > 0 else 0.0
        b = words[i]["start"] if i < len(words) else dur
        if b - a > min_gap:
            spans.append((i, a, b))
    for i, a, b in spans:
        ca, cb = max(0.0, a - 0.3), min(dur, b + 0.3) if dur else b + 0.3
        cpath = workdir / f"{tag}.gap_{a:.2f}.mp3"
        clip(mp3, ca, cb, cpath)
        cdoc, c_usd, _ = transcribe(cpath, key)
        usd += c_usd or 0
        C = [{**w, "start": round(w["start"] + ca, 3), "end": round(w["end"] + ca, 3)} for w in cdoc["words"]]
        # main words inside the clip window, with their global indices
        M = [(k, w) for k, w in enumerate(doc["words"]) if (w["start"] + w["end"]) / 2 >= ca and (w["start"] + w["end"]) / 2 <= cb]

        sm = difflib.SequenceMatcher(None, [_norm(w["w"]) for _, w in M], [_norm(w["w"]) for w in C], autojunk=False)
        c_of = {}
        for blk in sm.get_matching_blocks():
            for q in range(blk.size):
                c_of[M[blk.a + q][0]] = blk.b + q
        left = max((c_of[k] for k in c_of if k <= i - 1), default=-1)
        right = min((c_of[k] for k in c_of if k >= i), default=len(C))
        got = [w for w in C[left + 1:right] if w["end"] > a - 0.5 and w["start"] < b + 0.5]
        ins, t = [], a
        for w in got:
            s = min(max(w["start"], t), b - 0.05)
            e = min(max(w["end"], s + 0.05), b)
            ins.append({"w": w["w"], "start": round(s, 3), "end": round(e, 3), "src": "gap", "approx": True})
            t = e
        gaps.append({"from": round(a, 3), "to": round(b, 3), "clip": cpath.name, "clip_text": cdoc["text"],
                     "inserted": " ".join(w["w"] for w in ins) or None, "kind": "dropped words" if ins else "pause"})
        pos = i + offset_idx
        words[pos:pos] = ins
        offset_idx += len(ins)
    out = {**doc, "words": words}
    if gaps:
        out["gaps"] = gaps
    return out, gaps, usd


def verify(text, mp3, key, workdir, tag, aliases, min_gap):
    raw, stt_usd, _ = transcribe(mp3, key)
    (workdir / f"{tag}.words.raw.json").write_text(json.dumps(raw, indent=1))
    doc, gaps, gap_usd = fill_gaps(mp3, raw, key, workdir, tag, min_gap)
    doc["text_script"] = text
    (workdir / f"{tag}.words.json").write_text(json.dumps(doc, indent=1))
    d = wordnorm.diff(text, [w["w"] for w in doc["words"]], aliases)
    return doc, d, gaps, (stt_usd or 0) + gap_usd


def score(d):
    c = d["counts"]
    return (c["content"], c["spelling"] + c["minor"])


# ---------- main modes ----------

def voice_mode(d, a, key):
    t0 = time.time()
    text, emph = read_script(d)
    direction = direction_for(emph)
    work = d / "work" / "voice"
    work.mkdir(parents=True, exist_ok=True)
    if (d / "voice.mp3").exists() and not a.force:
        sys.exit(f"{d / 'voice.mp3'} exists; pass --force to re-voice (the old file moves to work/voice/), "
                 "--verify-only to check it, or --splice-last-line to fix the final sentence")
    if (d / "voice.mp3").exists():
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        for f in ("voice.mp3", "voice.words.json", "voice.json"):
            if (d / f).exists():
                shutil.move(str(d / f), str(work / f"previous_{stamp}_{f}"))
    takes = []
    for n in range(1, min(a.takes, MAX_TAKES) + 1):
        tag = f"take{n}"
        print(f"{tag}: voicing {len(text.split())} words ...", flush=True)
        pcm, gen = tts(text, direction, key)
        wav, mp3 = work / f"{tag}.wav", work / f"{tag}.mp3"
        pcm_to_files(pcm, wav, mp3)
        secs = round(len(pcm) / (2 * SR), 3)
        doc, df, gaps, stt_usd = verify(text, mp3, key, work, tag, a.aliases, a.gap)
        takes.append({"take": n, "file": f"work/voice/{tag}.mp3", "seconds": secs, "generation_id": gen,
                      "stt_usd": round(stt_usd, 6), "gaps": gaps, "diff": wordnorm.public(df), "_doc": doc, "_score": score(df)})
        print(f"{tag}: {secs} s, {wordnorm.format_diff(df)}", flush=True)
        if df["ok"]:
            break
    print("cost lookup ...", flush=True)
    for t in takes:
        usd = generation_cost(t["generation_id"], key)
        t["tts_usd"] = usd if usd is not None else round(t["seconds"] * USD_PER_TTS_SECOND, 6)
        t["tts_usd_estimated"] = usd is None
    best = min(takes, key=lambda t: (t["_score"], t["take"]))
    shutil.copy(work / f"take{best['take']}.mp3", d / "voice.mp3")
    words = {k: v for k, v in best["_doc"].items() if k != "text_script"}
    words["audio"] = "voice.mp3"
    (d / "voice.words.json").write_text(json.dumps(words, indent=1))
    tts_total = sum(t["tts_usd"] for t in takes)
    stt_total = sum(t["stt_usd"] for t in takes)
    rec = {
        "model": TTS_MODEL, "voice": VOICE, "stt_model": STT_MODEL, "created": iso(),
        "seconds": best["seconds"], "text": text, "direction": direction,
        "usd": round(tts_total + stt_total, 6),
        "cost": {"tts_usd": round(tts_total, 6), "stt_usd": round(stt_total, 6), "total_usd": round(tts_total + stt_total, 6),
                 "estimated": any(t["tts_usd_estimated"] for t in takes),
                 "note": "tts cost from /generation (retried while 404); estimated at %s USD per audio second when it never answered" % USD_PER_TTS_SECOND},
        "takes_tried": len(takes), "chosen_take": best["take"], "verified": best["diff"]["ok"],
        "diff": best["diff"], "gaps": best["gaps"],
        "takes": [{k: v for k, v in t.items() if not k.startswith("_")} for t in takes],
        "elapsed_s": round(time.time() - t0, 1),
    }
    (d / "voice.json").write_text(json.dumps(rec, indent=1))
    print(f"{d.name}: take {best['take']} of {len(takes)}, {best['seconds']} s, {rec['usd']} USD"
          f"{' (estimated)' if rec['cost']['estimated'] else ''}, verified={rec['verified']}")
    if not rec["verified"]:
        print("\nEVERY TAKE HAS A CONTENT DIFFERENCE. Best take written with verified=false. Diff of the kept take:")
        print(wordnorm.format_diff(wordnorm.diff(text, [w["w"] for w in best["_doc"]["words"]], a.aliases)))
        sys.exit(2)


def verify_mode(d, a, key):
    text, _ = read_script(d)
    audio = pathlib.Path(a.audio) if a.audio else d / "voice.mp3"
    work = d / "work" / "voice"
    work.mkdir(parents=True, exist_ok=True)
    doc, df, gaps, usd = verify(text, audio, key, work, "verify", a.aliases, a.gap)
    rep = {"audio": str(audio), "checked": iso(), "stt_usd": round(usd, 6), "gaps": gaps, "diff": wordnorm.public(df)}
    (work / "verify.json").write_text(json.dumps(rep, indent=1))
    print(wordnorm.format_diff(df))
    for g in gaps:
        print(f"gap {g['from']}-{g['to']} s: {g['kind']}: {g['inserted']!r}")
    print(f"words with gap fill: {work / 'verify.words.json'}; report: {work / 'verify.json'}; STT {usd:.6f} USD")
    sys.exit(0 if df["ok"] else 2)


def _boundary(text_prefix, full_text, words):
    """Index (in words) of the last transcript word of text_prefix, using the diff's token map."""
    n_prefix = len(wordnorm.normalize(wordnorm.script_words(text_prefix)))
    df = wordnorm.diff(full_text, [w["w"] for w in words])
    m = df["_map"]
    if n_prefix - 1 not in m:
        return None, df
    return max(df["_H"][m[n_prefix - 1]].src), df


def splice_mode(d, a, key):
    t0 = time.time()
    text, emph = read_script(d)
    direction = direction_for(emph)
    sents = sentences(text)
    if len(sents) < 2:
        sys.exit("need at least two sentences to splice the last one")
    last, prev = sents[-1], sents[-2]
    prefix_text = " ".join(sents[:-1])
    ctx_text = f"{prev} {last}"
    work = d / "work" / "splice"
    work.mkdir(parents=True, exist_ok=True)
    orig_mp3, orig_words_f = d / "voice.mp3", d / "voice.words.json"
    if not orig_mp3.exists() or not orig_words_f.exists():
        sys.exit("--splice-last-line needs the existing voice.mp3 and voice.words.json")
    ow = json.loads(orig_words_f.read_text())["words"]
    j, odf = _boundary(prefix_text, prefix_text, ow)
    if j is None or j + 1 > len(ow):
        sys.exit("cannot find the end of the second-to-last sentence in voice.words.json:\n" + wordnorm.format_diff(odf))
    o_prev_end = ow[j]["end"]
    x = decode(orig_mp3)
    o_dur = len(x) / SR
    o_next = ow[j + 1]["start"] if j + 1 < len(ow) else o_dur
    o_end, o_on = find_pause(x, ow[j]["start"], min(o_next + 0.3, o_dur))
    print(f"original: '{ow[j]['w']}' speech ends {o_end:.3f} s, last sentence onset {o_on:.3f} s")

    # voice the last two sentences, verify, up to the take limit
    take = None
    stt_usd = 0.0
    tries = []
    if a.reuse_takes:  # a take voiced by an earlier run that failed later (no new TTS cost)
        for wav in sorted(work.glob("take[0-9].wav")):
            wf = work / f"{wav.stem}.words.json"
            if wf.exists():
                tdoc = json.loads(wf.read_text())
                if tdoc.get("text_script") == ctx_text and wordnorm.diff(ctx_text, [w["w"] for w in tdoc["words"]], a.aliases)["ok"]:
                    take = (int(wav.stem[4:]), wav, tdoc)
                    print(f"reusing {wav.name}")
                    break
    first = 1 + max([int(p.stem[4:]) for p in work.glob("take[0-9].wav")] or [0])
    for n in range(first, first + min(a.takes, MAX_TAKES)):
        if take is not None:
            break
        tag = f"take{n}"
        pcm, gen = tts(ctx_text, direction, key)
        wav, mp3 = work / f"{tag}.wav", work / f"{tag}.mp3"
        pcm_to_files(pcm, wav, mp3)
        (work / f"{tag}.meta.json").write_text(json.dumps({"generation_id": gen, "text": ctx_text}))
        tdoc, tdf, gaps, usd = verify(ctx_text, mp3, key, work, tag, a.aliases, a.gap)
        stt_usd += usd
        tries.append({"take": n, "generation_id": gen, "seconds": round(len(pcm) / (2 * SR), 3), "diff": wordnorm.public(tdf)})
        print(f"{tag}: {wordnorm.format_diff(tdf)}")
        if tdf["ok"]:
            take = (n, wav, tdoc)
            break
    if take is None:
        print("no take of the last two sentences matched; nothing spliced")
        sys.exit(2)
    n, wav, tdoc = take
    tw = tdoc["words"]
    k, _ = _boundary(prev, ctx_text, tw)
    if k is None or k + 1 >= len(tw):
        sys.exit("cannot find the sentence boundary in the take")
    y = decode(wav)
    t_end, t_on = find_pause(y, tw[k]["start"], min(tw[k + 1]["start"] + 0.3, len(y) / SR))
    print(f"take: speech ends {t_end:.3f} s, last sentence onset {t_on:.3f} s")
    off = o_on - t_on  # take time + off = output time
    lo = max(o_end + 0.015, t_end + off + 0.015, off)
    hi = o_on - 0.015
    if hi <= lo:
        sys.exit(f"pause too short to splice (window {lo:.3f} to {hi:.3f} s)")
    n20, h5, off_n = int(0.02 * SR), int(0.005 * SR), int(round(off * SR))
    best = None
    for i in range(int(lo * SR), int(hi * SR), h5):
        od, td = rms_db(x, i - n20 // 2, n20), rms_db(y, i - off_n - n20 // 2, n20)
        s = max(od, td)
        if best is None or s < best[0]:
            best = (s, i, od, td)
    _, ci, od, td = best
    # zero crossing near the cut: smallest |orig| + |take| within 3 ms, prefer a sign change in the original
    span = int(0.003 * SR)
    cands = [i for i in range(ci - span, ci + span) if 0 < i < len(x) and 0 <= i - off_n < len(y)]
    zc = [i for i in cands if (x[i - 1] <= 0 <= x[i]) or (x[i - 1] >= 0 >= x[i])]
    ci = min(zc or cands, key=lambda i: abs(x[i]) + abs(y[i - off_n]))
    o_l, t_l = lufs(x[int(o_on * SR):]), lufs(y[int(t_on * SR):])
    gain_db = round(o_l - t_l, 1) if o_l is not None and t_l is not None else 0.0
    g = 10 ** (gain_db / 20)
    xf = int(0.010 * SR)
    a0 = ci - xf // 2
    out = array.array("f", x[:a0])
    for q in range(xf):
        w = 0.5 - 0.5 * math.cos(math.pi * (q + 0.5) / xf)  # raised cosine, 0 -> 1
        i = a0 + q
        ov = x[i] if i < len(x) else 0.0
        tv = y[i - off_n] * g if 0 <= i - off_n < len(y) else 0.0
        out.append(ov * (1 - w) + tv * w)
    out.extend(v * g for v in y[a0 + xf - off_n:])
    seg = out[max(1, a0 - xf):a0 + 2 * xf]
    max_step = max(abs(seg[i] - seg[i - 1]) for i in range(1, len(seg)))
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    spliced_wav = work / f"splice_take{n}.wav"
    write_wav(out, spliced_wav)
    for f, keep in (("voice.mp3", "voice.orig.mp3"), ("voice.words.json", "voice.words.orig.json")):
        dst = d / keep if not (d / keep).exists() else d / keep.replace(".orig.", f".orig.{stamp}.")
        shutil.copy(d / f, dst)
    ffmpeg("-i", str(spliced_wav), "-b:a", "160k", str(d / "voice.mp3"))
    cut_s = ci / SR
    ndoc, nusd, _ = transcribe(d / "voice.mp3", key)
    stt_usd += nusd or 0
    (work / f"splice_take{n}.words.raw.json").write_text(json.dumps(ndoc, indent=1))
    merged = [w for w in ow if w["end"] <= cut_s] + [w for w in ndoc["words"] if w["start"] >= cut_s - 0.02]
    wdoc = {"audio": "voice.mp3", "duration": ndoc["duration"], "text": ndoc["text"], "words": merged,
            "splice": {"cut_s": round(cut_s, 3), "before": "original words", "after": "re-transcription of the spliced file"}}
    (d / "voice.words.json").write_text(json.dumps(wdoc, indent=1))
    fdf = wordnorm.diff(text, [w["w"] for w in merged], a.aliases)
    tts_usd, est = 0.0, False
    for t in tries:
        c = generation_cost(t["generation_id"], key)
        t["tts_usd"] = c if c is not None else round(t["seconds"] * USD_PER_TTS_SECOND, 6)
        t["tts_usd_estimated"] = c is None
        tts_usd += t["tts_usd"]; est = est or c is None
    rep = {"when": iso(), "why": a.reason or "final sentence re-voiced", "text": ctx_text,
           "take": f"work/splice/take{n}.wav", "takes": tries, "reused_take": not tries or tries[-1]["take"] != n, "cut_s": round(cut_s, 6), "orig_onset_s": round(o_on, 3),
           "take_onset_s": round(t_on, 3), "offset_s": round(off, 4), "take_gain_db": gain_db,
           "orig_tail_lufs": o_l, "take_tail_lufs": t_l, "orig_rms_at_cut_db": round(od, 1), "take_rms_at_cut_db": round(td, 1),
           "max_step_at_cut": round(max_step, 6), "crossfade_ms": 10, "seconds": round(len(out) / SR, 3),
           "original": "voice.orig.mp3", "lossless": str(spliced_wav.relative_to(d)),
           "usd": round(tts_usd + stt_usd, 6), "usd_estimated": est, "diff": wordnorm.public(fdf),
           "method": "take aligned so its first word of the last sentence lands on the original onset (20 ms RMS); cut at the "
                     "quietest point of the pause, at a zero crossing, 10 ms raised-cosine crossfade; take gain matches the tail loudness",
           "elapsed_s": round(time.time() - t0, 1)}
    (work / f"splice_take{n}.json").write_text(json.dumps(rep, indent=1))
    vj = json.loads((d / "voice.json").read_text()) if (d / "voice.json").exists() else {"model": TTS_MODEL, "voice": VOICE}
    vj.setdefault("splices", []).append(rep)
    vj["text"], vj["seconds"], vj["verified"] = text, rep["seconds"], fdf["ok"]
    vj["diff"] = wordnorm.public(fdf)
    (d / "voice.json").write_text(json.dumps(vj, indent=1))
    print(f"spliced at {cut_s:.3f} s (orig {od:.1f} dB, take {td:.1f} dB, step {max_step:.5f}), gain {gain_db} dB, "
          f"{rep['seconds']} s, {rep['usd']} USD{' (estimated)' if est else ''}")
    print(wordnorm.format_diff(fdf))
    sys.exit(0 if fdf["ok"] else 2)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("short_dir")
    ap.add_argument("--takes", type=int, default=MAX_TAKES, help="most takes to try (1 to 3, default 3)")
    ap.add_argument("--alias", action="append", default=[], help="SCRIPT=HEARD accepted spelling, e.g. MeerKAT=Miracat")
    ap.add_argument("--gap", type=float, default=1.0, help="re-transcribe gaps longer than this (seconds)")
    ap.add_argument("--force", action="store_true", help="re-voice even if voice.mp3 exists")
    ap.add_argument("--verify-only", action="store_true", help="verify the existing voice.mp3 (or --audio); no TTS")
    ap.add_argument("--audio", help="with --verify-only: the file to verify")
    ap.add_argument("--splice-last-line", action="store_true", help="re-voice only the final sentence and splice it in")
    ap.add_argument("--reason", help="with --splice-last-line: why (stored in voice.json)")
    ap.add_argument("--reuse-takes", action="store_true", help="with --splice-last-line: reuse a matching take in work/splice/ from an earlier run")
    a = ap.parse_args()
    a.aliases = dict(x.split("=", 1) for x in a.alias)
    d = pathlib.Path(a.short_dir)
    if not (d / "script.md").exists():
        sys.exit(f"{d / 'script.md'} not found")
    key = openrouter_key()
    if a.verify_only:
        verify_mode(d, a, key)
    elif a.splice_last_line:
        splice_mode(d, a, key)
    else:
        voice_mode(d, a, key)


if __name__ == "__main__":
    main()
