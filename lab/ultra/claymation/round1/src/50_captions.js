// ---------- 50_captions.js: the captions are clay letters (Titan One outlines, extruded, bevelled, lumpy) ----------
// Every word is the script word from captions.json, shown from its spoken start frame. Layout stays inside x 80..900, y 260..1500.
const CAPS = (() => {
  const S = 1 / 1000; // font units -> em
  const EMPH = new Set([6, 7, 14, 16, 25, 30, 32, 39, 40, 44, 47, 52, 53, 65, 67, 68, 88]);
  // [first, last, size(em px), yCenter?]
  const GROUPS = [
    [0, 4, 96], [5, 7, 96], [8, 9, 104],
    [10, 11, 100], [12, 14, 100], [15, 17, 100], [18, 20, 100],
    [21, 22, 112], [23, 25, 100],
    [26, 27, 112], [28, 30, 100], [31, 34, 100],
    [35, 36, 100], [37, 38, 100], [39, 40, 150],
    [41, 42, 112], [43, 44, 110], [45, 46, 100], [47, 48, 100], [49, 51, 100], [52, 53, 130],
    [54, 55, 112], [56, 57, 104], [58, 60, 100], [61, 63, 96], [64, 65, 104],
    [66, 67, 112], [68, 71, 96], [72, 74, 96],
    [75, 77, 96], [78, 80, 96], [81, 83, 92], [84, 85, 92], [86, 88, 92],
  ];
  const glyphGeo = {};
  let scene, camera, light, M = {}, groups = [], shadowPlane;
  const X0 = 80, X1 = 900, XC = 490, MAXW = 790;
  let yCenter = 1300;

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
  const TRACK = 38;
  function wordWidth(text) { let w = 0; for (let i = 0; i < text.length; i++) { w += adv(text[i]); if (i + 1 < text.length) w += kern(text[i], text[i + 1]) + TRACK; } return w * S; }

  function init(renderer) {
    scene = new THREE.Scene();
    const D = 960 / Math.tan(THREE.MathUtils.degToRad(10));
    camera = new THREE.PerspectiveCamera(20, 1080 / 1920, D - 1500, D + 1500);
    camera.position.set(540, -960, D); camera.lookAt(540, -960, 0); camera.updateMatrixWorld();
    scene.add(new THREE.HemisphereLight(0xc9d4ff, 0x4a3426, 1.05));
    light = new THREE.DirectionalLight(0xffe2bd, 2.5);
    light.position.set(540 - 1400, -1300 + 1800, 2600); light.target.position.set(540, -1300, 0);
    light.castShadow = true; light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 1500, far: 5500 });
    light.shadow.bias = -0.0005; light.shadow.radius = 3;
    scene.add(light, light.target);
    const rim = new THREE.DirectionalLight(0x9db6ff, 1.2); rim.position.set(540 + 900, -960 + 1500, -600); scene.add(rim);
    shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1400, 2200), new THREE.ShadowMaterial({ opacity: 0.55, color: 0x05040a }));
    shadowPlane.position.set(540, -960, -70); shadowPlane.receiveShadow = true; scene.add(shadowPlane);
    const o = { rough: 0.62, print: 3.2, printScale: 1 / 5200, rim: 0.32, depth: false, sheen: 0.06 };
    M.paper = CLAY.mat('#f1e9d8', { ...o, seed: 0.21 });
    M.amber = CLAY.mat('#f7b733', { ...o, seed: 0.63, emissive: '#2a1a00' });
    // build groups
    for (const [a, b, size, yc] of GROUPS) {
      const gp = { a, b, size, yc, words: [] };
      const sc = size * S;
      const spaceW = size * 0.56;
      // balanced wrap: fewest rows, then the most even split
      const items = []; for (let i = a; i <= b; i++) { const w = WORDS[i].text; items.push({ i, w, ww: wordWidth(w) * size }); }
      const widthOf = (arr) => arr.reduce((s, x) => s + x.ww, 0) + spaceW * Math.max(0, arr.length - 1);
      let rows = null;
      for (let nr = 1; nr <= 4 && !rows; nr++) {
        // try every split into nr rows, keep the one with the smallest max width
        let best = null;
        const rec = (start, left, acc) => {
          if (left === 1) { const r = items.slice(start); if (!r.length) return; const all = [...acc, r]; const mx = Math.max(...all.map(widthOf)); if (mx <= MAXW && (!best || mx < best.mx)) best = { mx, all }; return; }
          for (let e = start + 1; e < items.length; e++) { if (items[e - 1].i === 87 && items[e].i === 88) continue; rec(e, left - 1, [...acc, items.slice(start, e)]); }
        };
        rec(0, nr, []);
        if (best) rows = best.all;
      }
      if (!rows) rows = items.map((x) => [x]);
      // "Downlink Cat." stays on one line
      rows = rows.filter((r) => r.length);
      // keep "Downlink Cat." together
      const lh = size * 1.1;
      gp.h = rows.length * lh;
      rows.forEach((row, r) => {
        const total = row.reduce((s, x) => s + x.ww, 0) + spaceW * (row.length - 1);
        let x = XC - total / 2;
        for (const it of row) {
          const g = new THREE.Group();
          const m = EMPH.has(it.i) ? M.amber : M.paper;
          let cx = 0;
          const text = it.w;
          for (let k = 0; k < text.length; k++) {
            const ch = text[k], geo = geoFor(ch);
            if (geo) {
              const lm = new THREE.Mesh(geo, m); lm.castShadow = true;
              lm.position.set(cx, 0, 0); lm.scale.setScalar(sc);
              lm.userData = { r0: U.hashS(it.i * 50 + k, 1) * 0.035, y0: U.hashS(it.i * 50 + k, 2) * 0.02 * size, k };
              g.add(lm);
            }
            cx += (adv(ch) + (k + 1 < text.length ? kern(ch, text[k + 1]) + TRACK : 0)) * sc;
          }
          g.userData = { i: it.i, x, row: r, w: it.ww, lh };
          g.visible = false;
          scene.add(g);
          gp.words.push(g);
          x += it.ww + spaceW;
        }
      });
      gp.rows = rows.length; gp.lh = lh;
      groups.push(gp);
    }
  }

  // pop frames (on twos): scale, stretch y, drop offset
  const POP = [[0.55, 1.3, -0.28], [1.16, 0.8, 0.05], [0.95, 1.06, -0.02], [1.02, 0.98, 0], [1, 1, 0]];
  function update(t, opts = {}) {
    yCenter = opts.y ?? 1300;
    const pi = U.poseIndex(t);
    let active = -1;
    for (let gi = 0; gi < groups.length; gi++) if (t >= WORDS[groups[gi].a].start - 1e-4) active = gi;
    let box = null;
    groups.forEach((gp, gi) => {
      const on = gi === active && !(opts.hideAfter !== undefined && t > opts.hideAfter);
      const yc = gp.yc ?? yCenter;
      const top = yc - gp.h / 2;
      let anyOn = false;
      for (const g of gp.words) {
        const w = WORDS[g.userData.i];
        const ta = t - w.start;
        if (!on || ta < -1e-4) { g.visible = false; continue; }
        anyOn = true;
        g.visible = true;
        const f = Math.floor(Math.max(0, ta) * 15 + 1e-6);
        const [s, sy, dy] = POP[Math.min(POP.length - 1, f)];
        const baseY = top + g.userData.row * gp.lh + gp.size * 0.86;
        const cxw = g.userData.x + g.userData.w / 2;
        // squash about the baseline centre of the word
        g.position.set(cxw, -(baseY + dy * gp.size), 0);
        let sx = s * (1 + (1 - sy) * 0.6);
        const room = Math.min(cxw - 92, 888 - cxw);
        sx = Math.min(sx, Math.max(0.5, room / (g.userData.w / 2 + gp.size * 0.06)));
        g.scale.set(sx, s * sy, s);
        for (const lm of g.children) {
          const j = U.hashS(pi * 7 + lm.userData.k, g.userData.i) * 0.012;
          lm.rotation.z = lm.userData.r0 + j;
          lm.position.y = lm.userData.y0 + U.hashS(pi * 3 + lm.userData.k, g.userData.i + 9) * gp.size * 0.006;
        }
        // children were laid out from x = 0 at the word's left edge: shift so the group origin is the word centre
        for (const lm of g.children) lm.position.x = lm.userData.x0 ?? (lm.userData.x0 = lm.position.x - g.userData.w / 2);
      }
      if (anyOn) box = [XC - MAXW / 2, top, MAXW, gp.h];
    });
    return box;
  }
  function render(renderer) {
    renderer.setRenderTarget(null);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(scene, camera);
    renderer.autoClear = true;
  }
  return { init, update, render, GROUPS, geoFor, EMPH, get camera() { return camera; }, get groups() { return groups; } };
})();
