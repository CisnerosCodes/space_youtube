# qa_sheet.py <dir> <out.png> [cols]: tile every f*.png in a folder into one labelled sheet
import sys, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
fs = sorted(glob.glob(d + '/f*.png'))
w, h = 300, 533
rows = (len(fs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 22)), (30, 30, 30))
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((w, h))
    x = (i % cols) * w; y = (i // cols) * (h + 22)
    sheet.paste(im, (x, y + 22)); dr.text((x + 4, y + 5), f.split('/')[-1], fill=(255, 200, 80))
sheet.save(out); print(out, len(fs))
