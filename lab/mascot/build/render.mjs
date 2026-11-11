// render.mjs: renders the mascot HTML files to PNG with Playwright Chromium.
// Usage: node build/render.mjs A.html thumb_A.html ...   (paths relative to lab/mascot)
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2);
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy });
for (const f of files) {
  const thumb = path.basename(f).startsWith('thumb_');
  const ov = path.basename(f).startsWith('overview');
  const size = ov ? { width: 2400, height: 2720 } : thumb ? { width: 1280, height: 720 } : { width: 2400, height: 1350 };
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(ROOT, f)).href, { waitUntil: 'networkidle' });
  const ok = await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
    return [document.fonts.check('800 40px Archivo'), document.fonts.check('500 20px "IBM Plex Mono"')];
  });
  const out = path.join(ROOT, f.replace(/\.html$/, '.png'));
  await page.screenshot({ path: out });
  console.log(out, 'fonts', ok.join(','));
  await page.close();
}
await browser.close();
