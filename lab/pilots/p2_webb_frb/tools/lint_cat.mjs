// lint_cat.mjs: runs the page's cat check (SD.lintCat) and writes out/cat_lint.json.
// It steps every frame where the cat is on screen and reports overlaps with caption words (line boxes minus
// their padding), the photo subject (the ring around the white cross and the galaxy), and the safe zone
// x 80 to 900, y 200 to 1500 (entrances and exits are exempt from the safe zone).
// It also counts the moves used and the cat's share of the runtime.
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.argv[2] ?? 'anim.html');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(file).href + '?t=0', { waitUntil: 'networkidle' });
const res = await page.evaluate(async () => {
  await window.__ready;
  const r = window.SD.lintCat();
  const moves = window.SD.cat.list.filter((a) => !['say', 'expr', 'look'].includes(a.do)).map((a) => ({ frame: Math.round(a.t * 30), move: a.how ? `${a.do} ${a.how}` : a.do }));
  return { ...r, moves, distinct: [...new Set(moves.map((m) => m.move))] };
});
await browser.close();
mkdirSync('out', { recursive: true });
writeFileSync('out/cat_lint.json', JSON.stringify(res, null, 1));
console.log(`cat on screen ${res.onFrames} frames (${(res.share * 100).toFixed(1)}%); ${res.distinct.length} distinct moves: ${res.distinct.join(', ')}`);
console.log(`lint hits: ${res.hits.length}`);
const byWhat = {}; for (const h of res.hits) (byWhat[h.what] ??= []).push(h.frame);
for (const [w, fr] of Object.entries(byWhat)) console.log(' ', w, fr.length, 'frames:', fr.slice(0, 40).join(','));
