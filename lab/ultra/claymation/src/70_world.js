// ---------- 70_world.js: the three stages (table, Phobos ground, end card) and their lights ----------
const WORLD = (() => {
  const { add, grp } = SET;
  const W = {};
  function lights(scene, o) {
    const hemi = new THREE.HemisphereLight(o.sky ?? 0x8ea4ff, o.ground ?? 0x5a3a28, o.hemi ?? 0.55); scene.add(hemi);
    const key = new THREE.SpotLight(o.key ?? 0xffd6a0, o.keyI ?? 3.2, 0, o.angle ?? 0.5, 0.75, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.00025; key.shadow.normalBias = 0.03;
    key.shadow.camera.near = 10; key.shadow.camera.far = 400;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(o.rim ?? 0x8fb0ff, o.rimI ?? 1.0); rim.position.set(30, 40, -60); scene.add(rim);
    const fill = new THREE.DirectionalLight(o.fill ?? 0xffc9a0, o.fillI ?? 0.25); fill.position.set(40, 10, 40); scene.add(fill);
    return { hemi, key, rim, fill };
  }
  function dome(scene, R, top, horizon, nStars, seed) {
    const g = new THREE.SphereGeometry(R, 64, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const cTop = new THREE.Color(top), cH = new THREE.Color(horizon), c2 = new THREE.Color('#3b2a5e');
    SET.colorGeo(g, (x, y, z, c) => { const u = U.clamp(y / R, 0, 1); c.copy(cH).lerp(cTop, Math.pow(u, 0.6)); const n = U.fbm3(x * 0.02, y * 0.02, z * 0.02 + seed, 3); c.lerp(c2, U.smooth(0.1, 0.4, n) * 0.35); });
    const m = CLAY.mat('#ffffff', { vcol: true, rough: 1, print: 0.06, printScale: 0.02, rim: 0, sheen: 0, side: THREE.BackSide });
    const d = new THREE.Mesh(g, m); d.receiveShadow = false; scene.add(d);
    // star beads pressed into the backdrop
    const r = U.mulberry32(seed * 101 + 3), mats = SET.mats();
    const sg = new THREE.IcosahedronGeometry(1, 2);
    const inst = new THREE.InstancedMesh(sg, mats.star, nStars), instA = new THREE.InstancedMesh(sg, mats.starA, Math.round(nStars * 0.25));
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const place = (im, n) => { for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, ph = 0.05 + r() * 1.35; p.set(Math.cos(th) * Math.cos(ph), Math.sin(ph), Math.sin(th) * Math.cos(ph)).multiplyScalar(R * 0.985); const k = 0.25 + Math.pow(r(), 3) * 0.9; s.set(k, k, k); mtx.compose(p, q, s); im.setMatrixAt(i, mtx); } };
    place(inst, nStars); place(instA, Math.round(nStars * 0.25));
    scene.add(inst, instA);
    return d;
  }

  function buildTable() {
    const S = new THREE.Scene(); W.ST = S;
    const m = SET.mats();
    W.lT = lights(S, { hemi: 0.5, keyI: 3.0 });
    // the table: a clay "space mat"
    const tg = new THREE.CircleGeometry(190, 96); tg.rotateX(-Math.PI / 2);
    // a ring subdivision so the table can darken toward the backdrop
    const tg2 = new THREE.RingGeometry(0.01, 190, 96, 24); tg2.rotateX(-Math.PI / 2);
    SET.colorGeo(tg2, (x, y, z, c) => { const d = Math.hypot(x, z - 10); c.set('#30346a').lerp(new THREE.Color('#0d0e22'), U.smooth(30, 120, d)); });
    const tableMat = CLAY.mat('#ffffff', { vcol: true, rough: 0.92, print: 0.05, printScale: 0.05, rim: 0.04, seed: 0.13 });
    const table = new THREE.Mesh(tg2, tableMat); table.receiveShadow = true; S.add(table);
    // little star specks pressed into the mat
    { const r = U.mulberry32(9), n = 260, im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), CLAY.mat('#e9dcc0', { rough: 0.7, print: 0, rim: 0.1, emissive: '#3a3020' }), n);
      const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
      for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = 8 + Math.sqrt(r()) * 110; p.set(Math.cos(a) * d, 0.0, Math.sin(a) * d); const k = 0.12 + r() * 0.2; s.set(k, k * 0.5, k); mtx.compose(p, q, s); im.setMatrixAt(i, mtx); }
      im.receiveShadow = true; S.add(im); }
    dome(S, 170, '#0b0c1c', '#2d2552', 420, 1);
    // ---- orrery: Mars on a brass pole, Phobos on a brass arm ----
    W.mars = add(S, SET.makeMars(8.5, 112), CLAY.mat('#ffffff', { vcol: true, rough: 0.82, print: 0.02, printScale: 0.12, rim: 0.3, seed: 0.27 }), [0, 10, 0]);
    add(S, new THREE.CylinderGeometry(0.32, 0.32, 10, 12), m.brass, [0, 5, 0]);
    add(S, CLAY.lump(new THREE.CylinderGeometry(3.4, 3.8, 0.7, 40, 1), 0.05, 0.5, 5), m.wood, [0, 0.35, 0]);
    W.arm = grp(S, [0, 0, 0]);
    add(W.arm, new THREE.CylinderGeometry(0.16, 0.16, 13, 8), m.brass, [0, 2.0, 6.5], [Math.PI / 2, 0, 0]);
    add(W.arm, new THREE.CylinderGeometry(0.12, 0.12, 8.2, 8), m.brass, [0, 6.1, 13]);
    add(W.arm, new THREE.SphereGeometry(0.42, 12, 10), m.brass, [0, 2.0, 0.0]);
    W.phobosT = add(W.arm, SET.makePhobos(7, 96, 1.6, 1.3, 1.07), CLAY.mat('#ffffff', { vcol: true, rough: 0.9, print: 0.016, printScale: 0.35, rim: 0.25, seed: 0.61 }), [0, 10, 13]);
    // the dashed spiral (collision course), built in Mars-centred polar coordinates
    W.spiralG = grp(S);
    { const pts = []; const N = 90;
      for (let i = 0; i <= N; i++) { const u = i / N, ang = -u * Math.PI * 2 * 1.55, r = 13 - (13 - 9.7) * Math.pow(u, 0.8); pts.push([Math.sin(ang) * r, 10 + Math.sin(u * 9) * 0.06, Math.cos(ang) * r]); }
      const g = SET.snake(pts, 0.2, 360);
      W.spiral = add(W.spiralG, g, m.amber); W.spiral.castShadow = false; W.spiralIdx = g.index.count;
      W.spiralTip = add(W.spiralG, CLAY.lump(new THREE.SphereGeometry(0.34, 14, 10), 0.02, 2, 210), m.amber); }
    // the professor's pointer (a wooden dowel with an amber clay tip); its base sits in the cat's paw
    W.pointer = grp(S);
    add(W.pointer, new THREE.CylinderGeometry(0.07, 0.1, 1, 8), m.wood, [0, 0.5, 0]);
    W.pointerTip = add(W.pointer, CLAY.lump(new THREE.SphereGeometry(0.2, 12, 10), 0.02, 3, 77), m.amber, [0, 1, 0]);
    // ---- launch pad ----
    W.padP = [-40, 0, 16];
    const padG = CRAFT.pad(); padG.position.set(...W.padP); S.add(padG);
    W.h3 = CRAFT.h3(); W.h3.position.set(W.padP[0], 1.25, W.padP[2]); S.add(W.h3);
    W.padPuffs = CRAFT.puffs(26, 4); S.add(W.padPuffs);
    W.trailPuffs = CRAFT.puffs(18, 5); S.add(W.trailPuffs);
    // a little island of clay grass under the pad (Tanegashima, unlabelled)
    add(S, CLAY.lump(new THREE.CylinderGeometry(9, 10.5, 0.5, 48, 1), 0.4, 0.2, 13), CLAY.mat('#4d7c3e', { rough: 0.95, print: 0.03, printScale: 0.2, rim: 0.1 }), [W.padP[0] + 1, 0.25, W.padP[2] + 1]);
    // Japan paper flag (white with a red disc), on a toothpick
    { const cv = document.createElement('canvas'); cv.width = 300; cv.height = 200; const g = cv.getContext('2d'); g.fillStyle = '#f6f1e6'; g.fillRect(0, 0, 300, 200); g.fillStyle = '#c8202c'; g.beginPath(); g.arc(150, 100, 60, 0, Math.PI * 2); g.fill();
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      W.jp = grp(S, [W.padP[0] + 6.2, 0.5, W.padP[2] + 6.5]);
      add(W.jp, new THREE.CylinderGeometry(0.06, 0.05, 5, 8), m.wood, [0, 2.5, 0]);
      const fg = new THREE.PlaneGeometry(2.4, 1.6, 8, 2); const pp = fg.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin((pp.getX(i) + 1.2) * 1.6) * 0.12); fg.computeVertexNormals(); fg.translate(1.26, 0, 0);
      add(W.jp, fg, CLAY.mat('#ffffff', { map: tx, rough: 0.9, print: 0.002, rim: 0.05, side: THREE.DoubleSide }), [0, 4.2, 0]); }
    W.flagLaunch = SET.flag(['Launch:', ['04:41:03 JST,', '#b0680c'], ['Oct 20, 2026', '#b0680c'], '(19:41:03 UTC,', 'Oct 19)'], 5.4, { pole: 8.9, fs: 84, lh: 96 });
    S.add(W.flagLaunch);
    W.flagSpiral = SET.flag([['1.8 m (6 ft)', '#b0680c'], 'closer to Mars', 'every 100 years'], 7.0, { pole: 3.6, fs: 84, lh: 96 });
    S.add(W.flagSpiral);
    W.flagCruise = SET.flag(['Each way:', ['just under', '#b0680c'], ['one year', '#b0680c']], 4.6, { pole: 5.5, fs: 84, lh: 96 });
    S.add(W.flagCruise);
    // round 2: the slow rate hangs from Phobos's own pin; the either/or gets its own flag on the wide shot
    // adversarial check: the flag now stands on Phobos's right shoulder with a short pole and the card to its left,
    // so its text sits inside the safe zone (y >= 260) instead of across the top edge of the frame
    W.tagPhobos = SET.flag([['1.8 m (6 ft)', '#b0680c'], 'closer to Mars', 'every 100 years'], 4.2, { pole: 0.8, fs: 92, lh: 104, left: true });
    S.add(W.tagPhobos);
    // the either/or: a paper sign lowered into the shot on a string (a stage action), over the orrery
    W.signFate = SET.tag(['50 million years:', ['crash into Mars', '#b0680c'], ['or break up into a ring', '#b0680c']], 11.0, { string: 9.0, fs: 92, lh: 104 });
    S.add(W.signFate);
    // the professor's stack of clay books (the cat stands on it in the hook)
    W.books = grp(S, [11.2, 0, 13.6]);
    { const cols = ['#6b4a8e', '#2f6f6a', '#b5523b'];
      [[0, 0.0, 5.0, 0.8, 3.8, 0.05], [1, 0.8, 4.6, 0.85, 3.5, -0.08], [2, 1.65, 4.2, 0.75, 3.2, 0.12]].forEach(([i, y, w, h, d, r]) => {
        const b = grp(W.books, [0, y, 0]); b.rotation.y = r;
        add(b, CLAY.lump(new THREE.BoxGeometry(w, h, d, 6, 2, 4), 0.04, 0.8, 140 + i), CLAY.mat(cols[i], { rough: 0.85, print: 0.012, printScale: 0.3, rim: 0.15, seed: 0.2 + i * 0.1 }), [0, h / 2, 0]);
        add(b, CLAY.lump(new THREE.BoxGeometry(w - 0.12, h - 0.22, d + 0.04, 4, 1, 3), 0.02, 1.2, 150 + i), CLAY.mat('#efe6cf', { rough: 0.9, print: 0.006, printScale: 0.8, rim: 0.05, seed: 0.5 }), [0.12, h / 2, 0]);
      }); }
    // step one: a flip calendar by Mars, OCT 2026 to AUG 2027
    { const M = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG'];
      W.calFlip = CRAFT.flipCal(M.map((m, i) => [i < 3 ? '2026' : '2027', m, i === 10 ? '#d9901a' : '#c8392e']), 4.4, 4.8, 2.6);
      S.add(W.calFlip); }
    // ---- MMX on a stick (the cat carries it), and the cruise copy near Mars ----
    W.stickMMX = grp(S);
    add(W.stickMMX, new THREE.CylinderGeometry(0.08, 0.08, 5, 8), m.wood, [0, 2.5, 0]);
    W.mmxS = CRAFT.mmx(0.55); W.mmxS.position.set(0, 5.4, 0); W.stickMMX.add(W.mmxS);
    W.mmxBurn = CRAFT.mmx(0.55); S.add(W.mmxBurn);
    W.burnPuffs = CRAFT.puffs(10, 7); S.add(W.burnPuffs);
    // ---- Earth ----
    W.earthP = [44, 9, -4];
    W.earth = add(S, SET.makeEarth(6.5), CLAY.mat('#ffffff', { vcol: true, rough: 0.8, print: 0.02, printScale: 0.14, rim: 0.3, seed: 0.83 }), W.earthP);
    add(S, new THREE.CylinderGeometry(0.3, 0.3, 9, 12), m.brass, [W.earthP[0], 4.5, W.earthP[2]]);
    add(S, CLAY.lump(new THREE.CylinderGeometry(3, 3.4, 0.7, 40, 1), 0.05, 0.5, 6), m.wood, [W.earthP[0], 0.35, W.earthP[2]]);
    W.capsule = CRAFT.capsule(); W.capsule.scale.setScalar(0.62); S.add(W.capsule);
    W.flagCap = SET.flag(['Capsule:', ['about 60 cm across,', '#b0680c'], 'with a heat shield'], 5.6, { pole: 3.6, fs: 80, lh: 92 });
    S.add(W.flagCap);
    W.jarT = CRAFT.jar(); W.jarT.scale.setScalar(0.62); S.add(W.jarT);
    // easel with the real Phobos photo (HiRISE, PIA10368)
    W.easel = grp(S, [49.9, 0, 8.0]);
    { const e = W.easel;
      add(e, new THREE.CylinderGeometry(0.12, 0.12, 13, 8), m.wood, [-2.4, 6.2, 0.4], [-0.12, 0, 0.18]);
      add(e, new THREE.CylinderGeometry(0.12, 0.12, 13, 8), m.wood, [2.4, 6.2, 0.4], [-0.12, 0, -0.18]);
      add(e, new THREE.CylinderGeometry(0.12, 0.12, 12, 8), m.wood, [0, 5.8, -1.6], [0.28, 0, 0]);
      add(e, new THREE.BoxGeometry(6.4, 0.3, 0.8), m.wood, [0, 4.6, 0.75]);
      W.photoG = grp(e, [0, 8.3, 0.75]); W.photoG.rotation.x = -0.12;
      add(W.photoG, CLAY.lump(new THREE.BoxGeometry(7.2, 7.6, 0.18, 4, 4, 1), 0.02, 0.8, 300), CLAY.mat('#f3eee4', { rough: 0.9, print: 0.004, rim: 0.05 }), [0, 0, 0]);
      W.photoMat = CLAY.mat('#ffffff', { rough: 0.55, print: 0.0, rim: 0.0, sheen: 0.0 });
      add(W.photoG, new THREE.PlaneGeometry(6.4, 6.4), W.photoMat, [0, 0.35, 0.1]); }
    // ---- NEXT: Electron pad and three satellites ----
    W.elP = [72, 0, 11];
    W.electron = CRAFT.electron(); W.electron.position.set(W.elP[0], 0.25, W.elP[2]); W.electron.scale.setScalar(1.45); S.add(W.electron);
    // round 2: a shop counter (the cat pops up behind it, like the end card); satellites and the calendar sit on it
    W.counter = grp(S, [68.5, 0, 19.2]);
    add(W.counter, CLAY.lump(new THREE.BoxGeometry(10.2, 4.2, 2.6, 16, 6, 4), 0.07, 0.5, 14), CLAY.mat('#5a4a6e', { rough: 0.88, print: 0.02, printScale: 0.25, rim: 0.12, seed: 0.44 }), [0, 2.1, 0]);
    add(W.counter, CLAY.lump(new THREE.BoxGeometry(10.4, 0.32, 2.8, 16, 1, 4), 0.03, 0.6, 15), CLAY.mat('#f5b83d', { rough: 0.6, print: 0.008, printScale: 0.3, rim: 0.2, emissive: '#2a1a00' }), [0, 4.25, 0]);
    W.sats = [0, 1, 2].map((k) => { const s = CRAFT.sat(k + 1); s.position.set(64.6 + k * 1.45, 4.4, 18.8); s.scale.setScalar(0.95); S.add(s); return s; });
    W.flagNext = SET.flag([['NEXT:', '#b0680c'], 'Rocket Lab Electron,', 'three HawkEye 360', 'satellites'], 6.0, { pole: 9.6, fs: 84, lh: 96 });
    W.flagNext.position.set(62.9, 0, 13.0); S.add(W.flagNext);
    W.flagWed = SET.flag([['WED 21 OCT', '#c8392e']], 4.6, { pole: 8.6, fs: 120, lh: 120 });
    W.flagWed.position.set(W.elP[0] - 5.0, 0, W.elP[2] + 1.6); S.add(W.flagWed);
    W.cal = grp(S, [70.9, 4.4, 18.6]); W.cal.visible = true; W.cal.scale.setScalar(0);
    { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 600; const g = cv.getContext('2d');
      g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, 512, 600); g.fillStyle = '#c8392e'; g.fillRect(0, 0, 512, 150);
      g.fillStyle = '#f4ecd8'; g.font = '700 110px Kalam'; g.textAlign = 'center'; g.fillText('WED', 256, 118);
      g.fillStyle = '#251c14'; g.font = '700 290px Kalam'; g.fillText('21', 256, 455); g.font = '700 110px Kalam'; g.fillText('OCT', 256, 570);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      add(W.cal, CLAY.lump(new THREE.BoxGeometry(4.6, 5.4, 1.4, 4, 4, 2), 0.06, 0.6, 15), CLAY.mat('#e7dcc4', { rough: 0.9, print: 0.01, printScale: 0.3 }), [0, 2.7, 0]);
      add(W.cal, new THREE.PlaneGeometry(4.1, 4.8), CLAY.mat('#ffffff', { map: tx, rough: 0.85, print: 0.002, rim: 0.03 }), [0, 2.75, 0.72]); }
    return S;
  }

  function buildGround() {
    const S = new THREE.Scene(); W.SG = S;
    W.lG = lights(S, { sky: 0x7d8cc8, ground: 0x6a3a22, hemi: 0.42, keyI: 3.4, key: 0xffe2bd, rim: 0xffa56a, rimI: 1.1, angle: 0.6 });
    // ground: a big lumpy clay disc with craters and pebbles
    const g = new THREE.CircleGeometry(150, 200, 0, Math.PI * 2); g.rotateX(-Math.PI / 2);
    // densify with a plane grid instead (circle has radial verts only)
    const pg = new THREE.PlaneGeometry(260, 260, 220, 220); pg.rotateX(-Math.PI / 2);
    const cr = [[-16, -26, 12, 2.2], [26, -48, 18, 3.0], [-40, -70, 22, 3.5], [10, 6, 5, 0.6], [-22, 14, 4, 0.5], [34, -10, 8, 1.2], [-6, -55, 9, 1.4], [55, -90, 30, 4]];
    const p = pg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let h = 1.3 * U.fbm3(x * 0.03, 0, z * 0.03, 3) + 0.25 * U.fbm3(x * 0.16, 1, z * 0.16, 2);
      for (const [cx, cz, r, d] of cr) { const a = Math.hypot(x - cx, z - cz) / r; if (a < 1.7) h += (a < 1 ? -d * (1 - a * a) : 0) + d * 0.32 * Math.exp(-Math.pow((a - 1) / 0.22, 2)); }
      // keep the stage flat around the action
      const flat = 1 - U.smooth(10, 26, Math.hypot(x, z - 2));
      p.setY(i, h * (1 - flat * 0.85) - 0.2);
    }
    CLAY.smoothNormals(pg);
    const ca = new THREE.Color('#8b7666'), cb = new THREE.Color('#6a584d'), cc = new THREE.Color('#a18a76');
    SET.colorGeo(pg, (x, y, z, c) => { const n = U.fbm3(x * 0.05 + 3, 0, z * 0.05, 3); c.copy(ca).lerp(cb, U.smooth(-0.1, 0.25, n)).lerp(cc, U.smooth(0.1, 0.35, -n) * 0.5); });
    const ground = new THREE.Mesh(pg, CLAY.mat('#ffffff', { vcol: true, rough: 0.95, print: 0.03, printScale: 0.12, rim: 0.08, seed: 0.71 }));
    ground.receiveShadow = true; S.add(ground);
    W.groundH = (x, z) => 0; // stage is flat near the action
    // pebbles and boulders
    { const r = U.mulberry32(21), m = CLAY.mat('#7b6758', { rough: 0.95, print: 0.02, printScale: 0.3, rim: 0.12, seed: 0.4 });
      for (let i = 0; i < 46; i++) {
        const a = r() * Math.PI * 2, d = 9 + r() * 70, s = 0.25 + Math.pow(r(), 3) * 2.2;
        const geo = CLAY.lump(new THREE.IcosahedronGeometry(1, 2), 0.25, 1.3, 400 + i, 2);
        const x = Math.cos(a) * d, z = Math.sin(a) * d - 10;
        if (Math.abs(x) < 9 && z > -8 && z < 16) continue;
        add(S, geo, m, [x, s * 0.35, z], [r() * 3, r() * 3, r() * 3], [s, s * 0.7, s]);
      }
      W.boulder = add(S, CLAY.lump(new THREE.IcosahedronGeometry(1, 3), 0.22, 1.1, 499, 3), m, [13.0, 1.6, -5.0], [0.3, 0.8, 0.1], [3.6, 2.8, 3.0]);
    }
    dome(S, 260, '#05060f', '#141331', 380, 2);
    // Mars, huge in the sky (Phobos orbits close to it)
    W.bigMars = add(S, SET.makeMars(78, 128), CLAY.mat('#ffffff', { vcol: true, rough: 0.85, print: 0.03, printScale: 0.03, rim: 0.35, seed: 0.29 }), [-62, 24, -265], [0.35, 0.6, 0.0]);
    W.bigMars.castShadow = false;
    // MMX lander, the rover, the scale, the jar, puffs
    W.mmxG = CRAFT.mmx(2.2); S.add(W.mmxG);
    W.rover = CRAFT.rover(); W.rover.scale.setScalar(1.55); S.add(W.rover);
    // the rover's luggage tag: its mass (25 kg) is a label, true anywhere; the scale shows only the 15 g
    W.roverTag = SET.tag([['25 kg', '#b0680c']], 1.9, { string: 0.5, fs: 210, lh: 210 });
    W.roverTag.position.set(-0.15, 0.66, 1.0); W.rover.userData.b.add(W.roverTag);
    // round 2: the kitchen scale stands on a flat clay rock, so its dial sits above the caption plaque
    W.rock = add(S, CLAY.lump(new THREE.CylinderGeometry(2.9, 3.6, 3.2, 40, 4), 0.28, 0.45, 811, 3), CLAY.mat('#7f6b5c', { rough: 0.95, print: 0.03, printScale: 0.3, rim: 0.12, seed: 0.42 }), [1.0, 1.6, 5.6]);
    W.scale = CRAFT.scale(); W.scale.position.set(1.0, 3.2, 5.6); W.scale.scale.setScalar(1.5); S.add(W.scale);
    W.jarG = CRAFT.jar(); W.jarG.scale.setScalar(0.85); S.add(W.jarG);
    W.landPuffs = CRAFT.puffs(14, 9); S.add(W.landPuffs);
    W.gasPuffs = CRAFT.puffs(16, 11); S.add(W.gasPuffs);
    W.dropPuffs = CRAFT.puffs(6, 12); S.add(W.dropPuffs);
    W.crumbs = [];
    { const r = U.mulberry32(31), m = CLAY.mat('#7d6a5d', { rough: 0.9, print: 0.01, printScale: 0.6, rim: 0.15 });
      for (let i = 0; i < 14; i++) { const c = add(S, CLAY.lump(new THREE.IcosahedronGeometry(0.22 + r() * 0.18, 1), 0.05, 3, 600 + i), m); c.visible = false; c.userData.r = [r(), r(), r()]; W.crumbs.push(c); } }
    W.flagDrop = SET.flag(['Rover dropped from', ['about 40 m,', '#b0680c'], 'in free fall'], 5.2, { pole: 9.0, fs: 84, lh: 96, left: true });
    S.add(W.flagDrop); W.flagDrop.visible = false;
    // round 2: the drop height hangs as a paper tag under MMX's left wing, so it stays in shot while MMX hovers
    W.tagDrop = SET.tag(['Rover dropped from', ['about 40 m,', '#b0680c'], 'in free fall'], 6.0, { string: 0.7, fs: 90, lh: 100 });
    S.add(W.tagDrop);
    W.flagCore = SET.flag(['Corer digs', ['to 2 cm', '#b0680c']], 3.3, { pole: 3.0, fs: 96, lh: 108, left: true });
    S.add(W.flagCore);
    W.flagHours = SET.flag(['About', ['2 to 3 hours', '#b0680c'], 'on the surface'], 5.6, { pole: 5.4, fs: 116, lh: 128 });
    S.add(W.flagHours);
    W.flagJar = SET.flag(['at least', ['10 g', '#b0680c']], 2.2, { pole: 2.4, fs: 120, lh: 130, left: true });
    S.add(W.flagJar);
    return S;
  }

  function buildCard() {
    const S = new THREE.Scene(); W.SC = S;
    W.lC = lights(S, { hemi: 0.6, keyI: 3.0, angle: 0.55 });
    const slab = add(S, CLAY.lump(new THREE.BoxGeometry(80, 90, 4, 30, 40, 2), 0.25, 0.12, 700), CLAY.mat('#17161e', { rough: 0.8, print: 0.04, printScale: 0.1, rim: 0.15, seed: 0.19 }), [0, 34, -2]);
    slab.castShadow = false;
    // puppet-theatre ledge the cat pops up behind
    W.ledge = add(S, CLAY.lump(new THREE.BoxGeometry(60, 20, 7, 30, 8, 3), 0.18, 0.15, 703), CLAY.mat('#24222c', { rough: 0.8, print: 0.04, printScale: 0.1, rim: 0.25, seed: 0.23 }), [0, 20.4, 5.5]);
    add(S, CLAY.lump(new THREE.BoxGeometry(61, 0.9, 8, 30, 1, 3), 0.06, 0.3, 704), CLAY.mat('#f5b83d', { rough: 0.6, print: 0.01, printScale: 0.2, rim: 0.2, emissive: '#2a1a00' }), [0, 30.6, 5.5]);
    // wordmark: echo mark + DOWNLINK (paper) + CAT (amber), clay letters from the caption font
    // adversarial check: smaller, lower and centred on x 490 so the whole mark stays inside x 80..900, y >= 260
    W.word = grp(S, [0, 43.0, 0.3]); W.word.scale.setScalar(0.7);
    // clay star beads pressed into the backdrop
    { const r = U.mulberry32(808), sm = SET.mats();
      for (let i = 0; i < 22; i++) {
        const x = (r() - 0.5) * 34, y = 22 + r() * 30;
        if (Math.abs(x) < 9 && y > 30 && y < 46) continue;
        if (y > 42 && y < 46.5) continue;
        const k = 0.12 + r() * 0.22;
        add(S, CLAY.lump(new THREE.SphereGeometry(1, 10, 8), 0.05, 2, 820 + i), r() < 0.3 ? sm.amber : CLAY.mat('#efe6d2', { rough: 0.7, print: 0.004, rim: 0.2, emissive: '#3a3020' }), [x, y, 0.1], null, [k, k, k * 0.5]);
      } }
    const paper = CLAY.mat('#efe8d8', { rough: 0.62, print: 0.006, printScale: 0.0035, rim: 0.3, seed: 0.21 });
    const amber = CLAY.mat('#f5b83d', { rough: 0.55, print: 0.006, printScale: 0.0035, rim: 0.3, seed: 0.63, emissive: '#2a1a00' });
    let tot = 0; for (const ch of 'DOWNLINKCAT') tot += GLYPHS.glyphs[ch].a;
    const sc = 13.4 / tot; W.wsc = sc; // font units -> cm (wordmark about 19 cm wide)
    let x = 0;
    W.letters = [];
    const text = 'DOWNLINKCAT';
    const glyphs = GLYPHS.glyphs;
    // echo mark
    const e = sc / 0.0021;
    W.echoDot = add(W.word, CLAY.lump(new THREE.CylinderGeometry(0.78 * e, 0.78 * e, 0.5 * e, 40, 1), 0.015, 2, 701), amber, [0, 0.72 * e, 0], [Math.PI / 2, 0, 0]);
    W.echoRing = add(W.word, CLAY.lump(new THREE.TorusGeometry(0.62 * e, 0.2 * e, 16, 48), 0.012, 2, 702), amber, [2.05 * e, 0.72 * e, 0]);
    W.echoPing = add(W.word, new THREE.TorusGeometry(0.62 * e, 0.13 * e, 12, 48), amber, [2.05 * e, 0.72 * e, 0]); W.echoPing.visible = false;
    x = 3.35 * e;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (i === 8) x += 0.75 * e;
      const geo = CAPS.geoFor(ch);
      const lm = add(W.word, geo, i >= 8 ? amber : paper, [x, 0, -0.2]);
      lm.scale.setScalar(sc);
      W.letters.push(lm);
      x += glyphs[ch].a * sc + (i + 1 < text.length ? (GLYPHS.kern[ch + text[i + 1]] || 0) * sc : 0) - 0.04 * e;
    }
    W.wordW = x; W.wordL = -0.78 * e;   // left edge of the echo dot
    return S;
  }
  return { W, buildTable, buildGround, buildCard };
})();
