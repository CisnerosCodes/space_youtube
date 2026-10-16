# For every pixel that the text layer changes and whose colour is close to one of the three text colours,
# compute WCAG contrast of that text colour against the same pixel with text hidden. Reports the minimum.
import sys, glob, os
import numpy as np
from PIL import Image
COLS = {'paper': (0xF2, 0xEF, 0xE8), 'gold': (0xE8, 0xB8, 0x4A), 'gray': (0x8C, 0x8A, 0x85)}
def lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lum(rgb):
    l = lin(np.asarray(rgb, dtype=np.float64))
    return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]
d = sys.argv[1]
worst_all = 99
for fg in sorted(glob.glob(os.path.join(d, '*_fg.png'))):
    bg = fg.replace('_fg', '_bg')
    A = np.asarray(Image.open(fg).convert('RGB')).astype(np.int32)
    B = np.asarray(Image.open(bg).convert('RGB')).astype(np.int32)
    changed = np.abs(A - B).sum(-1) > 30
    out = []
    for name, c in COLS.items():
        core = changed & (np.abs(A - np.array(c)).sum(-1) < 24)
        # the credit (x 80-560, y 1462-1500) is the only gray text; anti-aliased paper edges elsewhere can look gray
        credit = np.zeros(core.shape, bool); credit[1462:1500, 80:560] = True
        core &= credit if name == 'gray' else ~credit
        n = int(core.sum())
        if n == 0: continue
        Lt = lum(c); Lb = lum(B[core])
        ratio = (np.maximum(Lt, Lb) + 0.05) / (np.minimum(Lt, Lb) + 0.05)
        worst = float(ratio.min()); p1 = float(np.percentile(ratio, 0.5))
        worst_all = min(worst_all, worst)
        out.append(f'{name}: n={n} min={worst:.2f} p0.5={p1:.2f} {"FAIL" if worst < 4.5 else "ok"}')
    print(os.path.basename(fg)[:4], ' | '.join(out))
print('worst overall', round(worst_all, 2))
