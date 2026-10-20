// ---------- core: constants, PRNG, math, easing, keyframes, noise, matrices ----------
const W = 1080, H = 1920, FPS = 30;
const AMBER = '#F5B83D', OFFWHITE = '#F2EBDD', INK = '#141218';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// deterministic hash of a number -> [0,1)
function h1(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); }
function h2(a, b) { return h1(a * 12.9898 + b * 78.233); }

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

const E = {
  lin: (t) => t,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sio: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  out: (t) => 1 - Math.pow(1 - t, 3),
  out5: (t) => 1 - Math.pow(1 - t, 5),
  in: (t) => t * t * t,
  in2: (t) => t * t,
  outBack: (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: (t) => { const c1 = 1.7, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  step: (t) => (t < 1 ? 0 : 1),
};

// damped spring step response, x in seconds since start
function spring(x, zeta = 0.35, f = 2.4) {
  if (x <= 0) return 0;
  const w = TAU * f, wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * x) * (Math.cos(wd * x) + (zeta * w / wd) * Math.sin(wd * x));
}
// a decaying wobble (0 at x=0, oscillates, decays)
function wobble(x, f = 3, decay = 4) { if (x <= 0) return 0; return Math.sin(TAU * f * x) * Math.exp(-decay * x); }

// keyframes: keys = [[t, value, ease?], ...]; ease on a key applies to the segment arriving at it
function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k0 = keys[i - 1], k1 = keys[i];
    if (t <= k1[0]) {
      const e = E[k1[2] || 'io'];
      const u = e((t - k0[0]) / (k1[0] - k0[0] || 1));
      const a = k0[1], b = k1[1];
      if (Array.isArray(a)) return a.map((v, j) => lerp(v, b[j], u));
      return lerp(a, b, u);
    }
  }
  return keys[keys.length - 1][1];
}
// step on twos: time quantized to 2-frame steps (stop-motion feel)
const q2 = (t) => Math.floor(t * FPS / 2) * 2 / FPS;
const frameOf = (t) => Math.round(t * FPS);

// value noise (1D) and fbm
function vnoise(seed, x) {
  const i = Math.floor(x), f = x - i;
  const a = h2(seed, i) * 2 - 1, b = h2(seed, i + 1) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
function fbm(seed, x, oct = 3) {
  let s = 0, amp = 1, fr = 1, norm = 0;
  for (let o = 0; o < oct; o++) { s += amp * vnoise(seed + o * 31.7, x * fr); norm += amp; amp *= 0.5; fr *= 2.1; }
  return s / norm;
}

// ---------- 2D affine matrices [a,b,c,d,e,f] (x' = a x + c y + e, y' = b x + d y + f) ----------
const MI = [1, 0, 0, 1, 0, 0];
function mmul(A, B) {
  return [
    A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
    A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
    A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
  ];
}
const mT = (x, y) => [1, 0, 0, 1, x, y];
const mR = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
const mS = (x, y = x) => [x, 0, 0, y, 0, 0];
// base * T(x,y) * R(rot) * S(sx,sy)
function mPlace(base, x, y, rot = 0, sx = 1, sy = sx) {
  let m = mmul(base, mT(x, y));
  if (rot) m = mmul(m, mR(rot));
  if (sx !== 1 || sy !== 1) m = mmul(m, mS(sx, sy));
  return m;
}
const mApply = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
const mScale = (M) => Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2]));

// ---------- polygon helpers ----------
function ellipsePts(cx, cy, rx, ry, n = 64, a0 = 0) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
}
function blobPts(cx, cy, rx, ry, seed, lump = 0.08, n = 72, rot = 0) {
  const p = [];
  const ph = [h1(seed) * TAU, h1(seed + 1) * TAU, h1(seed + 2) * TAU, h1(seed + 3) * TAU];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = 1 + lump * (0.55 * Math.sin(2 * a + ph[0]) + 0.35 * Math.sin(3 * a + ph[1]) + 0.22 * Math.sin(5 * a + ph[2]) + 0.12 * Math.sin(7 * a + ph[3]));
    const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
    p.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return p;
}
function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function rrectPts(x, y, w, h, r, n = 6) {
  const p = [];
  const c = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = (a0 + (i / n) * 90) * D2R; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
function signedArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
function resample(poly, step) {
  const out = [];
  const n = poly.length;
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = carry;
    while (d < L) { const u = d / L; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); d += step; }
    carry = d - L;
  }
  return out.length >= 3 ? out : poly.slice();
}
// displace a closed polygon along its outward normal by noise (torn / cut edges)
function roughen(poly, o = {}) {
  const step = o.step || 4, amp = o.amp ?? 2, freq = o.freq || 0.06, seed = o.seed || 1, bias = o.bias || 0;
  const amp2 = o.amp2 || 0, freq2 = o.freq2 || 0.45;
  const pts = resample(poly, step);
  const n = pts.length, sgn = signedArea(pts) > 0 ? 1 : -1;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], p = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = (dy / L) * sgn, ny = (-dx / L) * sgn;
    const s = i * step;
    const d = bias + amp * fbm(seed, s * freq) + amp2 * vnoise(seed + 77, s * freq2);
    out[i] = [p[0] + nx * d, p[1] + ny * d];
  }
  return out;
}
function bboxOf(polys) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of polys) for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function pathPolys(ctx, polys) {
  ctx.beginPath();
  for (const p of polys) { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
}
// a polyline strip (for arms, threads, legs): returns a closed polygon around the centerline
function stripPts(line, w0, w1 = w0) {
  const L = [], R = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, i / (line.length - 1)) / 2;
    L.push([line[i][0] - (dy / l) * w, line[i][1] + (dx / l) * w]);
    R.push([line[i][0] + (dy / l) * w, line[i][1] - (dx / l) * w]);
  }
  return L.concat(R.reverse());
}
function arcLine(cx, cy, r, a0, a1, n = 24) { const p = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
function quadLine(p0, p1, p2, n = 20) { const p = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; p.push([v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]]); } return p; }
