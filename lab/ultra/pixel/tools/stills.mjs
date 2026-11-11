// node tools/stills.mjs page.html outdir t1 t2 ...   (times in seconds; writes outdir/s_<frame>.png at 1080x1920)
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const [file, outdir, ...ts] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
page.on('console', (m) => console.log('console:', m.text()));
await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'networkidle' });
await page.evaluate(async () => { if (window.__ready) await window.__ready; });
for (const t of ts) {
  const tt = Number(t);
  await page.evaluate(async (t) => { const r = window.renderAt(t); if (r && r.then) await r; }, tt);
  const f = Math.round(tt * 30);
  await page.screenshot({ path: path.join(outdir, `s_${String(f).padStart(4, '0')}.png`) });
}
await browser.close();
