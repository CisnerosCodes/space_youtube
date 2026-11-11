// catlint.mjs: runs the mascot checks inside anim.html (Actor.lint against the caption line boxes and
// photo subjects active on each frame, plus the safe zone) and writes out/cat_lint.json.
// usage: node tools/catlint.mjs [anim.html]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.argv[2] ?? 'anim.html');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(pathToFileURL(file).href + '?t=0', { waitUntil: 'networkidle' });
const res = await page.evaluate(async () => {
  await window.__ready;
  const L = window.SD.catLint();
  const cat = window.SD.cat;
  // moves used (distinct), from the actor's timeline
  const moves = [...new Set(cat.list.filter((a) => !['say', 'expr', 'look'].includes(a.do)).map((a) => a.do === 'enter' || a.do === 'exit' ? `${a.do} ${a.how}` : a.do))];
  const boxes = {};
  for (const t of [1.6, 3.0, 9.4, 10.6, 11.4, 13.4, 14.0, 25.6, 26.6, 27.6, 33.6, 34.4, 36.0]) boxes[t] = cat.box(t).map(Math.round);
  return { ...L, moves, boxes };
});
await browser.close();
mkdirSync('out', { recursive: true });
writeFileSync('out/cat_lint.json', JSON.stringify(res, null, 1));
console.log(`cat on screen ${res.framesOnScreen}/${res.totalFrames} frames (${(res.share * 100).toFixed(1)}%); ${res.moves.length} distinct moves: ${res.moves.join(', ')}`);
console.log(`lint hits: ${res.hits.length}`);
const bySeg = {};
for (const h of res.hits) { const k = `${h.seg} ${h.what}`; (bySeg[k] ??= []).push(h.frame); }
for (const [k, fr] of Object.entries(bySeg)) console.log(' ', k, 'frames', fr[0], '..', fr[fr.length - 1], `(${fr.length})`);
console.log('boxes', JSON.stringify(res.boxes));
