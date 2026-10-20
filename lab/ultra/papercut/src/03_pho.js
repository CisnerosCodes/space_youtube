// ---------- Pho: a grumpy potato-shaped Phobos puppet (Stickney crater is his mouth) ----------
const PHO = { rx: 300, ry: 232 };
const _mp = new Map();
function MP(ctx, name, seed = 0) { const k = name + ':' + seed; if (!_mp.has(k)) _mp.set(k, pat(ctx, name, seed)); return _mp.get(k); }

// mouth shapes (replacement library): returns interior polygon(s)
function mouthShape(type) {
  const lens = (w, yc, th, curve) => { const top = [], bot = []; for (let i = 0; i <= 30; i++) { const x = -w / 2 + (i / 30) * w; const u = (2 * x) / w; const y = yc(x); const t = th * Math.sqrt(Math.max(0, 1 - u * u)) + 1.5; top.push([x, y - t / 2]); bot.push([x, y + t / 2]); } return top.concat(bot.reverse()); };
  switch (type) {
    case 'grump': return lens(124, (x) => -6 + 0.0058 * x * x, 16);
    case 'frown': return lens(118, (x) => -14 + 0.0095 * x * x, 20);
    case 'pout': return lens(56, (x) => -2 + 0.012 * x * x, 18);
    case 'wobble': return lens(110, (x) => 5 * Math.sin(x * 0.16), 14);
    case 'smirk': return lens(110, (x) => 0.12 * x + 0.003 * x * x - 6, 14);
    case 'mutter': return blobPts(0, 2, 34, 15, 17, 0.12, 30);
    case 'mutter2': return blobPts(0, 0, 26, 20, 18, 0.12, 30);
    case 'o': return blobPts(0, 0, 26, 30, 19, 0.08, 30);
    case 'gasp': return blobPts(0, 4, 40, 62, 20, 0.08, 40);
    case 'shout': { const p = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; const r = 1 + 0.06 * Math.sin(a * 5); p.push([Math.cos(a) * 74 * r * (Math.sin(a) > 0 ? 0.92 : 1.05), Math.sin(a) * (Math.sin(a) > 0 ? 66 : 40) * r + 6]); } return p; }
    case 'grit': return rrectPts(-70, -22, 140, 44, 16, 5);
    case 'ow': return blobPts(0, 6, 84, 44, 21, 0.1, 40);
    default: return lens(124, (x) => -6 + 0.0058 * x * x, 16);
  }
}
const MOUTHS = ['grump', 'frown', 'pout', 'wobble', 'smirk', 'mutter', 'mutter2', 'o', 'gasp', 'shout', 'grit', 'ow'];

function buildPho() {
  const seed = 21;
  const CR = [[-205, 48, 24], [196, -118, 19], [-170, -148, 15], [228, 70, 27], [-80, 168, 15], [150, 168, 13], [-246, -54, 11], [80, -186, 12], [-262, 120, 10], [258, -30, 9]];
  PC.phoBody = new Piece({ shape: () => blobPts(0, 0, PHO.rx, PHO.ry, seed, 0.1, 110, -0.06), paper: 'pho', edge: 'torn', res: 2.6, blur: 18, amp: 3, variants: 3, jitter: 0.6,
    details: (g) => {
      // layered shading: a lighter sheet upper-left, a darker sheet lower-right
      inlay(g, blobPts(-170, -120, 150, 95, 61, 0.3, 70, -0.4), 'phoLt', 62, { sa: 0.2, sb: 4 });
      inlay(g, blobPts(230, 190, 170, 110, 63, 0.3, 70, 0.4), 'phoDk', 64, { sa: 0.25, sb: 4 });
      inlay(g, blobPts(-210, 190, 120, 70, 67, 0.3, 50, -0.3), 'phoDk', 68, { sa: 0.22, sb: 4 });
      inlay(g, blobPts(290, 230, 110, 60, 65, 0.3, 50, 0.5), 'phoDk2', 66, { sa: 0.25, sb: 4 });
      // grooves: scored lines (Phobos' parallel grooves)
      for (let k = 0; k < 7; k++) {
        const y0 = -150 + k * 26;
        const line = []; for (let i = 0; i <= 30; i++) { const u = i / 30; line.push([-270 + u * 250 + k * 8, y0 + 50 * u * u - 30 * u + 3 * Math.sin(u * 9 + k)]); }
        g.strokeStyle = 'rgba(60,46,38,0.32)'; g.lineWidth = 2.6; g.beginPath(); line.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        g.strokeStyle = 'rgba(214,202,186,0.22)'; g.lineWidth = 1.4; g.beginPath(); line.forEach(([x, y], i) => (i ? g.lineTo(x + 1.2, y + 2.4) : g.moveTo(x + 1.2, y + 2.4))); g.stroke();
      }
      for (const [x, y, r] of CR) crater(g, x, y, r, 800 + x);
    } });
  PC.phoEye = [0, 1].map((i) => new Piece({ shape: () => ellipsePts(0, 0, i ? 47 : 52, i ? 55 : 60, 48), paper: 'white', edge: 'cut', res: 4, blur: 4, jitter: 0.5 }));
  PC.phoSocket = [0, 1].map((i) => new Piece({ shape: () => blobPts(0, 0, (i ? 47 : 52) + 9, (i ? 55 : 60) + 9, 70 + i, 0.06, 40), paper: 'phoDk', edge: 'torn', res: 4, blur: 3, jitter: 0.5 }));
  PC.phoPupil = new Piece({ shape: () => ellipsePts(0, 0, 17, 18, 30), paper: 'ink', edge: 'cut', res: 4.5, blur: 2, jitter: 0.3,
    details: (g) => { g.fillStyle = 'rgba(250,245,235,0.9)'; g.beginPath(); g.arc(-6, -6, 4, 0, TAU); g.fill(); } });
  PC.phoBrowL = new Piece({ shape: () => rrectPts(-118, -13, 124, 26, 10), paper: 'brow', edge: 'torn', res: 3.4, blur: 4, amp: 1.4 });
  PC.phoBrowR = new Piece({ shape: () => rrectPts(-6, -13, 112, 26, 10), paper: 'brow', edge: 'torn', res: 3.4, blur: 4, amp: 1.4 });
  PC.mouthRim = {}; PC.mouthIn = {};
  for (const m of MOUTHS) {
    const inner = mouthShape(m);
    PC.mouthRim[m] = new Piece({ shape: () => roughen(inner, { amp: 2, freq: 0.08, seed: 5, bias: 13, step: 4 }), paper: 'phoLt', edge: 'torn', res: 2.8, blur: 4, jitter: 0.5 });
    PC.mouthIn[m] = new Piece({ shape: () => inner, paper: 'mouth', edge: 'cut', res: 2.8, blur: 3, jitter: 0.5, shade: 0.6,
      details: (g, r, v, bb) => {
        // depth: dark top wall, a tongue or rocks inside open mouths
        const lg = g.createLinearGradient(0, bb.y, 0, bb.y + bb.h); lg.addColorStop(0, 'rgba(0,0,0,0.45)'); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(bb.x, bb.y, bb.w, bb.h);
        if (['shout', 'gasp', 'ow', 'o'].includes(m)) { g.fillStyle = pat(g, 'mouthIn', 3); g.beginPath(); g.ellipse(bb.x + bb.w * 0.55, bb.y + bb.h * 0.95, bb.w * 0.36, bb.h * 0.32, 0, 0, TAU); g.fill(); }
        if (m === 'grit' || m === 'ow') { g.fillStyle = pat(g, 'cream', 4); const n = m === 'grit' ? 6 : 5; for (let k = 0; k < n; k++) { const x = bb.x + 8 + k * ((bb.w - 16) / n); g.beginPath(); g.moveTo(x + 2, bb.y + 2); g.lineTo(x + (bb.w - 16) / n - 2, bb.y + 2); g.lineTo(x + (bb.w - 16) / n - 4, bb.y + (m === 'grit' ? bb.h * 0.48 : bb.h * 0.3)); g.lineTo(x + 4, bb.y + (m === 'grit' ? bb.h * 0.5 : bb.h * 0.32)); g.fill(); if (m === 'grit') { g.beginPath(); g.moveTo(x + 2, bb.y + bb.h - 2); g.lineTo(x + (bb.w - 16) / n - 2, bb.y + bb.h - 2); g.lineTo(x + (bb.w - 16) / n - 4, bb.y + bb.h * 0.54); g.lineTo(x + 4, bb.y + bb.h * 0.52); g.fill(); } } }
      } });
  }
  PC.phoArmU = new Piece({ shape: () => stripPts([[0, 0], [78, 0]], 50, 44), paper: 'pho', edge: 'torn', res: 2, blur: 5, amp: 1.6 });
  PC.phoArmF = new Piece({ shape: () => { const s = stripPts([[0, 0], [58, 0]], 42, 38); const m = blobPts(78, 0, 32, 30, 88, 0.12, 30); return [s, m]; }, paper: 'pho', edge: 'torn', res: 2, blur: 5, amp: 1.6,
    details: (g) => { g.strokeStyle = 'rgba(50,40,32,0.4)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(84, -16); g.quadraticCurveTo(98, -6, 92, 8); g.stroke(); } });
  PC.sweat = new Piece({ shape: () => { const p = []; for (let i = 0; i <= 30; i++) { const a = (i / 30) * TAU; const r = 14; let x = Math.cos(a) * r, y = Math.sin(a) * r; if (y < 0) { x *= 1 + y / 30; y *= 1.9; } p.push([x, y]); } return p; }, paper: 'blueTag', edge: 'cut', res: 3.4, blur: 3,
    details: (g) => { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(-4, 2, 3, 5, 0, 0, TAU); g.fill(); } });
  PC.vein = new Piece({ shape: () => [0, 1, 2, 3].map((k) => { const a = k * Math.PI / 2 + Math.PI / 4; const cx = Math.cos(a) * 18, cy = Math.sin(a) * 18; return stripPts(arcLine(cx, cy, 13, a + Math.PI - 1.0, a + Math.PI + 1.0, 10), 7, 7); }), paper: 'red', edge: 'cut', res: 2.4, blur: 3 });
  PC.shockLine = new Piece({ shape: () => [[0, -5], [46, -3], [46, 3], [0, 5]], paper: 'cream', edge: 'cut', res: 2, blur: 3 });
  PC.grawlix = new Piece({ shape: () => { const p = []; for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; const r = i % 2 ? 72 : 100; p.push([Math.cos(a) * r * 1.35, Math.sin(a) * r * 0.8]); } return p; }, paper: 'cream', edge: 'cut', res: 1.8, blur: 8,
    details: (g) => { textIn(g, '#@!*', 0, 22, '800 64px Archivo', '#c8352e', { align: 'center', alpha: 1, stretch: 'semi-expanded' }); } });
  PC.scissors = new Piece({ shape: () => [ellipsePts(-34, -12, 15, 11, 20), ellipsePts(-34, 14, 15, 11, 20), [[-22, -6], [40, 6], [40, 9], [-20, 2]], [[-22, 8], [40, -2], [40, 1], [-20, 12]]], paper: 'steel', edge: 'cut', res: 2, blur: 4,
    details: (g) => { g.fillStyle = pat(g, 'red', 2); g.beginPath(); g.ellipse(-34, -12, 15, 11, 0, 0, TAU); g.ellipse(-34, 14, 15, 11, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(30,10,10,0.9)'; g.beginPath(); g.ellipse(-34, -12, 8, 5, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-34, 14, 8, 5, 0, 0, TAU); g.fill(); } });
}

// ---------- expressions ----------
// lid: 0 open .. 1 closed; lidA: + = angry slope (inner corners low); brow: anger -1..1 (+ = V), browY: + = raised; pup: pupil scale
const EXPR = {
  grumpy: { lid: 0.42, lidA: 0.22, brow: 0.75, browY: -6, pup: 1, mouth: 'grump' },
  glare: { lid: 0.5, lidA: 0.3, brow: 0.95, browY: -10, pup: 0.9, mouth: 'frown' },
  annoyed: { lid: 0.52, lidA: 0.05, brow: 0.2, browY: -4, pup: 1, mouth: 'smirk' },
  alarmed: { lid: 0.0, lidA: -0.12, brow: -0.7, browY: 22, pup: 0.72, mouth: 'wobble' },
  worried: { lid: 0.12, lidA: -0.2, brow: -0.8, browY: 14, pup: 0.85, mouth: 'wobble' },
  outrage: { lid: 0.08, lidA: 0.28, brow: 1.0, browY: 4, pup: 0.8, mouth: 'shout' },
  panic: { lid: 0.0, lidA: -0.15, brow: -0.85, browY: 30, pup: 0.62, mouth: 'gasp' },
  wince: { lid: 0.86, lidA: 0.3, brow: 1.0, browY: -12, pup: 1, mouth: 'grit' },
  ow: { lid: 0.7, lidA: 0.25, brow: 0.9, browY: 0, pup: 1, mouth: 'ow' },
  sulk: { lid: 0.5, lidA: -0.12, brow: -0.35, browY: -6, pup: 1, mouth: 'pout' },
  unimpressed: { lid: 0.6, lidA: 0.0, brow: 0.05, browY: -2, pup: 1, mouth: 'grump' },
  fury: { lid: 0.25, lidA: 0.32, brow: 1.0, browY: -4, pup: 0.85, mouth: 'shout' },
  gulp: { lid: 0.05, lidA: -0.18, brow: -0.8, browY: 18, pup: 0.7, mouth: 'o' },
  meh: { lid: 0.45, lidA: 0.06, brow: 0.3, browY: -2, pup: 1, mouth: 'smirk' },
};
const ARMS = { // [L shoulder, L elbow, R shoulder, R elbow] in degrees; 0 = pointing right
  rest: [112, -14, 68, 14],
  flail: [212, -40, -32, 40],
  fist: [112, -14, -58, -64],
  fists: [200, -70, -20, 70],
  cross: [24, -52, 156, 52],
  cheeks: [-28, -96, 208, 96],
  head: [238, 58, -58, -58],
  wave: [112, -14, -38, -56],
  hips: [150, -150, 30, 150],
  shrug: [160, 60, 20, -60],
  point: [112, -14, -10, -10],
};

// a timeline of acting keys: [t, expr, arms, extra]
function phoAt(keys, t) {
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  const k = keys[i], kp = keys[Math.max(0, i - 1)];
  const dur = 0.2;
  const u = i === 0 ? 1 : clamp((t - k[0]) / dur);
  const us = i === 0 ? 1 : (u >= 1 ? 1 : E.outBack(u));
  const A = EXPR[kp[1]], B = EXPR[k[1]];
  const st = {};
  for (const f of ['lid', 'lidA', 'brow', 'browY', 'pup']) st[f] = lerp(A[f], B[f], f === 'lid' ? E.out(u) : us);
  st.mouth = u < 0.5 ? A.mouth : B.mouth;
  const aA = ARMS[kp[2]] || ARMS.rest, aB = ARMS[k[2]] || ARMS.rest;
  const ua = i === 0 ? 1 : (clamp((t - k[0]) / 0.26) >= 1 ? 1 : E.outBack(clamp((t - k[0]) / 0.26)));
  st.arms = aA.map((v, j) => lerp(v, aB[j], ua));
  st.extra = k[3] || {};
  st.since = t - k[0];
  st.expr = k[1];
  return st;
}

// draw Pho. base: matrix to his center; s: state; o: {look:[x,y], mouthOverride, fx...}
function drawPho(ctx, base, s, o = {}) {
  const t = G.t, tq = q2(t);
  const breath = Math.sin(tq * 2.6) * 0.012;
  const sq = o.squash ?? 0;
  const M = mmul(base, mS(1 + sq * 0.6 - breath * 0.5, 1 - sq + breath));
  const lift = o.lift ?? 34;
  // arms behind? no: pinned on top. body first
  if (!o.faceOnly) drawP(ctx, PC.phoBody, M, { lift, sa: o.sa ?? 1 });
  // band-aid (after coring)
  if (o.bandaid) drawP(ctx, PC.bandaid, mPlace(M, 70, -196, -0.25, 1.15), { lift: 4 });
  // eyes
  const look = o.look || [0, 0];
  const eyes = [[-102, -58, 52, 60, 0], [62, -72, 47, 55, 1]];
  for (const [ex, ey, rx, ry, i] of eyes) {
    drawP(ctx, PC.phoSocket[i], mPlace(M, ex, ey + 3), { lift: 2 });
    drawP(ctx, PC.phoEye[i], mPlace(M, ex, ey), { lift: 3 });
    const Me = mPlace(M, ex, ey);
    ctx.save(); ctx.setTransform(...Me); ctx.beginPath(); ctx.ellipse(0, 0, rx - 1.5, ry - 1.5, 0, 0, TAU); ctx.clip();
    drawP(ctx, PC.phoPupil, mPlace(Me, look[0] * rx * 0.42, look[1] * ry * 0.38, 0, s.pup), { lift: 2, sa: 0.7 });
    // lid: a sheet of body paper sliding down, tilted (inner corner low when angry)
    const lid = clamp(s.lid);
    if (lid > 0.01) {
      const tilt = (i === 0 ? 1 : -1) * s.lidA;
      const yEdge = -ry + lid * 2 * ry;
      ctx.setTransform(...mmul(Me, mR(tilt)));
      ctx.fillStyle = 'rgba(20,10,10,0.28)'; ctx.fillRect(-rx * 2, yEdge - 3, rx * 4, 9);
      ctx.fillStyle = MP(ctx, 'pho', 41 + i); ctx.fillRect(-rx * 2, -ry * 3, rx * 4, ry * 3 + yEdge);
      ctx.fillStyle = 'rgba(60,45,35,0.55)'; ctx.fillRect(-rx * 2, yEdge - 3, rx * 4, 3);
    }
    ctx.restore();
  }
  // brows on split pins
  const by = s.browY;
  const browA = s.brow * 0.38 + (o.browWig ?? 0);
  const ML = mPlace(M, -58, -134 - by, browA);
  const MR = mPlace(M, 18, -146 - by * (o.browAsym ?? 1), -browA);
  drawP(ctx, PC.phoBrowL, ML, { lift: 5 }); drawP(ctx, PC.phoBrowR, MR, { lift: 5 });
  splitPin(ctx, ML, -2, 0, 6.5); splitPin(ctx, MR, 2, 0, 6.5);
  if (o.faceOnly) return M;
  // mouth (Stickney crater)
  const mo = o.mouth || s.mouth;
  const mm = mPlace(M, 30 + (o.mouthDx ?? 0), 104, o.mouthRot ?? 0, o.mouthS ?? 1);
  drawP(ctx, PC.mouthRim[mo], mm, { lift: 3 });
  drawP(ctx, PC.mouthIn[mo], mm, { lift: 0 });
  // arms on split pins
  const a = s.arms.map((d) => d * D2R);
  const wav = o.armWave ?? 0;
  for (const side of [0, 1]) {
    const sx = side ? 262 : -268, sy = side ? 46 : 58;
    const sh = a[side * 2] + (side ? wav * 0.3 : 0), el = a[side * 2 + 1] + (side ? wav : 0);
    const MU = mPlace(M, sx, sy, sh);
    const MF = mPlace(MU, 72, 0, el);
    drawP(ctx, PC.phoArmU, MU, { lift: 9 });
    drawP(ctx, PC.phoArmF, MF, { lift: 10 });
    splitPin(ctx, MU, 0, 0, 7.5); splitPin(ctx, MF, 0, 0, 7);
  }
  // effects
  const fx = o.fx || {};
  if (fx.sweat > 0) { const u = fx.sweat; drawP(ctx, PC.sweat, mPlace(M, 196, -150 + u * 30, 0.2, 1.3), { lift: 6, alpha: clamp(u * 3) }); }
  if (fx.vein > 0) drawP(ctx, PC.vein, mPlace(M, -200, -160, 0.2, fx.vein * (1 + 0.08 * Math.sin(tq * 30))), { lift: 6 });
  if (fx.shock > 0) for (let k = 0; k < 3; k++) { const ang = -2.2 + k * 0.45; drawP(ctx, PC.shockLine, mPlace(M, Math.cos(ang) * 330, Math.sin(ang) * 270, ang, fx.shock), { lift: 8 }); }
  if (fx.shock2 > 0) for (let k = 0; k < 3; k++) { const ang = -0.95 + k * 0.45; drawP(ctx, PC.shockLine, mPlace(M, Math.cos(ang) * 330, Math.sin(ang) * 270, ang, fx.shock2), { lift: 8 }); }
  if (fx.grawlix > 0) drawP(ctx, PC.grawlix, mPlace(M, fx.gx ?? 150, fx.gy ?? -330, -0.12 + 0.05 * Math.sin(tq * 20), fx.grawlix), { lift: 16 });
  if (fx.cut > 0) drawCutline(ctx, M, fx.cut, fx.snip ?? 0);
  return M;
}
// "cut here" dashed line around a little piece of Pho's head, with scissors
function drawCutline(ctx, M, u, snip) {
  const cx = 196, cy = -112, r = 50;
  const n = 18, shown = Math.floor(n * clamp(u * 1.2));
  ctx.setTransform(...M);
  for (let i = 0; i < shown; i++) {
    const a = -Math.PI * 0.95 + (i / n) * TAU;
    ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = 'rgba(20,10,20,0.3)'; ctx.fillRect(-6 + 2, -4 + 3, 12, 8);
    ctx.fillStyle = MP(ctx, 'amber', 7); ctx.fillRect(-6, -4, 12, 8);
    ctx.restore();
  }
  const a = -Math.PI * 0.95 + (shown / n) * TAU;
  const op = Math.sin(snip * TAU * 2) * 0.25;
  if (u > 0.05) drawP(ctx, PC.scissors, mPlace(M, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, a + Math.PI / 2 + Math.PI, 1.9), { lift: 14 });
}
