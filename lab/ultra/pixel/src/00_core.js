// ===== 00_core.js: palette, framebuffer, primitives, PRNG, easing =====
// Everything is drawn at 270 x 480 into a Uint32Array, then upscaled x4 nearest-neighbour.
'use strict';
const W = 270, H = 480, FPS = 30;

// ---- Palette (one fixed 16-bit style palette; every pixel on screen is one of these, except the
// real NASA images, which are re-quantized to sub-ramps of this same palette).
const HEX = {
  // space and UI
  K0: '#07060d', K1: '#0f0e1c', K2: '#1a1830', K3: '#2a2648', K4: '#3e3a66', K5: '#5a5890', K6: '#8582b8',
  // paper / suit
  P0: '#f2efe8', P1: '#cdc8d8', P2: '#8e8aa4', P3: '#5c5874',
  // amber (the channel accent)
  A0: '#f5b83d', A1: '#ffdf8a', A2: '#c47c22', A3: '#7c4618', A4: '#4a2610',
  // Mars reds
  R0: '#2a100c', R1: '#521c12', R2: '#7e2e1a', R3: '#a84824', R4: '#cf703c', R5: '#e8a066', R6: '#f6d2a6',
  // Phobos browns and cool greys
  H0: '#1a1412', H1: '#362a24', H2: '#56463c', H3: '#7a6658', H4: '#9e8878', H5: '#c4ae9c', H6: '#e4d6c6',
  Q1: '#4c4e5c', Q2: '#6e7282', Q3: '#9a9eac',
  // blues and greens (Earth, ocean, solar panels, glass)
  B0: '#0c214a', B1: '#173f86', B2: '#2e6ec4', B3: '#69aee8', B4: '#b6e0f8',
  G0: '#123c2a', G1: '#22663e', G2: '#4a9a4e', G3: '#8cc860',
  // fire
  F0: '#c8241c', F1: '#f2601c', F2: '#ffb232', F3: '#fff2b8',
  // misc
  T0: '#0d2a33', T1: '#174652', T2: '#2a7280', // comm-window teal
  M0: '#5a1020', M1: '#b0384a', // mouth
};
const C = {};
const RGB = {};
for (const k in HEX) {
  const h = HEX[k];
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  C[k] = (255 << 24 | b << 16 | g << 8 | r) >>> 0;
  RGB[k] = [r, g, b];
}
const CLEAR = 0;

// ---- framebuffer
const FB = new Uint32Array(W * H);
let CAM_X = 0, CAM_Y = 0; // global integer offset (screen shake), applied by world-space draws

function clearFB(c) { FB.fill(c); }
function px(x, y, c) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  FB[y * W + x] = c;
}
function getpx(x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return 0; return FB[y * W + x]; }
function rect(x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let j = y0; j < y1; j++) FB.fill(c, j * W + x0, j * W + x1);
}
function hline(x0, x1, y, c) { if (x1 < x0) [x0, x1] = [x1, x0]; rect(x0, y, x1 - x0 + 1, 1, c); }
function vline(x, y0, y1, c) { if (y1 < y0) [y0, y1] = [y1, y0]; rect(x, y0, 1, y1 - y0 + 1, c); }
function line(x0, y0, x1, y1, c, target) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const put = target ? (x, y) => target.set(x, y, c) : (x, y) => px(x, y, c);
  for (let n = 0; n < 2000; n++) {
    put(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
// pixel-art filled circle; cx, cy may be half-integers for even diameters
function disc(cx, cy, r, c, target) {
  const put = target ? (x, y) => target.set(x, y, c) : (x, y) => px(x, y, c);
  const rr = r * r + r * 0.6;
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rr) put(x, y);
    }
}
function ring(cx, cy, r, c, th, target) {
  th = th || 1;
  const put = target ? (x, y) => target.set(x, y, c) : (x, y) => px(x, y, c);
  const ro = r * r + r * 0.6, ri = (r - th) * (r - th) + (r - th) * 0.6;
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = dx * dx + dy * dy;
      if (d <= ro && d > ri) put(x, y);
    }
}
function ellipse(cx, cy, rx, ry, c, target) {
  const put = target ? (x, y) => target.set(x, y, c) : (x, y) => px(x, y, c);
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / (rx + 0.3), dy = (y + 0.5 - cy) / (ry + 0.3);
      if (dx * dx + dy * dy <= 1) put(x, y);
    }
}
// scanline polygon fill (pts = [[x,y],...]), pixel centres
function poly(pts, c, target) {
  const put = target ? (x, y) => target.set(x, y, c) : (x, y) => px(x, y, c);
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) put(x, y);
  }
}
function thick(x0, y0, x1, y1, w, c, target) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c, target);
  }
}

// ---- off-screen sprite buffers (0 = transparent)
class Spr {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  set(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = c; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
}
// sprite from rows of chars and a key map
function sprFromRows(rows, key) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const s = new Spr(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
    const ch = rows[y][x];
    if (ch !== '.' && ch !== ' ' && key[ch] !== undefined) s.set(x, y, C[key[ch]] ?? key[ch]);
  }
  return s;
}
// 1-px outline around opaque pixels (8-neighbourhood if diag)
function outlined(s, c, diag) {
  const o = new Spr(s.w + 2, s.h + 2);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.d[y * s.w + x]) o.d[(y + 1) * o.w + x + 1] = s.d[y * s.w + x];
  const src = o.d.slice();
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    if (src[y * o.w + x]) continue;
    let hit = false;
    for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!diag && dx && dy) continue;
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < o.w && yy < o.h && src[yy * o.w + xx]) { hit = true; break; }
    }
    if (hit) o.d[y * o.w + x] = c;
  }
  o.ox = 1; o.oy = 1;
  return o;
}
// blit sprite at integer screen position (top-left), optional horizontal flip, solid recolor
function blit(s, x, y, opt) {
  x = Math.round(x); y = Math.round(y);
  const flip = opt && opt.flip, solid = opt && opt.solid, clipY = opt && opt.clipY;
  for (let j = 0; j < s.h; j++) {
    const yy = y + j; if (yy < 0 || yy >= H) continue;
    if (clipY !== undefined && yy >= clipY) continue;
    for (let i = 0; i < s.w; i++) {
      const c = s.d[j * s.w + (flip ? s.w - 1 - i : i)];
      if (!c) continue;
      const xx = x + i; if (xx < 0 || xx >= W) continue;
      FB[yy * W + xx] = solid || c;
    }
  }
}
// blit with integer scale
function blitScaled(s, x, y, k, opt) {
  x = Math.round(x); y = Math.round(y);
  for (let j = 0; j < s.h * k; j++) for (let i = 0; i < s.w * k; i++) {
    const c = s.d[((j / k) | 0) * s.w + ((i / k) | 0)];
    if (c) px(x + i, y + j, (opt && opt.solid) || c);
  }
}
// rotate sprite by angle (nearest neighbour, about its centre); returns new sprite
function rotSpr(s, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const R = Math.ceil(Math.hypot(s.w, s.h) / 2) + 1;
  const o = new Spr(2 * R, 2 * R);
  const cx = s.w / 2, cy = s.h / 2;
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const dx = x + 0.5 - R, dy = y + 0.5 - R;
    const sx = Math.floor(ca * dx + sa * dy + cx), sy = Math.floor(-sa * dx + ca * dy + cy);
    if (sx >= 0 && sy >= 0 && sx < s.w && sy < s.h) o.d[y * o.w + x] = s.d[sy * s.w + sx];
  }
  o.R = R;
  return o;
}

// ---- seeded PRNG (mulberry32) and hash noise
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(i, j) {
  let h = (i | 0) * 374761393 + (j | 0) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---- easing and helpers
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sat = (x) => clamp(x, 0, 1);
const ramp = (f, f0, f1) => sat((f - f0) / (f1 - f0));
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eout = (t) => 1 - Math.pow(1 - t, 3);
const ein = (t) => t * t * t;
const eback = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
// damped spring 0 -> 1 (overshoot), t in seconds
function spring(t, zeta, freq) {
  if (t <= 0) return 0;
  zeta = zeta ?? 0.45; freq = freq ?? 3.2;
  const w = 2 * Math.PI * freq, wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
}
// step a value to game cadence (hold for n frames)
const cad = (f, n) => Math.floor(f / n) * n;

// Bayer 4x4 ordered-dither matrix, values in [-0.5, 0.5)
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];
// dithered 2-colour fill: frac 0..1 of colour b over a
function ditherRect(x, y, w, h, a, b, frac) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const xx = Math.round(x) + i, yy = Math.round(y) + j;
    px(xx, yy, bayer(xx, yy) + 0.5 < frac ? b : a);
  }
}

// ---- present: framebuffer -> 1080 x 1920 canvas, nearest-neighbour x4
let _lowCv = null, _lowCtx = null, _img = null, _outCtx = null;
function present() {
  if (!_lowCv) {
    _lowCv = document.createElement('canvas'); _lowCv.width = W; _lowCv.height = H;
    _lowCtx = _lowCv.getContext('2d'); _img = _lowCtx.createImageData(W, H);
    _outCtx = document.getElementById('out').getContext('2d');
    _outCtx.imageSmoothingEnabled = false;
  }
  new Uint32Array(_img.data.buffer).set(FB);
  _lowCtx.putImageData(_img, 0, 0);
  _outCtx.imageSmoothingEnabled = false;
  _outCtx.drawImage(_lowCv, 0, 0, W, H, 0, 0, W * 4, H * 4);
}
