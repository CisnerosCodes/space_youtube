#!/usr/bin/env python3
"""Signal Delay automatic mixer: narration + music bed + cue-driven SFX + sonic logo.

Usage:
  python3 mix.py --voice <mp3> --bed <wav> --cues <cues.json> --out <wav|mp3|m4a|aac>
                 [--video <mp4> --mux <out.mp4>] [--report <report.json>]

cues.json: a list of {"frame": N, "fps": 30, "type": "...", "sfx": "name", "gain_db": optional}.
  "sfx" is optional (defaults from CUE_TYPES below); it is a file name in sfx/ without ".wav".
  "gain_db" is added to the cue type's default level.

What it does:
  * SFX are placed so their peak (sfx.json peak_ms) lands one frame after the cue frame
    (light before sound). Each SFX level is set relative to the voice (CUE_TYPES dB), and
    lowered a further SPEECH_OVERLAP_DB when it lands while the narrator is talking.
  * The bed is conformed to the 120 BPM grid (beds.json): it starts on a beat so beats land on
    15-frame multiples, loops its loop region if the video is longer than the file, gets a gentle
    2.5 kHz dip to clear the voice, and is ducked by a sidechain compressor keyed by the voice:
    it sits BED_UNDER_SPEECH_DB under the speech while talking (calibrated by measurement) and
    rises GAP_RISE_DB in pauses. It fades in at the start and out into the sonic logo.
  * The mix ends on the sonic logo (sfx/logo.wav): at the "wordmark_echo" cue, or, when there
    is none, LOGO_AFTER_VOICE_S after the last word.
  * Loudness: a 4x-oversampled true-peak limiter makes room, then ffmpeg loudnorm two-pass
    (linear mode) brings the mix to TARGET_LUFS with true peak <= TARGET_TP; the encoded file is
    measured again and the pass is repeated with more margin if the codec pushed a peak over.
  * Optional mux onto a video (video stream copied, audio AAC 256 kb/s 48 kHz).
"""
import argparse, json, os, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
SFX_DIR = os.path.join(HERE, "sfx")
BEDS_JSON = os.path.join(HERE, "beds", "beds.json")
SR = 48000

# Default sound per cue type and its level in dB relative to the voice (100 ms RMS of the SFX's
# loudest moment vs the narration's typical loud moment). Negative = under the voice.
CUE_TYPES = {
    "hard_cut":      {"sfx": "whoosh_short",  "db": -15},
    "number_slam":   {"sfx": "impact_big",    "db": -8},
    "cat_in":        {"sfx": "pop",           "db": -13},
    "cat_out":       {"sfx": "pop_reverse",   "db": -15},
    "chip_in":       {"sfx": "tick",          "db": -12},
    "echo_land":     {"sfx": "ping_echo",     "db": -13},
    "next_card_in":  {"sfx": "page_turn_air", "db": -13},
    "wordmark_echo": {"sfx": "logo",          "db": -4},
    # extra types, used rarely
    "reveal":        {"sfx": "swell_reveal",  "db": -14},
    "riser":         {"sfx": "riser_1s",      "db": -15},
    "big_riser":     {"sfx": "riser_2s",      "db": -14},
    "impact":        {"sfx": "impact_soft",   "db": -11},
    "glitch":        {"sfx": "glitch_short",  "db": -20},
    "scene_move":    {"sfx": "whoosh_long",   "db": -16},
    "cat_chirp":     {"sfx": "cat_mrrp",      "db": -14},
}

TARGET_LUFS = -14.0
TARGET_TP = -1.5
BED_UNDER_SPEECH_DB = 20.0     # bed loudness under the speech while talking (LU)
GAP_RISE_DB = 6.0              # how far the bed comes up in pauses
SPEECH_OVERLAP_DB = -3.0       # extra SFX attenuation when it lands on speech
BED_FADE_IN_S = 0.35
BED_FADE_OUT_S = 1.6           # fade ending LOGO_BED_TAIL_S after the logo starts
LOGO_BED_TAIL_S = 0.35
LOGO_AFTER_VOICE_S = 0.30
END_TAIL_S = 0.15
MIN_CUE_GAP_S = 0.25           # warn when two cue sounds peak closer than this


def sh(cmd, capture=False):
    r = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return r.stderr if capture else None


def decode(path, channels):
    with tempfile.TemporaryDirectory() as td:
        tmp = os.path.join(td, "d.wav")
        sh(["ffmpeg", "-y", "-i", path, "-vn", "-af", f"aresample={SR}:resampler=soxr",
            "-ar", str(SR), "-ac", str(channels), "-c:a", "pcm_f32le", tmp])
        x, _ = sf.read(tmp, dtype="float64", always_2d=True)
    return x


def rms_db(x, win_s):
    w = max(1, int(win_s * SR))
    p = np.convolve(x ** 2, np.ones(w) / w, mode="same")
    return 10 * np.log10(p + 1e-12)


def speech_regions(v, merge_gap_s=0.35):
    """Boolean speech mask from the voice: 30 ms RMS above (95th pct - 30 dB), gaps < merge_gap merged."""
    lvl = rms_db(v, 0.03)
    thr = np.percentile(lvl, 95) - 30
    act = lvl > thr
    # merge short gaps
    idx = np.flatnonzero(np.diff(act.astype(int)))
    edges = np.concatenate([[0], idx + 1, [len(act)]])
    for a, b in zip(edges[:-1], edges[1:]):
        if not act[a] and a > 0 and b < len(act) and (b - a) < merge_gap_s * SR:
            act[a:b] = True
    return act, thr


def segments(mask):
    d = np.diff(np.concatenate([[0], mask.astype(int), [0]]))
    return list(zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)))


def loud(x, mask=None):
    meter = pyln.Meter(SR)
    if mask is not None:
        x = x[mask]
    if len(x) < int(0.5 * SR):
        return float("nan")
    x = x if x.ndim == 2 else x[:, None]
    return float(meter.integrated_loudness(x))


def duck_gain_db(v, act_thr, depth_db, attack_s=0.015, release_s=0.35, hold_s=0.12, knee_db=10.0):
    """Sidechain compressor gain computer keyed by the voice: 0 dB in silence, -depth_db once the
    voice is knee_db above the threshold, smoothed with hold, attack and release."""
    lvl = rms_db(v, 0.02)
    amount = np.clip((lvl - act_thr) / knee_db, 0, 1)        # 0..1 gain-reduction amount
    # hold the max amount over the last hold_s and look ahead 20 ms (bed dips just before a word)
    amount = _hold(amount, int(hold_s * SR), int(0.02 * SR))
    a_att = np.exp(-1 / (attack_s * SR)); a_rel = np.exp(-1 / (release_s * SR))
    out = np.empty_like(amount); g = 0.0
    # one-pole attack/release follower (decimated for speed, then interpolated)
    step = 48
    am = amount[::step]
    a_att_s, a_rel_s = a_att ** step, a_rel ** step
    sm = np.empty_like(am)
    for i, x in enumerate(am):
        coef = a_att_s if x > g else a_rel_s
        g = coef * g + (1 - coef) * x
        sm[i] = g
    out = np.interp(np.arange(len(amount)), np.arange(len(am)) * step, sm)
    return -depth_db * out


def _hold(x, back, ahead):
    """y[i] = max(x[i - back : i + ahead])."""
    from scipy.ndimage import maximum_filter1d
    size = back + ahead + 1
    y = maximum_filter1d(x, size=size, mode="nearest")  # centred window
    shift = (back - ahead) // 2                           # move the window into the past
    return np.concatenate([np.full(shift, y[0]), y[:len(y) - shift]]) if shift > 0 else y


def voice_compressor(v, ref_db, below_ref_db=8.0, ratio=3.0, knee_db=6.0, attack_s=0.004, release_s=0.08):
    """Gentle feed-forward compressor for the narration (no makeup gain): threshold sits
    below_ref_db under the voice's typical loud moment. Returns (compressed, max GR dB)."""
    lvl = rms_db(v, 0.005)
    T = ref_db - below_ref_db
    over = lvl - T
    gr = np.where(over <= -knee_db / 2, 0.0,
                  np.where(over >= knee_db / 2, over * (1 / ratio - 1),
                           (1 / ratio - 1) * (over + knee_db / 2) ** 2 / (2 * knee_db)))
    # smooth the gain (dB) with attack / release, decimated by 8 samples
    step = 8; g = gr[::step]; out = np.empty_like(g); cur = 0.0
    aa, ar = np.exp(-step / (attack_s * SR)), np.exp(-step / (release_s * SR))
    for i, x in enumerate(g):
        c = aa if x < cur else ar
        cur = c * cur + (1 - c) * x
        out[i] = cur
    gsm = np.interp(np.arange(len(v)), np.arange(len(g)) * step, out)
    return v * 10 ** (gsm / 20), gsm


def peaking_eq(f0, gain_db, q):
    A = 10 ** (gain_db / 40); w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w0), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w0), 1 - al / A]
    return np.array(b) / a[0], np.array(a) / a[0]


def load_bed(path, need_n):
    x = decode(path, 2)
    meta = None
    if os.path.exists(BEDS_JSON):
        for b in json.load(open(BEDS_JSON))["beds"]:
            if os.path.basename(b["file"]) == os.path.basename(path):
                meta = b
    start = int(round((meta or {}).get("beat_phase_s", 0.0) * SR))
    x = x[start:]
    if len(x) < need_n:
        if not meta:
            sys.exit("bed too short and no loop points in beds.json")
        la, lb = int(meta["loop_start_s"] * SR) - start, int(meta["loop_end_s"] * SR) - start
        xf = int(0.04 * SR); pre = int(0.008 * SR)
        fade = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, xf)))[:, None]
        out = x[:lb].copy()
        while len(out) < need_n + xf:
            s0 = len(out) - pre - xf
            inc = x[la - pre - xf: la]
            out[s0:s0 + xf] = out[s0:s0 + xf] * (1 - fade) + inc[:xf] * fade
            out[s0 + xf:] = inc[xf:]
            out = np.concatenate([out, x[la:lb]])
        x = out
    return x[:need_n], meta


def load_sfx(name):
    x, sr = sf.read(os.path.join(SFX_DIR, f"{name}.wav"), dtype="float64")
    assert sr == SR
    meta = {s["name"]: s for s in json.load(open(os.path.join(SFX_DIR, "sfx.json")))["sounds"]}
    return x, meta[name]["peak_ms"] / 1000.0


def true_peak_limiter(x, ceiling, lookahead_s=0.003, release_s=0.08):
    """Lookahead limiter on 4x oversampled peaks; x is (n, ch). Returns limited x."""
    up = signal.resample_poly(x, 4, 1, axis=0)
    pk = np.abs(up).max(axis=1).reshape(-1, 4).max(axis=1)[: len(x)]
    pk = np.pad(pk, (0, len(x) - len(pk)), mode="edge")
    need = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9))
    from scipy.ndimage import minimum_filter1d
    la = int(lookahead_s * SR)
    g = minimum_filter1d(need, size=2 * la + 1)
    # smooth: release follower then a short moving average (attack)
    a_rel = np.exp(-1 / (release_s * SR)); sm = np.empty_like(g); cur = 1.0
    for i in range(0, len(g), 16):
        blk = g[i:i + 16].min()
        cur = blk if blk < cur else a_rel ** 16 * cur + (1 - a_rel ** 16) * blk
        sm[i:i + 16] = cur
    sm = np.minimum(sm, g)
    k = la or 1
    sm = np.convolve(np.pad(sm, (k, k), mode="edge"), np.ones(k) / k, mode="same")[k:-k]
    sm = np.minimum(sm, minimum_filter1d(need, size=2 * la + 1))
    return x * sm[:, None], sm


def gr_stats(gr_db, act):
    """Gain-reduction statistics: max, where, median while talking, share of time above 1 / 3 dB."""
    i = int(np.argmin(gr_db))
    return dict(max_gr_db=round(float(-gr_db[i]), 2), at_s=round(i / SR, 3),
                median_gr_while_talking_db=round(float(-np.median(gr_db[act[:len(gr_db)]])), 2),
                pct_time_over_1db=round(100 * float((gr_db < -1).mean()), 2),
                pct_time_over_3db=round(100 * float((gr_db < -3).mean()), 2))


def ebur128(path):
    err = sh(["ffmpeg", "-nostats", "-i", path, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"], capture=True)
    tail = err[err.rfind("Summary:"):]
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1))
    LRA = float(re.search(r"LRA:\s+(-?[\d.]+) LU", tail).group(1))
    TP = float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", tail).group(1))
    return dict(I=I, LRA=LRA, TP=TP)


def loudnorm_two_pass(src, dst, codec_args, tp_target):
    flt = f"loudnorm=I={TARGET_LUFS}:TP={tp_target}:LRA=20"
    err = sh(["ffmpeg", "-nostats", "-i", src, "-af", flt + ":print_format=json", "-f", "null", "-"], capture=True)
    m = json.loads(err[err.rfind("{"): err.rfind("}") + 1])
    flt2 = (flt + f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json")
    err2 = sh(["ffmpeg", "-y", "-nostats", "-i", src, "-af", flt2, "-ar", str(SR)] + codec_args + [dst], capture=True)
    m2 = json.loads(err2[err2.rfind("{"): err2.rfind("}") + 1])
    return m, m2


def codec_for(path):
    ext = os.path.splitext(path)[1].lower()
    return {".wav": ["-c:a", "pcm_s24le"], ".mp3": ["-c:a", "libmp3lame", "-b:a", "256k"],
            ".m4a": ["-c:a", "aac", "-b:a", "256k"], ".aac": ["-c:a", "aac", "-b:a", "256k"]}[ext]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", required=True); ap.add_argument("--bed", required=True)
    ap.add_argument("--cues", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--video"); ap.add_argument("--mux")
    ap.add_argument("--voice-offset", type=float, default=0.0, help="seconds of silence before the voice")
    ap.add_argument("--bed-under", type=float, default=BED_UNDER_SPEECH_DB)
    ap.add_argument("--gap-rise", type=float, default=GAP_RISE_DB)
    ap.add_argument("--report", help="write a JSON report (default: <out>.report.json)")
    ap.add_argument("--stems", help="also write voice / bed / sfx stems (before the final gain) to this folder")
    a = ap.parse_args()

    cues = json.load(open(a.cues))
    voice = decode(a.voice, 1)[:, 0]
    voice = signal.sosfilt(signal.butter(2, 70, "highpass", fs=SR, output="sos"), voice)
    voice = np.concatenate([np.zeros(int(a.voice_offset * SR)), voice])
    act, thr = speech_regions(voice)
    voice_end = segments(act)[-1][1] / SR if act.any() else 0.0
    v_lvl = rms_db(voice, 0.1)
    voice_ref = float(np.percentile(v_lvl[act], 90))  # typical loud moment, dBFS (100 ms RMS)
    voice, voice_gr_curve = voice_compressor(voice, voice_ref)
    v_lvl = rms_db(voice, 0.1)
    voice_ref = float(np.percentile(v_lvl[act], 90))

    # --- SFX layout
    logo_x, logo_peak = load_sfx("logo")
    placed, warnings = [], []
    has_logo_cue = any(c.get("type") == "wordmark_echo" for c in cues)
    if not has_logo_cue:
        f = int(np.ceil((voice_end + LOGO_AFTER_VOICE_S) * 30))
        cues = cues + [{"frame": f, "fps": 30, "type": "wordmark_echo", "auto": True}]
    for c in sorted(cues, key=lambda c: c["frame"] / c.get("fps", 30)):
        fps = c.get("fps", 30)
        typ = c.get("type", "")
        d = CUE_TYPES.get(typ, {"sfx": None, "db": -14})
        name = c.get("sfx") or d["sfx"]
        if not name:
            warnings.append(f"cue at frame {c['frame']} has no sfx and unknown type {typ!r}; skipped")
            continue
        x, peak = load_sfx(name)
        t_peak = (c["frame"] + 1) / fps
        start = t_peak - peak
        placed.append(dict(frame=c["frame"], fps=fps, type=typ, sfx=name, t_cue=round(c["frame"] / fps, 3),
                           t_peak=round(t_peak, 3), start=round(start, 3), x=x,
                           base_db=d["db"] + c.get("gain_db", 0.0), auto=c.get("auto", False)))
    for p, q in zip(placed, placed[1:]):
        if q["t_peak"] - p["t_peak"] < MIN_CUE_GAP_S:
            warnings.append(f"cues at {p['t_cue']} s and {q['t_cue']} s peak {1000*(q['t_peak']-p['t_peak']):.0f} ms apart")
    logo = [p for p in placed if p["sfx"] == "logo"]
    logo_start = logo[-1]["start"] if logo else voice_end + LOGO_AFTER_VOICE_S
    end_t = max([voice_end + 0.2] + [p["start"] + len(p["x"]) / SR for p in placed]) + END_TAIL_S
    video_dur = None
    if a.video:
        video_dur = float(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.video],
            capture_output=True, text=True, check=True).stdout.strip())
        if video_dur < end_t:
            warnings.append(f"video ({video_dur:.2f} s) is shorter than the mix ({end_t:.2f} s); the end is cut")
        end_t = video_dur
    N = int(round(end_t * SR))
    voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
    act = np.pad(act, (0, max(0, N - len(act))))[:N]

    sfx_bus = np.zeros(N)
    for p in placed:
        x = p["x"]
        s = int(round(p["start"] * SR))
        if s < 0:
            x = x[-s:]; s = 0
        x = x[: max(0, N - s)]
        sfx_peak_db = float(rms_db(p["x"], 0.1).max())
        pk_i = min(N - 1, int(p["t_peak"] * SR))
        on_speech = bool(act[max(0, pk_i - int(0.05 * SR)): pk_i + int(0.05 * SR)].any()) and p["sfx"] != "logo"
        g_db = voice_ref + p["base_db"] - sfx_peak_db + (SPEECH_OVERLAP_DB if on_speech else 0.0)
        sfx_bus[s: s + len(x)] += x * 10 ** (g_db / 20)
        p.update(gain_db=round(g_db, 1), on_speech=on_speech)

    # --- bed
    bed, bed_meta = load_bed(a.bed, N)
    b, aa = peaking_eq(2500, -3.0, 0.9)
    bed = signal.lfilter(b, aa, bed, axis=0)
    duck = duck_gain_db(voice, thr, a.gap_rise)
    env = np.ones(N)
    fi = int(BED_FADE_IN_S * SR); env[:fi] = np.sin(np.linspace(0, np.pi / 2, fi)) ** 2
    fo_end = int((logo_start + LOGO_BED_TAIL_S) * SR); fo_start = fo_end - int(BED_FADE_OUT_S * SR)
    if fo_start > 0:
        k = min(N, fo_end) - fo_start
        env[fo_start:fo_start + k] *= np.cos(np.linspace(0, np.pi / 2, fo_end - fo_start))[:k] ** 2
        env[fo_end:] = 0.0
    shaped = bed * (10 ** (duck / 20) * env)[:, None]
    # calibrate the bed level so it sits a.bed_under LU under the voice while talking
    body = act & (env > 0.99)
    v_l = loud(voice, body)
    g = 0.0
    for _ in range(3):
        b_l = loud(shaped * 10 ** (g / 20), body)
        g += (v_l - a.bed_under) - b_l
    bed_bus = shaped * 10 ** (g / 20)
    gaps = (~act) & (env > 0.99)
    gaps[: int(0.5 * SR)] = False
    bed_speech = loud(bed_bus, body); bed_gaps = loud(bed_bus, gaps)

    mix = bed_bus + (voice + sfx_bus)[:, None]
    if a.stems:
        os.makedirs(a.stems, exist_ok=True)
        for nm, x in (("voice", voice), ("bed", bed_bus), ("sfx", sfx_bus)):
            sf.write(os.path.join(a.stems, f"{nm}.wav"), x.astype(np.float32), SR, subtype="FLOAT")
    # --- loudness: true-peak room, then loudnorm two-pass (linear)
    pre_I = loud(mix)
    gain_needed = TARGET_LUFS - pre_I
    codec = codec_for(a.out)
    lossy = codec[1] != "pcm_s24le"
    margin = 0.6 if lossy else 0.3
    for attempt in range(4):
        tp_int = TARGET_TP - margin
        # iterate: limiting lowers the loudness a little, which raises the gain loudnorm will apply
        g_need = gain_needed
        for _ in range(4):
            ceiling = 10 ** ((tp_int - 0.25 - g_need) / 20)
            lim, lim_gain = true_peak_limiter(mix, ceiling)
            g_new = TARGET_LUFS - loud(lim)
            if abs(g_new - g_need) < 0.05:
                break
            g_need = g_new
        with tempfile.TemporaryDirectory() as td:
            pre = os.path.join(td, "pre.wav")
            sf.write(pre, lim.astype(np.float32), SR, subtype="FLOAT")
            m1, m2 = loudnorm_two_pass(pre, a.out, codec, tp_int)
        final = ebur128(a.out)
        if final["TP"] <= TARGET_TP and abs(final["I"] - TARGET_LUFS) <= 0.5:
            break
        margin += 0.4
    # --- mux
    if a.video and a.mux:
        sh(["ffmpeg", "-y", "-i", a.video, "-i", a.out, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k", "-ar", str(SR), "-shortest", a.mux])

    report = dict(
        out=a.out, voice=a.voice, bed=a.bed, cues_file=a.cues, duration_s=round(N / SR, 3),
        final=dict(integrated_lufs=final["I"], true_peak_dbtp=final["TP"], lra=final["LRA"],
                   loudnorm_mode=m2.get("normalization_type"),
                   limiter=gr_stats(20 * np.log10(np.maximum(lim_gain, 1e-6)), act),
                   voice_compressor=gr_stats(voice_gr_curve[:N] if len(voice_gr_curve) >= N else
                                             np.pad(voice_gr_curve, (0, N - len(voice_gr_curve))), act),
                   loudnorm_pass1=dict(input_i=m1["input_i"], input_tp=m1["input_tp"], input_lra=m1["input_lra"]),
                   attempts=attempt + 1),
        voice_vs_bed=dict(
            voice_lufs_while_talking=round(v_l, 2), bed_lufs_while_talking=round(bed_speech, 2),
            difference_while_talking_lu=round(v_l - bed_speech, 2),
            bed_lufs_in_gaps=round(bed_gaps, 2), difference_voice_vs_bed_in_gaps_lu=round(v_l - bed_gaps, 2),
            gap_rise_lu=round(bed_gaps - bed_speech, 2), duck_depth_db=a.gap_rise,
            note="measured on the stems before the shared final gain, so the differences hold in the final file"),
        bed_meta=dict(id=(bed_meta or {}).get("id"), bpm=(bed_meta or {}).get("bpm"),
                      start_offset_s=(bed_meta or {}).get("beat_phase_s")),
        logo_start_s=round(logo_start, 3), voice_end_s=round(voice_end, 3),
        cues=[{k: v for k, v in p.items() if k != "x"} for p in placed],
        warnings=warnings)
    rp = a.report or os.path.splitext(a.out)[0] + ".report.json"
    json.dump(report, open(rp, "w"), indent=2)
    print(json.dumps({k: report[k] for k in ("out", "duration_s", "final", "voice_vs_bed", "warnings")}, indent=1))


if __name__ == "__main__":
    main()
