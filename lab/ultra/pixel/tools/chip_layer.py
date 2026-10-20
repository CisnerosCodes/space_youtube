#!/usr/bin/env python3
"""chip_layer.py: synthesize a few 16-bit style square-wave SFX and lay them over mix.py's mix.

mix.py only loads SFX from the shared lab/sound/sfx folder (with entries in its sfx.json), so the
synthesized game sounds are added here, after mix.py, and the sum is re-normalized with the same
targets (-14 LUFS integrated, true peak <= -1.5 dBTP, two-pass loudnorm, linear), then muxed.

usage: python3 tools/chip_layer.py out/mix.m4a out/video.mp4 out/final.mp4 [--report out/chip.report.json]
"""
import json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
SFX_DIR = os.path.join(HERE, "..", "assets", "sfx")


def sq(freq, dur, duty=0.25, vib=0.0, vib_hz=6.0):
    t = np.arange(int(dur * SR)) / SR
    f = freq * (1 + vib * np.sin(2 * np.pi * vib_hz * t))
    ph = np.cumsum(f) / SR
    return np.where((ph % 1.0) < duty, 1.0, -1.0)


def tri(freq, dur):
    t = np.arange(int(dur * SR)) / SR
    return 2 * np.abs(2 * ((t * freq) % 1.0) - 1) - 1


def env(n, a=0.004, d=None, sustain=1.0, rel=0.03):
    e = np.ones(n) * sustain
    na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    if d:
        nd = int(d * SR); e[na:na + nd] = np.linspace(1, sustain, min(nd, max(0, n - na)))[: max(0, min(nd, n - na))]
    nr = max(1, int(rel * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    return e


def expdecay(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def band(x):
    sos = signal.butter(4, [150, 7000], "bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def norm(x):
    x = band(x)
    return x / (np.abs(x).max() + 1e-9) * 0.89


def make():
    S = {}
    # WARNING alarm: two-tone square siren (shmup boss warning)
    parts = []
    for k in range(4):
        for fq in (880, 659):
            seg = sq(fq, 0.17, 0.5, vib=0.004) * env(int(0.17 * SR), 0.003, rel=0.02)
            parts.append(seg)
    x = np.concatenate(parts)
    x *= np.linspace(1, 0.35, len(x))
    S["chip_alarm"] = norm(x)
    # stage start: quick arpeggio C5 E5 G5 C6 + triangle bass
    notes = [523.25, 659.25, 783.99, 1046.5]
    parts = [sq(fq, 0.065, 0.25) * env(int(0.065 * SR), 0.002, rel=0.01) for fq in notes[:3]]
    last = sq(notes[3], 0.32, 0.25, vib=0.006) * expdecay(int(0.32 * SR), 0.12)
    x = np.concatenate(parts + [last])
    bass = tri(130.81, len(x) / SR) * expdecay(len(x), 0.18) * 0.6
    S["chip_stage"] = norm(x + bass)
    # jump / boing: square sweep up
    n = int(0.2 * SR); t = np.arange(n) / SR
    f = 220 * (4 ** (t / 0.2))
    ph = np.cumsum(f) / SR
    x = np.where((ph % 1) < 0.125, 1.0, -1.0) * expdecay(n, 0.09)
    S["chip_jump"] = norm(x)
    # coin: B5 then E6 (the classic two-note pickup)
    x = np.concatenate([sq(987.77, 0.06, 0.25) * env(int(0.06 * SR), 0.002, rel=0.005),
                        sq(1318.5, 0.42, 0.25) * expdecay(int(0.42 * SR), 0.13)])
    S["chip_coin"] = norm(x)
    # item get: rising arpeggio G5 B5 D6 then G6 held with vibrato
    notes = [783.99, 987.77, 1174.66]
    parts = [sq(fq, 0.075, 0.25) * env(int(0.075 * SR), 0.002, rel=0.01) for fq in notes]
    last = sq(1567.98, 0.55, 0.25, vib=0.008) * env(int(0.55 * SR), 0.003, rel=0.25)
    x = np.concatenate(parts + [last])
    bass = tri(196.0, len(x) / SR) * expdecay(len(x), 0.3) * 0.5
    S["chip_itemget"] = norm(x + bass)
    os.makedirs(SFX_DIR, exist_ok=True)
    for k, v in S.items():
        sf.write(os.path.join(SFX_DIR, k + ".wav"), v.astype(np.float32), SR, subtype="PCM_24")
    return S


# (frame, sfx, level dBFS of its loudest 100 ms)
EVENTS = [
    (2, "chip_alarm", -27.0),
    (220, "chip_stage", -27.0),
    (322, "chip_stage", -27.0),
    (436, "chip_jump", -28.0),
    (498, "chip_jump", -26.0),
    (570, "chip_stage", -27.0),
    (723, "chip_coin", -24.0),
    (768, "chip_stage", -27.0),
    (949, "chip_itemget", -25.0),
]


def rms_max_db(x):
    w = int(0.1 * SR)
    p = np.convolve(x ** 2, np.ones(w) / w, mode="same")
    return 10 * np.log10(p.max() + 1e-12)


def decode(path):
    with tempfile.TemporaryDirectory() as td:
        tmp = os.path.join(td, "d.wav")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le", tmp], check=True)
        x, _ = sf.read(tmp, dtype="float64", always_2d=True)
    return x


def ebur(path):
    err = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tail = err[err.rfind("Summary:"):]
    import re
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1))
    TP = float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", tail).group(1))
    return I, TP


def main():
    mix_in, video, out_mp4 = sys.argv[1:4]
    rep = sys.argv[sys.argv.index("--report") + 1] if "--report" in sys.argv else os.path.splitext(out_mp4)[0] + ".chip.json"
    S = make()
    mix = decode(mix_in)
    layer = np.zeros(len(mix))
    placed = []
    for fr, name, lvl in EVENTS:
        x = S[name]
        g = 10 ** ((lvl - rms_max_db(x)) / 20)
        s = int(round((fr + 1) / 30 * SR))
        e = min(len(layer), s + len(x))
        layer[s:e] += x[: e - s] * g
        placed.append({"frame": fr, "sfx": name, "level_dbfs_100ms": lvl})
    summed = mix + layer[:, None]
    with tempfile.TemporaryDirectory() as td:
        pre = os.path.join(td, "pre.wav")
        sf.write(pre, summed.astype(np.float32), SR, subtype="FLOAT")
        out_audio = os.path.splitext(out_mp4)[0] + ".m4a"
        tp = -2.1
        for attempt in range(4):
            flt = f"loudnorm=I=-14:TP={tp}:LRA=20"
            err = subprocess.run(["ffmpeg", "-nostats", "-i", pre, "-af", flt + ":print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
            m = json.loads(err[err.rfind("{"): err.rfind("}") + 1])
            flt2 = (flt + f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
                    f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", pre, "-af", flt2, "-ar", str(SR), "-c:a", "aac", "-b:a", "256k", out_audio], check=True)
            I, TP = ebur(out_audio)
            if TP <= -1.5 and abs(I + 14) <= 0.5:
                break
            tp -= 0.4
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", out_audio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                    "-c:a", "copy", "-movflags", "+faststart", "-shortest", out_mp4], check=True)
    I2, TP2 = ebur(out_mp4)
    json.dump({"events": placed, "sfx_dir": os.path.relpath(SFX_DIR, os.path.dirname(rep)), "final_I_lufs": I2, "final_TP_dbtp": TP2,
               "note": "synthesized square-wave SFX layered over mix.py's output, then two-pass loudnorm to -14 LUFS / <= -1.5 dBTP"},
              open(rep, "w"), indent=2)
    print(f"chip layer: {len(placed)} events, final I {I2} LUFS, TP {TP2} dBTP -> {out_mp4}")


if __name__ == "__main__":
    main()
