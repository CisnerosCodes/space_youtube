// stills helper: node shot.mjs page.html out_prefix t1 t2 ... (seconds). Renders with SwiftShader WebGL like render_fast --webgl.
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const args = process.argv.slice(2);
const [file, prefix, ...ts] = args.filter((a) => !a.startsWith('--'));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text().slice(0, 400)); });
const t0 = Date.now();
await page.goto(pathToFileURL(path.resolve(file)).href + '?t=0', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; if (window.__ready) await window.__ready; });
console.log('loaded in', Date.now() - t0, 'ms');
for (const s of ts) {
  const t = Number(s), t1 = Date.now();
  await page.evaluate(async (t) => { const r = window.renderAt(t); if (r && r.then) await r; }, t);
  const name = `${prefix}_${String(Math.round(t * 30)).padStart(4, '0')}.png`;
  await page.screenshot({ path: name });
  console.log(name, Date.now() - t1, 'ms');
}
await browser.close();
