// demo.scene.js: the v3 acting showcase (15 s, 1080 x 1920, 30 fps). Plain script, inlined by
// build/build.mjs after the rig bundle (M_core, M_cat, M_actor). Every frame is f(t).
const { Actor, motionBlur, EASE, spring, standOn, onCircle } = M_actor;
const { PAL, mix: mixHex } = M_core;
const W = 1080, H = 1920, FPS = 30, DUR = 15;
const BOX_FILL = mixHex(PAL.ink, PAL.paper, 0.1);
const MARS = { cx: 540, cy: 1000, r: 330, img: 'img/mars.webp', credit: 'NASA/JPL/USGS' };
const CANYON = [507, 1145];         // Valles Marineris in this view
const marsIn = [4.6, 5.5], marsOut = [10.3, 11.0];

// ---- caption boxes: one box per line (Archivo 700, 90 px, padding 2 20 6 18), stacked 8 px apart
let ctx2d = null;
function measure(text) {
  if (!ctx2d) ctx2d = document.createElement('canvas').getContext('2d');
  ctx2d.font = '700 90px Archivo';
  return ctx2d.measureText(text).width;
}
function capBox(lines, x, top) {
  const rows = lines.map((s, i) => ({ s, x, y: top + i * 112, w: Math.ceil(measure(s.replace(/[*]/g, ''))) + 38, h: 104 }));
  const w = Math.max(...rows.map((r) => r.w));
  return { rows, rect: [x, top, rows[0].w, rows.length * 112 - 8], top, x, wmax: w };
}
function drawCap(c, dx = 0) {
  return c.rows.map((r) => {
    const parts = r.s.split('*');
    const txt = parts.map((p, i) => (i % 2 ? `<tspan fill="${PAL.amber}">${p}</tspan>` : p)).join('');
    return `<rect x="${r.x + dx}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${BOX_FILL}"/>`
      + `<text x="${r.x + dx + 18}" y="${r.y + 78}" font-family="Archivo, sans-serif" font-weight="700" font-size="90" fill="${PAL.paper}">${txt}</text>`;
  }).join('');
}
const slide = (t, a, b, from, to, ease) => (t <= a ? from : t >= b ? to : from + (to - from) * ease((t - a) / (b - a)));

let A, B, C, cat, LABELS;
function build() {
  A = capBox(['Meet the', 'night *shift.*'], 80, 1180);
  B = capBox(['On *air.*'], 0, 900); B.rows[0].x = 900 - B.rows[0].w; B.rect[0] = B.rows[0].x; B.x = B.rows[0].x;
  C = capBox(['Mars is *3,390 km*', 'to its center.'], 80, 1180);
  const bTop = standOn(B.rect, 0.5);
  cat = new Actor({ scale: 0.34, seed: 5, avoid: [A.rect, B.rect] });
  const marsTop = onCircle([MARS.cx, MARS.cy, MARS.r], 0);
  const TL = [
    { t: -0.12, do: 'enter', how: 'skid', from: 'left', to: [300, A.top], label: 'SKID IN' },
    { t: 1.25, do: 'wave', label: 'WAVE + TALK' },
    { t: 1.3, do: 'say', words: [{ w: 'Hi.', s: 1.3, e: 1.52, stress: true }, { w: 'I', s: 1.62, e: 1.72 }, { w: 'work', s: 1.74, e: 1.98 }, { w: 'the', s: 2.0, e: 2.1 }, { w: 'night', s: 2.12, e: 2.38, stress: true }, { w: 'shift.', s: 2.4, e: 2.7 }] },
    { t: 2.45, do: 'point', at: [B.rect[0] + B.rect[2] / 2, B.rect[1] + 50], dur: 0.85, label: 'POINT' },
    { t: 3.3, do: 'hop', to: bTop, label: 'HOP' },
    { t: 4.2, do: 'thumbs', dur: 0.75, label: 'THUMBS UP' },
    { t: 4.85, do: 'fly', to: marsTop, height: 150, label: 'JET PACK' },
    { t: 6.25, do: 'walk', around: [MARS.cx, MARS.cy, MARS.r], toDeg: 22, label: 'WALK THE EDGE' },
    { t: 7.45, do: 'gasp', at: CANYON, dur: 0.85, label: 'GASP' },
    { t: 8.3, do: 'sign', text: '3,390', sub: 'KM RADIUS', dur: 1.35, label: 'SIGN' },
    { t: 9.7, do: 'float', to: [300, C.top], dur: 1.9, spin: 0.6, label: 'ZERO-G FLOAT' },
    { t: 11.75, do: 'scoot', to: [700, C.top], via: [500, C.top - 90], label: 'DOT SCOOTER' },
    { t: 13.0, do: 'what', dur: 0.7, label: 'WHAT' },
    { t: 13.7, do: 'facepalm', dur: 0.8, label: 'FACEPALM' },
    { t: 14.45, do: 'exit', how: 'zip', to: 'right', label: 'ZIP OUT' },
  ];
  cat.timeline(TL);
  LABELS = TL.filter((a) => a.label).map((a) => ({ t: a.t, label: a.label }));
}

// ---- scene at time t (one opaque full frame, so sub-frame samples average exactly)
function scene(t) {
  let g = `<rect width="${W}" height="${H}" fill="${PAL.ink}"/>`;
  // Mars rises in from below (enter curve), holds, leaves upward fast (exit curve)
  const my = t < marsOut[0] ? slide(t, marsIn[0], marsIn[1], 2400, MARS.cy, EASE.enter) : slide(t, marsOut[0], marsOut[1], MARS.cy, -800, EASE.exit);
  if (my < 2400 && my > -800) {
    const d = MARS.r * 2;
    g += `<image href="${MARS.img}" x="${MARS.cx - MARS.r}" y="${(my - MARS.r).toFixed(1)}" width="${d}" height="${d}"/>`;
  }
  // caption boxes
  const ax = slide(t, 4.55, 4.9, 0, -1000, EASE.exit);
  if (ax > -1000) g += drawCap(A, ax);
  const bx = t < 5.1 ? slide(t, 2.1, 2.5, 700, 0, EASE.enter) : slide(t, 5.1, 5.45, 0, 700, EASE.exit);
  if (bx < 700) g += drawCap(B, bx);
  const cx = slide(t, 10.55, 11.0, -1000, 0, EASE.enter);
  if (cx > -1000) g += drawCap(C, cx);
  // credit while the photo is on screen
  if (t >= marsIn[0] + 0.25 && t < marsOut[0] + 0.3)
    g += `<rect x="80" y="1458" width="${MARS.credit.length * 14.4 + 20}" height="36" fill="${PAL.ink}"/><text x="90" y="1484" font-family="IBM Plex Mono, monospace" font-weight="500" font-size="24" fill="${PAL.paper}">${MARS.credit}</text>`;
  // kicker: echo mark + the move in progress
  let lab = LABELS[0]; for (const L of LABELS) if (L.t <= t + 1e-6) lab = L;
  const idx = LABELS.indexOf(lab) + 1;
  g += `<g transform="translate(80 246)"><rect x="0" y="0" width="${(lab.label.length + 15) * 17.4 + 70}" height="44" fill="${PAL.ink}"/>`
    + `<circle cx="22" cy="22" r="10" fill="${PAL.amber}"/><circle cx="49" cy="22" r="8.6" fill="none" stroke="${PAL.amber}" stroke-width="2.8"/>`
    + `<text x="72" y="32" font-family="IBM Plex Mono, monospace" font-weight="500" font-size="28" letter-spacing="1.4" fill="${PAL.paper}">CAT V3 · ${String(idx).padStart(2, '0')} ${lab.label}</text></g>`;
  g += cat.render(t);
  return g;
}
// screen speed of the scene's own movers (px per frame), to add sub-frames when they move fast
function sceneSpeed(t) {
  const dt = 0.5 / FPS, f = (tt) => [
    tt < marsOut[0] ? slide(tt, marsIn[0], marsIn[1], 2400, MARS.cy, EASE.enter) : slide(tt, marsOut[0], marsOut[1], MARS.cy, -800, EASE.exit),
    slide(tt, 4.55, 4.9, 0, -1000, EASE.exit),
    tt < 5.1 ? slide(tt, 2.1, 2.5, 700, 0, EASE.enter) : slide(tt, 5.1, 5.45, 0, 700, EASE.exit),
    slide(tt, 10.55, 11.0, -1000, 0, EASE.enter)];
  const a = f(t), b = f(t - dt);
  return Math.max(...a.map((v, i) => Math.abs(v - b[i])));
}
let LAST_N = 1;
function renderAt(t) {
  const bl = cat.blur(t);
  const sv = sceneSpeed(t), ns = sv < 12 ? 1 : Math.max(4, Math.min(16, Math.ceil(sv / 1.5)));
  const n = Math.max(bl.n, ns);
  LAST_N = n;
  document.getElementById('stage').innerHTML = motionBlur(scene, t, n, bl.shutter, FPS);
}
window.renderAt = renderAt;
window.__ready = (async () => {
  await document.fonts.ready;
  const img = new Image(); img.src = MARS.img; await img.decode().catch(() => null);
  build();
  const q = new URLSearchParams(location.search);
  renderAt(q.has('t') ? parseFloat(q.get('t')) || 0 : 0);
})();
window.__debug = { get cat() { return cat; }, get n() { return LAST_N; }, rects: () => ({ A: A.rect, B: B.rect, C: C.rect }) };
