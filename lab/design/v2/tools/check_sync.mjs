// check_sync.mjs: for every caption word, find the first frame it is on screen (real DOM state of
// anim.html's caption renderer) and compare with the spoken start time in the TTS words.json.
// usage: node tools/check_sync.mjs [anim.html] [captions.json]   -> prints a table, writes out/caption_sync.json
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.argv[2] ?? 'anim.html');
const cap = JSON.parse(readFileSync(process.argv[3] ?? 'captions.json', 'utf8'));
const words = JSON.parse(readFileSync(path.resolve(path.dirname(path.resolve(process.argv[3] ?? 'captions.json')), cap.timing), 'utf8')).words;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(file).href + '?t=0', { waitUntil: 'networkidle' });
const first = await page.evaluate(async () => {
  await window.__ready;
  const W = window.SD.W, firstOn = new Array(W.length).fill(null);
  for (let f = 0; f <= window.SD.LAST; f++) {
    window.SD.captionsAt(f);
    W.forEach((w, i) => { if (firstOn[i] === null && w.el && w.el.style.display !== 'none' && w.el.offsetParent !== null) firstOn[i] = f; });
  }
  return firstOn;
});
await browser.close();
const rows = cap.words.map((w, i) => {
  const spoken = w.src != null ? words[w.src].start : null;
  const ref = spoken ?? w.start;
  return { i, text: w.text, timedFrom: w.src != null ? `transcript "${words[w.src].w}"` : 'interpolated', spokenFrame: +(ref * 30).toFixed(1), shownFrame: first[i], diff: first[i] == null ? null : +(first[i] - ref * 30).toFixed(1) };
});
const bad = rows.filter((r) => r.diff == null || Math.abs(r.diff) > 2);
const maxAbs = Math.max(...rows.filter((r) => r.diff != null).map((r) => Math.abs(r.diff)));
mkdirSync('out', { recursive: true });
writeFileSync('out/caption_sync.json', JSON.stringify({ maxAbsDiffFrames: maxAbs, outsideTwoFrames: bad, rows }, null, 1));
console.log(`${rows.length} caption words; max |shown - spoken| = ${maxAbs} frames; outside 2 frames: ${bad.length}`);
for (const r of rows.filter((r) => r.timedFrom === 'interpolated')) console.log('interpolated:', r.text, 'shown at', r.shownFrame, '(gap-interpolated time', r.spokenFrame, ')');
for (const r of bad) console.log('OUT:', r);
