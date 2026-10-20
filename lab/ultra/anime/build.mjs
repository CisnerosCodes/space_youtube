// build.mjs: inline src/*.js and the caption data into one self-contained page.html
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname;
const caps = JSON.parse(fs.readFileSync(dir + '../kit/captions.json', 'utf8'));
const words = caps.words.map((w) => ({ text: w.text, start: w.start, end: w.end }));
const order = ['core.js', 'chars.js', 'props.js', 'captions.js', 'shots.js', 'main.js'];
const js = order.filter((f) => fs.existsSync(dir + 'src/' + f)).map((f) => `// ===== ${f} =====\n` + fs.readFileSync(dir + 'src/' + f, 'utf8')).join('\n');
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Downlink Cat: MMX heist (anime)</title>
<style>
@font-face{font-family:'Archivo';src:url(fonts/archivo.woff2) format('woff2');font-weight:100 900;font-stretch:62% 125%;font-style:normal;font-display:block}
@font-face{font-family:'Archivo';src:url(fonts/archivo-italic.woff2) format('woff2');font-weight:100 900;font-stretch:62% 125%;font-style:italic;font-display:block}
@font-face{font-family:'Plex Mono';src:url(fonts/plexmono-500.woff2) format('woff2');font-weight:500;font-display:block}
@font-face{font-family:'Plex Mono';src:url(fonts/plexmono-600.woff2) format('woff2');font-weight:600;font-display:block}
@font-face{font-family:'Dela Gothic One';src:url(fonts/delagothic.woff2) format('woff2');font-weight:400;font-display:block}
html,body{margin:0;padding:0;background:#0b0b0c;overflow:hidden}
canvas{display:block}
#fontwarm{position:absolute;left:-9999px;top:0;font-size:20px}
</style></head>
<body><canvas id="cv" width="1080" height="1920"></canvas>
<div id="fontwarm"><span style="font-family:Archivo;font-weight:800">Aa</span><span style="font-family:Archivo;font-weight:900;font-style:italic">Aa</span><span style="font-family:'Plex Mono';font-weight:600">Aa</span><span style="font-family:'Plex Mono';font-weight:500">Aa</span><span style="font-family:'Dela Gothic One'">Aa1ゴドン</span></div>
<script>
const WORDS = ${JSON.stringify(words)};
${js}
</script></body></html>`;
fs.writeFileSync(dir + 'page.html', html);
console.log('wrote page.html', (html.length / 1024).toFixed(0), 'KB');
