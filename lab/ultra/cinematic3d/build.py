#!/usr/bin/env python3
"""Build page.html: inline main.js, the caption words and the real assets (base64) into one self-contained page.
Chromium blocks file:// fetches and taints file:// images for WebGL, so the GLB models and the USGS Mars map are embedded."""
import base64, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(HERE, '..', 'kit')
ASSETS = {
    'phobos': 'assets/models/phobos_nasa.glb',
    'deimos': 'assets/models/deimos_nasa.glb',
    'mars': 'assets/textures/mars_viking_color_mosaic_usgs_8192x4096.jpg',
}
tpl = open(os.path.join(HERE, 'src', 'index.template.html')).read()
main = open(os.path.join(HERE, 'src', 'main.js')).read()
words = json.load(open(os.path.join(KIT, 'captions.json')))['words']
words = [{'text': w['text'], 'start': w['start'], 'end': w['end']} for w in words]
main = main.replace('/*CAPTIONS*/[]', json.dumps(words))
blocks = ''.join(f'<script type="text/plain" id="a_{k}">{base64.b64encode(open(os.path.join(KIT, v), "rb").read()).decode()}</script>\n' for k, v in ASSETS.items())
out = tpl.replace('<!--ASSETS-->', blocks).replace('/*MAIN*/', main)
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'page.html')
open(dst, 'w').write(out)
print(os.path.basename(dst), round(len(out) / 1e6, 1), 'MB')
