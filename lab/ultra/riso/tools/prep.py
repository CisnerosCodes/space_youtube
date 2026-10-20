#!/usr/bin/env python3
"""Prepare the riso entry's embedded assets from the shared kit (read-only).

Writes into lab/ultra/riso/assets/:
  phobos_geo.bin   NASA Phobos model (phobos_nasa.glb) geometry, repacked: header + f32 pos/nrm/uv + u16 idx
  phobos_tex.jpg   its embedded texture atlas, grayscale, 1024 px
  mars_tex.jpg     USGS Viking colour mosaic, 2048 x 1024 (equirectangular)
  phobos_a.webp    HiRISE PIA10368 cut out of the black sky (alpha), 1400 px
  phobos_b.webp    HiRISE PIA10369 cut out (alpha), 1600 px (close-ups)
Nothing is painted into the images: only crop, scale, grayscale and an alpha mask from the black sky.
"""
import io, json, struct, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

KIT = os.path.join(os.path.dirname(__file__), '..', '..', 'kit', 'assets')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(OUT, exist_ok=True)


def glb():
    b = open(os.path.join(KIT, 'models', 'phobos_nasa.glb'), 'rb').read()
    l0 = struct.unpack('<I', b[12:16])[0]
    js = json.loads(b[20:20 + l0])
    off = 20 + l0
    l1 = struct.unpack('<I', b[off:off + 4])[0]
    bin_ = b[off + 8:off + 8 + l1]
    bv = js['bufferViews']
    acc = js['accessors']
    def view(i):
        v = bv[acc[i]['bufferView']]
        return bin_[v['byteOffset']:v['byteOffset'] + v['byteLength']]
    pos = np.frombuffer(view(0), dtype=np.float32).reshape(-1, 3)
    nrm = np.frombuffer(view(1), dtype=np.float32).reshape(-1, 3)
    uv = np.frombuffer(view(2), dtype=np.float32).reshape(-1, 2)
    idx = np.frombuffer(view(3), dtype=np.uint16)
    nv, ni = len(pos), len(idx)
    head = struct.pack('<II', nv, ni)
    data = head + pos.tobytes() + nrm.tobytes() + uv.tobytes() + idx.tobytes()
    if len(data) % 4:
        data += b'\0' * (4 - len(data) % 4)
    open(os.path.join(OUT, 'phobos_geo.bin'), 'wb').write(data)
    v = bv[js['images'][0]['bufferView']]
    im = Image.open(io.BytesIO(bin_[v['byteOffset']:v['byteOffset'] + v['byteLength']])).convert('L')
    im.resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, 'phobos_tex.jpg'), quality=90)
    print('geo', nv, ni, len(data), 'bbox', pos.min(0), pos.max(0))


def mars():
    im = Image.open(os.path.join(KIT, 'textures', 'mars_viking_color_mosaic_usgs_4096x2048.jpg')).convert('RGB')
    im.resize((2048, 1024), Image.LANCZOS).save(os.path.join(OUT, 'mars_tex.jpg'), quality=88)
    print('mars ok')


def cutout(src, dst, size, thr=10):
    im = Image.open(os.path.join(KIT, 'images', src)).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    lum = a.mean(2)
    m = lum > thr
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = 1 + int(np.argmax(sizes))
    m = lab == keep
    m = ndimage.binary_fill_holes(m)
    m = ndimage.binary_closing(m, iterations=6)
    m = ndimage.binary_fill_holes(m)
    ys, xs = np.where(m)
    pad = 20
    y0, y1 = max(0, ys.min() - pad), min(m.shape[0], ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(m.shape[1], xs.max() + pad)
    alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5))
    rgba = im.copy()
    rgba.putalpha(alpha)
    rgba = rgba.crop((x0, y0, x1, y1))
    s = size / max(rgba.size)
    rgba = rgba.resize((round(rgba.size[0] * s), round(rgba.size[1] * s)), Image.LANCZOS)
    rgba.save(os.path.join(OUT, dst), quality=90)
    print(dst, rgba.size, 'crop', (x0, y0, x1, y1))


if __name__ == '__main__':
    glb()
    mars()
    cutout('phobos_color_hirise_6800km_PIA10368.jpg', 'phobos_a.webp', 1400)
    cutout('phobos_color_hirise_5800km_PIA10369.jpg', 'phobos_b.webp', 1600)
