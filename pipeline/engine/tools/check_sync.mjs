// check_sync.mjs <short_dir>: for every caption word, the first frame it is on screen (the page's real
// caption DOM) against its spoken start in captions.json. Writes out/caption_sync.json; exit 1 when a
// word is more than 2 frames off.
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'lab/motion-ab-test/node_modules/playwright/index.mjs')).href);
const dir = path.resolve(process.argv[2]);
const cap = JSON.parse(readFileSync(path.join(dir, 'captions.json'), 'utf8'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(pathToFileURL(path.join(dir, 'anim.html')).href + '?t=0', { waitUntil: 'networkidle' });
const first = await p.evaluate(async () => {
  await window.__ready;
  const W = window.SD.W, on = new Array(W.length).fill(null);
  for (let f = 0; f <= window.SD.LAST; f++) { window.SD.captionsAt(f); W.forEach((w, i) => { if (on[i] === null && w.el && w.el.style.display !== 'none' && w.el.offsetParent !== null) on[i] = f; }); }
  return on;
});
await b.close();
const rows = cap.words.map((w, i) => ({ i, text: w.text, spokenFrame: +(w.start * 30).toFixed(1), shownFrame: first[i], diff: first[i] == null ? null : +(first[i] - w.start * 30).toFixed(1) }));
const bad = rows.filter((r) => r.diff == null || Math.abs(r.diff) > 2);
const max = Math.max(...rows.filter((r) => r.diff != null).map((r) => Math.abs(r.diff)));
mkdirSync(path.join(dir, 'out'), { recursive: true });
writeFileSync(path.join(dir, 'out/caption_sync.json'), JSON.stringify({ maxAbsDiffFrames: max, outsideTwoFrames: bad, rows }, null, 1));
console.log(`${rows.length} caption words; max |shown - spoken| = ${max} frames; outside 2 frames: ${bad.length}`);
for (const r of bad) console.log('OUT:', JSON.stringify(r));
process.exit(bad.length ? 1 : 0);
