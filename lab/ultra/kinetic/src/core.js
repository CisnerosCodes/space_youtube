// core.js: math, fonts, assets, text helpers, the eyes, credits, the frame loop.
// Everything is a pure function of t (seconds). No timers, no Date, no unseeded randomness.

const W = 1080, H = 1920, FPS = 60;
const INK = '#0b0b0c', PAPER = '#f2efe8', AMBER = '#f5b83d', MUTED = '#8c8a85';
const AMBER_RGB = [245, 184, 61], PAPER_RGB = [242, 239, 232];
const SAFE = { x0: 80, x1: 900, y0: 260, y1: 1500 };

// ------------------------------------------------------------------ math
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  lin: (x) => x,
  qIn: (x) => x * x,
  cIn: (x) => x * x * x,
  qOut: (x) => 1 - (1 - x) * (1 - x),
  cOut: (x) => 1 - Math.pow(1 - x, 3),
  q5Out: (x) => 1 - Math.pow(1 - x, 5),
  xOut: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  xIn: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  xInOut: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  cInOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  sInOut: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  bOut: (x) => { const s = 1.70158, u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; },
  bOut2: (x) => { const s = 2.6, u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; },
};
const tw = (t, t0, d, e = E.cOut) => e(clamp((t - t0) / d));
// damped spring step response 0 -> 1 (w: angular frequency, z: damping ratio)
function spring(t, w = 22, z = 0.45) {
  if (t <= 0) return 0;
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w * t) * (1 + w * t);
}
// seeded PRNG + 1D value noise
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash1(i, seed) { let h = Math.imul((i | 0) ^ Math.imul(seed | 0, 374761393), 668265263); h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash1(i, seed), hash1(i + 1, seed), u) * 2 - 1; }
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (c1, c2, k) => [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];

// ------------------------------------------------------------------ words
const ws = (i) => WORDS[i].start;
const we = (i) => WORDS[i].end;
const age = (i, t) => t - ws(i);
const shown = (i, t) => t >= ws(i);
function latestWord(t) { let k = -1; for (let i = 0; i < WORDS.length; i++) if (t >= ws(i)) k = i; return k; }

// ------------------------------------------------------------------ fonts
const FONT_FACES = [];
function loadFonts() {
  const list = [];
  for (let w = 62; w <= 125; w++) list.push(new FontFace('AW' + w, 'url(fonts/archivo-vf.woff2)', { stretch: w + '%', weight: '100 900' }));
  list.push(new FontFace('PlexMono', 'url(fonts/plexmono-500.woff2)', { weight: '500' }));
  list.push(new FontFace('PlexMono', 'url(fonts/plexmono-600.woff2)', { weight: '600' }));
  list.push(new FontFace('ISerif', 'url(fonts/instrument-serif-italic.woff2)', { style: 'italic', weight: '400' }));
  return Promise.all(list.map((f) => f.load().then((ff) => { document.fonts.add(ff); FONT_FACES.push(ff); })));
}
// family: 'A' Archivo (width wd 62..125, weight wt 100..900), 'M' Plex Mono, 'S' Instrument Serif italic
function setFont(ctx, px, wd = 100, wt = 800, fam = 'A') {
  if (fam === 'M') ctx.font = `${wt >= 550 ? 600 : 500} ${px}px PlexMono`;
  else if (fam === 'S') ctx.font = `italic 400 ${px}px ISerif`;
  else ctx.font = `${Math.round(clamp(wt, 100, 900))} ${px}px AW${Math.round(clamp(wd, 62, 125))}`;
}

// ------------------------------------------------------------------ assets
const IMG = {};
function loadImg(key, src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => { IMG[key] = im; (im.decode ? im.decode() : Promise.resolve()).then(res, res); }; im.onerror = () => rej(new Error('img ' + src)); im.src = src; });
}
// exact credits (assets/credits.json)
const CREDIT = {
  phobos: 'NASA/JPL-Caltech/University of Arizona',
  mars: 'NASA/JPL/USGS',
  earth: 'NASA/JPL-Caltech/University of Arizona',
  chart: 'Chart · facts: JAXA',
};

// ------------------------------------------------------------------ per-frame registries
let REG = { words: {}, credits: [], illus: [] };
function regWord(ctx, i, x0, y0, x1, y1) {
  const m = ctx.getTransform();
  const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  REG.words[i] = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), a: ctx.globalAlpha };
}
function credit(key) { if (!REG.credits.includes(key)) REG.credits.push(key); }
function illus(src) { if (!REG.illus.includes(src)) REG.illus.push(src); }

// ------------------------------------------------------------------ text
function measure(ctx, str, px, wd, wt, fam, ls = 0) {
  setFont(ctx, px, wd, wt, fam);
  ctx.letterSpacing = ls + 'px';
  const m = ctx.measureText(str);
  ctx.letterSpacing = '0px';
  return m.width - (ls && str.length ? ls : 0);
}
// Per-letter x offsets (kerning-aware: prefix widths)
function letterLayout(ctx, str, px, wd, wt, fam, ls = 0) {
  setFont(ctx, px, wd, wt, fam);
  const out = [];
  for (let k = 0; k < str.length; k++) {
    const pre = ctx.measureText(str.slice(0, k)).width + ls * k;
    const cw = ctx.measureText(str[k]).width;
    out.push({ ch: str[k], x: pre, w: cw });
  }
  return out;
}
// Draw a string. st: {px, wd, wt, fam, color, a, ls, align:'left'|'right'|'center', x, y (baseline),
//   s, sx, sy, r (rad), ox, oy (transform origin as fraction of box: 0..1), img:{im,x,y,w,h} fill, stroke:{w,color}, word: index}
function txt(ctx, str, st) {
  const px = st.px, wd = st.wd ?? 100, wt = st.wt ?? 800, fam = st.fam ?? 'A', ls = st.ls ?? 0;
  const wdt = measure(ctx, str, px, wd, wt, fam, ls);
  setFont(ctx, px, wd, wt, fam);
  const asc = px * (fam === 'M' ? 0.72 : 0.74), desc = px * 0.22;
  let x = st.x;
  if (st.align === 'right') x -= wdt; else if (st.align === 'center') x -= wdt / 2;
  const ox = x + wdt * (st.ox ?? 0.5), oy = st.y - asc + (asc + desc) * (st.oy ?? 0.5);
  ctx.save();
  if (st.a !== undefined) ctx.globalAlpha *= clamp(st.a);
  ctx.translate(ox, oy);
  if (st.r) ctx.rotate(st.r);
  const s = st.s ?? 1;
  ctx.scale(s * (st.sx ?? 1), s * (st.sy ?? 1));
  ctx.translate(-ox, -oy);
  ctx.letterSpacing = ls + 'px';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if (st.word !== undefined) regWord(ctx, st.word, x, st.y - asc, x + wdt, st.y + desc);
  if (st.img) {
    drawMasked(ctx, (c) => { c.letterSpacing = ls + 'px'; setFont(c, px, wd, wt, fam); c.fillStyle = '#fff'; c.fillText(str, x, st.y); }, st.img);
  } else {
    if (st.shadow) { ctx.shadowColor = 'rgba(11,11,12,0.85)'; ctx.shadowBlur = 22 * st.shadow; }
    if (st.color) { ctx.fillStyle = st.color; ctx.fillText(str, x, st.y); }
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    if (st.stroke) { ctx.lineWidth = st.stroke.w; ctx.strokeStyle = st.stroke.color; ctx.lineJoin = 'round'; ctx.strokeText(str, x, st.y); }
  }
  ctx.letterSpacing = '0px';
  ctx.restore();
  return { w: wdt, x, asc, desc };
}

// Draw a shape (drawFn draws white into c with ctx's transform) filled with an image.
let SCR = null, SCX = null;
function drawMasked(ctx, drawFn, img) {
  if (!SCR) { SCR = document.createElement('canvas'); SCR.width = W; SCR.height = H; SCX = SCR.getContext('2d'); }
  SCX.setTransform(1, 0, 0, 1, 0, 0);
  SCX.globalCompositeOperation = 'source-over';
  SCX.globalAlpha = 1;
  SCX.clearRect(0, 0, W, H);
  SCX.setTransform(ctx.getTransform());
  drawFn(SCX);
  SCX.globalCompositeOperation = 'source-in';
  if (img.filter) SCX.filter = img.filter;
  if (img.trf) { SCX.setTransform(1, 0, 0, 1, 0, 0); }
  SCX.drawImage(img.im, img.x, img.y, img.w, img.h);
  SCX.filter = 'none';
  if (img.tint) { SCX.globalCompositeOperation = 'source-atop'; SCX.fillStyle = img.tint; SCX.fillRect(-W, -H, 3 * W, 3 * H); }
  SCX.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(SCR, 0, 0);
  ctx.restore();
}

// ------------------------------------------------------------------ shape helpers
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
function line(ctx, x0, y0, x1, y1, w, color, dash) {
  ctx.save(); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineWidth = w; ctx.strokeStyle = color;
  if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
}
// Mono data label (uppercase), optional leading amber tick
function label(ctx, str, x, y, o = {}) {
  const px = o.px ?? 26;
  ctx.save();
  ctx.globalAlpha *= o.a ?? 1;
  setFont(ctx, px, 100, o.wt ?? 500, 'M');
  ctx.letterSpacing = (o.ls ?? 0.06 * px) + 'px';
  ctx.textBaseline = 'alphabetic';
  let shown = str;
  if (o.type !== undefined) shown = str.slice(0, Math.floor(clamp(o.type) * str.length + 0.0001));
  const w = ctx.measureText(str).width;
  let xx = x;
  if (o.align === 'right') xx = x - w;
  if (o.box) { ctx.fillStyle = o.box; ctx.fillRect(xx - 10, y - px * 0.95, w + 20, px * 1.35); }
  ctx.fillStyle = o.color ?? PAPER;
  ctx.fillText(shown, xx, y);
  ctx.letterSpacing = '0px';
  ctx.restore();
  return w;
}
// Draw an image so its black background melts into the ink ground ('lighten')
function photo(ctx, im, x, y, w, h, o = {}) {
  ctx.save();
  ctx.globalAlpha *= o.a ?? 1;
  ctx.globalCompositeOperation = o.op ?? 'lighten';
  if (o.filter) ctx.filter = o.filter;
  ctx.drawImage(im, x, y, w, h);
  ctx.restore();
}

// ------------------------------------------------------------------ the eyes (Night Shift's echo-mark eyes)
// e: {x, y, R, look:[lx,ly] (-1..1), blink 0..1, lid 0..1, lidA (deg, + = inner corner down), low 0..1 (happy),
//     pupil 0..1 (size), glow 0..1, color, sqx, sqy, rot, a}
function drawEyes(ctx, e) {
  const R = e.R, dx = (R * 30) / 22;
  const col = e.color ?? AMBER;
  const glow = (e.glow ?? 1) * (1 - 0.75 * (e.blink ?? 0));
  ctx.save();
  ctx.globalAlpha *= e.a ?? 1;
  ctx.translate(e.x, e.y);
  if (e.rot) ctx.rotate(e.rot);
  ctx.scale(e.sqx ?? 1, e.sqy ?? 1);
  // glow: a warm light pool around both eyes
  if (glow > 0.001 && col === AMBER) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const cx of [-dx, dx]) {
      const g = ctx.createRadialGradient(cx, 0, R * 0.6, cx, 0, R * 4.2);
      g.addColorStop(0, rgba(AMBER_RGB, 0.30 * glow));
      g.addColorStop(0.35, rgba(AMBER_RGB, 0.10 * glow));
      g.addColorStop(1, rgba(AMBER_RGB, 0));
      ctx.fillStyle = g; ctx.fillRect(cx - R * 4.2, -R * 4.2, R * 8.4, R * 8.4);
    }
    ctx.restore();
  }
  const blink = clamp(e.blink ?? 0);
  for (const side of ['L', 'R']) {
    const cx = side === 'L' ? -dx : dx;
    ctx.save();
    // clip to the eye
    circle(ctx, cx, 0, R + 1); ctx.clip();
    ctx.shadowColor = col === AMBER ? rgba(AMBER_RGB, 0.9 * glow) : 'transparent';
    ctx.shadowBlur = R * 0.5 * glow;
    if (side === 'L') { circle(ctx, cx, 0, R); ctx.fillStyle = col; ctx.fill(); }
    else { circle(ctx, cx, 0, (R * 19) / 22); ctx.lineWidth = (R * 6) / 22; ctx.strokeStyle = col; ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    const lx = (e.look?.[0] ?? 0), ly = (e.look?.[1] ?? 0);
    if (side === 'L' && (e.pupil ?? 1) > 0.01) {
      const pw = e.pupil ?? 1;
      ctx.beginPath();
      ctx.ellipse(cx + lx * R * 0.4, ly * R * 0.36, R * 0.2 * pw, R * 0.44 * pw, 0, 0, TAU);
      ctx.fillStyle = e.bg ?? INK; ctx.fill();
      // tiny glint
      circle(ctx, cx + lx * R * 0.4 + R * 0.09 * pw, ly * R * 0.36 - R * 0.2 * pw, R * 0.07 * pw);
      ctx.fillStyle = rgba(PAPER_RGB, 0.85 * pw); ctx.fill();
    }
    // lids in the ground colour
    const fur = e.bg ?? INK;
    const lid = (e.lid ?? 0) + (1 - (e.lid ?? 0)) * blink;
    if (lid > 0.001) {
      const ey = -R + 2.05 * R * lid;
      const a = ((side === 'L' ? 1 : -1) * (e.lidA ?? 0) * Math.PI) / 180;
      ctx.save();
      ctx.translate(cx, ey); ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-2 * R, 0); ctx.quadraticCurveTo(0, R * 0.18 * lid, 2 * R, 0); ctx.lineTo(2 * R, -3 * R); ctx.lineTo(-2 * R, -3 * R); ctx.closePath();
      ctx.fillStyle = fur; ctx.fill();
      // the lid's edge as a drawn line, so squints and blinks read as eyelids
      if (lid > 0.25 && e.color !== INK) {
        ctx.beginPath(); ctx.moveTo(-2 * R, 0); ctx.quadraticCurveTo(0, R * 0.18 * lid, 2 * R, 0);
        ctx.lineWidth = R * 0.14; ctx.strokeStyle = rgba(AMBER_RGB, clamp((lid - 0.25) / 0.4)); ctx.stroke();
      }
      ctx.restore();
    }
    const low = clamp(e.low ?? 0);
    if (low > 0.001) {
      const rr = R * 1.3, ccy = R - 1.9 * R * low + rr;
      circle(ctx, cx, ccy, rr); ctx.fillStyle = fur; ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ keyed tracks
// keys: [[t, value, dur, ease]] (value may be a number or array). Before the first key: first value.
function track(keys, t) {
  let v = keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    const [t0, val, d, e] = keys[k];
    if (t < t0) break;
    const p = (E[e] ?? E.cInOut)(clamp((t - t0) / (d || 1e-6)));
    v = Array.isArray(v) ? v.map((x, j) => lerp(x, val[j], p)) : lerp(v, val, p);
  }
  return v;
}
// spring track: each key steps the target; the value follows with spring dynamics (overshoot)
function strack(keys, t, w = 18, z = 0.55) {
  let v = Array.isArray(keys[0][1]) ? keys[0][1].slice() : keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    const [t0, val, ww, zz] = keys[k];
    if (t < t0) break;
    const prev = keys[k - 1][1];
    const p = spring(t - t0, ww ?? w, zz ?? z);
    if (Array.isArray(v)) v = v.map((x, j) => x + (val[j] - prev[j]) * p);
    else v += (val - prev) * p;
  }
  return v;
}

// ------------------------------------------------------------------ credits slot (bottom left, above YouTube's controls)
function drawCredits(ctx) {
  const lines = [];
  for (const k of REG.credits) lines.push(CREDIT[k]);
  if (REG.illus.length) lines.push('Illustration · facts: ' + REG.illus.join(', '));
  const uniq = [...new Set(lines)];
  let y = 1478;
  for (let k = uniq.length - 1; k >= 0; k--) {
    label(ctx, uniq[k], 90, y, { px: 24, box: 'rgba(11,11,12,0.88)', color: PAPER, ls: 0.3 });
    y -= 36;
  }
}

// ------------------------------------------------------------------ frame loop
const CANVAS = document.getElementById('c');
const MAIN = CANVAS.getContext('2d');
const SMP = document.createElement('canvas'); SMP.width = W; SMP.height = H;
const SMPX = SMP.getContext('2d');
const ACC = document.createElement('canvas'); ACC.width = W; ACC.height = H;
const ACCX = ACC.getContext('2d');

function drawFrame(ctx, t) {
  REG = { words: {}, credits: [], illus: [] };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  drawScenes(ctx, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawOverlay(ctx, t);
  drawCredits(ctx);
}

// motion blur: [samples, shutter in frames] as a function of t (scenes add windows)
const BLUR = [];
function blurAt(t) {
  let n = 1, sh = 0;
  for (const [a, b, nn, ss] of BLUR) if (t >= a && t <= b && nn > n) { n = nn; sh = ss; }
  return [n, sh];
}
let LAST = { words: {}, credits: [], illus: [] };
window.renderAt = function (t) {
  const [n, sh] = blurAt(t);
  if (n <= 1) { drawFrame(MAIN, t); LAST = REG; return; }
  for (let k = 0; k < n; k++) {
    const tk = t + (sh / FPS) * (k / (n - 1) - 0.5);
    drawFrame(SMPX, tk);
    if (k === Math.floor(n / 2)) LAST = REG;
    ACCX.globalAlpha = 1 / (k + 1);
    ACCX.globalCompositeOperation = 'source-over';
    ACCX.drawImage(SMP, 0, 0);
  }
  MAIN.setTransform(1, 0, 0, 1, 0, 0);
  MAIN.globalAlpha = 1;
  MAIN.drawImage(ACC, 0, 0);
};
window.__qa = () => LAST;
window.__ready = (async () => {
  await Promise.all([
    loadFonts(),
    loadImg('phobos', 'assets/phobos.jpg'),
    loadImg('phobosB', 'assets/phobos_b.jpg'),
    loadImg('mars', 'assets/mars.jpg'),
    loadImg('earth', 'assets/earth.png'),
  ]);
  await document.fonts.ready;
  initScenes();
  window.renderAt(0);
})();
