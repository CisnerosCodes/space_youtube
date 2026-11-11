// qa_words.mjs: caption QA. For every word: is it drawn at its first frame (60 fps) and not 3 frames
// before, is its box inside the safe zone (x 80..900, y 260..1500) once settled, and does it stay up
// at least 0.35 s (or until the next line)? Prints failures and writes qa/caption_sync.json.
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.goto(pathToFileURL(path.join(here, '..', 'page.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; if (window.__ready) await window.__ready; });
const words = await page.evaluate(() => WORDS);
const reg = async (t) => page.evaluate((t) => { window.renderAt(t); return window.__qa().words; }, t);
const out = [];
let fails = 0;
for (let i = 0; i < words.length; i++) {
  const w = words[i];
  const f0 = Math.ceil(w.start * 60 - 1e-9);
  const atStart = (await reg(f0 / 60))[i];
  const early = (await reg((f0 - 3) / 60))[i];
  const tSettle = Math.min(w.start + 0.3, (words[i + 1]?.start ?? w.end + 0.3) + 0.15);
  const settled = (await reg(tSettle))[i];
  const tHold = w.start + 0.4;
  const held = (await reg(tHold))[i];
  const issues = [];
  if (!atStart) issues.push('not drawn at its first frame');
  if (early) issues.push('drawn 3 frames early');
  if (!settled) issues.push('missing when settled');
  else {
    const b = settled;
    if (b.x0 < 78 || b.x1 > 902 || b.y0 < 258 || b.y1 > 1502) issues.push(`box out of zone ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  }
  if (!held) issues.push('gone before 0.4 s');
  if (issues.length) { fails++; console.log(i, JSON.stringify(w.text), w.start, issues.join('; ')); }
  out.push({ i, text: w.text, start: w.start, first_frame_60: f0, box: settled ? [settled.x0, settled.y0, settled.x1, settled.y1].map(Math.round) : null, issues });
}
writeFileSync(path.join(here, '..', 'qa', 'caption_sync.json'), JSON.stringify({ words: out.length, failures: fails, items: out }, null, 1));
console.log(`${out.length} words, ${fails} with issues`);
await browser.close();
