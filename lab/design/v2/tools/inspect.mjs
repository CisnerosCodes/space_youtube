// inspect.mjs: load anim.html headless, report errors, anchors, caption chunks and font status.
// usage: node tools/inspect.mjs [anim.html]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const file = path.resolve(process.argv[2] ?? 'anim.html');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text()); });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(pathToFileURL(file).href + '?t=0', { waitUntil: 'networkidle' });
const info = await page.evaluate(async () => {
  await window.__ready;
  return {
    fonts: [document.fonts.check("800 40px 'Archivo'"), document.fonts.check("500 20px 'IBM Plex Mono'")],
    F: window.SD.F, NF: window.SD.NF,
    chunks: window.SD.CHUNKS.map((c) => `${c.f0}-${c.f1}: ` + c.lines.map((l) => l.map((w) => w.text).join(' ')).join(' / ')),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
