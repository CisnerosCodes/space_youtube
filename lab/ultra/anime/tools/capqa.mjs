// capqa.mjs: per-frame caption QA. Word first-visible frame vs spoken start, safe-zone bounds, impact rate.
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(new URL('..', import.meta.url).pathname);
const N = Number(process.argv[2] || 1260);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.goto(pathToFileURL(path.join(dir, 'page.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; if (window.__ready) await window.__ready; });
const res = await page.evaluate((N) => {
  const first = {}, last = {}, out = [];
  for (let f = 0; f < N; f++) {
    const boxes = window.__capBoxes(f / 30);
    for (const b of boxes) {
      if (first[b.i] == null) first[b.i] = f; last[b.i] = f;
      if (b.x < 78 || b.x + b.w > 902 || b.y < 258 || b.y + b.h > 1502) out.push({ f, i: b.i, text: b.text, box: [b.x, b.y, b.w, b.h].map(Math.round) });
    }
  }
  return { first, last, out, words: WORDS, impacts: IMPACTS };
}, N);
await browser.close();
let bad = 0;
const rows = res.words.map((w, i) => {
  const exp = Math.round(w.start * 30), got = res.first[i];
  const d = got == null ? null : got - exp;
  if (d == null || Math.abs(d) > 2) bad++;
  return { i, text: w.text, expected: exp, first: got, delta: d, lastVisible: res.last[i] };
});
const oob = res.out;
// impacts: count flashes in any 30-frame window
let maxPerSec = 0; for (let f = 0; f < N; f++) { const n = res.impacts.filter((x) => x >= f && x < f + 30).length; maxPerSec = Math.max(maxPerSec, n); }
const report = { words: rows.length, timingFailures: bad, outOfBoundsFrames: oob.length, outOfBoundsSample: oob.slice(0, 20), maxImpactsPerSecond: maxPerSec, rows };
fs.writeFileSync(path.join(dir, 'out/caption_qa.json'), JSON.stringify(report, null, 1));
console.log('timing failures', bad, '| out-of-bounds word-frames', oob.length, '| max impacts per second', maxPerSec);
rows.filter((r) => r.delta == null || Math.abs(r.delta) > 2).forEach((r) => console.log('TIMING', r));
const seen = new Set(); oob.forEach((o) => { const k = o.i; if (!seen.has(k)) { seen.add(k); console.log('OOB', o); } });
