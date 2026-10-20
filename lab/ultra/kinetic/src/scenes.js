// scenes.js: the eleven typographic spreads, the background, the eyes' performance.

// ------------------------------------------------------------------ typographic primitives
const SP = 0.26; // word space in em
// style presets
const LIGHT = { wt: 300, wd: 100, color: PAPER };
const HEAVY = { wt: 900, wd: 100, color: PAPER };

// Draw caption word i at baseline-left (x, y). Entrance by st.fx. Returns width.
// fx: 'slam' | 'rise' | 'pop' | 'none' | 'drop' | 'left' | 'right' | 'type'
// largest scale about origin (ox, oy) that keeps box [x0,x1]x[y0,y1] inside the caption zone
function zoneScale(x0, x1, y0, y1, ox, oy) {
  let s = 99;
  if (ox > x0) s = Math.min(s, (ox - SAFE.x0) / (ox - x0));
  if (x1 > ox) s = Math.min(s, (SAFE.x1 - ox) / (x1 - ox));
  if (oy > y0) s = Math.min(s, (oy - SAFE.y0) / (oy - y0));
  if (y1 > oy) s = Math.min(s, (SAFE.y1 - oy) / (y1 - oy));
  return Math.max(1, s);
}
function cw(ctx, t, i, x, y, st) {
  const str = WORDS[i].text;
  const px = st.px, wd = st.wd ?? 100, wt = st.wt ?? 800, fam = st.fam ?? 'A';
  const w = measure(ctx, str, px, wd, wt, fam, st.ls ?? 0);
  if (!shown(i, t)) return w;
  const a = age(i, t);
  const o = Object.assign({}, st, { x, y, word: i });
  const fx = st.fx ?? 'rise';
  if (fx === 'slam') {
    const p = clamp(a / (st.dur ?? 0.26));
    o.ox = st.ox ?? 0; o.oy = 0.6;
    { const ox = x + w * o.ox, asc = px * 0.74, oy = y - asc + (asc + px * 0.22) * 0.6;
      const smax = zoneScale(x, x + w, y - asc, y + px * 0.22, ox, oy);
      const want = lerp(st.from ?? 1.38, 1, E.xOut(p));
      o.s = Math.min(want, smax) * (st.s ?? 1);
      // when the zone caps the scale, the slam lands vertically instead
      if (want > smax + 0.01) { o.sy = 1 + Math.min(0.5, (want - smax) * 1.2); o.oy = 1; } }
    o.a = clamp(a * 60 / 1.5 + 0.35) * (st.a ?? 1);
    txt(ctx, str, o);
  } else if (fx === 'pop') {
    const p = clamp(a / 0.3);
    o.ox = st.ox ?? 0.5; o.oy = 0.6;
    { const ox = x + w * o.ox, asc = px * 0.74, oy = y - asc + (asc + px * 0.22) * 0.6;
      o.s = Math.min(lerp(0.5, 1, E.bOut2(p)), zoneScale(x, x + w, y - asc, y + px * 0.22, ox, oy)) * (st.s ?? 1); }
    o.a = clamp(a * 30 + 0.4) * (st.a ?? 1);
    txt(ctx, str, o);
  } else if (fx === 'rise' || fx === 'drop') {
    const p = E.xOut(clamp(a / (st.dur ?? 0.32)));
    const dir = fx === 'rise' ? 1 : -1;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - px * 0.3, y - px * 1.02, w + px * 0.6, px * 1.3); ctx.clip();
    o.y = y + dir * (1 - p) * px * 1.0;
    txt(ctx, str, o);
    ctx.restore();
    // keep the registry at the resting box (the word is readable within a few frames)
  } else if (fx === 'left' || fx === 'right') {
    const p = E.xOut(clamp(a / (st.dur ?? 0.35)));
    o.x = x + (fx === 'left' ? -1 : 1) * (1 - p) * (st.dist ?? 60);
    o.a = clamp(a * 40 + 0.3) * (st.a ?? 1);
    txt(ctx, str, o);
  } else if (fx === 'type') {
    // letter by letter, 1 frame apart, each letter pops
    const L = letterLayout(ctx, str, px, wd, wt, fam, st.ls ?? 0);
    regWord(ctx, i, x, y - px * 0.74, x + w, y + px * 0.22);
    for (let k = 0; k < L.length; k++) {
      const ak = a - k * (st.stagger ?? 1 / 60);
      if (ak < 0) continue;
      const p = clamp(ak / 0.18);
      txt(ctx, L[k].ch, Object.assign({}, st, { x: x + L[k].x, y: y - (1 - E.xOut(p)) * px * 0.25, s: lerp(1.25, 1, E.xOut(p)), oy: 1, a: clamp(ak * 50 + 0.3), word: undefined }));
    }
  } else {
    txt(ctx, str, o);
  }
  return w;
}
// largest px <= px at which str fits in maxW
function fitPx(ctx, str, maxW, px, wd = 100, wt = 800, fam = 'A') { const w = measure(ctx, str, px, wd, wt, fam); return w > maxW ? Math.floor((px * maxW) / w) : px; }
// lay out a sequence of words on one baseline; returns end x
function wline(ctx, t, idxs, x, y, styleOf) {
  let cx = x;
  for (const i of idxs) {
    const st = styleOf(i);
    const w = cw(ctx, t, i, cx, y, st);
    cx += w + st.px * (st.space ?? SP);
  }
  return cx;
}
// mask-exit for a block: content moves up by `d` and is clipped to a band
function exitUp(ctx, t, t0, dur, y0, y1, fn) {
  if (t >= t0 + dur) return;
  const p = E.cIn(clamp((t - t0) / dur));
  ctx.save();
  if (p > 0) { ctx.beginPath(); ctx.rect(0, y0, W, y1 - y0); ctx.clip(); }
  ctx.translate(0, -p * (y1 - y0));
  fn();
  ctx.restore();
}
function chip(ctx, t, str, t0, o = {}) {
  if (t < t0) return;
  const p = clamp((t - t0) / (o.dur ?? Math.max(0.25, str.length * 0.012)));
  const y = o.y ?? 322;
  // amber tick + typed mono line
  const k = E.xOut(clamp((t - t0) / 0.2));
  ctx.save();
  ctx.globalAlpha *= o.a ?? 1;
  ctx.fillStyle = o.tick ?? AMBER;
  ctx.fillRect(80, y - 20, 6 * k, 22);
  label(ctx, str, 98, y, { px: o.px ?? 25, color: o.color ?? AMBER, type: p, ls: 1 });
  ctx.restore();
}
// decorative giant step numeral (outline)
function bigNumeral(ctx, t, str, x, y, px, a, o = {}) {
  ctx.save();
  ctx.globalAlpha *= a;
  setFont(ctx, px, o.wd ?? 70, 900);
  if (o.hit !== undefined && t >= o.hit) {
    // the number word lands: the numeral fills solid, punches, then cools back to an outline
    const k = t - o.hit, fill = Math.exp(-k * 3.2), punch = 1 + 0.06 * Math.exp(-k * 9) * Math.cos(k * 30);
    ctx.translate(x, y); ctx.scale(punch, punch); ctx.translate(-x, -y);
    ctx.save(); ctx.globalAlpha *= 0.12 + 0.75 * fill; ctx.fillStyle = AMBER; ctx.fillText(str, x, y); ctx.restore();
  }
  ctx.lineWidth = o.lw ?? 3; ctx.strokeStyle = o.color ?? rgba(AMBER_RGB, 0.5); ctx.lineJoin = 'round';
  ctx.strokeText(str, x, y);
  ctx.restore();
}
function shake(t, t0, amp, dur = 0.35, seed = 1) {
  if (t < t0 || t > t0 + dur) return [0, 0];
  const k = 1 - (t - t0) / dur, e = k * k * amp;
  return [noise1(t * 60, seed) * e, noise1(t * 60, seed + 9) * e];
}

// ------------------------------------------------------------------ background: Swiss grid + beat pulse
function drawBG(ctx, t) {
  const beat = Math.exp(-((t + 1e-6) % 0.5) * 9);
  const draw = (k) => E.cOut(clamp((t - k * 0.06) / 0.7));
  ctx.save();
  ctx.lineWidth = 1;
  const cols = 6;
  for (let k = 0; k <= cols; k++) {
    const x = 80 + (820 * k) / cols;
    const edge = k === 0 || k === cols;
    ctx.strokeStyle = rgba(PAPER_RGB, (edge ? 0.07 : 0.035) + beat * 0.025);
    const L = 1920 * draw(k);
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, L); ctx.stroke();
  }
  for (const y of [260, 1500]) {
    ctx.strokeStyle = rgba(PAPER_RGB, 0.07 + beat * 0.025);
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(1080 * draw(2), y + 0.5); ctx.stroke();
  }
  // registration crosses
  ctx.strokeStyle = rgba(AMBER_RGB, 0.55);
  ctx.lineWidth = 2;
  for (const [x, y] of [[80, 260], [900, 260], [80, 1500], [900, 1500]]) {
    const s = 9 * draw(3);
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ shared objects
const LAY = {};          // layout facts computed once fonts are ready
let PIECE = null;        // the stolen piece of Phobos (polygon in photo space 0..1)
function initScenes() {
  const c = MAIN;
  // the period of "Mars." in spread 1 (the amber wipe grows from it)
  const xWith = 80, yMars = 1395;
  const wWith = measure(c, WORDS[8].text, 92, 100, 300);
  const xMars = xWith + wWith + 92 * SP;
  const wMarsNoDot = measure(c, 'Mars', 210, 100, 900);
  const wDot = measure(c, '.', 210, 100, 900);
  LAY.marsDot = [xMars + wMarsNoDot + wDot * 0.5, yMars - 210 * 0.08];
  LAY.xMars = xMars;
  // LOOKOUT: the eyes become the two o's ("l" + eyes + "kout." on its own line, fitted to the safe width)
  const yLk = 1010;
  const fitLook = (px) => { const R = px * 0.255, dx = (R * 30) / 22, wl = measure(c, 'l', px, 100, 900), wk = measure(c, 'kout.', px, 100, 900); return { R, dx, wl, wk, total: wl + 12 + 2 * R + 2 * dx + 12 + wk }; };
  let pxL = 210, f = fitLook(pxL);
  if (f.total > 812) { pxL = Math.floor((pxL * 812) / f.total); f = fitLook(pxL); }
  const xl = 80, cxL = xl + f.wl + 12 + f.R, cxR = cxL + 2 * f.dx;
  LAY.look = { px: pxL, y: yLk, xl, cxL, cxR, R: f.R, xRest: cxR + f.R + 12, cy: yLk - pxL * 0.27 };
  const LL = letterLayout(c, 'lookout.', pxL, 100, 900);
  LAY.lookReal = { xo1: 80 + LL[1].x, xo2: 80 + LL[2].x, xk: 80 + LL[3].x };
  // the piece: a jagged chunk of the right limb (photo space)
  const base = [[0.74, 0.5], [0.9, 0.465], [0.995, 0.56], [0.985, 0.71], [0.84, 0.745], [0.715, 0.645]];
  const rnd = mulberry32(42);
  PIECE = [];
  for (let k = 0; k < base.length; k++) {
    const [x0, y0] = base[k], [x1, y1] = base[(k + 1) % base.length];
    for (let j = 0; j < 4; j++) {
      const u = j / 4;
      const jx = j ? (rnd() - 0.5) * 0.022 : 0, jy = j ? (rnd() - 0.5) * 0.022 : 0;
      PIECE.push([lerp(x0, x1, u) + jx, lerp(y0, y1, u) + jy]);
    }
  }
  LAY.pieceC = PIECE.reduce((s, p) => [s[0] + p[0] / PIECE.length, s[1] + p[1] / PIECE.length], [0, 0]);
  // BLUR windows: [t0, t1, samples, shutter frames]
  BLUR.push(
    [0.0, 0.2, 4, 1.0],      // eyes snap open
    [0.28, 0.85, 5, 1.0],    // lens + eyes travel
    [1.05, 1.6, 4, 1.0],     // reflow
    [1.78, 1.95, 4, 1.0], [2.18, 2.6, 5, 1.0], [2.82, 2.98, 4, 1.0],
    [3.2, 3.62, 6, 1.2],     // amber wipe + Japan slam
    [4.3, 5.15, 6, 1.4],     // launch
    [4.88, 5.05, 4, 1.0],
    [5.3, 5.75, 5, 1.0], [6.25, 6.95, 5, 1.0],
    [7.1, 7.5, 16, 1.5],      // bar wipe
    [7.95, 8.3, 4, 1.0], [9.3, 9.6, 5, 1.0],
    [10.3, 10.8, 16, 1.5],    // whip
    [11.7, 12.2, 5, 1.0], [12.3, 12.7, 5, 1.0], [13.0, 13.25, 6, 1.4], [13.45, 13.75, 6, 1.2],
    [14.5, 15.0, 6, 1.2],
    [16.5, 16.75, 5, 1.0],
    [18.4, 19.1, 16, 1.5],
    [19.9, 20.5, 5, 1.0], [21.85, 22.6, 4, 1.0],
    [22.6, 23.05, 12, 1.5],
    [24.05, 24.35, 6, 1.2],
    [25.2, 25.7, 16, 1.5],
    [26.7, 27.0, 4, 1.0], [27.2, 28.1, 5, 1.2],
    [28.05, 28.75, 10, 1.5], [29.5, 29.8, 6, 1.2],
    [30.4, 30.95, 14, 1.5],
    [31.55, 31.8, 5, 1.0], [33.6, 34.4, 5, 1.0],
    [34.55, 34.9, 16, 1.5],
    [38.6, 38.95, 6, 1.2],
    [40.1, 40.6, 6, 1.2],
  );
}

// ------------------------------------------------------------------ Phobos helpers
const PH = 1800; // phobos.jpg size
// draw the Phobos photo with its centre at (cx, cy), drawn size S; optional cut piece hole
function drawPhobos(ctx, cx, cy, S, o = {}) {
  credit('phobos');
  const im = IMG.phobos;
  ctx.save();
  ctx.translate(cx, cy);
  if (o.rot) ctx.rotate(o.rot);
  if (o.hole) {
    // evenodd clip: everything except the piece
    ctx.beginPath();
    ctx.rect(-S, -S, 2 * S, 2 * S);
    PIECE.forEach(([u, v], k) => { const x = (u - 0.5) * S, y = (v - 0.5) * S; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.clip('evenodd');
  }
  ctx.globalAlpha *= o.a ?? 1;
  ctx.globalCompositeOperation = 'lighten';
  if (o.filter) ctx.filter = o.filter;
  ctx.drawImage(im, -S / 2, -S / 2, S, S);
  ctx.restore();
  if (o.hole && o.holeLine) {
    ctx.save(); ctx.translate(cx, cy); if (o.rot) ctx.rotate(o.rot);
    ctx.beginPath();
    PIECE.forEach(([u, v], k) => { const x = (u - 0.5) * S, y = (v - 0.5) * S; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.fillStyle = INK; ctx.globalAlpha *= 0.9; ctx.fill();
    ctx.globalAlpha = o.holeLine;
    ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = AMBER; ctx.stroke();
    ctx.restore();
  }
}
// the piece itself, drawn with its centroid at (x, y), scale relative to a Phobos of size S
function drawPiece(ctx, x, y, S, rot, o = {}) {
  credit('phobos');
  const [pu, pv] = LAY.pieceC;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  PIECE.forEach(([u, v], k) => { const px = (u - pu) * S, py = (v - pv) * S; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.closePath();
  if (o.glow) { ctx.save(); ctx.shadowColor = rgba(AMBER_RGB, 0.8 * o.glow); ctx.shadowBlur = 40 * o.glow; ctx.fillStyle = INK; ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.clip();
  ctx.globalCompositeOperation = 'lighten';
  if (o.filter) ctx.filter = o.filter;
  ctx.drawImage(IMG.phobos, -pu * S, -pv * S, S, S);
  ctx.restore();
  ctx.lineWidth = o.lw ?? 3; ctx.strokeStyle = o.line ?? AMBER; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
function drawMars(ctx, cx, cy, r, o = {}) {
  credit('mars');
  ctx.save();
  ctx.globalAlpha *= o.a ?? 1;
  ctx.translate(cx, cy);
  if (o.rot) ctx.rotate(o.rot);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  ctx.globalCompositeOperation = 'lighten';
  ctx.drawImage(IMG.mars, -r, -r, 2 * r, 2 * r);
  ctx.restore();
  if (o.ring) { ctx.save(); circle(ctx, cx, cy, r + 10); ctx.lineWidth = 2; ctx.strokeStyle = rgba(AMBER_RGB, o.ring); ctx.stroke(); ctx.restore(); }
}
// image fill descriptor for text (photo placed in screen space under the current transform)
const fillPhobos = (x, y, S, f) => ({ im: IMG.phobos, x: x - S / 2, y: y - S / 2, w: S, h: S, filter: f ?? 'brightness(1.35) contrast(1.1)' });
const fillMars = (x, y, S, f) => ({ im: IMG.mars, x: x - S / 2, y: y - S / 2, w: S, h: S, filter: f ?? 'brightness(1.25) saturate(1.1)' });

// dashed trajectory drawn on progressively; pts is a cubic bezier [p0, c1, c2, p1]
function trajectory(ctx, pts, prog, o = {}) {
  if (prog <= 0) return;
  const N = 80;
  const B = (k) => {
    const u = k, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
    return [a * pts[0][0] + b * pts[1][0] + c * pts[2][0] + d * pts[3][0], a * pts[0][1] + b * pts[1][1] + c * pts[2][1] + d * pts[3][1]];
  };
  ctx.save();
  ctx.setLineDash(o.dash ?? [14, 12]);
  ctx.lineDashOffset = -(o.flow ?? 0);
  ctx.lineWidth = o.w ?? 4; ctx.strokeStyle = o.color ?? AMBER; ctx.lineCap = 'round';
  ctx.beginPath();
  const end = Math.floor(N * prog);
  for (let k = 0; k <= end; k++) { const [x, y] = B(k / N); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  ctx.setLineDash([]);
  if (o.arrow && prog > 0.98) {
    const [x1, y1] = B(1), [x0, y0] = B(0.97);
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a - 0.5) * 22, y1 - Math.sin(a - 0.5) * 22);
    ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a + 0.5) * 22, y1 - Math.sin(a + 0.5) * 22); ctx.stroke();
  }
  ctx.restore();
  return B;
}
function bez(pts, u) {
  const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
  return [a * pts[0][0] + b * pts[1][0] + c * pts[2][0] + d * pts[3][0], a * pts[0][1] + b * pts[1][1] + c * pts[2][1] + d * pts[3][1]];
}
function ping(ctx, x, y, r0, t, t0, dur = 0.7, o = {}) {
  const p = (t - t0) / dur;
  if (p < 0 || p > 1) return;
  ctx.save(); circle(ctx, x, y, r0 + (o.grow ?? 160) * E.cOut(p)); ctx.lineWidth = (o.w ?? 4) * (1 - p) + 0.5; ctx.strokeStyle = rgba(o.rgb ?? AMBER_RGB, (1 - p) * (o.a ?? 1)); ctx.stroke(); ctx.restore();
}

// ================================================================== SPREAD 1: the hook (0 - 3.43)
function S1(ctx, t) {
  // ---- the lens: an echo of the ring eye expands into a window on Phobos
  const t0 = ws(1);
  if (t >= t0 - 0.02) {
    const pA = E.xOut(clamp((t - t0) / 0.55));
    const pB = E.cInOut(seg(t, 0.98, 1.42));
    const pC = E.cInOut(seg(t, 2.55, 3.0));
    const eye0 = [540 + (118 * 30) / 22, 900];
    let cx = lerp(eye0[0], 560, pA), cy = lerp(eye0[1], 960, pA), r = lerp(102, 320, pA);
    cx = lerp(cx, 540, pB); cy = lerp(cy, 640, pB); r = lerp(r, 245, pB);
    cy = lerp(cy, 600, pC); r = lerp(r, 225, pC);
    const rot = 0.05 * t;
    ctx.save();
    circle(ctx, cx, cy, Math.max(0, r - 3)); ctx.clip();
    const S = r * 2.25;
    drawPhobos(ctx, cx, cy + r * 0.04, S * (1 + 0.03 * t), { rot, filter: 'brightness(1.05)' });
    ctx.restore();
    ctx.save(); circle(ctx, cx, cy, r); ctx.lineWidth = lerp(8, 3, pA); ctx.strokeStyle = AMBER; ctx.stroke(); ctx.restore();
    ping(ctx, cx, cy, r, t, t0 + 0.12, 0.9, { grow: 140, w: 4 });
    LAY.lens = [cx, cy, r];
    // trajectory from the moon toward Mars (around the right edge)
    const pr = seg(t, 1.85, 2.5);
    trajectory(ctx, [[cx + r * 0.7, cy + r * 0.72], [1010, 900], [1040, 1300], [830, 1480]], E.cOut(pr), { arrow: true, flow: t * 30 });
  }
  // ---- Mars rises from below
  if (t > 1.45) {
    const p = E.cOut(seg(t, 1.45, 2.85));
    const bump = E.bOut(seg(t, 2.85, 3.2));
    const top = lerp(2050, 1530, p) - 40 * bump;
    const r = 1150;
    drawMars(ctx, 540, top + r, r, { rot: -0.02 * t });
  }
  // ---- data chip
  chip(ctx, t, 'PHOBOS · 27 x 22 x 18 km', 0.55, { a: 1 - seg(t, 1.7, 1.8) });
  chip(ctx, t, '1.8 m (6 ft) closer to Mars every 100 years', 1.85);

  // ---- words, block A: "This moon" / "is on a"
  exitUp(ctx, t, 1.0, 0.22, 330, 520, () => {
    wline(ctx, t, [0, 1], 80, 480, (i) => (i === 0 ? { px: 150, wt: 800, color: PAPER, fx: 'slam', from: 1.5 } : { px: 150, wt: 800, color: AMBER, fx: 'rise' }));
  });
  exitUp(ctx, t, 1.5, 0.22, 1300, 1440, () => {
    wline(ctx, t, [2, 3, 4], 80, 1405, () => ({ px: 104, wt: 300, color: PAPER, fx: 'rise' }));
  });
  // ---- block B: "slow-motion" (width stretches in slow motion)
  if (t >= ws(5)) {
    const p = E.sInOut(seg(t, ws(5), ws(6) + 0.1));
    const wd = lerp(62, 125, p);
    exitUp(ctx, t, 2.48, 0.22, 900, 1030, () => {
      const a = age(5, t);
      txt(ctx, WORDS[5].text, { x: 80, y: 1015, px: 106, wd, wt: lerp(300, 800, p), ls: lerp(0, 5, p), color: PAPER, a: clamp(a * 30 + 0.3), word: 5, shadow: 1 });
    });
  }
  // ---- "collision" / "course": two lines converge and collide
  const tImp = 2.42;
  const yCol = strack([[0, 1200], [ws(6) + 0.02, 1222, 6, 0.9], [ws(7), 1246, 30, 0.42], [2.6, 1080, 14, 0.62]], t);
  const yCou = strack([[0, 1430], [ws(7), 1372, 30, 0.42], [2.6, 1215, 14, 0.62]], t);
  const [sx, sy] = shake(t, tImp, 14, 0.4, 3);
  const squash = 1 - 0.12 * Math.exp(-Math.max(0, t - tImp) * 14) * (t >= tImp ? 1 : 0);
  if (t >= ws(6)) cw(ctx, t, 6, 80 + sx, yCol + sy, { px: 158, wd: 74, wt: 900, color: PAPER, fx: 'left', dist: 70, sy: squash, oy: 1 });
  if (t >= ws(7)) {
    const wC = measure(ctx, WORDS[7].text, 158, 74, 900);
    cw(ctx, t, 7, 900 - wC - sx, yCou - sy, { px: 158, wd: 74, wt: 900, color: AMBER, fx: 'right', dist: 70, sy: squash, oy: 0 });
  }
  if (t >= tImp && t < tImp + 0.25) {
    const k = 1 - (t - tImp) / 0.25;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(AMBER_RGB, 0.55 * k); ctx.fillRect(0, (yCol + yCou) / 2 - 40 - 4 * k, W, 2 + 8 * k);
    ctx.restore();
  }
  // ---- "with Mars."
  if (t >= ws(8)) {
    wline(ctx, t, [8, 9], 80, 1395, (i) => (i === 8 ? { px: 92, wt: 300, color: PAPER, fx: 'rise' } : { px: 210, wt: 900, color: AMBER, fx: 'slam', from: 1.6, ox: 0 }));
  }
}

// ================================================================== SPREAD 2: Japan launched a heist (3.43 - 7.33)
function S2(ctx, t) {
  // ---- amber field: grows from the period of "Mars.", collapses into the rocket's flame
  const [dx0, dy0] = LAY.marsDot;
  const grow = E.xIn(seg(t, 3.2, 3.43));
  const rocketX = 790, padY = 1700;
  const coll = E.xIn(seg(t, 4.3, 4.56));
  const acx = lerp(lerp(dx0, 540, grow), rocketX, E.cInOut(seg(t, 4.0, 4.5)));
  const acy = lerp(lerp(dy0, 960, grow), padY, E.cInOut(seg(t, 4.0, 4.5)));
  const ar = lerp(grow * 2300, 0, coll);
  const amberOn = t < 4.6;
  const amberClip = (c) => { c.beginPath(); c.arc(acx, acy, ar, 0, TAU); };
  if (amberOn && ar > 0) { ctx.save(); amberClip(ctx); ctx.fillStyle = AMBER; ctx.fill(); ctx.restore(); }

  // two-tone words: ink inside the amber field, paper outside
  const twoTone = (fn) => {
    ctx.save(); fn(PAPER); ctx.restore();
    if (amberOn && ar > 0) { ctx.save(); amberClip(ctx); ctx.clip(); fn(INK); ctx.restore(); }
  };
  // ---- the H3 (illustration) rises out of the collapsing amber
  const lift = E.xIn(seg(t, 4.45, 4.95));
  if (t > 4.25 && t < 5.0) {
    illus('JAXA');
    const by = padY + 120 * (1 - E.xOut(seg(t, 4.25, 4.45))) - 2600 * lift;
    ctx.save(); ctx.translate(rocketX, by - 342 * 0.95); ctx.scale(0.95, 0.95);
    drawH3(ctx, t, { fire: clamp(seg(t, 4.38, 4.5) * 1.2) * (1 + 0.8 * lift) });
    ctx.restore();
    // exhaust column left behind
    if (lift > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, by, 0, H);
      g.addColorStop(0, rgba(AMBER_RGB, 0.5)); g.addColorStop(1, rgba(AMBER_RGB, 0));
      ctx.fillStyle = g; ctx.fillRect(rocketX - 30, by, 60, H - by);
      ctx.restore();
    }
  }
  if (t > 3.5 && t < 5.0) chip(ctx, t, 'H3 F10 · LAUNCH 04:41:03 JST, OCT 20, 2026', 3.62, { color: t < 4.45 ? INK : AMBER, tick: t < 4.45 ? INK : AMBER, a: 1 - seg(t, 4.75, 4.95) });

  // ---- "Japan just launched" (follow the rocket up and away)
  const away = E.xIn(seg(t, 4.62, 4.9));
  if (t < 4.95) {
    ctx.save();
    ctx.translate(0, -away * 1400);
    twoTone((col) => {
      cw(ctx, t, 10, 80, 760, { px: fitPx(ctx, WORDS[10].text, 816, 250, 108, 900), wd: 108, wt: 900, color: col, fx: 'slam', from: 1.3, dur: 0.3, ox: 0 });
      cw(ctx, t, 11, 80, 905, { px: 120, wt: 300, color: col, fx: 'rise' });
      // "launched": lifts with the rocket, letters stagger
      if (shown(12, t)) {
        const a = age(12, t);
        const L = letterLayout(ctx, WORDS[12].text, 150, 100, 900, 'A');
        const w = measure(ctx, WORDS[12].text, 150, 100, 900);
        regWord(ctx, 12, 80, 1070 - 112, 80 + w, 1070 + 33);
        L.forEach((l, k) => {
          const kk = clamp((a - k * 0.012) / 0.25);
          const up = -E.xOut(kk) * 18 + (1 - E.xOut(kk)) * 120 - E.xIn(clamp((a - 0.1 - k * 0.02) / 0.5)) * 40;
          txt(ctx, l.ch, { x: 80 + l.x, y: 1070 + up, px: 150, wt: 900, color: col, a: clamp(kk * 4) });
        });
      }
    });
    ctx.restore();
  }

  // ---- "a heist": the eyes' spotlight finds the word
  const out2 = E.cIn(seg(t, 5.3, 5.5));
  if (t >= ws(13) && t < 5.55) {
    ctx.save();
    ctx.translate(0, -out2 * 320);
    ctx.globalAlpha *= 1 - out2;
    cw(ctx, t, 13, 80, 900, { px: 110, wt: 300, color: PAPER, fx: 'rise' });
    if (shown(14, t)) {
      const a = age(14, t);
      const sweep = E.cInOut(clamp(a / 0.14));
      const spotX = lerp(150, 520, sweep), spotR = lerp(200, 900, E.cIn(clamp((a - 0.07) / 0.14)));
      const wH = measure(ctx, WORDS[14].text, 240, 112, 900);
      // dim base
      txt(ctx, WORDS[14].text, { x: 80, y: 1150, px: 240, wd: 112, wt: 900, color: rgba(PAPER_RGB, 0.55), word: 14 });
      // lit part
      ctx.save(); circle(ctx, spotX, 1060, spotR); ctx.clip();
      txt(ctx, WORDS[14].text, { x: 80, y: 1150, px: 240, wd: 112, wt: 900, color: AMBER });
      ctx.restore();
      // the beam from the eyes
      const E2 = eyesAt(t);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(spotX, 1060, 10, spotX, 1060, Math.min(spotR, 500));
      g.addColorStop(0, rgba(AMBER_RGB, 0.18 * (1 - out2))); g.addColorStop(1, rgba(AMBER_RGB, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(E2.x, E2.y); ctx.lineTo(spotX - spotR * 0.5, 1060 - spotR * 0.35); ctx.lineTo(spotX + spotR * 0.2, 1060 + spotR * 0.5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- "to steal a piece of it.": Phobos returns, a piece is cut and taken
  if (t >= 5.3) {
    const inP = E.xOut(seg(t, 5.32, 5.9));
    const exitP = E.xInOut(seg(t, 7.12, 7.42));
    const S = 760;
    const cx = 560 + 40 * Math.sin(t * 0.4), cy = lerp(1900, 1130, inP);
    const tCut = ws(18) + 0.05;
    const crack = seg(t, tCut, tCut + 0.18);
    const off = spring(t - (tCut + 0.2), 9, 0.5);
    drawPhobos(ctx, cx, cy, S, { rot: 0.03 * (t - 5.3), hole: t >= tCut + 0.2, holeLine: 0.9 * clamp((t - tCut - 0.2) * 5) });
    // crack line drawing on
    if (crack > 0 && t < tCut + 0.3) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.03 * (t - 5.3));
      ctx.beginPath();
      const n = Math.floor(PIECE.length * crack);
      for (let k = 0; k <= n; k++) { const [u, v] = PIECE[k % PIECE.length]; const x = (u - 0.5) * S, y = (v - 0.5) * S; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.lineWidth = 4; ctx.strokeStyle = AMBER; ctx.stroke(); ctx.restore();
    }
    if (t >= tCut + 0.2) {
      const [pu, pv] = LAY.pieceC;
      const rot0 = 0.03 * (t - 5.3);
      const px0 = cx + (pu - 0.5) * S, py0 = cy + (pv - 0.5) * S;
      const px1 = px0 + 60 * off, py1 = py0 - 330 * off;
      LAY.piece2 = [px1, py1, S, rot0 + 0.35 * off];
      drawPiece(ctx, px1, py1, S, rot0 + 0.35 * off, { glow: off * (0.6 + 0.4 * Math.sin(t * 6)) });
    }
  }
  if (t >= ws(15)) {
    wline(ctx, t, [15, 16], 80, 520, (i) => (i === 15 ? { px: 120, wt: 300, color: PAPER, fx: 'rise' } : { px: 210, fam: 'S', color: AMBER, fx: 'slam', from: 1.4, ox: 0 }));
    wline(ctx, t, [17, 18, 19, 20], 80, 700, (i) => ({ px: 112, wt: i === 18 ? 900 : 300, color: PAPER, fx: 'rise' }));
  }
}

// bar wipe between S2 and S3 (left to right): returns the bar's x range
function barWipe(t) { const p = E.cInOut(seg(t, 7.1, 7.45)); return [lerp(-300, 1080, p), lerp(0, 1380, p)]; }

// ================================================================== SPREAD 3: Step one (7.33 - 10.27)
function S3(ctx, t) {
  // giant outline numeral
  const nIn = E.xOut(seg(t, 7.3, 7.9));
  const nOut = E.xIn(seg(t, 10.35, 10.7));
  bigNumeral(ctx, t, '1', lerp(-200, 520, nIn), 1460, 1150, 0.9 - 0.9 * nOut, { hit: ws(22) });
  // Mars disc (top right) and MMX on its way
  const mIn = E.xOut(seg(t, ws(23) - 0.1, ws(23) + 0.5));
  const mx = lerp(1300, 860, mIn), my = 520;
  const mr = 165;
  if (mIn > 0) drawMars(ctx, mx, my, mr, { rot: 0.03 * t, ring: 0.6 * mIn });
  const path = [[150, 1330], [180, 950], [430, 600], [mx - mr - 40, my + 30]];
  const pr = E.sInOut(seg(t, 7.5, 9.3));
  if (t > 7.45) {
    illus('JAXA');
    trajectory(ctx, path, pr, { color: rgba(AMBER_RGB, 0.75), w: 3, dash: [8, 10], flow: t * 40 });
    // orbit after arrival
    const orb = seg(t, 9.25, 10.6);
    let [x, y] = bez(path, pr);
    let ang = 0;
    if (orb > 0) {
      const a = Math.PI + 0.1 - orb * 2.2;
      x = lerp(x, mx + Math.cos(a) * (mr + 46), E.cOut(clamp(orb * 4)));
      y = lerp(y, my + Math.sin(a) * (mr + 46) * 0.45, E.cOut(clamp(orb * 4)));
      ctx.save(); ctx.beginPath(); ctx.ellipse(mx, my, mr + 46, (mr + 46) * 0.45, 0, 0, TAU); ctx.setLineDash([6, 10]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(AMBER_RGB, 0.6 * clamp(orb * 5)); ctx.stroke(); ctx.restore();
    }
    const [x2, y2] = bez(path, clamp(pr + 0.01));
    ang = Math.atan2(y2 - y, x2 - x);
    ctx.save(); ctx.translate(x, y); ctx.rotate(orb > 0 ? 0 : ang * 0.15); ctx.scale(0.3, 0.3); drawMMX(ctx, t, { fire: 0 }); ctx.restore();
  }
  chip(ctx, t, 'EACH WAY: JUST UNDER ONE YEAR', 8.05);
  // words
  wline(ctx, t, [21, 22], 80, 470, (i) => (i === 21 ? { px: 120, wt: 300, color: PAPER, fx: 'rise' } : { px: 120, wt: 900, color: AMBER, fx: 'slam', ox: 0 }));
  if (shown(23, t)) {
    const a = age(23, t);
    const k = E.xOut(clamp(a / 0.4));
    cw(ctx, t, 23, 80, 760, { px: 200, wd: 100, wt: 900, fx: 'none', img: fillMars(380 - 60 * k, 680, 900, 'brightness(1.5) saturate(1.15)'), s: lerp(1.12, 1, k), ox: 0, a: clamp(a * 30 + 0.3) });
    // thin paper outline for definition
    txt(ctx, WORDS[23].text, { x: 80, y: 760, px: 200, wd: 100, wt: 900, stroke: { w: 1.5, color: rgba(PAPER_RGB, 0.35) }, s: lerp(1.12, 1, k), ox: 0 });
  }
  cw(ctx, t, 24, 80, 925, { px: 120, wt: 300, color: PAPER, fx: 'rise' });
  // 2027. digits rise one after another
  if (shown(25, t)) {
    const a = age(25, t);
    const str = WORDS[25].text;
    const pxD = fitPx(ctx, str, 815, 300, 104, 900);
    const L = letterLayout(ctx, str, pxD, 104, 900, 'A');
    const w = measure(ctx, str, pxD, 104, 900);
    regWord(ctx, 25, 80, 1235 - pxD * 0.74, 80 + w, 1235 + 20);
    ctx.save(); ctx.beginPath(); ctx.rect(60, 1235 - 250, 860, 300); ctx.clip();
    L.forEach((l, k) => {
      const p = E.xOut(clamp((a - k * 0.035) / 0.3));
      txt(ctx, l.ch, { x: 80 + l.x, y: 1235 + (1 - p) * 260, px: pxD, wd: 104, wt: 900, color: AMBER });
    });
    ctx.restore();
    // underline rule
    const u = E.xOut(clamp((a - 0.15) / 0.5));
    ctx.fillStyle = AMBER; ctx.fillRect(80, 1268, (w - 10) * u, 6);
  }
}

// ================================================================== SPREAD 4: Step two (10.74 - 14.86)
function S4(ctx, t) {
  const nIn = E.xOut(seg(t, 10.5, 11.1));
  bigNumeral(ctx, t, '2', 470, lerp(2500, 1460, nIn), 1150, 0.9 * (1 - seg(t, 13.0, 13.2)), { hit: ws(27) });
  // the rover drops (illustration) from the mothership's height
  const tDrop = ws(28);
  if (t >= tDrop - 0.1 && t < 14.55) {
    illus('DLR');
    const fall = clamp((t - tDrop) / 0.7);
    const ground = 1330;
    const y0 = -120;
    const yR = t < 13.1 ? lerp(y0, ground, fall * fall) : ground;
    const land = t - (tDrop + 0.7);
    const squash = land > 0 ? 1 - 0.18 * Math.exp(-land * 10) * Math.cos(land * 30) : 1;
    // drop line + label
    if (t < 13.1) {
      ctx.save(); ctx.setLineDash([6, 10]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(AMBER_RGB, 0.7);
      ctx.beginPath(); ctx.moveTo(860, 380); ctx.lineTo(860, Math.max(380, Math.min(yR - 70, ground))); ctx.stroke(); ctx.restore();
    }
    // ground line
    const gl = E.xOut(seg(t, tDrop, tDrop + 0.6));
    ctx.fillStyle = rgba(PAPER_RGB, 0.5); ctx.fillRect(540, ground + 52 + 30, 360 * gl, 2);
    // rover moves to the left half in block B
    const shiftB = E.cInOut(seg(t, 13.05, 13.5));
    const rx = lerp(860, 640, shiftB), ry = yR;
    const sc = lerp(0.9, 1.15, shiftB);
    ctx.save(); ctx.translate(rx, ry + 52 * sc); ctx.scale(sc / squash ** 0.5, sc * squash); ctx.translate(0, -52); drawRover(ctx, t, { spin: 0 }); ctx.restore();
    if (land > 0) ping(ctx, rx, ground + 82, 30, t, tDrop + 0.7, 0.6, { grow: 200, w: 3 });
  }
  chip(ctx, t, 'DROPPED FROM ABOUT 40 m, IN FREE FALL (DLR)', ws(28) + 0.05, { a: 1 - seg(t, 13.0, 13.1) });
  chip(ctx, t, 'ABOUT THE SIZE OF A CRATE OF DRINKS (DLR)', ws(33));

  // block A: Step two: drop a lookout.
  exitUp(ctx, t, 13.0, 0.18, 330, 1080, () => {
    wline(ctx, t, [26, 27], 80, 470, (i) => (i === 26 ? { px: 120, wt: 300, color: PAPER, fx: 'rise' } : { px: 120, wt: 900, color: AMBER, fx: 'slam', ox: 0 }));
    // "drop" falls into place with a bounce
    let xEnd = 80;
    if (shown(28, t)) {
      const a = age(28, t);
      const yy = 740 - 130 * (1 - spring(a, 16, 0.38));
      ctx.save(); ctx.beginPath(); ctx.rect(0, 492, W, 400); ctx.clip();
      txt(ctx, WORDS[28].text, { x: 80, y: yy, px: 230, wt: 900, color: PAPER, a: clamp(a * 30 + 0.4), word: 28, sy: 1 + 0.12 * Math.sin(a * 20) * Math.exp(-a * 6), oy: 1 });
      ctx.restore();
    }
    xEnd = 80 + measure(ctx, WORDS[28].text, 230, 100, 900) + 230 * 0.16;
    cw(ctx, t, 29, xEnd, 740, { px: 120, wt: 300, color: PAPER, fx: 'rise' });
    // "lookout." with the eyes as its two o's
    if (shown(30, t)) {
      // the word lands whole, then the eyes drop into its two o's and the letters make room
      const a = age(30, t), L = LAY.look, RL = LAY.lookReal;
      const k = E.xOut(clamp(a / 0.3));
      const m = E.cInOut(seg(t, 12.6, 12.72));
      const yy = L.y + (1 - k) * 60;
      txt(ctx, 'l', { x: L.xl, y: yy, px: L.px, wt: 900, color: PAPER });
      if (m < 1) for (const xo of [RL.xo1, RL.xo2]) txt(ctx, 'o', { x: xo, y: yy, px: L.px, wt: 900, color: PAPER, s: 1 - 0.6 * m, a: 1 - m, oy: 0.75 });
      const xk = lerp(RL.xk, L.xRest, m);
      txt(ctx, 'kout.', { x: xk, y: yy, px: L.px, wt: 900, color: PAPER });
      const wEnd = measure(ctx, 'kout.', L.px, 100, 900);
      regWord(ctx, 30, L.xl, L.y - L.px * 0.74, xk + wEnd, L.y + L.px * 0.22);
    }
  });
  // block B: A 25 kilo rover.
  if (shown(31, t)) {
    exitUp(ctx, t, 14.58, 0.24, 470, 1140, () => {
      cw(ctx, t, 31, 80, 600, { px: 120, wt: 300, color: PAPER, fx: 'rise' });
      const w25 = cw(ctx, t, 32, 80, 940, { px: 400, wd: 106, wt: 900, color: AMBER, fx: 'slam', from: 1.7, dur: 0.3, ox: 0.1 });
      cw(ctx, t, 33, 80 + w25 + 30, 940, { px: fitPx(ctx, WORDS[33].text, 816 - w25 - 30, 150, 100, 800), wt: 800, color: PAPER, fx: 'rise' });
      cw(ctx, t, 34, 80, 1100, { px: 150, wt: 800, color: PAPER, fx: 'rise' });
    });
  }
}

// ================================================================== SPREAD 5: 15 grams (14.86 - 18.14)
function S5(ctx, t) {
  // Phobos rises as the ground under the rover
  const pIn = E.cOut(seg(t, 14.55, 15.3));
  const S = 2500;
  const gy = lerp(3000, 2452, pIn);
  drawPhobos(ctx, 560 - 8 * (t - 15), gy, S, { rot: Math.PI + 0.004 * (t - 15) });
  // the rover on the horizon (still the illustration)
  if (t >= 14.55 && t < 18.9) {
    illus('DLR');
    const rx = lerp(640, 690, pIn), ry = lerp(1330, 1185 + 6, pIn);
    const sc = lerp(1.15, 0.75, pIn);
    ctx.save(); ctx.translate(rx, ry + 52 * sc); ctx.scale(sc, sc); ctx.translate(0, -52); drawRover(ctx, t, { spin: 0 }); ctx.restore();
  }
  chip(ctx, t, '25 kg ROVER · THE EQUIVALENT OF 15 g ON PHOBOS (ESA)', 16.6);
  // words
  const out = E.cIn(seg(t, 18.45, 18.95));
  ctx.save();
  ctx.translate(0, -out * 140);
  ctx.globalAlpha *= 1 - out;
  const pxPh = fitPx(ctx, WORDS[36].text, 820 - measure(ctx, WORDS[35].text, 120, 100, 300) - 120 * SP, 210, 100, 900);
  wline(ctx, t, [35, 36], 80, 500, (i) => (i === 35 ? { px: 120, wt: 300, color: PAPER, fx: 'rise' } :
    { px: pxPh, wt: 900, fx: 'slam', from: 1.3, ox: 0, img: fillPhobos(560, 420, 1500), color: PAPER }));
  // "it weighs..." sinks under its own weight
  if (shown(37, t)) {
    const sag = 18 * E.cInOut(seg(t, ws(38), ws(39)));
    wline(ctx, t, [37, 38], 80, 680 + sag, () => ({ px: 120, wt: 700, color: PAPER, fx: 'rise' }));
  }
  ctx.restore();
  // "15": heavy to hairline, then floats away weightless
  if (shown(39, t)) {
    const a = age(39, t);
    const light = E.sInOut(clamp((a - 0.25) / 1.0));
    const fl = Math.max(0, a - 0.5);
    const yy = 1000 - 34 * fl - 160 * E.xIn(seg(t, 18.4, 19.0));
    const rot = -0.025 * fl;
    const st = { px: 360, wd: 106, wt: lerp(900, 130, light), color: AMBER, fx: 'slam', from: 1.15, ox: 0 };
    ctx.save(); ctx.globalAlpha *= 1 - seg(t, 18.6, 19.0);
    ctx.translate(80, yy); ctx.rotate(rot); ctx.translate(-80, -yy);
    const w15 = cw(ctx, t, 39, 80, yy, st);
    ctx.restore();
    // "grams." letters drift apart in zero g
    if (shown(40, t)) {
      const a2 = age(40, t);
      const L = letterLayout(ctx, WORDS[40].text, 150, 100, 600, 'A');
      const x0 = 80;
      const w = measure(ctx, WORDS[40].text, 150, 100, 600);
      const rnd = mulberry32(7);
      const y0 = 1160 - 34 * Math.max(0, a2 - 0.2) * 0.5;
      regWord(ctx, 40, x0, y0 - 112, x0 + w, y0 + 33);
      ctx.save(); ctx.globalAlpha *= 1 - seg(t, 18.6, 19.0);
      L.forEach((l, k) => {
        const vx = (rnd() - 0.5) * 22, vy = -(8 + rnd() * 26), vr = (rnd() - 0.5) * 0.35;
        const d = Math.max(0, a2 - 0.15);
        const p = E.xOut(clamp(a2 / 0.25));
        txt(ctx, l.ch, { x: x0 + l.x + vx * d, y: y0 + vy * d + (1 - p) * 40 - 120 * E.xIn(seg(t, 18.4, 19.0)), px: 150, wt: 600, color: PAPER, r: vr * d, a: p });
      });
      ctx.restore();
    }
  }
}

// ================================================================== SPREAD 6: Step three (18.99 - 22.90)
function S6(ctx, t) {
  ctx.globalAlpha *= 1 - E.cIn(seg(t, 22.66, 22.9));
  const nIn = E.xOut(seg(t, 18.7, 19.3));
  bigNumeral(ctx, t, '3', 470, lerp(2500, 1460, nIn), 1150, 0.8 * (1 - seg(t, 22.6, 22.9)), { hit: ws(42) });
  chip(ctx, t, 'CORER DIGS TO 2 cm', ws(46) + 0.1, { a: 1 - seg(t, ws(47) + 0.1, ws(47) + 0.2) });
  chip(ctx, t, "GAS SAMPLER: 'A FRACTION OF A SECOND'", ws(47) + 0.25);
  // ground: the Phobos limb low in frame
  const zoom = E.xIn(seg(t, 22.62, 23.0));
  const zc = [600 + 150, 1330 + 170];
  ctx.save();
  ctx.translate(zc[0], zc[1]); ctx.scale(1 + zoom * 5, 1 + zoom * 5); ctx.translate(-zc[0], -zc[1]);
  drawPhobos(ctx, 520 + 6 * (t - 19), 2652, 2700, { rot: Math.PI - 0.06 });
  // the lander comes down for the grab
  illus('JAXA'); illus('NASA');
  const down = E.cOut(seg(t, 19.0, 20.12));
  const ly = lerp(760, 1192, down);
  const lx = lerp(1320, 600, down);
  const bob = (1 - down) * 0;
  const arm = E.cInOut(seg(t, ws(45), ws(45) + 0.45));
  const core = E.cInOut(seg(t, ws(46), ws(46) + 0.4));
  const blast = seg(t, ws(48) - 0.1, ws(48) + 0.65);
  ctx.save(); ctx.translate(lx, ly + bob); ctx.rotate(0.35 * (1 - down)); ctx.scale(1, 1);
  const lp = drawLander(ctx, t, { arm, core, blast });
  ctx.restore();
  // regolith lofted by the gas (drawn dots)
  if (blast > 0 && blast < 1) {
    const rnd = mulberry32(11);
    for (let k = 0; k < 26; k++) {
      const ang = -Math.PI / 2 + (rnd() - 0.5) * 1.6, sp = 160 + rnd() * 260, d0 = rnd() * 0.25;
      const p = clamp((blast - d0) / 0.75);
      if (p <= 0 || p >= 1) continue;
      const x = lx + lp.sampler[0] + Math.cos(ang) * sp * p, y = ly + lp.sampler[1] + 6 + Math.sin(ang) * sp * p + 140 * p * p;
      circle(ctx, x, y, 3 + rnd() * 4); ctx.fillStyle = rgba(PAPER_RGB, 1 - p); ctx.fill();
    }
  }
  // touchdown dust ping
  ping(ctx, 600, 1192 + 175, 120, t, 20.12, 0.7, { grow: 220, w: 3 });
  // callout tags (diagram labels); the numbers go in the data chip
  if (t > ws(46) + 0.15) {
    const k = E.xOut(seg(t, ws(46) + 0.15, ws(46) + 0.45));
    const tipx = lx + lp.corerTip[0], tipy = ly + lp.corerTip[1] - 30;
    line(ctx, tipx - 16, tipy, tipx - 16 - 70 * k, tipy - 50 * k, 2, AMBER);
    if (k > 0.5) label(ctx, 'CORER', tipx - 16 - 70 - 8, tipy - 50 - 8, { px: 22, color: AMBER, align: 'right', ls: 1, a: (k - 0.5) * 2 });
  }
  if (t > ws(48) + 0.05) {
    const k = E.xOut(seg(t, ws(48) + 0.05, ws(48) + 0.35));
    const sx = lx + lp.sampler[0] + 14, sy = ly + lp.sampler[1] - 24;
    line(ctx, sx, sy, sx + 40 * k, sy - 70 * k, 2, AMBER);
    if (k > 0.5) label(ctx, 'GAS SAMPLER', sx + 40 - 4, sy - 70 - 10, { px: 22, color: AMBER, align: 'right', ls: 1, a: (k - 0.5) * 2 });
  }
  ctx.restore();
  // words
  const out = zoom;
  ctx.save(); ctx.globalAlpha *= 1 - out;
  wline(ctx, t, [41, 42], 80, 470, (i) => (i === 41 ? { px: 120, wt: 300, color: PAPER, fx: 'rise' } : { px: 120, wt: 900, color: AMBER, fx: 'slam', ox: 0 }));
  cw(ctx, t, 43, 80, 700, { px: 120, wt: 300, color: PAPER, fx: 'rise' });
  if (shown(44, t)) {
    const a = age(44, t);
    const clench = E.bOut2(clamp((a - 0.18) / 0.22));
    const wd = lerp(125, 66, clench);
    const xg = 80 + measure(ctx, WORDS[43].text, 120, 100, 300) + 120 * SP;
    txt(ctx, WORDS[44].text, { x: xg, y: 700, px: 230, wd, wt: 900, color: AMBER, word: 44, a: clamp(a * 30 + 0.4), sy: 1 + 0.06 * clench * Math.exp(-Math.max(0, a - 0.4) * 8) });
  }
  wline(ctx, t, [45, 46], 80, 850, (i) => ({ px: 112, wt: i === 45 ? 900 : 300, color: PAPER, fx: 'rise' }));
  if (shown(47, t)) {
    // "nitrogen blaster." gets a gust: letters shove right then settle
    const wNB = measure(ctx, WORDS[47].text, 112, 100, 900) + 112 * SP + measure(ctx, WORDS[48].text, 112, 100, 300);
    const pxNB = wNB > 816 ? Math.floor((112 * 816) / wNB) : 112;
    const end = wline(ctx, t, [47], 80, 990, () => ({ px: pxNB, wt: 900, color: PAPER, fx: 'rise' }));
    if (shown(48, t)) {
      const a = age(48, t);
      const L = letterLayout(ctx, WORDS[48].text, pxNB, 100, 300);
      const w = measure(ctx, WORDS[48].text, pxNB, 100, 300);
      regWord(ctx, 48, end, 990 - pxNB * 0.74, end + w, 990 + pxNB * 0.22);
      L.forEach((l, k) => {
        const gust = Math.max(0, Math.sin(clamp((a - k * 0.025) / 0.35) * Math.PI)) * (10 + k * 1.5);
        txt(ctx, l.ch, { x: end + l.x + gust * 0.6, y: 990 - gust * 0.5, px: pxNB, wt: 300, color: PAPER, a: clamp(a * 30 + 0.4) });
      });
    }
  }
  ctx.restore();
}

// ================================================================== SPREAD 7: Target (22.90 - 24.90)
function S7(ctx, t) {
  const zin = E.xOut(seg(t, 22.85, 23.25));
  const out = E.xIn(seg(t, 25.25, 25.6));
  ctx.save();
  ctx.translate(0, -out * 1920);
  // target rings around the zero of "10"
  const x10 = 80, y10 = 1075;
  const px10 = 440;
  const w1 = measure(ctx, '1', px10, 100, 900);
  const w0 = measure(ctx, '0', px10, 100, 900);
  const zx = x10 + w1 + w0 / 2, zy = y10 - px10 * 0.36;
  LAY.zero = [zx, zy];
  const ringsP = E.xOut(seg(t, 22.9, 23.6));
  ctx.save();
  for (let k = 0; k < 4; k++) {
    const r = (110 + k * 95) * lerp(3, 1, ringsP) + 6 * Math.sin(t * 3 + k);
    circle(ctx, zx, zy, r);
    ctx.lineWidth = k === 0 ? 4 : 2; ctx.strokeStyle = rgba(AMBER_RGB, (k === 0 ? 0.9 : 0.4 - k * 0.07) * ringsP); ctx.stroke();
  }
  // cross hairs
  ctx.strokeStyle = rgba(AMBER_RGB, 0.35 * ringsP); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(zx - 460, zy); ctx.lineTo(zx - 130, zy); ctx.moveTo(zx + 130, zy); ctx.lineTo(zx + 460, zy);
  ctx.moveTo(zx, zy - 460); ctx.lineTo(zx, zy - 130); ctx.moveTo(zx, zy + 130); ctx.lineTo(zx, zy + 460); ctx.stroke();
  ctx.restore();
  for (let k = 0; k < 3; k++) ping(ctx, zx, zy, 110, t, ws(52) + k * 0.2, 0.9, { grow: 300, w: 3 });
  // words
  cw(ctx, t, 49, 80, 470, { px: 150, wt: 900, color: PAPER, fx: 'slam', from: 1.4, ox: 0 });
  wline(ctx, t, [50, 51], 80, 640, () => ({ px: 120, wt: 300, color: PAPER, fx: 'rise' }));
  if (shown(52, t)) {
    const [sx, sy] = shake(t, ws(52), 16, 0.4, 5);
    cw(ctx, t, 52, x10 + sx, y10 + sy, { px: px10, wd: 100, wt: 900, color: AMBER, fx: 'slam', from: 1.8, dur: 0.3, ox: 0.3 });
  }
  cw(ctx, t, 53, 80, 1215, { px: 130, wt: 800, color: PAPER, fx: 'rise' });
  // Hayabusa2 vs MMX bars (to scale, from facts)
  const bars = [
    ['HAYABUSA2 AIMED FOR 0.1 g', 0.1, MUTED],
    ['HAYABUSA2 GOT 5.4 g', 5.4, PAPER],
    ['MMX TARGET: AT LEAST 10 g', 10, AMBER],
  ];
  const b0 = ws(52) + 0.25;
  bars.forEach(([lab, v, col], k) => {
    const p = E.xOut(seg(t, b0 + k * 0.12, b0 + k * 0.12 + 0.5));
    if (p <= 0) return;
    const y = 1290 + k * 56;
    credit('chart');
    label(ctx, lab, 80, y, { px: 24, color: col === MUTED ? PAPER : col, ls: 1, a: p });
    ctx.fillStyle = col; ctx.fillRect(80, y + 10, Math.max(4, (v / 10) * 600 * p), 14);
  });
  ctx.restore();
}

// ================================================================== SPREAD 8: Step four (25.59 - 30.42)
function S8(ctx, t) {
  const inn = E.xOut(seg(t, 25.25, 25.65));
  ctx.save();
  ctx.translate(0, (1 - inn) * 1920);
  const nOut = seg(t, 28.0, 28.2);
  bigNumeral(ctx, t, '4', 470, 1460, 1150, 0.8 * (1 - nOut), { hit: ws(55) });
  // ---- block A: one burn to leave Mars.
  const leave = E.cInOut(seg(t, ws(59), ws(60) + 0.6));
  const blockAOut = E.xIn(seg(t, 28.0, 28.25));
  if (t < 28.3) {
    ctx.save(); ctx.translate(0, -blockAOut * 1300);
    const mr = lerp(430, 70, leave), mx = lerp(300, 180, leave), my = lerp(1560, 1330, leave);
    drawMars(ctx, mx, my, mr, { rot: 0.02 * t });
    illus('JAXA');
    const fire = E.xOut(seg(t, ws(57), ws(57) + 0.2));
    const cx = lerp(650, 760, leave), cy = lerp(1140, 900, leave) - 30 * fire * (1 - leave);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(lerp(0.0, 0.6, leave)); ctx.scale(0.62, 0.62);
    drawMMX(ctx, t, { fire: fire * (1 + 0.15 * Math.sin(t * 30)) });
    ctx.restore();
    if (leave > 0) {
      trajectory(ctx, [[mx + mr * 0.5, my - mr * 0.6], [mx + 200, my - 300], [cx - 200, cy + 100], [cx - 40, cy + 30]], leave, { color: rgba(AMBER_RGB, 0.6), w: 3, dash: [8, 10] });
    }
    wline(ctx, t, [54, 55], 80, 470, (i) => (i === 54 ? { px: 120, wt: 300, color: PAPER, fx: 'rise' } : { px: 120, wt: 900, color: AMBER, fx: 'slam', ox: 0 }));
    const xb = wline(ctx, t, [56], 80, 690, () => ({ px: 140, wt: 300, color: PAPER, fx: 'rise' }));
    if (shown(57, t)) {
      // "burn" ignites: amber heat rising through the letters, flame tongues on the baseline
      const a = age(57, t);
      const heat = E.cOut(clamp(a / 0.5));
      const pxB = fitPx(ctx, WORDS[57].text, 812 - (xb - 80), 230, 100, 900);
      const L = letterLayout(ctx, WORDS[57].text, pxB, 100, 900);
      const w = measure(ctx, WORDS[57].text, pxB, 100, 900);
      ctx.save();
      for (let k = 0; k < 7; k++) {
        const fx = xb + 20 + (k / 6) * (w - 40);
        ctx.save(); ctx.translate(fx, 700); ctx.scale(1, -1); flame(ctx, t + k * 0.37, 50, (60 + 40 * noise1(t * 3 + k, 3)) * heat, 20 + k); ctx.restore();
      }
      ctx.restore();
      const g = ctx.createLinearGradient(0, 700, 0, 700 - 170);
      g.addColorStop(0, AMBER); g.addColorStop(clamp(0.3 + 0.6 * heat), PAPER); g.addColorStop(1, PAPER);
      txt(ctx, WORDS[57].text, { x: xb, y: 700, px: pxB, wt: 900, color: g, word: 57, s: lerp(1.25, 1, E.xOut(clamp(a / 0.25))), ox: 0, oy: 0.8, a: clamp(a * 30 + 0.4) });
    }
    wline(ctx, t, [58, 59, 60], 80, 850, (i) => ({ px: 112, wt: i === 60 ? 900 : 300, color: i === 60 ? AMBER : PAPER, fx: 'rise' }));
    ctx.restore();
  }
  // ---- block B: Capsule lands in Australia, 2031.
  if (t >= 28.05) {
    illus('JAXA');
    const tL = ws(62) + 0.02;
    const fall = clamp((t - 28.12) / (tL - 28.12));
    const path = [[1060, 240], [980, 480], [860, 820], [790, 1040]];
    let [x, y] = bez(path, E.qIn(fall));
    const [x2, y2] = bez(path, clamp(E.qIn(fall) + 0.02));
    const ang = Math.atan2(y2 - y, x2 - x);
    const landed = t >= tL;
    // re-entry streak
    if (!landed) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const tail = 260;
      const g = ctx.createLinearGradient(x, y, x - Math.cos(ang) * tail, y - Math.sin(ang) * tail);
      g.addColorStop(0, rgba(AMBER_RGB, 0.8)); g.addColorStop(1, rgba(AMBER_RGB, 0));
      ctx.strokeStyle = g; ctx.lineWidth = 26; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * tail, y - Math.sin(ang) * tail); ctx.stroke();
      ctx.restore();
    }
    const [sx, sy] = shake(t, tL, 10, 0.3, 8);
    ctx.save(); ctx.translate(x + sx, y + sy); ctx.rotate(landed ? lerp(ang, 0.25, E.bOut(clamp((t - tL) / 0.4))) : ang); ctx.scale(0.95, 0.95);
    drawCapsule(ctx, t, { heat: landed ? Math.max(0, 1 - (t - tL) * 1.4) : 1 });
    ctx.restore();
    ctx.fillStyle = rgba(PAPER_RGB, 0.5); ctx.fillRect(640, 1100, 260 * E.xOut(seg(t, tL - 0.1, tL + 0.3)), 2);
    ping(ctx, 790, 1100, 40, t, tL, 0.8, { grow: 200, w: 4 });
    chip(ctx, t, 'CAPSULE: ABOUT 60 cm ACROSS, WITH A HEAT SHIELD', 28.3);
    cw(ctx, t, 61, 80, 600, { px: fitPx(ctx, WORDS[61].text, 812, 200, 100, 900), wt: 900, color: PAPER, fx: 'slam', from: 1.3, ox: 0 });
    wline(ctx, t, [62, 63], 80, 760, (i) => ({ px: 130, wt: i === 62 ? 900 : 300, color: PAPER, fx: 'rise' }));
    cw(ctx, t, 64, 80, 930, { px: 150, wd: 92, wt: 800, color: PAPER, fx: 'slam', from: 1.25, ox: 0 });
    if (shown(65, t)) {
      const [ax, ay] = shake(t, ws(65), 18, 0.45, 12);
      const px31 = fitPx(ctx, WORDS[65].text, 815, 320, 104, 900);
      const w = cw(ctx, t, 65, 80 + ax, 1300 + ay, { px: px31, wd: 104, wt: 900, color: AMBER, fx: 'slam', from: 1.7, dur: 0.3, ox: 0.2 });
      // position of the zero's counter in "2031." for the zoom-through
      const w2 = measure(ctx, '2', px31, 104, 900), w0 = measure(ctx, '0', px31, 104, 900);
      LAY.zero31 = [80 + w2 + w0 / 2, 1300 - px31 * 0.36];
    }
  }
  ctx.restore();
}

// ================================================================== SPREAD 9: the loot (30.92 - 34.34)
function S9(ctx, t) {
  const p = E.xOut(seg(t, 30.85, 31.3));
  // the stolen piece, spot-lit, turning slowly
  const fly = E.cInOut(seg(t, ws(73), ws(74) + 0.35));
  const settle = E.cInOut(seg(t, 31.62, 32.1));
  const ex = 790, ey = 1265;
  let px = lerp(560, 760, settle), py = lerp(1080, 1075, settle), sc = lerp(3.0, 1.4, settle) * lerp(1, 0.08, fly);
  px = lerp(px, ex, fly); py = lerp(py, ey, fly);
  const spot = 1 - fly;
  if (spot > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px, py, 20, px, py, 420 * sc / 2.2);
    g.addColorStop(0, rgba(AMBER_RGB, 0.16 * p * spot)); g.addColorStop(1, rgba(AMBER_RGB, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  if (t < ws(74) + 0.4) drawPiece(ctx, px, py + 10 * Math.sin(t * 2), 760 * sc * lerp(0.6, 1, p), 0.35 + 0.25 * t, { glow: 0.8 * spot, lw: 3 });
  // home: Earth seen from Mars orbit (real photo, small)
  if (t > ws(72)) {
    const k = E.xOut(seg(t, ws(72), ws(72) + 0.5));
    credit('earth');
    ctx.save();
    circle(ctx, ex, ey, 128 * k); ctx.clip();
    ctx.globalCompositeOperation = 'lighten';
    ctx.drawImage(IMG.earth, ex - 270, ey - 270, 540, 540);
    ctx.restore();
    ctx.save(); circle(ctx, ex, ey, 128 * k); ctx.lineWidth = 2; ctx.strokeStyle = rgba(AMBER_RGB, 0.6); ctx.stroke(); ctx.restore();
    if (k > 0.5) label(ctx, 'EARTH, SEEN FROM MARS', 900, ey + 165, { px: 20, color: MUTED, align: 'right', ls: 1, a: k });
    ping(ctx, ex, ey, 30, t, ws(74) + 0.38, 0.9, { grow: 220, w: 4 });
  }
  // words
  exitUp(ctx, t, 31.55, 0.2, 330, 760, () => {
    cw(ctx, t, 66, 80, 470, { px: 120, wt: 300, color: PAPER, fx: 'rise' });
    cw(ctx, t, 67, 80, 700, { px: 250, fam: 'S', color: AMBER, fx: 'slam', from: 1.35, ox: 0 });
  });
  cw(ctx, t, 68, 80, 560, { px: 250, wd: 112, wt: 900, color: PAPER, fx: 'slam', from: 1.5, ox: 0, dur: 0.3 });
  wline(ctx, t, [69, 70], 80, 720, () => ({ px: 120, wt: 300, color: PAPER, fx: 'rise' }));
  if (shown(71, t)) cw(ctx, t, 71, 80, 920, { px: fitPx(ctx, WORDS[71].text, 812, 220, 100, 900), wt: 900, fx: 'slam', from: 1.25, ox: 0, img: fillPhobos(420, 860, 1400), color: PAPER });
  wline(ctx, t, [72, 73], 80, 1090, () => ({ px: 120, wt: 300, color: PAPER, fx: 'rise' }));
  cw(ctx, t, 74, 80, 1270, { px: 180, wt: 900, color: AMBER, fx: 'slam', from: 1.4, ox: 0 });
}

// ================================================================== SPREAD 10: NEXT (34.89 - 38.73)
function S10(ctx, t) {
  illus('Launch Library 2');
  // the three satellites ride a dashed arc to the right of "three"
  const k3 = ws(81);
  const arc = [[430, 905], [560, 760], [760, 720], [930, 780]];
  const pa = E.xOut(seg(t, 34.95, 35.6));
  trajectory(ctx, arc, pa, { color: rgba(AMBER_RGB, 0.55), w: 2, dash: [6, 10], flow: t * 25 });
  for (let k = 0; k < 3; k++) {
    const p = E.bOut2(clamp((t - k3 - k * 0.1) / 0.32));
    if (p <= 0) continue;
    const u = 0.32 + k * 0.22 + (t - k3) * 0.018;
    const [x, y] = bez(arc, u);
    ctx.save(); ctx.translate(x, y); ctx.scale(p * 1.25, p * 1.25); ctx.rotate(0.15 * Math.sin(t * 1.3 + k)); drawSat(ctx, t); ctx.restore();
    ping(ctx, x, y, 20, t, k3 + k * 0.1, 0.6, { grow: 70, w: 3 });
  }
  if (t > 35.0) {
    const k = E.xOut(seg(t, 35.0, 35.4));
    label(ctx, 'ROCKET LAB ELECTRON · 3 x HAWKEYE 360', 98, 322, { px: 25, color: AMBER, type: k, ls: 1 });
    ctx.fillStyle = AMBER; ctx.fillRect(80, 302, 6 * k, 22);
  }
  // words (Swiss block)
  cw(ctx, t, 75, 80, 470, { px: 140, wt: 900, color: AMBER, fx: 'slam', from: 1.4, ox: 0 });
  wline(ctx, t, [76, 77], 80, 610, () => ({ px: 130, wt: 900, color: PAPER, fx: 'rise' }));
  wline(ctx, t, [78, 79, 80], 80, 725, () => ({ px: 96, wt: 300, color: PAPER, fx: 'rise' }));
  cw(ctx, t, 81, 80, 870, { px: 130, wt: 800, color: PAPER, fx: 'rise' });
  const pxH = fitPx(ctx, 'HawkEye 360', 800, 130, 100, 900);
  wline(ctx, t, [82, 83], 80, 1020, (i) => ({ px: pxH, wt: 900, color: i === 83 ? AMBER : PAPER, fx: i === 83 ? 'slam' : 'rise', ox: 0 }));
  cw(ctx, t, 84, 80, 1130, { px: 96, wt: 300, color: PAPER, fx: 'rise' });
  const pxW = fitPx(ctx, WORDS[85].text, 820, 160, 100, 900);
  cw(ctx, t, 85, 80, 1290, { px: pxW, wt: 900, color: PAPER, fx: 'slam', from: 1.3, ox: 0 });
  // the date, as on the NEXT card
  if (t >= ws(85) + 0.12) {
    const k = E.xOut(clamp((t - ws(85) - 0.12) / 0.3));
    ctx.save(); ctx.fillStyle = AMBER; ctx.fillRect(80, 1336, 8, 74 * k); ctx.restore();
    label(ctx, 'WED 21 OCT', 104, 1396, { px: 62, color: AMBER, ls: 3, wt: 600, type: k });
  }
}

// ================================================================== SPREAD 11: end card (38.89 - 42)
const LOGO_T = 40.45; // the "wordmark_echo" cue (sound peaks one frame later)
function wordmarkLayout(ctx) {
  // stacked lockup: the echo mark (the eyes) leads, DOWNLINK CAT on one line under it
  const wd = 112, wt = 800;
  let px = 130;
  const ls = () => px * 0.02;
  const total = () => measure(ctx, 'DOWNLINK', px, wd, wt, 'A', ls()) + px * 0.28 + measure(ctx, 'CAT', px, wd, wt, 'A', ls());
  if (total() > 816) px = Math.floor((px * 816) / total());
  const y = 1080, R = 62, dx = (R * 30) / 22;
  const xD = 80, xC = 80 + measure(ctx, 'DOWNLINK', px, wd, wt, 'A', ls()) + px * 0.28;
  return { px, wd, wt, ls: ls(), y, R, eyeCx: 80 + R + dx, eyeCy: 850, xD, xC };
}
function S11(ctx, t) {
  const wm = wordmarkLayout(ctx);
  cw(ctx, t, 86, 80, 690, { px: 120, wt: 300, color: PAPER, fx: 'rise' });
  // caption "Downlink Cat." sits on the wordmark's baseline; its letters then flip into DOWNLINK CAT
  const capPx = fitPx(ctx, WORDS[87].text + ' ' + WORDS[88].text, 800, 130, 100, 900), capY = wm.y;
  const t0 = 40.1;
  const capD = WORDS[87].text, capC = WORDS[88].text;
  const LDc = letterLayout(ctx, capD, capPx, 100, 900), LCc = letterLayout(ctx, capC, capPx, 100, 900);
  const wDc = measure(ctx, capD, capPx, 100, 900);
  const xCc = 80 + wDc + capPx * SP;
  const LDw = letterLayout(ctx, 'DOWNLINK', wm.px, wm.wd, wm.wt, 'A', wm.ls), LCw = letterLayout(ctx, 'CAT', wm.px, wm.wd, wm.wt, 'A', wm.ls);
  const morphLetter = (chLow, chUp, xFrom, xTo, col, tk) => {
    const p = E.cInOut(clamp((t - tk) / 0.3));
    const flip = Math.abs(Math.cos(p * Math.PI));
    const up = p >= 0.5;
    txt(ctx, up ? chUp : chLow, {
      x: lerp(xFrom, xTo, p), y: capY, px: lerp(capPx, wm.px, p), wd: up ? wm.wd : 100, wt: up ? wm.wt : 900,
      color: col, sy: Math.max(0.04, flip), oy: 0.62,
    });
  };
  if (t < t0) {
    wline(ctx, t, [87, 88], 80, capY, (i) => ({ px: capPx, wt: 900, color: i === 88 ? AMBER : PAPER, fx: i === 88 ? 'slam' : 'rise', ox: 0 }));
  } else {
    regWord(ctx, 87, 80, capY - capPx * 0.74, 80 + wDc, capY + capPx * 0.22);
    regWord(ctx, 88, xCc, capY - capPx * 0.74, xCc + measure(ctx, capC, capPx, 100, 900), capY + capPx * 0.22);
    LDc.forEach((l, k) => morphLetter(l.ch, 'DOWNLINK'[k], 80 + l.x, wm.xD + LDw[k].x, PAPER, t0 + k * 0.022));
    LCc.forEach((l, k) => {
      if (k < 3) morphLetter(l.ch, 'CAT'[k], xCc + l.x, wm.xC + LCw[k].x, AMBER, t0 + 0.16 + k * 0.022);
      else { const a = 1 - clamp((t - t0) / 0.15); if (a > 0) txt(ctx, l.ch, { x: xCc + l.x, y: capY, px: capPx, wt: 900, color: AMBER, a }); }
    });
  }
  // signal and echo pulses (synced to the sonic logo: A5, then E6 0.40 s later)
  const dxE = (wm.R * 30) / 22;
  ping(ctx, wm.eyeCx - dxE, wm.eyeCy, wm.R, t, LOGO_T + 1 / 60, 1.0, { grow: 170, w: 6 });
  ping(ctx, wm.eyeCx + dxE, wm.eyeCy, wm.R, t, LOGO_T + 0.4 + 1 / 60, 1.0, { grow: 170, w: 6 });
  // a hairline under the lockup draws on, then the channel line types in
  const u = E.xOut(seg(t, 40.5, 41.2));
  if (u > 0) { ctx.fillStyle = rgba(PAPER_RGB, 0.35); ctx.fillRect(80, wm.y + 46, 820 * u, 2); }
  if (t > 40.7) label(ctx, 'ONE REAL SPACE STORY A DAY', 80, wm.y + 100, { px: 26, color: MUTED, ls: 3, type: seg(t, 40.7, 41.2) });
}

// ------------------------------------------------------------------ scene table
const SCENES = [
  [0, 3.42, S1], [3.2, 7.45, S2], [7.1, 10.75, S3], [10.3, 15.1, S4], [14.5, 19.05, S5],
  [18.7, 22.91, S6], [22.6, 25.75, S7], [25.2, 30.95, S8], [30.4, 34.95, S9], [34.5, 38.95, S10], [38.6, 42.5, S11],
];
// transition wrappers
function drawScenes(ctx, t) {
  drawBG(ctx, t);
  for (const [a, b, fn] of SCENES) {
    if (t < a || t >= b) continue;
    ctx.save();
    // S2 -> S3 bar wipe
    if (fn === S2 && t > 7.1) { const [x0] = barWipe(t); if (x0 + 300 >= W) { ctx.restore(); continue; } ctx.beginPath(); ctx.rect(x0 + 300, 0, W, H); ctx.clip(); }
    if (fn === S3 && t < 7.45) { const [x0] = barWipe(t); ctx.beginPath(); ctx.rect(0, 0, Math.max(0, x0), H); ctx.clip(); }
    // S3 -> S4 vertical whip
    if (fn === S3 && t > 10.3) ctx.translate(0, -1920 * E.xInOut(seg(t, 10.3, 10.72)));
    if (fn === S4 && t < 10.72) ctx.translate(0, 1920 * (1 - E.xInOut(seg(t, 10.3, 10.72))));
    // S5 -> S6 horizontal whip
    if (fn === S5 && t > 18.45) ctx.translate(-1080 * E.xInOut(seg(t, 18.45, 18.95)), 0);
    if (fn === S6 && t < 18.95) ctx.translate(1080 * (1 - E.xInOut(seg(t, 18.45, 18.95))), 0);
    // S8 -> S9 zoom through the zero of 2031
    if (fn === S8 && t > 30.45 && LAY.zero31) {
      const z = E.xIn(seg(t, 30.45, 30.9));
      const [zx, zy] = LAY.zero31;
      ctx.translate(zx, zy); ctx.scale(1 + z * 40, 1 + z * 40); ctx.translate(-zx, -zy);
    }
    if (fn === S9 && t < 30.92) { const z = E.xOut(seg(t, 30.4, 30.92)); ctx.globalAlpha *= seg(t, 30.75, 30.9); ctx.translate(540, 960); ctx.scale(lerp(0.6, 1, z), lerp(0.6, 1, z)); ctx.translate(-540, -960); }
    // S9 -> S10 horizontal whip
    if (fn === S9 && t > 34.55) ctx.translate(-1080 * E.xInOut(seg(t, 34.55, 34.88)), 0);
    if (fn === S10 && t < 34.88) ctx.translate(1080 * (1 - E.xInOut(seg(t, 34.55, 34.88))), 0);
    // S10 -> S11 lines exit
    if (fn === S10 && t > 38.6) { const p = E.xIn(seg(t, 38.6, 38.88)); ctx.globalAlpha *= 1 - p; ctx.translate(0, -300 * p); }
    fn(ctx, t);
    ctx.restore();
  }
  // the amber bar of the S2 -> S3 wipe
  if (t > 7.1 && t < 7.45) { const [x0] = barWipe(t); ctx.fillStyle = AMBER; ctx.fillRect(x0, 0, 300, H); }
}

// ------------------------------------------------------------------ the eyes' performance
// position/size keys: [t, [x, y, R], dur, ease]
const EYE_POS = [
  [0, [540, 900, 118]],
  [0.36, [800, 1395, 40], 0.55, 'cInOut'],
  [1.08, [175, 560, 30], 0.5, 'cInOut'],
  [3.2, [770, 470, 44], 0.3, 'cInOut'],
  [4.62, [800, 1370, 46], 0.3, 'cInOut'],
  [5.36, [820, 330 + 120, 36], 0.4, 'cInOut'],
  [7.15, [690, 345, 30], 0.3, 'cInOut'],
  [10.3, [820, 470, 34], 0.42, 'xInOut'],
  [12.52, null, 0.2, 'cInOut'],               // into "lookout" (filled in eyesAt)
  [13.02, [830, 470, 32], 0.3, 'cInOut'],
  [14.62, [800, 770, 34], 0.35, 'cInOut'],
  [16.45, [810, 760, 40], 0.4, 'cInOut'],
  [18.5, [840, 335, 30], 0.45, 'xInOut'],
  [22.7, [830, 420, 34], 0.35, 'cInOut'],
  [25.3, [840, 470, 34], 0.3, 'cInOut'],
  [27.92, [820, 770, 30], 0.26, 'cInOut', 20],
  [30.5, [820, 470, 38], 0.4, 'cInOut'],
  [31.5, [830, 720, 36], 0.35, 'cInOut'],
  [34.55, [820, 470, 34], 0.35, 'xInOut'],
  [38.65, [780, 660, 42], 0.35, 'cInOut'],
  [40.0, null, 0.45, 'cInOut', -70],          // into the wordmark (dipping under "Follow")
];
const FLINCH = [2.42, 3.43, 13.48, 24.1, 28.5, 29.54, 31.62];
const BLINKS = [1.02, 2.98, 4.58, 6.2, 7.12, 9.05, 10.33, 11.6, 13.0, 14.5, 16.3, 18.47, 20.6, 22.65, 24.8, 27.6, 30.48, 31.0, 33.2, 34.6, 36.9, 38.62, 41.35];
// expression keys: [t, {lid, lidA, low, sc, pupil}, dur]
const EXPR = [
  [0, { lid: 0, lidA: 0, low: 0, sc: 1, pupil: 1 }],
  [2.2, { lid: 0.18, lidA: 14, low: 0, sc: 1, pupil: 0.8 }, 0.2],        // collision: brace
  [2.9, { lid: 0, lidA: 0, low: 0, sc: 1.08, pupil: 0.7 }, 0.2],
  [3.4, { lid: 0, lidA: 0, low: 0, sc: 1, pupil: 1 }, 0.2],
  [4.8, { lid: 0.42, lidA: 18, low: 0.15, sc: 1, pupil: 1.15 }, 0.2],    // heist: sly squint
  [7.0, { lid: 0, lidA: 0, low: 0, sc: 1, pupil: 1 }, 0.25],
  [16.5, { lid: 0, lidA: -6, low: 0, sc: 1.22, pupil: 0.55 }, 0.25],     // 15 grams: wide
  [18.4, { lid: 0, lidA: 0, low: 0, sc: 1, pupil: 1 }, 0.3],
  [19.9, { lid: 0.3, lidA: 12, low: 0, sc: 1, pupil: 0.9 }, 0.2],        // focus on the grab
  [22.9, { lid: 0.22, lidA: 6, low: 0, sc: 1, pupil: 0.8 }, 0.2],
  [24.1, { lid: 0, lidA: 0, low: 0, sc: 1.1, pupil: 0.8 }, 0.15],
  [25.3, { lid: 0, lidA: 0, low: 0, sc: 1, pupil: 1 }, 0.2],
  [31.2, { lid: 0, lidA: 0, low: 0.55, sc: 1.05, pupil: 1.2 }, 0.25],    // the loot: delighted
  [32.6, { lid: 0, lidA: 0, low: 0.2, sc: 1, pupil: 1.05 }, 0.3],
  [34.6, { lid: 0, lidA: 0, low: 0, sc: 1, pupil: 1 }, 0.2],
  [40.0, { lid: 0, lidA: 0, low: 0, sc: 1, pupil: 0 }, 0.4],             // become the echo mark
];
// manual looks: [t0, t1, point or function]
const LOOKS = [
  [0, 0.16, [540, 980]],
  [0.36, 0.62, () => (LAY.lens ? [LAY.lens[0], LAY.lens[1]] : [560, 960])],
  [4.4, 4.75, [790, 200]],
  [5.6, 6.2, () => (LAY.piece2 ? [LAY.piece2[0], LAY.piece2[1]] : [600, 1100])],
  [6.4, 7.05, () => (LAY.piece2 ? [LAY.piece2[0], LAY.piece2[1]] : [600, 1100])],
  [11.8, 12.4, [720, 1250]],
  [12.72, 13.0, null], // lookout scanning (handled in eyesAt)
  [14.9, 15.3, [690, 1150]],
  [17.0, 18.4, () => (REG.words[39] ? [(REG.words[39].x0 + REG.words[39].x1) / 2, REG.words[39].y0] : [300, 900])],
  [19.3, 20.1, [600, 1300]],
  [21.1, 21.7, [460, 1500]],
  [22.05, 22.7, [740, 1450]],
  [26.75, 27.2, [650, 1150]],
  [28.15, 28.7, () => [760, 1100]],
  [32.1, 33.3, () => [700, 1100]],
  [33.7, 34.4, [770, 1250]],
  [36.45, 36.75, [600, 900]], [36.75, 37.05, [700, 960]], [37.05, 37.4, [820, 880]],
  [40.0, 42.5, [540, 1000]],
];
function eyesAt(t) {
  // position track with the two special targets resolved
  const keys = EYE_POS.map((k) => k.slice());
  const L = LAY.look;
  for (const k of keys) {
    if (k[0] === 12.52) k[1] = [(L.cxL + L.cxR) / 2, L.cy, L.R];
    if (k[0] === 40.0) { const wm = wordmarkLayout(MAIN); k[1] = [wm.eyeCx, wm.eyeCy, wm.R]; }
  }
  let [x, y, R] = track(keys, t);
  // hop: each move travels on an arc
  for (let k = 1; k < keys.length; k++) {
    const [t0, , d] = keys[k];
    if (t >= t0 && t < t0 + d) {
      const a0 = track(keys, t0), a1 = keys[k][1];
      const dist = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
      y -= (keys[k][4] ?? Math.min(140, dist * 0.22)) * Math.sin(Math.PI * (t - t0) / d);
    }
  }
  // squash and stretch from speed
  const [xp, yp] = track(keys, t - 1 / 60);
  const vx = (x - xp) * 60, vy = (y - yp) * 60, sp = Math.hypot(vx, vy);
  const st = clamp(sp / 5000, 0, 0.3);
  let sqx = 1 + st * (Math.abs(vx) / (sp || 1)) - st * 0.5 * (Math.abs(vy) / (sp || 1));
  let sqy = 1 + st * (Math.abs(vy) / (sp || 1)) - st * 0.5 * (Math.abs(vx) / (sp || 1));
  // flinch at the big slams
  let flinch = 0;
  for (const tf of FLINCH) if (t >= tf && t < tf + 0.6) flinch += Math.exp(-(t - tf) * 9) * Math.cos((t - tf) * 26);
  sqx *= 1 + 0.16 * flinch; sqy *= 1 - 0.26 * flinch;
  // pinned inside the word "lookout." while it is on screen
  const inLook = t >= 12.7 && t < 13.02;
  // expression
  let ex = EXPR[0][1];
  for (let k = 1; k < EXPR.length; k++) {
    const [t0, v, d] = EXPR[k];
    if (t < t0) break;
    const p = E.cInOut(clamp((t - t0) / d));
    const prev = ex; ex = {};
    for (const key of Object.keys(v)) ex[key] = lerp(prev[key], v[key], p);
  }
  // blinks
  let blink = 0;
  for (const b of BLINKS) {
    const d = t - b;
    if (d >= 0 && d < 0.17) blink = Math.max(blink, d < 0.06 ? d / 0.06 : 1 - (d - 0.06) / 0.11);
  }
  for (const tf of FLINCH) if (t >= tf && t < tf + 0.3) blink = Math.max(blink, 0.55 * Math.exp(-(t - tf) * 14));
  // squint at the flash of each step numeral
  for (const i of [22, 27, 42, 55]) { const k = t - ws(i); if (k >= 0 && k < 1) ex.lid = Math.max(ex.lid, 0.5 * Math.exp(-k * 4)); }
  // opening at frame 0: lids lift
  if (t < 0.2) blink = Math.max(blink, 0.5 * (1 - E.bOut(clamp((t - 0.02) / 0.1))));
  // breathing + micro drift
  const br = 1 + 0.025 * Math.sin(t * 2.6);
  x += noise1(t * 0.7, 3) * 4; y += noise1(t * 0.7, 4) * 4;
  // look target
  let target = null;
  for (const [a, b, p] of LOOKS) if (t >= a && t < b) target = p === null ? 'scan' : typeof p === 'function' ? p() : p;
  if (target === null) {
    const k = latestWord(t);
    const box = (i) => (i >= 0 && REG.words[i] ? [(REG.words[i].x0 + REG.words[i].x1) / 2, (REG.words[i].y0 + REG.words[i].y1) / 2] : null);
    const cur = box(k), prev = box(k - 1) ?? cur;
    if (cur) { const s = spring(t - ws(k), 34, 0.5); target = [lerp(prev[0], cur[0], s), lerp(prev[1], cur[1], s)]; }
  }
  let look = [0, 0];
  if (target === 'scan') {
    const s = Math.sin((t - 12.72) * 9 + 1.2);
    look = [Math.sign(s) * Math.min(1, Math.abs(s) * 3), 0.05];
  } else if (target) {
    const vx = target[0] - x, vy = target[1] - y, d = Math.hypot(vx, vy) || 1;
    const m = Math.min(1, d / 260);
    look = [(vx / d) * m, (vy / d) * m];
  }
  // head turn toward the look
  const turn = inLook ? 0 : 0.22;
  const Rs = R * ex.sc * br;
  // colour: ink on the amber field
  const onAmber = t >= 3.38 && t < 4.42;
  return {
    x: x + look[0] * Rs * turn, y: y + look[1] * Rs * turn, R: Rs, look, blink, lid: ex.lid, lidA: ex.lidA, low: ex.low,
    pupil: ex.pupil, glow: onAmber ? 0 : 1, color: onAmber ? INK : AMBER, bg: onAmber ? AMBER : INK, sqx, sqy,
  };
}
function drawOverlay(ctx, t) {
  // kicker
  ctx.save();
  const k = E.xOut(seg(t, 0.05, 0.5));
  ctx.globalAlpha = k;
  const onAmber = t >= 3.38 && t < 4.42;
  ctx.fillStyle = onAmber ? INK : AMBER;
  ctx.beginPath(); ctx.moveTo(80, 236); ctx.lineTo(94, 212); ctx.lineTo(108, 236); ctx.closePath(); ctx.fill();
  label(ctx, 'LAUNCH DAY', 120, 236, { px: 25, color: onAmber ? INK : PAPER, ls: 2 });
  ctx.restore();
  // the eyes
  const e = eyesAt(t);
  // hide during the bar wipe pass
  if (!(t > 7.18 && t < 7.36)) drawEyes(ctx, e);
}
