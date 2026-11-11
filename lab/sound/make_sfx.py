#!/usr/bin/env python3
"""Synthesize the Signal Delay sound effects kit and sonic logo (numpy + scipy only).

Every sound: 48 kHz mono float WAV (24-bit), deterministic (seeded), band-limited so the
energy sits mostly in 150 Hz to 6 kHz (phone speakers), DC-free, raised-cosine edges so it
never clicks at start or end, peak-normalized to -1 dBFS. Writes sfx/*.wav, sfx/logo.wav
and sfx/sfx.json (name, duration, peak position in ms, use, band share, loudness).

Usage: python3 make_sfx.py
"""
import json, os
import numpy as np, soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sfx")
SR = 48000
TAU = 2 * np.pi


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def rng(seed):
    return np.random.default_rng(seed)


def sos_hp(f, order=4):
    return signal.butter(order, f, "highpass", fs=SR, output="sos")


def sos_lp(f, order=2):
    return signal.butter(order, f, "lowpass", fs=SR, output="sos")


def sos_bp(lo, hi, order=2):
    return signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos")


def filt(sos, x):
    return signal.sosfiltfilt(sos, x)


def phase_of(freq):
    """Instantaneous-frequency array (Hz) -> phase (rad)."""
    return TAU * np.cumsum(freq) / SR


def sweep_noise(dur, f_start, f_end, width_oct=0.8, seed=1, curve=1.0):
    """White noise through a band-pass whose centre glides f_start -> f_end (log), via STFT mask."""
    n = int(dur * SR)
    x = rng(seed).standard_normal(n + 4096)
    f, tt, Z = signal.stft(x, fs=SR, nperseg=1024, noverlap=768)
    pos = np.clip(tt / dur, 0, 1) ** curve
    fc = np.exp(np.log(f_start) + (np.log(f_end) - np.log(f_start)) * pos)
    lf = np.log2(np.maximum(f, 1.0))[:, None]
    mask = np.exp(-0.5 * ((lf - np.log2(fc)[None, :]) / (width_oct / 2)) ** 2)
    _, y = signal.istft(Z * mask, fs=SR, nperseg=1024, noverlap=768)
    return y[:n]


def env_ar(n, attack, release, peak_at=None, shape=2.0):
    """Smooth attack-release envelope with its maximum at peak_at (seconds)."""
    t = np.arange(n) / SR
    peak_at = attack if peak_at is None else peak_at
    e = np.where(t < peak_at,
                 (np.clip(t / max(peak_at, 1e-4), 0, 1)) ** shape,
                 np.exp(-(t - peak_at) / max(release, 1e-4)))
    return e


def small_room(x, rt=0.35, mix=0.18, seed=7, lp=5000):
    """Very small synthetic reverb: convolve with exponentially decaying filtered noise."""
    n = int(rt * SR * 1.2)
    ir = rng(seed).standard_normal(n) * np.exp(-6.9 * np.arange(n) / (rt * SR))
    ir = filt(sos_lp(lp), ir)
    ir[: int(0.006 * SR)] = 0  # tiny pre-delay
    ir /= np.sqrt((ir ** 2).sum())
    wet = signal.fftconvolve(x, ir)
    dry = np.concatenate([x, np.zeros(len(wet) - len(x))])
    return dry + mix * wet


def taper(x, sec):
    """Raised-cosine fade over the last `sec` seconds, so no layer ever ends abruptly."""
    k = int(sec * SR); x = x.copy()
    x[-k:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k))
    return x


def tail_pad(x, sec):
    return np.concatenate([x, np.zeros(int(sec * SR))])


def finish(x, fade_in_ms=2.0, fade_out_ms=12.0, hp=150, lp=7000, trim_db=-60, max_ms=None):
    """Band-limit, trim silence, raised-cosine edges, peak-normalize to -1 dBFS."""
    x = filt(sos_hp(hp, 4), x)
    if lp:
        x = filt(sos_lp(lp, 4), x)
    # trim trailing near-silence (keep 20 ms)
    a = np.abs(x); thr = a.max() * 10 ** (trim_db / 20)
    idx = np.where(a > thr)[0]
    start, end = (idx[0], idx[-1]) if len(idx) else (0, len(x) - 1)
    x = x[max(0, start - int(0.001 * SR)): min(len(x), end + int(0.02 * SR))]
    if max_ms and len(x) > max_ms * SR / 1000:
        x = x[: int(max_ms * SR / 1000)]
    fi, fo = max(2, int(fade_in_ms * SR / 1000)), max(2, int(fade_out_ms * SR / 1000))
    x[:fi] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi))
    x[-fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))
    x[0] = 0.0; x[-1] = 0.0
    return (x / np.abs(x).max() * 10 ** (-1 / 20)).astype(np.float32)


# ----------------------------------------------------------------------------- sounds

def whoosh(dur, seed, f0=350, f1=3200, peak_frac=0.7):
    n = int(dur * SR)
    a = sweep_noise(dur, f0, f1, width_oct=1.1, seed=seed, curve=1.3)
    b = sweep_noise(dur, f0 * 1.5, f1 * 1.3, width_oct=0.6, seed=seed + 1, curve=1.3)
    e = env_ar(n, 0, dur * (1 - peak_frac) / 3.0, peak_at=dur * peak_frac, shape=2.2)
    # gentle doppler-ish flutter
    fl = 1 + 0.12 * np.sin(TAU * 9 * np.arange(n) / SR) * (np.arange(n) / n)
    return (a + 0.6 * b) * e * fl


def impact(size, seed):
    big = size == "big"
    dur = 1.1 if big else 0.6
    t = t_axis(dur); n = len(t)
    # body: pitch-dropping sine, driven so its harmonics carry the weight on small speakers
    f = (210 if big else 240) * np.exp(-t / (0.09 if big else 0.06)) + (95 if big else 120)
    body = np.tanh((3.5 if big else 2.0) * np.sin(phase_of(f))) * np.exp(-t / (0.22 if big else 0.12))
    # transient: short noise burst 1.5-5 kHz
    nz = filt(sos_bp(1500, 5000), rng(seed).standard_normal(n)) * np.exp(-t / 0.006)
    out = body + (1.6 if big else 1.0) * nz / np.abs(nz).max()
    if big:
        # metallic mid "slam" partials and a short noise tail
        for fr, amp, dec in ((523, 0.35, 0.09), (871, 0.25, 0.07), (1337, 0.18, 0.05), (1910, 0.1, 0.04)):
            out += amp * np.sin(TAU * fr * t) * np.exp(-t / dec)
        tail = filt(sos_bp(300, 2500), rng(seed + 1).standard_normal(n)) * np.exp(-t / 0.16)
        out += 0.25 * tail / np.abs(tail).max()
        out = small_room(out, rt=0.5, mix=0.22, seed=seed)
    else:
        out = small_room(out, rt=0.25, mix=0.12, seed=seed)
    return out


def riser(dur, seed):
    t = t_axis(dur); n = len(t)
    nz = sweep_noise(dur, 400, 6000, width_oct=1.2, seed=seed, curve=1.6)
    nz /= np.abs(nz).max()
    # two rising sines a fifth apart, slightly detuned: tension without a key
    f = 220 * 2 ** (2.2 * (t / dur) ** 1.4)
    tone = 0.5 * np.sin(phase_of(f)) + 0.35 * np.sin(phase_of(f * 1.5 * 1.004)) + 0.2 * np.sin(phase_of(f * 2.01))
    tone *= 1 + 0.5 * np.sin(TAU * (4 + 14 * t / dur) * t)  # accelerating tremolo
    e = (t / dur) ** 2.4
    return (0.8 * nz + 0.45 * tone) * e


def pop(seed, reverse=False):
    dur = 0.16
    t = t_axis(dur)
    f = 280 + 900 * (1 - np.exp(-t / 0.018))           # fast upward "bloop"
    x = np.sin(phase_of(f)) * np.exp(-t / 0.035)
    x += 0.25 * np.sin(phase_of(2 * f)) * np.exp(-t / 0.02)
    click = filt(sos_bp(2000, 6000), rng(seed).standard_normal(len(t))) * np.exp(-t / 0.0015)
    x = x + 0.15 * click / np.abs(click).max()
    x = tail_pad(taper(x, 0.04), 0.03)
    if reverse:
        # cat leaves: the same bloop played backwards (swells in, pitch falls, ends on the hit)
        x = x[::-1].copy()
    return x


def tick(seed):
    dur = 0.07
    t = t_axis(dur)
    x = 0.8 * np.sin(TAU * 2350 * t) * np.exp(-t / 0.009) + 0.4 * np.sin(TAU * 3700 * t) * np.exp(-t / 0.005)
    nz = filt(sos_bp(3000, 6500), rng(seed).standard_normal(len(t))) * np.exp(-t / 0.002)
    return x + 0.5 * nz / np.abs(nz).max()


def bell(f, dur, index=2.5, dec=0.35, ratio=2.0, bright_dec=0.08):
    """Glassy FM 'signal' tone: carrier f, modulator ratio*f, modulation index decays fast."""
    t = t_axis(dur)
    I = index * np.exp(-t / bright_dec)
    x = np.sin(TAU * f * t + I * np.sin(TAU * ratio * f * t))
    x += 0.18 * np.sin(TAU * 2 * f * t) * np.exp(-t / (dec * 0.4))
    att = np.clip(t / 0.002, 0, 1)
    return taper(x * att * np.exp(-t / dec), 0.08)


def ping_echo():
    f = 1567.98  # G6
    hit = bell(f, 0.9, index=1.8, dec=0.18)
    echo = filt(sos_lp(3500), bell(f, 0.9, index=0.6, dec=0.22)) * 10 ** (-9 / 20)
    d = int(0.30 * SR)
    out = np.zeros(d + len(echo))
    out[: len(hit)] += hit
    out[d: d + len(echo)] += echo
    return out


def glitch(seed):
    r = rng(seed)
    dur = 0.24
    n = int(dur * SR)
    out = np.zeros(n)
    pos = 0
    while pos < n - 600:
        seg = min(int(r.integers(500, 2600)), n - pos)
        kind = r.integers(0, 3)
        tt = np.arange(seg) / SR
        if kind == 0:   # bit-crushed square blip
            fr = r.choice([660, 990, 1320, 1760])
            s = np.sign(np.sin(TAU * fr * tt)) * 0.6
        elif kind == 1:  # band noise
            s = filt(sos_bp(1200, 5000), r.standard_normal(seg))
            s /= np.abs(s).max()
        else:            # sample-and-hold (rate reduction) of a sine
            fr = r.choice([440, 880, 1250])
            s = np.sin(TAU * fr * tt)
            hold = int(r.integers(6, 16))
            s = np.repeat(s[::hold], hold)[:seg]
        g = r.uniform(0.3, 1.0) if r.random() > 0.25 else 0.0  # some gaps
        w = np.ones(seg); k = min(48, seg // 4)
        w[:k] = np.linspace(0, 1, k); w[-k:] = np.linspace(1, 0, k)
        out[pos: pos + seg] += g * s * w
        pos += seg + int(r.integers(0, 900))
    return out


def swell(seed):
    dur = 1.5
    t = t_axis(dur); n = len(t)
    nz = sweep_noise(dur, 900, 5500, width_oct=2.0, seed=seed, curve=1.2)
    nz /= np.abs(nz).max()
    peak = 1.25
    e = np.where(t < peak, (t / peak) ** 3, np.exp(-(t - peak) / 0.05))
    # soft airy partials, octave-stacked so they sit on any key's tonic-neutral shimmer
    shimmer = sum(a * np.sin(TAU * fr * t + 3 * np.sin(TAU * 0.7 * t)) for fr, a in ((1760, 0.12), (2640, 0.08), (3520, 0.05)))
    return (nz + shimmer) * e


def page_turn(seed):
    dur = 0.38
    t = t_axis(dur); n = len(t)
    nz = sweep_noise(dur, 1800, 900, width_oct=1.6, seed=seed, curve=1.0)
    e = np.sin(np.pi * np.clip(t / 0.30, 0, 1)) ** 2
    fl = 1 + 0.35 * np.sin(TAU * 31 * t)  # paper flutter
    return nz * e * fl


def mrrp():
    """Tiny synthetic chirp: trilled 'rr' rising into a bright 'p' blip. Clearly a synth."""
    dur = 0.34
    t = t_axis(dur); n = len(t)
    # pitch contour: 520 Hz -> 900 Hz rise, little upward flick at the end
    f = 520 + 330 * (1 / (1 + np.exp(-(t - 0.16) / 0.03))) + 160 * np.clip((t - 0.26) / 0.05, 0, 1)
    ph = phase_of(f)
    src = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)   # soft, few harmonics
    trill = 0.55 + 0.45 * np.sin(TAU * 26 * t)                          # the "rr"
    trill = np.where(t < 0.2, trill, 1.0)
    # two fixed "formant" bands give it a voice-like but toy tone
    v = filt(sos_bp(600, 1300), src) + 0.6 * filt(sos_bp(1900, 3000), src)
    e = np.clip(t / 0.03, 0, 1) * np.where(t < 0.27, 1, np.exp(-(t - 0.27) / 0.025))
    return v * trill * e


def logo():
    """Sonic logo: the signal (bright FM ping, A5) and its delayed echo (softer, hollow, E6),
    0.40 s apart (12 frames at 30 fps), rising a fifth: a question that is answered."""
    sig = bell(880.0, 1.2, index=2.2, dec=0.32, bright_dec=0.06)
    sig += 0.4 * bell(1760.0, 1.2, index=0.8, dec=0.12, bright_dec=0.03)
    # echo: same family, rounder (less FM, low-passed), quieter, with a tiny chorus = "hollow ring"
    e1 = bell(1318.51, 1.1, index=0.7, dec=0.42, bright_dec=0.05)
    e2 = bell(1318.51 * 1.003, 1.1, index=0.7, dec=0.42, bright_dec=0.05)
    echo = filt(sos_lp(3200), 0.5 * (e1 + e2)) * 10 ** (-6 / 20)
    d = int(0.40 * SR)
    out = np.zeros(d + len(echo))
    out[: len(sig)] += sig
    out[d: d + len(echo)] += echo
    out = small_room(out, rt=0.6, mix=0.16, seed=11, lp=4500)
    return out


KIT = [
    # name, builder, use, finish kwargs
    ("whoosh_short", lambda: whoosh(0.42, 101), "hard cut into a new photo or diagram; fast element moving across", {}),
    ("whoosh_long", lambda: whoosh(1.15, 103, f0=250, f1=2800, peak_frac=0.75), "bigger scene change, camera move across a diagram", {}),
    ("impact_soft", lambda: impact("soft", 201), "a word or mark landing; small emphasis", dict(fade_in_ms=0.7)),
    ("impact_big", lambda: impact("big", 203), "number slam (giant type at 1.12 scale settling)", dict(fade_in_ms=0.7)),
    ("riser_1s", lambda: riser(1.0, 301), "lead into a reveal one beat ahead; ends on the cut", dict(fade_out_ms=6)),
    ("riser_2s", lambda: riser(2.0, 303), "lead into the biggest reveal of the video; ends on the cut", dict(fade_out_ms=6)),
    ("pop", lambda: pop(401), "cat appears", dict(fade_in_ms=0.7)),
    ("pop_reverse", lambda: pop(401, reverse=True), "cat leaves", dict(fade_out_ms=3)),
    ("tick", lambda: tick(501), "a chip, tick mark or label appears", dict(fade_in_ms=0.5, lp=7500)),
    ("ping_echo", ping_echo, "the echo mark: dot then ring (a signal and its delayed echo)", dict(fade_in_ms=0.7)),
    ("glitch_short", lambda: glitch(601), "subtle data glitch, a value updating; use sparingly", dict(fade_in_ms=1.5, fade_out_ms=6)),
    ("swell_reveal", lambda: swell(701), "swell into a reveal or the outcome beat; peaks on the cut", dict(fade_out_ms=8)),
    ("page_turn_air", lambda: page_turn(801), "soft transition, NEXT card sliding in", {}),
    ("cat_mrrp", mrrp, "the cat's tiny chirp; rare, at most once per video", dict(lp=6500)),
]


def describe(x):
    env = np.abs(signal.hilbert(x))
    k = int(0.005 * SR)
    env_s = np.convolve(env, np.ones(k) / k, mode="same")
    peak_ms = 1000 * int(np.argmax(env_s)) / SR
    S = np.abs(np.fft.rfft(x)) ** 2; fr = np.fft.rfftfreq(len(x), 1 / SR)
    share = 100 * S[(fr >= 150) & (fr <= 6000)].sum() / S.sum()
    # max momentary-ish loudness: 100 ms RMS, dBFS
    w = int(0.1 * SR)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(w) / w, mode="same").max())
    cent = float((fr * S).sum() / S.sum())
    return dict(duration_ms=round(1000 * len(x) / SR, 1), peak_ms=round(peak_ms, 1),
                band_150_6k_pct=round(float(share), 1), spectral_centroid_hz=round(cent),
                max_rms_100ms_dbfs=round(float(20 * np.log10(rms)), 1),
                first_sample=float(x[0]), last_sample=float(x[-1]))


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = []
    for name, build, use, kw in KIT + [("logo", logo, "sonic logo under the end wordmark: signal (A5) then its echo (E6, -6 dB) 0.40 s later", dict(fade_in_ms=0.7, fade_out_ms=260, max_ms=1450))]:
        x = finish(build(), **kw)
        sf.write(os.path.join(OUT, f"{name}.wav"), x, SR, subtype="PCM_24")
        d = describe(x)
        d.update(name=name, file=f"sfx/{name}.wav", use=use)
        meta.append(d)
        print(f"{name:14s} {d['duration_ms']:7.1f} ms  peak {d['peak_ms']:7.1f} ms  150-6k {d['band_150_6k_pct']:5.1f}%  "
              f"centroid {d['spectral_centroid_hz']:5d} Hz  rms100 {d['max_rms_100ms_dbfs']:5.1f}")
    json.dump(dict(sample_rate=SR, channels=1, bit_depth=24, normalization="peak -1 dBFS",
                   note=("peak_ms is the maximum of the 5 ms smoothed amplitude envelope; mix.py aligns it "
                         "to one frame after the cue frame. Band filter: 150 Hz high-pass (4th order) and "
                         "about 7 kHz low-pass on every sound."),
                   logo_echo_delay_ms=400, sounds=meta),
              open(os.path.join(OUT, "sfx.json"), "w"), indent=2)


if __name__ == "__main__":
    main()
