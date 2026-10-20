// stills.mjs: render chosen times of page.html to PNGs (one browser, one page load).
// usage: node tools/stills.mjs <outdir> <t1> <t2> ... [--scale=0.5]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const outdir = args[0];
const times = args.slice(1).filter((a) => !a.startsWith('--')).map(Number);
mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
page.on('console', (m) => console.log('console:', m.text()));
await page.goto(pathToFileURL(path.join(here, '..', 'page.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; if (window.__ready) await window.__ready; });
for (const t of times) {
  const t0 = Date.now();
  await page.evaluate(async (t) => { const r = window.renderAt(t); if (r && r.then) await r; }, t);
  const ms = Date.now() - t0;
  const f = path.join(outdir, `t${t.toFixed(3).padStart(7, '0')}.png`);
  await page.screenshot({ path: f });
  console.log(`${f} render ${ms} ms`);
}
await browser.close();
