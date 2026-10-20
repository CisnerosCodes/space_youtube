// capcheck.mjs: load page.html, and for every caption word find the first frame it is drawn; compare to its spoken start
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(pathToFileURL(path.resolve('page.html')).href);
await p.evaluate(async () => { await window.__ready; });
const res = await p.evaluate(() => {
  const first = {};
  for (let f = 0; f < 1260; f++) { const fq = f - (f % 2); const L = chunkAt(fq); if (!L) continue; for (const w of L.words) if (fq >= shownF(w.i) && first[w.i] == null) first[w.i] = f; }
  return WORDS.map((w, i) => ({ i, text: w.text, start: w.start, startFrame: +(w.start * 30).toFixed(2), firstShown: first[i] ?? null, delta: first[i] == null ? null : +(first[i] - w.start * 30).toFixed(2) }));
});
const bad = res.filter((r) => r.delta == null || Math.abs(r.delta) > 2);
writeFileSync('out/caption_sync.json', JSON.stringify({ words: res.length, maxAbsDeltaFrames: Math.max(...res.map((r) => Math.abs(r.delta ?? 99))), outside2Frames: bad, all: res }, null, 1));
console.log('words', res.length, 'max |delta| frames', Math.max(...res.map((r) => Math.abs(r.delta ?? 99))), 'bad', bad.length);
await b.close();
