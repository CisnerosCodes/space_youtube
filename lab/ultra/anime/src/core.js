// core.js: math, seeded noise, line boil, cel shapes, anime effects. Everything is a pure function of t.
'use strict';
const W = 1080, H = 1920, FPS = 30;
const C = {
  ink: '#0b0b0c', ink2: '#15161f', night: '#0e1230', night2: '#1b2152', night3: '#2c2f6b',
  paper: '#f2efe8', paper2: '#d9d3c6', paper3: '#b9b2a3',
  amber: '#f5b83d', amber2: '#c9861f', amber3: '#ffd77a',
  fur: '#232536', fur2: '#13141d', fur3: '#3a3e5c', furLine: '#4d5276',
  red: '#e2402f', red2: '#9c1f1c', mars: '#c9562f', mars2: '#8a2f1c', mars3: '#ec8a52',
  pho: '#9d8574', pho2: '#6b5648', pho3: '#cbb59f', pho4: '#4a3a31',
  sky: '#cfe3f0', cyan: '#7fd6ff', blue: '#2b5fd9', blue2: '#163a8f', green: '#6fa35a', green2: '#4b7a3e',
  smoke: '#e9e4da', smoke2: '#b7b0a6', smoke3: '#7d7872', fire: '#ffb347', fire2: '#ff6a2a', fire3: '#fff3c4',
};

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const ss = (a, b, x) => smooth(inv(a, b, x));
const E = {
  out: (x) => 1 - Math.pow(1 - clamp(x), 3),
  out5: (x) => 1 - Math.pow(1 - clamp(x), 5),
  in: (x) => Math.pow(clamp(x), 3),
  io: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  back: (x, s = 1.9) => { x = clamp(x) - 1; return 1 + x * x * ((s + 1) * x + s); },
};
// damped spring 0 -> 1, t in seconds
function spring(t, zeta = 0.45, f = 3.2) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
}
// decaying wobble used by hits
const bump = (t, f = 9, d = 7) => (t < 0 ? 0 : Math.exp(-d * t) * Math.sin(2 * Math.PI * f * t));

// ---------- seeded noise ----------
function hash(a, b = 0, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// 1D value noise, smooth
function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed, 7), hash(i + 1, seed, 7), u) * 2 - 1;
}

// ---------- frame state ----------
const G = { t: 0, f: 0, BF: 0, tc: 0, boilPx: 1.6, S: 1 };
function setFrame(t) {
  G.t = t; G.f = Math.round(t * FPS);
  G.BF = Math.floor(G.f / 3);            // line boil: new drawing every 3 frames (10 fps)
  G.tc = Math.floor(G.f / 2) * 2 / FPS;  // character time on twos (15 fps)
}

// ---------- canvas helpers ----------
let ctx = null;
function useCtx(c) { ctx = c; }
// current uniform scale of the transform (px per unit), for constant-pixel boil
function curScale() { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }

// jitter: seed per shape, i per point, changes every boil frame
function jit(seed, i, amp) {
  return [(hash(seed, i * 2, G.BF) - 0.5) * 2 * amp, (hash(seed, i * 2 + 1, G.BF) - 0.5) * 2 * amp];
}
function boilPts(pts, seed, px = G.boilPx) {
  const amp = px / curScale();
  return pts.map((p, i) => { const j = jit(seed, i, amp); return [p[0] + j[0], p[1] + j[1]]; });
}
// Catmull-Rom spline through points as bezier (closed or open)
function splinePath(pts, closed = true, tension = 1) {
  const n = pts.length; if (n < 2) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  const get = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const k = tension / 6;
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}
function polyPath(pts, closed = true) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}
// boiled smooth shape
function shapePath(pts, seed, { smooth: sm = true, closed = true, px } = {}) {
  const b = boilPts(pts, seed, px);
  ctx.beginPath();
  if (sm) splinePath(b, closed); else polyPath(b, closed);
}
// ellipse as points (for boil)
function ellPts(cx, cy, rx, ry, n = 16, rot = 0) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return out;
}
// cel fill: base fill, clipped shadow drawn by fn, outline
function cel(pathFn, { fill, shade, shadeFn, hi, hiFn, line = C.ink, lw = 0, keyline, keyW = 0 }) {
  if (keyline && keyW) { pathFn(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = keyline; ctx.lineWidth = keyW; ctx.stroke(); }
  pathFn(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if ((shade && shadeFn) || (hi && hiFn)) {
    ctx.save(); pathFn(); ctx.clip();
    if (shade && shadeFn) { ctx.fillStyle = shade; ctx.beginPath(); shadeFn(); ctx.fill(); }
    if (hi && hiFn) { ctx.fillStyle = hi; ctx.beginPath(); hiFn(); ctx.fill(); }
    ctx.restore();
  }
  if (lw) { pathFn(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke(); }
}
// boiled stroke line through points
function inkLine(pts, seed, { color = C.ink, lw = 4, smooth: sm = true, cap = 'round', px } = {}) {
  const b = boilPts(pts, seed, px);
  ctx.beginPath(); if (sm) splinePath(b, false); else polyPath(b, false);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke();
}
// tapered brush stroke (thick in middle, thin at ends)
function brush(pts, seed, { color = C.ink, w0 = 1, w1 = 8, px } = {}) {
  const b = boilPts(pts, seed, px);
  const n = b.length; if (n < 2) return;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = b[i], q = b[Math.min(n - 1, i + 1)], o = b[Math.max(0, i - 1)];
    let dx = q[0] - o[0], dy = q[1] - o[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const s = i / (n - 1), w = lerp(w0, w1, Math.sin(Math.PI * s));
    L.push([p[0] - dy * w / 2, p[1] + dx * w / 2]); R.push([p[0] + dy * w / 2, p[1] - dx * w / 2]);
  }
  ctx.beginPath(); splinePath(L.concat(R.reverse()), true); ctx.fillStyle = color; ctx.fill();
}

// ---------- images ----------
const IMG = {};
function loadImg(key, src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => { IMG[key] = im; res(); }; im.onerror = () => rej(new Error('img ' + src)); im.src = src; });
}
// draw image centred at (cx, cy) with width w, rotation r (deg)
function drawImg(key, cx, cy, w, rot = 0, alpha = 1) {
  const im = IMG[key]; if (!im) return; const h = w * im.height / im.width;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
}

// ---------- backgrounds and effects ----------
function fillBg(c) { ctx.fillStyle = c; ctx.fillRect(-200, -200, W + 400, H + 400); }
function vGrad(stops, y0 = 0, y1 = H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([k, c]) => g.addColorStop(k, c)); ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
}
function radGlow(x, y, r, c0, c1 = 'rgba(0,0,0,0)') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}
// 集中線: focus lines converging on (cx, cy). inner radius r0 (lines stop there), count n
function focusLines(cx, cy, r0, { n = 90, color = C.paper, alpha = 0.9, seed = 1, wMax = 22, rate = 2, jitterR = 0.35, reach = 1500 } = {}) {
  const bf = Math.floor(G.f / rate);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (hash(i, seed, bf) - 0.5) * (Math.PI * 2 / n) * 1.4;
    if (hash(i, seed + 3, bf) < 0.18) continue;
    const r1 = r0 * (1 + hash(i, seed + 1, bf) * jitterR * 2);
    const w = wMax * (0.25 + 0.75 * hash(i, seed + 2, bf));
    const ca = Math.cos(a), sa = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cx + ca * r1, cy + sa * r1);
    ctx.lineTo(cx + ca * reach - sa * w, cy + sa * reach + ca * w);
    ctx.lineTo(cx + ca * reach + sa * w, cy + sa * reach - ca * w);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// parallel speed lines moving along angle ang (deg), filling the frame
function speedLines(ang, { n = 40, color = C.paper, alpha = 0.7, seed = 5, speed = 3000, len = [200, 900], w = [2, 10], rate = 1, area = [0, 0, W, H] } = {}) {
  const a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const diag = Math.hypot(area[2], area[3]);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  const cx = area[0] + area[2] / 2, cy = area[1] + area[3] / 2;
  for (let i = 0; i < n; i++) {
    const off = (hash(i, seed, 1) - 0.5) * diag;              // lateral position
    const L = lerp(len[0], len[1], hash(i, seed, 2));
    const ww = lerp(w[0], w[1], hash(i, seed, 3));
    const ph = hash(i, seed, 4) * (diag + L);
    const s = ((G.t * speed / rate + ph) % (diag + L)) - (diag + L) / 2; // along position
    const x0 = cx - sa * off + ca * s, y0 = cy + ca * off + sa * s;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 - ca * L - sa * ww / 2, y0 - sa * L + ca * ww / 2);
    ctx.lineTo(x0 - ca * L + sa * ww / 2, y0 - sa * L - ca * ww / 2);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// camera shake offset (px) from a list of hit times, decaying
function shakeAt(t, hits, amp = 26, dur = 0.5) {
  let x = 0, y = 0, r = 0;
  for (const [th, a = 1] of hits) {
    const d = t - th; if (d < 0 || d > dur) continue;
    const k = Math.exp(-d * 7) * a * amp, q = Math.floor(d * 30);
    x += (hash(q, 11, th * 100 | 0) - 0.5) * 2 * k; y += (hash(q, 12, th * 100 | 0) - 0.5) * 2 * k; r += (hash(q, 13, th * 100 | 0) - 0.5) * 0.02 * k / amp;
  }
  return [x, y, r];
}
// stars as tiny 4-point glints and dots, seeded, drifting
function stars(seed, n, { area = [0, 0, W, H], drift = [0, 0], color = C.paper, alpha = 0.8, size = 3 } = {}) {
  ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    let x = area[0] + hash(i, seed, 1) * area[2] + drift[0] * (0.4 + hash(i, seed, 5));
    let y = area[1] + hash(i, seed, 2) * area[3] + drift[1] * (0.4 + hash(i, seed, 5));
    x = ((x - area[0]) % area[2] + area[2]) % area[2] + area[0];
    y = ((y - area[1]) % area[3] + area[3]) % area[3] + area[1];
    const s = size * (0.4 + hash(i, seed, 3) * 1.2);
    const tw = 0.55 + 0.45 * Math.sin(G.t * (2 + hash(i, seed, 4) * 4) + i);
    ctx.globalAlpha = alpha * tw;
    if (hash(i, seed, 6) > 0.85) { // glint
      ctx.beginPath(); ctx.moveTo(x, y - s * 3); ctx.lineTo(x + s * 0.6, y); ctx.lineTo(x, y + s * 3); ctx.lineTo(x - s * 0.6, y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - s * 3, y); ctx.lineTo(x, y + s * 0.6); ctx.lineTo(x + s * 3, y); ctx.lineTo(x, y - s * 0.6); ctx.closePath(); ctx.fill();
    } else { ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
// anime sparkle (kira) at x,y size s
function kira(x, y, s, color = C.paper, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.18 : s; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
