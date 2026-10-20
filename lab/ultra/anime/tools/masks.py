# Make alpha-masked cutouts of the real photos (mask = crop/mask only, no painted detail).
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
import sys
src = '/home/user/space_youtube/lab/ultra/kit/assets/images/'
jobs = [
    ('phobos_color_hirise_6800km_PIA10368.jpg', 'assets/phobos_a.png', 1600, 14),
    ('phobos_color_hirise_5800km_PIA10369.jpg', 'assets/phobos_b.png', 1600, 14),
    ('mars_global_color_viking_PIA00407.jpg', 'assets/mars.png', 1800, 10),
]
for f, out, W, thr in jobs:
    im = Image.open(src + f).convert('RGB')
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    lum = a.max(axis=2)
    m = lum > thr
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = 1 + int(np.argmax(sizes))
    m = lab == keep
    m = ndimage.binary_fill_holes(m)
    m = ndimage.binary_erosion(m, iterations=2)
    alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))
    rgba = im.copy(); rgba.putalpha(alpha)
    bb = alpha.getbbox()
    rgba = rgba.crop(bb)
    rgba.save(out, optimize=True)
    print(out, rgba.size, bb)
