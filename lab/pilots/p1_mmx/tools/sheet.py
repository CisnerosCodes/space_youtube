"""sheet.py <stills_dir> <out_prefix> [per_sheet=12] [cols=6] [w=360]: tiles stills with frame labels."""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d, pre = sys.argv[1], sys.argv[2]
per = int(sys.argv[3]) if len(sys.argv) > 3 else 12
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 6
w = int(sys.argv[5]) if len(sys.argv) > 5 else 360
h = w * 16 // 9
files = sorted(glob.glob(os.path.join(d, '*.png')))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception: font = ImageFont.load_default()
for si in range(0, len(files), per):
    group = files[si:si + per]; rows = (len(group) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, rows * h), (60, 60, 60))
    for i, f in enumerate(group):
        im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
        dr = ImageDraw.Draw(im); lab = os.path.basename(f)[:-4]
        dr.rectangle([0, 0, 70, 28], fill=(255, 0, 255)); dr.text((4, 2), lab, fill=(255, 255, 255), font=font)
        sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    out = f'{pre}_{si // per + 1}.png'; sheet.save(out); print(out)
