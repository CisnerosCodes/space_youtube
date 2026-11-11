// export.mjs  usage: node export.mjs   (run from any folder)
// Renders the standalone banner, avatar and thumbnail pages to PNG, plus a 98 px circular avatar preview.
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const jobs = [
  ['banner.html', 'banner_2560x1440.png', 2560, 1440],
  ['avatar.html', 'avatar_800x800.png', 800, 800],
  ['thumb.html', 'thumb_ep01_1280x720.png', 1280, 720],
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [src, out, w, h] of jobs) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(dir, src)).href, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => im.decode().catch(() => {})));
  });
  await page.screenshot({ path: path.join(dir, out), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log('wrote', out);
}

// 98 px preview: the 800 px avatar downscaled inside a circle mask, transparent outside the circle
const page = await browser.newPage({ viewport: { width: 98, height: 98 }, deviceScaleFactor: 1 });
const avatarUrl = 'data:image/png;base64,' + readFileSync(path.join(dir, 'avatar_800x800.png')).toString('base64');
await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body>
<img id="a" src="${avatarUrl}" width="98" height="98" style="display:block;width:98px;height:98px;border-radius:50%"></body></html>`);
await page.evaluate(async () => { await document.getElementById('a').decode(); });
await page.screenshot({ path: path.join(dir, 'avatar_98_preview.png'), omitBackground: true, clip: { x: 0, y: 0, width: 98, height: 98 } });
console.log('wrote avatar_98_preview.png');
await browser.close();
