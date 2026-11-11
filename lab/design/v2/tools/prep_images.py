"""Prepare the v2 photo set: resize the NASA originals and turn the black sky into alpha,
so each body sits on the ink ground without a visible rectangle. Run: python3 -I prep_images.py"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops
SRC = Path('/home/user/space_youtube/lab/assets/nasa')
OUT = Path(__file__).resolve().parent.parent / 'img'
OUT.mkdir(exist_ok=True)

def cutout(name, out, width=None, crop=None, lo=10, hi=34, q=88):
    im = Image.open(SRC / f'{name}.jpg').convert('RGB')
    if crop: im = im.crop(crop)
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    lum = im.convert('L')
    # soft threshold: black sky -> 0, body -> 255
    a = lum.point(lambda v: 0 if v <= lo else 255 if v >= hi else int(255 * (v - lo) / (hi - lo)))
    # close small holes (dark crater floors inside the body) and feather the limb by 1-2 px
    a = a.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.copy(); rgba.putalpha(a)
    rgba.save(OUT / f'{out}.webp', 'WEBP', quality=q, method=6)
    print(out, rgba.size, (OUT / f'{out}.webp').stat().st_size)

cutout('PIA10368', 'phobosA', width=2400)
cutout('PIA10369', 'phobosB', width=2600)
cutout('PIA11826', 'deimos', crop=(60, 70, 720, 700))
cutout('PIA00407', 'mars', width=2200, lo=8, hi=26)
cutout('PIA10244', 'earth', lo=6, hi=24)
