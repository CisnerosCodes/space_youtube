// ===== 02_image.js: real NASA images re-pixelated per frame + Mode-7 floor =====
// Real images are only resampled (box filter), graded (brightness) and quantized to palette
// ramps with a 4x4 ordered dither. Nothing is painted into them.
const IMG = {};
function decodeAsset(a, ch) {
  const bin = atob(a.data), n = bin.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
  return { w: a.w, h: a.h, ch, d: u };
}
function initImages() {
  IMG.phobos = decodeAsset(ASSETS.phobos, 4);
  IMG.phobos2 = decodeAsset(ASSETS.phobos2, 4);
  IMG.mars = decodeAsset(ASSETS.mars, 4);
  const t = decodeAsset(ASSETS.phobosTex, 1);
  IMG.tex = [t, halfGray(t), halfGray(halfGray(t)), halfGray(halfGray(halfGray(t)))];
}
function halfGray(t) {
  const w = t.w >> 1, h = t.h >> 1, d = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = 2 * y * t.w + 2 * x;
    d[y * w + x] = (t.d[i] + t.d[i + 1] + t.d[i + t.w] + t.d[i + t.w + 1]) >> 2;
  }
  return { w, h, ch: 1, d };
}

const PAL = {
  phobos: ['K0', 'H0', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Q1', 'Q2', 'Q3'],
  mars: ['K0', 'R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'H1', 'H2', 'H3', 'H5', 'P1'],
  marsDim: ['K0', 'K1', 'R0', 'R1', 'R2', 'R3', 'R4', 'H1', 'H2'],
};
// box-filter resample of an RGBA image region to tw x th; returns Float32Array rgba (alpha 0..1)
function resample(img, tw, th, sx0, sy0, sw, sh) {
  sx0 = sx0 || 0; sy0 = sy0 || 0; sw = sw || img.w; sh = sh || img.h;
  const out = new Float32Array(tw * th * 4);
  const fx = sw / tw, fy = sh / th;
  for (let y = 0; y < th; y++) {
    const ya = sy0 + y * fy, yb = ya + fy;
    for (let x = 0; x < tw; x++) {
      const xa = sx0 + x * fx, xb = xa + fx;
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const yi0 = Math.floor(ya), yi1 = Math.max(yi0 + 1, Math.ceil(yb)), xi0 = Math.floor(xa), xi1 = Math.max(xi0 + 1, Math.ceil(xb));
      for (let yy = yi0; yy < yi1; yy++) {
        if (yy < 0 || yy >= img.h) continue;
        for (let xx = xi0; xx < xi1; xx++) {
          if (xx < 0 || xx >= img.w) continue;
          const i = (yy * img.w + xx) * 4, al = img.d[i + 3] / 255;
          r += img.d[i] * al; g += img.d[i + 1] * al; b += img.d[i + 2] * al; a += al; n++;
        }
      }
      const o = (y * tw + x) * 4;
      if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
      out[o + 3] = n ? a / n : 0;
    }
  }
  return out;
}
function nearestPal(r, g, b, pal) {
  let best = 0, bd = 1e12;
  for (let i = 0; i < pal.length; i++) {
    const p = RGB[pal[i]];
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const rm = (r + p[0]) / 2;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  return C[pal[best]];
}
const _photoCache = new Map();
// Pixelate a real image into a sprite of size tw x th (screen phase px, py for a stable dither)
function photoSpr(name, tw, th, opt) {
  opt = opt || {};
  tw = Math.max(1, Math.round(tw)); th = Math.max(1, Math.round(th));
  const pal = opt.pal || PAL.phobos, dith = opt.dither ?? 26, bright = opt.bright ?? 1, gamma = opt.gamma ?? 1;
  const phx = (opt.px || 0) & 3, phy = (opt.py || 0) & 3;
  const key = [name, tw, th, pal.join(''), dith, bright.toFixed(3), gamma, phx, phy, opt.region ? opt.region.join(',') : '', opt.light || ''].join('|');
  if (_photoCache.has(key)) return _photoCache.get(key);
  const img = IMG[name];
  const rg = opt.region || [0, 0, img.w, img.h];
  const f = resample(img, tw, th, rg[0], rg[1], rg[2], rg[3]);
  const s = new Spr(tw, th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const o = (y * tw + x) * 4;
    if (f[o + 3] < 0.5) continue;
    let k = bright;
    if (opt.light) { // simple terminator darkening toward one side (grade only)
      const [lx, ly, amt] = opt.light;
      const u = (x / tw - 0.5) * lx + (y / th - 0.5) * ly;
      k *= clamp(1 - amt * (u + 0.5), 0.15, 1.2);
    }
    let r = f[o] * k, g = f[o + 1] * k, b = f[o + 2] * k;
    if (gamma !== 1) { r = 255 * Math.pow(r / 255, gamma); g = 255 * Math.pow(g / 255, gamma); b = 255 * Math.pow(b / 255, gamma); }
    const dd = BAYER4[((y + phy) & 3) * 4 + ((x + phx) & 3)] * dith;
    s.d[y * tw + x] = nearestPal(r + dd, g + dd, b + dd, pal);
  }
  if (_photoCache.size > 400) _photoCache.clear();
  _photoCache.set(key, s);
  return s;
}
// draw a real image centred at (cx, cy) with width tw (height from aspect)
function drawPhoto(name, cx, cy, tw, opt) {
  opt = opt || {};
  const img = IMG[name];
  const rg = opt.region || [0, 0, img.w, img.h];
  const th = opt.th || Math.round(tw * rg[3] / rg[2]);
  const x = Math.round(cx - tw / 2), y = Math.round(cy - th / 2);
  const s = photoSpr(name, tw, th, Object.assign({}, opt, { px: x, py: y }));
  blit(s, x, y, opt);
  return { x, y, w: s.w, h: s.h };
}

// ---- Mode-7 floor from the grey Phobos texture map (NASA/JPL/Solar System Simulator)
const RAMP_PHOBOS = ['H0', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
function mode7(o) {
  const hz = o.horizon, focal = o.focal || 160, camH = o.camH || 40, yaw = o.yaw || 0;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const ramp = (o.ramp || RAMP_PHOBOS).map((k) => C[k]);
  const n = ramp.length;
  const yEnd = o.yEnd || H;
  const scale = o.scale || 1.0, contrast = o.contrast || 1.25, bias = o.bias || 0;
  for (let y = Math.max(0, hz + 1); y < yEnd; y++) {
    const dy = y - hz + 0.5;
    const dist = camH * focal / dy;
    const lv = dist > 900 ? 3 : dist > 420 ? 2 : dist > 200 ? 1 : 0;
    const t = IMG.tex[lv], div = 1 << lv;
    const fog = clamp((dist - 150) / 1200, 0, 0.85);
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - W / 2) * dist / focal;
      const wx = o.camX + dx * cy - dist * sy, wz = o.camZ + dx * sy + dist * cy;
      let u = (wx * scale / div) % t.w; if (u < 0) u += t.w;
      // ping-pong the latitude band (rows 25%..75% of the map) so there is no seam
      const band = t.h * 0.5, v0 = t.h * 0.25;
      let vv = (wz * scale / div) % (2 * band); if (vv < 0) vv += 2 * band;
      const v = v0 + (vv < band ? vv : 2 * band - vv);
      const lum = t.d[(v | 0) * t.w + (u | 0)] / 255;
      let L = (lum - 0.5) * contrast + 0.5 + bias;
      L = L * (1 - fog) + 0.08 * fog;
      const idx = clamp(Math.floor(L * (n - 1) + 0.5 + BAYER4[(y & 3) * 4 + (x & 3)] * 0.9), 0, n - 1);
      FB[y * W + x] = ramp[idx];
    }
  }
}
// project a ground point into the Mode-7 view
function m7project(o, wx, wz, wy) {
  const yaw = o.yaw || 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
  const rx = wx - o.camX, rz = wz - o.camZ;
  const lx = rx * cy + rz * sy, lz = -rx * sy + rz * cy; // inverse rotation
  if (lz < 1) return null;
  const focal = o.focal || 160, camH = o.camH || 40;
  return { x: W / 2 + lx * focal / lz, y: o.horizon + (camH - (wy || 0)) * focal / lz, z: lz };
}
