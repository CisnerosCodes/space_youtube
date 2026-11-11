// chars.js: Night Shift (anime design: echo-mark eyes, headset, oversized jacket) and Pho (grumpy Phobos).
'use strict';

const NS_DEF = {
  turn: 0, tilt: 0, look: [0, 0], lidL: 0, lidR: 0, slant: 0, low: 0, brow: 0, eyeK: 1, pupil: 1,
  mouth: 'w', open: 0, earL: 0, earR: 0, sweat: 0, light: 1, rim: C.amber, rimK: 1, glint: 0, keyW: 0.06,
  squash: 1, blink: 0, fang: 1, shock: 0, tuftUp: 0,
};
// head outline (right half, top -> chin), mirrored for the left
const HEAD_R = [[0, -0.93], [0.42, -0.88], [0.76, -0.64], [0.94, -0.28], [1.14, 0.02], [0.99, 0.12], [1.12, 0.31], [0.9, 0.4], [0.63, 0.63], [0.31, 0.79]];
function headPts(turn) {
  const R = HEAD_R.map(([x, y]) => [x * (1 - 0.1 * turn) + turn * 0.05, y]);
  const L = HEAD_R.slice(1).reverse().map(([x, y]) => [-x * (1 + 0.1 * turn) + turn * 0.05, y]);
  return [...R, [turn * 0.05, 0.83], ...L];
}
function nsHeadPath(p, seed) { return () => shapePath(headPts(p.turn), seed); }

// one ear: side -1 (viewer left) or 1, angle offset a (rad, + = outward droop)
function nsEar(p, side, a, seed) {
  const bx = side * 0.6 + p.turn * 0.05, by = -0.66;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(side * a);
  const outer = [[side * -0.32, -0.16], [side * 0.36, 0.16], [side * 0.42, -0.86 - p.tuftUp * 0.05], [side * 0.24, -0.7]];
  const pts = [[side * -0.34, -0.12], [side * 0.05, -0.62], [side * 0.4, -0.86], [side * 0.36, -0.2], [side * 0.3, 0.14]];
  cel(() => shapePath(pts, seed, { smooth: false }), { fill: C.fur, keyline: C.paper, keyW: p.keyW * 1.05 });
  const inner = [[side * -0.18, -0.12], [side * 0.08, -0.5], [side * 0.3, -0.66], [side * 0.26, -0.16]];
  ctx.fillStyle = '#7a5a2a'; shapePath(inner, seed + 1, { smooth: false }); ctx.fill();
  // fur tufts inside the ear
  inkLine([[side * 0.02, -0.08], [side * 0.12, -0.3], [side * 0.08, -0.42]], seed + 2, { color: C.fur3, lw: 0.025 });
  ctx.restore();
  void outer;
}
function nsEye(p, cx, cy, r, disc, seed, kx) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(kx, 1);
  const lid = clamp(disc ? p.lidL : p.lidR) , low = clamp(p.low), sl = p.slant * (disc ? 1 : -1);
  // eye socket clip so lids cut the eye
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r * 1.08, 0, Math.PI * 2); ctx.clip();
  if (disc) {
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // cel shade on the disc (lower crescent)
    ctx.fillStyle = C.amber2; ctx.beginPath(); ctx.arc(0, 0, r, 0.15 * Math.PI, 0.85 * Math.PI); ctx.arc(0, -r * 0.35, r * 0.95, 0.85 * Math.PI, 0.15 * Math.PI, true); ctx.fill();
    // pupil (slit), shrinks in shock
    const pr = p.pupil;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(p.look[0] * r * 0.32, p.look[1] * r * 0.25, r * 0.17 * pr, r * 0.46 * pr * (p.shock ? 0.4 : 1), 0, 0, Math.PI * 2); ctx.fill();
    // catchlights
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(-r * 0.36, -r * 0.38, r * 0.2, r * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.32, r * 0.36, r * 0.07, 0, Math.PI * 2); ctx.fill();
  } else {
    const sw = r * 6 / 22;
    ctx.strokeStyle = C.amber; ctx.lineWidth = sw; ctx.beginPath(); ctx.arc(0, 0, r - sw / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.amber2; ctx.lineWidth = sw * 0.5; ctx.beginPath(); ctx.arc(0, 0, r - sw * 0.25, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(-r * 0.52, -r * 0.55, r * 0.12, r * 0.09, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  // upper lid (fur), slanted
  if (lid > 0.001 || Math.abs(sl) > 0.01) {
    ctx.fillStyle = C.fur; ctx.save(); ctx.rotate(sl * 0.42);
    const y = -r * 1.1 + lid * r * 2.2 + Math.abs(sl) * r * 0.18;
    ctx.beginPath(); ctx.moveTo(-r * 1.4, -r * 1.6); ctx.lineTo(r * 1.4, -r * 1.6); ctx.lineTo(r * 1.4, y); ctx.quadraticCurveTo(0, y + r * 0.12, -r * 1.4, y); ctx.fill();
    ctx.strokeStyle = C.fur3; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(-r * 1.2, y); ctx.quadraticCurveTo(0, y + r * 0.12, r * 1.2, y); ctx.stroke();
    ctx.restore();
  }
  if (low > 0.001) {
    ctx.fillStyle = C.fur; const y = r * 1.1 - low * r * 1.3;
    ctx.beginPath(); ctx.moveTo(-r * 1.4, r * 1.6); ctx.lineTo(r * 1.4, r * 1.6); ctx.lineTo(r * 1.4, y + r * 0.3); ctx.quadraticCurveTo(0, y - r * 0.35, -r * 1.4, y + r * 0.3); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}
function nsMouth(p, mx, my, seed) {
  const o = clamp(p.open);
  ctx.save(); ctx.translate(mx, my);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // nose
  ctx.fillStyle = C.paper; shapePath([[-0.07, -0.05], [0.07, -0.05], [0, 0.04]], seed, { px: 0.8 }); ctx.fill();
  const t = p.mouth;
  if (t === 'w' && o < 0.08) {
    inkLine([[0, 0.04], [0, 0.09], [-0.07, 0.13], [-0.14, 0.09]], seed + 1, { color: C.paper, lw: 0.035 });
    inkLine([[0, 0.09], [0.07, 0.13], [0.14, 0.09]], seed + 2, { color: C.paper, lw: 0.035 });
  } else if (t === 'smirk' && o < 0.08) {
    inkLine([[0, 0.04], [0, 0.09], [-0.1, 0.12], [-0.17, 0.1]], seed + 1, { color: C.paper, lw: 0.035 });
    inkLine([[0, 0.09], [0.1, 0.11], [0.2, 0.05], [0.25, -0.01]], seed + 2, { color: C.paper, lw: 0.04 });
    if (p.fang) { ctx.fillStyle = C.paper; shapePath([[0.1, 0.105], [0.155, 0.09], [0.135, 0.17]], seed + 3, { smooth: false, px: 0.6 }); ctx.fill(); }
  } else if (t === 'flat' && o < 0.08) {
    inkLine([[0, 0.04], [0, 0.09]], seed + 1, { color: C.paper, lw: 0.035 });
    inkLine([[-0.15, 0.12], [0, 0.1], [0.15, 0.12]], seed + 2, { color: C.paper, lw: 0.035 });
  } else if (t === 'grit') {
    // gritted teeth: wide rectangle of teeth
    const w = 0.3, h = 0.08 + o * 0.06;
    ctx.fillStyle = '#3a0f17'; shapePath([[-w, 0.08], [w, 0.06], [w * 0.9, 0.1 + h], [-w * 0.9, 0.12 + h]], seed, { smooth: false, px: 0.8 }); ctx.fill();
    ctx.fillStyle = C.paper; ctx.fillRect(-w * 0.86, 0.085, w * 1.72, h * 0.95);
    ctx.strokeStyle = C.paper3; ctx.lineWidth = 0.012; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.3, 0.085); ctx.lineTo(i * w * 0.3, 0.09 + h); ctx.stroke(); }
    ctx.strokeStyle = C.paper; ctx.lineWidth = 0.03; shapePath([[-w, 0.08], [w, 0.06], [w * 0.9, 0.1 + h], [-w * 0.9, 0.12 + h]], seed, { smooth: false, px: 0.8 }); ctx.stroke();
  } else {
    // open mouth: shape grows with o; 'shout' is wider and taller; 'smirk'/'grin' lopsided
    const wide = t === 'shout' ? 0.3 : t === 'grin' ? 0.27 : 0.17;
    const h = 0.05 + o * (t === 'shout' ? 0.42 : 0.22);
    const lift = t === 'smirk' || t === 'grin' ? 0.05 : 0;
    const pts = [[-wide, 0.08 - lift * 0.3], [0, 0.1], [wide, 0.07 - lift], [wide * 0.65, 0.1 + h * 0.75], [0, 0.11 + h], [-wide * 0.65, 0.1 + h * 0.7]];
    ctx.fillStyle = '#3a0f17'; shapePath(pts, seed + 4, { px: 0.8 }); ctx.fill();
    ctx.save(); shapePath(pts, seed + 4, { px: 0.8 }); ctx.clip();
    ctx.fillStyle = '#c4485a'; ctx.beginPath(); ctx.ellipse(0, 0.12 + h, wide * 0.6, h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    if (p.fang) { ctx.fillStyle = C.paper; ctx.beginPath(); ctx.moveTo(-wide * 0.62, 0.08); ctx.lineTo(-wide * 0.3, 0.085); ctx.lineTo(-wide * 0.47, 0.08 + 0.07 + o * 0.03); ctx.fill(); ctx.beginPath(); ctx.moveTo(wide * 0.3, 0.08); ctx.lineTo(wide * 0.62, 0.075); ctx.lineTo(wide * 0.47, 0.08 + 0.07 + o * 0.03); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = C.paper; ctx.lineWidth = 0.03; shapePath(pts, seed + 4, { px: 0.8 }); ctx.stroke();
    inkLine([[0, 0.04], [0, 0.1]], seed + 5, { color: C.paper, lw: 0.03 });
  }
  ctx.restore();
}
// Night Shift head at (x, y), size = px per head unit
function drawNSHead(x, y, size, p0 = {}) {
  const p = Object.assign({}, NS_DEF, p0);
  const seed = 100;
  ctx.save(); ctx.translate(x, y); ctx.rotate(p.tilt); ctx.scale(size, size * p.squash);
  G.S = size;
  const T = p.turn;
  // ears behind the head
  nsEar(p, -1, p.earL, seed + 10);
  nsEar(p, 1, p.earR, seed + 20);
  const L = p.light;
  // tuft (anime spikes)
  const tu = p.tuftUp;
  const tuft = [[-0.42 + T * 0.1, -0.6], [-0.5 + T * 0.1, -1.12 - tu * 0.1], [-0.16 + T * 0.1, -0.96], [-0.08 + T * 0.1, -1.42 - tu * 0.14], [0.16 + T * 0.1, -1.0], [0.5 + T * 0.1, -1.24 - tu * 0.1], [0.36 + T * 0.1, -0.9], [0.46 + T * 0.1, -0.6]];
  cel(() => shapePath(tuft, seed + 30, { smooth: false }), { fill: C.fur, keyline: C.paper, keyW: p.keyW * 1.6 });
  // head
  const hp = nsHeadPath(p, seed);
  cel(hp, {
    fill: C.fur, keyline: C.paper, keyW: p.keyW * 2,
    shade: C.fur2, shadeFn: () => { ctx.ellipse(-L * 1.75 + T * 0.1, 0.1, 1.2, 1.5, 0, 0, Math.PI * 2); },
  });
  // rim light: thin hard stroke along the lit edge
  if (p.rimK > 0) {
    ctx.save(); hp(); ctx.clip();
    ctx.beginPath(); ctx.rect(L > 0 ? 0.18 + T * 0.1 : -3, -3, 2.82 + (L > 0 ? 0 : 0.18), 6); ctx.clip();
    ctx.globalAlpha = p.rimK; hp(); ctx.strokeStyle = p.rim; ctx.lineWidth = 0.2; ctx.stroke();
    ctx.restore();
  }
  // anime hair shine on the crown
  ctx.save(); hp(); ctx.clip();
  ctx.fillStyle = C.fur3; shapePath([[-0.55 + T * 0.1, -0.62], [-0.3 + T * 0.1, -0.72], [-0.18 + T * 0.1, -0.62], [0.0 + T * 0.1, -0.74], [0.16 + T * 0.1, -0.63], [0.42 + T * 0.1, -0.72], [0.58 + T * 0.1, -0.6], [0.4 + T * 0.1, -0.56], [0.16 + T * 0.1, -0.52], [0.0 + T * 0.1, -0.6], [-0.18 + T * 0.1, -0.5], [-0.3 + T * 0.1, -0.6]], seed + 35, { smooth: false }); ctx.fill();
  ctx.restore();
  // headset band (in front of the head)
  const band = [[-1.02, -0.12], [-0.9, -0.55], [-0.5, -0.83], [0.5, -0.83], [0.9, -0.55], [1.02, -0.12]].map(([a, b]) => [a + T * 0.04, b]);
  inkLine(band, seed + 40, { color: C.ink, lw: 0.12 });
  inkLine(band, seed + 40, { color: C.paper, lw: 0.07 });
  inkLine(band.slice(1, 5).map(([a, b]) => [a, b + 0.015]), seed + 41, { color: C.paper3, lw: 0.025 });
  // face features
  const fx = T * 0.24;
  const er = 0.3 * p.eyeK;
  const kL = 1 - Math.max(0, T) * 0.3, kR = 1 - Math.max(0, -T) * 0.3;
  const ex = 0.41;
  nsEye(p, -ex + fx, 0.0, er, true, seed + 50, kL);
  nsEye(p, ex + fx, 0.0, er, false, seed + 60, kR);
  // brows (paper bars)
  const by = -0.42 - p.brow * 0.12 - (p.eyeK - 1) * 0.3;
  const bs = p.slant;
  ctx.save(); ctx.translate(-ex + fx, by); ctx.rotate(bs * 0.45 + p.brow * -0.08);
  ctx.fillStyle = C.paper; shapePath([[-0.15, -0.035], [0.15, -0.035 + bs * 0.0], [0.14, 0.04], [-0.16, 0.035]], seed + 70, { smooth: false, px: 0.8 }); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(ex + fx, by); ctx.rotate(-bs * 0.45 + p.brow * 0.08);
  ctx.fillStyle = C.paper; shapePath([[-0.15, -0.035], [0.15, -0.035], [0.16, 0.035], [-0.14, 0.04]], seed + 71, { smooth: false, px: 0.8 }); ctx.fill(); ctx.restore();
  // whiskers
  const wy = 0.38;
  for (let s of [-1, 1]) for (let i = 0; i < 2; i++) {
    const x0 = s * 0.42 + fx * 0.9, y0 = wy + i * 0.07;
    inkLine([[x0, y0], [x0 + s * 0.28, y0 - 0.04 + i * 0.07], [x0 + s * 0.5, y0 - 0.02 + i * 0.13]], seed + 80 + i + (s > 0 ? 5 : 0), { color: C.paper, lw: 0.018 });
  }
  nsMouth(p, fx * 0.95, 0.3, seed + 90);
  // sweat drops
  if (p.sweat > 0) {
    const k = p.sweat;
    ctx.save(); ctx.translate(0.92 + fx * 0.3, -0.48 + (1 - k) * -0.1); ctx.scale(k, k);
    ctx.fillStyle = C.cyan; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
    shapePath([[0, -0.2], [0.09, 0.02], [0.06, 0.1], [-0.06, 0.1], [-0.09, 0.02]], seed + 95, { px: 0.6 }); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-0.02, 0.03, 0.025, 0.045, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // ear cups + mic (on top)
  for (const s of [-1, 1]) {
    const cx = s * 1.04 + T * 0.04, cy = -0.06;
    const pts = [[cx - 0.11, cy - 0.21], [cx + 0.11, cy - 0.21], [cx + 0.13, cy + 0.2], [cx - 0.13, cy + 0.2]];
    cel(() => { ctx.beginPath(); ctx.roundRect(cx - 0.12, cy - 0.22, 0.24, 0.44, 0.09); }, { fill: C.paper, shade: C.paper3, shadeFn: () => ctx.rect(cx - 0.12, cy + 0.04, 0.24, 0.3), line: C.ink, lw: 0.035 });
    void pts;
  }
  const mic = [[-1.02 + T * 0.04, 0.12], [-0.92, 0.42], [-0.66 + fx * 0.5, 0.56], [-0.42 + fx * 0.7, 0.55]];
  inkLine(mic, seed + 97, { color: C.ink, lw: 0.075 });
  inkLine(mic, seed + 97, { color: C.paper, lw: 0.04 });
  ctx.save(); ctx.translate(-0.4 + fx * 0.7, 0.53); ctx.rotate(-0.35);
  ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.roundRect(-0.03, -0.055, 0.15, 0.11, 0.05); ctx.fill(); ctx.stroke();
  ctx.restore();
  // glint star on the disc eye
  if (p.glint > 0) { kira(-ex + fx - er * 0.35, -0.02 - er * 0.38, 0.32 * p.glint, '#fffdf2', G.t * 2); }
  ctx.restore();
}

// ----- bust: neck, collar, jacket, arms. Coordinates in head units; head centre at (0,0) -----
// arms: {L: {e:[x,y], w:[x,y], paw:'fist'|'open'|'point'|'flat'|'mitt', pr: paw rotation}, R: ...}
function drawNSBust(x, y, size, p0 = {}, arms = {}, opt = {}) {
  const p = Object.assign({}, NS_DEF, p0);
  const seed = 300; const T = p.turn; const L = p.light;
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size); G.S = size;
  const flap = opt.flap || 0; // jacket flutter
  const bob = opt.bob || 0;
  ctx.translate(0, bob);
  // torso (jacket) points
  const sh = 1.28, bot = opt.bottom || 3.4;
  const fl = (i) => Math.sin(G.tc * 9 + i * 1.7) * 0.05 * flap;
  const jacket = [[-0.5, 0.95], [-1.05, 1.18], [-sh - 0.06, 1.42], [-1.55 + fl(1), 2.2], [-1.62 + fl(2), bot], [1.62 + fl(3), bot], [1.55 + fl(4), 2.2], [sh + 0.06, 1.42], [1.05, 1.18], [0.5, 0.95]];
  // back arms first if they are behind
  for (const side of ['L', 'R']) if (arms[side] && arms[side].behind) nsArm(side, arms[side], seed + (side === 'L' ? 500 : 600), p);
  // neck
  cel(() => shapePath([[-0.34, 0.55], [0.34, 0.55], [0.38, 1.25], [-0.38, 1.25]], seed + 1, { smooth: false }), { fill: C.fur, keyline: C.paper, keyW: p.keyW * 2, shade: C.fur2, shadeFn: () => ctx.rect(-0.5, 0.55, 1, 0.28) });
  // jacket body
  cel(() => shapePath(jacket, seed + 2), {
    fill: C.paper, keyline: C.ink, keyW: 0.09,
    shade: C.paper3, shadeFn: () => { ctx.ellipse(-L * 2.0, 2.3, 1.35, 1.9, 0, 0, Math.PI * 2); ctx.rect(-2, 1.0, 4, 0.22); },
    hi: '#fffdf6', hiFn: () => { ctx.ellipse(L * 1.05, 1.55, 0.3, 0.12, 0.4 * L, 0, Math.PI * 2); },
  });
  // V opening (dark shirt/fur)
  cel(() => shapePath([[-0.42, 1.02], [0.42, 1.02], [0.06, 2.05], [-0.06, 2.05]], seed + 3, { smooth: false }), { fill: C.fur, line: C.ink, lw: 0.04 });
  // zipper line + folds
  inkLine([[0, 2.05], [0.02, 2.7], [0, bot]], seed + 4, { color: C.ink, lw: 0.035 });
  inkLine([[-1.1, 2.1], [-0.9, 2.6], [-0.95, 3.1]], seed + 5, { color: C.paper3, lw: 0.03 });
  inkLine([[1.0, 2.3], [0.85, 2.8]], seed + 6, { color: C.paper3, lw: 0.03 });
  // echo mark on the chest (viewer right)
  ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(0.5, 2.0, 0.085, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.amber; ctx.lineWidth = 0.085 * 6 / 22 * 1.6; ctx.beginPath(); ctx.arc(0.5 + 0.085 * 60 / 22, 2.0, 0.085 - 0.012, 0, Math.PI * 2); ctx.stroke();
  // collar flaps (stand-up)
  for (const s of [-1, 1]) {
    const pts = [[s * 0.28, 0.66], [s * 0.72, 0.86], [s * 0.66, 1.3], [s * 0.4, 1.38], [s * 0.12, 1.08]];
    cel(() => shapePath(pts, seed + 10 + (s > 0 ? 1 : 0), { smooth: false }), { fill: C.paper, shade: C.paper2, shadeFn: () => ctx.rect(s > 0 ? 0 : -1, 1.05, 1, 0.5), line: C.ink, lw: 0.045 });
  }
  // headset cable into collar
  inkLine([[-1.0, 0.2], [-0.95, 0.6], [-0.7, 0.9]], seed + 12, { color: C.paper3, lw: 0.035 });
  for (const side of ['L', 'R']) if (arms[side] && !arms[side].behind && !arms[side].front) nsArm(side, arms[side], seed + (side === 'L' ? 500 : 600), p);
  ctx.restore();
  drawNSHead(x + 0 * size, y + bob * size, size, p);
  ctx.save(); ctx.translate(x, y + bob * size); ctx.scale(size, size);
  for (const side of ['L', 'R']) if (arms[side] && arms[side].front) nsArm(side, arms[side], seed + (side === 'L' ? 500 : 600), p);
  ctx.restore();
}
// arm: shoulder fixed by side; e = elbow, w = wrist (head units)
function nsArm(side, a, seed, p) {
  const s = side === 'L' ? -1 : 1;
  const sh = [s * 1.2, 1.5];
  const e = a.e, w = a.w;
  // sleeve as a tapered tube shoulder -> elbow -> wrist
  const tube = (pts, w0, w1) => {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
      let dx = q[0] - o[0], dy = q[1] - o[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const ww = lerp(w0, w1, i / (pts.length - 1)) / 2;
      L.push([pts[i][0] - dy * ww, pts[i][1] + dx * ww]); R.push([pts[i][0] + dy * ww, pts[i][1] - dx * ww]);
    }
    return L.concat(R.reverse());
  };
  const mid1 = [(sh[0] + e[0]) / 2, (sh[1] + e[1]) / 2], mid2 = [(e[0] + w[0]) / 2, (e[1] + w[1]) / 2];
  const pts = tube([sh, mid1, e, mid2, w], 0.62, 0.48);
  cel(() => shapePath(pts, seed), { fill: C.paper, keyline: C.ink, keyW: 0.08, shade: C.paper3, shadeFn: () => ctx.ellipse(e[0] - s * 0.1, e[1] + 0.25, 0.35, 0.25, 0, 0, Math.PI * 2) });
  inkLine([[e[0] - 0.12, e[1] - 0.05], [e[0], e[1] + 0.06], [e[0] + 0.12, e[1] - 0.04]], seed + 1, { color: C.paper3, lw: 0.03 });
  // cuff
  const ang = Math.atan2(w[1] - e[1], w[0] - e[0]);
  ctx.save(); ctx.translate(w[0], w[1]); ctx.rotate(ang);
  cel(() => { ctx.beginPath(); ctx.roundRect(-0.12, -0.27, 0.16, 0.54, 0.05); }, { fill: C.paper2, line: C.ink, lw: 0.04 });
  ctx.restore();
  // paw
  const pr = a.pr != null ? a.pr : ang;
  const pk = a.pk || 1;
  ctx.save(); ctx.translate(w[0] + Math.cos(ang) * 0.18, w[1] + Math.sin(ang) * 0.18); ctx.rotate(pr); ctx.scale(pk, pk);
  nsPaw(a.paw || 'mitt', seed + 5, s);
  ctx.restore();
}
// paw drawn along +x (pointing direction)
function nsPaw(type, seed, s) {
  const k = { fill: C.fur, keyline: C.paper, keyW: 0.06 };
  if (type === 'point') {
    cel(() => shapePath([[-0.05, -0.2], [0.18, -0.2], [0.24, -0.08], [0.55, -0.1], [0.6, -0.02], [0.55, 0.05], [0.24, 0.06], [0.22, 0.2], [-0.05, 0.22], [-0.12, 0]], seed), k);
    inkLine([[0.05, 0.08], [0.18, 0.1]], seed + 1, { color: C.fur3, lw: 0.025 });
  } else if (type === 'fist') {
    cel(() => shapePath([[-0.1, -0.2], [0.2, -0.24], [0.32, -0.08], [0.3, 0.14], [0.14, 0.24], [-0.1, 0.2], [-0.16, 0]], seed), k);
    for (let i = 0; i < 3; i++) inkLine([[0.16, -0.14 + i * 0.12], [0.3, -0.12 + i * 0.12]], seed + 2 + i, { color: C.fur3, lw: 0.025 });
  } else if (type === 'open' || type === 'flat') {
    const sp = type === 'open' ? 1 : 0.35;
    const pts = [[-0.1, -0.2]];
    for (let i = 0; i < 4; i++) { const a = (-0.55 + i * 0.37) * sp; pts.push([0.22 + Math.cos(a) * 0.2, Math.sin(a) * 0.28 - 0.02], [0.3 + Math.cos(a) * 0.26, Math.sin(a) * 0.34 - 0.02]); }
    pts.push([-0.1, 0.22], [-0.16, 0]);
    cel(() => shapePath(pts, seed), k);
  } else {
    cel(() => shapePath(ellPts(0.08, 0, 0.24, 0.2, 10), seed), k);
  }
}

// ----- Pho: the grumpy Phobos (drawn illustration, not the photo) -----
const PHO_DEF = { look: [0, 0], expr: 'grumpy', lid: 0.45, brow: 0, mouthK: 0, vein: 0, sweat: 0, squash: 1, shake: 0, light: 1, rim: C.amber, flinch: 0, piece: 0 };
function phoPts() {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = 1 + 0.07 * Math.sin(3 * a + 1.1) + 0.045 * Math.sin(5 * a + 2.3) + 0.03 * Math.sin(7 * a + 0.4) - (a > 0.2 && a < 1.1 ? 0.06 * Math.sin((a - 0.2) / 0.9 * Math.PI) : 0);
    pts.push([Math.cos(a) * r * 1.12, Math.sin(a) * r * 0.9]);
  }
  return pts;
}
const PHO_PTS = phoPts();
const PHO_CRATERS = [[0.62, 0.42, 0.3, 'big'], [-0.72, -0.36, 0.13], [-0.55, 0.5, 0.11], [0.15, -0.68, 0.1], [0.7, -0.3, 0.09], [-0.95, 0.12, 0.08], [0.35, 0.68, 0.07], [-0.2, 0.74, 0.08], [0.9, 0.05, 0.06], [-0.4, -0.66, 0.06]];
function drawPho(x, y, size, p0 = {}, rot = 0) {
  const p = Object.assign({}, PHO_DEF, p0);
  const seed = 900;
  ctx.save(); ctx.translate(x + (p.shake ? (hash(G.f, 3, 1) - 0.5) * p.shake : 0), y); ctx.rotate(rot); ctx.scale(size, size * p.squash); G.S = size;
  const L = p.light;
  const body = () => shapePath(PHO_PTS, seed);
  cel(body, {
    fill: C.pho, keyline: C.ink, keyW: 0.05,
    shade: C.pho2, shadeFn: () => ctx.ellipse(-L * 1.25, 0.55, 1.35, 1.1, 0, 0, Math.PI * 2),
    hi: C.pho3, hiFn: () => ctx.ellipse(L * 0.65, -0.62, 0.55, 0.22, L * 0.45, 0, Math.PI * 2),
  });
  // rim light
  ctx.save(); body(); ctx.clip(); ctx.beginPath(); ctx.rect(L > 0 ? 0.1 : -3, -3, 2.9, 6); ctx.clip(); ctx.globalAlpha = 0.9; body(); ctx.strokeStyle = p.rim; ctx.lineWidth = 0.13; ctx.stroke(); ctx.restore();
  // grooves
  ctx.save(); body(); ctx.clip();
  for (let i = 0; i < 5; i++) inkLine([[-1.1, -0.2 + i * 0.13], [-0.3, -0.42 + i * 0.12], [0.6, -0.52 + i * 0.11]], seed + 40 + i, { color: C.pho2, lw: 0.018 });
  // craters
  PHO_CRATERS.forEach(([cx, cy, r, big], i) => {
    const pts = ellPts(cx, cy, r, r * 0.8, 10, 0.3);
    cel(() => shapePath(pts, seed + 60 + i), { fill: C.pho2, shade: C.pho4, shadeFn: () => ctx.ellipse(cx - r * 0.25, cy - r * 0.25, r * 0.9, r * 0.6, 0.3, 0, Math.PI * 2), line: C.pho4, lw: 0.02 });
    inkLine(ellPts(cx + r * 0.05, cy + r * 0.05, r * 1.02, r * 0.82, 10, 0.3).slice(1, 5), seed + 80 + i, { color: C.pho3, lw: big ? 0.04 : 0.022 });
  });
  ctx.restore();
  // the 'piece' outline: dashed amber cut line around a patch
  if (p.piece > 0) {
    ctx.save(); ctx.setLineDash([0.07, 0.05]); ctx.lineDashOffset = -G.t * 0.4;
    const pts = ellPts(-0.62, 0.12, 0.26, 0.2, 9, 0.4);
    shapePath(pts, seed + 99); ctx.strokeStyle = C.amber; ctx.lineWidth = 0.035 * p.piece; ctx.stroke(); ctx.restore();
  }
  // face
  const e = p.expr;
  const eyeY = -0.1, exL = -0.36, exR = 0.26;
  if (e === 'flinch') {
    inkLine([[exL - 0.14, eyeY - 0.08], [exL + 0.1, eyeY], [exL - 0.14, eyeY + 0.08]], seed + 10, { color: C.ink, lw: 0.06, smooth: false });
    inkLine([[exR + 0.14, eyeY - 0.08], [exR - 0.1, eyeY], [exR + 0.14, eyeY + 0.08]], seed + 11, { color: C.ink, lw: 0.06, smooth: false });
    inkLine([[-0.22, 0.32], [-0.12, 0.27], [-0.02, 0.33], [0.08, 0.27], [0.18, 0.32]], seed + 12, { color: C.ink, lw: 0.045, smooth: false });
  } else {
    const wide = e === 'alarm' ? 1 : 0;
    for (const [ex, sd] of [[exL, -1], [exR, 1]]) {
      const rx = 0.15 + wide * 0.03, ry = 0.13 + wide * 0.05;
      ctx.save(); ctx.translate(ex, eyeY);
      ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(p.look[0] * rx * 0.55, p.look[1] * ry * 0.5 + 0.02, wide ? 0.035 : 0.06, 0, Math.PI * 2); ctx.fill();
      // heavy grumpy lid, slanted down toward the centre
      const lid = wide ? 0 : p.lid;
      if (lid > 0) {
        ctx.fillStyle = C.pho2; ctx.rotate(sd * (e === 'furious' ? -0.45 : -0.22));
        ctx.fillRect(-0.4, -0.4, 0.8, 0.4 - ry + lid * ry * 2 - 0.0);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(-0.3, -ry + lid * ry * 2); ctx.lineTo(0.3, -ry + lid * ry * 2); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      // brow
      const ba = e === 'furious' ? 0.55 : e === 'alarm' ? -0.25 : 0.32;
      const byy = eyeY - 0.24 - (wide ? 0.08 : 0) - p.brow * 0.06;
      ctx.save(); ctx.translate(ex, byy); ctx.rotate(sd * -ba);
      ctx.fillStyle = C.pho4; shapePath([[-0.2, -0.04], [0.2, -0.05], [0.21, 0.04], [-0.2, 0.05]], seed + 20 + (sd > 0 ? 1 : 0), { smooth: false, px: 0.6 }); ctx.fill();
      ctx.restore();
    }
    // mouth
    if (e === 'alarm') {
      ctx.fillStyle = C.pho4; ctx.beginPath(); ctx.ellipse(-0.04, 0.3, 0.07, 0.09 + p.mouthK * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    } else if (e === 'furious') {
      const pts = [[-0.24, 0.3], [0.16, 0.28], [0.14, 0.4], [-0.22, 0.42]];
      ctx.fillStyle = C.pho4; shapePath(pts, seed + 30, { smooth: false }); ctx.fill();
      ctx.fillStyle = '#efe6d2'; ctx.fillRect(-0.2, 0.31, 0.33, 0.045); ctx.fillRect(-0.19, 0.365, 0.31, 0.04);
    } else {
      inkLine([[-0.26, 0.36], [-0.12, 0.28], [0.04, 0.27], [0.16, 0.34]], seed + 31, { color: C.pho4, lw: 0.055 });
    }
  }
  // anger vein mark (four curved ticks)
  if (p.vein > 0) {
    ctx.save(); ctx.translate(0.55, -0.55); ctx.scale(p.vein, p.vein); ctx.strokeStyle = C.red; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0.05, 0.16); ctx.quadraticCurveTo(0.07, 0.07, 0.16, 0.05); ctx.stroke(); }
    ctx.restore();
  }
  if (p.sweat > 0) {
    ctx.save(); ctx.translate(-0.78, -0.45); ctx.scale(p.sweat, p.sweat);
    ctx.fillStyle = C.cyan; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
    shapePath([[0, -0.16], [0.07, 0.02], [0.05, 0.08], [-0.05, 0.08], [-0.07, 0.02]], seed + 97, { px: 0.6 }); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
