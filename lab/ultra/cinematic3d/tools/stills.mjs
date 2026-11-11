// stills.mjs: render chosen times of a renderAt(t) page to PNGs with one browser.
// usage: node stills.mjs page.html outdir t1 t2 ... [--webgl] [--prefix=s]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const pos = args.filter((a) => !a.startsWith('--'));
const [file, outdir, ...times] = pos;
const prefix = (flags.find((f) => f.startsWith('--prefix=')) || '--prefix=s').split('=')[1];
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || m.type() === 'log') console.log('console.' + m.type() + ':', m.text().slice(0, 300)); });
const t0 = Date.now();
await page.goto(pathToFileURL(path.resolve(file)).href + (process.env.QS || '?t=0'), { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; if (window.__ready) await window.__ready; });
console.log('loaded in', ((Date.now() - t0) / 1000).toFixed(1), 's');
for (const ts of times) {
  const t = Number(ts);
  const a = Date.now();
  await page.evaluate(async (t) => { const r = window.renderAt(t); if (r && r.then) await r; }, t);
  const f = Math.round(t * 30);
  const out = path.join(outdir, `${prefix}_${String(f).padStart(4, '0')}.png`);
  await page.screenshot({ path: out, type: 'png' });
  console.log(out, ((Date.now() - a) / 1000).toFixed(2), 's');
}
await browser.close();
