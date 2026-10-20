// captions.js: kinetic captions (narration words verbatim, timed from captions.json), credits, fact chips, banners.
'use strict';
const SAFE = { x0: 80, x1: 900, y0: 260, y1: 1500 };
const wf = (i) => Math.round(WORDS[i].start * FPS);   // frame a word appears

// chunk table: words [a, b], position (x, y = top of first line), base size, emphasis words (index -> {k, style}),
// br: indices that start a new line, style: 'sub' (anime subtitle), 'banner' (STEP card), tilt in degrees
const CHUNKS = [
  { a: 0, b: 4, x: 80, y: 1210, size: 84 },
  { a: 5, b: 7, x: 80, y: 1170, size: 84, br: [6], em: { 6: 1.55, 7: 1.55 }, maxY: 1398 },   // two credit lines below
  { a: 8, b: 9, x: 80, y: 1230, size: 92, em: { 9: 1.3 } },
  { a: 10, b: 12, x: 80, y: 1250, size: 88, em: { 12: 1.2 } },
  { a: 13, b: 14, x: 80, y: 1080, size: 96, br: [14], em: { 14: 2.6 } },
  { a: 15, b: 20, x: 80, y: 1230, size: 82, br: [17], em: { 16: 1.5 } },
  { a: 21, b: 22, x: 0, y: 0, size: 100, style: 'banner' },
  { a: 23, b: 25, x: 80, y: 1150, size: 90, br: [24], em: { 25: 2.3 }, maxY: 1398 },   // two credit lines below
  { a: 26, b: 27, x: 0, y: 0, size: 100, style: 'banner' },
  { a: 28, b: 30, x: 80, y: 1250, size: 88, em: { 30: 1.35 } },
  { a: 31, b: 34, x: 80, y: 1120, size: 84, br: [33], em: { 32: 2.6 } },
  { a: 35, b: 36, x: 80, y: 1250, size: 92 },
  { a: 37, b: 38, x: 80, y: 1250, size: 92 },
  { a: 39, b: 40, x: 80, y: 1120, size: 96, br: [40], em: { 39: 2.9, 40: 1.6 } },
  { a: 41, b: 42, x: 0, y: 0, size: 100, style: 'banner' },
  { a: 43, b: 44, x: 80, y: 1180, size: 96, em: { 44: 2.0 } },
  { a: 45, b: 46, x: 80, y: 1250, size: 90 },
  { a: 47, b: 48, x: 80, y: 1200, size: 90, br: [48], em: { 47: 1.45 } },
  { a: 49, b: 53, x: 80, y: 1080, size: 86, br: [50, 52], em: { 52: 2.6, 53: 1.4 } },
  { a: 54, b: 55, x: 0, y: 0, size: 100, style: 'banner' },
  { a: 56, b: 57, x: 80, y: 1220, size: 96, em: { 57: 1.5 } },
  { a: 58, b: 60, x: 80, y: 1250, size: 90 },
  { a: 61, b: 64, x: 80, y: 1200, size: 86, br: [63], em: { 64: 1.15 } },
  { a: 65, b: 65, x: 80, y: 1160, size: 96, em: { 65: 2.5 } },
  { a: 66, b: 67, x: 80, y: 1180, size: 96, em: { 67: 2.0 } },
  { a: 68, b: 71, x: 80, y: 1150, size: 86, br: [69], em: { 68: 2.3 } },
  { a: 72, b: 74, x: 80, y: 1250, size: 90 },
  { a: 75, b: 75, x: 0, y: 0, size: 120, style: 'banner' },
  { a: 76, b: 80, x: 80, y: 1240, size: 80, br: [78] },
  { a: 81, b: 84, x: 80, y: 1240, size: 80, br: [83] },
  { a: 85, b: 85, x: 80, y: 1280, size: 96, em: { 85: 1.25 } },
  { a: 86, b: 88, x: 80, y: 790, size: 104, maxY: 1040, br: [87] },
];
// chunk end: next chunk start, or last word end + 0.45 s if there is a pause
CHUNKS.forEach((c, i) => {
  const next = CHUNKS[i + 1];
  const endHold = WORDS[c.b].end + 0.45;
  c.f0 = wf(c.a);
  c.f1 = next ? Math.min(wf(next.a), Math.round(Math.max(endHold, WORDS[c.b].end) * FPS)) : Math.round(42 * FPS);
  if (next && wf(next.a) - Math.round(WORDS[c.b].end * FPS) < 18) c.f1 = wf(next.a);
});
// a chunk never survives a hard cut that comes after its last word
const CUTS = [103, 147, 168, 212, 244, 314, 356, 446, 496, 544, 560, 600, 630, 687, 758, 792, 846, 913, 949, 999, 1038, 1064, 1162];
CHUNKS.forEach((c) => { const lastEnd = Math.round(WORDS[c.b].end * FPS); const cut = CUTS.find((x) => x > lastEnd - 2 && x > c.f0); if (cut != null && cut < c.f1) c.f1 = cut; });
// per-shot overrides of chunk placement (set by shots.js)
const CAP_OVR = {};

function capFont(size, em) {
  ctx.font = em ? `400 ${size}px "Dela Gothic One"` : `italic 900 ${size}px Archivo`;
  ctx.fontStretch = 'normal';
}
// layout a chunk -> [{i, x, y(baseline), size, em, w}]
function layoutChunk(c) {
  const o = Object.assign({}, c, CAP_OVR[CHUNKS.indexOf(c)] || {});
  const items = []; let x = o.x, lineTop = o.y, line = [];
  const maxX = SAFE.x1;
  const flush = () => {
    if (!line.length) return;
    const asc = Math.max(...line.map((w) => w.size * (w.em ? 0.92 : 0.8)));
    const desc = Math.max(...line.map((w) => w.size * (w.em ? 0.18 : 0.24)));
    line.forEach((w) => { w.y = lineTop + asc; items.push(w); });
    lineTop += asc + desc + 14; line = []; x = o.x;
  };
  for (let i = o.a; i <= o.b; i++) {
    const k = (o.em && o.em[i]) || 1; const em = k > 1.01;
    const size = o.size * k;
    capFont(size, em);
    const text = WORDS[i].text;
    const w = ctx.measureText(text).width;
    const gap = o.size * 0.26;
    if ((o.br && o.br.includes(i)) || (line.length && x + w > maxX)) flush();
    let sz = size, ww = w;
    if (x + ww > maxX) { sz = size * (maxX - x) / ww; ww = maxX - x; }  // shrink a single long word to fit
    line.push({ i, x, size: sz, em, w: ww, text });
    x += ww + gap;
  }
  flush();
  // keep the chunk inside the safe area and above the credit slot (y 1440)
  const bottom = Math.max(...items.map((w) => w.y + w.size * (w.em ? 0.2 : 0.26)));
  const lim = o.maxY || 1436;
  if (bottom > lim) { const d = bottom - lim; items.forEach((w) => { w.y -= d; }); }
  const top = Math.min(...items.map((w) => w.y - w.size * (w.em ? 0.95 : 0.85)));
  if (top < SAFE.y0) { const d = SAFE.y0 - top; items.forEach((w) => { w.y += d; }); }
  // ink-exact fit (final check): every line's real ink (outline stroke, drop, italic overhang and tilt
  // included) sits inside CAP_SAFE at rest; a line that is too wide is scaled down, then shifted in.
  const tilt = o.tilt != null ? o.tilt : -3;
  const lines = [];
  items.forEach((w) => { let l = lines.find((q) => Math.abs(q.y - w.y) < 0.5); if (!l) lines.push((l = { y: w.y, ws: [] })); l.ws.push(w); });
  for (const l of lines) {
    for (let iter = 0; iter < 4; iter++) {
      const bx = l.ws.map((w) => wordInk(w, 1, 1, tilt));
      const L = Math.min(...bx.map((b) => b[0])), R = Math.max(...bx.map((b) => b[2]));
      const span = CAP_SAFE.x1 - CAP_SAFE.x0;
      if (R - L > span) { const k = (span / (R - L)) * 0.995, x0 = l.ws[0].x; l.ws.forEach((w) => { w.x = x0 + (w.x - x0) * k; w.size *= k; w.w *= k; }); continue; }
      const d = L < CAP_SAFE.x0 ? CAP_SAFE.x0 - L : R > CAP_SAFE.x1 ? CAP_SAFE.x1 - R : 0;
      l.ws.forEach((w) => { w.x += d; });
      break;
    }
  }
  const ib = items.map((w) => wordInk(w, 1, 1, tilt));
  const iT = Math.min(...ib.map((b) => b[1])), iB = Math.max(...ib.map((b) => b[3]));
  const yl = Math.min(CAP_SAFE.y1, (o.maxY || 1436) + 10);
  let dyv = iB > yl ? yl - iB : 0;
  if (iT + dyv < CAP_SAFE.y0) dyv = CAP_SAFE.y0 - iT;
  if (dyv) items.forEach((w) => { w.y += dyv; });
  return { items, o };
}
// caption ink must stay inside this box on every frame (2 px inside the 80-900 x 260-1500 safe zone)
const CAP_SAFE = { x0: 82, x1: 898, y0: 262, y1: 1498 };
// screen box [L, T, R, B] of a caption word exactly as drawWord draws it: outline stroke (which covers
// the drop), italic overhang, the tilt about the pivot and an optional pop scale kx, ky, plus an offset.
function wordInk(it, kx = 1, ky = 1, tilt = -3, dx = 0, dy = 0) {
  capFont(it.size, it.em);
  const m = ctx.measureText(it.text), s = it.size;
  const sw = s * (it.em ? 0.1 : 0.085), dr = s * (it.em ? 0.06 : 0.07);
  const u0 = -m.actualBoundingBoxLeft - sw, u1 = m.actualBoundingBoxRight + sw;
  const v0 = -m.actualBoundingBoxAscent - sw, v1 = m.actualBoundingBoxDescent + Math.max(sw, dr);
  const a = (tilt * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  const px = it.x + dx, py = it.y - s * 0.3 + dy;
  let L = Infinity, R = -Infinity, T = Infinity, B = -Infinity;
  for (const u of [u0, u1]) for (const v of [v0, v1]) {
    const X = kx * u, Y = ky * (v + s * 0.3);
    const x = px + c * X - sn * Y, y = py + sn * X + c * Y;
    L = Math.min(L, x); R = Math.max(R, x); T = Math.min(T, y); B = Math.max(B, y);
  }
  return [L, T, R, B];
}
const inkInside = (b) => b[0] >= CAP_SAFE.x0 - 0.5 && b[2] <= CAP_SAFE.x1 + 0.5 && b[1] >= CAP_SAFE.y0 - 0.5 && b[3] <= CAP_SAFE.y1 + 0.5;
// pop scale that keeps the word inside the safe area: uniform if it fits, else the widest uniform
// scale that fits plus a vertical stretch (a squash-and-stretch slam, at most 1.4x the width scale)
function fitPop(it, k, tilt, dx, dy) {
  if (k <= 1 || inkInside(wordInk(it, k, k, tilt, dx, dy))) return [k, k];
  let lo = 1, hi = k;
  for (let n = 0; n < 12; n++) { const m = (lo + hi) / 2; if (inkInside(wordInk(it, m, m, tilt, dx, dy))) lo = m; else hi = m; }
  const kx = lo; let lo2 = kx, hi2 = Math.min(k, kx * 1.4);
  if (inkInside(wordInk(it, kx, hi2, tilt, dx, dy))) return [kx, hi2];
  for (let n = 0; n < 12; n++) { const m = (lo2 + hi2) / 2; if (inkInside(wordInk(it, kx, m, tilt, dx, dy))) lo2 = m; else hi2 = m; }
  return [kx, lo2];
}
// draw one caption word
function popK(it, fNow) {
  const age = fNow - wf(it.i);
  const pop = age < 0 ? 0 : age >= 5 ? 1 : E.back(age / 5, 2.2);
  return it.em ? lerp(1.7, 1, pop) : lerp(1.22, 1, pop);
}
function drawWord(it, fNow, { color, amberNewest = true, newest = false, tilt = -3, kx = null, ky = null } = {}) {
  const k = popK(it, fNow);
  capFont(it.size, it.em);
  ctx.save();
  ctx.translate(it.x, it.y - it.size * 0.3);
  ctx.rotate(tilt * Math.PI / 180);
  ctx.scale(kx != null ? kx : k, ky != null ? ky : k);
  ctx.translate(0, it.size * 0.3);
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (it.em) {
    // title style: paper outer, ink inner, amber fill, hard red drop
    ctx.fillStyle = C.red2; ctx.fillText(it.text, it.size * 0.05, it.size * 0.06);
    ctx.strokeStyle = C.paper; ctx.lineWidth = it.size * 0.2; ctx.strokeText(it.text, 0, 0);
    ctx.strokeStyle = C.ink; ctx.lineWidth = it.size * 0.11; ctx.strokeText(it.text, 0, 0);
    ctx.fillStyle = C.amber; ctx.fillText(it.text, 0, 0);
    // anime shine stripe across the top half
    ctx.save(); ctx.beginPath(); ctx.rect(0, -it.size * 0.75, it.w, it.size * 0.22); ctx.clip(); ctx.fillStyle = C.amber3; ctx.fillText(it.text, 0, 0); ctx.restore();
  } else {
    ctx.fillStyle = C.ink; ctx.fillText(it.text, it.size * 0.06, it.size * 0.07);
    ctx.strokeStyle = C.ink; ctx.lineWidth = it.size * 0.17; ctx.strokeText(it.text, 0, 0);
    ctx.fillStyle = color || (newest && amberNewest ? C.amber : C.paper); ctx.fillText(it.text, 0, 0);
  }
  ctx.restore();
}
// banner chunk (STEP cards and NEXT): drawn by shots via drawBanner; captions skip them here
function drawCaptions(t, opt = {}) {
  const f = G.f;
  const boxes = G.capBoxes || [];
  const shk = opt.shake || [0, 0];
  for (let ci = 0; ci < CHUNKS.length; ci++) {
    const c = CHUNKS[ci];
    if (f < c.f0 || f >= c.f1) continue;
    if (c.style === 'banner') continue;
    const { items, o } = layoutChunk(c);
    const tilt = o.tilt != null ? o.tilt : -3;
    let newestI = -1; items.forEach((it) => { if (f >= wf(it.i)) newestI = it.i; });
    // the caption shake follows the hits, clamped so the visible words' ink never leaves the safe area
    const vis = items.filter((it) => f >= wf(it.i));
    let dx = (o.dx || 0) + shk[0], dy = (o.dy || 0) + shk[1];
    if (vis.length) {
      const rb = vis.map((it) => wordInk(it, 1, 1, tilt, o.dx || 0, o.dy || 0));
      const L = Math.min(...rb.map((b) => b[0])), R = Math.max(...rb.map((b) => b[2])), T = Math.min(...rb.map((b) => b[1])), B = Math.max(...rb.map((b) => b[3]));
      dx = (o.dx || 0) + clamp(shk[0], CAP_SAFE.x0 - L, CAP_SAFE.x1 - R);
      dy = (o.dy || 0) + clamp(shk[1], CAP_SAFE.y0 - T, CAP_SAFE.y1 - B);
    }
    ctx.save();
    ctx.translate(dx, dy);
    for (const it of vis) {
      const [kx, ky] = fitPop(it, popK(it, f), tilt, dx, dy);
      drawWord(it, f, { newest: it.i === newestI && items.length > 1, tilt, kx, ky });
      const b = wordInk(it, kx, ky, tilt, dx, dy);   // exact ink box on screen, for caption QA
      boxes.push({ i: it.i, text: it.text, x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1], f0: wf(it.i) });
    }
    ctx.restore();
  }
  G.capBoxes = boxes;
}
window.__capBoxes = (t) => { window.renderAt(t); return G.capBoxes || []; };

// ---------- STEP / NEXT banner (the caption words "Step one:" etc. drawn as an anime eyecatch band) ----------
// st: band style {y, ang (deg), axis 'x'|'y', dir, color, text, numC, ink, step (pips), stamp}
// o: band offset along its axis (px); the caller moves the band, this draws it and its caption words.
function bandXform(st, o, par = 1) {
  ctx.translate(540, st.y); ctx.rotate(st.ang * Math.PI / 180);
  if (st.axis === 'y') ctx.translate(0, o * par); else ctx.translate(o * par * st.dir, 0);
}
function drawBanner(ci, o, out, st) {
  const c = CHUNKS[ci];
  const f = G.f;
  const ink = st.ink || C.ink, color = st.color || C.amber, txtC = st.text || C.paper, numC = st.numC || C.paper;
  // back band (ink, parallax) and front band (colour)
  ctx.save(); bandXform(st, o, 1.15); ctx.fillStyle = ink; ctx.fillRect(-1000, -205, 2000, 410); ctx.restore();
  ctx.save(); bandXform(st, o);
  ctx.fillStyle = color; ctx.fillRect(-1000, -175, 2000, 350);
  // speed hatching in the band, running along the band's own motion axis
  ctx.save(); ctx.beginPath(); ctx.rect(-1000, -175, 2000, 350); ctx.clip();
  ctx.fillStyle = st.hatch || 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 18; i++) {
    const L = 200 + hash(i, 42, 1) * 700;
    if (st.axis === 'y') { const xx = -1000 + hash(i, 41, Math.floor(f / 3)) * 2000; const yy = ((hash(i, 43, 1) * 900 + f * 30) % 900) - 450; ctx.fillRect(xx, yy, 4 + hash(i, 44, 1) * 6, L * 0.4); }
    else { const yy = -175 + hash(i, 41, Math.floor(f / 3)) * 350; const xx = ((hash(i, 43, 1) * 2400 + f * 60 * st.dir) % 2400 + 2400) % 2400 - 1200; ctx.fillRect(xx, yy, L, 4 + hash(i, 44, 1) * 6); }
  }
  ctx.restore();
  // big numeral (zooms in from huge when st.numZoom)
  // the numeral's right edge sits at band x NUM_R so that, at rest, it stays left of the screen's x 900
  // (YouTube's buttons cover the right edge)
  const NUM_R = 300;
  let numLeft = NUM_R;
  if (st.num) {
    ctx.font = '400 340px "Dela Gothic One"'; ctx.lineJoin = 'round';
    const nw = ctx.measureText(st.num).width; numLeft = NUM_R - nw;
    const zk = st.numZoom ? lerp(st.numZoom, 1, E.out5(inv(st.fIn + 2, st.fIn + 12, f))) : 1;
    ctx.save(); ctx.translate(NUM_R - nw / 2, 0); ctx.scale(zk, zk); ctx.translate(-(NUM_R - nw / 2), 0);
    if (st.numDrop) { ctx.fillStyle = st.numDrop; ctx.fillText(st.num, NUM_R - nw + 13, 138); }
    ctx.strokeStyle = ink; ctx.lineWidth = 24; ctx.strokeText(st.num, NUM_R - nw, 125);
    ctx.fillStyle = numC; ctx.fillText(st.num, NUM_R - nw, 125);
    ctx.restore();
  }
  // heist progress pips (four steps): filled up to this step
  if (st.step) {
    for (let i = 0; i < 4; i++) {
      const px = -420 + i * 54, py = 128, on = i < st.step;
      const pop = i === st.step - 1 ? E.back(inv(st.fIn + 10, st.fIn + 16, f), 3) : 1;
      ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4); ctx.scale(pop, pop);
      ctx.fillStyle = on ? txtC : 'rgba(0,0,0,0)'; ctx.strokeStyle = ink; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.rect(-14, -14, 28, 28); ctx.stroke(); if (on) ctx.fill();
      ctx.strokeStyle = on ? ink : txtC; ctx.lineWidth = 3; ctx.strokeRect(-14, -14, 28, 28);
      ctx.restore();
    }
  }
  // caption words of this chunk, on the band (verbatim, timed per word), auto-fit before the numeral
  let size = c.size;
  const gap = 30, x0 = -426, maxW = (st.num ? numLeft - 50 : 380) - x0;
  ctx.font = `400 ${size}px "Dela Gothic One"`;
  let tw = 0; for (let i = c.a; i <= c.b; i++) tw += ctx.measureText(WORDS[i].text).width + (i < c.b ? gap : 0);
  if (tw > maxW) size *= maxW / tw;
  ctx.font = `400 ${size}px "Dela Gothic One"`; ctx.lineJoin = 'round';
  const boxes = G.capBoxes || [];
  let x = x0;
  for (let i = c.a; i <= c.b; i++) {
    const w = ctx.measureText(WORDS[i].text).width;
    if (f >= wf(i) && out < 0.01) {
      const age = f - wf(i), pop = age >= 5 ? 1 : E.back(age / 5, 2);
      ctx.save(); ctx.translate(x, 40); ctx.scale(lerp(1.4, 1, pop), lerp(1.4, 1, pop));
      // ink letters on a paper band (NEXT) get a paper outline, so the counters stay open and the word reads
      ctx.strokeStyle = txtC === ink ? color : ink; ctx.lineWidth = size * 0.16; ctx.strokeText(WORDS[i].text, 0, 0);
      ctx.fillStyle = txtC; ctx.fillText(WORDS[i].text, 0, 0);
      ctx.restore();
      // exact screen box of the word (corners through the current transform) for caption QA
      const m = ctx.getTransform();
      const pts = [[x, 40 - size * 0.9], [x + w, 40 - size * 0.9], [x, 40 + size * 0.2], [x + w, 40 + size * 0.2]].map(([a, b]) => m.transformPoint(new DOMPoint(a, b)));
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      boxes.push({ i, text: WORDS[i].text, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), f0: wf(i) });
    }
    x += w + gap;
  }
  G.capBoxes = boxes;
  // optional date stamp riding on the band (NEXT): appears with its word
  if (st.stamp && f >= st.stamp.f) {
    const sk = E.back(inv(st.stamp.f, st.stamp.f + 6, f), 2.4);
    ctx.save(); ctx.translate(st.stamp.x, st.stamp.y); ctx.rotate(st.stamp.rot || 0.08); ctx.scale(sk, sk);
    const ss = st.stamp.size || 74;
    ctx.font = `400 ${ss}px "Dela Gothic One"`;
    const sw = ctx.measureText(st.stamp.t).width;
    ctx.fillStyle = C.red2; ctx.fillRect(-sw / 2 - 26, -ss * 0.78, sw + 52, ss * 1.3);
    ctx.strokeStyle = C.paper; ctx.lineWidth = 6; ctx.strokeRect(-sw / 2 - 16, -ss * 0.65, sw + 32, ss * 1.04);
    ctx.fillStyle = C.paper; ctx.fillText(st.stamp.t, -sw / 2, ss * 0.25);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- credit slot (exact strings) ----------
const CR = {
  phobos: 'NASA/JPL-Caltech/University of Arizona',
  mars: 'NASA/JPL/USGS',
  earthset: 'NASA/JPL-Caltech/MSSS',
};
function drawCredit(lines, alpha = 1) {
  if (!lines || !lines.length || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = '600 25px "Plex Mono"';
  let y = 1478 - (lines.length - 1) * 38;
  for (const s of lines) {
    const w = ctx.measureText(s).width;
    ctx.fillStyle = 'rgba(11,11,12,0.86)'; ctx.fillRect(80, y - 27, w + 34, 36);
    ctx.fillStyle = C.amber; ctx.fillRect(80, y - 27, 6, 36);
    ctx.fillStyle = C.paper; ctx.fillText(s, 98, y);
    y += 38;
  }
  ctx.restore();
}
// ---------- fact chip: mono text in an ink tag with a cut corner, wipes in ----------
function drawChip(lines, x, y, k, { size = 32, accent = C.amber, maxW = 820, align = 'left' } = {}) {
  if (k <= 0) return;
  ctx.save();
  ctx.font = `600 ${size}px "Plex Mono"`;
  const lh = size * 1.32;
  const w = Math.min(maxW, Math.max(...lines.map((s) => ctx.measureText(typeof s === 'string' ? s : s.t).width)) + 44);
  const h = lines.length * lh + 22;
  const x0 = align === 'right' ? x - w : x;
  const kk = E.out5(k);
  ctx.beginPath(); ctx.rect(x0, y, w * kk, h); ctx.clip();
  ctx.fillStyle = 'rgba(11,11,12,0.9)';
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w - 22, y); ctx.lineTo(x0 + w, y + 22); ctx.lineTo(x0 + w, y + h); ctx.lineTo(x0, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = accent; ctx.fillRect(x0, y, 8, h);
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + w - 22, y); ctx.lineTo(x0 + w, y + 22); ctx.stroke();
  lines.forEach((s, i) => { const t = typeof s === 'string' ? s : s.t; ctx.fillStyle = typeof s === 'string' ? C.paper : (s.c || C.amber); ctx.fillText(t, x0 + 26, y + 11 + lh * (i + 0.78)); });
  ctx.restore();
  return [x0, y, w, h];
}
// kicker (series mark + name)
function drawKicker(alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = '600 26px "Plex Mono"';
  const w = ctx.measureText('LAUNCH DAY').width + 70;
  ctx.fillStyle = 'rgba(11,11,12,0.8)'; ctx.fillRect(80, 262, w, 42);
  ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(100, 294); ctx.lineTo(114, 270); ctx.lineTo(128, 294); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.paper; ctx.fillText('LAUNCH DAY', 142, 292);
  ctx.restore();
}
// big decorative katakana SFX (onomatopoeia, not facts)
function sfxText(txt, x, y, size, { rot = -0.12, fill = C.amber, line = C.ink, alpha = 1, jitter = 4 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `400 ${size}px "Dela Gothic One"`; ctx.lineJoin = 'round';
  let xx = 0;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i]; const j = [(hash(i, 51, G.BF) - 0.5) * jitter, (hash(i, 52, G.BF) - 0.5) * jitter];
    ctx.strokeStyle = C.paper; ctx.lineWidth = size * 0.2; ctx.strokeText(ch, xx + j[0], j[1] + i * size * 0.12);
    ctx.strokeStyle = line; ctx.lineWidth = size * 0.1; ctx.strokeText(ch, xx + j[0], j[1] + i * size * 0.12);
    ctx.fillStyle = fill; ctx.fillText(ch, xx + j[0], j[1] + i * size * 0.12);
    xx += ctx.measureText(ch).width * 0.92;
  }
  ctx.restore();
}
