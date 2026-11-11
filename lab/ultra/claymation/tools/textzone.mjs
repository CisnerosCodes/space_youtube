// Prop-text QA: for every frame, the screen box of every visible text-bearing prop (flags, tags, signs,
// calendars, dial, jar labels, wordmark), checked against the safe zone x 80..900, y 260..1500. No rendering.
// node tools/textzone.mjs page.html out.json [frames=1263]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [file, out, nArg] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + path.resolve(file)); await p.evaluate(async () => { await window.__ready; });
const res = await p.evaluate((N) => {
  const W = WORLD.W, box = new THREE.Box3(), v = new THREE.Vector3();
  const visChain = (o) => { for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q.isScene) return true; } return true; };
  const scaleOf = (o) => { const s = new THREE.Vector3(); o.getWorldScale(s); return s.x; };
  const findMapped = (root) => { const out = []; root.traverse((m) => { if (m.isMesh && m.material && m.material.map) out.push(m); }); return out; };
  // text objects: [name, scene key, getter -> list of meshes whose box is the text area, inset fraction x, y]
  const T = [
    ['tagPhobos', 'T', () => [W.tagPhobos.userData.card], 0.05, 0.12],
    ['signFate', 'T', () => [W.signFate.userData.card], 0.05, 0.12],
    ['flagLaunch', 'T', () => [W.flagLaunch.userData.card], 0.05, 0.1],
    ['flagSpiral', 'T', () => [W.flagSpiral.userData.card], 0.05, 0.1],
    ['flagCruise', 'T', () => [W.flagCruise.userData.card], 0.05, 0.1],
    ['flagCap', 'T', () => [W.flagCap.userData.card], 0.05, 0.1],
    ['calFlip', 'T', () => findMapped(W.calFlip), 0.03, 0.03],
    ['jarT', 'T', () => findMapped(W.jarT), 0.0, 0.0],
    ['flagNext', 'T', () => [W.flagNext.userData.card], 0.05, 0.1],
    ['flagWed', 'T', () => [W.flagWed.userData.card], 0.05, 0.1],
    ['calWed', 'T', () => findMapped(W.cal), 0.03, 0.03],
    ['tagDrop', 'G', () => [W.tagDrop.userData.card], 0.05, 0.12],
    ['flagDrop', 'G', () => [W.flagDrop.userData.card], 0.05, 0.1],
    ['roverTag', 'G', () => [W.roverTag.userData.card], 0.05, 0.12],
    ['dial15', 'G', () => (W.scale.userData.fB.visible ? [W.scale.userData.fB] : []), 0.15, 0.3],
    ['flagCore', 'G', () => [W.flagCore.userData.card], 0.05, 0.1],
    ['flagHours', 'G', () => [W.flagHours.userData.card], 0.05, 0.1],
    ['flagJar', 'G', () => [W.flagJar.userData.card], 0.05, 0.1],
    ['jarG', 'G', () => findMapped(W.jarG), 0.0, 0.0],
    ['wordmark', 'C', () => [...W.letters, W.echoDot, W.echoRing], 0, 0],
    ['echoPing', 'C', () => [W.echoPing], 0, 0],
  ];
  const rows = [];
  for (let f = 0; f < N; f++) {
    const t = f / 30;
    const r = TL.update(t, SCENES, camera);
    const sk = r.scene === SCENES.T ? 'T' : r.scene === SCENES.G ? 'G' : 'C';
    for (const [name, sc, get, ix, iy] of T) {
      if (sc !== sk) continue;
      for (const m of get()) {
        if (!m || !visChain(m) || scaleOf(m) < (name === 'wordmark' && W.letters.includes(m) ? 0.05 * W.wsc : 0.05)) continue;
        m.updateMatrixWorld(true);
        box.setFromObject(m);
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, behind = false;
        for (const X of [box.min.x, box.max.x]) for (const Y of [box.min.y, box.max.y]) for (const Z of [box.min.z, box.max.z]) {
          v.set(X, Y, Z).project(camera); if (v.z > 1) behind = true;
          const px = (v.x + 1) * 540, py = (1 - v.y) * 960;
          x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        }
        if (behind) continue;
        const w = x1 - x0, h = y1 - y0;
        x0 += w * ix; x1 -= w * ix; y0 += h * iy; y1 -= h * iy;
        const onScreen = x1 > 0 && x0 < 1080 && y1 > 0 && y0 < 1920;
        if (!onScreen) continue;
        const bad = x0 < 80 || x1 > 900 || y0 < 260 || y1 > 1500;
        rows.push([f, name, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), bad ? 1 : 0, Math.round(w), Math.round(h)]);
      }
    }
  }
  return rows;
}, Number(nArg || 1263));
fs.writeFileSync(out, JSON.stringify(res));
// summary per object: frame ranges visible and frames outside the zone (with extreme bounds)
const by = {};
for (const [f, n, x0, y0, x1, y1, bad, w, h] of res) {
  const o = by[n] || (by[n] = { first: f, last: f, n: 0, bad: [], minX: 1e9, minY: 1e9, maxX: -1e9, maxY: -1e9, minW: 1e9 });
  o.last = f; o.n++; o.minW = Math.min(o.minW, w);
  if (bad) { o.bad.push(f); o.minX = Math.min(o.minX, x0); o.minY = Math.min(o.minY, y0); o.maxX = Math.max(o.maxX, x1); o.maxY = Math.max(o.maxY, y1); }
}
const ranges = (a) => { const r = []; for (const f of a) { if (r.length && r[r.length - 1][1] === f - 1) r[r.length - 1][1] = f; else r.push([f, f]); } return r.map(([a, b]) => a === b ? `${a}` : `${a}-${b}`).join(','); };
for (const [n, o] of Object.entries(by)) console.log(n.padEnd(11), `vis ${o.first}-${o.last} (${o.n})`, o.bad.length ? `OUT ${o.bad.length}: ${ranges(o.bad)} ext x ${o.minX}..${o.maxX} y ${o.minY}..${o.maxY}` : 'ok');
await b.close();
