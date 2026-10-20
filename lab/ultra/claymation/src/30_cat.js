// ---------- 30_cat.js: Night Shift in clay (built from primitives) + the pose evaluator ----------
const CAT = (() => {
  const C = {
    black: '#2a2830', white: '#ece4d2', amber: '#f5b83d', earIn: '#6e4b26', mouth: '#3c1618', tongue: '#d8716b', pupil: '#141217',
  };
  const DEF = {
    x: 0, y: 0, z: 0, ry: 0, lean: 0, pitch: 0, sq: 0, hipY: 0, rise: 0,
    torsoX: 0, torsoZ: 0, torsoY: 0,
    headX: 0, headY: 0, headZ: 0, headS: 1,
    earL: 0, earR: 0, eyeS: 1, blink: 0, lookX: 0, lookY: 0, squint: 0, sly: 0,
    browL: 0, browR: 0, browAL: 0, browAR: 0,
    mouth: 0, smile: 0.3, mouthO: 0,
    aLz: 0.18, aLx: 0, aLy: 0, eL: 0.25, aRz: 0.18, aRx: 0, aRy: 0, eR: 0.25, pawL: 1, pawR: 1,
    lLx: 0, lRx: 0, kL: 0, kR: 0, spread: 0.06, plant: 1,
    tail: 0, tailWag: 0, walk: 0, walkPh: 0, talk: 0, vis: 1,
  };
  const NAMES = Object.keys(DEF);
  const HIP = 2.05;

  function build(scene) {
    const M = {
      black: CLAY.mat(C.black, { rough: 0.7, print: 0.014, printScale: 0.42, rim: 0.55, boil: 0.011, boilPrint: 1, seed: 0.11, sheen: 0.035, mottle: 0.12 }),
      white: CLAY.mat(C.white, { rough: 0.84, print: 0.015, printScale: 0.4, rim: 0.18, boil: 0.011, boilPrint: 1, seed: 0.52, mottle: 0.06 }),
      amber: CLAY.mat(C.amber, { rough: 0.6, print: 0.008, printScale: 0.6, rim: 0.25, boil: 0.005, boilPrint: 1, seed: 0.77, emissive: '#3a2400', mottle: 0.05 }),
      earIn: CLAY.mat(C.earIn, { rough: 0.8, print: 0.01, printScale: 0.6, rim: 0.2, seed: 0.3 }),
      mouth: CLAY.mat(C.mouth, { rough: 0.7, print: 0.004, printScale: 0.6, rim: 0.1 }),
      tongue: CLAY.mat(C.tongue, { rough: 0.6, print: 0.004, printScale: 0.6, rim: 0.2 }),
      pupil: CLAY.mat(C.pupil, { rough: 0.35, print: 0.002, printScale: 0.6, rim: 0.1 }),
    };
    const mesh = (geo, m, parent, pos, rot, sc) => {
      const o = new THREE.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true;
      if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); if (sc) o.scale.set(...sc);
      parent.add(o); return o;
    };
    const grp = (parent, pos) => { const g = new THREE.Group(); if (pos) g.position.set(...pos); parent.add(g); return g; };
    const L = (geo, amp, freq, seed) => CLAY.lump(geo, amp, freq, seed);

    const R = {};
    R.root = grp(scene);
    R.body = grp(R.root);                 // squash and stretch about the feet
    // ---- legs (hip pivots at y = HIP) ----
    const legGeo = L(new THREE.CapsuleGeometry(0.25, 0.72, 6, 12), 0.03, 1.6, 1);
    const footGeo = L(new THREE.SphereGeometry(0.42, 20, 14), 0.035, 1.5, 2); footGeo.scale(1, 0.55, 1.4);
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? -0.55 : 0.55;
      const hip = grp(R.body, [sx, HIP, 0]);
      mesh(legGeo, M.black, hip, [0, -0.45, 0]);
      const knee = grp(hip, [0, -0.9, 0]);
      mesh(legGeo, M.black, knee, [0, -0.45, 0]);
      const ankle = grp(knee, [0, -0.9, 0]);
      mesh(footGeo, M.black, ankle, [0, -0.02, 0.22]);
      R['hip' + s] = hip; R['knee' + s] = knee; R['ankle' + s] = ankle;
    }
    // ---- torso (pivot at the hips) ----
    R.hips = grp(R.body, [0, HIP, 0]);
    R.torso = grp(R.hips);
    const prof = [[0.001, -0.62], [1.38, -0.62], [1.5, -0.5], [1.48, -0.2], [1.4, 0.5], [1.34, 1.2], [1.32, 1.7], [1.22, 2.05], [0.95, 2.3], [0.62, 2.42], [0.001, 2.44]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const jacketGeo = new THREE.LatheGeometry(prof, 40); jacketGeo.scale(1, 1, 0.74); L(jacketGeo, 0.06, 0.9, 3);
    mesh(jacketGeo, M.white, R.torso);
    // placket (front strip) and pockets: raised clay strips
    const strip = L(new THREE.CapsuleGeometry(0.07, 2.1, 4, 8), 0.01, 3, 4);
    mesh(strip, M.white, R.torso, [0.02, 0.85, 1.05], [-0.08, 0, 0.02]);
    const pocketGeo = L(new THREE.BoxGeometry(0.7, 0.42, 0.12, 4, 3, 2), 0.02, 2, 5);
    mesh(pocketGeo, M.white, R.torso, [-0.72, -0.1, 0.98], [0, -0.35, 0.03]);
    mesh(pocketGeo, M.white, R.torso, [0.74, -0.12, 0.98], [0, 0.35, -0.04]);
    // echo mark on the chest (viewer-right): amber dot + ring
    const chestDot = L(new THREE.SphereGeometry(0.16, 16, 12), 0.008, 3, 6); chestDot.scale(1, 1, 0.45);
    mesh(chestDot, M.amber, R.torso, [0.48, 1.45, 1.0], [0, 0.42, 0]);
    mesh(new THREE.TorusGeometry(0.13, 0.045, 10, 24), M.amber, R.torso, [0.86, 1.45, 0.8], [0, 0.62, 0]);
    // collar: stand-up band + two flaps
    const collar = L(new THREE.TorusGeometry(0.72, 0.17, 12, 32, Math.PI * 1.55), 0.02, 2, 7);
    collar.rotateX(Math.PI / 2); collar.rotateY(Math.PI / 2 + Math.PI * 0.225 + Math.PI); collar.scale(1, 2.2, 0.82);
    mesh(collar, M.white, R.torso, [0, 2.38, -0.02]);
    const flapGeo = L(new THREE.BoxGeometry(0.55, 0.62, 0.14, 4, 4, 2), 0.02, 2, 8);
    mesh(flapGeo, M.white, R.torso, [-0.36, 2.12, 0.86], [-0.35, 0.3, 0.5]);
    mesh(flapGeo, M.white, R.torso, [0.36, 2.12, 0.86], [-0.35, -0.3, -0.5]);
    // ---- arms ----
    const upGeo = L(new THREE.CapsuleGeometry(0.4, 0.75, 6, 14), 0.035, 1.4, 9);
    const foGeo = L(new THREE.CapsuleGeometry(0.37, 0.62, 6, 14), 0.03, 1.4, 10);
    const cuffGeo = L(new THREE.TorusGeometry(0.36, 0.11, 10, 20), 0.01, 3, 11); cuffGeo.rotateX(Math.PI / 2);
    const pawGeo = L(new THREE.SphereGeometry(0.4, 20, 16), 0.03, 1.6, 12); pawGeo.scale(1, 1.1, 0.95);
    const thumbGeo = L(new THREE.SphereGeometry(0.16, 12, 10), 0.01, 3, 13);
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? -1.18 : 1.18;
      const sh = grp(R.torso, [sx, 1.82, 0]);
      mesh(upGeo, M.white, sh, [0, -0.5, 0]);
      const el = grp(sh, [0, -1.05, 0]);
      mesh(foGeo, M.white, el, [0, -0.42, 0]);
      mesh(cuffGeo, M.white, el, [0, -0.86, 0]);
      const paw = grp(el, [0, -1.12, 0]);
      mesh(pawGeo, M.black, paw, [0, -0.05, 0]);
      mesh(thumbGeo, M.black, paw, [s === 'L' ? 0.28 : -0.28, 0.05, 0.22]);
      R['sh' + s] = sh; R['el' + s] = el; R['paw' + s] = paw;
    }
    // ---- tail (rebuilt per pose frame) ----
    R.tailMesh = mesh(new THREE.BufferGeometry(), M.black, R.torso);
    // ---- neck + head ----
    R.neck = grp(R.torso, [0, 2.3, 0]);
    mesh(L(new THREE.CylinderGeometry(0.56, 0.62, 0.8, 18, 3), 0.02, 2, 14), M.black, R.neck, [0, 0.3, 0]);
    R.head = grp(R.neck, [0, 0.6, 0]);
    R.headS = grp(R.head);
    const HC = [0, 1.45, 0.05], RX = 2.05, RY = 1.68, RZ = 1.72;
    R.HC = HC; R.RAD = [RX, RY, RZ];
    const headGeo = new THREE.SphereGeometry(1, 56, 40); headGeo.scale(RX, RY, RZ); L(headGeo, 0.07, 0.7, 15);
    mesh(headGeo, M.black, R.headS, HC);
    // cheek fluff
    const fluff = L(new THREE.ConeGeometry(0.32, 0.7, 12, 2), 0.02, 2, 16);
    mesh(fluff, M.black, R.headS, [HC[0] - 1.98, HC[1] - 0.55, HC[2] + 0.2], [0, 0, 1.75]);
    mesh(fluff, M.black, R.headS, [HC[0] + 1.98, HC[1] - 0.55, HC[2] + 0.2], [0, 0, -1.75]);
    // surface point helper on the head ellipsoid (u = x, v = y offsets from the head centre)
    const onFace = (x, y, push = 0) => {
      const zz = RZ * Math.sqrt(Math.max(0.02, 1 - (x / RX) ** 2 - (y / RY) ** 2));
      const n = new THREE.Vector3(x / (RX * RX), y / (RY * RY), zz / (RZ * RZ)).normalize();
      const p = new THREE.Vector3(HC[0] + x, HC[1] + y, HC[2] + zz).addScaledVector(n, push);
      return { p, n };
    };
    const orient = (o, n) => { o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); };
    // ears (pivot at the base)
    const earGeo = L(new THREE.ConeGeometry(0.78, 1.55, 24, 5), 0.035, 1.3, 17); earGeo.translate(0, 0.72, 0); earGeo.scale(1, 1, 0.42);
    const earInGeo = L(new THREE.ConeGeometry(0.5, 1.05, 20, 3), 0.02, 1.6, 18); earInGeo.translate(0, 0.52, 0); earInGeo.scale(1, 1, 0.3);
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? -1 : 1;
      const e = grp(R.headS, [HC[0] + sx * 1.22, HC[1] + 1.12, HC[2] - 0.1]);
      e.rotation.set(0, 0, -sx * 0.42);
      const ef = grp(e); R['ear' + s] = ef;
      mesh(earGeo, M.black, ef);
      mesh(earInGeo, M.earIn, ef, [0, 0.06, 0.2]);
    }
    // tuft
    const tuftGeo = L(new THREE.CapsuleGeometry(0.13, 0.42, 4, 8), 0.02, 3, 19); tuftGeo.scale(1, 1, 0.8);
    [[-0.28, -0.35], [0.02, 0.05], [0.3, 0.4]].forEach(([x, r], i) => mesh(tuftGeo, M.black, R.headS, [HC[0] + x, HC[1] + RY - 0.05 + (i === 1 ? 0.1 : 0), HC[2] + 0.25], [0.2, 0, -r]));
    // eyes: viewer-left solid amber disc (+pupil), viewer-right hollow amber ring
    const ER = 0.56;
    const lidGeo = L(new THREE.SphereGeometry(ER * 1.12, 24, 14), 0.01, 3, 27); lidGeo.scale(1.12, 0.9, 0.16);
    {
      const f = onFace(-0.77, 0.12, 0.02);
      const g = grp(R.headS); g.position.copy(f.p); orient(g, f.n); R.eyeLg = g;
      R.eyeL = grp(g);
      const disc = L(new THREE.SphereGeometry(ER, 32, 20), 0.01, 3, 20); disc.scale(1, 1, 0.34);
      mesh(disc, M.amber, R.eyeL);
      const pg = new THREE.SphereGeometry(0.15, 16, 12); pg.scale(0.8, 1.15, 0.4);
      R.pupil = mesh(pg, M.pupil, R.eyeL, [0.12, 0.02, 0.17]);
      R.lidL = mesh(lidGeo, M.black, g, [0, ER * 1.15, 0.12]);
    }
    {
      const f = onFace(0.77, 0.12, 0.03);
      const g = grp(R.headS); g.position.copy(f.p); orient(g, f.n); R.eyeRg = g;
      R.eyeR = grp(g);
      const ring = L(new THREE.TorusGeometry(ER - 0.08, 0.13, 14, 40), 0.008, 3, 21); ring.scale(1, 1, 0.8);
      mesh(ring, M.amber, R.eyeR);
      R.lidR = mesh(lidGeo, M.black, g, [0, ER * 1.15, 0.12]);
    }
    // brows (off-white slugs)
    const browGeo = L(new THREE.CapsuleGeometry(0.085, 0.42, 4, 8), 0.008, 3, 22); browGeo.rotateZ(Math.PI / 2);
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? -1 : 1, f = onFace(sx * 0.8, 0.88, 0.03);
      const g = grp(R.headS); g.position.copy(f.p); orient(g, f.n);
      R['brow' + s] = mesh(browGeo, M.white, g);
    }
    // nose
    const noseGeo = L(new THREE.ConeGeometry(0.15, 0.2, 3, 1), 0.006, 4, 23); noseGeo.rotateZ(Math.PI); noseGeo.scale(1.25, 1, 0.6);
    { const f = onFace(0, -0.42, 0.02); const g = grp(R.headS); g.position.copy(f.p); orient(g, f.n); mesh(noseGeo, M.white, g); }
    // mouth: the closed "w" line is rebuilt per pose; the open mouth is a dark oval + tongue
    { const f = onFace(0, -0.8, 0.0); const g = grp(R.headS); g.position.copy(f.p); orient(g, f.n); R.mouthG = g;
      R.mouthLine = mesh(new THREE.BufferGeometry(), M.white, g);
      const og = new THREE.SphereGeometry(0.36, 24, 16); og.scale(1, 1, 0.35);
      R.mouthOpen = mesh(og, M.mouth, g, [0, -0.12, 0.0]);
      const tg = new THREE.SphereGeometry(0.2, 16, 10); tg.scale(1.1, 0.55, 0.4);
      R.tongue = mesh(tg, M.tongue, R.mouthOpen, [0, -0.17, 0.08]);
    }
    // headset: band, cups, mic boom
    {
      const band = L(new THREE.TorusGeometry(2.08, 0.15, 10, 48, Math.PI), 0.01, 2, 24); band.scale(1, 0.86, 1);
      mesh(band, M.white, R.headS, [HC[0], HC[1] + 0.05, HC[2] - 0.15]);
      const cup = L(new THREE.CylinderGeometry(0.55, 0.58, 0.5, 24, 2), 0.02, 2, 25); cup.rotateZ(Math.PI / 2);
      mesh(cup, M.white, R.headS, [HC[0] - 2.05, HC[1] + 0.02, HC[2] - 0.15]);
      mesh(cup, M.white, R.headS, [HC[0] + 2.05, HC[1] + 0.02, HC[2] - 0.15]);
      const boom = new THREE.CatmullRomCurve3([[-2.25, -0.2, 0.25], [-2.05, -0.95, 0.95], [-1.45, -1.35, 1.45], [-0.85, -1.15, 1.65]].map((p) => new THREE.Vector3(HC[0] + p[0], HC[1] + p[1], HC[2] + p[2])));
      mesh(new THREE.TubeGeometry(boom, 24, 0.07, 8), M.white, R.headS);
      mesh(L(new THREE.SphereGeometry(0.19, 14, 10), 0.01, 3, 26), M.white, R.headS, [HC[0] - 0.8, HC[1] - 1.15, HC[2] + 1.67]);
      // cable from the left cup into the collar
      const cab = new THREE.CatmullRomCurve3([[-2.1, -0.4, -0.3], [-1.9, -1.6, -0.5], [-1.0, -2.3, -0.4]].map((p) => new THREE.Vector3(HC[0] + p[0], HC[1] + p[1], HC[2] + p[2])));
      mesh(new THREE.TubeGeometry(cab, 16, 0.05, 6), M.white, R.headS);
    }
    R.M = M;
    return R;
  }

  // taper tube along points
  function taperTube(pts, r0, r1, seg = 28, rad = 10) {
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, seg, 1, rad, false);
    const p = geo.attributes.position, n = geo.attributes.normal;
    // rescale ring radii (TubeGeometry stores radius 1 around the curve)
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, c = curve.getPointAt(u), r = U.lerp(r0, r1, Math.pow(u, 1.3));
      for (let j = 0; j <= rad; j++) {
        const k = i * (rad + 1) + j;
        p.setXYZ(k, c.x + n.getX(k) * r, c.y + n.getY(k) * r, c.z + n.getZ(k) * r);
      }
    }
    p.needsUpdate = true;
    return geo;
  }

  // ----- pose tracks: keys [{t, d, e, ...params}] -----
  function makeTracks(keys) {
    const tr = {};
    for (const n of NAMES) tr[n] = [];
    for (const k of keys) for (const n in k) if (n in DEF) tr[n].push({ t: k.t, v: k[n], d: k.d ?? 0.27, e: k.e || 'io' });
    for (const n of NAMES) tr[n].sort((a, b) => a.t - b.t);
    return tr;
  }
  function evalTrack(list, def, t) {
    if (!list.length || t < list[0].t) return def;
    let i = 0; while (i + 1 < list.length && list[i + 1].t <= t) i++;
    const k = list[i];
    let prev = def;
    if (i > 0) { // value of the previous key at the moment this one starts
      const pk = list[i - 1], pprev = i > 1 ? list[i - 2].v : def;
      const u = U.clamp((k.t - pk.t) / pk.d, 0, 1);
      prev = U.lerp(pprev, pk.v, U.ease[pk.e](u));
    }
    const u = U.clamp((t - k.t) / k.d, 0, 1);
    return U.lerp(prev, k.v, U.ease[k.e](u));
  }

  // syllable-ish mouth from caption word timings
  function mouthAt(t, words) {
    let v = 0;
    for (const w of words) {
      if (t < w.start - 0.05 || t > w.end + 0.05) continue;
      const syl = Math.max(1, Math.round(w.text.replace(/[^a-zA-Z0-9]/g, '').length / 3.2));
      const u = U.clamp((t - w.start) / Math.max(0.08, w.end - w.start), 0, 1);
      const o = Math.abs(Math.sin(u * Math.PI * syl));
      v = Math.max(v, (0.35 + 0.65 * o) * (w.stress ? 1 : 0.78));
    }
    return v;
  }

  class Actor {
    constructor(scene, opt = {}) {
      this.R = build(scene);
      this.seed = opt.seed ?? 3;
      this.tr = makeTracks(opt.keys || []);
      this.words = opt.words || [];
      this.lastPose = -1;
      this.extra = opt.extra || null; // (t, P) => mutate P (procedural moves)
      // seeded blink and ear schedules
      const r = U.mulberry32(this.seed * 977);
      this.blinks = []; for (let t = 0.7; t < 60; t += 1.6 + r() * 2.6) { this.blinks.push(t); if (r() < 0.2) this.blinks.push(t + 0.33); }
      this.flicks = []; for (let t = 1.2; t < 60; t += 1.8 + r() * 3.0) this.flicks.push([t, r() < 0.5 ? 'L' : 'R']);
    }
    params(t) {
      const tp = U.twos(t), pi = U.poseIndex(t);
      const P = {};
      for (const n of NAMES) P[n] = evalTrack(this.tr[n], DEF[n], tp);
      // breathing
      const br = Math.sin(tp * 2 * Math.PI * 0.42);
      P.sq += br * 0.012; P.headX += br * 0.015;
      // blinks (close 1 pose frame, hold 1, open 1)
      for (const b of this.blinks) { const d = tp - b; if (d >= 0 && d < 0.2) P.blink = Math.max(P.blink, d < 0.067 ? 0.7 : d < 0.134 ? 1 : 0.45); }
      for (const [b, s] of this.flicks) { const d = tp - b; if (d >= 0 && d < 0.27) P['ear' + s] += Math.sin(d / 0.27 * Math.PI) * 0.45; }
      // talking
      if (P.talk > 0.01) {
        const m = mouthAt(tp, this.words) * P.talk;
        P.mouth = Math.max(P.mouth, m);
        // stressed words: head bob
        for (const w of this.words) if (w.stress) { const d = tp - w.start; if (d >= -0.05 && d < 0.35) P.headX += Math.sin(U.clamp(d / 0.35, 0, 1) * Math.PI) * 0.09 * P.talk; }
      }
      // walk cycle
      if (P.walk > 0.01) {
        const ph = P.walkPh * Math.PI * 2, a = P.walk;
        P.lLx += Math.sin(ph) * 0.55 * a; P.lRx -= Math.sin(ph) * 0.55 * a;
        P.kL += Math.max(0, -Math.cos(ph)) * 0.7 * a; P.kR += Math.max(0, Math.cos(ph)) * 0.7 * a;
        P.aLx -= Math.sin(ph) * 0.5 * a; P.aRx += Math.sin(ph) * 0.5 * a;
        P.rise += Math.abs(Math.sin(ph)) * 0.25 * a; P.torsoX += 0.08 * a;
        P.headZ += Math.sin(ph) * 0.04 * a; P.plant = 0;
      }
      if (this.extra) this.extra(tp, P);
      // clay jitter: tiny per-pose-frame offsets (the animator's hands)
      const j = (k, a) => U.hashS(pi * 31 + this.seed, k) * a;
      P.x += j(1, 0.012); P.z += j(2, 0.012); P.ry += j(3, 0.006);
      P.headX += j(4, 0.012); P.headY += j(5, 0.012); P.headZ += j(6, 0.012);
      P.torsoX += j(7, 0.008); P.torsoZ += j(8, 0.008);
      P.aLz += j(9, 0.02); P.aRz += j(10, 0.02); P.aLx += j(11, 0.02); P.aRx += j(12, 0.02);
      P.earL += j(13, 0.03); P.earR += j(14, 0.03); P.tailWag += j(15, 0.05);
      P._pi = pi; P._tp = tp;
      return P;
    }
    apply(t) {
      const P = this.params(t), R = this.R;
      R.root.visible = P.vis > 0.5;
      R.root.position.set(P.x, P.y, P.z);
      R.root.rotation.set(P.pitch, P.ry, P.lean, 'YXZ');
      const s = 1 + P.sq; R.body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      // hips + legs. plant=1 keeps the feet on the ground while the hips drop (crouch)
      const hipH = HIP + P.hipY;
      R.hips.position.y = hipH + P.rise;
      for (const sd of ['L', 'R']) {
        const hip = R['hip' + sd], knee = R['knee' + sd], ankle = R['ankle' + sd];
        hip.position.y = hipH + P.rise;
        const sx = sd === 'L' ? -1 : 1;
        let a = P['l' + sd + 'x'], k = P['k' + sd];
        if (P.plant > 0.5 && P.hipY < -0.005) { const c = U.clamp((1.8 + P.hipY) / 1.8, 0.2, 1); const al = Math.acos(c); a += al; k += al * 2; }
        hip.rotation.set(-a, 0, sx * P.spread);
        knee.rotation.set(k, 0, 0);
        ankle.rotation.set(a - k, 0, -sx * P.spread);
      }
      R.torso.rotation.set(P.torsoX, P.torsoY, P.torsoZ, 'YXZ');
      // arms
      for (const sd of ['L', 'R']) {
        const sx = sd === 'L' ? -1 : 1;
        R['sh' + sd].rotation.set(-P['a' + sd + 'x'], sx * P['a' + sd + 'y'], sx * P['a' + sd + 'z'], 'XYZ');
        R['el' + sd].rotation.set(-P['e' + sd], 0, 0);
        const pw = P['paw' + sd]; R['paw' + sd].scale.set(pw, pw, pw);
      }
      // head
      R.neck.rotation.set(P.headX * 0.35, P.headY * 0.3, P.headZ * 0.3);
      R.head.rotation.set(P.headX * 0.65, P.headY * 0.7, P.headZ * 0.7, 'YXZ');
      R.headS.scale.setScalar(P.headS);
      R.earL.rotation.set(-P.earL * 0.6, 0, -P.earL * 0.5);
      R.earR.rotation.set(-P.earR * 0.6, 0, P.earR * 0.5);
      // eyes
      const open = U.clamp(1 - P.blink, 0.08, 1), sq = U.clamp(P.squint, 0, 1);
      for (const e of [R.eyeL, R.eyeR]) { e.scale.set(P.eyeS * (1 + 0.06 * sq), P.eyeS * open * (1 - 0.55 * sq), P.eyeS); e.position.y = 0.12 * sq; }
      R.pupil.position.set(0.1 + P.lookX * 0.2, 0.02 + P.lookY * 0.2, 0.17);
      R.pupil.visible = open > 0.4 && sq < 0.5;
      // lids: sly / sleepy (upper lid comes down), blink handled by eye scale
      const lid = U.clamp(P.sly, 0, 1);
      for (const l of [R.lidL, R.lidR]) { l.visible = lid > 0.02; l.position.y = 0.56 * (1.2 - lid * 0.85); }
      R.browL.position.set(0, P.browL * 0.25 + 0.1 * sq, 0); R.browL.rotation.set(0, 0, P.browAL);
      R.browR.position.set(0, P.browR * 0.25 + 0.1 * sq, 0); R.browR.rotation.set(0, 0, -P.browAR);
      // mouth
      const mo = U.clamp(P.mouth, 0, 1);
      R.mouthOpen.visible = mo > 0.06;
      R.mouthOpen.scale.set(0.55 + 0.45 * (1 - P.mouthO * 0.4) + P.smile * 0.12, 0.25 + mo * 0.95 + P.mouthO * 0.3, 1);
      R.mouthLine.visible = mo <= 0.06;
      if (P._pi !== this.lastPose) {
        this.lastPose = P._pi;
        // closed "w" mouth with the smile amount
        const sm = P.smile;
        const pts = [[-0.42, 0.06 + sm * 0.14], [-0.22, -0.1 - sm * 0.04], [0, 0.02], [0.22, -0.1 - sm * 0.04], [0.42, 0.06 + sm * 0.14]].map(([x, y]) => new THREE.Vector3(x, y, 0.02 - Math.abs(x) * 0.12));
        R.mouthLine.geometry.dispose();
        R.mouthLine.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.055, 6);
        // tail: from the back of the jacket, out to viewer-right and up, sways
        const tw = P.tailWag + Math.sin(P._tp * 2 * Math.PI * 0.55) * 0.25, tc = P.tail;
        const tp = [[0.35, -0.3, -0.8], [1.3, -0.55, -1.0], [2.2 + tw * 0.3, 0.2 + tc * 0.4, -1.0], [2.5 + tw * 0.7, 1.4 + tc * 0.6, -0.9], [2.1 + tw * 1.1, 2.3 + tc * 0.4, -0.85 + tw * 0.2]]
          .map(([x, y, z]) => new THREE.Vector3(x, y, z));
        R.tailMesh.geometry.dispose();
        R.tailMesh.geometry = taperTube(tp, 0.23, 0.15, 32, 10);
      }
      return P;
    }
  }
  return { Actor, DEF, C };
})();
