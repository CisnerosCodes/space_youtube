// build.mjs: concatenates src/*.js into one self-contained page (fonts, photo and captions inlined)
// usage: node build.mjs   ->  papercut.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const kit = path.join(here, '..', 'kit');
const b64 = (p) => readFileSync(p).toString('base64');
const fonts = [
  ['Archivo', 'Archivo.ttf', 'font-weight: 100 900; font-stretch: 62% 125%;'],
  ['IBM Plex Mono', 'IBMPlexMono-Medium.ttf', 'font-weight: 500;'],
  ['IBM Plex Mono', 'IBMPlexMono-SemiBold.ttf', 'font-weight: 600 700;'],
  ['Special Elite', 'SpecialElite.ttf', 'font-weight: 400;'],
  ['Abril Fatface', 'AbrilFatface.ttf', 'font-weight: 400;'],
  ['Patrick Hand', 'PatrickHand.ttf', 'font-weight: 400;'],
  ['Archivo Black', 'ArchivoBlack.ttf', 'font-weight: 400;'],
  ['Bungee', 'Bungee.ttf', 'font-weight: 400;'],
];
const css = fonts.map(([fam, file, extra]) => `@font-face{font-family:"${fam}";src:url(data:font/ttf;base64,${b64(path.join(here, 'fonts', file))}) format("truetype");${extra}font-display:block;}`).join('\n');
const cap = JSON.parse(readFileSync(path.join(kit, 'captions.json'), 'utf8'));
const CAP = { words: cap.words.map((w) => ({ text: w.text, start: w.start, end: w.end })) };
const photo = 'data:image/jpeg;base64,' + b64(path.join(here, 'assets', 'phobos_card.jpg'));
const src = readdirSync(path.join(here, 'src')).filter((f) => f.endsWith('.js')).sort().map((f) => `// ===== ${f} =====\n` + readFileSync(path.join(here, 'src', f), 'utf8')).join('\n');
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Papercut: the Phobos heist</title>
<style>${css}
html,body{margin:0;padding:0;background:#0f1018;overflow:hidden}canvas{display:block}
</style></head>
<body><canvas id="c" width="1080" height="1920"></canvas>
<script>
// Photo: PIA10368, Phobos from HiRISE. Credit: NASA/JPL-Caltech/University of Arizona (public domain).
const PHOTO_SRC = "${photo}";
const CAP = ${JSON.stringify(CAP)};
${src}
</script></body></html>`;
writeFileSync(path.join(here, 'papercut.html'), html);
console.log('wrote papercut.html', (html.length / 1e6).toFixed(2), 'MB');
