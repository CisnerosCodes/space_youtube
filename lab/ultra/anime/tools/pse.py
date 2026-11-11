# pse.py: photosensitivity (PSE) and motion check of a rendered video, Harding-style approximation.
# usage: python3 pse.py video.mp4 [--json out.json]
# * Frames are decoded at 108 x 192, linearized (sRGB), relative luminance Y; display assumed 200 cd/m2.
# * A "transition" between two frames: at least 25% of the frame changes luminance by 20 cd/m2 or more
#   in the same direction, with the darker state under 160 cd/m2. A flash is a pair of opposite transitions.
# * Red transitions: 25% of the frame enters or leaves saturated red (R / (R+G+B) >= 0.8).
# * Limit (Ofcom / ITU-R BT.1702): no more than 3 flashes in any one second, so at most 6 transitions
#   in any 30-frame window. Also prints the per-second mean frame difference (216 x 384 gray, 0..255).
import sys, json, subprocess
import numpy as np

vid = sys.argv[1]
W, H = 108, 192
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', vid, '-vf', f'scale={W}:{H}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255.0
lin = np.where(fr <= 0.04045, fr / 12.92, ((fr + 0.055) / 1.055) ** 2.4)
Y = (0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]) * 200.0
s = fr.sum(-1) + 1e-6
red = (fr[..., 0] / s >= 0.8) & (fr[..., 0] > 0.2)
n = len(Y)
trans = []  # (frame, sign, area, kind)
for i in range(1, n):
    d = Y[i] - Y[i - 1]
    darker = np.minimum(Y[i], Y[i - 1])
    up = ((d >= 20) & (darker < 160)).mean()
    dn = ((d <= -20) & (darker < 160)).mean()
    if up >= 0.25: trans.append((i, 1, float(up), 'lum'))
    elif dn >= 0.25: trans.append((i, -1, float(dn), 'lum'))
    rin = (red[i] & ~red[i - 1]).mean(); rout = (~red[i] & red[i - 1]).mean()
    if rin >= 0.25: trans.append((i, 1, float(rin), 'red'))
    elif rout >= 0.25: trans.append((i, -1, float(rout), 'red'))
# flashes per 1-s window: count opposing pairs
worst = (0, 0)
for f0 in range(0, n):
    w = [t for t in trans if f0 <= t[0] < f0 + 30]
    for kind in ('lum', 'red'):
        ww = [t for t in w if t[3] == kind]
        # count sign alternations (a flash = an opposing pair)
        flashes, last = 0, None
        for t in ww:
            if last is not None and t[1] != last: flashes += 0.5
            last = t[1]
        flashes = int(np.ceil(flashes)) if ww else 0
        if flashes > worst[0]: worst = (flashes, f0)
# per-second motion
g = (0.299 * fr[..., 0] + 0.587 * fr[..., 1] + 0.114 * fr[..., 2]) * 255
d = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))
persec = [float(d[k * 30:(k + 1) * 30].mean()) for k in range(int(np.ceil(len(d) / 30)))]
low = float((d < 1.0).mean())
print(f'frames {n} | large-area transitions {len(trans)} (lum {sum(t[3]=="lum" for t in trans)}, red {sum(t[3]=="red" for t in trans)}) | worst flashes in any 1 s: {worst[0]} at frame {worst[1]}')
print('transitions at frames:', ' '.join(f'{t[0]}{"+" if t[1] > 0 else "-"}{t[3][0]}' for t in trans))
print(f'mean frame diff {d.mean():.2f} | frames below 1.0: {low*100:.1f}%')
print('per-second diff:', ' '.join(f'{i}:{v:.1f}' for i, v in enumerate(persec)))
if '--json' in sys.argv:
    out = sys.argv[sys.argv.index('--json') + 1]
    json.dump({'frames': n, 'transitions': trans, 'worst_flashes_per_second': worst[0], 'worst_at_frame': worst[1], 'mean_diff': float(d.mean()), 'per_second_diff': persec, 'low_motion_frac': low}, open(out, 'w'), indent=1)
