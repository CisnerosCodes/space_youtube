#!/usr/bin/env python3
"""grid.py outdir cols out.png [scale]: tile the s_*.png stills (native 270x480 view) with frame labels."""
import sys, glob, os
from PIL import Image, ImageDraw
d, cols, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
fs = sorted(glob.glob(os.path.join(d, 's_*.png')))
w, h = int(270 * sc), int(480 * sc)
rows = (len(fs) + cols - 1) // cols
g = Image.new('RGB', (cols * w, rows * (h + 14)), (40, 40, 40))
dr = ImageDraw.Draw(g)
for k, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((w, h), Image.NEAREST if sc == 1 else Image.LANCZOS)
    x, y = (k % cols) * w, (k // cols) * (h + 14)
    g.paste(im, (x, y + 14))
    dr.text((x + 3, y + 1), os.path.basename(f)[2:6], fill=(255, 200, 80))
g.save(out)
print(out, g.size)
