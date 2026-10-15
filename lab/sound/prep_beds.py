#!/usr/bin/env python3
"""Turn the raw 30.8 s Lyria clips into channel-ready music beds.

For each bed:
  1. measure the native tempo (librosa beat tracking + linear fit of the beat times);
  2. conform it to exactly 120 BPM with ffmpeg rubberband (Motion.md grid: one beat = 15 frames
     at 30 fps), decoding to 48 kHz stereo;
  3. find a bar-aligned loop region whose end flows back into its start (log-mel similarity
     around both points, then sample-accurate alignment by cross-correlation);
  4. extend to TARGET_S seconds by repeating that region with short matched crossfades;
  5. normalize to BED_LUFS integrated and write beds/<id>.wav (24-bit) and beds/<id>.mp3;
  6. write beds/beds.json (file, prompt, bpm, duration, mood, cost, loop points, measurements).

Usage: python3 prep_beds.py
"""
import json, os, subprocess, tempfile
import numpy as np, soundfile as sf, librosa, pyloudnorm as pyln

HERE = os.path.dirname(os.path.abspath(__file__))
BEDS = os.path.join(HERE, "beds")
SR = 48000
GRID_BPM = 120.0
TARGET_S = 64.0
BED_LUFS = -16.0
XFADE_S = 0.040   # splice crossfade (raised cosine), ends PRE_ONSET_S before the beat
PRE_ONSET_S = 0.008

# body_start: where the full groove begins in the raw clip (read from spectrograms); the loop
# region is searched after it. use: which story types the bed suits.
SPEC = {
    "bedA_pluck": dict(body_start=0.0, use="default all-rounder: Launch Day, How Does That Work"),
    "bedB_lofi":  dict(body_start=0.0, use="calm explainers, Just Discovered, slower narration"),
    "bedC_chip":  dict(body_start=11.2, use="playful facts, By the Numbers"),
    "bedD_tense": dict(body_start=0.0, use="big reveals, impacts, countdowns, risky missions"),
    "bedE_arp":   dict(body_start=15.0, use="wonder: images of deep space, Just Discovered"),
    "bedF_house": dict(body_start=0.0, use="energetic Launch Day, fast lists"),
}


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def beat_fit(y_mono, sr, t0=0.0, t1=None):
    """Return (bpm, phase_s, beat_times) from a linear fit of tracked beats inside [t0, t1]."""
    hop = 256
    _, beats = librosa.beat.beat_track(y=y_mono, sr=sr, hop_length=hop, tightness=400)
    bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
    t1 = t1 or len(y_mono) / sr
    bt = bt[(bt >= t0) & (bt <= t1)]
    if len(bt) < 8:
        return float("nan"), float("nan"), bt
    idx = np.arange(len(bt))
    # robust fit: drop outliers once
    p = np.polyfit(idx, bt, 1)
    keep = np.abs(np.polyval(p, idx) - bt) < 0.03
    p = np.polyfit(idx[keep], bt[keep], 1)
    period, first = p
    phase = first % period
    return 60.0 / period, phase, bt


def comb_bpm(y_mono, sr, t0, coarse_bpm, span=0.03, step=0.005):
    """Refine tempo and phase by maximizing the summed onset strength on a perfect beat comb."""
    hop = 64
    env = librosa.onset.onset_strength(y=y_mono, sr=sr, hop_length=hop)
    env = env / (env.max() + 1e-9)
    t_end = len(y_mono) / sr - 0.2
    best = (-1, None, None)
    for bpm in np.arange(coarse_bpm * (1 - span), coarse_bpm * (1 + span), step):
        P = 60.0 / bpm
        k = np.arange(int((t_end - t0) / P) - 1)
        phis = np.linspace(0, P, 120, endpoint=False)
        idx = ((t0 + phis[:, None] + k[None, :] * P) * sr / hop).astype(int)
        sc = env[idx].mean(axis=1)
        j = int(np.argmax(sc))
        if sc[j] > best[0]:
            best = (sc[j], bpm, (t0 + phis[j]) % P)
    return best[1], best[2]


def grid_drift_ms(y_mono, sr, bpm, t0):
    """Best beat phase (ms) on a fixed bpm comb, in consecutive 16 s windows: equal values = no drift."""
    hop = 64
    env = librosa.onset.onset_strength(y=y_mono, sr=sr, hop_length=hop)
    P = 60.0 / bpm; out = []
    w = 16.0; t = t0
    while t + w <= len(y_mono) / sr - 0.2:
        phis = np.linspace(0, P, 500, endpoint=False)
        k = np.arange(int(w / P))
        idx = ((t + phis[:, None] + k[None, :] * P) * sr / hop).astype(int)
        out.append(round(1000 * float(phis[int(np.argmax(env[idx].mean(axis=1)))] + t) % (1000 * P), 1))
        t += w
    return out


def logmel(y, sr):
    M = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=2048, hop_length=480, n_mels=64)
    return np.log(M + 1e-6), 480


def find_loop(y_mono, sr, body_start, beat_s, phase):
    """Pick loop start a and end b (seconds, on beats, b - a = 16 or 32 beats) maximizing the
    similarity of the audio around a and around b; prefer the longer loop when nearly as good."""
    L, hop = logmel(y_mono, sr)
    dur = len(y_mono) / sr
    beats = np.arange(phase, dur, beat_s)
    best = None
    for n_beats in (32, 16):
        for a in beats:
            b = a + n_beats * beat_s
            if a < body_start + 2 * beat_s or b > dur - 3 * beat_s:
                continue
            fa, fb = int(a * sr / hop), int(b * sr / hop)
            w0, w1 = int(1.0 * beat_s * sr / hop), int(2.0 * beat_s * sr / hop)
            A = L[:, fa - w0: fa + w1].ravel(); B = L[:, fb - w0: fb + w1].ravel()
            A = A - A.mean(); B = B - B.mean()
            sim = float(A @ B / (np.linalg.norm(A) * np.linalg.norm(B) + 1e-9))
            score = sim + (0.02 if n_beats == 32 else 0.0)
            if best is None or score > best[0]:
                best = (score, sim, a, b, n_beats)
    return best


def refine(y_mono, sr, a, b, search_s=0.012):
    """Shift b by up to +-search_s so the waveform before b matches the waveform before a."""
    w = int(0.20 * sr); s = int(search_s * sr)
    ia, ib = int(a * sr), int(b * sr)
    ref = y_mono[ia - w: ia]
    best = (-1e9, 0)
    for d in range(-s, s + 1):
        seg = y_mono[ib + d - w: ib + d]
        c = float(ref @ seg / (np.linalg.norm(ref) * np.linalg.norm(seg) + 1e-9))
        if c > best[0]:
            best = (c, d)
    return ib + best[1], ia, best[0]


def onset_before(y_mono, sr, t, look=0.06):
    """Exact sample of the transient nearest the beat time t (energy rise), for splice placement."""
    i = int(t * sr); w = int(look * sr)
    seg = y_mono[i - w: i + w] ** 2
    k = int(0.002 * sr)
    env = np.convolve(seg, np.ones(k) / k, mode="same")
    rise = np.diff(env)
    return i - w + int(np.argmax(rise))


def splice_extend(y, ia, ib, target_n, xf, pre):
    """y[:ib] then y[ia:ib] repeated; each seam is a raised-cosine crossfade of xf samples that
    ends `pre` samples before the seam point (both sides are sample-aligned copies)."""
    out = y[:ib].copy()
    loop = y[ia:ib]
    fade = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, xf))[:, None]
    while len(out) < target_n + xf:
        # tail of out (before seam) fades out; matching audio before ia fades in
        s0 = len(out) - pre - xf
        incoming_pre = y[ia - pre - xf: ia]           # xf + pre samples before loop start
        out[s0: s0 + xf] = out[s0: s0 + xf] * (1 - fade) + incoming_pre[:xf] * fade
        out[s0 + xf:] = incoming_pre[xf:]
        out = np.concatenate([out, loop])
    return out[:target_n]


def discontinuity_db(y_mono, sr, seam_idx, natural_idx):
    """Peak spectral flux around each seam minus the flux around the same musical point
    played naturally (the loop start in the unspliced audio), in dB. ~0 = the seam is no
    more abrupt than the beat that is there anyway; positive = audible extra edge."""
    S = np.abs(librosa.stft(y_mono, n_fft=1024, hop_length=256))
    flux = np.sqrt((np.diff(S, axis=1).clip(min=0) ** 2).sum(axis=0))
    pk = lambda i: flux[max(0, i // 256 - 3): i // 256 + 3].max()
    ref = pk(natural_idx)
    return [20 * np.log10(pk(s) / ref) for s in seam_idx]


def main():
    calls = json.load(open(os.path.join(BEDS, "paid_calls.json")))
    cost_by = {}
    for c in calls:
        cost_by[c["name"]] = (c.get("usd") or 0, c["prompt"], c["generation_id"])
    meter = pyln.Meter(SR)
    out_meta = []
    for bid, spec in SPEC.items():
        raw = os.path.join(BEDS, "raw", f"{bid}_raw.mp3")
        y0, sr0 = librosa.load(raw, sr=SR, mono=True)
        coarse, _, _ = beat_fit(y0, SR, t0=spec["body_start"])
        bpm_native, _ = comb_bpm(y0, SR, spec["body_start"], coarse)
        # Lyria renders at the prompted integer BPM; snap when the estimate is within 0.05 BPM
        if abs(bpm_native - round(bpm_native)) < 0.05:
            bpm_native = float(round(bpm_native))
        factor = GRID_BPM / bpm_native
        with tempfile.TemporaryDirectory() as td:
            tmp = os.path.join(td, "c.wav")
            run(["ffmpeg", "-y", "-i", raw, "-af",
                 f"aresample={SR}:resampler=soxr,rubberband=tempo={factor:.6f}:transients=crisp:detector=percussive:phase=laminar:window=standard:smoothing=off:formant=preserved:pitchq=quality:channels=together",
                 "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le", tmp])
            y, _ = sf.read(tmp, dtype="float32")
        ym = y.mean(axis=1)
        body = spec["body_start"] / factor
        bpm_conf, phase = comb_bpm(ym, SR, body, GRID_BPM, span=0.01, step=0.01)
        beat_s = 60.0 / GRID_BPM
        score, sim, a, b, n_beats = find_loop(ym, SR, body, beat_s, phase)
        # put seam points on the actual transients, then align b to a
        # loop length is locked to an exact beat count so repeats never drift off the grid;
        # only the seam position moves (to the real transient near a)
        ia = onset_before(ym, SR, a)
        ib = ia + int(round(n_beats * beat_s * SR))
        ib, ia, xc = refine(ym, SR, ia / SR, ib / SR, search_s=0.0015)
        target_n = int(TARGET_S * SR)
        ext = splice_extend(y, ia, ib, target_n, int(XFADE_S * SR), int(PRE_ONSET_S * SR))
        seams = []
        p = ib
        while p < len(ext):
            seams.append(p); p += ib - ia
        disc = discontinuity_db(ext.mean(axis=1), SR, seams, ia)
        # loudness normalize, keep sample peak <= -1 dBFS
        lufs = meter.integrated_loudness(ext)
        g = 10 ** ((BED_LUFS - lufs) / 20)
        peak = np.abs(ext).max() * g
        if peak > 10 ** (-1 / 20):
            g *= 10 ** (-1 / 20) / peak
        ext = (ext * g).astype(np.float32)
        lufs_out = meter.integrated_loudness(ext)
        # edge fades so the file itself never clicks (mixer adds its own musical fades)
        e = int(0.005 * SR); r = np.linspace(0, 1, e)[:, None]
        ext[:e] *= r; ext[-e:] *= r[::-1]
        wav = os.path.join(BEDS, f"{bid}.wav"); mp3 = os.path.join(BEDS, f"{bid}.mp3")
        sf.write(wav, ext, SR, subtype="PCM_24")
        run(["ffmpeg", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "256k", mp3])
        # re-measure tempo on the final file
        bpm_final, phase_final = comb_bpm(ext.mean(axis=1), SR, body, GRID_BPM, span=0.01, step=0.01)
        drift = grid_drift_ms(ext.mean(axis=1), SR, GRID_BPM, body)
        # band balance of the final file
        Sx = np.abs(np.fft.rfft(ext.mean(axis=1))) ** 2; fr = np.fft.rfftfreq(len(ext), 1 / SR)
        band = lambda lo, hi: round(100 * float(Sx[(fr >= lo) & (fr < hi)].sum() / Sx.sum()), 1)
        usd, prompt, gid = cost_by[bid]
        out_meta.append(dict(
            id=bid, file=f"beds/{bid}.wav", mp3=f"beds/{bid}.mp3", raw=f"beds/raw/{bid}_raw.mp3",
            prompt=prompt, mood=None, use=spec["use"],
            bpm=round(float(bpm_final), 2), bpm_native=round(float(bpm_native), 2), stretch_factor=round(float(factor), 5),
            beat_phase_s=round(float(phase_final), 4), beat_phase_per_16s_ms=drift,
            duration=round(len(ext) / SR, 3), raw_duration=30.772,
            body_start_s=round(body, 3),
            loop_start_s=round(ia / SR, 4), loop_end_s=round(ib / SR, 4), loop_beats=n_beats,
            loop_similarity=round(float(sim), 3), seam_xcorr=round(float(xc), 3),
            seam_flux_vs_natural_db=[round(float(v), 1) for v in disc],
            lufs=round(float(lufs_out), 1), peak_dbfs=round(float(20 * np.log10(np.abs(ext).max())), 2),
            band_energy_pct={"<150": band(20, 150), "150-1k": band(150, 1000),
                             "1k-4k": band(1000, 4000), ">4k": band(4000, 24000)},
            model="google/lyria-3-clip-preview", generation_id=gid, cost=usd,
            sample_rate=SR, channels=2))
        print(bid, f"native {bpm_native:.2f} -> {bpm_final:.2f} BPM, phase/16s {drift}, loop {ia/SR:.2f}-{ib/SR:.2f}s "
              f"({n_beats} beats, sim {sim:.2f}, xcorr {xc:.2f}), seams vs natural {['%.1f' % v for v in disc]} dB, "
              f"{lufs_out:.1f} LUFS")
    moods = {"bedA_pluck": "playful, curious", "bedB_lofi": "warm, relaxed-curious",
             "bedC_chip": "bright, excited", "bedD_tense": "tense, building",
             "bedE_arp": "spacey, wonder", "bedF_house": "bouncy, upbeat"}
    for m in out_meta:
        m["mood"] = moods[m["id"]]
    json.dump(dict(
        note=("All beds are conformed to exactly 120 BPM (Motion.md grid, 1 beat = 15 frames at 30 fps) "
              "with rubberband, resampled to 48 kHz stereo, extended to 64 s by repeating loop_start..loop_end "
              "(raised-cosine 40 ms crossfades, sample-aligned), normalized to -16 LUFS. To go longer, repeat "
              "the same region; mix.py does this automatically. beat_phase_s is the time of the first beat "
              "modulo 0.5 s; mix.py shifts the bed so beats land on 15-frame multiples."),
        total_cost_usd=round(sum((c.get("usd") or 0) for c in calls), 4),
        paid_calls="beds/paid_calls.json",
        beds=out_meta), open(os.path.join(BEDS, "beds.json"), "w"), indent=2)


if __name__ == "__main__":
    main()
