// ---------- 40_set.js: the tabletop set (clay planets, orrery, backdrop, paper flags) ----------
const SET = (() => {
  const add = (parent, geo, mat, pos, rot, sc, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true;
    if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (sc) (Array.isArray(sc) ? m.scale.set(...sc) : m.scale.setScalar(sc));
    parent.add(m); return m;
  };
  const grp = (parent, pos) => { const g = new THREE.Group(); if (pos) g.position.set(...pos); if (parent) parent.add(g); return g; };
  const MATS = {};
  function mats() {
    if (MATS.brass) return MATS;
    MATS.brass = CLAY.mat('#b48a45', { rough: 0.38, metal: 0.65, print: 0.002, printScale: 0.4, rim: 0.05 });
    MATS.wood = CLAY.mat('#c79a62', { rough: 0.85, print: 0.004, printScale: 0.6, rim: 0.05 });
    MATS.white = CLAY.mat('#ece4d2', { rough: 0.8, print: 0.012, printScale: 0.2, rim: 0.18, seed: 0.4 });
    MATS.grey = CLAY.mat('#8f8a86', { rough: 0.85, print: 0.014, printScale: 0.2, rim: 0.12, seed: 0.5 });
    MATS.dark = CLAY.mat('#2b2a33', { rough: 0.75, print: 0.01, printScale: 0.2, rim: 0.3, seed: 0.6 });
    MATS.amber = CLAY.mat('#f5b83d', { rough: 0.6, print: 0.008, printScale: 0.2, rim: 0.25, seed: 0.7, emissive: '#2a1900' });
    MATS.red = CLAY.mat('#c8392e', { rough: 0.7, print: 0.01, printScale: 0.2, rim: 0.2, seed: 0.8 });
    MATS.cotton = CLAY.mat('#f3efe8', { rough: 1, print: 0.03, printScale: 0.35, rim: 0.35, sheen: 0.16, seed: 0.9 });
    MATS.flameO = CLAY.mat('#ff8a2a', { rough: 0.9, print: 0.01, printScale: 0.3, rim: 0.3, emissive: '#ff5a00', emissiveIntensity: 1.6 });
    MATS.flameY = CLAY.mat('#ffe08a', { rough: 0.9, print: 0.006, printScale: 0.3, rim: 0.3, emissive: '#ffc640', emissiveIntensity: 2.2 });
    MATS.star = CLAY.mat('#fff2d6', { rough: 0.6, print: 0, rim: 0, emissive: '#fff0cc', emissiveIntensity: 2.2 });
    MATS.starA = CLAY.mat('#ffd27a', { rough: 0.6, print: 0, rim: 0, emissive: '#ffc458', emissiveIntensity: 2.0 });
    return MATS;
  }

  // ---------- vertex-coloured clay ball ----------
  function colorGeo(geo, fn) {
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }
  const hex = (h) => new THREE.Color(h);

  function makeMars(R = 9, seg = 112) {
    const geo = new THREE.SphereGeometry(R, seg, Math.round(seg * 0.7));
    const base = hex('#c8582c'), dark = hex('#7b3420'), mid = hex('#a8482a'), cap = hex('#f1e9df'), light = hex('#dc7a45');
    // pressed groove (Valles Marineris-ish) and lumps
    const k = 8.5 / R;
    CLAY.lump(geo, R * 0.012, 0.35 * k, 3.1, 3);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), l = Math.hypot(x, y, z);
      const lat = Math.asin(y / l), lon = Math.atan2(x, z);
      const g = Math.exp(-Math.pow((lat + 0.12 + 0.05 * Math.sin(lon * 3)) / 0.035, 2)) * U.smooth(-0.9, -0.2, lon) * (1 - U.smooth(0.5, 1.1, lon));
      const s = 1 - g * 0.012;
      p.setXYZ(i, x * s, y * s, z * s);
    }
    CLAY.smoothNormals(geo);
    colorGeo(geo, (x, y, z, c) => {
      const l = Math.hypot(x, y, z); x *= k; y *= k; z *= k;
      const n = (U.fbm3(x * 0.18 + 4, y * 0.18, z * 0.18, 3) + U.fbm3(x * 0.07, y * 0.07 + 2, z * 0.07, 2) * 0.8);
      const sw = U.fbm3(x * 0.32 + n * 2, y * 0.32, z * 0.32 + n * 2, 2); // marbled swirl
      c.copy(base).lerp(light, U.smooth(-0.05, 0.25, sw) * 0.5).lerp(mid, U.smooth(0.0, 0.2, n) * 0.6).lerp(dark, U.smooth(0.12, 0.3, n + sw * 0.4) * 0.85);
      const capT = U.smooth(0.86, 0.9, y / (l * k) + 0.03 * U.n1(Math.atan2(x, z) * 3, 5));
      c.lerp(cap, capT);
      const capS = U.smooth(0.9, 0.94, -y / (l * k) + 0.03 * U.n1(Math.atan2(x, z) * 3, 6));
      c.lerp(cap, capS * 0.85);
    });
    return geo;
  }

  function makePhobos(seed = 7, seg = 96, sx = 1.6, sy = 1.3, sz = 1.07) {
    const geo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
    const r = U.mulberry32(seed);
    const craters = [];
    craters.push({ c: new THREE.Vector3(0.75, 0.15, 0.62).normalize(), rho: 0.62, d: 0.16, rim: 0.05 }); // a big Stickney-like bowl
    for (let i = 0; i < 46; i++) {
      const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      const rho = 0.06 + Math.pow(r(), 2.2) * 0.3;
      craters.push({ c: v, rho, d: rho * (0.22 + r() * 0.12), rim: rho * 0.08 });
    }
    const p = geo.attributes.position, d = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      let h = 0.07 * U.fbm3(d.x * 1.6 + seed, d.y * 1.6, d.z * 1.6, 3) + 0.05 * U.fbm3(d.x * 4, d.y * 4 + seed, d.z * 4, 2);
      for (const k of craters) {
        const a = Math.acos(U.clamp(d.dot(k.c), -1, 1)) / k.rho;
        if (a < 1.6) h += (a < 1 ? -k.d * (1 - a * a) : 0) + k.rim * Math.exp(-Math.pow((a - 1) / 0.22, 2));
      }
      // grooves
      h -= 0.012 * Math.pow(Math.abs(Math.sin(d.y * 26 + d.x * 9)), 18);
      const rr = 1 + h;
      p.setXYZ(i, d.x * rr * sx, d.y * rr * sy, d.z * rr * sz);
    }
    CLAY.smoothNormals(geo);
    const a = hex('#8e7868'), b = hex('#6d5b50'), cA = hex('#a48c78');
    colorGeo(geo, (x, y, z, c) => {
      const n = U.fbm3(x * 1.2 + 9, y * 1.2, z * 1.2, 3);
      c.copy(a).lerp(b, U.smooth(-0.05, 0.25, n)).lerp(cA, U.smooth(0.15, 0.35, -n) * 0.6);
    });
    return geo;
  }

  function makeEarth(R = 7) {
    const geo = new THREE.SphereGeometry(R, 96, 64);
    CLAY.lump(geo, R * 0.01, 0.4, 8.2, 2);
    const ocean = hex('#2a64b6'), oceanD = hex('#1f4f98'), land = hex('#4f9a4a'), sand = hex('#d9a35b'), ice = hex('#f2efe8');
    // Australia: an outline blob centred on the camera-facing side (lon 0, lat -0.42)
    const aus = [[-0.38, -0.22], [-0.2, -0.16], [-0.02, -0.18], [0.12, -0.27], [0.22, -0.38], [0.24, -0.55], [0.12, -0.64], [-0.02, -0.6], [-0.18, -0.64], [-0.36, -0.58], [-0.44, -0.44]];
    const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; };
    const p = geo.attributes.position;
    const isAus = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), l = Math.hypot(x, y, z);
      const lat = Math.asin(y / l), lon = Math.atan2(x, z);
      const wob = 0.02 * U.n1(lon * 9 + lat * 7, 3);
      if (inPoly(lon + wob, lat + wob, aus)) { isAus[i] = 1; const s = 1 + 0.025; p.setXYZ(i, x * s, y * s, z * s); }
    }
    CLAY.smoothNormals(geo);
    colorGeo(geo, (x, y, z, c) => {
      const l = Math.hypot(x, y, z), lat = Math.asin(y / l), lon = Math.atan2(x, z);
      const n = U.fbm3(x * 0.3 + 3, y * 0.3, z * 0.3, 3);
      c.copy(ocean).lerp(oceanD, U.smooth(-0.1, 0.2, U.fbm3(x * 0.5, y * 0.5, z * 0.5 + 7, 2)));
      // other continents, kept away from the Australia face
      const far = U.smooth(0.9, 1.4, Math.abs(lon)) + U.smooth(0.55, 0.8, lat);
      if (n > 0.08 && far > 0.5) c.copy(land).lerp(sand, U.smooth(0.15, 0.3, n) * 0.6);
      if (Math.abs(lat) > 1.25) c.copy(ice);
    });
    // Australia sand colour
    const col = geo.attributes.color;
    for (let i = 0; i < p.count; i++) if (isAus[i]) col.setXYZ(i, sand.r * 0.95, sand.g * 0.78, sand.b * 0.62);
    return geo;
  }

  // clay snake through points (tube with round caps)
  function snake(pts, r = 0.18, seg = 40) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(curve, seg, r, 10, false);
    return CLAY.lump(g, r * 0.12, 1.2, pts.length, 2);
  }

  // ---------- paper flags on toothpicks (facts) ----------
  function paperTexture(lines, opt = {}) {
    const W = 1024, pad = 54, lh = opt.lh ?? 92, fs = opt.fs ?? 74;
    const H = Math.round(pad * 2 + lines.length * lh + (opt.hole ? 18 : 0));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const R = U.mulberry32(lines.join('').length * 13 + 5);
    g.fillStyle = opt.bg || '#f4ecd8'; g.fillRect(0, 0, W, H);
    // paper fibres and a soft edge
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,95,60,${(R() * 0.06).toFixed(3)})`; g.fillRect(R() * W, R() * H, 1 + R() * 3, 1); }
    const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, W * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(90,60,20,0.18)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic';
    lines.forEach((ln, i) => {
      const parts = Array.isArray(ln) ? (typeof ln[0] === 'string' ? [ln] : ln) : [[ln, opt.ink || '#251c14']];
      let size = fs;
      const meas = () => { g.font = `700 ${size}px Kalam`; return parts.reduce((s, [t]) => s + g.measureText(t).width, 0); };
      while (meas() > W - pad * 2 && size > 30) size -= 2;
      let x = opt.center ? (W - meas()) / 2 : pad;
      const y = pad + (opt.hole ? 18 : 0) + (i + 0.78) * lh;
      for (const [t, c] of parts) { g.fillStyle = c; g.font = `700 ${size}px Kalam`; g.fillText(t, x, y); x += g.measureText(t).width; }
    });
    if (opt.hole) { g.fillStyle = 'rgba(40,30,20,0.85)'; g.beginPath(); g.arc(W / 2, 30, 13, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#c8392e'; g.lineWidth = 5; g.beginPath(); g.arc(W / 2, 30, 22, 0, Math.PI * 2); g.stroke(); }
    if (opt.underline) { g.strokeStyle = '#c8392e'; g.lineWidth = 6; g.beginPath(); g.moveTo(pad, H - pad * 0.55); g.quadraticCurveTo(W / 2, H - pad * 0.35, W - pad * 1.5, H - pad * 0.6); g.stroke(); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    return { tex, aspect: H / W };
  }
  function flag(lines, width = 10, opt = {}) {
    const m = mats();
    const { tex, aspect } = paperTexture(lines, opt);
    const h = width * aspect;
    const root = new THREE.Group();
    const pole = opt.pole ?? 6;
    add(root, new THREE.CylinderGeometry(0.07, 0.05, pole + h, 8), m.wood, [0, (pole + h) / 2, 0]);
    const geo = new THREE.PlaneGeometry(width, h, 16, 4);
    const pp = geo.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) / width + 0.5; pp.setZ(i, -Math.sin(x * Math.PI) * width * 0.03 - x * x * width * 0.02); }
    geo.computeVertexNormals();
    geo.translate(opt.left ? -(width / 2 + 0.06) : width / 2 + 0.06, 0, 0);
    const paper = CLAY.mat('#ffffff', { map: tex, rough: 0.92, print: 0.002, printScale: 0.3, rim: 0.08, side: THREE.DoubleSide, sheen: 0.1 });
    const card = add(root, geo, paper, [0, pole + h / 2, 0]);
    root.userData = { card, h, w: width, pole };
    return root;
  }
  // a paper luggage tag on a string: the group's origin is the knot; the card hangs below it.
  // userData.swing (a group) is rotated by the timeline (pendulum on twos).
  function tag(lines, width = 4, opt = {}) {
    const { tex, aspect } = paperTexture(lines, { ...opt, center: true, hole: true });
    const h = width * aspect, str = opt.string ?? 1.2;
    const root = new THREE.Group(), swing = new THREE.Group(); root.add(swing);
    const sm = CLAY.mat('#efe6d2', { rough: 0.9, print: 0.002, rim: 0.05 });
    add(swing, new THREE.CylinderGeometry(0.03, 0.03, str, 6), sm, [0, -str / 2, 0]);
    // the card: a tag shape (clipped corners at the top)
    const sh = new THREE.Shape(), w2 = width / 2, c = Math.min(width, h) * 0.18;
    sh.moveTo(-w2 + c, 0); sh.lineTo(w2 - c, 0); sh.lineTo(w2, -c); sh.lineTo(w2, -h); sh.lineTo(-w2, -h); sh.lineTo(-w2, -c); sh.lineTo(-w2 + c, 0);
    const geo = new THREE.ShapeGeometry(sh, 4);
    const uv = geo.attributes.uv, pp = geo.attributes.position;
    for (let i = 0; i < pp.count; i++) { uv.setXY(i, (pp.getX(i) + w2) / width, 1 + pp.getY(i) / h); pp.setZ(i, -Math.sin((pp.getX(i) / width + 0.5) * Math.PI) * width * 0.025); }
    geo.computeVertexNormals();
    const paper = CLAY.mat('#ffffff', { map: tex, rough: 0.92, print: 0.002, printScale: 0.3, rim: 0.08, side: THREE.DoubleSide, sheen: 0.12 });
    const card = add(swing, geo, paper, [0, -str, 0]);
    root.userData = { swing, card, h, w: width };
    return root;
  }
  // pop a flag in on twos (stuck into the clay): returns scale
  const POPF = [0.0, 0.6, 1.12, 0.96, 1.02, 1];
  function popScale(t, t0) { if (t < t0) return 0; const f = Math.floor((t - t0) * 15 + 1e-6); return POPF[Math.min(POPF.length - 1, f + 1)]; }

  const POPO = [1.08, 0.7, 0.25, 0];
  function life(t, t0, t1) { const a = popScale(t, t0); if (t1 === undefined || t < t1) return a; const f = Math.floor((t - t1) * 15 + 1e-6); return f >= POPO.length ? 0 : POPO[f]; }
  return { life, add, grp, mats, makeMars, makePhobos, makeEarth, snake, flag, tag, paperTexture, popScale, colorGeo };
})();
