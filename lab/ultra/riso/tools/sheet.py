#!/usr/bin/env python3
# sheet.py <dir> <out.jpg> [cols] [width]: tile the stills in a folder with frame labels
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 360
files = sorted(glob.glob(os.path.join(d, 'f*.jpg')) + glob.glob(os.path.join(d, 'f*.png')))
ims = [Image.open(f).convert('RGB') for f in files]
th = round(tw * 1920 / 1080)
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * tw, rows * (th + 26)), (30, 30, 30))
dr = ImageDraw.Draw(S)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 18)
except Exception: font = None
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * tw, (i // cols) * (th + 26)
    S.paste(im.resize((tw, th)), (x, y + 26))
    n = int(os.path.basename(f)[1:5])
    dr.text((x + 6, y + 3), f'f{n}  {n/30:.2f}s', fill=(255, 220, 120), font=font)
S.save(out, quality=88)
print(out, S.size)
