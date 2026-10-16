"""Prepare pilot 3 images from lab/assets/perseverance (credits in its credits.txt).
Photos: resized/cropped WebP. Infographic: one crop per vehicle row (icon + its track only; the
distance labels, names and year ranges are left out), navy ground keyed to alpha so the rows sit on ink.
Run: python3 -I tools/prep_images.py"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
SRC = Path('/home/user/space_youtube/lab/assets/perseverance')
OUT = Path(__file__).resolve().parent.parent / 'img'
OUT.mkdir(exist_ok=True)
meta = {}

def save(im, name, q=86):
    im.save(OUT / f'{name}.webp', 'WEBP', quality=q, method=6)
    meta[name] = {'w': im.width, 'h': im.height}
    print(name, im.size, (OUT / f'{name}.webp').stat().st_size)

# Perseverance selfie, sol 1,500 (PIA26574): keep the right 62% (rover and the hill), 2400 px tall
im = Image.open(SRC / 'PIA26574.jpg').convert('RGB')
im = im.crop((int(im.width * 0.30), 0, im.width, im.height))
im = im.resize((round(im.width * 2400 / im.height), 2400), Image.LANCZOS)
save(im, 'persev')
# NAVCAM, record sol (PIA26812), upscaled 1.6x
im = Image.open(SRC / 'PIA26812_navcam_record.png').convert('RGB')
save(im.resize((round(im.width * 1.6), round(im.height * 1.6)), Image.LANCZOS), 'navcam')
# Opportunity self-portrait, Jan 2014 (PIA17759)
im = Image.open(SRC / 'PIA17759.jpg').convert('RGB')
save(im.resize((2400, round(im.height * 2400 / im.width)), Image.LANCZOS), 'oppy')
# Sojourner (PIA01122)
im = Image.open(SRC / 'PIA01122.jpg').convert('RGB')
save(im.resize((round(im.width * 1.4), round(im.height * 1.4)), Image.LANCZOS), 'sojourner')

# ---- infographic rows (graphic, not a photo)
ig = Image.open(SRC / 'infographic_driving_record.png').convert('RGB')
a = np.asarray(ig).astype(int)
bg = np.array([41, 40, 68])
dist = np.sqrt(((a - bg) ** 2).sum(-1))
blue = (a[..., 2] > 180) & (a[..., 0] < 120) & (a[..., 1] > 130)
ROWS = [('persev', 976, 1341), ('oppy', 1578, 1772), ('lunokhod2', 1858, 2233), ('curiosity', 2426, 2740),
        ('apollo17', 2981, 3244), ('apollo15', 3502, 3769), ('apollo16', 4054, 4317), ('lunokhod1', 4489, 4864),
        ('spirit', 5164, 5357), ('sojourner', 5598, 5692), ('yutu2', 5988, 6164), ('yutu', 6426, 6603)]
rows = []
for name, y0, y1 in ROWS:
    band = blue[y0:y1, :3720]
    xs = np.where(band.any(0))[0]
    ix0, ix1 = int(xs.min()), int(xs.max())
    # track: scan down from the icon bottom while anything but the ground (and the dashed line) is drawn
    yb = y1
    ink = dist[:, 60:ix1 + 1] > 40
    ink[:, max(0, 3290 - 60):3360 - 60] = False
    while yb < y1 + 120 and ink[yb].any(): yb += 1
    top = y0 - 24; bot = yb + 6
    x0, x1 = 60, min(3720, ix1 + 24)
    crop = a[top:bot, x0:x1]
    alpha = np.clip((dist[top:bot, x0:x1] - 8) / 40, 0, 1)
    # un-mix the navy from the anti-aliased edges so they do not halo on ink
    al = np.maximum(alpha, 1e-3)[..., None]
    col = np.clip((crop - bg * (1 - al)) / al, 0, 255)
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    save(im, 'row_' + name, q=90)
    rows.append({'name': name, 'x0': x0, 'y0': top, 'w': x1 - x0, 'h': bot - top, 'iconX0': ix0 - x0, 'iconX1': ix1 - x0, 'iconY0': y0 - top, 'trackY': yb - top})
meta['rows'] = rows
(OUT / 'meta.json').write_text(json.dumps(meta, indent=1))
print(json.dumps(rows))
