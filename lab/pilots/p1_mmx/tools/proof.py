"""proof.py: out/contact_full.png (every 30th frame plus the last, labelled) and out/motion_proof.png
(four mid-motion frames, full size halves). usage: python3 -I tools/proof.py <frames_dir> <f1,f2,f3,f4>"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; proof = [int(x) for x in sys.argv[2].split(',')]
files = sorted(glob.glob(os.path.join(d, '*.png')))
n = len(files)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception: font = ImageFont.load_default()
pick = list(range(0, n, 30)) + ([n - 1] if (n - 1) % 30 else [])
w, h, cols = 216, 384, 8
rows = (len(pick) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (60, 60, 60))
for i, f in enumerate(pick):
    im = Image.open(files[f]).convert('RGB').resize((w, h), Image.LANCZOS)
    dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 64, 26], fill=(11, 11, 12)); dr.text((4, 2), str(f), fill=(245, 184, 61), font=font)
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save('out/contact_full.png'); print('out/contact_full.png', len(pick), 'frames')
pw, ph = 540, 960
P = Image.new('RGB', (pw * 4, ph + 40), (11, 11, 12)); dr = ImageDraw.Draw(P)
for i, f in enumerate(proof):
    P.paste(Image.open(files[f]).convert('RGB').resize((pw, ph), Image.LANCZOS), (i * pw, 40))
    dr.text((i * pw + 10, 8), f'frame {f}', fill=(245, 184, 61), font=font)
P.save('out/motion_proof.png'); print('out/motion_proof.png', proof)
