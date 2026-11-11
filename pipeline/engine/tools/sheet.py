"""sheet.py: tiles PNG frames with frame labels.
usage: python3 -I sheet.py <frames_dir> <out.png> [cols=6] [width=360] [frames=a,b,c | every=N]
With every=N it takes every Nth frame plus the last (a contact sheet); otherwise every file in the folder."""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]
opts = dict(a.split('=', 1) for a in sys.argv[3:] if '=' in a)
pos = [a for a in sys.argv[3:] if '=' not in a]
cols = int(pos[0]) if len(pos) > 0 else 6
w = int(pos[1]) if len(pos) > 1 else 360
files = sorted(glob.glob(os.path.join(d, '*.png')))
if 'frames' in opts:
    want = set(int(x) for x in opts['frames'].split(','))
    files = [f for f in files if int(os.path.basename(f)[:-4]) in want]
if 'every' in opts:
    n = int(opts['every']); sel = files[::n]
    if files and sel[-1] != files[-1]: sel.append(files[-1])
    files = sel
h = w * 16 // 9
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', max(14, w // 14))
except Exception: font = ImageFont.load_default()
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (60, 60, 60))
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    dr = ImageDraw.Draw(im); lab = str(int(os.path.basename(f)[:-4]))
    dr.rectangle([0, 0, w // 5, w // 12], fill=(255, 0, 255)); dr.text((4, 1), lab, fill=(255, 255, 255), font=font)
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out); print(out, len(files), 'frames')
