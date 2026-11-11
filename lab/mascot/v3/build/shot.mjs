// shot.mjs (v3): screenshots HTML pages with Playwright Chromium.
// Usage: node build/shot.mjs <page.html> <out.png> [width=2400] [height=1350] [t]
// If the page defines window.renderAt, it is called with t (default 0) before the screenshot.
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [file, out, W = '2400', H = '1350', T] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.resolve(file)).href + (T != null ? `?t=${T}` : ''), { waitUntil: 'networkidle' });
const ok = await page.evaluate(async (t) => {
  await document.fonts.ready;
  if (window.__ready) await window.__ready;
  if (window.renderAt && t != null) window.renderAt(Number(t));
  await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
  return [document.fonts.check('800 40px Archivo'), document.fonts.check('500 20px "IBM Plex Mono"')];
}, T ?? null);
await page.screenshot({ path: out });
console.log(out, 'fonts', ok.join(','));
await browser.close();
