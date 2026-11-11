"""proof.py: out/contact_full.png (every 30th frame plus the last, labelled) and out/motion_proof.png
(four mid-motion frames) from out/frames. Run: python3 -I tools/proof.py"""
import glob, os
from PIL import Image, ImageDraw, ImageFont
D = 'out/frames'
files = sorted(glob.glob(os.path.join(D, '*.png')))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception: font = ImageFont.load_default()
def tile(i, w):
    im = Image.open(files[i]).convert('RGB').resize((w, w * 16 // 9), Image.LANCZOS)
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 78, 28], fill=(0, 0, 0)); d.text((4, 2), str(i), fill=(245, 184, 61), font=font)
    return im
sel = list(range(0, len(files), 30)); sel += [len(files) - 1] if sel[-1] != len(files) - 1 else []
cols, w = 8, 216; h = w * 16 // 9; rows = (len(sel) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (40, 40, 40))
for n, i in enumerate(sel): sheet.paste(tile(i, w), ((n % cols) * w, (n // cols) * h))
sheet.save('out/contact_full.png'); print('contact_full', len(sel), 'frames')
import sys
picks = [int(x) for x in (sys.argv[1].split(',') if len(sys.argv) > 1 else ['60', '222', '538', '830'])]
w = 540; h = 960
mp = Image.new('RGB', (4 * w, h), (40, 40, 40))
for n, i in enumerate(picks): mp.paste(tile(i, w), (n * w, 0))
mp.save('out/motion_proof.png'); print('motion_proof', picks)
