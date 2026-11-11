// ---------- 50_captions.js: the captions are clay letters pressed onto a dark clay plaque ----------
// Every word is the script word from captions.json, shown from its spoken start frame.
// Round 2: one fixed plaque (x 92..888, y 1158..1478), so the captions never move, never sit on the set,
// and always have a dark backing. The plaque also carries the credit line (HTML, see 90_main.js)
// and the four STEP beads (the heist meter).
const CAPS = (() => {
  const S = 1 / 1000; // font units -> em
  const EMPH = new Set([6, 7, 14, 16, 25, 30, 32, 39, 40, 44, 47, 52, 53, 65, 67, 68, 88]);
  const GROUPS = [
    [0, 4], [5, 7], [8, 9],
    [10, 11], [12, 14], [15, 17], [18, 20],
    [21, 22], [23, 25],
    [26, 27], [28, 30], [31, 34],
    [35, 36], [37, 38], [39, 40],
    [41, 42], [43, 44], [45, 46], [47, 48], [49, 51], [52, 53],
    [54, 55], [56, 57], [58, 60], [61, 63], [64, 65],
    [66, 67], [68, 71], [72, 74],
    [75, 77], [78, 80], [81, 83], [84, 85], [86, 88],
  ];
  const SLAB = { x0: 92, x1: 888, y0: 1158, y1: 1478, r: 40 };
  const TEXT = { y0: 1176, y1: 1404 };           // the rows live here; the credit line sits below (y 1408..1470)
  const BASE = 84, NUMK = 1.26, MAXW = 716, XC = 490;
  const isNum = (w) => /^\d/.test(w);
  const glyphGeo = {};
  let scene, camera, light, M = {}, groups = [], slab, pips = [], deco = [];

  function geoFor(ch) {
    if (glyphGeo[ch] !== undefined) return glyphGeo[ch];
    const g = GLYPHS.glyphs[ch];
    if (!g || !g.c.length) { glyphGeo[ch] = null; return null; }
    const sp = new THREE.ShapePath();
    for (const c of g.c) {
      if (c[0] === 'M') sp.moveTo(c[1], c[2]);
      else if (c[0] === 'L') sp.lineTo(c[1], c[2]);
      else if (c[0] === 'Q') sp.quadraticCurveTo(c[1], c[2], c[3], c[4]);
      else if (c[0] === 'C') sp.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
    }
    const shapes = sp.toShapes(false);
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 150, bevelEnabled: true, bevelThickness: 55, bevelSize: 30, bevelSegments: 4, curveSegments: 7 });
    CLAY.lump(geo, 9, 0.004, ch.charCodeAt(0) * 0.37, 2);
    glyphGeo[ch] = geo;
    return geo;
  }
  const adv = (ch) => (GLYPHS.glyphs[ch] ? GLYPHS.glyphs[ch].a : 300);
  const kern = (a, b) => GLYPHS.kern[a + b] || 0;
  const TRACK = 34;
  function wordWidth(text) { let w = 0; for (let i = 0; i < text.length; i++) { w += adv(text[i]); if (i + 1 < text.length) w += kern(text[i], text[i + 1]) + TRACK; } return w * S; }

  // rounded rectangle path (px, y down) -> THREE.Shape in scene units (y up)
  function rrShape(x0, y0, x1, y1, r) {
    const s = new THREE.Shape();
    s.moveTo(x0 + r, -y0); s.lineTo(x1 - r, -y0); s.quadraticCurveTo(x1, -y0, x1, -y0 - r);
    s.lineTo(x1, -y1 + r); s.quadraticCurveTo(x1, -y1, x1 - r, -y1);
    s.lineTo(x0 + r, -y1); s.quadraticCurveTo(x0, -y1, x0, -y1 + r);
    s.lineTo(x0, -y0 - r); s.quadraticCurveTo(x0, -y0, x0 + r, -y0);
    return s;
  }
  function rrPoints(x0, y0, x1, y1, r, z, n = 10) {
    const pts = [], arc = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, -(cy - Math.sin(a) * r), z)); } };
    arc(x1 - r, y0 + r, 0); arc(x0 + r, y0 + r, Math.PI / 2); arc(x0 + r, y1 - r, Math.PI); arc(x1 - r, y1 - r, Math.PI * 1.5);
    return pts;
  }

  function init(renderer) {
    scene = new THREE.Scene();
    const D = 960 / Math.tan(THREE.MathUtils.degToRad(10));
    camera = new THREE.PerspectiveCamera(20, 1080 / 1920, D - 1500, D + 1500);
    camera.position.set(540, -960, D); camera.lookAt(540, -960, 0); camera.updateMatrixWorld();
    scene.add(new THREE.HemisphereLight(0xd6deff, 0x4a3426, 1.0));
    light = new THREE.DirectionalLight(0xffe6c4, 2.6);
    light.position.set(540 - 700, -1318 + 900, 2600); light.target.position.set(490, -1318, 0);
    light.castShadow = true; light.shadow.mapSize.set(2048, 1024);
    Object.assign(light.shadow.camera, { left: -460, right: 460, top: 230, bottom: -230, near: 1800, far: 4200 });
    light.shadow.bias = -0.0006; light.shadow.radius = 2.5;
    scene.add(light, light.target);
    const rim = new THREE.DirectionalLight(0xa9bfff, 0.9); rim.position.set(540 + 900, -960 + 1500, -200); scene.add(rim);
    const o = { rough: 0.6, print: 3.6, printScale: 1 / 4200, rim: 0.28, depth: false, sheen: 0.05, printK: 1, mottle: 0.04, mottleF: 1 / 900 };
    M.paper = CLAY.mat('#f4ecdc', { ...o, seed: 0.21 });
    M.amber = CLAY.mat('#f7b733', { ...o, seed: 0.63, emissive: '#2a1a00' });
    // ---- the plaque: dark plum clay, lumpy, fingerprinted, with an amber clay bead around its edge ----
    const { x0, y0, x1, y1, r } = SLAB;
    const sg = new THREE.ExtrudeGeometry(rrShape(x0, y0, x1, y1, r), { depth: 22, bevelEnabled: true, bevelThickness: 10, bevelSize: 9, bevelSegments: 4, curveSegments: 10, steps: 1 });
    // subdivide-free lumps: displace the bevel ring (enough vertices on the rounded edge)
    CLAY.lump(sg, 3.2, 0.012, 7.7, 2);
    M.slab = CLAY.mat('#221d2b', { rough: 0.82, print: 2.6, printScale: 1 / 520, rim: 0.16, sheen: 0.03, depth: false, seed: 0.47, mottle: 0.16, mottleF: 1 / 140, printK: 1 });
    slab = new THREE.Mesh(sg, M.slab); slab.receiveShadow = true; slab.castShadow = false;
    scene.add(slab);
    const bead = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rrPoints(x0 + 7, y0 + 7, x1 - 7, y1 - 7, r - 7, 33), true, 'centripetal'), 260, 4.2, 8, true);
    CLAY.lump(bead, 0.9, 0.05, 3.1, 2);
    const beadM = new THREE.Mesh(bead, M.amber); beadM.castShadow = true; beadM.receiveShadow = true; scene.add(beadM);
    deco = [slab, beadM];
    // ---- the heist meter: four clay beads at the plaque's bottom right ----
    M.pipOff = CLAY.mat('#4b4456', { rough: 0.7, print: 1.2, printScale: 1 / 90, rim: 0.2, depth: false, seed: 0.9, printK: 1, mottle: 0 });
    for (let k = 0; k < 4; k++) {
      const g = CLAY.lump(new THREE.SphereGeometry(13, 20, 14), 0.8, 0.09, 30 + k, 2); g.scale(1, 1, 0.7);
      const m = new THREE.Mesh(g, M.pipOff); m.castShadow = true; m.position.set(742 + k * 38, -1440, 40); m.visible = false; scene.add(m); pips.push(m);
    }
    // ---- caption groups: balanced 1 or 2 rows, centred in the text area ----
    for (const [a, b] of GROUPS) {
      const gp = { a, b, words: [] };
      // fewest rows (at most 2); if two rows do not fit, shrink the group a little until they do
      let items, rows = null, spaceW;
      for (let fk = 1; fk >= 0.7 && !rows; fk -= 0.04) {
        items = [];
        for (let i = a; i <= b; i++) { const w = WORDS[i].text, size = BASE * fk * (isNum(w) ? NUMK : 1); items.push({ i, w, size, ww: wordWidth(w) * size }); }
        spaceW = BASE * fk * 0.5;
        const widthOf = (arr) => arr.reduce((s, x) => s + x.ww, 0) + spaceW * Math.max(0, arr.length - 1);
        for (let nr = 1; nr <= 2 && !rows; nr++) {
          let best = null;
          const rec = (start, left, acc) => {
            if (left === 1) { const rr = items.slice(start); if (!rr.length) return; const all = [...acc, rr]; const mx = Math.max(...all.map(widthOf)); if (mx <= MAXW && (!best || mx < best.mx)) best = { mx, all }; return; }
            for (let e = start + 1; e < items.length; e++) { if (items[e - 1].i === 87 && items[e].i === 88) continue; rec(e, left - 1, [...acc, items.slice(start, e)]); }
          };
          rec(0, nr, []);
          if (best) rows = best.all;
        }
      }
      if (!rows) rows = [items];
      const widthOf = (arr) => arr.reduce((s, x) => s + x.ww, 0) + spaceW * Math.max(0, arr.length - 1);
      const rh = rows.map((row) => Math.max(...row.map((x) => x.size)) * 1.12);
      const H = rh.reduce((s, x) => s + x, 0);
      let yTop = (TEXT.y0 + TEXT.y1) / 2 - H / 2;
      rows.forEach((row, ri) => {
        const total = widthOf(row);
        let x = XC - total / 2;
        const base = yTop + rh[ri] * 0.83;   // baseline
        for (const it of row) {
          const g = new THREE.Group();
          const m = EMPH.has(it.i) || isNum(it.w) ? M.amber : M.paper;
          const sc = it.size * S;
          let cx = 0;
          for (let k = 0; k < it.w.length; k++) {
            const ch = it.w[k], geo = geoFor(ch);
            if (geo) {
              const lm = new THREE.Mesh(geo, m); lm.castShadow = true;
              lm.position.set(cx - it.ww / 2, 0, 0); lm.scale.setScalar(sc);
              lm.userData = { r0: U.hashS(it.i * 50 + k, 1) * 0.03, y0: U.hashS(it.i * 50 + k, 2) * 0.015 * it.size, x0: cx - it.ww / 2, k };
              g.add(lm);
            }
            cx += (adv(ch) + (k + 1 < it.w.length ? kern(ch, it.w[k + 1]) + TRACK : 0)) * sc;
          }
          g.userData = { i: it.i, cx: x + it.ww / 2, base, size: it.size, w: it.ww };
          g.visible = false;
          scene.add(g);
          gp.words.push(g);
          x += it.ww + spaceW;
        }
        yTop += rh[ri];
      });
      groups.push(gp);
    }
  }

  // pop frames (on twos): scale, stretch y, drop offset (in em). The first frame is already 88% size.
  const POP = [[0.88, 1.13, -0.07], [1.07, 0.93, 0.02], [0.98, 1.02, 0], [1, 1, 0]];
  // opts: { show: bool (plaque on), step: 0..4 (heist meter, 0 = hidden), stepT: time the current step began }
  function update(t, opts = {}) {
    const pi = U.poseIndex(t);
    let active = -1;
    for (let gi = 0; gi < groups.length; gi++) if (t >= WORDS[groups[gi].a].start - 1e-4) active = gi;
    // plaque: pops in on twos just before the first word, then stays fixed
    const on = opts.show !== false;
    const ps = on ? SET.popScale(t, 0.06) : 0;
    const cx = 490, cy = -(SLAB.y0 + SLAB.y1) / 2;
    for (const c of deco) {
      c.visible = ps > 0.01;
      c.scale.set(ps < 1 ? 0.6 + 0.4 * ps : 1, ps, 1);
      c.position.set(cx * (1 - c.scale.x), cy * (1 - c.scale.y), 0);
    }
    groups.forEach((gp, gi) => {
      const gon = gi === active && on;
      for (const g of gp.words) {
        const w = WORDS[g.userData.i];
        const ta = t - w.start;
        if (!gon || ta < -1e-4) { g.visible = false; continue; }
        g.visible = true;
        const f = Math.floor(Math.max(0, ta) * 15 + 1e-6);
        const [s, syy, dy] = POP[Math.min(POP.length - 1, f)];
        g.position.set(g.userData.cx, -(g.userData.base + dy * g.userData.size), 34);
        g.scale.set(s * (1 + (1 - syy) * 0.5), s * syy, s);
        for (const lm of g.children) {
          const j = U.hashS(pi * 7 + lm.userData.k, g.userData.i) * 0.01;
          lm.rotation.z = lm.userData.r0 + j;
          lm.position.y = lm.userData.y0 + U.hashS(pi * 3 + lm.userData.k, g.userData.i + 9) * g.userData.size * 0.005;
        }
      }
    });
    // heist meter
    const step = opts.step || 0;
    pips.forEach((p, k) => {
      p.visible = step > 0 && on;
      const done = k < step, cur = k === step - 1;
      p.material = done ? M.amber : M.pipOff;
      let s = 1;
      if (cur) { const f = Math.floor(Math.max(0, t - (opts.stepT ?? 0)) * 15 + 1e-6); s = [0.5, 1.45, 1.15, 1.3, 1.22, 1.25][Math.min(5, f)]; }
      p.scale.set(s, s, s);
      p.position.z = 40 + (cur ? 6 : 0);
    });
    return on ? SLAB : null;
  }
  function render(renderer) {
    renderer.setRenderTarget(null);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(scene, camera);
    renderer.autoClear = true;
  }
  return { init, update, render, GROUPS, geoFor, EMPH, SLAB, get camera() { return camera; }, get groups() { return groups; } };
})();
