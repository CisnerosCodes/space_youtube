// ---------- shots: the diorama, beat by beat ----------
// a hanging manila tag with typewriter lines
function makeTag(lines, o = {}) {
  const font = o.font || '400 31px "Special Elite"', lh = o.lh || 37;
  meas2.font = font; meas2.fontStretch = 'normal'; meas2.letterSpacing = '0px';
  const w = Math.max(...lines.map((l) => meas2.measureText(l).width)) + 56, h = lines.length * lh + 30;
  return new Piece({ shape: () => [[-w / 2 + 14, 0], [w / 2 - 14, 0], [w / 2, 14], [w / 2, h], [-w / 2, h], [-w / 2, 14]], paper: o.paper || 'manila', edge: 'cut', res: 1.6, blur: 7, variants: 2,
    details: (g) => { g.fillStyle = 'rgba(20,10,10,0.8)'; g.beginPath(); g.arc(0, 13, 5, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 13, 8, 0, TAU); g.stroke();
      lines.forEach((l, i) => textIn(g, l, 0, 30 + lh * (i + 0.72), font, '#24201c', { align: 'center', alpha: 0.95 })); } });
}
// hang a piece from a thread: anchor (ax, ay) in screen, swinging; returns matrix
function hang(ctx, P, ax, ay, len, ang, sc = 1, o = {}) {
  const bx = ax + Math.sin(ang) * len, by = ay + Math.cos(ang) * len;
  thread(ctx, ax, ay, bx, by + 13 * sc, { w: 1.6 });
  const M = mPlace(MI, bx, by, -ang * 0.9, sc);
  drawP(ctx, P, M, { lift: o.lift ?? 14 });
  return M;
}
function swing(t, t0, amp = 0.35, f = 0.9, decay = 1.6) { return wobble(t - t0, f, decay) * amp; }

const TAGS = {};
const WIPE = {};
function buildShots() {
  TAGS.hook = makeTag(['1.8 m (6 ft) closer to Mars', 'every 100 years (NASA)']);
  TAGS.drop = makeTag(['dropped from about 40 m,', 'in free fall (DLR)']);
  TAGS.corer = makeTag(['corer digs to 2 cm (JAXA)']);
  // NASA's either/or for the far future, as a placard on a stick
  TAGS.fate = new Piece({ shape: () => rectPts(-205, -118, 410, 236), paper: 'cream', edge: 'cut', res: 2, blur: 9, variants: 2,
    details: (g) => {
      g.fillStyle = pat(g, 'ink', 21); g.fillRect(-205, -118, 410, 52);
      textIn(g, 'IN 50 MILLION YEARS:', 0, -82, '600 25px "IBM Plex Mono"', '#f2ebdd', { align: 'center', alpha: 1, ls: '1px' });
      const box = (y, txt) => { g.strokeStyle = 'rgba(27,26,32,0.85)'; g.lineWidth = 3.5; g.strokeRect(-182, y - 26, 28, 28); textIn(g, txt, -140, y, '700 33px Archivo', '#1b1a20', { alpha: 1 }); };
      box(-18, 'crash into Mars');
      textIn(g, 'or', 0, 30, '400 30px "Special Elite"', '#c8352e', { align: 'center', alpha: 1 });
      box(84, 'break up into a ring');
    } });
  PC.ground = new Piece({ shape: () => { const p = []; for (let i = 0; i <= 80; i++) { const x = -260 + i * 20; p.push([x, 880 + Math.pow((x - 540) / 700, 2) * 160]); } p.push([1340, 2120], [-260, 2120]); return p; },
    paper: 'pho', edge: 'torn', res: 0.85, variants: 2, blur: 26, amp: 4, freq: 0.05, jitter: 0.4,
    details: (g) => {
      inlay(g, blobPts(160, 1180, 420, 160, 701, 0.3, 70, -0.1), 'phoLt', 702, { sa: 0.22, sb: 6 });
      inlay(g, blobPts(900, 1300, 380, 200, 703, 0.3, 70, 0.3), 'phoDk', 704, { sa: 0.25, sb: 6 });
      inlay(g, blobPts(520, 1060, 300, 70, 705, 0.3, 60, 0.02), 'phoLt', 706, { sa: 0.18, sb: 5 });
      for (let k = 0; k < 6; k++) { const line = []; for (let i = 0; i <= 30; i++) { const u = i / 30; line.push([-100 + u * 1300, 960 + k * 46 + 30 * Math.sin(u * 3 + k) + 40 * u]); }
        g.strokeStyle = 'rgba(60,46,38,0.30)'; g.lineWidth = 3.4; g.beginPath(); line.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        g.strokeStyle = 'rgba(214,202,186,0.2)'; g.lineWidth = 1.8; g.beginPath(); line.forEach(([x, y], i) => (i ? g.lineTo(x + 1.5, y + 3) : g.moveTo(x + 1.5, y + 3))); g.stroke(); }
      for (const [x, y, r] of [[90, 1010, 46], [1010, 990, 38], [700, 1130, 30], [250, 1350, 60], [960, 1460, 52], [520, 1240, 22], [40, 1560, 40]]) crater(g, x, y, r, 900 + x);
    } });
  PC.mound = new Piece({ shape: () => { const p = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; p.push([Math.cos(a) * 46, Math.sin(a) * 22 * (1 + 0.2 * Math.sin(i * 1.7))]); } p.push([46, 8], [-46, 8]); return p; }, paper: 'phoLt', edge: 'torn', res: 2.4, blur: 5 });
  PC.cardHandle = new Piece({ shape: () => rrectPts(-6, -4, 12, 104, 5), paper: 'wood', edge: 'cut', res: 2, blur: 5 });
  PC.cardHandleL = new Piece({ shape: () => rrectPts(-6, -4, 12, 214, 5), paper: 'wood', edge: 'cut', res: 2, blur: 5 });
  PC.fateStick = new Piece({ shape: () => rrectPts(-9, 0, 18, 900, 8), paper: 'wood', edge: 'cut', res: 1.2, blur: 8 });
  // onomatopoeia cut from paper scraps (sound words, not captions)
  TAGS.sfx = {};
  for (const [key, word, paper] of [['bonk', 'BONK!', 'amber'], ['thunk', 'THUNK!', 'cream'], ['fsss', 'FSSSH!', 'blueTag']]) {
    TAGS.sfx[key] = new Piece({ shape: () => { const p = []; const n = 22; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const r = i % 2 ? 0.74 : 1; p.push([Math.cos(a) * 190 * r, Math.sin(a) * 84 * r]); } return p; }, paper, edge: 'cut', res: 1.8, blur: 8, variants: 2,
      details: (g) => textIn(g, word, 0, 20, '400 62px "Archivo Black"', '#1b1a20', { align: 'center', alpha: 1 }) });
  }
  TAGS.electron = makeTag(['Electron'], { font: '400 30px "Special Elite"' });
  TAGS.sats = makeTag(['3x HawkEye 360'], { font: '400 28px "Special Elite"' });
  TAGS.ticket = new Piece({ shape: () => [[0, -59], [680, -59], [680, -12], [668, 0], [680, 12], [680, 59], [0, 59], [0, 12], [12, 0], [0, -12]], paper: 'cream', edge: 'cut', res: 1.6, blur: 8,
    details: (g) => {
      g.fillStyle = pat(g, 'red', 4); g.fillRect(0, -59, 130, 118);
      textIn(g, 'H3', 65, -6, '800 44px Archivo', '#f6efe0', { align: 'center', stretch: 'semi-expanded', alpha: 1 });
      textIn(g, 'No.10', 65, 36, '600 28px "IBM Plex Mono"', '#f6efe0', { align: 'center', alpha: 1 });
      g.strokeStyle = 'rgba(40,30,30,0.5)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(132, -59); g.lineTo(132, 59); g.stroke(); g.setLineDash([]);
      textIn(g, 'Launch: 04:41:03 JST, Oct 20, 2026', 150, -10, '500 24px "IBM Plex Mono"', '#24201c', { alpha: 1 });
      textIn(g, '(19:41:03 UTC, Oct 19)', 150, 28, '500 24px "IBM Plex Mono"', '#5a524a', { alpha: 1 });
    } });
  WIPE.sheet = new Piece({ shape: () => { const p = []; for (let i = 0; i <= 60; i++) p.push([-260 + i * 27, 0 + 40 * fbm(3, i * 0.25)]); for (let i = 60; i >= 0; i--) p.push([-260 + i * 27, 2080 + 40 * fbm(4, i * 0.25)]); return p; }, paper: 'amberDk', edge: 'torn', res: 0.55, variants: 2, blur: 30, amp: 5, freq: 0.04, coreW: 5,
    details: (g) => { for (let k = 0; k < 4; k++) inlay(g, blobPts(200 + k * 260, 500 + k * 420, 380, 120, 70 + k, 0.3, 60, 0.2), 'amber', 80 + k, { sa: 0.25, sb: 8 }); } });
  WIPE.sky = new Piece({ shape: () => { const p = []; for (let i = 0; i <= 50; i++) p.push([-300 + i * 33.6, -1290 + 30 * fbm(8, i * 0.3)]); for (let i = 0; i <= 50; i++) p.push([1380 - i * 33.6, 0 + 26 * fbm(9, i * 0.3)]); return p; }, paper: 'night0', edge: 'torn', res: 0.6, variants: 2, blur: 26, amp: 4, freq: 0.05,
    details: (g) => {
      inlay(g, [[-300, -760], [1380, -720], [1380, 40], [-300, 40]], 'night1', 91, { sa: 0.35, sb: 8 });
      inlay(g, [[-300, -330], [1380, -360], [1380, 40], [-300, 40]], 'night2', 92, { sa: 0.35, sb: 8 });
      const r = mulberry32(17); for (let i = 0; i < 70; i++) { const x = -300 + r() * 1680, y = -1260 + r() * 820, rr = 0.8 + r() * 2; g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x, y, rr + 1, 0, TAU); g.fill(); g.fillStyle = '#f6e7c4'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
    } });
  PC.porthole = new Piece({ shape: () => [ellipsePts(0, 0, 170, 170, 80), ellipsePts(0, 0, 138, 138, 80)], paper: 'kraft', edge: 'cut', res: 1.6, blur: 10 });
  PC.flag = new Piece({ shape: () => [rectPts(-3, -140, 6, 140), [[3, -140], [96, -116], [3, -92]]], paper: 'red', edge: 'cut', res: 2, blur: 5,
    details: (g) => { g.fillStyle = pat(g, 'wood', 2); g.fillRect(-3, -140, 6, 140); textIn(g, '2031', 40, -108, '800 24px Archivo', '#f6efe0', { align: 'center', alpha: 1, stretch: 'semi-expanded' }); } });
  PC.spot = new Piece({ shape: () => [[-60, 0], [60, 0], [300, 900], [-300, 900]], paper: 'vellum', edge: 'cut', res: 0.6, blur: 20, shade: 0, inkEdge: 0 });
  PC.endBack = new Piece({ shape: () => rectPts(-700, -1100, 1400, 2200), paper: 'ink', edge: 'none', res: 0.6, variants: 1, blur: 4, shade: 0,
    details: (g) => { inlay(g, blobPts(-200, -300, 700, 420, 5, 0.3, 80, 0.3), 'inkSoft', 6, { sa: 0.35, sb: 10 }); inlay(g, blobPts(300, 600, 600, 300, 7, 0.3, 80, -0.2), 'inkSoft', 8, { sa: 0.35, sb: 10 }); } });
  PC.dot = new Piece({ shape: () => ellipsePts(0, 0, 40, 40, 60), paper: 'amber', edge: 'cut', res: 2, blur: 7 });
  PC.ring = new Piece({ shape: () => [ellipsePts(0, 0, 40, 40, 60), ellipsePts(0, 0, 28, 28, 60)], paper: 'amber', edge: 'cut', res: 2, blur: 7 });
  WM.letters = [];
  const word = (txt, paper, x0, y, size) => { let x = x0; for (const ch of txt) { const P = new TextPiece({ text: ch, font: `800 ${size}px Archivo`, stretch: 'expanded', paper, blur: 7, res: 1.3 }); const S = P.get(0); WM.letters.push({ P, x, y }); x += S.adv + 2; } };
  word('DOWNLINK', 'cream', 0, 0, 100);
  word('CAT', 'amber', 0, 121, 100);
}
const WM = {};

// ---------- the space world (hook, target card, Mars orbit, the heist on Pho) ----------
const CAMK = [
  [0, [-30, -50, 0.44, 0]], [1.7, [-24, -46, 0.5, 0]], [2.6, [0, 70, 0.0, 0]], [3.3, [0, 84, -0.02, 0]],
  [3.4, [0, 0, 0.0, 0], 'step'], [7.15, [10, 10, 0.08, 0]], [7.7, [0, 40, -0.06, 0]], [10.35, [0, 20, -0.02, 0]],
  [11.0, [0, -70, 0.0, 0]], [11.9, [0, -60, 0.0, 0]], [13.2, [20, 30, 0.06, 0]], [14.6, [40, -20, 0.12, 0]], [15.4, [60, 104, 0.68, 0]], [16.3, [62, 100, 0.72, 0]], [16.5, [62, 8, 1.0, 0], 'out'], [18.45, [68, 2, 1.08, 0], 'lin'],
  [19.4, [0, -110, 0.02, 0]], [20.12, [8, -98, 0.07, 0]],
  [20.3, [59, 67, 2.4, 0], 'out'], [20.96, [63, 62, 2.52, 0], 'lin'], [21.2, [40, 20, 0.36, 0], 'step'],
  [22.2, [40, 20, 0.36, 0]], [22.86, [36, 22, 0.3, 0], 'lin'],
  [23.25, [-185, -10, 0.08, 0]], [25.3, [-175, -20, 0.1, 0]],
  [26.1, [0, -50, 0.0, 0]], [26.9, [0, -70, 0.0, 0]], [27.8, [0, -560, 0.0, 0], 'in2'],
];
const SHAKES = [[13.2, 7], [19.9, 12], [21.0, 5], [21.78, 4], [26.73, 9], [24.1, 3]];
function shake(t) { const tq = q2(t); let x = 0, y = 0; for (const [t0, a] of SHAKES) { const d = tq - t0; if (d >= 0 && d < 0.5) { const e = Math.exp(-d * 8) * a; x += (h2(G.step, t0) - 0.5) * 2 * e; y += (h2(G.step + 7, t0) - 0.5) * 2 * e; } } return [x, y]; }
function spaceCam(t) { const v = kf(t, CAMK); const [sx, sy] = shake(t); v[0] += sx; v[1] += sy; const sh = t > 4.6 && t < 5.3 ? (1 - E.out(inv(4.72, 5.25, t))) * 760 : 0; return { x: v[0], y: v[1] + sh, push: v[2], roll: v[3], zoom: 1 }; }

const PHO_KEYS = [
  [0, 'grumpy', 'rest'], [0.36, 'annoyed', 'hips'], [1.05, 'unimpressed', 'hips'], [1.82, 'alarmed', 'rest'], [2.55, 'panic', 'cheeks'], [3.05, 'gulp', 'cheeks'],
  [5.2, 'grumpy', 'rest'], [5.58, 'outrage', 'flail'], [6.25, 'panic', 'head'], [6.95, 'fury', 'fists'],
  [7.6, 'glare', 'cross'], [9.3, 'grumpy', 'cross'],
  [10.7, 'glare', 'hips'], [11.72, 'alarmed', 'rest'], [12.48, 'panic', 'head'], [13.2, 'wince', 'head'], [13.75, 'annoyed', 'hips'],
  [14.86, 'unimpressed', 'hips'], [16.1, 'meh', 'hips'], [16.5, 'unimpressed', 'shrug'], [17.6, 'annoyed', 'hips'],
  [18.95, 'glare', 'hips'], [19.6, 'alarmed', 'rest'], [19.9, 'wince', 'rest'], [20.14, 'panic', 'rest'], [20.98, 'ow', 'flail'], [21.76, 'wince', 'flail'], [22.2, 'outrage', 'fists'],
  [22.88, 'glare', 'cross'], [23.6, 'sulk', 'cross'], [24.1, 'outrage', 'fists'], [24.55, 'sulk', 'cross'], [25.55, 'glare', 'hips'], [26.72, 'wince', 'cheeks'], [27.05, 'fury', 'fist'],
];
// Pho placement in the space world
function phoPlace(t) {
  if (t < 3.25) { const u = inv(1.8, 3.25, t); return [520 + 26 * u, 690 + 34 * E.sio(u), 1.0, -0.04 + 0.07 * E.sio(u)]; }
  if (t < 3.6) { const u = inv(3.25, 3.55, q2(t)); return [546, 724 - E.in2(u) * 1500, 1.0, 0.03]; }
  if (t < 5.18) return null;
  if (t < 7.2) { const u = inv(5.2, 5.62, q2(t)); return [lerp(1500, 772, E.outBack(u)), 900, 0.7, lerp(-0.3, -0.03, E.out(u))]; }
  const orbit = (tt) => { const th = lerp(0.35, 2.75, inv(7.6, 10.4, tt)); return [540 + 440 * Math.cos(th), 990 + 120 * Math.sin(th), 0.27 + 0.03 * Math.sin(th), Math.cos(th) * 0.2]; };
  if (t < 7.6) { const u = E.io(inv(7.2, 7.6, t)); const o = orbit(7.6); return [lerp(772, o[0], u), lerp(900, o[1], u), lerp(0.7, o[2], u), lerp(-0.03, o[3], u)]; }
  if (t < 10.4) return orbit(t);
  if (t < 11.0) { const u = E.io(inv(10.4, 11.0, t)); const o = orbit(10.4); return [lerp(o[0], 540, u), lerp(o[1], 960, u), lerp(o[2], 0.95, u), lerp(o[3], 0, u)]; }
  return [540 + Math.sin(t * 0.7) * 6, 960 + Math.sin(t * 0.9) * 5, 0.95, Math.sin(t * 0.5) * 0.015];
}
function marsPlace(t) {
  if (t < 3.6) { const u = E.out(inv(1.75, 2.7, t)); const s = inv(3.25, 3.55, q2(t)); return [650, lerp(2250, 1880, u) + E.in2(s) * 900, 1.72, t * 0.004]; }
  if (t < 7.2) return null;
  if (t < 10.4) { const u = inv(7.2, 7.62, q2(t)); return [540, lerp(1900, 990, E.outBack(u)), 0.62, 0.3 + t * 0.006]; }
  if (t < 11.0) { const u = E.io(inv(10.4, 11.0, t)); return [lerp(540, -60, u), lerp(990, 2060, u), lerp(0.62, 1.85, u), 0.3 + t * 0.006]; }
  return [-60, 2060, 1.85, 0.3 + t * 0.006];
}
function drawMars(ctx, M) {
  drawP(ctx, PC.marsBase, M, { lift: 30 });
  for (const m of PC.marsPatches) drawP(ctx, m.p, mPlace(M, m.x, m.y), { lift: 3 });
  drawP(ctx, PC.marsValles, M, { lift: 2 });
  drawP(ctx, PC.marsCap, mPlace(M, -40, -430, 0.08), { lift: 3 });
  drawP(ctx, PC.marsNight, mPlace(M, 0, 0, -0.25), { lift: 0, alpha: 0.7, comp: 'multiply' });
}
// MMX drawing: base matrix at its body center; o: {arm:[a,b], legs:true, flame:0..1}
function drawMMX(ctx, M, o = {}) {
  const lift = o.lift ?? 16;
  if (o.flame > 0) drawFlame(ctx, mPlace(M, 0, 86), o.flame * 0.8, 0);
  for (const s of [-1, 1]) drawP(ctx, PC.mmxLeg, mmul(mPlace(M, s * 60, 50), mS(-s, 1)), { lift: lift - 2 });
  for (const s of [-1, 1]) drawP(ctx, PC.mmxPad, mPlace(M, s * 104, 128), { lift: lift - 2 });
  drawP(ctx, PC.mmxNozzle, mPlace(M, 0, 56), { lift: lift - 2 });
  drawP(ctx, PC.mmxBoom, mPlace(M, 76, -6), { lift }); drawP(ctx, PC.mmxBoom, mPlace(M, -110, -6), { lift });
  const fold = o.fold ?? 0;
  drawP(ctx, PC.mmxPanel, mPlace(M, 108, -6, 0, 1 - fold * 0.9, 1), { lift: lift + 4 });
  drawP(ctx, PC.mmxPanel, mmul(mPlace(M, -108, -6, 0, 1 - fold * 0.9, 1), mS(-1, 1)), { lift: lift + 4 });
  drawP(ctx, PC.mmxDish, mPlace(M, -20, -58, -0.2), { lift });
  drawP(ctx, PC.mmxBody, M, { lift: lift + 2 });
  if (o.arm) {
    const [a, b] = o.arm;
    const MA = mPlace(M, 70, 34, a), MB = mPlace(MA, 84, 0, b), MC = mPlace(MB, 68, 0, -a - b + Math.PI / 2 + (o.drill ?? 0));
    drawP(ctx, PC.armA, MA, { lift: lift + 6 }); drawP(ctx, PC.armB, MB, { lift: lift + 7 }); drawP(ctx, PC.corer, MC, { lift: lift + 7 });
    splitPin(ctx, MA, 0, 0, 7); splitPin(ctx, MB, 0, 0, 6.5); splitPin(ctx, MC, 0, 0, 5.5);
    return MC;
  }
  return null;
}
function mmxArm(t, low) {
  let arm = null, drill = 0;
  if (t > 19.95 && t < 26.4) {
    const dep = E.outBack(inv(20.14, 20.6, q2(t))), st = E.io(inv(25.6, 26.3, t));
    const A = low ? [0.15, 1.2] : [0.55, 0.9];
    arm = [lerp(-1.75, A[0], dep * (1 - st)), lerp(2.9, A[1], dep * (1 - st))];
    if (t > 21.0 && t < 21.8) drill = Math.sin(G.step * 2.1) * 0.08;
  }
  return { arm, drill };
}
// ---------- the low-angle set for "Coring arm, nitrogen blaster": a ground row of Pho's head rises from below,
// a sky flat with Mars drops from above, MMX looms over the camera and Pho's eyes peek up from the bottom edge ----------
function shotLow(ctx, t) {
  const tq = q2(t);
  const sIn = E.outBack(inv(20.96, 21.14, tq)), gIn = E.outBack(inv(20.98, 21.16, tq));
  const out = E.in2(inv(22.18, 22.4, tq));
  const skyY = -(1 - sIn) * 2100 - out * 2200, gY = (1 - gIn) * 1250 + out * 1400;
  if (skyY <= -2090 && gY >= 1240) return;
  const k = 1 + 0.06 * inv(21.0, 22.2, t);
  const [shx, shy] = shake(t);
  const V = mmul(mT(540 + shx * 2, 960 + shy * 2), mmul(mR(-0.035 + 0.02 * inv(21.7, 21.95, t)), mmul(mS(k), mT(-540, -960))));
  G.light = { mode: 'dir', dx: 0.55, dy: 0.85, k: 1.05, a: 0.55 };
  const MS = mmul(mT(0, skyY), V);
  ctx.setTransform(...mmul(MS, mT(540 - BACK.w / 2, 960 - BACK.h / 2 - 300))); ctx.globalAlpha = 1; ctx.drawImage(BACK.c, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, skyY + 2560, W, 30);
  drawMars(ctx, mPlace(MS, 230, 430, 0.3 + t * 0.006, 0.95));
  const MG = mmul(mT(0, gY), V);
  drawP(ctx, PC.ground, MG, { lift: 40 });
  // Pho's eyes peek up over the bottom edge (the ground row is the top of his head)
  const st = phoAt([[0, 'glare', 'rest'], [21.38, 'wince', 'rest'], [21.52, 'glare', 'rest'], [21.78, 'alarmed', 'rest'], [22.04, 'glare', 'rest']], tq);
  const look = tq < 21.78 ? [0.85 + (h2(G.step, 9) - 0.5) * 0.1, -0.15] : [-0.75, -1];
  drawPho(ctx, mPlace(MG, 588, 1856, 0.02, 2.4), st, { faceOnly: true, look, lift: 0 });
  // the lookout watches from the left
  drawRover(ctx, mPlace(MG, 112, 874, -0.06, 1.9), { lift: 14 });
  // MMX, legs on the ground row
  const Mm = mPlace(MG, 500, 597, 0, 2.2);
  const { arm, drill } = mmxArm(t, true);
  const MC = drawMMX(ctx, Mm, { arm, drill, lift: 22 });
  if (MC) {
    const [bx, by] = mApply(MC, 0, 40);
    drawP(ctx, PC.mound, mPlace(MI, bx, by + 6, 0, 1 + 0.25 * inv(21.0, 21.8, tq)), { lift: 6 });
    coringFx(ctx, MC, Mm, t, 2.2);
  }
  if (t > 21.7) gasFx(ctx, Mm, t, 1.9);
}
function drawFlame(ctx, M, k, seed) {
  if (k <= 0) return;
  const i = Math.floor(h2(G.step, seed + 3) * 6);
  const L = PC.flame[i];
  const fl = 0.9 + 0.2 * h2(G.step, seed + 9);
  drawP(ctx, L[0], mPlace(M, 0, 0, 0, k * 1.0, k * fl * 1.1), { lift: 0 });
  drawP(ctx, L[1], mPlace(M, 0, 0, 0, k * 1.0, k * fl), { lift: 0 });
  drawP(ctx, L[2], mPlace(M, 0, 0, 0, k, k * fl), { lift: 0 });
  // warm practical light around the flame
  const [x, y] = mApply(M, 0, 60 * k);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  const r = 260 * k * mScale(M);
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,170,70,${0.32 * Math.min(1, k)})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over';
}
function drawRover(ctx, M, o = {}) {
  const lift = o.lift ?? 10, spin = o.spin ?? 0;
  drawP(ctx, PC.rovMast, mPlace(M, 34, -24), { lift });
  drawP(ctx, PC.rovPanel, mPlace(M, 0, -32), { lift: lift + 1 });
  drawP(ctx, PC.rovBody, M, { lift: lift + 1 });
  for (const x of [-40, 40]) { const MW = mPlace(M, x, 24, spin); drawP(ctx, PC.wheel, MW, { lift: lift + 2 }); splitPin(ctx, MW, 0, 0, 5, -spin); }
}

// rover track in the Pho set (world coords at d=1)
function roverPlace(t, mmx) {
  const k = (mmx[2] ?? 0.88) / 0.88;
  if (t < 11.74) return { x: mmx[0] + 20 * k, y: mmx[1] + 210 * k, rot: Math.sin(t * 2.2) * 0.06, hang: true, spin: 0, s: 1.15 * k };
  const y0 = mmx[1] + 210, yL = 708;
  if (t < 13.18) { const u = inv(11.74, 13.18, t); return { x: mmx[0] + 20 + u * 40, y: lerp(y0, yL, E.in2(u)), rot: u * 0.5, hang: false, spin: 0 }; }
  // bounces in low gravity, then rights itself
  const b = t - 13.18;
  let y = yL, rot = 0.5 * Math.exp(-b * 3) * Math.cos(b * 7);
  if (b < 0.62) y = yL - Math.sin(Math.PI * b / 0.62) * 70; else if (b < 1.0) y = yL - Math.sin(Math.PI * (b - 0.62) / 0.38) * 18;
  let x = 600;
  if (t > 16.4 && t < 17.9) { const u = inv(16.4, 17.9, t); y = yL - Math.sin(Math.PI * u) * 85; rot = Math.sin(Math.PI * u) * -0.12; }
  let spin = 0;
  if (t > 18.95) { const u = E.io(inv(18.95, 19.7, t)); x = lerp(600, 380, u); y = yL + 26 * u; rot = -0.12 * u; spin = -u * 9; }
  return { x, y, rot, hang: false, spin };
}
function mmxPlace(t) {
  // world position of MMX body center (d = 1)
  if (t < 7.3) return null;
  if (t < 10.4) { const u = E.out(inv(7.55, 9.3, t)); const P = quadLine([1320, 240], [840, 330], [640, 520], 60)[Math.round(u * 60)]; return [P[0], P[1] + Math.sin(t * 1.5) * 6, 0.42, -0.22 * (1 - u)]; }
  if (t < 11.0) { const u = E.io(inv(10.4, 11.0, t)); return [lerp(640, 540, u), lerp(526, 330, u), lerp(0.42, 0.88, u), 0]; }
  if (t < 19.0) return [540 + Math.sin(t * 1.3) * 8, 330 + Math.sin(t * 1.9) * 6 - (t > 11.74 && t < 12.3 ? (1 - inv(11.74, 12.3, t)) * -10 : 0), 0.88, Math.sin(t * 1.1) * 0.02];
  if (t < 26.73) { const u = inv(19.0, 19.9, t); return [lerp(540, 600, E.io(u)), lerp(330, 652, E.in2(u)) + (t > 19.9 ? -wobble(t - 19.9, 3, 6) * 6 : 0), 0.88, 0]; }
  const u = t - 26.73; return [600, 652 - 260 * u * u - 40 * u, 0.88, -0.05 * u];
}

function shotSpace(ctx, t) {
  const cam = spaceCam(t);
  // light: sun from the upper left, drifting; the MMX burn throws a point light
  G.light = { mode: 'dir', dx: 0.62 + 0.15 * Math.sin(t * 0.21), dy: 0.78, k: 0.95, a: 0.5 };
  drawBackdrop(ctx, cam);
  const MN = camM(cam, 3.2);
  drawP(ctx, PC.neb1, mPlace(MN, 560, 330, 0.2), { lift: 28 });
  drawP(ctx, PC.neb2, mPlace(MN, 300, 1560, -0.3), { lift: 28 });
  const M1 = camM(cam, 1), MM = camM(cam, 1.8), MMp = camM(cam, 2.4);
  // paper stars hanging in the hook
  if (t < 3.6) {
    const yk = t > 3.25 ? E.in2(inv(3.25, 3.55, q2(t))) * -900 : 0;
    const Ms = camM(cam, 1.4);
    [[150, 350, 0], [930, 520, 1], [790, 230, 2]].forEach(([x, y, i]) => {
      const a = Math.sin(t * 1.3 + i * 2) * 0.12;
      const [ax, ay] = mApply(Ms, x, -200 + yk), [bx, by] = mApply(Ms, x + Math.sin(a) * 30, y + yk);
      thread(ctx, ax, ay, bx, by - 26, {});
      drawP(ctx, PC.pstar[i], mPlace(Ms, x + Math.sin(a) * 30, y + yk, a * 2), { lift: 18 });
    });
  }
  // Mars
  const mp = marsPlace(t);
  const pp = phoPlace(t);
  if (mp) drawMars(ctx, mPlace(t >= 10.4 ? MMp : MM, mp[0], mp[1], mp[3], mp[2]));
  // the photo card ("target"), on a thread
  // the card only enters after the two "heist" impact frames (f147-148), so the real photo is never two-toned
  if (t > 4.96 && t < 7.5) {
    const drop = inv(4.97, 5.22, q2(t)), up = inv(7.12, 7.45, q2(t));
    const len = lerp(-200, 420, E.outBack(drop)) - E.in2(up) * 1200;
    const ang = swing(t, 5.3, 0.2, 0.8, 1.2) + 0.03 * Math.sin(t * 1.4);
    const [ax, ay] = mApply(M1, 345, -40);
    const bx = ax + Math.sin(ang) * len, by = ay + Math.cos(ang) * len;
    thread(ctx, ax, ay, bx, by + 6, { w: 1.8 });
    const Mc = mPlace(MI, bx, by, -ang * 0.8 - 0.02, 1.08);
    drawP(ctx, PC.card, Mc, { lift: 26 });
    splitPin(ctx, Mc, 0, 14, 9);
    const tab = inv(5.37, 5.47, q2(t));
    if (tab > 0) drawP(ctx, PC.targetTab, mPlace(Mc, 150, 40, 0.32, tab < 1 ? 1.25 : 1), { lift: tab < 1 ? 26 : 8 });
  }
  // calendar
  if (t > 7.8 && t < 10.75) drawCalendar(ctx, t);
  // MMX + rover + Pho (depth order: Pho behind MMX while it hovers)
  const mm = mmxPlace(t);
  if (pp) {
    const [x, y, s, r] = pp;
    const base = mPlace(M1, x, y, r, s);
    const st = phoAt(PHO_KEYS, q2(t));
    const o = phoFx(t, st);
    drawPho(ctx, base, st, o);
  }
  if (mm) {
    const [x, y, s, r] = mm;
    const Mm = mPlace(M1, x, y, r, s);
    const { arm, drill } = mmxArm(t);
    const flame = t > 26.73 ? clamp((t - 26.73) * 5) * (1 + 0.12 * Math.sin(G.step * 3)) : 0;
    if (flame > 0) G.light = { mode: 'point', ...{ px: 0, py: 0 }, k: 1.4, a: 0.62 };
    if (flame > 0) { const [fx, fy] = mApply(Mm, 0, 120); G.light.px = fx; G.light.py = fy; }
    // rover (behind MMX)
    if (t > 7.5) {
      const rv = roverPlace(t, [x, y, s]);
      const Mr = mPlace(M1, rv.x, rv.y, rv.rot, rv.s ?? 1.15);
      if (rv.hang) { const [ax, ay] = mApply(Mm, 20, 60), [bx, by] = mApply(Mr, 0, -50); thread(ctx, ax, ay, bx, by, { w: 2 }); }
      drawRover(ctx, Mr, { spin: rv.spin });
      // luggage tag: 25 kg, flips to 15 g
      if (t > 13.3 && t < 19.3) drawLuggage(ctx, Mr, t);
    }
    const MC = drawMMX(ctx, Mm, { arm, drill, flame, fold: 0 });
    if (MC) coringFx(ctx, MC, Mm, t);
    if (t > 21.7 && t < 23.4) gasFx(ctx, Mm, t);
  } else if (t > 10.4) {
    const rv = roverPlace(t, [540, 330]);
    drawRover(ctx, mPlace(M1, rv.x, rv.y, rv.rot, 1.15), { spin: rv.spin });
    if (t > 13.3) drawLuggage(ctx, mPlace(M1, rv.x, rv.y, rv.rot, 1.15), t);
  }
  shotLow(ctx, t);
  // sound words cut from paper scraps
  sfxWord(ctx, TAGS.sfx.bonk, 13.2, 0.75, 760, 600, -0.12, 1.0);
  sfxWord(ctx, TAGS.sfx.thunk, 19.9, 0.2, 720, 470, 0.1, 1.05);
  sfxWord(ctx, TAGS.sfx.fsss, 21.78, 0.55, 300, 700, -0.12, 1.05);
  // Night Shift narrator puppet (hook), then the heist planner raising each STEP card
  if (t < 3.6) drawHookCat(ctx, t);
  for (let k = 0; k < STEP_BEATS.length; k++) { const B = STEP_BEATS[k]; if (t >= stepRise(k) - 0.02 && t < B.pin + 0.45) drawStepCat(ctx, k, t); }
  // fact tags
  if (t > 1.9 && t < 3.5) { const u = inv(1.92, 2.15, q2(t)), up = inv(3.22, 3.45, q2(t)); hang(ctx, TAGS.hook, 560, -10, lerp(120, 270, E.outBack(u)) - E.in2(up) * 600, swing(t, 2.15, 0.12, 0.9, 1.5), 1.0); }
  if (t > 12.0 && t < 15.0) { const u = inv(12.0, 12.25, q2(t)), up = inv(14.6, 14.9, q2(t)); hang(ctx, TAGS.drop, 312, -10, lerp(100, 505, E.outBack(u)) - E.in2(up) * 800, swing(t, 12.25, 0.16, 0.9, 1.5), 1.0); }
  if (t > 21.0 && t < 23.0) { const u = inv(21.0, 21.25, q2(t)), up = inv(22.7, 22.95, q2(t)); hang(ctx, TAGS.corer, 655, -10, lerp(100, 330, E.outBack(u)) - E.in2(up) * 700, swing(t, 21.25, 0.18, 0.9, 1.5), 1.0); }
  // "Target: at least 10 grams": Night Shift holds up the sample jar, Pho glares at him
  if (t > 22.8 && t < 25.44) drawJarCat(ctx, cam, t);
}

// NASA's either/or as a placard that rises on a stick at the lower right
function drawFate(ctx, t) {
  const tq = q2(t);
  const u = E.outBack(inv(2.08, 2.34, tq)), dn = E.in2(inv(3.2, 3.42, tq));
  const x = 720 + Math.sin(tq * 2.1) * 4, y = 1040 + (1 - u) * 900 + dn * 900;
  const r = -0.035 + swing(t, 2.34, 0.05, 1.2, 2) + Math.sin(tq * 1.7) * 0.01;
  const M = mPlace(MI, x, y, r, 1.0);
  drawP(ctx, PC.fateStick, mPlace(M, 0, 100), { lift: 14 });
  drawP(ctx, TAGS.fate, M, { lift: 18 });
  splitPin(ctx, M, 0, 100, 7);
}
// a paper sound word that slaps on at t0 and is pulled away after dur
function sfxWord(ctx, P, t0, dur, x, y, rot, sc) {
  const tq = q2(G.t), a = tq - t0;
  if (a < 0 || a > dur + 0.2) return;
  const st = Math.floor(a * FPS / 2);
  const k = [1.35, 1.1, 0.97, 1.02, 1][Math.min(4, st)];
  const out = E.in2(inv(dur, dur + 0.2, a));
  drawP(ctx, P, mPlace(MI, x, y - out * 300, rot + (st < 2 ? 0.08 : 0) + out * 0.6, sc * k * (1 - out * 0.4)), { lift: 20 + (k - 1) * 90 });
}
// ---------- Night Shift, the heist planner: raises each STEP card, then pins it to the corner ----------
function stepRise(k) { return k === 3 ? 25.42 : STEP_BEATS[k].ts - 0.26; }
function stepCatPose(k, t) {
  const B = STEP_BEATS[k], tq = q2(t);
  const side = [0, 1, 1, 0][k]; // 0: cat at the lower left (holds with his right arm), 1: lower right (left arm)
  const x = side ? 874 : 204;
  const rise = E.outBack(inv(stepRise(k), stepRise(k) + 0.24, tq));
  const duck = E.in2(inv(B.pin + 0.08, B.pin + 0.4, tq));
  const base = mPlace(MI, x, 1222 + (1 - rise) * 780 + duck * 880, side ? -0.05 : 0.05, 0.62);
  const holdSide = side ? 0 : 1, sg = holdSide ? -1 : 1;
  const th = E.out(inv(B.pin - 0.04, B.pin + 0.1, tq));
  const hold = [sg * 2.7, sg * 0.24 + Math.sin(tq * 5) * 0.03];
  const toss = side ? [2.0, 0.7] : [-3.5, -0.35];
  const arm = [lerp(hold[0], toss[0], th), lerp(hold[1], toss[1], th)];
  const free = side ? [-0.25, -0.5] : [0.25, 0.5];
  const lookUp = tq < B.ts + 0.35;
  const st = {
    stick: true, mouth: talkOpen(tq), look: lookUp ? [side ? -0.6 : 0.6, -0.9] : [side ? -0.9 : 0.9, -0.35],
    head: (side ? -1 : 1) * (lookUp ? 0.1 : 0.04), browUp: tq < B.ts + 0.6 ? 1 : 0, browTilt: lookUp ? 0 : 0.12, ear: tq > B.ts && tq < B.ts + 0.3 ? 1 : 0,
  };
  if (holdSide) { st.armR = arm; st.armL = free; } else { st.armL = arm; st.armR = free; }
  return { base, st, holdSide, side, arm };
}
function stepCardHeld(k, t) {
  const P = stepCatPose(k, t);
  const M = catBodyM(P.base, P.st, t);
  const [px, py] = mApply(catForearmM(M, P.holdSide, P.arm), 0, 100);
  const B = STEP_BEATS[k], tq = q2(t);
  const pa = Math.floor((tq - B.ts) * FPS / 2);
  const pop = tq < B.ts ? 1 : [1.16, 1.06, 1][Math.min(2, pa)];
  const sc = 1.36 * pop;
  const ext = k === 0 ? 0 : 110;
  return { x: px + (P.side ? -46 : 46), y: py - 122 - ext - 40 * (sc - 1.36), s: sc, r: (P.side ? 0.05 : -0.05) + Math.sin(q2(t) * 3.3) * 0.015, px, py, ext };
}
function drawStepCat(ctx, k, t) {
  const P = stepCatPose(k, t);
  const M = drawCat(ctx, P.base, P.st);
  if (t < STEP_BEATS[k].pin) {
    const C = stepCardHeld(k, t);
    const MC = mPlace(MI, C.x, C.y, C.r, C.s);
    const [hx, hy] = mApply(MC, P.side ? 40 : -40, 40);
    drawP(ctx, C.ext ? PC.cardHandleL : PC.cardHandle, mPlace(MI, hx, hy, Math.atan2(C.px - hx, hy - C.py) * -1, 1), { lift: 14 });
    drawP(ctx, UI.steps[k], MC, { lift: 18 });
    catRedrawForearm(ctx, catForearmM(M, P.holdSide, P.arm));
  }
}
// the jar beat: he rises with the sample jar, the lofted grains fly into it, the label slaps on "10"
function drawJarCat(ctx, cam, t) {
  const tq = q2(t);
  const rise = E.outBack(inv(22.82, 23.08, tq)), duck = E.in2(inv(25.22, 25.42, tq));
  const lift = E.outBack(inv(24.1, 24.3, tq)) * 0.12;
  const base = mPlace(MI, 186, 1214 + (1 - rise) * 800 + duck * 880, 0.04, 0.7);
  const arm = [-2.15 - lift, -0.62 + Math.sin(tq * 4) * 0.03];
  const st = { stick: true, mouth: talkOpen(tq), look: tq < 23.5 ? [0.7, -0.8] : [0.95, -0.3], head: 0.08, armR: arm, armL: [0.3, 0.9], browTilt: 0.18, browUp: tq > 24.1 && tq < 24.6 ? 1 : 0 };
  const M = drawCat(ctx, base, st);
  const MF = catForearmM(M, 1, arm);
  const [px, py] = mApply(MF, 0, 100);
  const JM = mPlace(MI, px + 74, py - 118, 0.07 + Math.sin(tq * 2.3) * 0.02, 1.3);
  // grains lofted by the nitrogen burst arc into the jar's mouth
  const cm = camM(cam, 1);
  const [sx, sy] = mApply(cm, 508, 765);
  const [mx, my] = mApply(JM, 0, -120);
  let arrived = 0;
  for (let k = 0; k < 14; k++) {
    const t0 = 23.2 + k * 0.07, u = (tq - t0) / 0.42;
    if (u >= 1) { arrived++; continue; }
    if (u <= 0) continue;
    const gx = lerp(sx, mx, u) + Math.sin(k * 2.1) * 18 * (1 - u), gy = lerp(sy, my, u) - Math.sin(Math.PI * u) * 260;
    drawP(ctx, PC.grain[k % 6], mPlace(MI, gx, gy, u * 7 + k, 1.4), { lift: 16 });
  }
  drawJarAt(ctx, JM, Math.round(arrived * 34 / 14), inv(24.1, 24.25, tq));
  catRedrawForearm(ctx, MF);
}

function phoFx(t, st) {
  const o = { fx: {}, look: [0, 0] };
  const tq = q2(t);
  // gaze
  const looks = [[0, [0.1, 0.1]], [0.36, [0.85, 0.35]], [1.05, [0.1, 0.05]], [1.82, [0.45, 0.95]], [2.55, [0.2, 0.7]], [3.05, [0.1, 0.4]],
    [5.2, [-0.95, -0.15]], [5.58, [-0.2, 0.05]], [6.25, [0.05, -1]], [6.95, [-0.6, 0.1]], [7.6, [-0.95, 0.55]], [8.4, [-0.8, -0.6]], [8.9, [-0.9, -0.3]], [9.3, [-0.2, 0.1]],
    [10.7, [0.95, 0.6]], [11.66, [0.2, -1]], [12.48, [0.35, -0.9]], [13.2, [0, 0]], [13.75, [0.55, -1]], [14.86, [0.5, -1]], [16.1, [0.0, 0.0]], [16.5, [0.55, -0.4]], [17.6, [0.1, 0.1]],
    [18.95, [0.95, 0.6]], [19.6, [0.25, -1]], [19.9, [0, -0.2]], [20.14, [0.42, -1]], [20.98, [0.7, -0.6]], [21.76, [-0.7, -0.7]], [22.2, [0.2, 0.1]], [22.88, [-0.9, -0.1]], [24.1, [-0.8, -0.45]], [24.55, [-0.9, 0.0]],
    [25.55, [-0.95, 0.5]], [26.55, [0.3, -1]], [26.72, [0.2, -0.6]], [27.05, [0.2, -1]]];
  let lk = looks[0][1]; for (const [a, v] of looks) if (tq >= a) lk = v;
  o.look = lk;
  // the push into his eye on "grab": the pupil trembles on twos
  if (tq >= 20.14 && tq < 20.98) o.look = [lk[0] + (h2(G.step, 3) - 0.5) * 0.14, lk[1] + (h2(G.step, 5) - 0.5) * 0.1];
  // grumbling mouth in the opening (stop-motion replacement mouths)
  if (tq < 0.36) o.mouth = Math.floor(tq * 7.5) % 2 ? 'mutter' : 'grump';
  if (tq > 7.6 && tq < 9.3 && Math.floor(tq * 5) % 3 === 0) o.mouth = 'mutter2';
  if (tq > 23.2 && tq < 25.4 && Math.floor(tq * 4) % 4 === 1) o.mouth = 'mutter';
  if (tq > 27.05) o.mouth = Math.floor(tq * 7.5) % 2 ? 'shout' : 'ow';
  // fx
  o.fx.shock = (tq > 1.82 && tq < 2.4) ? 1 : 0;
  o.fx.sweat = tq > 2.55 && tq < 3.3 ? inv(2.55, 3.3, tq) : (tq > 12.48 && tq < 13.2 ? inv(12.48, 13.2, tq) : (tq > 20.2 && tq < 20.98 ? inv(20.2, 20.98, tq) : 0));
  o.fx.vein = (tq > 5.58 && tq < 6.25) || (tq > 6.95 && tq < 7.4) || (tq > 22.2 && tq < 22.88) || tq > 27.05 ? 1 : 0;
  o.fx.shock2 = (tq > 5.58 && tq < 5.95) || (tq > 20.98 && tq < 21.4) ? 1 : 0;
  if (tq > 24.1 && tq < 24.5) o.fx.vein = 1;
  o.fx.grawlix = (tq > 22.25 && tq < 22.88) ? 1 : (tq > 27.1 ? 1 : 0);
  if (tq > 27.1) { o.fx.gx = -250; o.fx.gy = -300; }
  o.fx.cut = tq > 6.27 && tq < 7.3 ? inv(6.27, 6.75, tq) : 0;
  o.fx.snip = tq;
  o.bandaid = tq > 22.88 && tq < 40;
  // squash on impacts
  const imp = (t0) => (tq >= t0 && tq < t0 + 0.4 ? wobble(tq - t0, 3.2, 7) * 0.09 : 0);
  o.squash = imp(13.2) + imp(19.9) + (tq > 26.73 && tq < 27.1 ? 0.05 : 0);
  if (tq > 27.05) o.armWave = Math.sin(tq * 26) * 0.35;
  if (tq > 16.1 && tq < 16.5) o.browAsym = 2.2;
  o.browWig = (tq > 0 && tq < 0.36) ? Math.sin(tq * 30) * 0.04 : 0;
  return o;
}

function drawHookCat(ctx, t) {
  const tq = q2(t);
  const down = E.in2(inv(3.22, 3.5, tq));
  const rise = 1 - E.outBack(inv(-0.2, 0.3, tq));
  const base = mPlace(MI, 196, 1152 + down * 700 + rise * 500, 0.04, 0.72);
  const pointing = tq > 0.2 && tq < 1.75;
  const st = {
    stick: true, mouth: talkOpen(tq, 0, 9), look: tq < 1.75 ? [0.8, -0.5] : [0.6, 0.8],
    head: tq < 1.75 ? 0.12 : -0.08, armR: pointing ? [-2.45 + Math.sin(tq * 9) * 0.03, 0.3] : [-0.15, -0.1], armL: tq > 1.8 ? [0.9, 1.6] : [0.2, 0.1],
    browUp: tq > 1.8 ? 1 : 0, ear: tq > 1.8 ? 1 : 0,
  };
  const M = drawCat(ctx, base, st);
  if (pointing) {
    // a pointer stick in his raised paw, tapping Pho on "This moon"
    const MU = mPlace(M, 104, -222, st.armR[0]), MF = mPlace(MU, 0, 92, st.armR[1]);
    const tap = tq > 0.3 && tq < 0.5 ? 40 : 0;
    const [px, py] = mApply(MF, 0, 100);
    const tip = mApply(MF, 0, 100 + 300 + tap);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'rgba(20,10,20,0.35)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px + 7, py + 9); ctx.lineTo(tip[0] + 7, tip[1] + 9); ctx.stroke();
    ctx.strokeStyle = MP(ctx, 'wood', 3); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    ctx.fillStyle = MP(ctx, 'red', 3); ctx.beginPath(); ctx.arc(tip[0], tip[1], 9, 0, TAU); ctx.fill();
    drawP(ctx, PC.catSleeveF, MF, { lift: 11 }); splitPin(ctx, MF, 0, 0, 6.5);
  }
}

function drawCalendar(ctx, t) {
  const tq = q2(t);
  const drop = E.outBack(inv(7.85, 8.15, tq)), up = E.in2(inv(10.45, 10.72, tq));
  const ax = 250, ay = 10;
  const len = lerp(-300, 452, drop) - up * 900;
  const ang = swing(t, 8.15, 0.12, 0.9, 1.4);
  const bx = ax + Math.sin(ang) * len, by = ay + Math.cos(ang) * len;
  thread(ctx, ax, ay, bx, by + 6, { w: 2 });
  const M = mPlace(MI, bx, by, -ang * 0.8, 0.95);
  drawP(ctx, PC.calBack, M, { lift: 22 });
  splitPin(ctx, M, 0, -6, 9);
  // pages: flip one every 2 frames from 8.12 s, landing on AUG at "August" (8.79 s)
  const f = frameOf(t), f0 = frameOf(8.79) - 20;
  const shown = clamp(Math.floor((f - f0) / 2), 0, 10);
  for (let i = 10; i >= shown; i--) {
    if (i < shown) continue;
    drawP(ctx, PC.calPages[i], mPlace(M, 0, 8), { lift: i === shown ? 4 : 1 });
  }
  // the page just torn off flies away
  if (shown > 0 && f - f0 - (shown - 1) * 2 < 6 && f >= f0) {
    const age = (f - f0) - (shown - 1) * 2;
    const k = age / 6;
    drawP(ctx, PC.calPages[shown - 1], mPlace(M, 40 + k * 260, 8 - k * 260, k * 1.2, 1, Math.cos(k * Math.PI * 0.8)), { lift: 20 });
  }
  // rings
  for (let k = -3; k <= 3; k++) splitPin(ctx, M, k * 32, 4, 5.5);
}
function drawLuggage(ctx, Mr, t) {
  const tq = q2(t);
  const pop = inv(13.48, 13.6, tq);
  const flip = inv(16.42, 16.62, tq); // 25 kg -> 15 g at "15"
  const ang = swing(t, 13.3, 0.35, 1.1, 1.0) + swing(t, 16.4, 0.25, 1.2, 1.2) + 0.15;
  const [ax, ay] = mApply(Mr, 34, -66);
  const len = 46;
  const bx = ax + Math.sin(ang) * len + 0, by = ay + Math.cos(ang) * len;
  const sx = Math.cos(flip * Math.PI);
  const P = sx >= 0 ? PC.lugFront : PC.lugBack;
  // the tag grows with the camera push and pops a little bigger when it flips to 15 g
  const flipPop = flip > 0 ? 1 + 0.18 * E.outBack(inv(16.5, 16.7, tq)) : 1;
  const sc = 1.25 * Math.pow(mScale(Mr) / 1.15, 0.6) * flipPop * (pop < 1 ? 0.6 + pop * 0.5 : 1);
  const off = E.in2(inv(19.0, 19.3, tq));
  if (off <= 0) thread(ctx, ax, ay, bx - 62, by, { w: 1.6 });
  drawP(ctx, P, mPlace(MI, bx - off * 300, by - off * 700, -ang * 0.6 - off * 2, sc * Math.max(0.05, Math.abs(sx)), sc), { lift: 14 + off * 30 });
}
function coringFx(ctx, MC, Mm, t, K = 1) {
  // regolith crumbs spray while coring
  if (t > 21.0 && t < 22.0) {
    const [x, y] = mApply(MC, 0, 46);
    for (let k = 0; k < 8; k++) {
      const s = Math.floor(G.step) + k * 7;
      const age = ((G.step % 6) + k) % 6 / 6;
      const a = -Math.PI / 2 + (h1(k * 3.1 + Math.floor(t * 2)) - 0.5) * 2.2;
      const d = (20 + age * 90) * K;
      drawP(ctx, PC.grain[k % 6], mPlace(MI, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 + age * age * 40 * K, age * 4, K), { lift: 8 });
    }
  }
}
function gasFx(ctx, Mm, t, K = 1) {
  // nitrogen burst at the leg pad: puffs bloom, grains lofted upward
  const t0 = 21.78;
  const age = q2(t) - t0;
  if (age < 0) return;
  const [x, y] = mApply(Mm, -104, 128);
  for (let k = 0; k < 7; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    const g = E.out(clamp(age * 2.4 - k * 0.04));
    const d = (30 + g * 150) * K;
    const fade = 1 - inv(0.9, 1.6, age);
    drawP(ctx, PC.puff[k % 3], mPlace(MI, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55 - g * 20 * K, k, (0.5 + g * 0.9) * K), { lift: 12, alpha: fade });
  }
  for (let k = 0; k < 10; k++) {
    const u = clamp(age * 1.6 - k * 0.05);
    if (u <= 0 || u >= 1) continue;
    const [tx, ty] = mApply(Mm, -30, 20);
    const px = lerp(x, tx, u) + Math.sin(k * 2.3 + u * 6) * 30 * K, py = lerp(y, ty, u) - Math.sin(Math.PI * u) * 120 * K;
    drawP(ctx, PC.grain[k % 6], mPlace(MI, px, py, u * 6 + k, 1.1 * K), { lift: 10 });
  }
}
function drawJarAt(ctx, M, n, slap) {
  drawP(ctx, PC.jarBack, M, { lift: 30, alpha: 0.55, sa: 0.5 });
  const r = mulberry32(31);
  for (let k = 0; k < 34; k++) {
    const gx = (r() - 0.5) * 120, row = Math.floor(k / 7), gy = 92 - row * 13 - r() * 6;
    if (k >= n) continue;
    drawP(ctx, PC.grain[k % 6], mPlace(M, gx, gy, r() * 6, 1.1), { lift: 3 });
  }
  // glass sheen
  ctx.setTransform(...M); ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-64, -96, 12, 170); ctx.fillRect(-44, -96, 5, 120); ctx.globalAlpha = 1;
  drawP(ctx, PC.jarLid, M, { lift: 8 });
  drawP(ctx, PC.jarLabel, mPlace(M, 0, 10, 0.04, slap > 0 && slap < 1 ? 1.25 : 1), { lift: slap > 0 && slap < 1 ? 20 : 4 });
}

// ---------- launch: Tanegashima at night, H3 lifts off, the camera tilts up into space ----------
function shotLaunch(ctx, t) {
  const tq = q2(t);
  const enter = (t0) => E.outBack(inv(t0, t0 + 0.2, tq));
  // rocket altitude and the camera tilt that follows it
  const lt = Math.max(0, t - 4.45);
  const tilt = E.io(inv(4.42, 5.1, t)) * 1700;
  // the rocket stays in frame while the camera follows it, then punches out of the top on "heist"
  const alt = tilt / 1.5 + 430 * E.out(inv(4.38, 4.86, t)) + 1600 * E.in2(inv(4.84, 5.12, t));
  const cam = { x: 0, y: -tilt, push: 0, zoom: 1 };
  G.light = { mode: 'dir', dx: 0.5, dy: 0.7, k: 0.8, a: 0.5 };
  const ign = t > 4.35 ? clamp((t - 4.35) * 6) : 0;
  const M = (d) => camM(cam, d);
  // the night sky flat drops in like a curtain
  const skyY = lerp(-2500, 0, enter(3.25)) + E.in2(inv(4.7, 5.08, tq)) * 2400;
  drawP(ctx, WIPE.sky, mPlace(M(1.6), 0, 1180 + skyY), { lift: 34, jit: 0.5 });
  // flame light (computed early so every layer casts shadows away from it)
  const rocketBase = [560, 1110 - alt];
  const flameScreen = mApply(M(1.5), rocketBase[0], rocketBase[1] + 60);
  if (ign > 0) G.light = { mode: 'point', px: flameScreen[0], py: flameScreen[1], k: 1.3, a: 0.6 };
  drawP(ctx, PC.wave[0], mPlace(M(1.7), 540, 1130 + (1 - enter(3.34)) * 1500), { lift: 16 });
  drawP(ctx, PC.island2, mPlace(M(1.65), 300, 1110 + (1 - enter(3.36)) * 1500), { lift: 18 });
  const MI1 = mPlace(M(1.5), 560, 1150 + (1 - enter(3.38)) * 1900);
  drawP(ctx, PC.island, MI1, { lift: 22 });
  // tower and pad
  drawP(ctx, PC.pad, mPlace(MI1, 0, -40), { lift: 6 });
  drawP(ctx, PC.tower, mPlace(MI1, -110, -40), { lift: 10 });
  // exhaust clouds billow from the pad
  if (ign > 0) {
    const age = t - 4.35;
    for (let k = 0; k < 9; k++) {
      const side = k % 2 ? 1 : -1, g = E.out(clamp(age * 1.4 - k * 0.05));
      drawP(ctx, PC.cloud[k % 5], mPlace(MI1, side * (40 + g * (140 + k * 40)), -40 - g * (10 + k * 14), 0, 0.3 + g * (0.9 + (k % 3) * 0.2)), { lift: 12 });
    }
  }
  // smoke column left behind on the way up (puffs stay where they were made and keep growing)
  for (let k = 0; k < 16; k++) {
    const a = 160 + k * 130;
    if (alt < a) break;
    const g = Math.min(1, (alt - a) / 520);
    drawP(ctx, PC.cloud[k % 5], mPlace(MI1, Math.sin(k * 1.7) * 16 * g, -40 - a + 70, k * 0.9, 0.32 + g * 0.62), { lift: 12 });
  }
  // H3 (stylized illustration)
  const MR = mPlace(MI1, 0, -40 - alt, Math.sin(lt * 3) * 0.01 * Math.min(1, lt), 0.92);
  if (ign > 0) drawFlame(ctx, mPlace(MR, 0, 10), 0.6 + ign * 1.1, 1);
  for (const s of [-1, 1]) { drawP(ctx, PC.h3srb, mPlace(MR, s * 39, -6), { lift: 10 }); drawP(ctx, PC.nozzle, mPlace(MR, s * 39, -8, 0, 0.8), { lift: 8 }); }
  drawP(ctx, PC.nozzle, mPlace(MR, -10, -8), { lift: 8 }); drawP(ctx, PC.nozzle, mPlace(MR, 10, -8), { lift: 8 });
  drawP(ctx, PC.h3core, MR, { lift: 14 });
  // waves in front
  const bob = (k) => Math.sin(tq * 2.2 + k * 1.3) * 8;
  drawP(ctx, PC.wave[1], mPlace(M(1.2), 540 + bob(1), 1170 + bob(2) + (1 - enter(3.38)) * 1500), { lift: 18 });
  drawP(ctx, PC.wave[2], mPlace(M(0.9), 520 + bob(3), 1330 + bob(4) + (1 - enter(3.4)) * 1500), { lift: 22 });
  drawP(ctx, PC.wave[3], mPlace(M(0.68), 560 + bob(5), 1530 + bob(6) + (1 - enter(3.42)) * 1500), { lift: 26 });
  // near clouds the camera rises through
  if (t > 4.45) [[190, -760, 1.6, 0], [900, -1180, 1.8, 1], [430, -1620, 1.5, 2], [820, -2000, 1.7, 3]].forEach(([x, y, sc, k]) => drawP(ctx, PC.cloud[(k + 2) % 5], mPlace(M(0.82), x + Math.sin(tq * 1.3 + k) * 6, y, k * 0.3, sc), { lift: 30 }));
  // ticket: launch time
  if (t > 3.5 && t < 4.95) {
    const u = E.outBack(inv(3.52, 3.72, tq)), o = E.in2(inv(4.7, 4.92, tq));
    drawP(ctx, TAGS.ticket, mPlace(MI, 78 - (1 - u) * 700 - o * 800, 432, -0.02), { lift: 16 });
  }
}

// ---------- Earth: the capsule comes home to Australia ----------
function shotEarth(ctx, t) {
  const tq = q2(t);
  const cam = { x: 0, y: kf(t, [[27.7, -60], [29.3, 0], [30.6, 10], [31.0, 60, 'in2']]), push: kf(t, [[27.7, -0.05], [29.4, 0.05], [30.5, 0.12], [31.0, 0.7, 'in2']]), zoom: 1, cx: 600, cy: 900 };
  G.light = { mode: 'dir', dx: 0.75, dy: 0.55, k: 1, a: 0.5 };
  drawBackdrop(ctx, cam);
  const ME = mPlace(camM(cam, 1.4), 560, 930, -0.08 + t * 0.004, 1.22);
  drawP(ctx, PC.earthOcean, ME, { lift: 34 });
  for (const P of [PC.ng, ...PC.ind, PC.nzn, PC.nzs, PC.tas]) drawP(ctx, P, ME, { lift: 4 });
  drawP(ctx, PC.aus, ME, { lift: 6 });
  PC.swirl.forEach((P, i) => drawP(ctx, P, mPlace(ME, [-250, 260, 20][i], [-300, -60, 330][i], [0.4, 2.2, -0.8][i] + t * 0.02), { lift: 9 }));
  drawP(ctx, PC.earthNight, mPlace(ME, 0, 0, 0.5), { lift: 0, alpha: 0.6, comp: 'multiply' });
  // MMX passes overhead and lets the capsule go
  const M1 = camM(cam, 1);
  const mu = inv(27.85, 29.0, t);
  if (mu > 0 && mu < 1) drawMMX(ctx, mPlace(M1, lerp(1150, -250, mu), lerp(260, 380, mu), -0.15, 0.42), { lift: 18 });
  // capsule: separates at 28.1, streaks in, lands in Australia at "Australia"
  const land = [500, 960];
  const cu = inv(28.15, 29.0, t);
  if (t > 28.1) {
    const p0 = [lerp(1150, -250, inv(27.85, 29.0, 28.15)), 330];
    const x = lerp(p0[0], land[0], E.in2(cu)), y = lerp(p0[1], land[1], E.in2(cu)) - Math.sin(Math.PI * cu) * 60;
    const ang = Math.atan2(land[1] - p0[1], land[0] - p0[0]);
    const MC = mPlace(M1, x, y, cu < 1 ? ang - Math.PI / 2 + 0.2 : 0, cu < 1 ? 0.9 : 0.9);
    if (cu > 0.05 && cu < 1) drawFlame(ctx, mPlace(MC, 0, -40, Math.PI, 1, 1), 0.7 + cu * 0.6, 5);
    if (cu >= 1) {
      const age = t - 29.0;
      for (let k = 0; k < 6; k++) { const g = E.out(clamp(age * 1.6 - k * 0.04)); const side = k % 2 ? 1 : -1; drawP(ctx, PC.cloud[k % 5], mPlace(M1, land[0] + side * g * (60 + k * 18), land[1] + 20 - g * (6 + k * 6), 0, 0.15 + g * 0.35), { lift: 8, alpha: 1 - inv(1.0, 1.7, age) }); }
      const fl = E.outBack(inv(29.5, 29.7, tq));
      if (fl > 0) drawP(ctx, PC.flag, mPlace(M1, land[0] + 70, land[1] + 30, 0.06, fl * 1.25), { lift: 10 });
    }
    drawP(ctx, PC.capsule, MC, { lift: 14 });
  }
}

// ---------- the loot: a pedestal in a spotlight; Pho sulks in a porthole ----------
function shotLoot(ctx, t) {
  const tq = q2(t);
  const cam = { x: 0, y: kf(t, [[30.7, 0], [34.9, -30]]), push: kf(t, [[30.7, 0], [34.9, 0.08]]), zoom: 1 };
  const lightOn = t > 31.6 ? 1 : 0.35;
  G.light = { mode: 'point', px: 540, py: -200, k: 1.1, a: 0.55 };
  const drop = E.outBack(inv(30.72, 30.98, tq));
  drawP(ctx, PC.vaultBack, mPlace(camM(cam, 2.5), 540, 960 - (1 - drop) * 2400), { lift: 30, jit: 0.3 });
  const M1 = camM(cam, 1);
  const rise = E.outBack(inv(30.76, 30.98, tq));
  const MP0 = mPlace(M1, 540, 860 + (1 - rise) * 1400, 0, 1.0);
  // spotlight
  if (t > 31.55) {
    const fl = t < 31.75 ? (Math.floor(G.step) % 2 ? 0.3 : 1) : 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(540, 800, 30, 540, 820, 520); gr.addColorStop(0, `rgba(255,214,140,${0.30 * fl})`); gr.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 200, 1080, 1300);
    ctx.globalCompositeOperation = 'source-over';
    drawP(ctx, PC.spot, mPlace(MI, 540, -60, 0, 1.0, 1.0), { lift: 0, alpha: 0.22 * fl });
  }
  drawP(ctx, PC.pedestal, MP0, { lift: 26 });
  drawP(ctx, PC.plaque, mPlace(MP0, 0, 120), { lift: 5 });
  drawP(ctx, PC.cushion, mPlace(MP0, 0, -18), { lift: 8 });
  // capsule drops onto the cushion; the lid pops at "loot?" and the piece of Phobos rises
  const cd = E.outBack(inv(30.86, 31.08, tq));
  const MC = mPlace(M1, 540, 798 - (1 - cd) * 1500, 0, 1.75); // drops from the fly loft onto the cushion
  const lid = E.outBack(inv(31.28, 31.5, tq));
  const rock = E.outBack(inv(31.45, 31.75, tq));
  drawP(ctx, PC.capsule, MC, { lift: 14 });
  // the sample jar from step three rises out of the capsule into the spotlight
  if (rock > 0) drawJarAt(ctx, mPlace(MC, 0, -30 - rock * 132, Math.sin(tq * 2) * 0.05, 0.3 + rock * 0.28), 34, 0);
  drawP(ctx, PC.capLid, mPlace(MC, -lid * 110, -42 - lid * 46, -lid * 2.4), { lift: 10 + lid * 14 });
  if (rock > 0.5 && t > 31.62) {
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + tq * 0.8; const on = h2(G.step, k) > 0.35; if (on) drawP(ctx, PC.pstar[k % 2], mPlace(MC, Math.cos(a) * 92, -170 + Math.sin(a) * 82, a, 0.42), { lift: 10 }); }
  }
  // museum rope in the foreground
  const rr = E.outBack(inv(30.8, 31.02, tq));
  const Mf = camM(cam, 0.8);
  const ry = 1150 + (1 - rr) * 800;
  drawP(ctx, PC.post, mPlace(Mf, 150, ry), { lift: 14 });
  drawP(ctx, PC.post, mPlace(Mf, 930, ry), { lift: 14 });
  const [ax, ay] = mApply(Mf, 150, ry - 150), [bx, by] = mApply(Mf, 930, ry - 150);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(20,10,20,0.35)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(ax + 8, ay + 12); ctx.quadraticCurveTo((ax + bx) / 2 + 8, ay + 150, bx + 8, by + 12); ctx.stroke();
  ctx.strokeStyle = MP(ctx, 'red', 9); ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, ay + 140, bx, by); ctx.stroke();
  // porthole: meanwhile, at Mars, Pho sulks
  const ph = E.outBack(inv(32.9, 33.15, tq));
  if (ph > 0) {
    const cx = 790, cy = 470, R = 150 * ph;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, R * 0.93), 0, TAU); ctx.clip();
    ctx.fillStyle = MP(ctx, 'space0', 3); ctx.fillRect(cx - 200, cy - 200, 400, 400);
    drawMars(ctx, mPlace(MI, cx - 120, cy + 240, 0.3, 0.42 * ph));
    const st = phoAt([[0, 'sulk', 'cross'], [33.66, 'fury', 'fist']], tq);
    drawPho(ctx, mPlace(MI, cx + 10, cy + 10, -0.06, 0.34 * ph), st, { look: tq < 33.66 ? [-0.9, 0.3] : [-0.4, 0.2], bandaid: true, fx: { vein: tq > 33.66 ? 1 : 0 }, armWave: tq > 33.66 ? Math.sin(tq * 26) * 0.35 : 0, mouth: tq > 33.66 ? (Math.floor(tq * 7.5) % 2 ? 'shout' : 'ow') : (Math.floor(tq * 3) % 3 === 0 ? 'mutter' : 'pout'), lift: 14 });
    ctx.restore();
    drawP(ctx, PC.porthole, mPlace(MI, cx, cy, 0, ph), { lift: 16 });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; splitPin(ctx, mPlace(MI, cx, cy, 0, ph), Math.cos(a) * 154, Math.sin(a) * 154, 7); }
  }
}

// ---------- NEXT: Electron at dusk, three satellites on a mobile ----------
function shotNext(ctx, t) {
  const tq = q2(t);
  const cam = { x: kf(t, [[34.7, -20], [38.9, 20]]), y: 0, push: kf(t, [[34.7, 0], [38.9, 0.06]]), zoom: 1 };
  G.light = { mode: 'dir', dx: 0.85, dy: 0.42, k: 1, a: 0.5 };
  const out = (k) => E.in2(inv(38.7 + k * 0.012, 38.98 + k * 0.012, tq)) * 2000;
  PC.dusk.forEach((P, i) => { const d = E.outBack(inv(34.5 + i * 0.03, 34.72 + i * 0.03, tq)); drawP(ctx, P, mPlace(camM(cam, 3.2 - i * 0.3), 540, 760 - (1 - d) * 2400 + out(i)), { lift: 22, jit: 0.5 }); });
  const hills = [[1.8, 1150, 0], [1.4, 1230, 1], [1.05, 1330, 2]];
  hills.forEach(([d, y, i], k) => {
    const r = E.outBack(inv(34.66 + k * 0.04, 34.88 + k * 0.04, tq));
    const Mh = mPlace(camM(cam, d), 540, y + (1 - r) * 900 + out(5 + k));
    if (i === 2) drawP(ctx, PC.wave[2], mPlace(Mh, Math.sin(tq * 2.2) * 8, 40 + Math.sin(tq * 1.7) * 6), { lift: 20 }); else drawP(ctx, PC.hills[i], Mh, { lift: 18 });
    if (i === 1) {
      // pad + Electron (stylized) on the middle hill
      const er = E.outBack(inv(34.84, 35.06, tq));
      const Mp = mPlace(Mh, 230, -118 + (1 - er) * 700);
      drawP(ctx, PC.tower, mPlace(Mp, -64, 0, 0, 1.05), { lift: 10 });
      drawP(ctx, PC.electron, mPlace(Mp, 0, 0, 0, 1.3), { lift: 14 });
      drawP(ctx, PC.pad, mPlace(Mp, 0, 0, 0, 0.7), { lift: 6 });
    }
  });
  // satellites on a mobile above the rocket, dropping in at "three"
  [[600, 0, 300], [700, 1, 350], [800, 2, 290]].forEach(([x, i, L], k) => {
    const d = E.outBack(inv(36.45 + k * 0.07, 36.68 + k * 0.07, tq));
    if (d <= 0) return;
    const ang = swing(t, 36.7 + k * 0.07, 0.22, 0.9, 0.9) + Math.sin(t * 1.4 + k) * 0.05;
    const len = lerp(-100, L, d) - out(10 + k);
    const bx = x + Math.sin(ang) * len, by = -20 + Math.cos(ang) * len;
    thread(ctx, x, -20, bx, by - 14);
    drawP(ctx, PC.sat[i], mPlace(MI, bx, by, Math.sin(t * 1.7 + k) * 0.25, 1.45), { lift: 16 });
  });
  // NEXT sign on two threads
  const ns = E.outBack(inv(34.72, 34.9, tq));
  const sy = lerp(-200, 452, ns) - out(15);
  const sa = swing(t, 34.9, 0.08, 1.1, 1.4);
  thread(ctx, 180, -20, 180 + sa * 60, sy - 52); thread(ctx, 420, -20, 420 + sa * 60, sy - 52);
  drawP(ctx, PC.nextSign, mPlace(MI, 300 + sa * 60, sy, sa * 0.3, 1.0), { lift: 18 });
  // date tag at "Wednesday"
  // the date tag drops in with the NEXT sign, landing on "Next:"
  const dt = E.outBack(inv(34.74, 34.92, tq));
  const slam = tq >= 38.03 && tq < 38.17 ? 1 : 0;
  if (dt > 0) drawP(ctx, PC.dateTag, mPlace(MI, 290, 690 - (1 - dt) * 1000 + out(16), -0.05 + swing(t, 34.92, 0.07, 1.2, 2) + swing(t, 38.03, 0.08, 1.4, 2), (dt < 1 ? 1.2 : 1.1) * (1 + slam * 0.12)), { lift: dt < 1 || slam ? 26 : 16 });
  // Night Shift points at the rocket
  const cu = E.outBack(inv(34.98, 35.22, tq)), cd = out(17);
  const base = mPlace(MI, 190, 1176 + (1 - cu) * 1000 + cd, 0.03, 0.66);
  const pointing = tq > 35.3 && tq < 38.0;
  drawCat(ctx, base, { stick: true, mouth: talkOpen(tq, 75, 85), look: pointing ? [0.9, -0.4] : [0.5, -0.8], head: pointing ? 0.14 : 0.05, armR: pointing ? [-2.15 + Math.sin(tq * 8) * 0.03, -0.25] : [-0.2, -0.3], armL: tq > 38.0 ? [2.3, 0.3] : [0.15, 0.1], browUp: tq > 38 ? 1 : 0 });
}

// ---------- end card: the cut-paper wordmark, Night Shift waves, Pho grudgingly too ----------
function shotEnd(ctx, t) {
  const tq = q2(t);
  G.light = { mode: 'dir', dx: 0.55, dy: 0.8, k: 1, a: 0.55 };
  const thump = (t0, a) => { const d = tq - t0; return d >= 0 && d < 0.5 ? (h2(G.step, t0) - 0.5) * 2 * a * Math.exp(-d * 9) : 0; };
  const cam = { x: thump(40.4, 7) + thump(40.8, 4), y: kf(t, [[38.7, 20], [42, -10]]) + thump(40.41, 9) + thump(40.81, 5), push: kf(t, [[38.7, -0.02], [40.3, 0.02], [40.45, 0.06, 'out'], [42, 0.09]]), zoom: 1 };
  drawBackdrop(ctx, cam);
  drawP(ctx, PC.neb1, mPlace(camM(cam, 3.2), 560, 1500, 0.2), { lift: 28 });
  const M1 = camM(cam, 1);
  // wordmark: echo mark (dot lands on the cue, ring 0.4 s later), DOWNLINK then CAT
  const X0 = 123, Y0 = 640;
  const dotT = 40.4, ringT = dotT + 0.4;
  const land = (t0) => { const a = tq - t0; if (a < 0) return null; const s = Math.floor(a * FPS / 2); return [1.35, 1.12, 0.96, 1.03, 1][Math.min(4, s)]; };
  const dl = land(dotT), rl = land(ringT);
  if (dl) drawP(ctx, PC.dot, mPlace(M1, X0 + 44, Y0 - 175, 0, dl), { lift: 6 + (dl - 1) * 80 });
  if (rl) drawP(ctx, PC.ring, mPlace(M1, X0 + 144, Y0 - 175, 0, rl), { lift: 6 + (rl - 1) * 80 });
  WM.letters.forEach((L, i) => {
    const isCat = L.y > 0;
    const t0 = isCat ? 39.91 + (i - 8) * 0.067 : 39.47 + i * 0.045;
    const a = tq - t0;
    if (a < 0) return;
    const s = Math.floor(a * FPS / 2);
    const k = [0, 1.25, 1.06, 0.98, 1][Math.min(4, s)];
    const dy = [0, -40, -8, 2, 0][Math.min(4, s)];
    drawP(ctx, L.P, mPlace(M1, X0 + L.x, Y0 + L.y + dy, (h1(i * 5.3) - 0.5) * 0.05, k), { lift: 7 + (k - 1) * 60 });
  });
  // hanging paper stars
  [[840, 330, 1, 0], [640, 250, 0, 1], [980, 560, 0, 2]].forEach(([x, y, i, k]) => { const a = Math.sin(t * 1.2 + k * 2) * 0.12 + swing(t, 38.9 + k * 0.1, 0.3, 1, 1.5) + swing(t, 40.4, 0.28, 1.3, 1.6) - swing(t, 40.8, 0.16, 1.4, 1.8); const d = E.outBack(inv(38.85 + k * 0.08, 39.1 + k * 0.08, tq)); const yy = lerp(-200, y, d); const [ax, ay] = mApply(M1, x, -60), [bx, by] = mApply(M1, x + Math.sin(a) * 40, yy); thread(ctx, ax, ay, bx, by - 26); drawP(ctx, PC.pstar[i], mPlace(M1, x + Math.sin(a) * 40, yy, a * 2, 1.3), { lift: 18 }); });
  // Night Shift, full body, waving
  const cu = E.outBack(inv(38.95, 39.25, tq));
  const wave = tq > 39.3;
  // on the logo he hops, both arms up, then keeps waving
  const hopU = inv(40.4, 40.72, tq), hop = hopU > 0 && hopU < 1 ? Math.sin(Math.PI * hopU) * 70 : 0, tada = tq >= 40.4 && tq < 40.85;
  drawCat(ctx, mPlace(M1, 790, 1110 + (1 - cu) * 900 - hop, 0, 0.68), { legs: true, mouth: talkOpen(tq, 86, 88), look: tq >= 40.4 && tq < 41.0 ? [-0.9, -0.8] : [-0.4, 0.1], head: -0.06,
    armR: tada ? [-2.7, -0.2] : wave ? [-2.5, -0.5 + Math.sin(tq * 16) * 0.45] : [-0.2, -0.3], armL: tada ? [2.7, 0.2] : [0.12, 0.1], ear: wave ? 0.5 : 0, browUp: tada ? 1 : 0 });
  // Pho pops up grudgingly; the dot slams down beside him, he jumps, eyes the ring, then gives a tiny reluctant wave
  const pu = E.outBack(inv(40.0, 40.3, tq));
  if (pu > 0) {
    const st = phoAt([[0, 'grumpy', 'rest'], [40.4, 'alarmed', 'flail'], [40.82, 'gulp', 'cheeks'], [41.2, 'meh', 'wave']], tq);
    const jU = inv(40.4, 40.74, tq), jump = jU > 0 && jU < 1 ? Math.sin(Math.PI * jU) * 90 : 0;
    const land = (tq >= 40.74 && tq < 41.0 ? wobble(tq - 40.74, 3.2, 7) * 0.1 : 0) + (tq >= 40.0 && tq < 40.3 ? 0 : 0);
    const look = tq < 40.4 ? [0.6, -0.2] : tq < 40.82 ? [-0.55, -1] : tq < 41.2 ? [-0.1, -1] : [0.7, -0.1];
    drawPho(ctx, mPlace(M1, 300, 1000 + (1 - pu) * 600 - jump, -0.05 + (jump ? -0.08 : 0), 0.45), st,
      { look, bandaid: true, squash: land, armWave: tq > 41.2 ? Math.sin(tq * 9) * 0.25 : 0, lift: 20 + jump * 0.3,
        fx: { shock: tq >= 40.4 && tq < 40.7 ? 1 : 0, shock2: tq >= 40.82 && tq < 41.05 ? 1 : 0, sweat: tq > 40.82 && tq < 41.4 ? inv(40.82, 41.4, tq) : 0 },
        mouth: tq >= 41.2 && Math.floor(tq * 3) % 4 === 3 ? 'mutter' : undefined });
  }
}

// torn-paper wipe sheet between scenes: progress 0..1 moves it from below the frame to above it
function drawWipe(ctx, u, rot = -0.06) {
  if (u <= 0 || u >= 1) return;
  const y = lerp(1990, -2300, u);
  G.light = { mode: 'dir', dx: 0.5, dy: -0.9, k: 1, a: 0.6 };
  drawP(ctx, WIPE.sheet, mPlace(MI, 0, y, rot), { lift: 40 });
}
