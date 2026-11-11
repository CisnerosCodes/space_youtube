import sys, glob
from PIL import Image, ImageDraw
out = sys.argv[1]; files = sys.argv[2:]
w, h = 432, 768
S = Image.new('RGB', (w * len(files), h + 24), (10, 10, 12))
d = ImageDraw.Draw(S)
for i, f in enumerate(files):
    S.paste(Image.open(f).convert('RGB').resize((w, h)), (i * w, 24))
    d.text((i * w + 6, 4), f.split('/')[-1], fill=(245, 184, 61))
S.save(out)
