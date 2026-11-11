// ---------- captions (paper slips + one ransom-note emphasis word per line), kicker, step cards, credit slot ----------
// CAP is injected by the build: {words:[{text,start,end}]}
const CHUNKS = [[0, 1], [2, 5], [6, 7], [8, 9], [10, 12], [13, 14], [15, 20], [21, 22], [23, 25], [26, 27], [28, 30], [31, 34], [35, 38], [39, 40], [41, 44], [45, 46], [47, 48], [49, 53], [54, 55], [56, 60], [61, 64], [65, 65], [66, 67], [68, 71], [72, 74], [75, 77], [78, 81], [82, 84], [85, 85], [86, 88]];
// one emphasis word per caption line, cut out letter by letter (one typeface per word, dark ink on light papers)
const RANSOM = new Set([6, 14, 16, 25, 30, 32, 39, 44, 47, 52, 65, 67, 68]);
// forced line breaks before these words ("Downlink Cat." stays together on its own line)
const BREAK = new Set([87]);
const CAPY = [1262, 1378];
const CAP_X0 = 112, CAP_X1 = 872;
const RFONT = { f: '400 92px "Archivo Black"', s: 'normal' };
const RPAPERS = ['cream', 'amber', 'manila', 'news', 'white', 'amber', 'cream', 'manila'];
const UI = { chunks: [] };
// QA: bounding box of every caption slip drawn this frame (screen space), read by the QA script
window.__capBox = null;

function buildCaptions() {
  const meas = document.createElement('canvas').getContext('2d');
  const wordW = (txt, spec) => { meas.font = spec.f; meas.fontStretch = spec.s || 'normal'; meas.letterSpacing = '0px'; return meas.measureText(txt).width; };
  const NF = { f: '800 78px Archivo', s: 'normal' };
  for (let ci = 0; ci < CHUNKS.length; ci++) {
    const [a, b] = CHUNKS[ci];
    const items = [];
    for (let i = a; i <= b; i++) {
      const w = CAP.words[i];
      const txt = w.text;
      if (RANSOM.has(i)) {
        const letters = [];
        let x = 0;
        const r = mulberry32(5000 + i * 17);
        let lastP = -1;
        for (let k = 0; k < txt.length; k++) {
          const ch = txt[k];
          const isPunct = /[.,:]/.test(ch); // '?' is tall: it gets a full-height slip so it is never clipped
          const cw = wordW(ch, RFONT);
          let pi = Math.floor(r() * RPAPERS.length); if (pi === lastP) pi = (pi + 3) % RPAPERS.length; lastP = pi;
          const pw = isPunct ? cw + 8 : cw + 16 + r() * 6, ph = isPunct ? 44 : 104 + r() * 8;
          const paper = isPunct ? 'cream' : RPAPERS[pi];
          const rot = (r() - 0.5) * (isPunct ? 0 : 0.10), dy = (r() - 0.5) * 7;
          const P = new Piece({ shape: () => { const j = () => (r() - 0.5) * 6; return [[-pw / 2 + j(), -ph * 0.72 + j()], [pw / 2 + j(), -ph * 0.72 + j()], [pw / 2 + j(), ph * 0.28 + j()], [-pw / 2 + j(), ph * 0.28 + j()]]; },
            paper, edge: 'cut', res: 1.4, blur: 5, variants: 2, jitter: 0.6,
            details: (g) => textIn(g, ch, 0, isPunct ? 6 : 4, RFONT.f, '#1b1a20', { align: 'center', stretch: RFONT.s, alpha: 1 }) });
          letters.push({ P, x: x + pw / 2, dy: isPunct ? 22 : dy, rot, hw: pw / 2, top: -ph * 0.72, bot: ph * 0.28 });
          x += pw - 4;
        }
        items.push({ i, ransom: true, letters, w: x });
      } else {
        const tw = wordW(txt, NF);
        const pw = tw + 30, ph = 94;
        const mk = (paper) => new Piece({ shape: () => { const r = mulberry32(900 + i); const j = () => (r() - 0.5) * 5; return [[-pw / 2 + j(), -ph * 0.72 + j()], [pw / 2 + j(), -ph * 0.72 + j()], [pw / 2 + j(), ph * 0.28 + j()], [-pw / 2 + j(), ph * 0.28 + j()]]; },
          paper, edge: 'cut', res: 1.3, blur: 5, variants: 2, jitter: 0.6,
          details: (g) => textIn(g, txt, 0, 0, NF.f, '#1b1a20', { align: 'center', stretch: NF.s, alpha: 1 }) });
        items.push({ i, ransom: false, P: mk('cream'), PA: mk('amber'), w: pw, rot: (h1(i * 3.3) - 0.5) * 0.045, dy: (h1(i * 7.1) - 0.5) * 6 });
      }
    }
    // line layout (max 2 lines, forced breaks honoured); shrink if needed
    let sc = 1, lines;
    for (let tries = 0; tries < 8; tries++) {
      lines = [[]]; let x = 0;
      for (const it of items) {
        const w = it.w * sc;
        if (x > 0 && (BREAK.has(it.i) || x + w > (CAP_X1 - CAP_X0))) { lines.push([]); x = 0; }
        lines[lines.length - 1].push(it); it.lx = x; x += w + 10 * sc;
      }
      if (lines.length <= 2 && lines.every((ln) => ln.reduce((s, it) => s + it.w * sc + 10 * sc, -10 * sc) <= CAP_X1 - CAP_X0)) break;
      sc *= 0.93;
    }
    if (lines.length > 2) console.warn('chunk', ci, 'needs', lines.length, 'lines');
    lines.forEach((ln, li) => ln.forEach((it) => { it.line = li; }));
    UI.chunks.push({ a, b, items, sc, start: CAP.words[a].start });
  }
}

function capTrack(M, x0, y0, x1, y1) {
  for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
    const p = mApply(M, x, y);
    const B = window.__capBox || (window.__capBox = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
    B.x0 = Math.min(B.x0, p[0]); B.y0 = Math.min(B.y0, p[1]); B.x1 = Math.max(B.x1, p[0]); B.y1 = Math.max(B.y1, p[1]);
  }
}
function drawCaptions(ctx, t) {
  const F = frameOf(t);
  window.__capBox = null;
  let ci = -1;
  for (let k = 0; k < UI.chunks.length; k++) if (F >= Math.round(UI.chunks[k].start * FPS)) ci = k;
  // exitAge >= 0: in the 2 frames before the next chunk starts, this chunk sinks back into the stage in place
  // (never sliding past the safe area), so the next line's first frame shows only its own first word
  const draw = (k, exitAge) => {
    const ch = UI.chunks[k];
    let newest = -1;
    for (const it of ch.items) if (F >= Math.round(CAP.words[it.i].start * FPS)) newest = it.i;
    const ek = exitAge >= 0 ? [0.5, 0.2][exitAge] : 1;
    const ey = exitAge >= 0 ? [12, 24][exitAge] : 0;
    for (const it of ch.items) {
      const w = CAP.words[it.i];
      const f0 = Math.round(w.start * FPS);
      if (F < f0) continue;
      const age = F - f0;
      const stepAge = Math.floor(age / 2);
      const slap = exitAge >= 0 ? 0 : stepAge === 0 ? 1 : stepAge === 1 ? 0.35 : 0;
      const x = CAP_X0 + it.lx * 1, y = CAPY[it.line] + ey;
      const sc = ch.sc * (1 + (it.ransom ? 0.07 : 0.09) * slap) * ek, rot = 0.035 * slap;
      const lift = exitAge >= 0 ? 4 : 7 + 22 * slap;
      const Wc = it.w * ch.sc / 2; // scale about the slip's center
      const base = mmul(mPlace(MI, x + Wc, y, rot, sc), mT(-it.w / 2, 0));
      if (it.ransom) {
        for (const L of it.letters) {
          const ML = mPlace(base, L.x, L.dy, L.rot + (slap ? (h1(L.x) - 0.5) * 0.12 : 0));
          drawP(ctx, L.P, ML, { lift: lift + 2 });
          capTrack(ML, -L.hw - 4, L.top - 4, L.hw + 4, L.bot + 4);
        }
      } else {
        const P = it.i === newest && exitAge < 0 ? it.PA : it.P;
        const MW = mPlace(base, it.w / 2, it.dy, it.rot);
        drawP(ctx, P, MW, { lift });
        capTrack(MW, -it.w / 2 - 3, -94 * 0.72 - 3, it.w / 2 + 3, 94 * 0.28 + 3);
      }
    }
  };
  if (ci >= 0) {
    const nf = ci + 1 < UI.chunks.length ? Math.round(UI.chunks[ci + 1].start * FPS) : 1e9;
    const ex = F - (nf - 2);
    draw(ci, ex >= 0 ? ex : -1);
  }
}

// ---------- kicker, step cards (with progress pips), credit slot ----------
const STEP_W = 300;
function buildUI() {
  UI.kicker = new Piece({ shape: () => rectPts(0, -24, 254, 48), paper: 'ink', edge: 'torn', res: 1.6, blur: 7, amp: 1.6,
    details: (g) => { g.fillStyle = pat(g, 'amber', 2); g.beginPath(); g.moveTo(20, 13); g.lineTo(34, -12); g.lineTo(48, 13); g.fill(); textIn(g, 'LAUNCH DAY', 62, 10, '600 26px "IBM Plex Mono"', '#f2ebdd', { ls: '2px', alpha: 1 }); } });
  // a notebook-paper step card; the four pips are the echo mark's dot (done / now) and ring (still to come)
  UI.steps = [1, 2, 3, 4].map((n) => new Piece({ shape: () => rectPts(-STEP_W / 2, -40, STEP_W, 80), paper: 'cream', edge: 'cut', res: 2.4, blur: 7,
    details: (g) => {
      const x0 = -STEP_W / 2;
      g.strokeStyle = 'rgba(200,60,50,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, -18); g.lineTo(x0 + STEP_W, -18); g.stroke();
      g.strokeStyle = 'rgba(90,130,170,0.35)'; g.lineWidth = 1.5; for (let y = -2; y < 40; y += 16) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + STEP_W, y); g.stroke(); }
      textIn(g, 'STEP', x0 + 18, 26, '800 44px Archivo', '#1b1a20', { stretch: 'semi-expanded', alpha: 1 });
      textIn(g, String(n), x0 + 160, 30, '400 62px "Abril Fatface"', '#c8352e', { alpha: 1 });
      // pip strip
      g.fillStyle = pat(g, 'ink', 40 + n); g.beginPath(); g.roundRect(x0 + 196, -17, 94, 34, 17); g.fill();
      for (let k = 0; k < 4; k++) {
        const cx = x0 + 212 + k * 20.5, cy = 0;
        if (k < n) { g.fillStyle = pat(g, 'amber', 50 + k); g.beginPath(); g.arc(cx, cy, 7.5, 0, TAU); g.fill(); }
        else { g.strokeStyle = pat(g, 'amber', 60 + k); g.lineWidth = 2.6; g.beginPath(); g.arc(cx, cy, 6.2, 0, TAU); g.stroke(); }
      }
    } }));
  UI.credits = {};
  for (const txt of CREDIT_TEXTS) {
    meas2.font = '500 24px "IBM Plex Mono"';
    const w = meas2.measureText(txt).width + 28;
    UI.credits[txt] = new Piece({ shape: () => rectPts(0, -19, w, 38), paper: 'cream', edge: 'cut', res: 1.6, blur: 5,
      details: (g) => textIn(g, txt, 14, 8, '500 24px "IBM Plex Mono"', '#2a2622', { alpha: 1 }) });
  }
}
const meas2 = document.createElement('canvas').getContext('2d');
const PHOTO_CREDIT = 'NASA/JPL-Caltech/University of Arizona';
const CREDIT_TEXTS = ['Illustration · facts: NASA', 'Illustration · facts: JAXA', PHOTO_CREDIT, 'Illustration, not to scale · facts: NASA, ESA',
  'Illustration, not to scale · facts: DLR, ESA', 'Illustration, not to scale · facts: JAXA, NASA', 'Illustration, not to scale · facts: JAXA, ESA', 'Illustration · facts: JAXA',
  'Illustration · facts: Launch Library 2'];
// credit schedule [t0, t1, text, slot]
let CREDIT_SCHED = [];

// the four heist steps: Night Shift raises each card on "Step", then pins it to the corner
const STEP_BEATS = [{ n: 1, ts: 7.33, pin: 8.36 }, { n: 2, ts: 10.74, pin: 11.62 }, { n: 3, ts: 18.99, pin: 19.8 }, { n: 4, ts: 25.59, pin: 26.5 }];
const STEP_FLY = 0.27, STEP_END = 30.75;
const CORNER = [232, 352, 0.015];

function flipCard(ctx, P, Pold, x, y, age, o = {}) {
  // a paper card flipping over its horizontal axis on twos: the old one folds away, the new one unfolds
  const st = Math.floor(age / 2);
  const k = [0, 0.15, 0.6, 1.06, 1][Math.min(4, st)];
  if (Pold && st < 2) { const ko = [1, 0.4][st]; drawP(ctx, Pold, mPlace(MI, x, y, 0, 1, ko), { lift: 6 }); return; }
  drawP(ctx, P, mPlace(MI, x, y, o.rot ?? 0, 1, k), { lift: 6 + (1 - Math.min(1, k)) * 10 });
}
function drawStepCorner(ctx, t) {
  if (t >= STEP_END + 0.15) return;
  const tq = q2(t);
  let k = -1; for (let i = 0; i < STEP_BEATS.length; i++) if (tq >= STEP_BEATS[i].pin) k = i;
  if (k < 0) return;
  const B = STEP_BEATS[k];
  const age = tq - B.pin;
  // closing: the card flips shut in place at the end of step four (never slides past the edge)
  if (t >= STEP_END) { const ks = [0.62, 0.2][Math.min(1, Math.floor((t - STEP_END) * FPS / 2))]; drawP(ctx, UI.steps[k], mPlace(MI, CORNER[0], CORNER[1], CORNER[2], 1, ks), { lift: 8 }); return; }
  if (age < STEP_FLY) {
    if (k > 0) drawP(ctx, UI.steps[k - 1], mPlace(MI, CORNER[0], CORNER[1], CORNER[2]), { lift: 6 });
    const A = stepCardHeld(k, B.pin);
    const u = age / STEP_FLY, e = E.io(u);
    const x = lerp(A.x, CORNER[0], e), y = lerp(A.y, CORNER[1], e) - Math.sin(Math.PI * u) * 140;
    const s = lerp(A.s, 1.0, e) * (1 + 0.12 * Math.sin(Math.PI * u)), r = lerp(A.r, CORNER[2], e) + Math.sin(Math.PI * u) * 0.5;
    drawP(ctx, UI.steps[k], mPlace(MI, x, y, r, s), { lift: 10 + 40 * Math.sin(Math.PI * u) });
    return;
  }
  const la = Math.floor((age - STEP_FLY) * FPS / 2);
  const slap = [1.12, 1.04, 1][Math.min(2, la)];
  drawP(ctx, UI.steps[k], mPlace(MI, CORNER[0], CORNER[1], CORNER[2], slap), { lift: 6 + (slap - 1) * 120 });
}
function drawUI(ctx, t) {
  const F = frameOf(t);
  // kicker (whole Short until the end card)
  const kOut = inv(38.7, 39.0, t);
  if (kOut < 1) drawP(ctx, UI.kicker, mPlace(MI, 84 - kOut * 400, 276, -0.012), { lift: 7 });
  drawStepCorner(ctx, t);
  // credit slot (slot 1 sits just above slot 0 when two credits must show at once)
  for (const slot of [0, 1]) {
    let cur = null, prev = null, f0 = 0;
    for (const [a, b, txt, sl] of CREDIT_SCHED) if (sl === slot && t >= a && t < b) { cur = txt; f0 = Math.round(a * FPS); }
    for (const [a, b, txt, sl] of CREDIT_SCHED) if (sl === slot && Math.round(b * FPS) === f0) prev = txt;
    if (cur) flipCard(ctx, UI.credits[cur], prev ? UI.credits[prev] : null, 80, slot ? 1430 : 1474, f0 === 0 ? 99 : F - f0);
  }
}
