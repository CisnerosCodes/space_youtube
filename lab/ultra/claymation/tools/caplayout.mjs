// Dump each caption word's screen box (from the caption layout) and its start frame: node tools/caplayout.mjs page.html out.json
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [file, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + path.resolve(file)); await p.evaluate(async () => { await window.__ready; });
const res = await p.evaluate(() => {
  const out = [];
  CAPS.groups.forEach((gp, gi) => { for (const g of gp.words) { const u = g.userData; out.push({ i: u.i, text: WORDS[u.i].text, start: WORDS[u.i].start, group: gi, x0: u.cx - u.w / 2, x1: u.cx + u.w / 2, base: u.base, size: u.size }); } });
  return out.sort((a, b) => a.i - b.i);
});
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(res.length, 'words');
await b.close();
