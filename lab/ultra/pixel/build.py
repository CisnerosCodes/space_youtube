#!/usr/bin/env python3
"""Build page.html for the "pixel" entry: a 16-bit pixel-game Short.

Preprocesses the real NASA images into small RGBA arrays (the page re-pixelates them per frame
at 270 x 480 with a fixed palette), measures the voice envelope per frame (for the portrait's
lip flaps), reads the caption schedule, and inlines everything plus src/*.js into page.html.
The page then needs no network and no file:// image reads (which would taint the canvas).
"""
import base64, glob, json, os, subprocess, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(HERE, "..", "kit")
A = os.path.join(KIT, "assets")
CACHE = os.path.join(HERE, "assets")
os.makedirs(CACHE, exist_ok=True)


def b64(arr):
    return base64.b64encode(np.ascontiguousarray(arr).astype(np.uint8).tobytes()).decode()


def moon_rgba(path, size, thr, cache):
    """Crop to the body, mask the black sky (binary alpha), resize so the longer side is `size`."""
    cp = os.path.join(CACHE, cache)
    if os.path.exists(cp):
        im = Image.open(cp)
    else:
        src = Image.open(path).convert("RGB")
        lum = np.asarray(src.convert("L")).astype(np.float32)
        small = ndimage.zoom(lum, 0.25, order=1)
        m = ndimage.binary_fill_holes(ndimage.binary_opening(small > thr, iterations=2))
        lab, n = ndimage.label(m)
        if n > 1:
            sizes = ndimage.sum(m, lab, range(1, n + 1))
            m = lab == (1 + int(np.argmax(sizes)))
        ys, xs = np.where(m)
        x0, x1, y0, y1 = xs.min() * 4, (xs.max() + 1) * 4, ys.min() * 4, (ys.max() + 1) * 4
        pad = 8
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
        x1, y1 = min(src.width, x1 + pad), min(src.height, y1 + pad)
        mask = Image.fromarray((m * 255).astype(np.uint8)).resize(src.size, Image.BILINEAR)
        rgba = src.copy()
        rgba.putalpha(mask)
        rgba = rgba.crop((x0, y0, x1, y1))
        s = size / max(rgba.size)
        rgba = rgba.resize((max(1, round(rgba.width * s)), max(1, round(rgba.height * s))), Image.LANCZOS)
        rgba.save(cp)
        im = rgba
    a = np.asarray(im.convert("RGBA")).copy()
    a[..., 3] = np.where(a[..., 3] > 127, 255, 0)
    return {"w": im.width, "h": im.height, "data": b64(a)}


def gray_tex(path, w, h, cache):
    cp = os.path.join(CACHE, cache)
    if not os.path.exists(cp):
        Image.open(path).convert("L").resize((w, h), Image.LANCZOS).save(cp)
    im = Image.open(cp)
    return {"w": im.width, "h": im.height, "data": b64(np.asarray(im))}


def voice_env(fps=30, n_frames=1300):
    cp = os.path.join(CACHE, "voice_env.json")
    if os.path.exists(cp):
        return json.load(open(cp))
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(KIT, "voice.mp3"), "-ac", "1", "-ar", "24000",
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    hop = 24000 // fps
    env = []
    for i in range(n_frames):
        seg = x[i * hop:(i + 1) * hop]
        env.append(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0)
    env = np.array(env)
    ref = np.percentile(env[env > 0.002], 90)
    env = np.clip(env / ref, 0, 1.5)
    out = [round(float(v), 3) for v in env]
    json.dump(out, open(cp, "w"))
    return out


def main():
    data = {
        "phobos": moon_rgba(os.path.join(A, "images/phobos_color_hirise_6800km_PIA10368.jpg"), 360, 14, "phobos_360.png"),
        "phobos2": moon_rgba(os.path.join(A, "images/phobos_color_hirise_5800km_PIA10369.jpg"), 360, 14, "phobos2_360.png"),
        "mars": moon_rgba(os.path.join(A, "images/mars_global_color_viking_PIA00407.jpg"), 440, 10, "mars_440.png"),
        "phobosTex": gray_tex(os.path.join(A, "textures/phobos_texture_nasa3d_1440x720.png"), 720, 360, "phobos_tex_720.png"),
    }
    caps = json.load(open(os.path.join(KIT, "captions.json")))
    words = [{"text": w["text"], "start": w["start"], "end": w["end"]} for w in caps["words"]]
    env = voice_env()
    files = sorted(glob.glob(os.path.join(HERE, "src", "*.js")))
    if "--main" in sys.argv:  # test pages: engine files (00..03) plus a test main
        files = [f for f in files if os.path.basename(f)[:2] < "04"] + [sys.argv[sys.argv.index("--main") + 1]]
    js = "".join(open(p).read() + "\n" for p in files)
    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Phobos Heist (pixel)</title>
<style>html,body{{margin:0;padding:0;background:#07060d;overflow:hidden}}
#out{{display:block;width:1080px;height:1920px}}</style></head>
<body><canvas id="out" width="1080" height="1920"></canvas>
<script>
const ASSETS = {json.dumps(data)};
const WORDS = {json.dumps(words)};
const VENV = {json.dumps(env)};
</script>
<script>
{js}
</script></body></html>
"""
    out = os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "page.html")
    open(out, "w").write(html)
    print("wrote", out, f"{len(html)/1e6:.2f} MB")


if __name__ == "__main__":
    main()
