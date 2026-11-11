// Caption QA: for every frame, which caption words are visible and where (screen bounds), without rendering.
// node tools/capcheck.mjs page.html out.json
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [file, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + path.resolve(file)); await p.evaluate(async () => { await window.__ready; });
const res = await p.evaluate(() => {
  const N = 1263, first = {}, last = {}; let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9; const worst = [];
  const box = new THREE.Box3(), v = new THREE.Vector3();
  for (let f = 0; f < N; f++) {
    const t = f / 30;
    const r = TL.update(t, SCENES, camera);
    CAPS.update(t, { show: r.capsOn !== false, step: r.step, stepT: r.stepT });
    for (const gp of CAPS.groups) for (const g of gp.words) {
      if (!g.visible) continue;
      const i = g.userData.i;
      if (first[i] === undefined) first[i] = f; last[i] = f;
      g.updateMatrixWorld(true); box.setFromObject(g);
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) {
        v.set(x, y, box.max.z).project(CAPS.camera);
        const px = (v.x + 1) * 540, py = (1 - v.y) * 960;
        if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
        if (px < 80 || px > 900 || py < 260 || py > 1500) worst.push([f, WORDS[i].text, Math.round(px), Math.round(py)]);
      }
    }
  }
  const words = WORDS.map((w, i) => ({ i, text: w.text, startFrame: Math.round(w.start * 30), firstVisible: first[i], lastVisible: last[i], delta: first[i] - Math.round(w.start * 30) }));
  const agg = {}; for (const [f, w, x, y] of worst) { const a = agg[w] || (agg[w] = { frames: new Set(), minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 }); a.frames.add(f); a.minX = Math.min(a.minX, x); a.maxX = Math.max(a.maxX, x); a.minY = Math.min(a.minY, y); a.maxY = Math.max(a.maxY, y); }
  const aggOut = Object.entries(agg).map(([w, a]) => ({ w, frames: [...a.frames].length, f0: Math.min(...a.frames), minX: a.minX, maxX: a.maxX, minY: a.minY, maxY: a.maxY }));
  return { words, bounds: { minX, maxX, minY, maxY }, outside: aggOut, outsideCount: worst.length };
});
fs.writeFileSync(out, JSON.stringify(res, null, 1));
const bad = res.words.filter((w) => w.firstVisible === undefined || Math.abs(w.delta) > 2);
console.log('words', res.words.length, 'max |delta|', Math.max(...res.words.map((w) => Math.abs(w.delta))), 'bad', bad.length, 'bounds', JSON.stringify(res.bounds), 'outside corners', res.outsideCount);
for (const o of res.outside) console.log(JSON.stringify(o));
await b.close();
