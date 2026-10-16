// QA helper (not part of the deliverable): renders each listed frame twice, with text and with text hidden
// (scrims kept), so qa_contrast.py can measure text-vs-background contrast per pixel.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const [file, outDir, framesArg] = process.argv.slice(2);
const frames = framesArg.split(',').map(Number);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.resolve(file)).href + '?t=0', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; if (window.__ready) await window.__ready; });
for (const i of frames) {
  for (const hide of [false, true]) {
    await page.evaluate(([t, h]) => { document.body.classList.toggle('qa-notext', h); window.renderAt(t); }, [i / 30, hide]);
    await page.screenshot({ path: path.join(outDir, `${String(i).padStart(4, '0')}_${hide ? 'bg' : 'fg'}.png`) });
  }
}
await browser.close();
