// ---------- 41_craft.js: clay illustrations of the H3 rocket, MMX, the rover, the capsule, Electron and small props ----------
// All are deliberately simplified toys (no logos, no engineering detail): they are labelled "Illustration" on screen.
const CRAFT = (() => {
  const { add, grp } = SET;
  const L = (g, a, f, s) => CLAY.lump(g, a, f, s, 2);
  const M = () => SET.mats();
  const panelTex = (() => {
    let tex;
    return () => {
      if (tex) return tex;
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
      const g = cv.getContext('2d'); g.fillStyle = '#26407e'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#7f97cf'; g.lineWidth = 5;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
      tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      return tex;
    };
  })();
  let PANEL;
  const panelMat = () => (PANEL = PANEL || CLAY.mat('#ffffff', { map: panelTex(), rough: 0.6, print: 0.006, printScale: 0.3, rim: 0.15 }));

  function h3() {
    const m = M(), root = new THREE.Group(), body = grp(root);
    add(body, L(new THREE.CylinderGeometry(0.82, 0.82, 7.6, 32, 8), 0.025, 0.9, 1), m.white, [0, 4.6, 0]);
    // long fairing (ogive)
    const prof = []; for (let i = 0; i <= 14; i++) { const u = i / 14; prof.push(new THREE.Vector2(0.9 * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.4))) + 0.001, u * 3.6)); }
    prof.unshift(new THREE.Vector2(0.001, 0));
    add(body, L(new THREE.LatheGeometry(prof, 32), 0.02, 1, 2), m.white, [0, 8.4, 0]);
    add(body, L(new THREE.CylinderGeometry(0.84, 0.84, 0.35, 32, 1), 0.01, 2, 3), m.grey, [0, 8.25, 0]);
    // four strap-on boosters (H3-24L has four)
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 1.18, z = Math.sin(a) * 1.18;
      add(body, L(new THREE.CylinderGeometry(0.36, 0.36, 3.6, 18, 4), 0.02, 1.2, 4 + k), m.white, [x, 2.6, z]);
      add(body, L(new THREE.ConeGeometry(0.36, 0.9, 18, 2), 0.01, 1.4, 9 + k), m.grey, [x, 4.85, z]);
      add(body, new THREE.CylinderGeometry(0.22, 0.32, 0.4, 14), m.dark, [x, 0.62, z]);
    }
    add(body, new THREE.CylinderGeometry(0.3, 0.45, 0.6, 16), m.dark, [-0.32, 0.55, 0]);
    add(body, new THREE.CylinderGeometry(0.3, 0.45, 0.6, 16), m.dark, [0.32, 0.55, 0]);
    // flame (hidden until ignition)
    const flame = grp(root, [0, 0.3, 0]);
    const fo = L(new THREE.ConeGeometry(1.2, 4.2, 20, 4), 0.08, 1.2, 21); fo.rotateX(Math.PI); fo.translate(0, -2.0, 0);
    const fy = L(new THREE.ConeGeometry(0.7, 2.8, 18, 3), 0.05, 1.4, 22); fy.rotateX(Math.PI); fy.translate(0, -1.3, 0);
    add(flame, fo, m.flameO, null, null, null, false); add(flame, fy, m.flameY, null, null, null, false);
    root.userData = { body, flame };
    return root;
  }
  function pad() {
    const m = M(), root = new THREE.Group();
    add(root, L(new THREE.CylinderGeometry(4.2, 4.6, 0.8, 40, 2), 0.06, 0.5, 31), m.grey, [0, 0.4, 0]);
    add(root, L(new THREE.CylinderGeometry(1.6, 1.8, 0.5, 30, 1), 0.03, 0.8, 32), m.dark, [0, 1.0, 0]);
    // service tower (simple clay column with arms)
    add(root, L(new THREE.BoxGeometry(0.9, 11, 0.9, 2, 12, 2), 0.04, 0.8, 33), m.red, [-3.0, 6.3, -0.6]);
    for (let i = 0; i < 5; i++) add(root, new THREE.BoxGeometry(1.1, 0.12, 1.1), m.white, [-3.0, 2.2 + i * 2, -0.6]);
    add(root, L(new THREE.BoxGeometry(1.6, 0.3, 0.4, 3, 1, 1), 0.02, 1, 34), m.red, [-2.0, 8.6, -0.6]);
    return root;
  }
  function mmx(s = 1) {
    const m = M(), root = new THREE.Group(), b = grp(root);
    const gold = CLAY.mat('#d8a648', { rough: 0.55, metal: 0.15, print: 0.016, printScale: 0.35, rim: 0.2, seed: 0.33 });
    add(b, L(new THREE.BoxGeometry(2.6, 2.0, 2.1, 6, 5, 5), 0.06, 0.9, 41), gold, [0, 0, 0]);
    add(b, L(new THREE.CylinderGeometry(0.85, 0.95, 0.9, 28, 2), 0.03, 1.2, 42), m.white, [0, 1.45, 0]);         // return module
    add(b, L(new THREE.CylinderGeometry(0.55, 0.85, 0.35, 28, 1), 0.02, 1.2, 43), m.dark, [0, 2.05, 0]);         // its heat-shielded top
    // dish on a stalk
    const dish = grp(b, [1.0, 1.15, -0.6]); dish.rotation.set(-0.5, 0, 0.4);
    add(dish, new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), m.grey, [0, 0.3, 0]);
    const dg = new THREE.SphereGeometry(0.75, 24, 8, 0, Math.PI * 2, 0, 0.9); dg.scale(1, 0.45, 1); dg.rotateX(Math.PI);
    add(dish, L(dg, 0.01, 2, 44), m.white, [0, 0.95, 0], null, null);
    // solar wings
    const pm = panelMat();
    for (const sx of [-1, 1]) {
      const w = grp(b, [sx * 1.3, 0.2, 0]); w.userData.sx = sx;
      add(w, new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), m.grey, [sx * 0.4, 0, 0], [0, 0, Math.PI / 2]);
      for (let k = 0; k < 3; k++) add(w, L(new THREE.BoxGeometry(1.25, 0.1, 1.55, 3, 1, 3), 0.015, 1.5, 45 + k), pm, [sx * (1.45 + k * 1.33), 0, 0]);
      b.userData['wing' + sx] = w;
    }
    // four legs
    const legs = grp(b, [0, -1.0, 0]);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const lg = grp(legs, [x * 1.1, 0, z * 0.9]);
      lg.rotation.set(z * 0.42, 0, -x * 0.42);
      add(lg, new THREE.CylinderGeometry(0.09, 0.09, 1.6, 8), m.grey, [0, -0.8, 0]);
      add(lg, L(new THREE.CylinderGeometry(0.32, 0.36, 0.12, 16), 0.01, 2, 49), m.grey, [0, -1.62, 0], [-z * 0.42, 0, x * 0.42]);
    }
    // sampler arm (folded) with the corer tube
    const arm = grp(b, [-0.9, -0.85, 1.0]);
    const a1 = grp(arm); add(a1, new THREE.CylinderGeometry(0.11, 0.11, 1.3, 10), m.white, [0, -0.65, 0]);
    const a2 = grp(a1, [0, -1.3, 0]); add(a2, new THREE.CylinderGeometry(0.1, 0.1, 1.1, 10), m.white, [0, -0.55, 0]);
    const corer = grp(a2, [0, -1.1, 0]); add(corer, L(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 14, 2), 0.01, 3, 50), m.amber, [0, -0.3, 0]);
    // gas sampler nozzle on a leg
    const noz = add(b, new THREE.CylinderGeometry(0.14, 0.22, 0.4, 12), m.amber, [1.25, -1.9, 0.95]);
    // main engine
    add(b, new THREE.CylinderGeometry(0.3, 0.55, 0.7, 18), m.dark, [0, 0, -1.35], [Math.PI / 2, 0, 0]);
    const flame = grp(b, [0, 0, -1.7]); flame.rotation.x = -Math.PI / 2;
    const fo = L(new THREE.ConeGeometry(0.75, 3.2, 18, 3), 0.06, 1.2, 51); fo.rotateX(Math.PI); fo.translate(0, -1.6, 0);
    const fy = L(new THREE.ConeGeometry(0.42, 2.0, 16, 3), 0.04, 1.4, 52); fy.rotateX(Math.PI); fy.translate(0, -1.0, 0);
    add(flame, fo, m.flameO, null, null, null, false); add(flame, fy, m.flameY, null, null, null, false);
    flame.visible = false;
    root.scale.setScalar(s);
    root.userData = { b, arm, a1, a2, corer, flame, noz, legs };
    return root;
  }
  function rover() {
    const m = M(), root = new THREE.Group(), b = grp(root, [0, 0.42, 0]);
    add(b, L(new THREE.BoxGeometry(1.5, 0.55, 1.05, 4, 2, 3), 0.025, 1.4, 61), m.white, [0, 0.3, 0]);
    add(b, L(new THREE.BoxGeometry(1.62, 0.09, 1.18, 3, 1, 3), 0.01, 2, 62), panelMat(), [0, 0.63, 0]);
    const wheels = [];
    for (const [x, z] of [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]]) {
      const w = grp(b, [x, 0.0, z]);
      add(w, L(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 18, 1), 0.015, 2, 63), m.dark, [0, 0, 0], [Math.PI / 2, 0, 0]);
      add(w, new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10), m.grey, [0, 0, 0], [Math.PI / 2, 0, 0]);
      add(w, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), m.grey, [0, 0.25, 0]);
      wheels.push(w);
    }
    const mast = grp(b, [0.45, 0.66, 0.25]);
    add(mast, new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8), m.grey, [0, 0.27, 0]);
    const cam = grp(mast, [0, 0.58, 0]);
    add(cam, new THREE.BoxGeometry(0.34, 0.16, 0.18), m.grey);
    root.userData = { b, wheels, cam };
    return root;
  }
  function capsule() {
    const m = M(), root = new THREE.Group();
    const cap = grp(root);
    const shield = L(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), 0.02, 1.5, 71);
    shield.scale(1, 0.6, 1); shield.translate(0, 0.9, 0);
    add(cap, shield, CLAY.mat('#8c5a33', { rough: 0.8, print: 0.016, printScale: 0.4, rim: 0.2 }), [0, -0.25, 0]);
    add(cap, L(new THREE.CylinderGeometry(0.42, 0.95, 0.75, 28, 2), 0.02, 1.5, 72), m.white, [0, 0.5, 0]);
    add(cap, L(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0.01, 2, 73), m.white, [0, 0.86, 0]);
    // parachute
    const chute = grp(root, [0, 4.8, 0]);
    const cg = new THREE.SphereGeometry(2.4, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.42);
    SET.colorGeo(cg, (x, y, z, c) => { const g = Math.floor(((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * 12); c.set(g % 2 ? '#f1e8d8' : '#e8762e'); });
    CLAY.lump(cg, 0.04, 1, 74, 2);
    cg.translate(0, -1.6, 0);
    const cm = CLAY.mat('#ffffff', { vcol: true, rough: 0.85, print: 0.01, printScale: 0.4, rim: 0.2, side: THREE.DoubleSide });
    add(chute, cg, cm);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, rr = 2.4 * Math.sin(Math.PI * 0.42), yy = 2.4 * Math.cos(Math.PI * 0.42) - 1.6;
      const p0 = new THREE.Vector3(Math.cos(a) * rr, yy, Math.sin(a) * rr), p1 = new THREE.Vector3(0, -3.75, 0);
      const len = p0.distanceTo(p1), mid = p0.clone().add(p1).multiplyScalar(0.5);
      const line = add(chute, new THREE.CylinderGeometry(0.025, 0.025, len, 5), m.white, [mid.x, mid.y, mid.z]);
      line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p0.clone().sub(p1).normalize());
    }
    root.userData = { cap, chute };
    return root;
  }
  function electron() {
    const m = M(), root = new THREE.Group();
    const blk = CLAY.mat('#24232a', { rough: 0.62, print: 0.012, printScale: 0.3, rim: 0.45, seed: 0.21 });
    add(root, L(new THREE.CylinderGeometry(0.5, 0.5, 6.4, 28, 6), 0.02, 1.2, 81), blk, [0, 3.6, 0]);
    const prof = []; for (let i = 0; i <= 12; i++) { const u = i / 12; prof.push(new THREE.Vector2(0.52 * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.2))) + 0.001, u * 2.0)); }
    prof.unshift(new THREE.Vector2(0.001, 0));
    add(root, L(new THREE.LatheGeometry(prof, 28), 0.015, 1.4, 82), blk, [0, 6.8, 0]);
    add(root, new THREE.CylinderGeometry(0.52, 0.52, 0.22, 28), m.white, [0, 6.1, 0]);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; add(root, new THREE.CylinderGeometry(0.1, 0.16, 0.35, 8), m.dark, [Math.cos(a) * 0.25, 0.3, Math.sin(a) * 0.25]); }
    add(root, L(new THREE.CylinderGeometry(2.2, 2.5, 0.5, 30, 1), 0.04, 0.6, 83), m.grey, [0, 0.0, 0]);
    return root;
  }
  function sat(seed = 1) {
    const m = M(), root = new THREE.Group();
    const silver = CLAY.mat('#c9c4bb', { rough: 0.5, metal: 0.2, print: 0.01, printScale: 0.5, rim: 0.2, seed: seed * 0.1 });
    add(root, L(new THREE.BoxGeometry(0.8, 0.8, 0.8, 3, 3, 3), 0.02, 2, 90 + seed), silver, [0, 0.4, 0]);
    add(root, L(new THREE.BoxGeometry(0.06, 0.7, 1.3, 1, 2, 3), 0.01, 2, 95 + seed), panelMat(), [0.46, 0.45, 0], [0, 0, 0.12]);
    add(root, L(new THREE.BoxGeometry(0.06, 0.7, 1.3, 1, 2, 3), 0.01, 2, 99 + seed), panelMat(), [-0.46, 0.45, 0], [0, 0, -0.12]);
    add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), m.grey, [0.1, 1.15, 0.1]);
    add(root, new THREE.SphereGeometry(0.07, 8, 6), m.amber, [0.1, 1.57, 0.1]);
    return root;
  }
  // kitchen scale with a paper dial (two faces: "25 kg" and "15 g")
  function scale() {
    const m = M(), root = new THREE.Group();
    const mint = CLAY.mat('#9fd0c0', { rough: 0.7, print: 0.014, printScale: 0.35, rim: 0.2, seed: 0.44 });
    add(root, L(new THREE.CylinderGeometry(1.7, 1.9, 1.7, 36, 3), 0.04, 0.9, 101), mint, [0, 0.85, 0]);
    add(root, new THREE.CylinderGeometry(0.25, 0.3, 0.3, 12), m.grey, [0, 1.85, 0]);
    const plat = add(root, L(new THREE.CylinderGeometry(1.75, 1.75, 0.16, 36, 1), 0.02, 1.2, 102), m.grey, [0, 2.05, 0]);
    // dial face on the front
    const face = (txt, col) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
      g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3a2f22'; g.lineWidth = 8;
      for (let i = 0; i <= 20; i++) { const a = Math.PI * (0.8 + i / 20 * 1.4); const r0 = i % 5 ? 200 : 180; g.beginPath(); g.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); g.lineTo(256 + Math.cos(a) * 228, 256 + Math.sin(a) * 228); g.stroke(); }
      g.fillStyle = col; g.font = '700 150px Kalam'; g.textAlign = 'center'; g.fillText(txt, 256, 360);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    const dialG = grp(root, [0, 0.95, 1.86]);
    dialG.rotation.x = -0.06;
    add(dialG, new THREE.CylinderGeometry(1.32, 1.32, 0.2, 40), m.white, [0, 0, -0.08], [Math.PI / 2, 0, 0]);
    // round 2: the dial has no number until "15" (the 25 kg is the rover's own luggage tag, its mass)
    const fA = add(dialG, new THREE.CircleGeometry(1.25, 40), CLAY.mat('#ffffff', { map: face('', '#2a2118'), rough: 0.8, print: 0.002, rim: 0.05 }), [0, 0, 0.03]);
    const fB = add(dialG, new THREE.CircleGeometry(1.25, 40), CLAY.mat('#ffffff', { map: face('15 g', '#c07a0a'), rough: 0.8, print: 0.002, rim: 0.05 }), [0, 0, 0.035]);
    add(dialG, L(new THREE.TorusGeometry(1.3, 0.12, 10, 40), 0.01, 2, 103), m.white, [0, 0, 0.02]);
    const needle = grp(dialG, [0, 0, 0.09]);
    add(needle, new THREE.BoxGeometry(0.07, 1.0, 0.04), m.red, [0, 0.5, 0]);
    add(needle, new THREE.SphereGeometry(0.1, 10, 8), m.red);
    root.userData = { fA, fB, needle, plat, dialG };
    return root;
  }
  function jar() {
    const m = M(), root = new THREE.Group();
    const glass = CLAY.mat('#dfe9ff', { transparent: true, opacity: 0.22, rough: 0.08, print: 0.002, rim: 0.9, sheen: 0.0, side: THREE.FrontSide });
    add(root, new THREE.CylinderGeometry(0.9, 0.9, 2.2, 32, 1, true), glass, [0, 1.1, 0], null, null, false);
    add(root, L(new THREE.CylinderGeometry(0.98, 0.98, 0.42, 32, 1), 0.02, 2, 111), m.amber, [0, 2.36, 0]);
    add(root, new THREE.CylinderGeometry(0.9, 0.9, 0.08, 32), m.grey, [0, 0.04, 0]);
    // paper label: at least 10 g
    { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 360; const g = cv.getContext('2d');
      g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, 1024, 360); g.strokeStyle = '#c8392e'; g.lineWidth = 10; g.strokeRect(14, 14, 996, 332);
      g.fillStyle = '#251c14'; g.font = '700 120px Kalam'; g.textAlign = 'center'; g.fillText('at least', 512, 150); g.fillStyle = '#b0680c'; g.font = '700 150px Kalam'; g.fillText('10 g', 512, 300);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      const lg = new THREE.CylinderGeometry(0.915, 0.915, 0.82, 40, 1, true, -0.95, 1.9);
      root.userData.label = add(root, lg, CLAY.mat('#ffffff', { map: tx, rough: 0.9, print: 0.002, rim: 0.05, side: THREE.DoubleSide }), [0, 1.62, 0], null, null, false); }
    // glint stripe
    add(root, new THREE.PlaneGeometry(0.16, 1.8), CLAY.mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.9, transparent: true, opacity: 0.55, print: 0, rim: 0 }), [-0.45, 1.15, 0.79], [0, -0.5, 0], null, false);
    // crumbs (filled from the bottom)
    const crumbs = [];
    const R = U.mulberry32(77);
    const cm = CLAY.mat('#a08a76', { rough: 0.9, print: 0.01, printScale: 0.6, rim: 0.25 });
    for (let i = 0; i < 26; i++) {
      const g = L(new THREE.IcosahedronGeometry(0.16 + R() * 0.12, 1), 0.04, 4, 120 + i);
      const c = add(root, g, cm, [(R() - 0.5) * 1.1, 0.2 + Math.floor(i / 7) * 0.22 + R() * 0.08, (R() - 0.5) * 1.1]);
      c.userData.y0 = c.position.y; crumbs.push(c);
    }
    root.userData = { crumbs };
    return root;
  }
  // a flip calendar on a clay stand: pages [[top, big, colour], ...]; userData.set(k, u) shows page k flipping away by u (0..1)
  function flipCal(pages, w = 4.4, h = 4.8, plinth = 0) {
    const m = M(), outer = new THREE.Group();
    if (plinth > 0) add(outer, L(new THREE.CylinderGeometry(w * 0.5, w * 0.56, plinth, 28, 3), 0.08, 0.5, 130), CLAY.mat('#c79a62', { rough: 0.85, print: 0.01, printScale: 0.3, rim: 0.1, seed: 0.35 }), [0, plinth / 2, 0]);
    const root = grp(outer, [0, plinth, 0]);
    const stand = L(new THREE.BoxGeometry(w + 0.5, 0.7, 2.6, 6, 1, 3), 0.05, 0.6, 131);
    add(root, stand, CLAY.mat('#6b4a8e', { rough: 0.85, print: 0.012, printScale: 0.3, rim: 0.15, seed: 0.31 }), [0, 0.35, 0]);
    const back = L(new THREE.BoxGeometry(w + 0.2, h + 0.3, 0.3, 6, 6, 1), 0.04, 0.6, 132);
    const easel = grp(root, [0, 0.6, -0.4]); easel.rotation.x = -0.18;
    add(easel, back, CLAY.mat('#4d3566', { rough: 0.85, print: 0.012, printScale: 0.3, rim: 0.15, seed: 0.33 }), [0, h / 2, -0.2]);
    // binder rings
    for (const x of [-w * 0.3, w * 0.3]) add(easel, L(new THREE.TorusGeometry(0.28, 0.07, 8, 18), 0.005, 3, 133), m.brass, [x, h + 0.05, 0.05], [0, Math.PI / 2, 0]);
    const tex = pages.map(([top, big, col]) => {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 560; const g = cv.getContext('2d');
      g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, 512, 560);
      for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(120,95,60,${(U.hashU(i * 7 + big.length) * 0.06).toFixed(3)})`; g.fillRect(U.hashU(i * 3) * 512, U.hashU(i * 5 + 1) * 560, 2, 1); }
      g.fillStyle = col || '#c8392e'; g.fillRect(0, 0, 512, 160);
      g.fillStyle = '#f4ecd8'; g.font = '700 118px Kalam'; g.textAlign = 'center'; g.fillText(top, 256, 128);
      g.fillStyle = '#251c14'; let fs = 230; g.font = `700 ${fs}px Kalam`; while (g.measureText(big).width > 470) { fs -= 6; g.font = `700 ${fs}px Kalam`; }
      g.fillText(big, 256, 420);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    });
    const pgGeo = new THREE.PlaneGeometry(w, h, 6, 6); pgGeo.translate(0, -h / 2, 0);
    { const pp = pgGeo.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, -Math.pow((pp.getY(i) + h) / h, 2) * 0.08); pgGeo.computeVertexNormals(); }
    const mats = tex.map((t) => CLAY.mat('#ffffff', { map: t, rough: 0.9, print: 0.002, rim: 0.06, sheen: 0.1 }));
    const under = add(easel, pgGeo, mats[0], [0, h, 0.02]);   // the page underneath
    const hinge = grp(easel, [0, h, 0.06]);                     // the page that flips up and over
    const top = add(hinge, pgGeo, mats[0]);
    // the back of the flipping page is plain paper
    const backGeo = pgGeo.clone(); backGeo.rotateY(Math.PI);
    add(hinge, backGeo, CLAY.mat('#ece2cc', { rough: 0.9, print: 0.003, printScale: 0.6, rim: 0.06, sheen: 0.1 }), [0, 0, -0.005]);
    outer.userData = {
      n: pages.length,
      set(k, u) {
        k = Math.max(0, Math.min(pages.length - 1, k));
        top.material = mats[k]; under.material = mats[Math.min(pages.length - 1, k + 1)];
        hinge.rotation.x = -Math.PI * 0.95 * u;
        hinge.visible = true; under.visible = u > 0 || k + 1 >= pages.length ? true : true;
        if (k + 1 >= pages.length) { under.material = mats[k]; }
      },
    };
    outer.userData.set(0, 0);
    return outer;
  }
  // a pool of cotton-wool puffs, animated on twos: list of {t0, p:[x,y,z], v:[x,y,z], s0, s1, grow}
  function puffs(n = 24, seed = 3) {
    const m = M(), root = new THREE.Group(), list = [];
    for (let i = 0; i < n; i++) {
      const g = CLAY.lump(new THREE.IcosahedronGeometry(1, 3), 0.42, 2.3, seed * 31 + i, 3);
      g.scale(1 + U.hashU(seed * 7 + i) * 0.35, 0.8 + U.hashU(seed * 11 + i) * 0.25, 1 + U.hashU(seed * 13 + i) * 0.3);
      const mesh = add(root, g, m.cotton); mesh.visible = false; list.push(mesh);
    }
    root.userData = { list, spec: [] };
    return root;
  }
  function updatePuffs(root, t) {
    const { list, spec } = root.userData, tp = U.twos(t);
    list.forEach((mesh, i) => {
      const s = spec[i];
      if (!s || tp < s.t0) { mesh.visible = false; return; }
      const a = tp - s.t0, k = 1 - Math.exp(-a * (s.k ?? 1.6));
      mesh.visible = true;
      mesh.position.set(s.p[0] + s.v[0] * k, s.p[1] + s.v[1] * k, s.p[2] + s.v[2] * k);
      const sc = U.lerp(s.s0, s.s1, U.ease.out(U.clamp(a / (s.grow ?? 0.8), 0, 1)));
      mesh.scale.setScalar(sc * (1 + 0.03 * U.hashS(U.poseIndex(t), i)));
      mesh.rotation.set(i * 1.3 + a * 0.3, i * 0.7, 0);
    });
  }
  function flameWobble(flame, t, on, size = 1) {
    flame.visible = on > 0.01;
    if (!flame.visible) return;
    const pi = U.poseIndex(t);
    flame.scale.set(size * on * (0.9 + 0.12 * U.hashU(pi * 3 + 1)), size * on * (0.85 + 0.35 * U.hashU(pi * 3 + 2)), size * on * (0.9 + 0.12 * U.hashU(pi * 3 + 3)));
    flame.children[1].scale.y = 0.8 + 0.4 * U.hashU(pi * 5 + 7);
  }
  return { h3, pad, mmx, rover, capsule, electron, sat, scale, jar, flipCal, puffs, updatePuffs, flameWobble };
})();
