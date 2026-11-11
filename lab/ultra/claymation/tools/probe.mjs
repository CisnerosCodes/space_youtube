// node tools/probe.mjs page.html t "label:x,y,z" ...  -> screen px of world points at time t (after renderAt)
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import path from 'node:path';
const [file, t, ...pts] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + path.resolve(file)); await p.evaluate(async () => { if (window.__ready) await window.__ready; });
for (const tt of t.split(',')) {
  const r = await p.evaluate(([tt, pts]) => {
    window.renderAt(Number(tt));
    const out = [];
    const extra = { cat: () => { const v = new THREE.Vector3(); TL.cat.R.head.getWorldPosition(v); return v; } };
    for (const s of pts) {
      if (s.startsWith('flag')) { // card bounds of a flag: flagName
        const f = WORLD.W[s]; if (!f) { out.push(s + ' ?'); continue; }
        f.updateMatrixWorld(true); const card = f.userData.card; const g = card.geometry; g.computeBoundingBox(); const bb = g.boundingBox;
        const xs = [], ys = [];
        for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) { const v = new THREE.Vector3(x, y, 0).applyMatrix4(card.matrixWorld).project(camera); xs.push((v.x + 1) * 540); ys.push((1 - v.y) * 960); }
        out.push(`${s} x ${Math.round(Math.min(...xs))}..${Math.round(Math.max(...xs))} y ${Math.round(Math.min(...ys))}..${Math.round(Math.max(...ys))} scale ${f.scale.x.toFixed(2)}`);
        continue;
      }
      const [lab, xyz] = s.split(':');
      let v = extra[xyz] ? extra[xyz]() : new THREE.Vector3(...xyz.split(',').map(Number));
      const w = v.clone();
      v.project(camera);
      out.push(`${lab} (${w.x.toFixed(1)},${w.y.toFixed(1)},${w.z.toFixed(1)}) -> px ${Math.round((v.x + 1) * 540)},${Math.round((1 - v.y) * 960)}${v.z > 1 ? ' BEHIND' : ''}`);
    }
    return out.join('\n');
  }, [tt, pts]);
  console.log('t=' + tt + '\n' + r);
}
await b.close();
