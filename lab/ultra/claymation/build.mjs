// build.mjs: assembles claymation.html, one self-contained page (three.js r159 inline, fonts and photos as data URIs).
// usage: node build.mjs [out.html]
// three.js is vendored from https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js (exact pinned version);
// it is inlined because the headless render browser has no network access.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const KIT = path.resolve(HERE, '../kit');
const out = process.argv[2] || path.join(HERE, 'claymation.html');
const rd = (p) => fs.readFileSync(path.join(HERE, p), 'utf8');
const b64 = (p) => fs.readFileSync(p).toString('base64');

// photos: downscaled copies (crop/scale only) as data URIs, so WebGL can use them from file://
const IMG = {};
const tmp = path.join(HERE, 'data');
function photo(key, src, w, q = 4) {
  const dst = path.join(tmp, key + '.jpg');
  if (!fs.existsSync(dst)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', `scale=${w}:-2`, '-q:v', String(q), dst]);
  IMG[key] = 'data:image/jpeg;base64,' + b64(dst);
}
photo('phobos', path.join(KIT, 'assets/images/phobos_color_hirise_6800km_PIA10368.jpg'), 1400);

const caps = JSON.parse(fs.readFileSync(path.join(KIT, 'captions.json'), 'utf8'));
const words = caps.words.map((w) => ({ text: w.text, start: w.start, end: w.end }));
const glyphs = rd('data/glyphs_titan.json');
const fonts = {
  Titan: 'data:font/ttf;base64,' + b64(path.join(HERE, 'fonts/TitanOne-Regular.ttf')),
  Kalam: 'data:font/ttf;base64,' + b64(path.join(HERE, 'fonts/Kalam-Bold.ttf')),
  Plex: 'data:font/ttf;base64,' + b64(path.join(HERE, 'fonts/IBMPlexMono-SemiBold.ttf')),
};
const srcFiles = fs.readdirSync(path.join(HERE, 'src')).filter((f) => f.endsWith('.js')).sort();
const js = srcFiles.map((f) => `// ==== ${f} ====\n` + rd('src/' + f)).join('\n');
const three = rd('vendor/three-0.159.0.min.js');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Downlink Cat: MMX heist (claymation)</title>
<style>
@font-face{font-family:'Plex';src:url(${fonts.Plex}) format('truetype');font-weight:600}
html,body{margin:0;padding:0;background:#0b0b0c;overflow:hidden}
#stage{position:relative;width:1080px;height:1920px;overflow:hidden}
canvas{display:block;width:1080px;height:1920px}
#credit{position:absolute;left:132px;top:1424px;font:600 22px/1.3 'Plex',monospace;color:#d9cdb3;letter-spacing:0.01em;white-space:nowrap;max-width:600px}
#steplbl{position:absolute;left:670px;top:1428px;font:600 18px/1 'Plex',monospace;color:#f5b83d;letter-spacing:0.08em}
#credit:empty{display:none}
</style></head>
<body><div id="stage"><canvas id="c" width="1080" height="1920"></canvas><div id="credit"></div><div id="steplbl"></div></div>
<script>/* three.js r159 (MIT), https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js */
${three}</script>
<script>
const GLYPHS = ${glyphs};
const WORDS = ${JSON.stringify(words)};
const IMG = ${JSON.stringify(IMG)};
const FONTS = ${JSON.stringify({ Titan: fonts.Titan, Kalam: fonts.Kalam })};
${js}
</script></body></html>`;
fs.writeFileSync(out, html);
console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB', srcFiles.join(' '));
