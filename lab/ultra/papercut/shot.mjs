// shot.mjs: render chosen frames of papercut.html to PNG stills (QA helper; one browser session)
// usage: node shot.mjs <outdir> <frame> [frame...]   (frames at 30 fps)  [--scale=0.5]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const scale = Number((args.find((a) => a.startsWith('--scale=')) || '--scale=1').split('=')[1]);
const [out, ...frames] = args.filter((a) => !a.startsWith('--'));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text()); });
await page.goto(pathToFileURL(path.join(here, 'papercut.html')).href, { waitUntil: 'networkidle' });
const t0 = Date.now();
await page.evaluate(async () => { await document.fonts.ready; await window.__ready; });
console.log('ready in', Date.now() - t0, 'ms');
for (const f of frames.map(Number)) {
  const t1 = Date.now();
  await page.evaluate(async (t) => { await window.renderAt(t); }, f / 30);
  const ms = Date.now() - t1;
  await page.screenshot({ path: path.join(out, `f${String(f).padStart(4, '0')}.png`) });
  console.log('frame', f, ms, 'ms');
}
await browser.close();
