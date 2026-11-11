// stills.mjs: render chosen frames of page.html to PNGs (and an optional labelled grid)
// usage: node tools/stills.mjs <outdir> <frame,frame,...> [--grid=name.png] [--scale=0.5]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(new URL('..', import.meta.url).pathname);
const [outdir, list] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opt = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const frames = list.split(',').map(Number);
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text()); });
await page.goto(pathToFileURL(path.join(dir, 'page.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; if (window.__ready) await window.__ready; });
const files = [];
for (const f of frames) {
  const ms = await page.evaluate(async (t) => { const a = performance.now(); const r = window.renderAt(t); if (r && r.then) await r; return performance.now() - a; }, f / 30);
  const file = path.join(outdir, `f${String(f).padStart(4, '0')}.png`);
  await page.screenshot({ path: file });
  files.push(file);
  console.log(f, ms.toFixed(0) + ' ms');
}
await browser.close();
const grid = opt('grid');
if (grid) {
  const cols = Number(opt('cols') ?? 4), sc = Number(opt('scale') ?? 0.3);
  const w = Math.round(1080 * sc), h = Math.round(1920 * sc);
  const inputs = files.flatMap((f) => ['-i', f]);
  const lab = files.map((f, i) => `[${i}:v]scale=${w}:${h},drawtext=text='${path.basename(f, '.png')}':x=6:y=6:fontsize=${Math.round(28 * sc / 0.3)}:fontcolor=white:box=1:boxcolor=black@0.7[v${i}]`).join(';');
  const n = files.length, rows = Math.ceil(n / cols);
  const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
  const fc = `${lab};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${n}:layout=${layout}:fill=gray[o]`;
  if (n === 1) fs.copyFileSync(files[0], path.join(outdir, grid));
  else execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', fc, '-map', '[o]', path.join(outdir, grid)]);
  console.log('grid', path.join(outdir, grid), rows + ' rows');
}
