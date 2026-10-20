// ============================================================================================
// MAIN: assets, Night Shift in riso inks, captions, overlays, timeline, renderAt(t).
// ============================================================================================
const DATA = window.DATA;
const WORDS = DATA.words; // [{text, start, end}] from kit/captions.json (verbatim)
const A = {};
let PRESS = null, SHA = null, SHB = null, CAT = null;

async function loadImg(src) { const i = new Image(); i.src = src; await i.decode(); return i; }
function b64ToBuf(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }

// photo -> inks. Phobos: blue in the shadows, fluorescent pink in the midtones, a whisper of sunflower.
const MAP = {
  phobos: (r, g, b) => {
    const L = 0.3 * r + 0.59 * g + 0.11 * b, warm = r - b;
    return [smooth(0.64, 0.14, L), clamp(0.12 + warm * 2.1 + (0.7 - L) * 0.55), clamp(warm * 1.4 - 0.08) * 0.5];
  },
  phobosHi: (r, g, b) => {
    const L = 0.3 * r + 0.59 * g + 0.11 * b, warm = r - b;
    return [smooth(0.7, 0.32, L), clamp(0.05 + warm * 2.4 + (0.78 - L) * 0.8), clamp(warm * 1.6 - 0.05) * 0.55];
  },
  phobosBlue: (r, g, b) => { const L = 0.3 * r + 0.59 * g + 0.11 * b; return [clamp((0.8 - L) * 1.2), 0, 0]; },
};

// ---------------------------------------------------------------- captions
// chunks of the narration (word index ranges); "Downlink Cat." stays together on one line
const CHUNKS = [[0, 5], [6, 9], [10, 14], [15, 20], [21, 25], [26, 30], [31, 34], [35, 40], [41, 44], [45, 48], [49, 53], [54, 60], [61, 65], [66, 67], [68, 74], [75, 80], [81, 85], [86, 88]];
const EMPH = new Set([6, 7, 14, 16, 25, 30, 32, 39, 40, 44, 47, 52, 53, 65, 67, 68]);
const CAP = { size: 84, lh: 90, maxW: 790, x: 90 };
const appearF = (i) => Math.round(WORDS[i].start * FPS);
let LAYOUT = [];
function layoutCaptions() {
  const font = F.cond(CAP.size, 800), sp = measure(' ', font);
  LAYOUT = CHUNKS.map(([a, b]) => {
    // units: words that must not break apart
    const units = []; for (let i = a; i <= b; i++) { if (i === 88 && units.length && units[units.length - 1].ids.includes(87)) units[units.length - 1].ids.push(i); else units.push({ ids: [i] }); }
    units.forEach((u) => { u.w = u.ids.map((i) => measure(WORDS[i].text, font)).reduce((s, v) => s + v, 0) + sp * (u.ids.length - 1); });
    const rows = [[]]; let x = 0;
    for (const u of units) { if (x > 0 && x + sp + u.w > CAP.maxW) { rows.push([]); x = 0; } rows[rows.length - 1].push(u); x += (x > 0 ? sp : 0) + u.w; }
    const words = []; rows.forEach((r, ri) => { let x = 0; r.forEach((u) => { u.ids.forEach((i, k) => { const w = measure(WORDS[i].text, font); words.push({ i, x, row: ri, w }); x += w + sp; }); }); });
    return { a, b, rows: rows.length, words };
  });
}
// f is the printed (even) frame; a word is shown on the sheet that covers its spoken start frame
const shownF = (i) => appearF(i) - (appearF(i) % 2);
function chunkAt(f) {
  let k = -1; for (let j = 0; j < LAYOUT.length; j++) if (f >= shownF(LAYOUT[j].a)) k = j;
  if (k < 0) return null;
  const L = LAYOUT[k], next = LAYOUT[k + 1];
  const endF = Math.round((WORDS[L.b].end + 0.9) * FPS);
  if (next && f >= shownF(next.a)) return null;
  if (f > endF && k < LAYOUT.length - 1) return null;
  return L;
}
// zone: 'bottom' (block bottom at 1462) or 'top' (block top at 276) or {y}
function drawCaptions(t, zone = 'bottom') {
  const f = Math.round(t * FPS), L = chunkAt(f); if (!L) return;
  const font = F.cond(CAP.size, 800);
  const top = zone === 'top' ? 274 : typeof zone === 'object' ? zone.y : 1462 - L.rows * CAP.lh;
  const base = (row) => top + row * CAP.lh + CAP.size * 0.80;
  // halo (paper knockout) + highlighter for emphasis, then ink
  for (const w of L.words) {
    const k = Math.floor((f - shownF(w.i)) / 2); if (k < 0) continue;
    const x = CAP.x + w.x, y = base(w.row), s = k === 0 ? 1.1 : k === 1 ? 1.04 : 1;
    xf(() => {
      tr(x + w.w / 2, y - CAP.size * 0.32); scl(s); tr(-(x + w.w / 2), -(y - CAP.size * 0.32));
      knock((c) => { setText(c, font); c.lineWidth = 16; c.lineJoin = 'round'; c.strokeText(WORDS[w.i].text, x, y); });
      if (EMPH.has(w.i)) {
        const grow = clamp((k + 1) / 4);
        solid((c) => {
          c.beginPath(); const x0 = x - 8, x1 = x - 8 + (w.w + 16) * grow, y0 = y - CAP.size * 0.62, y1 = y + 8;
          c.moveTo(x0, y0 + 4); c.lineTo(x1, y0); c.lineTo(x1 + 3, y1 - 2); c.lineTo(x0 - 2, y1 + 2); c.closePath(); c.fill();
        }, C.Y);
        solid((c) => { setText(c, font); c.fillText(WORDS[w.i].text, x + 4, y + 4); }, C.P);
      }
      solid((c) => { setText(c, font); c.fillText(WORDS[w.i].text, x, y); }, C.B);
    });
  }
}

// ---------------------------------------------------------------- print furniture
// credits: one line per asset (exact credit strings), stacked upward from the credit slot
let CREDIT_Y = 1240;
function credit(lines) {
  if (!lines || !lines.length) return;
  if (typeof lines === 'string') lines = [lines];
  const font = F.mono(21, 400), x = 88;
  lines.slice().reverse().forEach((str, i) => {
    const y = CREDIT_Y - i * 31, w = measure(str, font);
    knock(rect(x - 8, y - 22, w + 40, 30));
    solid(rect(x, y - 14, 11, 11), C.P);
    text(str, x + 21, y, C.B, { font });
  });
}
function slug(t, o = {}) {
  const y = 168, font = F.mono(24, 700);
  if (!o.noKnock) knock(rect(70, y - 30, 600, 44));
  text('DOWNLINK CAT', 88, y, o.col || C.B, { font, ls: 3 });
  text(o.kicker || 'LAUNCH DAY', 88 + measure('DOWNLINK CAT', font, 3) + 26, y, C.P, { font, ls: 3 });
  // crop marks
  const m = 34, L = 42;
  solid((c) => {
    c.lineWidth = 2.5;
    for (const [x, y2, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
      c.beginPath(); c.moveTo(x - sx * 8, y2 + sy * 18); c.lineTo(x - sx * 8, y2 + sy * (18 + L)); c.moveTo(x + sx * 18, y2 - sy * 8); c.lineTo(x + sx * (18 + L), y2 - sy * 8); c.stroke();
    }
  }, o.col || C.B);
  // registration target, printed in all three inks (it shows the misregistration)
  const rx = 975, ry = 152;
  for (const col of [C.B, C.P, C.Y]) solid((c) => { c.lineWidth = 3; circ(c, rx, ry, 17); c.stroke(); c.beginPath(); c.moveTo(rx - 30, ry); c.lineTo(rx + 30, ry); c.moveTo(rx, ry - 30); c.lineTo(rx, ry + 30); c.stroke(); }, col);
  // colour bar
  [[C.B, 1], [C.P, 1], [C.Y, 1]].forEach(([col], i) => solid(rect(770 + i * 40, 140, 32, 24), col));
}
// step tracker 1-4 under the slug
function steps(t, cur) {
  const x0 = 88, y = 214;
  for (let i = 1; i <= 4; i++) {
    const x = x0 + (i - 1) * 64, on = i === cur, done = i < cur;
    knock(rect(x - 4, y - 4, 56, 44));
    if (on) solid(rect(x, y, 48, 36), C.B);
    else solid((c) => { c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, 45, 33); }, C.B);
    if (done) tone(rect(x, y, 48, 36), enc(0.35, 0, 0));
    text(String(i), x + 24, y + 30, on ? C.W : C.B, { font: F.anton(30), align: 'center' });
    if (on) knock((c) => { setText(c, F.anton(30), 'center'); c.fillText(String(i), x + 24, y + 30); });
  }
}

// ---------------------------------------------------------------- Night Shift in riso inks
let CAT_IMG = null, CAT_T = -1;
const catBufs = {};
function setupCat() {
  const P = M_core.PAL, T = M_core.TONE;
  P.ink = '#00FFFF'; P.paper = '#FFFFFF'; P.amber = '#FFFF00'; P.muted = '#80FFFF'; T.earIn = '#FF00FF'; T.tongue = '#FF00FF';
  CAT = new M_actor.Actor({ scale: 0.4, seed: 11, safe: [40, 200, 900, 1320], start: [-500, 1200] });
  CAT.timeline(catTimeline());
  for (const k of ['sil', 'tmp']) catBufs[k] = mkCanvas();
}
async function rasterCat(t) {
  if (CAT_T === t) return CAT_IMG;
  const g = CAT.render(t, { rim: '#00FFFF' });
  CAT_T = t; CAT_IMG = null;
  if (!g) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
  // silhouette
  const s = catBufs.sil.getContext('2d'); s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, W, H); s.drawImage(img, 0, 0);
  s.globalCompositeOperation = 'source-in'; s.fillStyle = '#fff'; s.fillRect(0, 0, W, H); s.globalCompositeOperation = 'source-over';
  CAT_IMG = img; return img;
}
// draw the cat on the current sheet: pink halftone drop shadow, knockout, flat inks, halftone shading
function drawCat(o = {}) {
  if (!CAT_IMG) return;
  const sil = catBufs.sil, tmp = catBufs.tmp, x = tmp.getContext('2d');
  const sh = o.shadow ?? [16, 12];
  // drop shadow (pink 45%) on the tone plate
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H); x.drawImage(sil, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = o.shadowCol || enc(0, 0.5, 0); x.fillRect(0, 0, W, H);
  const T = SH.T; T.save(); T.globalCompositeOperation = 'multiply'; T.drawImage(tmp, sh[0], sh[1]); T.restore();
  // knock out both plates under the cat, then print the cat on the solid plate
  T.save(); T.drawImage(sil, 0, 0); T.restore();
  const S = SH.S; S.save(); S.drawImage(CAT_IMG, 0, 0); S.restore();
  // shading: the side away from the light gets pink dots (purple where it overprints the blue fur)
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H); x.drawImage(sil, 0, 0);
  x.globalCompositeOperation = 'destination-out'; x.drawImage(sil, -11, -9);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = enc(0, 0.62, 0); x.fillRect(0, 0, W, H);
  T.save(); T.globalCompositeOperation = 'multiply'; T.drawImage(tmp, 0, 0); T.restore();
}

// ---------------------------------------------------------------- registration and press state
const CELL = 10;
const KICKS = []; // { t, amp }
const SHAKES = []; // { t, amp }
function registration(t) {
  const base = [[0, 0], [2.8, -2.0], [-2.2, 2.6]];
  const dirs = [[0.4, -0.3], [1, -0.55], [-0.75, 1]];
  const off = base.map(([x, y], i) => [
    x + 1.7 * Math.sin(t * 0.83 + i * 2.1) + 0.7 * Math.sin(twos(t) * 2.9 + i * 1.7),
    y + 1.5 * Math.cos(t * 0.67 + i * 1.3) + 0.6 * Math.cos(twos(t) * 2.3 + i * 2.6)]);
  // intro: plates slam into register
  const intro = t < 0.6 ? Math.exp(-t * 7.5) * Math.cos(t * 26) : 0;
  off.forEach((o, i) => { o[0] += dirs[i][0] * 30 * intro; o[1] += dirs[i][1] * 30 * intro; });
  for (const k of KICKS) {
    const dt = t - k.t; if (dt < 0 || dt > 1.4) continue;
    const a = k.amp * Math.exp(-dt * 6.5) * Math.cos(dt * 21);
    off.forEach((o, i) => { o[0] += dirs[i][0] * a; o[1] += dirs[i][1] * a; });
  }
  const r = [0, 0.0011 * Math.sin(t * 0.47 + 1), -0.0009 * Math.sin(t * 0.39 + 2)];
  return { off, rot: r };
}
function shakeAt(t) {
  let x = 0, y = 0;
  for (const s of SHAKES) { const dt = t - s.t; if (dt < 0 || dt > 0.5) continue; const a = s.amp * Math.exp(-dt * 11); x += a * Math.sin(dt * 71 + s.t); y += a * Math.cos(dt * 59 + s.t * 2); }
  return [Math.round(x), Math.round(y)];
}

// ---------------------------------------------------------------- timeline
// SCENES (from scenes.js): [{ id, t0, cut: 'roller' | 'feed' | 'side', cap, draw(lt, t), credit(lt, t), step, cat }]
const TR = { roller: 15 / FPS, feed: 11 / FPS, side: 10 / FPS };
function planAt(t) {
  let k = 0; for (let j = 0; j < SCENES.length; j++) if (t >= SCENES[j].t0) k = j;
  const S = SCENES[k];
  if (k > 0) {
    const d = TR[S.cut || 'roller'], lt = t - S.t0;
    if (lt < d) {
      const u = lt / d;
      if ((S.cut || 'roller') === 'roller') {
        // the three drums print in turn: sunflower, pink, blue; each pass sweeps top to bottom
        const pass = (delay) => { const v = clamp((lt - delay) / (d - 4 / FPS)); return v <= 0 ? -60 : -60 + (H + 140) * eIO(v); };
        return { A: SCENES[k - 1], B: S, mode: 1, wipe: [pass(4 / FPS), pass(2 / FPS), pass(0)] };
      }
      // paper feed: the new sheet is pulled through in jerks (the press advancing), with a shadow edge
      const steps = [1, 0.86, 0.86, 0.6, 0.6, 0.6, 0.3, 0.3, 0.08, 0.02, 0, 0];
      const i = Math.min(steps.length - 1, Math.floor(u * (steps.length - 1)));
      const v = steps[i];
      return { A: SCENES[k - 1], B: S, mode: 2, slide: S.cut === 'side' ? [Math.round(W * v), 0] : [0, Math.round(H * v)] };
    }
  }
  return { A: S, B: null, mode: 0 };
}

async function printSheet(sheet, S, t, credits, capZone) {
  SH = sheet; sheet.clear();
  const lt = t - S.t0;
  S.draw(lt, t);
  if (S.catLayer !== false && CAT_IMG) drawCat(S.catOpts ? S.catOpts(lt, t) : {});
  if (S.after) S.after(lt, t);
  slug(t, S.slug ? S.slug(lt, t) : {});
  if (S.step) steps(t, S.step);
  credit(credits || (S.credit ? S.credit(lt, t) : []));
  drawCaptions(t, capZone || S.cap || 'bottom');
}

// The press prints 15 sheets a second ("on twos", like a risograph flip-book): frame pairs are
// identical, so a repeated call for the same sheet keeps the canvas as it is (still a pure function of t).
let LAST_FQ = -1;
window.renderAt = async function (t) {
  await window.__ready;
  const f = Math.max(0, Math.round(t * FPS)), fq = f - (f % 2);
  if (fq === LAST_FQ) return;
  t = fq / FPS;
  await rasterCat(t);
  const plan = planAt(t);
  // during a transition both sheets carry the credits of both, so a credit is up whenever its image is
  let credits = null;
  if (plan.B) { const ca = plan.A.credit ? plan.A.credit(t - plan.A.t0, t) : [], cb = plan.B.credit ? plan.B.credit(t - plan.B.t0, t) : []; credits = [...new Set([...ca, ...cb])]; }
  // captions sit where the incoming sheet puts them, on both sheets, so a word is never hidden by a pass
  const capZone = plan.B ? (plan.B.cap || 'bottom') : (plan.A.cap || 'bottom');
  await printSheet(SHA, plan.A, t, credits, capZone);
  PRESS.upload('SA', SHA.cS); PRESS.upload('TA', SHA.cT);
  if (plan.B) { await printSheet(SHB, plan.B, t, credits, capZone); PRESS.upload('SB', SHB.cS); PRESS.upload('TB', SHB.cT); }
  const reg = registration(t);
  PRESS.draw({ off: reg.off, rot: reg.rot, mode: plan.mode, wipe: plan.wipe, slide: plan.slide, shake: shakeAt(t), seed: [0.37, 0.61, 0.11, 0], grain: 0.04, cell: CELL });
  LAST_FQ = fq;
};

window.__ready = (async () => {
  for (const f of DATA.fonts) { const ff = new FontFace(f.family, `url(${f.src})`, { weight: String(f.weight) }); await ff.load(); document.fonts.add(ff); }
  await document.fonts.ready;
  A.marsTex = await loadImg(DATA.img.mars_tex);
  A.phobosTex = await loadImg(DATA.img.phobos_tex);
  A.phobosGeo = b64ToBuf(DATA.bin.phobos_geo);
  A.phA = separate(await loadImg(DATA.img.phobos_a), MAP.phobos);
  A.phB = separate(await loadImg(DATA.img.phobos_b), MAP.phobos);
  A.phHi = separate(await loadImg(DATA.img.phobos_a), MAP.phobosHi);
  G3 = new GL3D(A);
  PRESS = new Press(document.getElementById('view'));
  SHA = new Sheet(); SHB = new Sheet();
  layoutCaptions();
  setupCat();
  if (typeof initScenes === 'function') initScenes();
})();
