// text.js: kinetic captions (every narration word verbatim, popping in on its own frame; emphasis words in
// Dela Gothic with a paper and ink double outline, a red drop and a shine band; chunks auto-fit to the
// safe zone; the pop is clamped by fitPop so no word ever leaves it), STEP / NEXT bands, the credit slot,
// fact chips, the series kicker, katakana SFX lettering and the DOWNLINK CAT wordmark.
'use strict';
const SAFE = { x0: 80, x1: 900, y0: 260, y1: 1500 };
// caption ink must stay inside this box on every frame (2 px inside the safe zone)
const CAP_SAFE = { x0: 82, x1: 898, y0: 262, y1: 1498 };
const CAP_FLOOR = 1398;                 // caption bottom: two credit lines fit under it

function capFont(size, em) { ctx.font = em ? `400 ${size}px "Dela Gothic One"` : `italic 900 ${size}px Archivo`; ctx.fontStretch = 'normal'; }

// ---------------------------------------------------------------- chunking (automatic, with beat overrides)
const STRESS = new Set((PLAN.stress || []).map((s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')));
let CHUNKS = [];
const BANNER_WORDS = new Set();            // word indices drawn on a band instead of the caption line
// emphasis scale of a word: stressed words and numbers, bigger when short
function emK(w) {
  const isNum = /\d/.test(w.text);
  if (!STRESS.has(w.key) && !isNum) return 1;
  const n = w.text.replace(/[^A-Za-z0-9]/g, '').length;
  return n <= 3 ? 2.4 : n <= 5 ? 1.9 : n <= 8 ? 1.5 : 1.25;
}
function buildChunks(beats) {
  const startWord = new Set(beats.map((b) => b.wIdx).filter((i) => i != null));
  const cutAt = beats.filter((b) => b.i > 0).map((b) => b.T0);
  const bandAt = beats.filter((b) => b.spec.shot.type === 'band').map((b) => b.w);
  const segs = []; let cur = [];
  WF.forEach((w, i) => {
    if (BANNER_WORDS.has(i)) { if (cur.length) segs.push(cur); cur = []; return; }
    const prev = WF[i - 1];
    if (cur.length && (startWord.has(i) || (prev && (/[.?!:;]$/.test(prev.text) || w.start - prev.end > 0.35)))) { segs.push(cur); cur = []; }
    cur.push(w);
  });
  if (cur.length) segs.push(cur);
  const chunks = [];
  for (const sg0 of segs) {
    // long segments break after commas first, then evenly into chunks of at most 5 words
    const parts = []; let cur2 = [];
    sg0.forEach((w, q) => { cur2.push(w); if (sg0.length > 5 && /,$/.test(w.text) && q < sg0.length - 1 && cur2.length >= 2) { parts.push(cur2); cur2 = []; } });
    if (cur2.length) parts.push(cur2);
    for (const sg of parts) {
      const n = Math.ceil(sg.length / 5), per = Math.ceil(sg.length / n);
      for (let i = 0; i < sg.length; i += per) chunks.push({ words: sg.slice(i, i + per) });
    }
  }
  chunks.forEach((c) => { c.a = c.words[0].i; c.b = c.words[c.words.length - 1].i; });
  chunks.forEach((c, j) => {
    const beat = beats.slice().reverse().find((b) => b.w <= WF[c.a].f) || beats[0];
    const ov = beat.spec.caption || (beat.spec.shot.type === 'end' ? { y: 790, maxY: 1040, size: 104 } : {});
    c.x = ov.x ?? 80; c.y = ov.y ?? 1190; c.size = ov.size ?? 86; c.tilt = ov.tilt ?? -3; c.maxY = ov.maxY ?? CAP_FLOOR;
    c.em = {}; c.words.forEach((w) => { const k = emK(w); if (k > 1.01) c.em[w.i] = k * (ov.em_scale ?? 1); });
    // big emphasis words start their own line
    c.br = c.words.filter((w, q) => q > 0 && (c.em[w.i] || 1) >= 1.9).map((w) => w.i);
    c.f0 = wf(c.a);
    const next = chunks[j + 1];
    const lastEnd = WF[c.b].fe;
    let f1 = next ? Math.min(wf(next.a), lastEnd + 14) : NF;
    if (next && wf(next.a) - lastEnd < 18) f1 = wf(next.a);
    // a chunk never survives a shot change that comes after its last word
    const cut = cutAt.find((x) => x > lastEnd - 2 && x > c.f0);
    if (cut != null && cut < f1) f1 = cut;
    const bw = bandAt.find((x) => x > c.f0);
    if (bw != null && bw < f1) f1 = bw;
    c.f1 = Math.max(f1, c.f0 + 1);
  });
  // the last chunk holds through the end card, or ends with its shot
  CHUNKS = chunks;
  CHUNKS.forEach((c) => { c.lay = layoutChunk(c); });
}
// layout a chunk -> items [{i, x, y(baseline), size, em, w, text}]
function layoutChunk(c) {
  const items = []; let x = c.x, lineTop = c.y, line = [];
  const maxX = SAFE.x1;
  const flush = () => {
    if (!line.length) return;
    const asc = Math.max(...line.map((w) => w.size * (w.em ? 0.92 : 0.8)));
    const desc = Math.max(...line.map((w) => w.size * (w.em ? 0.18 : 0.24)));
    line.forEach((w) => { w.y = lineTop + asc; items.push(w); });
    lineTop += asc + desc + 14; line = []; x = c.x;
  };
  for (let i = c.a; i <= c.b; i++) {
    const k = c.em[i] || 1, em = k > 1.01, size = c.size * k;
    capFont(size, em);
    const text = WF[i].text, w = ctx.measureText(text).width, gap = c.size * 0.26;
    if (c.br.includes(i) || (line.length && x + w > maxX)) flush();
    let sz = size, ww = w;
    if (x + ww > maxX) { sz = size * (maxX - x) / ww; ww = maxX - x; }
    line.push({ i, x, size: sz, em, w: ww, text });
    x += ww + gap;
  }
  flush();
  const tilt = c.tilt;
  // ink-exact fit: every line's real ink (outline, drop, italic overhang, tilt) inside CAP_SAFE at rest
  const lines = [];
  items.forEach((w) => { let l = lines.find((q) => Math.abs(q.y - w.y) < 0.5); if (!l) lines.push((l = { y: w.y, ws: [] })); l.ws.push(w); });
  for (const l of lines) {
    for (let iter = 0; iter < 4; iter++) {
      const bx = l.ws.map((w) => wordInk(w, 1, 1, tilt));
      const L = Math.min(...bx.map((b) => b[0])), Rr = Math.max(...bx.map((b) => b[2]));
      const span = CAP_SAFE.x1 - CAP_SAFE.x0;
      if (Rr - L > span) { const k = (span / (Rr - L)) * 0.995, x0 = l.ws[0].x; l.ws.forEach((w) => { w.x = x0 + (w.x - x0) * k; w.size *= k; w.w *= k; }); continue; }
      const d = L < CAP_SAFE.x0 ? CAP_SAFE.x0 - L : Rr > CAP_SAFE.x1 ? CAP_SAFE.x1 - Rr : 0;
      l.ws.forEach((w) => { w.x += d; });
      break;
    }
  }
  const ib = items.map((w) => wordInk(w, 1, 1, tilt));
  const iT = Math.min(...ib.map((b) => b[1])), iB = Math.max(...ib.map((b) => b[3]));
  let dyv = iB > c.maxY ? c.maxY - iB : 0;
  if (iT + dyv < CAP_SAFE.y0) dyv = CAP_SAFE.y0 - iT;
  if (dyv) items.forEach((w) => { w.y += dyv; });
  return items;
}
// screen box [L, T, R, B] of a caption word exactly as drawWord draws it (outline, drop, italic overhang,
// tilt about the pivot, an optional pop scale kx, ky and an offset)
function wordInk(it, kx = 1, ky = 1, tilt = -3, dx = 0, dy = 0) {
  capFont(it.size, it.em);
  const m = ctx.measureText(it.text), s = it.size;
  const sw = s * (it.em ? 0.1 : 0.085), dr = s * (it.em ? 0.06 : 0.07);
  const u0 = -m.actualBoundingBoxLeft - sw, u1 = m.actualBoundingBoxRight + sw;
  const v0 = -m.actualBoundingBoxAscent - sw, v1 = m.actualBoundingBoxDescent + Math.max(sw, dr);
  const a = (tilt * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  const px = it.x + dx, py = it.y - s * 0.3 + dy;
  let L = Infinity, Rr = -Infinity, T = Infinity, B = -Infinity;
  for (const u of [u0, u1]) for (const v of [v0, v1]) {
    const X = kx * u, Y = ky * (v + s * 0.3);
    const x = px + c * X - sn * Y, y = py + sn * X + c * Y;
    L = Math.min(L, x); Rr = Math.max(Rr, x); T = Math.min(T, y); B = Math.max(B, y);
  }
  return [L, T, Rr, B];
}
const inkInside = (b) => b[0] >= CAP_SAFE.x0 - 0.5 && b[2] <= CAP_SAFE.x1 + 0.5 && b[1] >= CAP_SAFE.y0 - 0.5 && b[3] <= CAP_SAFE.y1 + 0.5;
// the fitPop fix: the pop scale that keeps the word inside the safe area. Uniform when it fits, else the
// widest uniform scale that fits plus a vertical stretch (a squash-and-stretch slam, at most 1.4x).
function fitPop(it, k, tilt, dx, dy) {
  if (k <= 1 || inkInside(wordInk(it, k, k, tilt, dx, dy))) return [k, k];
  let lo = 1, hi = k;
  for (let n = 0; n < 12; n++) { const m = (lo + hi) / 2; if (inkInside(wordInk(it, m, m, tilt, dx, dy))) lo = m; else hi = m; }
  const kx = lo; let lo2 = kx, hi2 = Math.min(k, kx * 1.4);
  if (inkInside(wordInk(it, kx, hi2, tilt, dx, dy))) return [kx, hi2];
  for (let n = 0; n < 12; n++) { const m = (lo2 + hi2) / 2; if (inkInside(wordInk(it, kx, m, tilt, dx, dy))) lo2 = m; else hi2 = m; }
  return [kx, lo2];
}
function popK(it, fNow) {
  const age = fNow - wf(it.i);
  const pop = age < 0 ? 0 : age >= 5 ? 1 : E.back(age / 5, 2.2);
  return it.em ? lerp(1.7, 1, pop) : lerp(1.22, 1, pop);
}
function drawWord(it, { color, newest = false, tilt = -3, kx = 1, ky = 1 } = {}) {
  capFont(it.size, it.em);
  ctx.save();
  ctx.translate(it.x, it.y - it.size * 0.3); ctx.rotate(tilt * Math.PI / 180); ctx.scale(kx, ky); ctx.translate(0, it.size * 0.3);
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (it.em) {
    ctx.fillStyle = C.red2; ctx.fillText(it.text, it.size * 0.05, it.size * 0.06);
    ctx.strokeStyle = C.paper; ctx.lineWidth = it.size * 0.2; ctx.strokeText(it.text, 0, 0);
    ctx.strokeStyle = C.ink; ctx.lineWidth = it.size * 0.11; ctx.strokeText(it.text, 0, 0);
    ctx.fillStyle = C.amber; ctx.fillText(it.text, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(0, -it.size * 0.75, it.w, it.size * 0.22); ctx.clip(); ctx.fillStyle = C.amber3; ctx.fillText(it.text, 0, 0); ctx.restore();
  } else {
    ctx.fillStyle = C.ink; ctx.fillText(it.text, it.size * 0.06, it.size * 0.07);
    ctx.strokeStyle = C.ink; ctx.lineWidth = it.size * 0.17; ctx.strokeText(it.text, 0, 0);
    ctx.fillStyle = color || (newest ? C.amber : C.paper); ctx.fillText(it.text, 0, 0);
  }
  ctx.restore();
}
function drawCaptions(f, shake = [0, 0]) {
  for (const c of CHUNKS) {
    if (f < c.f0 || f >= c.f1) continue;
    const items = c.lay, tilt = c.tilt;
    let newestI = -1; items.forEach((it) => { if (f >= wf(it.i)) newestI = it.i; });
    const vis = items.filter((it) => f >= wf(it.i));
    let dx = 0, dy = 0;
    if (vis.length) {
      // the caption shake follows the hits, clamped so the visible words' ink never leaves the safe area
      const rb = vis.map((it) => wordInk(it, 1, 1, tilt));
      const L = Math.min(...rb.map((b) => b[0])), Rr = Math.max(...rb.map((b) => b[2])), T = Math.min(...rb.map((b) => b[1])), B = Math.max(...rb.map((b) => b[3]));
      dx = clamp(shake[0], CAP_SAFE.x0 - L, CAP_SAFE.x1 - Rr); dy = clamp(shake[1], CAP_SAFE.y0 - T, CAP_SAFE.y1 - B);
    }
    ctx.save(); ctx.translate(dx, dy);
    for (const it of vis) {
      const [kx, ky] = fitPop(it, popK(it, f), tilt, dx, dy);
      drawWord(it, { newest: it.i === newestI && items.length > 1, tilt, kx, ky });
      const b = wordInk(it, kx, ky, tilt, dx, dy);
      R.caps.push({ i: it.i, text: it.text, x0: b[0], y0: b[1], x1: b[2], y1: b[3] });
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- STEP / NEXT band
// st: {y, ang (deg), axis 'x'|'y', dir, color, text, numC, ink, hatch, numZoom, fIn, steps, step, stamp, num}
// words: [a, b] word indices drawn on the band (verbatim, each on its spoken frame), or label (fixed text)
function bandXform(st, o, par = 1) {
  ctx.translate(540, st.y); ctx.rotate(st.ang * Math.PI / 180);
  if (st.axis === 'y') ctx.translate(0, o * par); else ctx.translate(o * par * st.dir, 0);
}
function drawBanner(st, o, out) {
  const f = G.f;
  const ink = st.ink || C.ink, color = st.color || C.amber, txtC = st.text || C.paper, numC = st.numC || C.paper;
  const rest = Math.abs(o) < 0.5 && out < 0.001;
  R.moving += rest ? 0 : 1;
  ctx.save(); bandXform(st, o, 1.15); ctx.fillStyle = ink; ctx.fillRect(-1000, -205, 2000, 410); ctx.restore();
  ctx.save(); bandXform(st, o);
  ctx.fillStyle = color; ctx.fillRect(-1000, -175, 2000, 350);
  ctx.save(); ctx.beginPath(); ctx.rect(-1000, -175, 2000, 350); ctx.clip();
  ctx.fillStyle = st.hatch || 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 18; i++) {
    const L = 200 + hash(i, 42, 1) * 700;
    if (st.axis === 'y') { const xx = -1000 + hash(i, 41, Math.floor(f / 3)) * 2000; const yy = ((hash(i, 43, 1) * 900 + f * 30) % 900) - 450; ctx.fillRect(xx, yy, 4 + hash(i, 44, 1) * 6, L * 0.4); }
    else { const yy = -175 + hash(i, 41, Math.floor(f / 3)) * 350; const xx = ((hash(i, 43, 1) * 2400 + f * 60 * st.dir) % 2400 + 2400) % 2400 - 1200; ctx.fillRect(xx, yy, L, 4 + hash(i, 44, 1) * 6); }
  }
  ctx.restore();
  // the numeral's right edge sits at band x 300 so it stays left of the screen's x 900 at rest
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
    regText(NUM_R - nw - 12, 125 - 270, nw + 24, 290, 'band numeral', st.num, zk > 1.01);
    ctx.restore();
  }
  // progress pips (a numbered series of steps)
  if (st.step && st.steps) {
    for (let i = 0; i < st.steps; i++) {
      const px = -420 + i * 54, py = 128, on = i < st.step;
      const pop = i === st.step - 1 ? E.back(inv(st.fIn + 10, st.fIn + 16, f), 3) : 1;
      ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4); ctx.scale(pop, pop);
      ctx.fillStyle = on ? txtC : 'rgba(0,0,0,0)'; ctx.strokeStyle = ink; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.rect(-14, -14, 28, 28); ctx.stroke(); if (on) ctx.fill();
      ctx.strokeStyle = on ? ink : txtC; ctx.lineWidth = 3; ctx.strokeRect(-14, -14, 28, 28);
      ctx.restore();
    }
  }
  // words of the band: narration words (each on its spoken frame) or a fixed label; auto-fit before the numeral
  let size = st.size || 100;
  const gap = 30, x0 = -426, maxW = (st.num ? numLeft - 50 : 640) - x0;
  const toks = st.words ? Array.from({ length: st.words[1] - st.words[0] + 1 }, (_, q) => ({ i: st.words[0] + q, text: WF[st.words[0] + q].text })) : st.label ? [{ i: -1, text: st.label }] : [];
  ctx.font = `400 ${size}px "Dela Gothic One"`;
  let tw = 0; toks.forEach((t, q) => { tw += ctx.measureText(t.text).width + (q < toks.length - 1 ? gap : 0); });
  if (tw > maxW) size *= maxW / tw;
  ctx.font = `400 ${size}px "Dela Gothic One"`; ctx.lineJoin = 'round';
  let x = x0;
  for (const t of toks) {
    const w = ctx.measureText(t.text).width;
    const f0 = t.i >= 0 ? wf(t.i) : st.fIn + 4;
    if (f >= f0 && out < 0.01) {
      const age = f - f0, pop = age >= 5 ? 1 : E.back(age / 5, 2);
      ctx.save(); ctx.translate(x, 40); ctx.scale(lerp(1.4, 1, pop), lerp(1.4, 1, pop));
      ctx.strokeStyle = txtC === ink ? color : ink; ctx.lineWidth = size * 0.16; ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = txtC; ctx.fillText(t.text, 0, 0);
      ctx.restore();
      const pk = lerp(1.4, 1, pop);
      const b = screenBox(x - size * 0.08 * pk, 40 - size * 0.9 * pk, (w + size * 0.16) * pk, size * 1.1 * pk);
      if (t.i >= 0) R.caps.push({ i: t.i, text: t.text, x0: b[0], y0: b[1], x1: b[2], y1: b[3], band: true, moving: !rest });
      regText(x - size * 0.08, 40 - size * 0.9, w + size * 0.16, size * 1.1, 'band word', t.text, age < 5);
    }
    x += w + gap;
  }
  if (st.stamp && f >= st.stamp.f) {
    const sk = E.back(inv(st.stamp.f, st.stamp.f + 6, f), 2.4);
    ctx.save(); ctx.translate(st.stamp.x ?? -170, st.stamp.y ?? 124); ctx.rotate(st.stamp.rot ?? 0.04); ctx.scale(sk, sk);
    const ss = st.stamp.size || 54;
    ctx.font = `400 ${ss}px "Dela Gothic One"`;
    const sw = ctx.measureText(st.stamp.t).width;
    ctx.fillStyle = C.red2; ctx.fillRect(-sw / 2 - 26, -ss * 0.78, sw + 52, ss * 1.3);
    ctx.strokeStyle = C.paper; ctx.lineWidth = 6; ctx.strokeRect(-sw / 2 - 16, -ss * 0.65, sw + 32, ss * 1.04);
    ctx.fillStyle = C.paper; ctx.fillText(st.stamp.t, -sw / 2, ss * 0.25);
    regText(-sw / 2 - 26, -ss * 0.78, sw + 52, ss * 1.3, 'stamp', st.stamp.t, Math.abs(sk - 1) > 0.01);
    ctx.restore();
  }
  ctx.restore();
  R.moving -= rest ? 0 : 1;
}

// ---------------------------------------------------------------- credit slot (built from what is drawn)
function creditLines() {
  const photos = [...new Set([...R.photos].map((n) => IMAGES[n].credit))];
  const lines = [];
  let cur = '';
  for (const p of photos) { if (!cur) cur = p; else if ((cur + ' · ' + p).length <= 52) cur += ' · ' + p; else { lines.push(cur); cur = p; } }
  if (cur) lines.push(cur);
  if (R.illus.size) lines.push('Illustration · facts: ' + [...R.illus].join(', '));
  return lines;
}
function drawCredit(lines) {
  if (!lines.length) return;
  ctx.save();
  ctx.font = '600 25px "Plex Mono"';
  let y = 1478 - (lines.length - 1) * 38;
  for (const s of lines) {
    const w = ctx.measureText(s).width;
    ctx.fillStyle = 'rgba(11,11,12,0.86)'; ctx.fillRect(80, y - 27, w + 34, 36);
    ctx.fillStyle = C.amber; ctx.fillRect(80, y - 27, 6, 36);
    ctx.fillStyle = C.paper; ctx.fillText(s, 98, y);
    regText(80, y - 27, w + 34, 36, 'credit', s);
    y += 38;
  }
  ctx.restore();
}
// ---------------------------------------------------------------- fact chip: mono text in an ink tag, wipes in
function chipSize(lines, size = 31) {
  ctx.font = `600 ${size}px "Plex Mono"`;
  const lh = size * 1.32;
  return [Math.min(820, Math.max(...lines.map((s) => ctx.measureText(typeof s === 'string' ? s : s.t).width)) + 44), lines.length * lh + 22];
}
function drawChip(lines, x, y, k, { size = 31, accent = C.amber } = {}) {
  if (k <= 0) return null;
  ctx.save();
  ctx.font = `600 ${size}px "Plex Mono"`;
  const lh = size * 1.32;
  const [w, h] = chipSize(lines, size);
  const kk = E.out5(k);
  ctx.beginPath(); ctx.rect(x, y, w * kk, h); ctx.clip();
  ctx.fillStyle = 'rgba(11,11,12,0.9)';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w - 22, y); ctx.lineTo(x + w, y + 22); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = accent; ctx.fillRect(x, y, 8, h);
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w - 22, y); ctx.lineTo(x + w, y + 22); ctx.stroke();
  lines.forEach((s, i) => { const t = typeof s === 'string' ? s : s.t; ctx.fillStyle = typeof s === 'string' ? C.paper : (s.c === 'amber' ? C.amber : s.c === 'muted' ? '#a9a6a0' : s.c || C.amber); ctx.fillText(t, x + 26, y + 11 + lh * (i + 0.78)); });
  regText(x, y, w, h, 'chip', lines.map((s) => (typeof s === 'string' ? s : s.t)).join(' / '), k < 1);
  ctx.restore();
  return [x, y, w, h];
}
// ---------------------------------------------------------------- kicker (series mark + name)
const SERIES_MARK = { 'LAUNCH DAY': 'tri', 'JUST DISCOVERED': 'diamond', 'HOW DOES THAT WORK': 'cross', 'BY THE NUMBERS': 'bars' };
function drawKicker(text, alpha = 1, pips = null) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = '600 26px "Plex Mono"';
  const w = ctx.measureText(text).width + 70;
  ctx.fillStyle = 'rgba(11,11,12,0.8)'; ctx.fillRect(80, 262, w, 42);
  ctx.fillStyle = C.amber; ctx.strokeStyle = C.amber; ctx.lineWidth = 3;
  const m = SERIES_MARK[PLAN.series] || 'tri';
  ctx.save(); ctx.translate(114, 283);
  if (m === 'tri') { ctx.beginPath(); ctx.moveTo(-14, 11); ctx.lineTo(0, -13); ctx.lineTo(14, 11); ctx.closePath(); ctx.fill(); }
  else if (m === 'diamond') { ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(13, 0); ctx.lineTo(0, 13); ctx.lineTo(-13, 0); ctx.closePath(); ctx.fill(); }
  else if (m === 'cross') { ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.moveTo(0, -13); ctx.lineTo(0, 13); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke(); }
  else { ctx.fillRect(-13, 2, 6, 10); ctx.fillRect(-3, -5, 6, 17); ctx.fillRect(7, -12, 6, 24); }
  ctx.restore();
  ctx.fillStyle = C.paper; ctx.fillText(text, 142, 292);
  regText(80, 262, w, 42, 'kicker', text);
  if (pips) {
    const x0 = 80 + w + 10;
    ctx.fillStyle = 'rgba(11,11,12,0.8)'; ctx.fillRect(x0, 262, pips.n * 30 + 18, 42);
    for (let i = 0; i < pips.n; i++) {
      ctx.save(); ctx.translate(x0 + 24 + i * 30, 283); ctx.rotate(Math.PI / 4);
      if (i < pips.on) { ctx.fillStyle = C.amber; ctx.fillRect(-8, -8, 16, 16); } else { ctx.strokeStyle = C.paper3; ctx.lineWidth = 3; ctx.strokeRect(-7, -7, 14, 14); }
      ctx.restore();
    }
  }
  ctx.restore();
}
// ---------------------------------------------------------------- big decorative katakana SFX (onomatopoeia, not facts)
// screen-space fit of SFX lettering: shift (x, y) so the rotated box stays inside the safe zone
function sfxFit(txt, x, y, size, rot) {
  ctx.save(); ctx.font = `400 ${size}px "Dela Gothic One"`;
  const chars = [...txt]; let w = 0; for (const ch of chars) w += ctx.measureText(ch).width * 0.92;
  ctx.restore();
  const L = [-size * 0.12 - 3, -size * 0.95 - 3, w + size * 0.24 + 6, size * 1.15 + chars.length * size * 0.12 + 6];
  const c = Math.cos(rot), s = Math.sin(rot);
  const pts = [[L[0], L[1]], [L[0] + L[2], L[1]], [L[0], L[1] + L[3]], [L[0] + L[2], L[1] + L[3]]].map(([a, b]) => [x + c * a - s * b, y + s * a + c * b]);
  const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const dx = x0 < 84 ? 84 - x0 : x1 > 896 ? 896 - x1 : 0, dy = y0 < 264 ? 264 - y0 : y1 > 1496 ? 1496 - y1 : 0;
  return [x + dx, y + dy];
}
function sfxText(txt, x, y, size, { rot = -0.12, fill = C.amber, line = C.ink, alpha = 1, jitter = 4 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `400 ${size}px "Dela Gothic One"`; ctx.lineJoin = 'round';
  let xx = 0;
  const chars = [...txt];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]; const j = [(hash(i, 51, G.BF) - 0.5) * jitter, (hash(i, 52, G.BF) - 0.5) * jitter];
    ctx.strokeStyle = C.paper; ctx.lineWidth = size * 0.2; ctx.strokeText(ch, xx + j[0], j[1] + i * size * 0.12);
    ctx.strokeStyle = line; ctx.lineWidth = size * 0.1; ctx.strokeText(ch, xx + j[0], j[1] + i * size * 0.12);
    ctx.fillStyle = fill; ctx.fillText(ch, xx + j[0], j[1] + i * size * 0.12);
    xx += ctx.measureText(ch).width * 0.92;
  }
  regText(-size * 0.12, -size * 0.95, xx + size * 0.24, size * 1.15 + chars.length * size * 0.12, 'sfx', txt);
  ctx.restore();
}
// ---------------------------------------------------------------- giant slam text (numbers): Dela Gothic,
// paper and ink double outline, red drop, shine; centred at (x, y) baseline; k = pop scale
function slamText(txt, x, y, size, k = 1, { fill = C.amber, rot = -0.05 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `400 ${size}px "Dela Gothic One"`; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  const tw = ctx.measureText(txt).width;
  ctx.scale(k, k); ctx.translate(-tw / 2, 0);
  ctx.fillStyle = C.red2; ctx.fillText(txt, size * 0.05, size * 0.06);
  ctx.strokeStyle = C.paper; ctx.lineWidth = size * 0.2; ctx.strokeText(txt, 0, 0);
  ctx.strokeStyle = C.ink; ctx.lineWidth = size * 0.11; ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = fill; ctx.fillText(txt, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, -size * 0.75, tw, size * 0.22); ctx.clip(); ctx.fillStyle = C.amber3; ctx.fillText(txt, 0, 0); ctx.restore();
  regText(-size * 0.1, -size * 0.85, tw + size * 0.2, size * 1.0, 'slam', txt, k > 1.01);
  ctx.restore();
}
function slamWidth(txt, size) { ctx.font = `400 ${size}px "Dela Gothic One"`; return ctx.measureText(txt).width + size * 0.2; }

// ---------------------------------------------------------------- the wordmark (end card): the echo mark
// (amber dot + hollow ring) flies out of Night Shift's eyes into place, DOWNLINK lands on "Downlink",
// CAT on "Cat"; the mark pulses on the logo note (WM) and its echo (WM + 12)
function drawWordmark(f, hd, fD, fC) {
  const note = WM, echo = WM + 12, land = fD + 1;
  ctx.save();
  const size = 120;
  ctx.font = `800 ${size}px Archivo`; ctx.fontStretch = 'normal';
  const wD = ctx.measureText('DOWNLINK ').width, wC = ctx.measureText('CAT').width;
  const r = size * 0.3, gap = r * 60 / 22, sw = r * 6 / 22 * 2;
  const markW = r * 2 + gap + 34;
  const total = markW + wD + wC;
  const sc = Math.min(1, 740 / total);
  const x0 = 490 - total * sc / 2, y0 = 640;
  const my = -size * 0.36;
  const sk = E.out5(inv(land - 6, land, f));
  ctx.save(); ctx.translate(x0, y0); ctx.scale(sc, sc);
  if (sk > 0) { ctx.fillStyle = 'rgba(11,11,12,0.9)'; ctx.save(); ctx.transform(1, 0, -0.18, 1, 0, 0); ctx.fillRect(-40, -size * 0.95, (total + 80) * sk, size * 1.35); ctx.fillStyle = C.amber; ctx.fillRect(-40, size * 0.4 - 8, (total + 80) * sk, 8); ctx.restore(); }
  ctx.restore();
  const fk = E.io(inv(fD - 8, land, f));
  const eyeD = [hd.x + (-0.41 - 0.036) * hd.s, hd.y], eyeR = [hd.x + (0.41 - 0.036) * hd.s, hd.y], er = 0.3 * hd.s;
  const dotT = [x0 + r * sc, y0 + my * sc], ringT = [x0 + (r + gap) * sc, y0 + my * sc];
  if (fk > 0) {
    const arc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(Math.PI * k) * 160];
    const pulse = (fs) => { const d = (f - fs) / 6; return d > 0 && d < 1 ? 1 + 0.35 * Math.sin(Math.PI * d) : 1; };
    const drawMark = (k, alpha = 1) => {
      ctx.save(); ctx.globalAlpha *= alpha;
      const pd = arc(eyeD, dotT, k), pr = arc(eyeR, ringT, k);
      const rd = lerp(er, r * sc, k) * pulse(note), rr = lerp(er, r * sc, k) * pulse(echo);
      ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(pd[0], pd[1], rd, 0, Math.PI * 2); ctx.fill();
      const lw = sw * sc * (k < 1 ? lerp(er / (r * sc), 1, k) : 1);
      ctx.strokeStyle = C.amber; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(pr[0], pr[1], Math.max(1, rr - lw / 2), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    };
    if (fk < 1) { for (let i = 3; i >= 1; i--) drawMark(Math.max(0, fk - i * 0.08), 0.25); }
    drawMark(fk);
    for (const [fs, c] of [[note, dotT], [echo, ringT]]) { const d = (f - fs) / 18; if (d > 0 && d < 1) { ctx.strokeStyle = `rgba(245,184,61,${1 - d})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(c[0], c[1], r * sc + d * 90, 0, Math.PI * 2); ctx.stroke(); } }
  }
  ctx.save(); ctx.translate(x0, y0); ctx.scale(sc, sc);
  ctx.font = `800 ${size}px Archivo`;
  const word = 'DOWNLINK CAT';
  let x = markW, allIn = true;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]; const w = ctx.measureText(ch).width;
    const fs = i >= 9 ? fC + (i - 9) * 0.8 : fD + i * 0.8;
    const lk = E.back(inv(fs, fs + 4, f), 2.6);
    if (f < fs + 6) allIn = false;
    if (lk > 0 && ch !== ' ') {
      ctx.save(); ctx.translate(x + w / 2, -size * 0.35); ctx.scale(lk, lk); ctx.translate(-w / 2, size * 0.35);
      ctx.fillStyle = i >= 9 ? C.amber : C.paper; ctx.fillText(ch, 0, 0); ctx.restore();
    }
    x += w;
  }
  if (f >= fD) regText(markW, -size * 0.8, x - markW, size * 0.85, 'wordmark', 'DOWNLINK CAT', !allIn);
  ctx.restore();
  ctx.restore();
}
