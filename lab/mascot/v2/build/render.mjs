// render.mjs (v2): renders v2 HTML files to PNG with Playwright Chromium.
// Usage: node build/render.mjs sheet.html poses.html thumb.html   (paths relative to lab/mascot/v2)
// Writes <name>.png; for thumb.html also writes thumb_320.png (320 x 180).
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = { thumb: [1280, 720], talk: [1080, 1920] };
const files = process.argv.slice(2);
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy });
for (const f of files) {
  const key = path.basename(f).replace(/\.html$/, '');
  const [width, height] = SIZES[key] ?? [2400, 1350];
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(ROOT, f)).href, { waitUntil: 'networkidle' });
  const ok = await page.evaluate(async () => {
    await document.fonts.ready;
    if (window.__ready) await window.__ready;
    await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
    return [document.fonts.check('800 40px Archivo'), document.fonts.check('500 20px "IBM Plex Mono"')];
  });
  const out = path.join(ROOT, `${key}.png`);
  await page.screenshot({ path: out });
  console.log(out, 'fonts', ok.join(','));
  if (key === 'thumb') {
    const small = path.join(ROOT, 'thumb_320.png');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', 'scale=320:180:flags=lanczos', small]);
    console.log(small);
  }
  await page.close();
}
await browser.close();
