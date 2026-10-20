// build.mjs: assemble the self-contained page.html (inline JS/CSS, assets embedded as data URIs).
// node lab/ultra/riso/tools/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.resolve(ROOT, '..', 'kit');
const rd = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const b64 = (p) => readFileSync(path.join(ROOT, p)).toString('base64');
const uri = (p, mime) => `data:${mime};base64,${b64(p)}`;

const caps = JSON.parse(readFileSync(path.join(KIT, 'captions.json'), 'utf8'));
const DATA = {
  words: caps.words.map((w) => ({ text: w.text, start: w.start, end: w.end })),
  fonts: [
    { family: 'Anton', weight: 400, src: uri('fonts/anton-400.woff2', 'font/woff2') },
    { family: 'League Gothic', weight: 400, src: uri('fonts/league-gothic-400.woff2', 'font/woff2') },
    { family: 'Barlow Condensed', weight: 600, src: uri('fonts/barlow-condensed-600.woff2', 'font/woff2') },
    { family: 'Barlow Condensed', weight: 700, src: uri('fonts/barlow-condensed-700.woff2', 'font/woff2') },
    { family: 'Barlow Condensed', weight: 800, src: uri('fonts/barlow-condensed-800.woff2', 'font/woff2') },
    { family: 'Space Mono', weight: 400, src: uri('fonts/space-mono-400.woff2', 'font/woff2') },
    { family: 'Space Mono', weight: 700, src: uri('fonts/space-mono-700.woff2', 'font/woff2') },
  ],
  img: {
    mars_tex: uri('assets/mars_tex.jpg', 'image/jpeg'),
    phobos_tex: uri('assets/phobos_tex.jpg', 'image/jpeg'),
    phobos_a: uri('assets/phobos_a.webp', 'image/webp'),
    phobos_b: uri('assets/phobos_b.webp', 'image/webp'),
  },
  bin: { phobos_geo: b64('assets/phobos_geo.bin') },
};

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Downlink Cat · MMX heist · Riso</title>
<meta name="viewport" content="width=1080,height=1920">
<style>html,body{margin:0;padding:0;background:#F4EEE1;overflow:hidden}canvas{display:block}</style>
</head><body>
<canvas id="view" width="1080" height="1920"></canvas>
<script>window.DATA = ${JSON.stringify(DATA)};</script>
<script>
${rd('src/rig_bundle.js')}
</script>
<script>
${rd('src/engine.js')}
${rd('src/art.js')}
${rd('src/scenes.js')}
${rd('src/main.js')}
</script>
</body></html>
`;
writeFileSync(path.join(ROOT, 'page.html'), html);
console.log('page.html', (html.length / 1e6).toFixed(2), 'MB');
