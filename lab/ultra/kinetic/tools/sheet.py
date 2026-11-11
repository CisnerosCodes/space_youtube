#!/usr/bin/env python3
"""sheet.py: grid of stills with time labels. usage: sheet.py <dir> <out.png> [cols] [width]"""
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont

d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
w = int(sys.argv[4]) if len(sys.argv) > 4 else 300
files = sorted(glob.glob(os.path.join(d, 't*.png')))
h = int(w * 1920 / 1080)
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 6) + 6, rows * (h + 34) + 6), (40, 40, 40))
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 20)
except Exception:
    font = ImageFont.load_default()
dr = ImageDraw.Draw(sheet)
for k, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = 6 + (k % cols) * (w + 6), 6 + (k // cols) * (h + 34)
    sheet.paste(im, (x, y + 28))
    t = os.path.basename(f)[1:-4]
    dr.text((x + 2, y + 2), f't={float(t):.2f}s  f60={round(float(t)*60)}', fill=(245, 184, 61), font=font)
sheet.save(out)
print(out, sheet.size)
