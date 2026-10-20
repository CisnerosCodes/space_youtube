// Night Shift v3 rig, bundled from lab/mascot/v3 (unmodified): core.mjs f439d0f328, catA.mjs 77cdcabfd8, actor.mjs 5521613974
const M_core = (() => {

// core.mjs (v3): shared math, state, presets and face/limb builders for the Signal Delay cat.
// Pure functions from numbers to SVG strings. No DOM, no randomness, so any frame can be
// re-rendered exactly. Coordinates: origin at the collar (base of the neck), y down, feet on y 540.
// The figure spans roughly x -330..330, y -560..560.
// v3 changes against v2: limbs are numeric specs solved by two-bone IK (arms and legs blend
// smoothly between any two poses), new crouch / squash / lean channels, a thumbs-up paw, props,
// extra faces for the acting library. The eyes, brows, mouth and effects are unchanged from v2.

const PAL = { ink: '#0B0B0C', paper: '#F2EFE8', amber: '#F5B83D', muted: '#8C8A85' };

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}
// Derived tones (only mixes of the four brand colours).
const TONE = {
  earIn: mix(PAL.amber, PAL.ink, 0.56),   // warm dark amber inside the ears
  tongue: mix(PAL.amber, PAL.ink, 0.45),  // a lighter warm tone for the tongue
};

// Line weights used everywhere (in rig units; the full figure is about 1100 units tall).
const LW = { key: 8, rim: 4, line: 7, band: 14 };

let _id = 0;
const uid = (p = 'k') => `${p}${(++_id).toString(36)}`;
const n = (v) => Math.round(v * 10) / 10;
const P = (p) => `${n(p[0])},${n(p[1])}`;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const deg = (r) => (r * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

function rotP([x, y], [cx, cy], d) {
  const a = rad(d), c = Math.cos(a), s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}
function attrs(o) {
  return Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${typeof v === 'number' ? n(v) : v}"`)
    .join(' ');
}
const el = (tag, o = {}, inner = '') => (inner === '' && tag !== 'g' && tag !== 'clipPath'
  ? `<${tag} ${attrs(o)}/>` : `<${tag} ${attrs(o)}>${inner}</${tag}>`);

// Smooth closed/open path through points (Catmull-Rom converted to cubic Bezier).
function smoothPath(pts, closed = false) {
  const N = pts.length, get = (i) => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  let d = `M${P(pts[0])}`;
  const last = closed ? N : N - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return d + (closed ? ' Z' : '');
}

// ---------------------------------------------------------------- state
// v3: every limb is a small object of numbers, so any two poses blend smoothly (no named
// arm presets that snap halfway). Strings (paw type, fx) switch at the halfway point.
//
// Arm spec (one per side, written for the viewer-right arm and mirrored for the viewer-left):
//   a    wrist direction from the shoulder, deg: 0 = straight out, 90 = down, -90 = up, 180 = across
//   r    reach, 0..1 of the full arm length (1 = straight; a little over 1 stretches, cartoon style)
//   b    elbow bend -1..1: + = elbow below / outside the shoulder-wrist line, - = the other side
//   paw  'mitt' | 'open' | 'fist' | 'point' | 'grip' | 'thumb'
//   pa   extra paw rotation, deg (mirrored on the left arm)
//   fr   1 = draw this arm in front of the head (hand on the face, chin, cheeks)
//   tx, ty, tw, th   optional wrist target point (rig units, written for the right side, x mirrored
//        for the left arm); tw 0..1 blends from (a, r) toward the target; th 1 = point in head space
//        (follows tilt and head offset), 0 = body space
// Leg spec: fx, fy = foot offset from its rest spot (rig units, x is NOT mirrored, so both feet can
//   step the same way), b = knee bend outward 0..1, fa = foot rotation deg.
const ARM0 = { a: 88, r: 0.95, b: -0.2, paw: 'mitt', pa: 0, fr: 0, tx: 0, ty: 0, tw: 0, th: 0 };
const LEG0 = { fx: 0, fy: 0, b: 0.35, fa: 0 };
const TAIL0 = { a0: 2, bend: -9, curl: 44, puff: 1, wave: 0, sway: 0 };
const PROPS0 = {
  board: 0, boardDir: 1, thrust: 0,   // thruster skid board under the feet; boardDir = side of the nozzle (-1 left, 1 right)
  jet: 0, flame: 0,                   // jet pack canisters behind the shoulders, flame length 0..1
  card: 0, cardText: '', cardSub: '', // sign on a stick in the right paw (0..1 = pops up)
  cardRot: 0, cardScale: 1.5,         // board rotation (deg, the actor counter-rotates it to stay upright) and size
  scoot: 0,                           // the amber-dot scooter (deck, stem, handlebar, wheel)
};
const DEFAULT = {
  tilt: 0, headDx: 0, headDy: 0,          // head rotation (deg) about the neck top, offset
  earL: 0, earR: 0,                        // ear rotation deg, + = droop outward, - = prick up/in
  earSqL: 1, earSqR: 1,                    // ear height scale (flattened ears < 1)
  lidL: 0, lidR: 0,                        // top lid closure 0..1 (L = solid disc, R = ring)
  lidAL: 0, lidAR: 0,                      // lid slant deg, + = inner corner down (angry), - = outer down (sad)
  lowL: 0, lowR: 0,                        // lower lid rise 0..1 (happy squint)
  eyeScale: 1,
  pupil: 'tall', pw: 1, look: [0, 0], glint: 1,
  browL: { dy: 0, a: 0 }, browR: { dy: 0, a: 0 },
  mouth: { w: 30, sm: 0.35, op: 0, rnd: 0, sk: 0, fang: 0 },
  armL: { ...ARM0 }, armR: { ...ARM0 },
  legL: { ...LEG0 }, legR: { ...LEG0 },
  tail: { ...TAIL0 },
  bodyDy: 0,      // whole figure up/down (feet included): hops, bounces
  crouch: 0,      // hips and everything above them drop toward planted feet (legs bend)
  sq: 0,          // squash (+) / stretch (-) about the feet; volume roughly kept
  lean: 0,        // whole figure rotation about the feet, deg
  shoulderDy: 0,  // shoulders (and arm roots) up (-) or down (+)
  fx: null, fxAmt: 1,
  blink: 0, talk: 0, twitchL: 0, twitchR: 0,
  props: { ...PROPS0 },
};
const NESTED = ['browL', 'browR', 'mouth', 'armL', 'armR', 'legL', 'legR', 'tail', 'props'];
function state(over = {}) {
  const s = { ...DEFAULT, ...over };
  for (const k of NESTED) s[k] = { ...DEFAULT[k], ...(over[k] || {}) };
  s.look = [...(over.look || DEFAULT.look)];
  return s;
}
// Merge partial overrides onto a full state (nested objects merge one level deep).
function merge(base, over = {}) {
  const s = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && NESTED.includes(k)) s[k] = { ...base[k], ...v };
    else if (Array.isArray(v)) s[k] = [...v];
    else s[k] = v;
  }
  return s;
}
// Linear blend between two states (numbers only; strings switch at t = 0.5).
function lerpState(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k], vb = b[k];
    if (va === undefined) { out[k] = vb; continue; }
    if (vb === undefined) { out[k] = va; continue; }
    if (typeof va === 'number' && typeof vb === 'number') out[k] = lerp(va, vb, t);
    else if (Array.isArray(va) && Array.isArray(vb)) out[k] = va.map((v, i) => lerp(v, vb[i], t));
    else if (va && vb && typeof va === 'object' && typeof vb === 'object') out[k] = lerpState(va, vb, t);
    else out[k] = t < 0.5 ? va : vb;
  }
  return out;
}

// ---------------------------------------------------------------- arm and leg presets
const arm = (o) => ({ ...ARM0, ...o });
const sym = (o, l) => ({ armL: arm(l ?? o), armR: arm(o) });
const ARMS = {
  down: sym({}),
  relaxed: sym({ a: 84, r: 0.93, b: -0.3 }),
  up: sym({ a: -58, r: 0.98, b: 0.35, paw: 'open' }),
  cheeks: sym({ a: -64, r: 0.85, b: 0.6, paw: 'open', pa: -18, fr: 1, tx: 216, ty: -146, tw: 1, th: 1 }),
  chin: { armR: arm({ a: -40, r: 0.7, b: 0.9, paw: 'fist', fr: 1, tx: 64, ty: -104, tw: 1, th: 1 }), armL: arm({ a: 86, r: 0.95, b: -0.2 }) },
  hips: sym({ a: 80, r: 0.8, b: -1, paw: 'fist' }),
  hip1: { armL: arm({ a: 80, r: 0.8, b: -1, paw: 'fist' }), armR: arm({ a: 90, r: 0.96, b: -0.15 }) },
  limp: sym({ a: 96, r: 0.95, b: -0.2 }),
  wave: { armR: arm({ a: -60, r: 0.84, b: 0.6, paw: 'open' }), armL: arm({ a: 86, r: 0.95, b: -0.2 }) },
  what: sym({ a: -22, r: 0.86, b: 0.9, paw: 'open', pa: -6 }),
  shrug: sym({ a: 28, r: 0.5, b: 1, paw: 'open', pa: -30 }),
  facepalm: { armR: arm({ a: -70, r: 0.95, b: 0.8, paw: 'mitt', fr: 1, tx: 52, ty: -196, tw: 1, th: 1, pa: 8 }), armL: arm({ a: 80, r: 0.8, b: -1, paw: 'fist' }) },
  thumb: { armR: arm({ a: -38, r: 0.62, b: 1, paw: 'thumb' }), armL: arm({ a: 80, r: 0.8, b: -1, paw: 'fist' }) },
  card: { armR: arm({ a: -46, r: 0.98, b: 0.3, paw: 'fist' }), armL: arm({ a: 80, r: 0.8, b: -1, paw: 'fist' }) },
  balance: sym({ a: -6, r: 0.92, b: 0.6, paw: 'open', pa: -10 }),
  fly: sym({ a: 52, r: 0.96, b: -0.3, paw: 'fist' }),
  grab: { armR: arm({ a: -48, r: 1.1, b: 0.15, paw: 'fist' }), armL: arm({ a: 36, r: 0.9, b: 0.5, paw: 'open' }) },
  starfish: sym({ a: -24, r: 0.98, b: 0.2, paw: 'open' }),
  scoot: sym({ a: 70, r: 0.6, b: -0.7, paw: 'fist', tx: 92, ty: 176, tw: 1, th: 0 }),
  tuck: sym({ a: 50, r: 0.55, b: -0.9, paw: 'fist' }),
  windup: sym({ a: 100, r: 0.95, b: 0.3, paw: 'mitt' }),
  pump: sym({ a: -78, r: 0.96, b: 0.25, paw: 'fist' }),
};
const leg = (o) => ({ ...LEG0, ...o });
const LEGS = {
  stand: { legL: leg({}), legR: leg({}) },
  dangle: { legL: leg({ fy: 16, b: 0.15, fa: 16 }), legR: leg({ fy: 10, b: 0.15, fa: -12 }) },
  tuck: { legL: leg({ fy: -86, b: 1, fa: 10 }), legR: leg({ fy: -86, b: 1, fa: -10 }) },
  spread: { legL: leg({ fx: -64, fy: -24, b: 0.5, fa: 24 }), legR: leg({ fx: 64, fy: -24, b: 0.5, fa: -24 }) },
  wide: { legL: leg({ fx: -26, b: 0.6 }), legR: leg({ fx: 26, b: 0.6 }) },
};

// ---------------------------------------------------------------- expressions
// Neutral plus the six sheet expressions. Each is a full state; `faceOf` keeps only the face part,
// which is what the actor's expression track uses (gestures supply the body).
const EXPR = {
  neutral: state({}),
  curious: state({
    tilt: -12, headDx: -4, headDy: 14, earL: -10, earR: 28, look: [0.6, -0.55], lidL: 0.04, lidR: 0.04,
    browL: { dy: -26, a: -10 }, browR: { dy: -4, a: 8 }, mouth: { w: 13, op: 0.34, rnd: 1, sm: 0 },
    ...ARMS.chin, tail: { a0: -4, bend: -16, curl: 36 }, lean: -1.5,
  }),
  excited: state({
    tilt: 7, headDy: -16, earL: -20, earR: -20, pupil: 'round', pw: 1.15, lowL: 0.5, lowR: 0.5, eyeScale: 1.06,
    browL: { dy: -40, a: -6 }, browR: { dy: -40, a: -6 }, mouth: { w: 64, sm: 1, op: 0.9, rnd: 0, fang: 1 },
    ...ARMS.up, tail: { a0: -48, bend: -4, curl: 30 }, bodyDy: -44, fx: 'spark',
  }),
  shocked: state({
    headDy: -24, eyeScale: 1.3, pupil: 'dot', pw: 0.6, earL: -26, earR: -26, glint: 0,
    browL: { dy: -58, a: -8 }, browR: { dy: -58, a: -8 }, mouth: { w: 42, op: 1, rnd: 1, sm: 0 },
    ...ARMS.cheeks, tail: { a0: -70, bend: 1, curl: 0, puff: 1.9 }, bodyDy: -26, fx: 'shock',
  }),
  sad: state({
    tilt: 8, headDy: 18, earL: 56, earR: 56, lidL: 0.52, lidR: 0.52, lidAL: -22, lidAR: -22, look: [0, 0.5],
    browL: { dy: -8, a: -24 }, browR: { dy: -8, a: -24 }, mouth: { w: 30, sm: -1, op: 0 },
    ...ARMS.limp, tail: { a0: 26, bend: 5, curl: -14, puff: 0.95 }, bodyDy: 10, shoulderDy: 10, fx: 'tear',
  }),
  skeptical: state({
    tilt: -7, earL: 6, earR: 30, lidL: 0.16, lidR: 0.6, lidAR: -4, look: [-0.6, 0.05],
    browL: { dy: -38, a: -14 }, browR: { dy: 14, a: 18 }, mouth: { w: 32, sm: 0.1, sk: 1 },
    ...ARMS.hip1, tail: { a0: -14, bend: -6, curl: 40 },
  }),
  angry: state({
    headDy: 8, earL: 64, earR: 64, earSqL: 0.82, earSqR: 0.82, lidL: 0.42, lidR: 0.42, lidAL: 26, lidAR: 26,
    pupil: 'round', pw: 0.75, look: [0, 0.15], glint: 0,
    browL: { dy: 8, a: 28 }, browR: { dy: 8, a: 28 }, mouth: { w: 46, sm: -0.9, op: 0.5, rnd: 0, fang: 2 },
    ...ARMS.hips, tail: { a0: -46, bend: 0, curl: 0, puff: 1.45, wave: 1 }, fx: 'anger',
  }),
  // extra faces used by the acting library (not on the sheet)
  happy: state({ lowL: 0.32, lowR: 0.32, browL: { dy: -24, a: -4 }, browR: { dy: -24, a: -4 }, mouth: { w: 40, sm: 1, op: 0.35, fang: 1 }, earL: -8, earR: -8 }),
  wink: state({ lidR: 1, lowL: 0.2, browL: { dy: -30, a: -6 }, browR: { dy: 4, a: 6 }, mouth: { w: 44, sm: 1, op: 0.3, sk: 0.4, fang: 1 }, earL: -10, earR: 6 }),
  keen: state({ pupil: 'round', pw: 1.05, browL: { dy: -30, a: -6 }, browR: { dy: -30, a: -6 }, mouth: { w: 38, sm: 0.9, op: 0.45, fang: 1 }, earL: -16, earR: -16 }),
  wow: state({ eyeScale: 1.14, pupil: 'round', pw: 0.8, browL: { dy: -50, a: -6 }, browR: { dy: -50, a: -6 }, mouth: { w: 34, op: 0.8, rnd: 0.7, sm: 0.1 }, earL: -22, earR: -22 }),
  doh: state({ lidL: 0.94, lidR: 0.94, browL: { dy: 6, a: -18 }, browR: { dy: 6, a: -18 }, mouth: { w: 34, sm: -0.5, op: 0 }, earL: 40, earR: 40 }),
  meh: state({ lidL: 0.2, lidR: 0.34, browL: { dy: -40, a: -10 }, browR: { dy: -18, a: 10 }, mouth: { w: 30, sm: 0, sk: 1 }, earL: 18, earR: 24 }),
  focus: state({ lidL: 0.22, lidR: 0.22, lidAL: 10, lidAR: 10, browL: { dy: 0, a: 12 }, browR: { dy: 0, a: 12 }, mouth: { w: 26, sm: 0.5, sk: 0.5 }, earL: -12, earR: -12 }),
  relief: state({ lidL: 0.45, lidR: 0.45, lowL: 0.25, lowR: 0.25, browL: { dy: -20, a: -16 }, browR: { dy: -20, a: -16 }, mouth: { w: 36, sm: 0.8, op: 0.25 }, earL: 10, earR: 10 }),
  dizzy: state({ pupil: 'dot', pw: 0.8, glint: 0, eyeScale: 1.05, browL: { dy: -30, a: 14 }, browR: { dy: -40, a: -14 }, mouth: { w: 30, sm: -0.2, op: 0.4, rnd: 0.6, sk: 0.6 }, earL: 30, earR: -10 }),
};
const EXPR_ORDER = ['curious', 'excited', 'shocked', 'sad', 'skeptical', 'angry'];
const EXPR_LABEL = { neutral: 'NEUTRAL', curious: 'CURIOUS', excited: 'EXCITED', shocked: 'SHOCKED', sad: 'SAD', skeptical: 'SKEPTICAL', angry: 'ANGRY' };
const EXPR_NOTE = {
  curious: 'TILT -12 · EAR R 28 · LOOK UP-RIGHT',
  excited: 'HOP -44 · SQUINT 0.5 · GRIN + FANG',
  shocked: 'EYES 1.3 · PUPIL DOT · EARS -26',
  sad: 'LIDS 0.52 SLANT -22 · EARS 56',
  skeptical: 'RING LID 0.6 · BROWS SPLIT · PAW ON HIP',
  angry: 'LIDS SLANT +26 · EARS FLAT · FANGS',
};
const FACE_KEYS = ['earL', 'earR', 'earSqL', 'earSqR', 'lidL', 'lidR', 'lidAL', 'lidAR', 'lowL', 'lowR',
  'eyeScale', 'pupil', 'pw', 'glint', 'browL', 'browR', 'mouth', 'fx', 'fxAmt'];
function faceOf(name) {
  const e = typeof name === 'object' ? state(name) : (EXPR[name] ?? EXPR.neutral);
  const o = {}; for (const k of FACE_KEYS) o[k] = (e[k] && typeof e[k] === 'object') ? { ...e[k] } : e[k];
  return o;
}

// ---------------------------------------------------------------- skeleton
const NECK_TOP = [0, -84];
function headXf(s) { return `rotate(${n(s.tilt)} ${NECK_TOP[0]} ${NECK_TOP[1]}) translate(${n(s.headDx)} ${n(s.headDy)})`; }
function headPt(s, p) { return rotP([p[0] + s.headDx, p[1] + s.headDy], NECK_TOP, s.tilt); }

const SHOULDER = [128, 40];
const BONE = 120;            // upper arm and forearm length
const HIP = [50, 320], FOOT = [58, 514], LEG_BONE = 100;
const angDiff = (a, b) => ((b - a + 540) % 360) - 180;
const ang = (a, b) => deg(Math.atan2(b[1] - a[1], b[0] - a[0]));

// Resolve one arm spec to joints in body space (before crouch): { S, E, W, paw, pa (deg), fr }.
// Joints are computed in a mirrored "outward" frame, so a left-arm spec equals the right-arm spec.
function armJoints(s, side) {
  const A = s['arm' + side], sg = side === 'R' ? 1 : -1;
  const S = [sg * SHOULDER[0], SHOULDER[1] + s.shoulderDy];
  let a = A.a, d = clamp(A.r, 0, 1.25) * 2 * BONE;
  if (A.tw > 0) {
    const T = A.th ? headPt(s, [sg * A.tx, A.ty]) : [sg * A.tx, A.ty];
    const lx = (T[0] - S[0]) * sg, ly = T[1] - S[1];
    const aT = deg(Math.atan2(ly, lx)), dT = Math.hypot(lx, ly);
    a = a + angDiff(a, aT) * clamp(A.tw); d = lerp(d, dT, clamp(A.tw));
  }
  const ca = Math.cos(rad(a)), sa = Math.sin(rad(a));
  const dd = Math.min(d, 2 * BONE * 0.999);
  const h = Math.sqrt(Math.max(0, BONE * BONE - (dd / 2) * (dd / 2))) * clamp(A.b, -1, 1);
  // local (outward) frame
  const Wl = [d * ca, d * sa], El = [(d / 2) * ca - sa * h, (d / 2) * sa + ca * h];
  const W = [S[0] + sg * Wl[0], S[1] + Wl[1]], E = [S[0] + sg * El[0], S[1] + El[1]];
  return { S, E, W, paw: A.paw, pa: ang(E, W) + sg * A.pa, fr: A.fr >= 0.5 };
}
function resolveArms(s) {
  const L = armJoints(s, 'L'), R = armJoints(s, 'R');
  return { L, R };
}
// Legs: hip in body space (moves with crouch), foot in ground space. Returns {H, K, F, fa}.
function legJoints(s, side) {
  const G = s['leg' + side], sg = side === 'R' ? 1 : -1;
  const H = [sg * HIP[0], HIP[1] + s.crouch], F = [sg * FOOT[0] + G.fx, FOOT[1] + G.fy];
  const dx = F[0] - H[0], dy = F[1] - H[1], d = Math.hypot(dx, dy) || 1;
  const dd = Math.min(d, 2 * LEG_BONE * 0.999);
  const h = Math.sqrt(Math.max(0, LEG_BONE * LEG_BONE - (dd / 2) * (dd / 2))) * clamp(G.b, 0, 1);
  let px = -dy / d, py = dx / d; if (px * sg < 0) { px = -px; py = -py; }
  const K = [H[0] + dx / 2 + px * h, H[1] + dy / 2 + py * h];
  return { H, K, F, fa: G.fa };
}

// ---------------------------------------------------------------- paws
// Simple mitten paws in local space: wrist at the origin, pointing along +y. `th` = thumb side (+1/-1).
// Returns a list of ink shapes; the draw passes add the keyline.
function pawShapes(type, th = 1) {
  const S = [];
  const ell = (cx, cy, rx, ry, r = 0) => S.push(['ellipse', { cx: cx * th, cy, rx, ry, transform: r ? `rotate(${n(r * th)} ${n(cx * th)} ${n(cy)})` : undefined }]);
  const circ = (cx, cy, r) => S.push(['circle', { cx: cx * th, cy, r }]);
  const path = (d) => S.push(['path', { d, transform: th < 0 ? 'scale(-1 1)' : undefined }]);
  switch (type) {
    case 'open': // splayed mitten, three finger bumps, thumb out
      path('M-26,-6 C-34,22 -32,48 -16,58 C-6,64 6,64 16,58 C32,48 34,22 26,-6 Z');
      circ(-17, 56, 12); circ(0, 64, 12.5); circ(17, 56, 12); ell(-32, 22, 10, 17, 38); break;
    case 'grip':
      path('M-40,30 C-44,2 -28,-22 0,-22 C28,-22 44,2 40,30 Z');
      S.push(['line', { x1: -13, y1: 30, x2: -13, y2: 14, detail: 1 }]);
      S.push(['line', { x1: 13, y1: 30, x2: 13, y2: 14, detail: 1 }]); break;
    case 'fist':
      circ(0, 24, 29); ell(-20, 10, 10, 14, 30); break;
    case 'thumb': // world-upright: a round fist with the thumb standing straight up (drawn unrotated)
      circ(0, 0, 31); S.push(['rect', { x: -12 + th * 6, y: -66, width: 26, height: 58, rx: 13 }]);
      S.push(['line', { x1: -22, y1: 2, x2: 20, y2: 2, detail: 1 }]); S.push(['line', { x1: -20, y1: 16, x2: 16, y2: 16, detail: 1 }]); break;
    case 'point':
      path('M-24,-6 C-30,16 -28,40 -8,46 C10,50 26,40 26,20 C26,8 25,0 22,-6 Z');
      path('M6,26 L8,78 A11,11 0 0 0 30,77 L26,24 Z'); ell(28, 10, 10, 13, -20); break;
    default: // 'mitt'
      path('M-24,-6 C-31,22 -30,50 -10,60 C4,66 22,58 27,40 C31,24 28,6 24,-6 Z');
      ell(-26, 18, 10.5, 15, 24);
  }
  return S;
}

// ---------------------------------------------------------------- tail
// The tail is a chain of 12 segments; a spec is a handful of numbers, so it tweens and sways.
// a0 = base angle (deg, 0 = +x, -90 = up), bend = per-segment turn, curl = extra turn over the
// last third (the hooked tip), puff = thickness multiplier, wave = zigzag amount, sway = live offset.
const TAIL = {
  neutral: { a0: 2, bend: -9, curl: 44, puff: 1, wave: 0 },
  question: { a0: -4, bend: -16, curl: 36, puff: 1, wave: 0 },
  up: { a0: -48, bend: -4, curl: 30, puff: 1, wave: 0 },
  puff: { a0: -70, bend: 1, curl: 0, puff: 1.9, wave: 0 },
  down: { a0: 26, bend: 5, curl: -14, puff: 0.95, wave: 0 },
  flick: { a0: -14, bend: -6, curl: 40, puff: 1, wave: 0 },
  lash: { a0: -46, bend: 0, curl: 0, puff: 1.45, wave: 1 },
  stream: { a0: 60, bend: 2, curl: 10, puff: 1, wave: 0 },
};
function tailSpec(t, base = TAIL0) {
  if (t == null) return { ...TAIL0, ...base };
  if (typeof t === 'string') return { ...TAIL0, ...(TAIL[t] || TAIL.neutral), sway: 0 };
  if (typeof t === 'number') return { ...TAIL0, ...base, sway: t };
  return { ...TAIL0, ...base, ...t };
}
function tailPath(spec, base = [64, 300], len = 330, w0 = 30, w1 = 19) {
  const N = 12, seg = len / N, pts = [base];
  let a = spec.a0, p = base;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    a += spec.bend + (u > 0.6 ? spec.curl * (u - 0.6) / 0.4 * 0.6 : 0)
      + spec.sway * 6 * Math.sin(u * Math.PI)
      + spec.wave * 26 * Math.sin(i * 1.9);
    p = [p[0] + seg * Math.cos(rad(a)), p[1] + seg * Math.sin(rad(a))];
    pts.push(p);
  }
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const a0 = pts[Math.max(0, i - 1)], a1 = pts[Math.min(N, i + 1)];
    const dx = a1[0] - a0[0], dy = a1[1] - a0[1], m = Math.hypot(dx, dy) || 1;
    const u = i / N, w = (lerp(w0, w1, u) + (u > 0.82 ? (u - 0.82) * 30 : 0)) * spec.puff / 2;
    L.push([pts[i][0] - (dy / m) * w, pts[i][1] + (dx / m) * w]);
    R.push([pts[i][0] + (dy / m) * w, pts[i][1] - (dx / m) * w]);
  }
  const e = pts[N], e0 = pts[N - 1], ta = Math.atan2(e[1] - e0[1], e[0] - e0[0]);
  const wt = (w1 + 5.4) * spec.puff / 2, cap = [];
  for (let k = 1; k < 6; k++) { const q = ta + Math.PI / 2 - (k * Math.PI) / 6; cap.push([e[0] + Math.cos(q) * wt, e[1] + Math.sin(q) * wt]); }
  return { d: smoothPath([...L, ...cap, ...R.reverse()], false) + ' Z', pts };
}

// ---------------------------------------------------------------- eyes
// The echo mark: viewer-left a solid amber disc, viewer-right a hollow amber ring with the same
// outer radius, ring stroke 6/22 of the radius, centres 60/22 radii apart (as in the logo).
// The spacing scales with the eyes so the logo proportions hold at every eyeScale.
function eyes(s, o) {
  const R = (o.R ?? 50) * s.eyeScale, dx = (R * 30) / 22, y = o.y;
  const fur = o.fur, ll = o.lidLine, lw = o.lidLineW ?? LW.line, blink = clamp(o.blink ?? 0);
  let out = '';
  for (const side of ['L', 'R']) {
    const cx = side === 'L' ? -dx : dx, cy = y, id = uid('eye');
    const lidBase = s['lid' + side], la = s['lidA' + side], low = s['low' + side];
    const lid = lidBase + (1 - lidBase) * blink;
    let g = '', lidLine = '';
    if (side === 'L') g += el('circle', { cx, cy, r: R, fill: PAL.amber });
    else g += el('circle', { cx, cy, r: (R * 19) / 22, fill: 'none', stroke: PAL.amber, 'stroke-width': (R * 6) / 22 });
    const [lx, ly] = s.look, px = cx + lx * R * 0.36, py = cy + ly * R * 0.36;
    if (side === 'L') {
      const pr = s.pw;
      if (s.pupil === 'tall') g += el('ellipse', { cx: px, cy: py, rx: R * 0.2 * pr, ry: R * 0.42 * pr, fill: fur });
      else if (s.pupil === 'round') g += el('circle', { cx: px, cy: py, r: R * 0.3 * pr, fill: fur });
      else if (s.pupil === 'dot') g += el('circle', { cx: px, cy: py, r: R * 0.2 * pr, fill: fur });
      if (s.glint > 0 && s.pupil !== 'dot' && s.pupil !== 'none')
        g += el('circle', { cx: px + R * 0.08, cy: py - R * (s.pupil === 'tall' ? 0.2 : 0.12) * pr, r: R * 0.085 * s.glint, fill: PAL.paper });
    }
    // top lid: fur slab whose lower edge drops with `lid`, slanted by `la`, sagging a little
    if (lid > 0.001) {
      const ey = cy - R + 1.22 * R * lid, a2 = side === 'L' ? la : -la, sag = R * 0.16 * Math.max(lid, blink);
      const tf = `rotate(${n(a2)} ${n(cx)} ${n(ey)})`;
      const edge = `M${n(cx - 2 * R)},${n(ey)} Q${n(cx)},${n(ey + sag * 2)} ${n(cx + 2 * R)},${n(ey)}`;
      g += el('path', { d: `${edge} L${n(cx + 2 * R)},${n(ey - 3 * R)} L${n(cx - 2 * R)},${n(ey - 3 * R)} Z`, fill: fur, transform: tf });
      if (ll) lidLine = el('path', { d: edge, fill: 'none', stroke: ll, 'stroke-width': lw, transform: tf });
    }
    // blink: a lower lid rises to meet the top lid
    const bl = smooth(0.45, 1, blink);
    if (bl > 0.001) g += el('rect', { x: cx - 2 * R, y: cy + R - 0.78 * R * bl + 2, width: 4 * R, height: 3 * R, fill: fur });
    g += lidLine; // drawn after the blink fill so a closed eye keeps its paper line
    // happy lower lid: a big circle rising from below gives the crescent
    if (low > 0.001) {
      const rr = R * 1.25, ccy = cy + R - 2 * R * low + rr;
      g += el('circle', { cx, cy: ccy, r: rr, fill: fur, stroke: ll || 'none', 'stroke-width': ll ? lw : 0 });
    }
    out += `<clipPath id="${id}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R + 0.6)}"/></clipPath><g clip-path="url(#${id})">${g}</g>`;
  }
  return out;
}

function brows(s, o) {
  const dx = ((o.dx ?? 68) * (1 + (s.eyeScale - 1) * 0.9)), len = o.len ?? 54, y = o.y;
  let out = '';
  for (const side of ['L', 'R']) {
    const b = side === 'L' ? s.browL : s.browR, cx = side === 'L' ? -dx : dx, cy = y + b.dy;
    const a = side === 'L' ? b.a : -b.a;
    out += el('line', { x1: cx - len / 2, y1: cy, x2: cx + len / 2, y2: cy, stroke: o.color, 'stroke-width': o.w ?? LW.band,
      'stroke-linecap': 'round', transform: `rotate(${n(a)} ${n(cx)} ${n(cy)})` });
  }
  return out;
}

// ---------------------------------------------------------------- mouth
// One parametric mouth for every expression and for talking.
// w = half width, sm = smile (-1 frown .. 1 grin), op = open 0..1, rnd = roundness (O-shape),
// sk = smirk skew, fang = 0/1/2 small paper fangs. `talk` (0..1) opens it further.
function mouth(m, o) {
  const talk = clamp(o.talk ?? 0);
  const op = clamp(m.op + (1 - m.op) * talk * 0.85);
  const rnd = clamp(m.rnd + talk * 0.35 * (1 - m.rnd) * (m.sm < 0.5 ? 1 : 0.3));
  const w = Math.max(10, m.w * (1 - rnd * op * 0.2) + talk * 6 * (1 - m.rnd));
  const H = o.H ?? 64;
  const lift = m.sm * 13;
  const Lc = [-w, -lift + m.sk * 9], Rc = [w, -lift - m.sk * 12];
  const dip = 13 * (1 - op) * (1 - Math.abs(m.sk) * 0.6) - op * rnd * H * 0.32;
  const st = { stroke: o.line, 'stroke-width': o.lw ?? LW.line, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const T = `translate(0 ${n(o.y)})`;
  // upper lip: two U-curves meeting under the nose (the cat "w"), flattening as it opens
  const upper = `M${P(Lc)} C${n(Lc[0])},${n(Lc[1] + dip * 1.1)} ${n(-w * 0.12)},${n(dip * 1.1)} 0,0`
    + ` C${n(w * 0.12)},${n(dip * 1.1)} ${n(Rc[0])},${n(Rc[1] + dip * 1.1)} ${P(Rc)}`;
  const ra = rnd * op;
  if (ra > 0.3) {
    const up = H * 0.42 * ra;
    const Lr = [Lc[0], Lc[1] + up * 0.75 + 4], Rr = [Rc[0], Rc[1] + up * 0.75 + 4];
    const d = `M${P(Lr)} C${n(Lr[0])},${n(Lr[1] - up)} ${n(Rr[0])},${n(Rr[1] - up)} ${P(Rr)}`
      + ` C${n(Rr[0] * 1.3)},${n(Rr[1] + op * H * 1.4)} ${n(Lr[0] * 1.3)},${n(Lr[1] + op * H * 1.4)} ${P(Lr)} Z`;
    const id = uid('m');
    let g = el('path', { d, fill: o.fill }) + `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
    if (o.tongue) g += `<g clip-path="url(#${id})">${el('ellipse', { cx: 0, cy: Lr[1] + op * H * 1.08, rx: w * 0.7, ry: op * H * 0.32, fill: o.tongue })}</g>`;
    return `<g transform="${T}">${g}${el('path', { d, fill: 'none', ...st })}</g>`;
  }
  if (op < 0.04) {
    if (m.sm < -0.2) { // frown: one arch
      const d = `M${P([-w, 10])} Q0,${n(-14 - 6 * -m.sm)} ${P([w, 10])}`;
      return el('path', { d, fill: 'none', ...st, transform: T });
    }
    return el('path', { d: upper, fill: 'none', ...st, transform: T });
  }
  const h = op * H * (0.95 + 0.25 * rnd) + Math.max(0, -m.sm) * 6;
  const bulge = 1 + 0.35 * rnd;
  const lower = ` C${n(Rc[0] * bulge)},${n(Rc[1] + h * 1.25)} ${n(Lc[0] * bulge)},${n(Lc[1] + h * 1.25)} ${P(Lc)} Z`;
  const d = upper + lower, id = uid('m');
  let g = el('path', { d, fill: o.fill });
  g += `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
  if (o.tongue && op > 0.25) g += `<g clip-path="url(#${id})">${el('ellipse', { cx: 0, cy: h * 0.98 + 6, rx: w * 0.62, ry: h * 0.42, fill: o.tongue })}</g>`;
  if (m.fang) {
    const fang = (x) => el('path', { d: `M${n(x - 8)},${n(dip * 0.9 - 1)} L${n(x + 8)},${n(dip * 0.9 - 1)} L${n(x + 1)},${n(dip * 0.9 + 15)} Z`, fill: o.line, 'clip-path': `url(#${id})` });
    g += fang(w * 0.42);
    if (m.fang > 1) g += fang(-w * 0.42);
  }
  g += el('path', { d, fill: 'none', ...st });
  return `<g transform="${T}">${g}</g>`;
}

// ---------------------------------------------------------------- effects
// Drawn around the head, in head space. Short straight strokes only, no glow.
function fx(s, o) {
  const c = o.color, w = o.w ?? 12, top = o.top ?? -380, hw = o.hw ?? 240, k = s.fxAmt;
  if (!s.fx || k <= 0) return '';
  const line = (a, b) => el('line', { x1: a[0], y1: a[1], x2: lerp(a[0], b[0], k), y2: lerp(a[1], b[1], k), stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' });
  if (s.fx === 'shock') {
    return line([-hw - 30, top + 20], [-hw - 92, top - 26]) + line([-hw + 34, top - 70], [-hw + 10, top - 132])
      + line([-hw - 60, top + 110], [-hw - 126, top + 100])
      + line([hw + 30, top + 20], [hw + 92, top - 26]) + line([hw - 34, top - 70], [hw - 10, top - 132])
      + line([hw + 60, top + 110], [hw + 126, top + 100]);
  }
  if (s.fx === 'spark') {
    const star = (x, y, r) => el('path', { d: `M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z`, fill: c, transform: `scale(1)` });
    return line([-hw - 50, top + 70], [-hw - 112, top + 34]) + line([-hw - 46, top + 150], [-hw - 116, top + 156])
      + line([hw + 50, top + 70], [hw + 112, top + 34]) + line([hw + 46, top + 150], [hw + 116, top + 156])
      + (k > 0.5 ? star(-hw + 10, top - 60, 26) + star(hw - 6, top - 74, 20) : '');
  }
  if (s.fx === 'tear') {
    const [x, y] = o.tearAt;
    return el('path', { d: `M${x},${y} C${x + 17},${y + 28} ${x + 21},${y + 42} ${x},${y + 51} C${x - 21},${y + 42} ${x - 17},${y + 28} ${x},${y} Z`, fill: o.tear ?? c });
  }
  if (s.fx === 'anger') { // the comic "popping vein" mark, four arcs
    const [x, y] = o.angerAt, r = 30 * k, g = 12;
    const arc = (sx, sy) => el('path', { d: `M${n(x + sx * g)},${n(y + sy * (g + r))} Q${n(x + sx * g)},${n(y + sy * g)} ${n(x + sx * (g + r))},${n(y + sy * g)}`, fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' });
    return arc(1, 1) + arc(-1, 1) + arc(1, -1) + arc(-1, -1);
  }
  return '';
}

return { PAL, mix, TONE, LW, uid, n, P, lerp, clamp, smooth, deg, rad, rotP, attrs, el, smoothPath, ARM0, LEG0, TAIL0, PROPS0, DEFAULT, state, merge, lerpState, ARMS, LEGS, EXPR, EXPR_ORDER, EXPR_LABEL, EXPR_NOTE, FACE_KEYS, faceOf, NECK_TOP, headXf, headPt, SHOULDER, BONE, HIP, armJoints, resolveArms, legJoints, pawShapes, TAIL, tailSpec, tailPath, eyes, brows, mouth, fx };
})();
const M_cat = (() => {
const { PAL, TONE, LW, el, n, P, uid, clamp, lerp, state, merge, EXPR, ARMS, LEGS, headXf, headPt, resolveArms, legJoints, pawShapes, tailSpec, tailPath, eyes, brows, mouth, fx, } = M_core;
// catA.mjs (v3): Direction A, "Night Shift", v3 body.
// A young, lanky, excited black cat whose face is the channel avatar (the echo mark on ink).
// v3 design fix: the pencil neck is gone. The neck is now about as wide as the space between the
// eye centres' inner thirds (104 units, v2 was 46), it is shorter on screen, and it rises out of a
// stand-up jacket collar, with the headset cable looping down into the collar. Everything else is
// kept: logo eyes (solid disc viewer-left, hollow ring viewer-right, logo spacing), headset with the
// crooked mic, oversized paper jacket, the tuft, thin ink forearms and legs, mitten paws.
// Paper keyline around the silhouette (two passes: fat paper strokes first, flat shapes on top)
// plus a thin outer ink rim so the outline also holds on bright photos. No internal lines on fur.
// The figure is never mirrored: the disc is always viewer-left. Asymmetric poses are built per side.


const META = {
  id: 'A',
  name: 'NIGHT SHIFT',
  line: 'A young night-shift cat whose face is the channel avatar: the echo mark on ink, a borrowed headset, a jacket one size too big.',
};

const K = LW.key;

// ---------------------------------------------------------------- geometry
const HEAD = 'M0,-444 C124,-444 216,-388 228,-284 C232,-252 233,-232 236,-214 L262,-198 L240,-184 L256,-160 L226,-150 '
  + 'C198,-104 120,-84 0,-84 C-120,-84 -198,-104 -226,-150 L-256,-160 L-240,-184 L-262,-198 L-236,-214 '
  + 'C-233,-232 -232,-252 -228,-284 C-216,-388 -124,-444 0,-444 Z';
const TUFT = 'M-38,-436 C-46,-466 -40,-494 -22,-512 C-20,-490 -12,-474 0,-466 C2,-492 16,-510 40,-518 '
  + 'C30,-496 30,-470 34,-440 Z';
const EAR = 'M-218,-300 C-230,-372 -226,-452 -204,-510 Q-196,-526 -184,-514 C-148,-480 -104,-440 -64,-410 Z';
const EAR_IN = 'M-194,-326 C-202,-378 -200,-434 -190,-472 C-162,-446 -132,-420 -104,-400 C-134,-378 -168,-352 -194,-326 Z';
const EAR_PIVOT = [-150, -352];
const BODY = 'M-58,-6 C-96,-2 -128,10 -146,34 C-164,58 -170,100 -170,150 L-164,330 C-164,340 -158,346 -148,346 '
  + 'L148,346 C158,346 164,340 164,330 L170,150 C170,100 164,58 146,34 C128,10 96,-2 58,-6 Z';
// v3 collar: a band behind the neck and two stiff flaps in front, so the neck rises out of the jacket.
const COLLAR_BACK = 'M-110,16 C-108,-36 -76,-70 0,-72 C76,-70 108,-36 110,16 Z';
const FLAP = 'M-36,14 C-50,-8 -66,-40 -86,-68 C-110,-56 -128,-20 -134,22 C-100,30 -62,28 -36,14 Z';
const NECK_W = 112;
const FOOT_D = 'M-32,2 C-34,-22 8,-26 36,-14 C60,-4 54,26 22,26 L-22,26 C-32,26 -32,14 -32,2 Z';

const HEAD_FACE = { eyeY: -236, R: 50, browY: -316, noseY: -172, mouthY: -156 };

// ---------------------------------------------------------------- params (drawCat compatibility)
// drawCat params -> one full state. `pose` may name any ARMS preset; 'peek' and 'point' keep v2 meaning.
function resolve(p = {}) {
  const base = typeof p.expression === 'object' ? state(p.expression) : (EXPR[p.expression ?? 'neutral'] ?? EXPR.neutral);
  let s = merge(base, p.state || {});
  const pose = p.pose ?? 'auto';
  if (pose === 'stand') s = merge(s, ARMS.down);
  else if (pose === 'peek') {
    const e = p.edgeY ?? -40;
    s = merge(s, { bodyDy: 0, lean: 0, headDy: Math.min(s.headDy, 6), fxAmt: s.fxAmt * 0.8,
      armL: { tx: 150, ty: e - 30, tw: 1, th: 0, b: 0.6, paw: 'grip', pa: 0, fr: 1 },
      armR: { tx: 150, ty: e - 30, tw: 1, th: 0, b: 0.6, paw: 'grip', pa: 0, fr: 1 } });
  } else if (pose === 'point') {
    const a = p.pointAngle ?? -30, right = Math.cos((a * Math.PI) / 180) >= 0;
    const pt = { a: right ? a : 180 - a, r: 1, b: 0.25, paw: 'point', pa: 0, tw: 0, fr: 0 };
    s = merge(s, { bodyDy: Math.min(0, s.bodyDy * 0.3), ...(right ? { armR: pt, armL: ARMS.relaxed.armL } : { armL: pt, armR: ARMS.relaxed.armR }) });
  } else if (pose !== 'auto' && ARMS[pose]) s = merge(s, ARMS[pose]);
  if (p.legs && LEGS[p.legs]) s = merge(s, LEGS[p.legs]);
  if (p.lookX != null || p.lookY != null) s.look = [p.lookX ?? s.look[0], p.lookY ?? s.look[1]];
  if (p.blink != null) s.blink = clamp(p.blink);
  if (p.mouthOpen != null) s.talk = clamp(p.mouthOpen);
  if (p.earTwitch != null) s.twitchR = clamp(p.earTwitch);
  if (p.tail != null) s.tail = tailSpec(p.tail, s.tail);
  if (p.props) s.props = { ...s.props, ...p.props };
  s.__peek = pose === 'peek' ? (p.edgeY ?? -40) : null;
  return s;
}

// ---------------------------------------------------------------- draw
// Returns the cat as an SVG <g> string in rig space (feet on y 540). `s` is a full state
// (from state(), merge() or resolve()); a drawCat-style params object is resolved first.
function draw(p = {}, opt = {}) {
  const s = p.armL ? p : resolve(p);
  const KL = opt.keyline ?? PAL.paper, RIM = opt.rim ?? PAL.ink, rimW = opt.rimW ?? LW.rim;
  const ink = PAL.ink, paper = PAL.paper;
  const arms = resolveArms(s), legL = legJoints(s, 'L'), legR = legJoints(s, 'R');
  const pr = s.props || {};
  const cr = s.crouch;

  const silOf = (tag, a, col, extra) => {
    const hasFill = a.fill && a.fill !== 'none';
    return el(tag, { ...a, fill: hasFill ? col : 'none', stroke: col, 'stroke-width': (a['stroke-width'] || 0) + 2 * extra,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  };
  const passShape = (mode, tag, a) => {
    if (a.nosil && mode !== 'fill') return '';
    const b = a.nosil ? { ...a, nosil: undefined } : a;
    if (mode === 'rim') return silOf(tag, b, RIM, K + rimW);
    if (mode === 'sil') return silOf(tag, b, KL, K);
    return el(tag, b);
  };
  const shapes = (mode, list) => list.map(([t, a]) => {
    if (a.detail) return mode === 'fill' ? el(t, { ...a, detail: undefined, fill: undefined, stroke: paper, 'stroke-width': LW.line * 0.8, 'stroke-linecap': 'round' }) : '';
    return passShape(mode, t, a);
  }).join('');
  const outlined = (mode, tag, a, w = LW.line) => (mode === 'fill' ? el(tag, { ...a, stroke: ink, 'stroke-width': w }) : passShape(mode, tag, a));

  // ---- ground space: legs, feet, board, scooter wheel and deck
  const legList = [];
  for (const [J, d] of [[legL, -1], [legR, 1]]) {
    const C = [2 * J.K[0] - (J.H[0] + J.F[0]) / 2, 2 * J.K[1] - (J.H[1] + J.F[1]) / 2];
    legList.push(['path', { d: `M${P(J.H)} Q${P(C)} ${P(J.F)}`, fill: 'none', stroke: ink, 'stroke-width': 32, 'stroke-linecap': 'round' }]);
    legList.push(['path', { d: FOOT_D, fill: ink, transform: `translate(${P(J.F)}) rotate(${n(J.fa)}) scale(${d} 1)` }]);
  }
  const ground = (mode) => {
    let g = '';
    if (pr.scoot > 0.01) {
      const k = clamp(pr.scoot);
      g += `<g transform="translate(0 560) scale(${n(k * 100) / 100}) translate(0 -560)">`
        + outlined(mode, 'circle', { cx: 0, cy: 612, r: 62, fill: mode === 'fill' ? PAL.amber : ink }, 0).replace(/stroke-width="0"/, '')
        + outlined(mode, 'rect', { x: -150, y: 540, width: 300, height: 24, rx: 12, fill: paper })
        + '</g>';
    }
    if (pr.board > 0.01) {
      const k = clamp(pr.board), dir = pr.boardDir >= 0 ? 1 : -1;
      g += `<g transform="translate(0 556) scale(${n(k * 100) / 100}) translate(0 -556)">`;
      if (mode === 'fill' && pr.thrust > 0.02) {
        const L = 70 + 280 * pr.thrust, x0 = dir * 196;
        g += el('path', { d: `M${n(x0)},542 L${n(x0 + dir * L)},556 L${n(x0)},570 Z`, fill: PAL.amber })
          + el('path', { d: `M${n(x0)},550 L${n(x0 + dir * L * 0.55)},556 L${n(x0)},562 Z`, fill: paper });
      }
      g += outlined(mode, 'rect', { x: -156, y: 540, width: 312, height: 30, rx: 15, fill: ink }, 0)
        + outlined(mode, 'path', { d: `M${dir * 150},544 L${dir * 196},538 L${dir * 196},574 L${dir * 150},568 Z`, fill: paper });
      if (mode === 'fill') g += el('line', { x1: -120, y1: 555, x2: 120, y2: 555, stroke: paper, 'stroke-width': 5, 'stroke-dasharray': '18 14' });
      g += '</g>';
    }
    return g + shapes(mode, legList);
  };

  // ---- crouch space (everything above the hips)
  const tailList = [['path', { d: tailPath(s.tail, [70, 306], 380).d, fill: ink }]];
  const nTop = headPt(s, [0, -120]);
  const neckList = [['path', { d: `M0,24 Q${n(nTop[0] * 0.35)},${n((24 + nTop[1]) / 2)} ${P(nTop)}`, fill: 'none', stroke: ink, 'stroke-width': NECK_W, 'stroke-linecap': 'round' }]];
  const shY = s.shoulderDy * 0.4;
  const shT = shY ? `translate(0 ${n(shY)})` : undefined;
  const bodyList = [['path', { d: BODY, fill: paper, transform: shT }]];
  const collarBack = (mode) => outlined(mode, 'path', { d: COLLAR_BACK, fill: paper, transform: shT });
  const flaps = (mode) => outlined(mode, 'path', { d: FLAP, fill: paper, transform: shT })
    + outlined(mode, 'path', { d: FLAP, fill: paper, transform: `${shT ?? ''} scale(-1 1)` });
  const jacketDetail = () => `<g${shT ? ` transform="${shT}"` : ''}>`
    + el('path', { d: 'M-40,10 C-26,28 -12,44 0,62 C12,44 26,28 40,10', fill: 'none', stroke: ink, 'stroke-width': LW.band, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    + el('line', { x1: 0, y1: 62, x2: 0, y2: 314, stroke: ink, 'stroke-width': LW.line * 0.8 })
    + el('rect', { x: -166, y: 312, width: 332, height: 34, fill: ink })
    + el('circle', { cx: 44, cy: 112, r: 12, fill: PAL.amber })
    + el('circle', { cx: 76.7, cy: 112, r: 10.4, fill: 'none', stroke: PAL.amber, 'stroke-width': 3.3 })
    + '</g>';
  // headset cable: from the viewer-left ear cup, a loose loop, into the collar
  const cable = () => {
    const a = headPt(s, [-226, -184]), b = [-40, 4 + shY];
    const c1 = [a[0] - 10, a[1] + 120], c2 = [-150, 40 + shY];
    const d = `M${P(a)} C${P(c1)} ${P(c2)} ${P(b)}`;
    return el('path', { d, fill: 'none', stroke: ink, 'stroke-width': 16, 'stroke-linecap': 'round' })
      + el('path', { d, fill: 'none', stroke: paper, 'stroke-width': 7, 'stroke-linecap': 'round' });
  };
  // jet pack: two canisters behind the shoulders, flames under them
  const jet = (mode) => {
    if (!(pr.jet > 0.01)) return '';
    const k = clamp(pr.jet);
    let g = '';
    for (const sg of [-1, 1]) {
      const x = sg * 192, T = `translate(${x} ${n(30 + shY)}) scale(${n(k * 100) / 100}) translate(${-x} ${n(-30 - shY)})`;
      let q = outlined(mode, 'rect', { x: x - 24, y: -30 + shY, width: 48, height: 140, rx: 20, fill: paper })
        + outlined(mode, 'rect', { x: x - 18, y: 108 + shY, width: 36, height: 18, rx: 4, fill: ink }, 0);
      if (mode === 'fill') {
        q += el('line', { x1: x - 24, y1: 20 + shY, x2: x + 24, y2: 20 + shY, stroke: ink, 'stroke-width': LW.line * 0.8 });
        if (pr.flame > 0.02) {
          const L = 60 + 240 * pr.flame, y0 = 126 + shY;
          q = el('path', { d: `M${x - 22},${n(y0)} L${x},${n(y0 + L)} L${x + 22},${n(y0)} Z`, fill: PAL.amber })
            + el('path', { d: `M${x - 9},${n(y0)} L${x},${n(y0 + L * 0.55)} L${x + 9},${n(y0)} Z`, fill: paper }) + q;
        }
      }
      g += `<g transform="${T}">${q}</g>`;
    }
    return g;
  };
  // scooter stem and handlebar (crouch space; the deck is in ground space at y 540)
  const stem = (mode) => {
    if (!(pr.scoot > 0.01)) return '';
    const k = clamp(pr.scoot), yb = 548 - cr;
    return `<g transform="translate(0 ${n(yb)}) scale(${n(k * 100) / 100}) translate(0 ${n(-yb)})">`
      + passShape(mode, 'path', { d: `M0,${n(yb)} L0,176`, fill: 'none', stroke: mode === 'fill' ? ink : ink, 'stroke-width': 22 })
      + (mode === 'fill' ? el('path', { d: `M0,${n(yb)} L0,176`, fill: 'none', stroke: paper, 'stroke-width': 10 }) : '')
      + passShape(mode, 'path', { d: 'M-118,176 L118,176', fill: 'none', stroke: ink, 'stroke-width': 24, 'stroke-linecap': 'round' })
      + (mode === 'fill' ? el('path', { d: 'M-112,176 L112,176', fill: 'none', stroke: paper, 'stroke-width': 10, 'stroke-linecap': 'round' }) : '')
      + '</g>';
  };
  // sign on a stick, held in the viewer-right paw
  const card = (mode) => {
    if (!(pr.card > 0.01) || !pr.cardText) return '';
    const W = arms.R.W, k = clamp(pr.card), tl = 24;
    const cs = pr.cardScale ?? 1.5;
    const len = 190 * k, top = [W[0] + Math.sin((tl * Math.PI) / 180) * len, W[1] - Math.cos((tl * Math.PI) / 180) * len];
    const txt = String(pr.cardText), w = Math.max(230, txt.length * 52 + 70), h = pr.cardSub ? 190 : 150;
    let g = passShape(mode, 'path', { d: `M${P([W[0], W[1] + 10])} L${P(top)}`, fill: 'none', stroke: ink, 'stroke-width': 16 });
    if (mode === 'fill') g += el('path', { d: `M${P([W[0], W[1] + 10])} L${P(top)}`, fill: 'none', stroke: paper, 'stroke-width': 6 });
    const T = `translate(${P(top)}) rotate(${n(-4 + (1 - k) * 30 + (pr.cardRot ?? 0))}) scale(${n(k * cs * 100) / 100}) translate(0 ${n(-h / 2 + 10)})`;
    let b = outlined(mode, 'rect', { x: -w / 2, y: -h / 2, width: w, height: h, fill: paper });
    if (mode === 'fill') {
      b += `<text x="0" y="${pr.cardSub ? -2 : 26}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="78" style="font-variation-settings:'wdth' 112" fill="${ink}">${txt}</text>`;
      if (pr.cardSub) b += `<text x="0" y="62" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="500" font-size="30" letter-spacing="2" fill="${ink}">${pr.cardSub}</text>`;
    }
    return g + `<g transform="${T}">${b}</g>`;
  };

  // ---- arms
  const armParts = (side) => {
    const J = arms[side], th = side === 'R' ? -1 : 1;
    const { S, E, W } = J;
    const ua = Math.atan2(E[1] - S[1], E[0] - S[0]);
    const cuff = [E[0] - Math.cos(ua) * 6, E[1] - Math.sin(ua) * 6];
    const fore = [['path', { d: `M${P(E)} L${P(W)}`, fill: 'none', stroke: ink, 'stroke-width': 28, 'stroke-linecap': 'round' }]];
    const upright = J.paw === 'thumb' || J.paw === 'grip';
    const pawT = upright ? `translate(${n(W[0])} ${n(W[1])})` : `translate(${n(W[0])} ${n(W[1])}) rotate(${n(J.pa - 90)})`;
    const pawList = pawShapes(J.paw, (J.paw === 'point' || J.paw === 'grip') ? 1 : th).map(([t, at]) => [t, at.detail ? at : { ...at, fill: ink }]);
    const sleeveD = `M${P(S)} L${P(cuff)}`;
    const cuffT = `rotate(${n((ua * 180) / Math.PI + 90)} ${n(cuff[0])} ${n(cuff[1])})`;
    return { fore, sleeveD, cuff, cuffT, pawList, pawT };
  };
  const armSil = (mode, side, which = 'all') => {
    const A = armParts(side);
    const paw = `<g transform="${A.pawT}">${shapes(mode, A.pawList)}</g>`;
    if (which === 'paw') return paw;
    return shapes(mode, A.fore)
      + passShape(mode, 'path', { d: A.sleeveD, fill: 'none', stroke: ink, 'stroke-width': 66, 'stroke-linecap': 'round' })
      + passShape(mode, 'ellipse', { cx: A.cuff[0], cy: A.cuff[1], rx: 42, ry: 24, fill: ink, transform: A.cuffT })
      + (which === 'all' ? paw : '');
  };
  const armFill = (side, which = 'all') => {
    const A = armParts(side);
    if (which === 'paw') return armSil('sil', side, 'paw') + `<g transform="${A.pawT}">${shapes('fill', A.pawList)}</g>`;
    const fold = (dx) => el('line', { x1: A.cuff[0] + dx * 18, y1: A.cuff[1] - 13, x2: A.cuff[0] + dx * 14, y2: A.cuff[1] + 13, stroke: ink, 'stroke-width': LW.line * 0.8, 'stroke-linecap': 'round', transform: A.cuffT });
    return armSil('sil', side, which)
      + shapes('fill', A.fore)
      + el('path', { d: A.sleeveD, fill: 'none', stroke: ink, 'stroke-width': 66, 'stroke-linecap': 'round' })
      + el('path', { d: A.sleeveD, fill: 'none', stroke: paper, 'stroke-width': 66 - 2 * LW.line, 'stroke-linecap': 'round' })
      + el('ellipse', { cx: A.cuff[0], cy: A.cuff[1], rx: 42, ry: 24, fill: paper, stroke: ink, 'stroke-width': LW.line, transform: A.cuffT })
      + fold(-1) + fold(1)
      + (which === 'all' ? `<g transform="${A.pawT}">${shapes('fill', A.pawList)}</g>` : '');
  };
  const armM = (mode, side, which = 'all') => (mode === 'fill' ? armFill(side, which) : armSil(mode, side, which));

  // ---- head
  const earG = (mode, side) => {
    const sgn = side === 'L' ? 1 : -1;
    let rot = side === 'L' ? -s.earL : s.earR;
    let sq = side === 'L' ? s.earSqL : s.earSqR;
    const tw = side === 'L' ? s.twitchL : s.twitchR;
    if (tw > 0) { rot += (side === 'L' ? -24 : 24) * tw; sq *= 1 - 0.14 * tw; }
    const pv = side === 'L' ? EAR_PIVOT : [-EAR_PIVOT[0], EAR_PIVOT[1]];
    const look = s.look[0] * -6;
    const tf = `translate(${n(look)} 0) rotate(${n(rot)} ${n(pv[0])} ${n(pv[1])}) translate(${n(pv[0])} ${n(pv[1])}) scale(1 ${n(sq * 100) / 100}) translate(${n(-pv[0])} ${n(-pv[1])})`;
    const mirror = sgn < 0 ? 'scale(-1 1)' : '';
    let g = passShape(mode, 'path', { d: EAR, fill: ink });
    if (mode === 'fill') g += el('path', { d: EAR_IN, fill: TONE.earIn });
    return `<g transform="${tf}"><g transform="${mirror}">${g}</g></g>`;
  };
  const headset = () => {
    const band = el('path', { d: 'M-230,-226 C-232,-462 232,-462 230,-226', fill: 'none', stroke: paper, 'stroke-width': LW.band, 'stroke-linecap': 'round' });
    const cup = (x) => el('rect', { x: x - 23, y: -274, width: 46, height: 92, rx: 10, fill: paper, stroke: ink, 'stroke-width': LW.line * 0.8 });
    const boom = el('path', { d: 'M-232,-196 C-238,-128 -196,-112 -140,-118 L-112,-128', fill: 'none', stroke: paper, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      + el('rect', { x: -124, y: -142, width: 36, height: 22, rx: 8, fill: paper, stroke: ink, 'stroke-width': LW.line * 0.6, transform: 'rotate(-16 -106 -131)' });
    return { band, cups: cup(-230) + cup(230) + boom };
  };
  const face = () => {
    const fxo = { color: paper, w: 13, top: -400, hw: 250, tearAt: [-112 * s.eyeScale, -196], tear: paper, angerAt: [178, -486] };
    const lx = s.look[0] * 12, ly = s.look[1] * 6;
    return `<g transform="translate(${n(lx)} ${n(ly)})">`
      + eyes(s, { y: HEAD_FACE.eyeY, R: HEAD_FACE.R, fur: ink, lidLine: paper, lidLineW: LW.line, blink: s.blink })
      + brows(s, { y: HEAD_FACE.browY, dx: 68, len: 54, w: LW.band, color: paper })
      + el('path', { d: `M-13,${HEAD_FACE.noseY - 6} L13,${HEAD_FACE.noseY - 6} L0,${HEAD_FACE.noseY + 8} Z`, fill: paper, stroke: paper, 'stroke-width': 6, 'stroke-linejoin': 'round' })
      + mouth(s.mouth, { y: HEAD_FACE.mouthY, line: paper, fill: ink, tongue: TONE.tongue, talk: s.talk })
      + '</g>'
      + fx(s, fxo);
  };
  const head = (mode) => {
    let g = earG(mode, 'L') + earG(mode, 'R') + passShape(mode, 'path', { d: HEAD, fill: ink }) + passShape(mode, 'path', { d: TUFT, fill: ink });
    if (mode === 'fill') { const hs = headset(); g += hs.band + face() + hs.cups; }
    return `<g transform="${headXf(s)}">${g}</g>`;
  };

  // ---- assemble
  const front = { L: arms.L.fr, R: arms.R.fr };
  const peek = s.__peek != null;
  const pass = (mode) => {
    let up = jet(mode) + shapes(mode, tailList) + collarBack(mode) + shapes(mode, neckList) + shapes(mode, bodyList);
    if (mode === 'fill') up += jacketDetail() + cable();
    up += flaps(mode) + stem(mode);
    const back = ['L', 'R'].filter((k) => !front[k]), fr = ['L', 'R'].filter((k) => front[k]);
    if (peek) {
      up += head(mode) + ['L', 'R'].map((k) => armM(mode, k, 'arm')).join('');
      return { under: ground(mode) + `<g transform="translate(0 ${n(cr)})">${up}</g>`, over: ['L', 'R'].map((k) => armM(mode, k, 'paw')).join('') };
    }
    up += back.map((k) => armM(mode, k)).join('') + head(mode) + fr.map((k) => armM(mode, k)).join('') + card(mode);
    if (pr.card > 0.01 && pr.cardText) up += armM(mode, 'R', 'paw');
    return { under: ground(mode) + `<g transform="translate(0 ${n(cr)})">${up}</g>`, over: '' };
  };
  const rim = opt.rim === false ? { under: '', over: '' } : pass('rim');
  const sil = pass('sil'), fill = pass('fill');
  let inner = rim.under + sil.under + fill.under;
  if (peek) {
    const id = uid('pk');
    inner = `<clipPath id="${id}"><rect x="-3000" y="-3000" width="6000" height="${n(3000 + s.__peek)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`
      + `<g transform="translate(0 ${n(cr)})">${rim.over}${fill.over}</g>`;
  }
  const sy = 1 - s.sq, sx = 1 + s.sq * 0.75;
  const xf = `translate(0 ${n(s.bodyDy)}) rotate(${n(s.lean)} 0 540) translate(0 540) scale(${n(sx * 1000) / 1000} ${n(sy * 1000) / 1000}) translate(0 -540)`;
  return el('g', { transform: xf }, inner);
}

// Rig-space key points of the drawn figure (for bounds and attachments), after crouch, before
// bodyDy / lean / squash. Used by the actor to place props and to keep the cat out of rectangles.
function keyPoints(s) {
  const arms = resolveArms(s), cr = s.crouch;
  const hp = (q) => { const p = headPt(s, q); return [p[0], p[1] + cr]; };
  const pts = [hp([-262, -200]), hp([262, -200]), hp([0, -520]), hp([-206, -520]), hp([206, -520]), hp([0, -84]),
    [-170, 150 + cr], [170, 150 + cr], [-166, 346 + cr], [166, 346 + cr]];
  for (const k of ['L', 'R']) { const W = arms[k].W; pts.push([W[0] - 50, W[1] + cr - 50], [W[0] + 50, W[1] + cr + 50]); }
  for (const k of ['L', 'R']) { const J = legJoints(s, k); pts.push([J.F[0] - 60, J.F[1] + 26], [J.F[0] + 60, J.F[1] + 26]); }
  const tp = tailPath(s.tail, [70, 306], 380).pts; pts.push(...tp.filter((_, i) => i % 3 === 0).map((p) => [p[0], p[1] + cr]));
  return { pts, pawL: [arms.L.W[0], arms.L.W[1] + cr], pawR: [arms.R.W[0], arms.R.W[1] + cr], head: hp([0, -260]),
    shoulderL: [arms.L.S[0], arms.L.S[1] + cr], shoulderR: [arms.R.S[0], arms.R.S[1] + cr] };
}
// The bodyDy / lean / squash transform as a function on points (matches draw()).
function bodyXfPt(s, [x, y]) {
  const sy = 1 - s.sq, sx = 1 + s.sq * 0.75;
  let px = x * sx, py = 540 + (y - 540) * sy;
  const a = (s.lean * Math.PI) / 180, c = Math.cos(a), si = Math.sin(a);
  const rx = px * c - (py - 540) * si, ry = 540 + px * si + (py - 540) * c;
  return [rx, ry + s.bodyDy];
}

// ---------------------------------------------------------------- framing
const VIEW = {
  full: [-360, -600, 720, 1170],
  bust: [-340, -620, 680, 860],
  face: [-300, -560, 600, 520],
  peek: [-330, -580, 660, 600],
  point: [-300, -620, 780, 1190],
};

// Public API (unchanged from v2, plus `legs` and `props`). Returns a standalone <svg> string.
// drawCat({ expression, pose, legs, lookX, lookY, blink, mouthOpen, earTwitch, tail, pointAngle, edgeY, props, state }, opt)
function drawCat(p = {}, opt = {}) {
  const vb = opt.viewBox ?? VIEW[p.pose === 'peek' ? 'peek' : p.pose === 'point' ? 'point' : 'full'];
  const w = opt.width ?? Math.round(vb[2] / 2), h = opt.height ?? Math.round((w * vb[3]) / vb[2]);
  const bg = opt.bg ? el('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: opt.bg }) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(n).join(' ')}" width="${w}" height="${h}">${bg}${draw(p, opt)}${opt.inner ?? ''}</svg>`;
}

return { META, resolve, draw, keyPoints, bodyXfPt, VIEW, drawCat };
})();
const M_actor = (() => {
const { PAL, clamp, lerp, n, el, uid, state, merge, lerpState, ARMS, LEGS, EXPR, faceOf, TAIL } = M_core;
const { draw, keyPoints, bodyXfPt } = M_cat;
// actor.mjs (v3): the acting library and director for the Signal Delay cat.
// Everything is a pure function of time: actor.render(t) returns the same SVG for the same t,
// whatever order frames are rendered in (no clocks, no state carried between frames, seeded
// randomness only). Build an actor, give it a timeline, then call render(t) per frame.
//
//   import { Actor } from './rig/actor.mjs';
//   const cat = new Actor({ scale: 0.4, seed: 3 });
//   cat.timeline([
//     { t: 0.0, do: 'enter', how: 'skid', from: 'left', to: [300, 1150] },
//     { t: 1.0, do: 'point', at: [700, 600] },
//     { t: 2.2, do: 'hop', to: [640, 900] },
//     { t: 3.0, do: 'exit', how: 'zip', to: 'right' },
//   ]);
//   const svg = cat.render(t);          // <g> in frame pixels (1080 x 1920)
//
// World space: frame pixels, y down. The actor's anchor is the point between his feet (rig 0,540).
// He is never mirrored: there is no flip anywhere, so the solid disc eye stays viewer-left.



const FPS = 30;
const FEET = 540;            // rig y of the anchor
const CENTER = 150;          // rig y of the body centre (rotation pivot for tumbles)
const GRIP = [300, -180];    // rig point of the raised right paw in the 'grab' pose (rope attachment)

// ---------------------------------------------------------------- curves
function cubicBezier(x1, y1, x2, y2) {
  const B = (t, a, b) => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
  const dB = (t, a, b) => 3 * a * (1 - t) * (1 - t) + 6 * (b - a) * (1 - t) * t + 3 * (1 - b) * t * t;
  return (u) => {
    if (u <= 0) return 0; if (u >= 1) return 1;
    let t = u;
    for (let i = 0; i < 10; i++) { const d = dB(t, x1, x2); if (Math.abs(d) < 1e-6) break; t = clamp(t - (B(t, x1, x2) - u) / d, 0, 1); }
    return B(t, y1, y2);
  };
}
const EASE = {
  enter: cubicBezier(0.16, 1, 0.3, 1),   // design-system tokens (Motion.md)
  move: cubicBezier(0.76, 0, 0.24, 1),
  exit: cubicBezier(0.7, 0, 0.84, 0),
  io: (u) => { const t = clamp(u); return t * t * (3 - 2 * t); },
  out: (u) => 1 - Math.pow(1 - clamp(u), 3),
  in: (u) => Math.pow(clamp(u), 3),
  lin: (u) => clamp(u),
};
// Spring step response 0 -> 1 (overshoots), t in seconds. Motion.md formula.
function spring(t, zeta = 0.7, f = 4) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
}
// A landing impact: 1 at contact, then a damped rebound (negative = stretch), seconds.
const impact = (dt) => (dt < 0 ? 0 : dt < 0.06 ? 1 : Math.exp(-(dt - 0.06) * 8) * Math.cos((dt - 0.06) * 15));
const bump = (u) => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u));
const win = (t, a, b) => clamp((t - a) / (b - a));           // 0..1 over [a, b]
// Trapezoid-velocity progress: speeds up over the first `a`, cruises, slows over the last `a`.
function ramp(u, a = 0.2) {
  u = clamp(u); const v = 1 / (1 - a);
  if (u < a) return (v * u * u) / (2 * a);
  if (u > 1 - a) { const w = 1 - u; return 1 - (v * w * w) / (2 * a); }
  return v * (u - a / 2);
}
// Seeded hash in [0, 1).
function rnd(seed, i) {
  let h = (seed * 374761393 + i * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const qb = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];
const cb3 = (a, c1, c2, b, u) => { const m = 1 - u; return [0, 1].map((i) => m * m * m * a[i] + 3 * m * m * u * c1[i] + 3 * m * u * u * c2[i] + u * u * u * b[i]); };
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const D2R = Math.PI / 180;

// ---------------------------------------------------------------- root (world placement)
// root = { x, y, rot, k, st, sa }: anchor (feet) in frame px, rotation deg about the anchor,
// scale px per rig unit, directional stretch st along angle sa (deg) about the body centre.
const R0 = (x, y, k, o = {}) => ({ x, y, rot: 0, k, st: 0, sa: 0, ...o });
function rootPt(R, p) {           // rig point (after body transform) -> world px
  const dx = p[0] * R.k, dy = (p[1] - FEET) * R.k, c = Math.cos(R.rot * D2R), s = Math.sin(R.rot * D2R);
  let x = R.x + dx * c - dy * s, y = R.y + dx * s + dy * c;
  if (R.st) {
    const C = rootPtNoSt(R, [0, CENTER]), a = R.sa * D2R, ca = Math.cos(a), sa = Math.sin(a);
    const u = (x - C[0]) * ca + (y - C[1]) * sa, v = -(x - C[0]) * sa + (y - C[1]) * ca;
    const u2 = u * (1 + R.st), v2 = v / (1 + R.st);
    x = C[0] + u2 * ca - v2 * sa; y = C[1] + u2 * sa + v2 * ca;
  }
  return [x, y];
}
function rootPtNoSt(R, p) { return rootPt({ ...R, st: 0 }, p); }
// Feet position that puts rig point `p` at world `W` with rotation rot (deg).
function anchorFor(W, p, rot, k) {
  const dx = p[0] * k, dy = (p[1] - FEET) * k, c = Math.cos(rot * D2R), s = Math.sin(rot * D2R);
  return [W[0] - (dx * c - dy * s), W[1] - (dx * s + dy * c)];
}
function rootXf(R) {
  let xf = `translate(${n(R.x)} ${n(R.y)}) rotate(${n(R.rot)}) scale(${n(R.k * 10000) / 10000}) translate(0 ${-FEET})`;
  if (R.st > 0.002) {
    const C = rootPtNoSt(R, [0, CENTER]);
    xf = `translate(${n(C[0])} ${n(C[1])}) rotate(${n(R.sa)}) scale(${n((1 + R.st) * 1000) / 1000} ${n(1000 / (1 + R.st)) / 1000}) rotate(${n(-R.sa)}) translate(${n(-C[0])} ${n(-C[1])}) ` + xf;
  }
  return xf;
}

// ---------------------------------------------------------------- pose helpers
const S = (base, ...overs) => overs.reduce((s, o) => (o ? merge(s, o) : s), base);
const mix = (a, b, t) => lerpState(a, b, clamp(t));
const armsT = (name, over) => { const A = ARMS[name]; return over ? { armL: { ...A.armL, ...(over.armL || {}) }, armR: { ...A.armR, ...(over.armR || {}) } } : A; };
const face = (name) => faceOf(name);
// Mix only the listed keys of `b` into `a`.
function mixKeys(a, b, t, keys) {
  if (t <= 0) return a; const o = { ...a };
  for (const k of keys) o[k] = lerpState({ v: a[k] }, { v: b[k] }, clamp(t)).v;
  return o;
}
const UPPER = ['armL', 'armR', 'shoulderDy', 'tilt', 'headDx', 'headDy', 'lean', ...['earL', 'earR', 'earSqL', 'earSqR', 'lidL', 'lidR', 'lidAL', 'lidAR', 'lowL', 'lowR', 'eyeScale', 'pupil', 'pw', 'glint', 'browL', 'browR', 'mouth', 'fx', 'fxAmt']];

// ---------------------------------------------------------------- the move library
// Each builder gets (action, ctx) with ctx = { from (root at the start), k, actor } and returns
// { dur, root?(lt) -> root, pose?(lt, base, R) -> full state, look?(lt) -> [x,y], world?(lt, info) -> svg,
//   clip?(lt) -> [rects to hide him behind], shutter?(lt) -> frames, end?: root }.
// Travel moves own the root; gestures only pose. Times are seconds, lt = time since the move began.
const MOVES = {};
const offX = (side, k) => (side === 'left' ? -330 * k - 60 : 1080 + 330 * k + 60);
const sideDir = (side) => (side === 'left' ? -1 : 1);

// ---- entrances and exits -------------------------------------------------
// Slide in on a thruster skid board, skid to a stop leaning back, rock forward, kick the board away.
MOVES['enter:skid'] = (a, { k }) => {
  const to = a.to, from = a.from ?? 'left', x0 = offX(from, k), dir = Math.sign(to[0] - x0) || 1;
  const T = a.slide ?? 0.95, dur = a.dur ?? T + 0.5, lift = 30 * k;
  const X = (lt) => x0 + (to[0] - x0) * EASE.out(lt / T);
  const speed = (lt) => Math.abs(X(lt + 1 / 60) - X(lt - 1 / 60)) * 30;    // px / s
  const kick = T + 0.12;
  const boardK = (lt) => 1 - EASE.in(win(lt, kick, kick + 0.14));
  return {
    dur,
    root: (lt) => {
      const sp = clamp(speed(lt) / 1400);
      // lean back against the slide, rock forward as it stops, settle on a spring
      const settle = lt > T * 0.7 ? Math.sin((lt - T * 0.7) * 11) * Math.exp(-(lt - T * 0.7) * 5) : 0;
      const hop = lt > kick ? -46 * k * bump(win(lt, kick, kick + 0.22)) : 0;
      const rot = -dir * 13 * sp + dir * 9 * settle, bk = boardK(lt);
      // pivot on the board edge that stays on the ground (trailing edge when leaning back)
      const edge = [(rot * dir < 0 ? -dir : dir) * 156 * bk, FEET + 30 * bk];
      const W = [X(lt) + edge[0] * k, to[1] + hop];
      const A = anchorFor(W, edge, rot, k);
      return R0(A[0], A[1], k, { rot });
    },
    pose: (lt, b) => {
      const sp = clamp(speed(lt) / 1400), land = impact(lt - kick - 0.22);
      let s = S(b, LEGS.wide, armsT('balance'), face('focus'), { crouch: 34 + 26 * sp, tail: { ...TAIL.up, sway: -0.6 * sp }, lean: 0,
        props: { board: boardK(lt), boardDir: -dir, thrust: sp } });
      s = mix(s, S(b, face('happy'), armsT('relaxed')), win(lt, T, T + 0.35));
      if (lt > kick) s = S(s, { props: { ...s.props, board: boardK(lt) }, crouch: s.crouch + 26 * Math.max(0, land) * (lt > kick + 0.22 ? 1 : 0), sq: (lt > kick + 0.22 ? 0.14 * land : -0.06 * bump(win(lt, kick, kick + 0.22))) });
      return s;
    },
    world: (lt, I) => speedLines(I, clamp(speed(lt) / 1400) * (1 - win(lt, T * 0.6, T)), -dir, 0.9),
    shutter: (lt) => 0.5,
  };
};

// Drop in from above on a tether line held in the right paw, bounce on the line, touch down, let go.
MOVES['enter:drop'] = (a, { k }) => {
  const to = a.to, T = a.fall ?? 0.55, touch = T + 0.42, dur = a.dur ?? touch + 0.45;
  const anchorX = to[0] + GRIP[0] * k, y0 = -1200 * k - 100;
  const Y = (lt) => {
    if (lt < T) return lerp(y0, to[1] - 60 * k, EASE.out(lt / T));
    if (lt < touch) { const u = lt - T; return to[1] - 60 * k + 34 * k * Math.sin(u * 16) * Math.exp(-u * 6) + 60 * k * EASE.io(win(lt, touch - 0.18, touch)); }
    return to[1];
  };
  const sway = (lt) => 5 * Math.sin(lt * 6.5) * Math.exp(-lt * 2.2) * (lt < touch ? 1 : 0);
  return {
    dur,
    root: (lt) => R0(to[0], Y(lt), k, { rot: sway(lt) }),
    pose: (lt, b) => {
      const air = lt < touch - 0.05;
      let s = S(b, armsT('grab'), LEGS.dangle, face('wow'), { tail: { ...TAIL.question, a0: 24 } });
      if (!air) {
        const land = impact(lt - touch);
        s = mix(s, S(b, face('happy'), armsT('relaxed')), win(lt, touch + 0.08, touch + 0.3));
        s = S(s, { sq: 0.16 * land, crouch: 34 * Math.max(0, land) });
      } else s = mix(s, S(s, LEGS.stand), win(lt, touch - 0.2, touch - 0.05));
      return s;
    },
    world: (lt, I) => rope([anchorX, -80], lt < touch + 0.06 ? I.pawR : [I.pawR[0], I.pawR[1] - (lt - touch - 0.06) * 3600], k),
    look: (lt) => (lt < touch ? [to[0], to[1] + 300] : null),
  };
};

// Zero-g float in: drifts in along a curve, slowly tumbling, then catches himself upright.
MOVES['enter:float'] = (a, { k }) => {
  const to = a.to, from = a.from ?? 'left', dur = a.dur ?? 2.2, spin = a.spin ?? -1;
  const Cend = [to[0], to[1] - (FEET - CENTER) * k];
  const C0 = [offX(from, k), Cend[1] - 260];
  const ctrl = [lerp(C0[0], Cend[0], 0.55), Cend[1] - 260];
  const catchAt = dur * 0.62;
  const rotA = (lt) => spin * 360 * (1 - EASE.out(lt / catchAt)) + (from === 'left' ? 0 : 0);
  const ROT = (lt) => (lt < catchAt ? rotA(lt) : rotA(catchAt) * (1 - spring(lt - catchAt, 0.42, 1.6)) * (1 - EASE.io(win(lt, dur - 0.3, dur))));
  const C = (lt) => qb(C0, ctrl, Cend, EASE.out(clamp(lt / (dur * 0.9))));
  return {
    dur,
    root: (lt) => { const r = ROT(lt), A = anchorFor(C(lt), [0, CENTER], r, k); return R0(A[0], A[1], k, { rot: r }); },
    pose: (lt, b) => {
      let s = S(b, armsT('starfish'), LEGS.spread, face('wow'), { tail: { ...TAIL.up, sway: 1.2 * Math.sin(lt * 3) } });
      const c = win(lt, catchAt - 0.1, catchAt + 0.35);
      s = mix(s, S(b, armsT('balance'), face('relief'), { crouch: 10 }), c);
      s = mix(s, S(b, face('happy')), win(lt, dur - 0.35, dur));
      const land = impact(lt - dur * 0.92);
      return S(s, { sq: s.sq + 0.13 * land, crouch: s.crouch + 30 * Math.max(0, land) });
    },
    shutter: () => 0.5,
  };
};

// Pop up from behind a box: ears and eyes rise over the edge, a look around, a duck, a jump onto the top.
MOVES['enter:pop'] = (a, { k }) => {
  const box = a.box, fx = a.at ?? 0.3, to = a.to ?? [box[0] + box[2] * fx, box[1]];
  const peekY = box[1] + 720 * k, duckY = box[1] + 800 * k;
  const t1 = 0.4, t2 = 1.0, t3 = 1.12, t4 = 1.42, dur = a.dur ?? t4 + 0.4;
  const apex = box[1] - 150 * k;
  const Y = (lt) => {
    if (lt < t1) return lerp(box[1] + 1200 * k, peekY, EASE.enter(lt / t1));
    if (lt < t2) return peekY + 6 * k * Math.sin((lt - t1) * 7);
    if (lt < t3) return lerp(peekY, duckY, EASE.io(win(lt, t2, t3)));
    if (lt < t4) { const u = win(lt, t3, t4); return qb([0, duckY], [0, 2 * apex - (duckY + box[1]) / 2], [0, box[1]], u)[1]; }
    return box[1];
  };
  return {
    dur,
    root: (lt) => R0(to[0], Y(lt), k),
    pose: (lt, b) => {
      let s = S(b, face('curious'), armsT('relaxed'), { tilt: -6 });
      if (lt >= t2 && lt < t3) s = S(b, face('focus'), armsT('windup'), { sq: 0.1 * bump(win(lt, t2, t3 + 0.04)) });
      if (lt >= t3 && lt < t4) {
        const u = win(lt, t3, t4);
        s = S(b, face('excited'), armsT('up'), u < 0.5 ? LEGS.dangle : LEGS.stand, { fx: null, sq: -0.14 * bump(u), tail: TAIL.up });
      }
      if (lt >= t4) { const land = impact(lt - t4); s = mix(S(b, face('excited'), armsT('up'), { fx: null }), S(b, face('happy')), win(lt, t4 + 0.1, t4 + 0.4)); s = S(s, { sq: 0.18 * land, crouch: 40 * Math.max(0, land) }); }
      return s;
    },
    look: (lt) => (lt > t1 && lt < t2 ? [lt < (t1 + t2) / 2 ? to[0] - 600 : to[0] + 600, box[1] - 200] : null),
    clip: (lt) => (lt < (t3 + t4) / 2 ? [box] : null),
  };
};

// Zip out with anticipation and a speed smear.
MOVES['exit:zip'] = (a, { from, k }) => {
  const side = a.to ?? 'right', dir = side === 'left' ? -1 : side === 'up' ? 0 : 1, up = side === 'up';
  const A = 0.22, Z = 0.26, dur = a.dur ?? A + Z;
  const far = up ? [from.x, -1400 * k - 200] : [dir > 0 ? 1080 + 900 * k + 300 : -900 * k - 300, from.y - 40 * k];
  const P = (lt) => { const u = EASE.exit(win(lt, A, A + Z)); return [lerp(from.x, far[0], u), lerp(from.y, far[1], u)]; };
  const sp = (lt) => dist(P(lt - 1 / 60), P(lt + 1 / 60)) * 30;
  const ang = up ? -90 : dir > 0 ? 0 : 180;
  return {
    dur,
    root: (lt) => {
      const p = P(lt), back = up ? 0 : -dir * 10 * bump(win(lt, 0, A + 0.04));
      return R0(p[0], p[1], k, { rot: back + (up ? 0 : dir * 8 * win(lt, A, A + 0.08)), st: clamp(sp(lt) / 9000, 0, 0.7), sa: ang });
    },
    pose: (lt, b) => {
      let s = S(b, face('focus'), armsT('fly'), { crouch: 46 * bump(win(lt, 0, A + 0.05)), sq: 0.12 * bump(win(lt, 0, A + 0.05)) });
      if (lt > A) s = S(s, LEGS.dangle, { tail: TAIL.stream, earL: 40, earR: 40 });
      return s;
    },
    world: (lt, I) => speedLines(I, clamp(sp(lt) / 4000), up ? 0 : -dir, 1.6, up),
    shutter: (lt) => (lt > A ? 1.6 : 0.5),
  };
};
// Float out: drift away with a slow tumble.
MOVES['exit:float'] = (a, { from, k }) => {
  const side = a.to ?? 'right', dur = a.dur ?? 1.6, spin = a.spin ?? 0.6;
  const C0 = rootPt(from, [0, CENTER]), C1 = [side === 'left' ? -500 * k - 100 : 1080 + 500 * k + 100, C0[1] - 300];
  const ctrl = [lerp(C0[0], C1[0], 0.3), C0[1] - 220];
  return {
    dur,
    root: (lt) => { const u = EASE.in(lt / dur) * 0.6 + EASE.io(lt / dur) * 0.4, r = spin * 360 * EASE.in(lt / dur), A = anchorFor(qb(C0, ctrl, C1, u), [0, CENTER], r, k); return R0(A[0], A[1], k, { rot: r }); },
    pose: (lt, b) => mix(S(b, armsT('balance'), face('wow')), S(b, armsT('starfish'), LEGS.spread, face('happy')), win(lt, 0, 0.4)),
  };
};
// Jet out: launches off the top or a side with the jet pack.
MOVES['exit:jet'] = (a, ctx) => MOVES.fly({ ...a, to: a.to === 'left' ? [-400, ctx.from.y - 500] : a.to === 'up' ? [ctx.from.x + 80, -700] : [1500, ctx.from.y - 500], land: false }, ctx);
// Yanked up and out on a tether line.
MOVES['exit:tether'] = (a, { from, k }) => {
  const A = 0.3, dur = a.dur ?? 0.75, anchorX = from.x + GRIP[0] * k;
  const Y = (lt) => (lt < A ? from.y : lerp(from.y, -1400 * k - 200, EASE.exit(win(lt, A, dur))));
  return {
    dur,
    root: (lt) => R0(from.x, Y(lt), k, { rot: lt > A ? 4 * Math.sin((lt - A) * 18) : 0 }),
    pose: (lt, b) => (lt < A ? mix(b, S(b, armsT('grab'), face('wink')), win(lt, 0, 0.12)) : S(b, armsT('grab'), LEGS.dangle, face('excited'), { fx: null, sq: -0.12 })),
    world: (lt, I) => rope([anchorX, -80], lt < 0.12 ? [anchorX, lerp(-80, I.pawR[1], EASE.out(lt / 0.12))] : I.pawR, k),
    shutter: (lt) => (lt > A ? 1.2 : 0.5),
  };
};

// ---- travel -----------------------------------------------------------------
// Hop: anticipation crouch, stretch on take-off, tuck at the apex, squash on landing.
MOVES.hop = (a, { from, k }) => {
  const p0 = [from.x, from.y], p1 = a.to, d = dist(p0, p1);
  const A = 0.17, F = a.air ?? clamp(0.32 + d / 1600, 0.36, 0.8), dur = a.dur ?? A + F + 0.35;
  const apexY = Math.min(p0[1], p1[1]) - (a.height ?? Math.max(90, d * 0.28));
  const ctrl = [(p0[0] + p1[0]) / 2, 2 * apexY - (p0[1] + p1[1]) / 2];
  const dir = Math.sign(p1[0] - p0[0]);
  const P = (lt) => (lt < A ? p0 : lt < A + F ? qb(p0, ctrl, p1, (lt - A) / F) : p1);
  return {
    dur,
    root: (lt) => { const p = P(lt), u = win(lt, A, A + F); return R0(p[0], p[1], k, { rot: dir * 9 * bump(u) * (a.flip ? 0 : 1) + (a.flip ? dir * 360 * EASE.io(u) : 0) }); },
    pose: (lt, b) => {
      if (lt < A) { const e = EASE.io(lt / A); return S(b, face('focus'), armsT('windup'), { crouch: 70 * e, sq: 0.12 * e, lean: 0 }); }
      if (lt < A + F) {
        const u = (lt - A) / F;
        let s = S(b, face('keen'), armsT('up'), LEGS.dangle, { sq: -0.16 * (1 - win(u, 0, 0.35)), tail: TAIL.up });
        s = mix(s, S(b, face('keen'), armsT('tuck'), LEGS.tuck, { tail: TAIL.up }), bump(win(u, 0.2, 0.85)));
        if (u > 0.7) s = mix(s, S(b, armsT('balance'), LEGS.stand, face('wow'), { sq: -0.08 }), win(u, 0.7, 1));
        return s;
      }
      const land = impact(lt - A - F);
      const s = mix(S(b, armsT('balance'), face('wow')), b, win(lt, A + F + 0.08, A + F + 0.35));
      return S(s, { sq: 0.2 * land, crouch: 56 * Math.max(0, land) });
    },
    look: (lt) => (lt < A + F * 0.8 ? p1 : null),
    shutter: () => 0.5,
  };
};

// Walk or scamper along a line, or around a circle (a planet edge): feet step with the distance
// covered, so they never slide; body bobs twice per cycle, arms swing against the legs.
MOVES.walk = (a, { from, k }) => {
  const around = a.around; // [cx, cy, r]: walk on the outside of a circle
  let len, at;
  if (around) {
    const [cx, cy, r] = around, th0 = Math.atan2(from.x - cx, -(from.y - cy)) / D2R, th1 = a.toDeg;
    len = Math.abs(th1 - th0) * D2R * r;
    at = (u) => { const th = lerp(th0, th1, u); return { x: cx + r * Math.sin(th * D2R), y: cy - r * Math.cos(th * D2R), rot: th, dir: Math.sign(th1 - th0) }; };
  } else {
    const p1 = a.to; len = dist([from.x, from.y], p1);
    at = (u) => ({ x: lerp(from.x, p1[0], u), y: lerp(from.y, p1[1], u), rot: 0, dir: Math.sign(p1[0] - from.x) || 1 });
  }
  const scamper = a.how === 'scamper' || a.style === 'scamper';
  const speed = a.speed ?? (scamper ? 520 : 300) * (k / 0.4);
  const dur = a.dur ?? Math.max(0.6, len / speed + 0.25);
  const stride = scamper ? 70 : 90;               // rig units per step
  const U = (lt) => ramp(lt / dur, 0.22);
  return {
    dur,
    root: (lt) => { const q = at(U(lt)); return R0(q.x, q.y, k, { rot: q.rot }); },
    pose: (lt, b) => {
      const q = at(U(lt)), dir = q.dir, phi = (U(lt) * len) / k / stride * Math.PI;
      const go = Math.min(1, win(lt, 0, 0.12) * win(dur - lt, 0, 0.12) * 1.0 + 0) ;
      const lift = scamper ? 46 : 34, sw = scamper ? 22 : 16;
      const legsW = {};
      for (const [side, off] of [['legL', 0], ['legR', Math.PI]]) {
        const p = phi + off;
        legsW[side] = { fx: -dir * 30 * Math.cos(p) * go, fy: -lift * Math.max(0, Math.sin(p)) * go, b: 0.45, fa: dir * 12 * Math.max(0, Math.sin(p)) * go };
      }
      const armSw = (p) => ({ a: 88 + sw * Math.sin(p) * dir * go, r: 0.93, b: -0.3, paw: 'mitt' });
      return S(b, a.face ? face(a.face) : null, {
        legL: legsW.legL, legR: legsW.legR,
        armL: { ...b.armL, ...armSw(phi + Math.PI), tw: 0 }, armR: { ...b.armR, ...armSw(phi), tw: 0 },
        bodyDy: -12 * Math.abs(Math.sin(phi)) * go, lean: dir * (scamper ? 7 : 4) * go,
        headDy: b.headDy + 5 * Math.abs(Math.cos(phi)) * go, tilt: b.tilt + dir * 2 * go,
        tail: { ...b.tail, sway: 0.8 * Math.sin(phi) },
      });
    },
  };
};

// Ride the channel's amber dot like a scooter (the echo ring trails it), then step off.
MOVES.scoot = (a, { from, k }) => {
  const p0 = [from.x, from.y], p1 = a.to, d = dist(p0, p1), up = 134 * k;
  const on = 0.28, ride = a.ride ?? clamp(0.6 + d / 900, 0.8, 2.2), off = on + ride, dur = a.dur ?? off + 0.4;
  const via = a.via ?? [(p0[0] + p1[0]) / 2, Math.min(p0[1], p1[1]) - 30];
  const dir = Math.sign(p1[0] - p0[0]) || 1;
  const scootK = (lt) => spring(lt, 0.55, 3) * (1 - EASE.in(win(lt, off + 0.05, off + 0.25)));
  const P = (lt) => qb(p0, via, p1, EASE.move(win(lt, on, off)));
  const lift = (lt) => up * (lt < off ? EASE.out(win(lt, 0.04, on)) : 1 - EASE.io(win(lt, off, off + 0.18))) + (lt > off ? 40 * k * bump(win(lt, off, off + 0.2)) : 0);
  const vel = (lt) => (P(lt + 1 / 60)[0] - P(lt - 1 / 60)[0]) * 30;
  return {
    dur,
    root: (lt) => { const p = P(lt); return R0(p[0], p[1] - lift(lt), k, { rot: clamp(vel(lt) / 160, -10, 10) }); },
    pose: (lt, b) => {
      const v = clamp(Math.abs(vel(lt)) / 900);
      let s = S(b, armsT('scoot'), face('happy'), { crouch: 24, props: { scoot: scootK(lt) }, tail: { ...TAIL.stream, a0: lerp(10, 70, v) }, earL: 10 + 30 * v, earR: 10 + 30 * v });
      if (lt < on) s = S(s, { sq: -0.1 * bump(win(lt, 0, on)) });
      if (lt > off) { const land = impact(lt - off - 0.18); s = mix(s, S(b, face('happy'), { props: { scoot: scootK(lt) } }), win(lt, off, off + 0.15)); s = S(s, { sq: lt > off + 0.18 ? 0.15 * land : 0 }); }
      return s;
    },
    world: (lt, I) => {
      if (!(scootK(lt) > 0.02) || lt > off + 0.1) return '';
      // the echo ring follows the dot a beat behind (a signal and its delayed echo)
      const lag = 0.22, q = P(lt - lag), w = [q[0], q[1] - lift(lt - lag) + (612 - FEET) * k];
      const R = 62 * k * scootK(lt);
      return el('circle', { cx: w[0] - dir * 10 * k, cy: w[1], r: R * 19 / 22, fill: 'none', stroke: PAL.amber, 'stroke-width': R * 6 / 22 });
    },
    shutter: () => 0.5,
  };
};

// Swing on a line from above (Tarzan style, one paw), arc across and drop onto the target.
MOVES.swing = (a, { from, k }) => {
  const G = GRIP.map((v, i) => v * k + (i === 1 ? -FEET * k : 0));            // grip offset from anchor (rot 0)
  const g0 = [from.x + G[0], from.y + G[1]], g1 = [a.to[0] + G[0], a.to[1] + G[1]];
  const top = a.anchorY ?? -80;
  // anchor on the perpendicular bisector of g0-g1 at height `top`
  const mx = (g0[0] + g1[0]) / 2, my = (g0[1] + g1[1]) / 2, vx = g1[0] - g0[0], vy = g1[1] - g0[1];
  const ax = Math.abs(vx) > 1 ? mx - ((top - my) * vy) / vx : mx;
  const A = [ax, top], L = dist(A, g0);
  const th0 = Math.atan2(g0[0] - A[0], g0[1] - A[1]), th1 = Math.atan2(g1[0] - A[0], g1[1] - A[1]);
  const grab = 0.2, S1 = (a.swing ?? 1.0) + grab, dur = a.dur ?? S1 + 0.4;
  const TH = (lt) => lerp(th0, th1, EASE.move(win(lt, grab, S1)));
  return {
    dur,
    root: (lt) => {
      if (lt < grab) return R0(from.x, from.y, k);
      if (lt > S1) return R0(a.to[0], a.to[1], k);
      const th = TH(lt), u = win(lt, grab, S1), rot = (-th / D2R) * 0.7 * Math.pow(bump(u), 0.6);
      const gw = [A[0] + L * Math.sin(th), A[1] + L * Math.cos(th)];
      const F = anchorFor(gw, GRIP, rot, k);
      return R0(F[0], F[1], k, { rot });
    },
    pose: (lt, b) => {
      if (lt < grab) return mix(b, S(b, armsT('grab'), face('keen'), { crouch: 30 * bump(lt / grab) }), win(lt, 0, grab * 0.8));
      if (lt <= S1) return S(b, armsT('grab'), LEGS.dangle, face('excited'), { fx: null, tail: TAIL.stream });
      const land = impact(lt - S1);
      return S(mix(S(b, armsT('balance'), face('happy')), b, win(lt, S1 + 0.1, S1 + 0.4)), { sq: 0.18 * land, crouch: 46 * Math.max(0, land) });
    },
    world: (lt, I) => {
      if (lt < grab) return rope(A, [lerp(A[0], I.pawR[0], EASE.out(lt / grab)), lerp(A[1], I.pawR[1], EASE.out(lt / grab))], k);
      if (lt <= S1 + 0.04) return rope(A, I.pawR, k);
      const u = EASE.out(win(lt, S1, S1 + 0.3)); return u < 1 ? rope(A, [lerp(I.pawR[0], A[0], u), lerp(I.pawR[1], A[1], u)], k) : '';
    },
    shutter: () => 0.5,
  };
};

// Fly a short arc with a tiny jet pack: pack pops on, crouch, launch, tilt into the flight, land.
MOVES.fly = (a, { from, k }) => {
  const p0 = [from.x, from.y], p1 = a.to, d = dist(p0, p1), land = a.land !== false;
  const A = 0.3, F = a.air ?? clamp(0.5 + d / 1400, 0.6, 1.4), dur = a.dur ?? A + F + (land ? 0.45 : 0);
  const h = a.height ?? 160 + d * 0.25;
  const c1 = [lerp(p0[0], p1[0], 0.2), Math.min(p0[1], p1[1]) - h], c2 = [lerp(p0[0], p1[0], 0.75), Math.min(p0[1], p1[1]) - h * 0.7];
  const u = (lt) => EASE.move(win(lt, A, A + F));
  const P = (lt) => cb3(p0, c1, c2, p1, u(lt));
  const V = (lt) => { const q0 = P(lt - 1 / 60), q1 = P(lt + 1 / 60); return [(q1[0] - q0[0]) * 30, (q1[1] - q0[1]) * 30]; };
  const jetK = (lt) => spring(lt, 0.5, 3.2) * (land ? 1 - EASE.in(win(lt, A + F + 0.18, A + F + 0.36)) : 1);
  return {
    dur,
    root: (lt) => { const p = P(lt), v = V(lt); return R0(p[0], p[1], k, { rot: clamp(v[0] / 70, -24, 24) * (lt > A && lt < A + F ? 1 : 0) }); },
    pose: (lt, b) => {
      const v = V(lt), sp = clamp(Math.hypot(v[0], v[1]) / 1500);
      let s = S(b, face('focus'), armsT('fly'), { props: { jet: jetK(lt), flame: lt < A ? 0.3 * win(lt, 0.12, A) : 0.35 + 0.65 * sp } });
      if (lt < A) s = S(s, { crouch: 50 * EASE.io(win(lt, 0.08, A)), sq: 0.1 * EASE.io(win(lt, 0.08, A)) });
      else if (lt < A + F) s = S(s, LEGS.dangle, face('excited'), { fx: null, sq: -0.08 * sp, tail: TAIL.stream, earL: 20, earR: 20 });
      else { const l = impact(lt - A - F); s = S(mix(s, S(b, face('happy'), { props: s.props }), win(lt, A + F + 0.1, A + F + 0.4)), { sq: 0.16 * l, crouch: 40 * Math.max(0, l), props: { ...s.props, flame: 0.9 * (1 - win(lt, A + F, A + F + 0.2)) } }); }
      return s;
    },
    look: (lt) => (lt < A + F * 0.7 ? p1 : null),
    shutter: () => 0.5,
  };
};

// Zero-g drift between two points (no exit), with a slow tumble and a catch.
MOVES.float = (a, ctx) => {
  const { from, k } = ctx, dur = a.dur ?? 2.0, spin = a.spin ?? 0.5;
  const m = MOVES['enter:float']({ ...a, dur, from: 'left' }, ctx);
  const C0 = rootPt(from, [0, CENTER]), Cend = [a.to[0], a.to[1] - (FEET - CENTER) * k];
  const ctrl = [lerp(C0[0], Cend[0], 0.5), Math.min(C0[1], Cend[1]) - 200];
  const catchAt = dur * 0.65;
  const rotA = (lt) => from.rot + spin * 360 * EASE.io(lt / catchAt);
  const wrap = (r) => ((((r + 180) % 360) + 360) % 360) - 180;
  const ROT = (lt) => (lt < catchAt ? rotA(lt) : wrap(rotA(catchAt)) * (1 - spring(lt - catchAt, 0.42, 1.6)) * (1 - EASE.io(win(lt, dur - 0.3, dur))));
  return {
    ...m,
    dur,
    root: (lt) => { const r = ROT(lt), A = anchorFor(qb(C0, ctrl, Cend, EASE.io(clamp(lt / (dur * 0.92)))), [0, CENTER], r, k); return R0(A[0], A[1], k, { rot: r }); },
  };
};

// Slide across on the thruster skid (a travel version of the entrance).
MOVES.skid = (a, ctx) => {
  const m = MOVES['enter:skid']({ ...a, from: a.to[0] > ctx.from.x ? 'left' : 'right' }, ctx);
  const x0 = ctx.from.x, to = a.to, T = a.slide ?? 0.8, k = ctx.k, dir = Math.sign(to[0] - x0) || 1;
  const X = (lt) => x0 + (to[0] - x0) * EASE.move(lt / T);
  const r = m.root;
  return { ...m, root: (lt) => { const q = r(lt); return { ...q, x: X(lt), y: lerp(ctx.from.y, to[1], EASE.move(lt / T)) + (q.y - to[1]) }; } };
};

// ---- gestures (upper body; while travelling they only replace the arms, head and face) -------
const G = {};
function targetAngles(R, s, at) {
  // world target -> rig-local arm angle for the arm on the target's side
  const kp = keyPoints(s), c = rootPt(R, [0, CENTER]);
  const side = at[0] >= c[0] ? 'R' : 'L';
  const sh = rootPt(R, bodyXfPt(s, side === 'R' ? kp.shoulderR : kp.shoulderL));
  const wa = Math.atan2(at[1] - sh[1], at[0] - sh[0]) / D2R - R.rot - s.lean;
  return { side, a: side === 'R' ? wa : 180 - wa };
}
G.point = (a) => ({
  dur: a.dur ?? 1.3,
  pose: (lt, b, R) => {
    const { side, a: ang } = targetAngles(R, b, a.at);
    const sp = spring(lt - 0.1, 0.5, 2.6), wind = bump(win(lt, 0, 0.16));
    const arm = { a: ang + 30 * wind + (1 - sp) * 25, r: 0.75 + 0.27 * sp, b: 0.25, paw: lt < 0.08 ? 'fist' : 'point', pa: 0, tw: 0, fr: 0 };
    const other = ARMS.hips[side === 'R' ? 'armL' : 'armR'];
    return S(b, face('keen'), { [side === 'R' ? 'armR' : 'armL']: arm, [side === 'R' ? 'armL' : 'armR']: other,
      lean: b.lean + (side === 'R' ? 3 : -3) * sp, tilt: b.tilt + (side === 'R' ? 5 : -5) * sp });
  },
  look: () => a.at,
});
G.what = (a) => ({
  dur: a.dur ?? 1.2,
  pose: (lt, b) => {
    const dip = bump(win(lt, 0, 0.14)), sp = spring(lt - 0.1, 0.45, 3.2), shake = Math.sin(lt * 34) * Math.exp(-(lt - 0.2) * 4) * (lt > 0.2 ? 1 : 0);
    const arms = mix(armsT('relaxed', { armL: { a: 70 }, armR: { a: 70 } }), ARMS.what, sp);
    return S(b, face('wow'), arms, { crouch: b.crouch + 26 * dip, shoulderDy: -16 * sp, headDy: b.headDy - 10 * sp, tilt: b.tilt + 3 * shake, mouth: { w: 36, op: 0.85, rnd: 0.65, sm: 0 } });
  },
});
G.facepalm = (a) => ({
  dur: a.dur ?? 1.7,
  pose: (lt, b) => {
    const up = EASE.in(win(lt, 0.02, 0.3)), hit = impact(lt - 0.3), shake = lt > 0.55 ? Math.sin((lt - 0.55) * 2 * Math.PI * 1.6) * Math.exp(-(lt - 0.55) * 1.2) : 0;
    const arms = mix(ARMS.relaxed, ARMS.facepalm, up);
    let s = S(b, arms, mix(face('meh'), face('doh'), win(lt, 0.22, 0.32)), { tilt: b.tilt + 6 * shake + 3 * Math.max(0, hit) * (lt > 0.3 ? 1 : 0), headDy: b.headDy + 12 * up - 8 * Math.max(0, hit) * (lt > 0.3 ? 1 : 0), shoulderDy: 6 * up, crouch: b.crouch + 10 * up });
    return S(s, { armR: { ...s.armR, ty: s.armR.ty + 6 * shake } });
  },
});
G.shrug = (a) => ({
  dur: a.dur ?? 1.2,
  pose: (lt, b) => {
    const sp = spring(lt, 0.5, 3), down = EASE.io(win(lt, (a.dur ?? 1.2) - 0.3, (a.dur ?? 1.2)));
    const e = sp * (1 - down);
    return S(b, mix(b, ARMS.shrug, e), face('meh'), { shoulderDy: -22 * e, tilt: b.tilt - 9 * e, headDy: b.headDy + 8 * e });
  },
});
G.thumbs = (a) => ({
  dur: a.dur ?? 1.2,
  pose: (lt, b) => {
    const sp = spring(lt - 0.05, 0.45, 3), bob = bump(win(lt, 0.05, 0.35));
    return S(b, mix(ARMS.relaxed, ARMS.thumb, sp), face('wink'), { tilt: b.tilt + 7 * sp, bodyDy: b.bodyDy - 24 * bob, lean: b.lean + 3 * sp });
  },
});
G.sign = (a) => ({
  dur: a.dur ?? 1.8,
  pose: (lt, b, R) => {
    const sp = spring(lt - 0.06, 0.5, 2.6), card = spring(lt - 0.16, 0.45, 2.4) * (1 - EASE.in(win(lt, (a.dur ?? 1.8) - 0.22, (a.dur ?? 1.8))));
    const wig = Math.sin(lt * 5) * 2;
    return S(b, mix(ARMS.relaxed, armsT('card', { armR: { pa: wig } }), sp), face(a.face ?? 'happy'), { props: { ...b.props, card, cardText: a.text, cardSub: a.sub ?? '', cardRot: -(R.rot + b.lean - 2 * sp) * 0.85, cardScale: a.size ?? 1.5 }, tilt: b.tilt - 5 * sp, lean: b.lean - 2 * sp });
  },
});
G.card = G.sign;
G.bounce = (a) => {
  const nH = a.count ?? 3, per = a.period ?? 0.36, dur = a.dur ?? nH * per + 0.3;
  return {
    dur,
    pose: (lt, b) => {
      const i = Math.floor(lt / per), u = (lt % per) / per, hopping = i < nH;
      const air = hopping ? bump(win(u, 0.15, 0.85)) : 0, prep = hopping ? bump(win(u, 0, 0.18)) + bump(win(u, 0.82, 1)) : 0;
      const land = !hopping ? impact(lt - nH * per) * 0.6 : 0;
      return S(b, face('excited'), mix(ARMS.relaxed, ARMS.pump, hopping ? 0.4 + 0.6 * air : 1 - win(lt, nH * per, nH * per + 0.2)), {
        bodyDy: -86 * air, sq: -0.12 * air + 0.14 * prep + 0.14 * land, crouch: 30 * prep, fx: hopping ? 'spark' : null, fxAmt: air,
        legL: air > 0.5 ? LEGS.tuck.legL : LEGS.stand.legL, legR: air > 0.5 ? LEGS.tuck.legR : LEGS.stand.legR,
        tail: TAIL.up,
      });
    },
  };
};
G.gasp = (a) => ({
  dur: a.dur ?? 1.2,
  pose: (lt, b, R) => {
    const inhale = bump(win(lt, 0, 0.12)), sp = spring(lt - 0.1, 0.45, 2.8), shiver = Math.sin(lt * 50) * 0.8 * (lt > 0.3 ? 1 : 0);
    const away = a.at ? (a.at[0] > rootPt(R, [0, CENTER])[0] ? -1 : 1) : -1;
    return S(b, face('shocked'), mix(b, ARMS.cheeks, sp), {
      fx: 'shock', fxAmt: sp, lean: b.lean + away * 9 * sp + shiver, headDy: b.headDy + 8 * inhale - 22 * sp, crouch: b.crouch + 10 * inhale,
      tail: { ...TAIL.puff, sway: 0 }, bodyDy: b.bodyDy - 20 * bump(win(lt, 0.1, 0.4)),
    });
  },
  look: () => a.at ?? null,
});
G.nod = (a) => ({
  dur: a.dur ?? 1.1,
  pose: (lt, b) => {
    const nN = a.count ?? 2, u = win(lt, 0.05, 0.05 + nN * 0.32), nod = Math.max(0, Math.sin(u * nN * Math.PI * 2 - Math.PI / 2) + 1) / 2 * (u < 1 ? 1 : 0);
    return S(b, face('happy'), { headDy: b.headDy + 16 * nod, tilt: b.tilt - 4 + 2 * nod, lidL: 0.15 * nod, lidR: 0.15 * nod, twitchR: bump(win(lt, 0.4, 0.7)) });
  },
});
G.listen = (a) => ({
  dur: a.dur ?? 1.4,
  pose: (lt, b) => {
    const sp = spring(lt, 0.55, 2), drift = Math.sin(lt * 2.2) * 2;
    return S(b, face('curious'), { tilt: b.tilt - 13 * sp + drift, headDx: b.headDx - 6 * sp, headDy: b.headDy + 10 * sp, earR: 30 * sp, earL: -12 * sp, twitchL: bump(win(lt, 0.7, 1.0)) });
  },
});
G.tilt = G.listen;
G.wave = (a) => ({
  dur: a.dur ?? 1.2,
  pose: (lt, b) => {
    const sp = spring(lt, 0.5, 3), w = Math.sin(lt * 2 * Math.PI * 2.6) * win(lt, 0.1, 0.25);
    return S(b, face('happy'), mix(ARMS.relaxed, armsT('wave', { armR: { a: -60 + 16 * w, pa: 14 * w } }), sp), { tilt: b.tilt + 4 * sp });
  },
});
G.emote = (a) => ({
  dur: a.dur ?? 1.2,
  pose: (lt, b) => { const e = EXPR[a.expr ?? 'excited'], sp = spring(lt, 0.5, 2.6); return mix(b, S(b, e, { look: b.look, tail: { ...e.tail, sway: b.tail.sway } }), sp); },
});
G.idle = (a) => ({ dur: a.dur ?? 0.3, pose: (lt, b) => b });

// ---- world extras ------------------------------------------------------------
function rope(A, B, k) {
  const w = Math.max(2.4, 9 * k);
  return el('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: PAL.ink, 'stroke-width': w + 5, 'stroke-linecap': 'round' })
    + el('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: PAL.paper, 'stroke-width': w, 'stroke-linecap': 'round' });
}
// Short straight paper strokes trailing the body (no particles, no glow).
function speedLines(I, amt, dirX, len = 1, vertical = false) {
  if (amt < 0.05) return '';
  const k = I.root.k, C = rootPt(I.root, [0, CENTER]);
  let g = '';
  const rows = [-330, -120, 60, 260, 420];
  rows.forEach((ry, i) => {
    const L = (420 + 220 * ((i * 37) % 3)) * k * amt * len, off = (40 + 30 * (i % 2)) * k;
    if (vertical) {
      const x = C[0] + ry * 0.6 * k, y = C[1] + 520 * k + off;
      g += el('line', { x1: x, y1: y, x2: x, y2: y + L, stroke: PAL.paper, 'stroke-width': Math.max(2, 7 * k), 'stroke-linecap': 'round' });
    } else {
      const y = C[1] + ry * k, x = C[0] + dirX * (300 * k + off);
      g += el('line', { x1: x, y1: y, x2: x + dirX * L, y2: y, stroke: PAL.paper, 'stroke-width': Math.max(2, 7 * k), 'stroke-linecap': 'round' });
    }
  });
  return g;
}

// ---------------------------------------------------------------- Actor
class Actor {
  // o: { scale (px per rig unit, default 0.4), seed, fps, start: [x, y] (anchor before the first
  //      move; default off-screen left), safe: [x, y, w, h], avoid: [[x, y, w, h], ...],
  //      lag (frames the body follows the head, default 3), idle (false to switch idle loops off) }
  constructor(o = {}) {
    this.k = o.scale ?? 0.4; this.seed = o.seed ?? 1; this.fps = o.fps ?? FPS;
    this.start = o.start ?? [-400, 1200];
    this.safe = o.safe ?? [40, 200, 900, 1300];
    this.avoid = o.avoid ?? [];
    this.lag = (o.lag ?? 3) / this.fps;
    this.idleOn = o.idle !== false;
    this.timeline([]);
  }

  // ---- director
  // list: [{ t, do, ... }]. `do` is a move name ('enter', 'exit', 'hop', 'walk', 'scoot', 'swing',
  // 'fly', 'float', 'skid'), a gesture ('point', 'what', 'facepalm', 'shrug', 'thumbs', 'sign',
  // 'bounce', 'gasp', 'nod', 'listen', 'wave', 'emote', 'idle'), or a track change ('expr', 'look', 'say').
  timeline(list) {
    const L = [...list].sort((a, b) => a.t - b.t);
    this.list = L; this.roots = []; this.gest = []; this.faces = []; this.looks = []; this.says = [];
    let cur = R0(this.start[0], this.start[1], this.k);
    for (const a of L) {
      const key = a.do === 'enter' || a.do === 'exit' ? `${a.do}:${a.how ?? (a.do === 'enter' ? 'skid' : 'zip')}` : a.do;
      if (MOVES[key]) {
        const from = this.roots.length ? this.rootAt(a.t) : cur;
        const m = MOVES[key](a, { from, k: a.scale ?? this.k, actor: this });
        if (a.do !== 'enter') {
          // continuity: any gap between where the move starts and where he is fades out over 0.2 s
          const c0 = m.root(0), off = { x: from.x - c0.x, y: from.y - c0.y, rot: from.rot - c0.rot };
          if (Math.abs(off.x) + Math.abs(off.y) + Math.abs(off.rot) > 0.01) {
            const r = m.root;
            m.root = (lt) => { const q = r(lt), w = 1 - EASE.io(lt / 0.2); return { ...q, x: q.x + off.x * w, y: q.y + off.y * w, rot: q.rot + off.rot * w }; };
          }
        }
        const e = { a, t0: a.t, dur: m.dur, m, from, blendIn: a.blend ?? 2 / this.fps, blendOut: 0.22 };
        // a new travel move cuts the previous one
        const prev = this.roots[this.roots.length - 1]; if (prev && prev.t0 + prev.dur > a.t) prev.cut = a.t;
        this.roots.push(e);
        cur = m.root(m.dur);
      } else if (G[a.do]) {
        const g = G[a.do](a);
        this.gest.push({ a, t0: a.t, dur: g.dur, g, blendIn: a.blend ?? 4 / this.fps, blendOut: a.blendOut ?? 0.25 });
      } else if (a.do === 'expr') this.faces.push({ t0: a.t, name: a.expr ?? a.name ?? 'neutral', blend: a.blend ?? 5 / this.fps });
      else if (a.do === 'look') this.looks.push({ t0: a.t, at: a.at ?? null, blend: a.blend ?? 4 / this.fps });
      else if (a.do === 'say') this.says.push({ t0: a.t, words: a.words ?? wordsFrom(a.text ?? '', a.t, a.wps ?? 2.6) });
      else throw new Error(`actor: unknown move "${a.do}${a.how ? ':' + a.how : ''}"`);
    }
    this.endRoot = cur;
    return this;
  }

  // ---- tracks
  _rootEntry(t) { let e = null; for (const r of this.roots) if (r.t0 <= t) e = r; return e; }
  rootAt(t) {
    const e = this._rootEntry(t);
    if (!e) return R0(this.start[0], this.start[1], this.k);
    const lt = Math.min(t - e.t0, e.dur);
    return e.m.root(Math.max(0, lt));
  }
  _face(t) {
    let i = -1; for (let j = 0; j < this.faces.length; j++) if (this.faces[j].t0 <= t) i = j;
    if (i < 0) return face('neutral');
    const f = this.faces[i], cur = face(f.name), prev = i > 0 ? face(this.faces[i - 1].name) : face('neutral');
    return lerpState(prev, cur, EASE.io((t - f.t0) / f.blend));
  }
  _travel(t, base, R) {
    const e = this._rootEntry(t);
    if (!e || !e.m.pose) return base;
    const lt = t - e.t0, end = e.cut != null ? e.cut - e.t0 : e.dur;
    if (lt > end + e.blendOut) return base;
    let s = e.m.pose(Math.min(lt, end), base, R);
    if (lt > end) s = mix(s, base, EASE.io((lt - end) / e.blendOut));
    if (lt < e.blendIn) s = mix(base, s, EASE.io(lt / e.blendIn));
    return s;
  }
  _gesture(t, i, base, R) {
    if (i < 0) return base;
    const e = this.gest[i], lt = t - e.t0;
    const next = this.gest[i + 1], end = next && next.t0 < e.t0 + e.dur ? next.t0 - e.t0 : e.dur;
    let s;
    if (lt > end + e.blendOut) s = base;
    else {
      s = e.g.pose(Math.min(lt, end + (lt > end ? 0 : 0)), base, R);
      if (lt > end) s = mix(s, base, EASE.io((lt - end) / e.blendOut));
    }
    if (lt < e.blendIn) s = mix(this._gesture(t, i - 1, base, R), s, EASE.io(lt / e.blendIn));
    return s;
  }
  _gestIndex(t) { let i = -1; for (let j = 0; j < this.gest.length; j++) if (this.gest[j].t0 <= t) i = j; return i; }
  _moving(t) { const e = this._rootEntry(t); return e && t - e.t0 < (e.cut != null ? e.cut - e.t0 : e.dur); }
  _lookTarget(t) {
    // gesture or move targets win, then the look track; null = the camera
    const gi = this._gestIndex(t);
    if (gi >= 0) { const e = this.gest[gi]; if (e.g.look && t - e.t0 < e.dur) { const p = e.g.look(t - e.t0); if (p) return p; } }
    const re = this._rootEntry(t);
    if (re && re.m.look && t - re.t0 < re.dur) { const p = re.m.look(t - re.t0); if (p) return p; }
    let L = null; for (const l of this.looks) if (l.t0 <= t) L = l;
    return L ? L.at : null;
  }
  _lookVec(t, R, s) {
    const at = this._lookTarget(t);
    if (!at) return [0, 0];
    const h = rootPt(R, bodyXfPt(s, keyPoints(s).head));
    return [clamp((at[0] - h[0]) / 320, -1, 1), clamp((at[1] - h[1]) / 320, -1, 1)];
  }
  _lookSmooth(t, R, s) {
    // blend over a few frames whenever the target changes: average of recent samples (pure)
    let acc = [0, 0], wsum = 0;
    for (let i = 0; i < 4; i++) { const w = 4 - i, v = this._lookVec(t - i / this.fps, R, s); acc = [acc[0] + v[0] * w, acc[1] + v[1] * w]; wsum += w; }
    return [acc[0] / wsum, acc[1] / wsum];
  }

  // Raw pose at t (no follow-through, no idle): face track + travel + gestures.
  _raw(t, R) {
    let base = merge(state({}), this._face(t));
    base = merge(base, { armL: ARMS.relaxed.armL, armR: ARMS.relaxed.armR });
    const trav = this._travel(t, base, R);
    const gi = this._gestIndex(t);
    if (gi < 0) return trav;
    const g = this._gesture(t, gi, trav, R);
    // while travelling, gestures only own the upper body
    return this._moving(t) ? mixKeys(trav, g, 1, UPPER) : g;
  }

  // Follow-through: a damped spring driven by the root's velocity changes (pure: sums the past).
  _drag(t) {
    const dt = 1 / this.fps, N = 18, z = 0.32, f = 2.2, w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    const vel = (tt) => { const a = this.rootAt(tt - 1 / 120), b = this.rootAt(tt + 1 / 120); return [(b.x - a.x) * 60, (b.y - a.y) * 60]; };
    let v1 = vel(t), out = [0, 0];
    for (let i = 0; i < N; i++) {
      const v0 = vel(t - (i + 1) * dt), dv = [v1[0] - v0[0], v1[1] - v0[1]], tau = (i + 0.5) * dt;
      const h = Math.exp(-z * w * tau) * Math.sin(wd * tau);
      out = [out[0] + dv[0] * h, out[1] + dv[1] * h]; v1 = v0;
    }
    return [out[0] / this.k, out[1] / this.k]; // rig units / s
  }

  // ---- the resolved state at t: { R (root), s (full rig state), lookAt }
  stateAt(t) {
    const R = this.rootAt(t);
    const s0 = this._raw(t, R);
    const sl = this._raw(t - this.lag, this.rootAt(t - this.lag));
    // overlapping action: head and face at t, arms / shoulders / lean / tail follow `lag` later
    let s = { ...s0, armL: sl.armL, armR: sl.armR, shoulderDy: sl.shoulderDy, tail: { ...sl.tail }, earL: lerp(s0.earL, sl.earL, 0.5), earR: lerp(s0.earR, sl.earR, 0.5) };
    if (this._moving(t)) s.lean = sl.lean;
    // follow-through from the root's motion
    const [dx, dy] = this._drag(t);
    s.tail = { ...s.tail, sway: s.tail.sway + clamp(-dx / 900, -1.6, 1.6) };
    s.earL += clamp(dy / 60 + dx / 120, -24, 30); s.earR += clamp(dy / 60 - dx / 120, -24, 30);
    s.tilt += clamp(-dx / 700, -4, 4); s.headDy += clamp(dy / 200, -12, 12);
    // idle loops
    if (this.idleOn) this._idle(t, s);
    // look: eyes at t, head turns with the lagged look
    const lv = this._lookSmooth(t, R, s0), lh = this._lookSmooth(t - this.lag, this.rootAt(t - this.lag), sl);
    s.look = [clamp(s.look[0] * 0.3 + lv[0], -1, 1), clamp(s.look[1] * 0.3 + lv[1], -1, 1)];
    s.headDx += lh[0] * 10; s.tilt += lh[0] * 4; s.headDy += lh[1] * 6;
    // talking
    const tk = this._talk(t); s.talk = Math.max(s.talk, tk.open); s.headDy += tk.bob * 9; s.tilt += tk.tilt * 3;
    s.browL = { ...s.browL, dy: s.browL.dy - 10 * tk.bob }; s.browR = { ...s.browR, dy: s.browR.dy - 10 * tk.bob };
    return { R, s };
  }
  _idle(t, s) {
    const b = Math.sin(2 * Math.PI * 0.42 * t + this.seed);
    s.shoulderDy += 3 * b; s.headDy += 2.5 * b; s.sq += 0.008 * b;
    s.tail = { ...s.tail, sway: s.tail.sway + 0.45 * Math.sin(2 * Math.PI * 0.5 * t + 1) + 0.2 * Math.sin(2 * Math.PI * 1.3 * t) };
    s.blink = Math.max(s.blink, this._blink(t));
    const [tl, tr] = this._flick(t); s.twitchL = Math.max(s.twitchL, tl); s.twitchR = Math.max(s.twitchR, tr);
    s.look = [s.look[0] + 0.04 * Math.sin(t * 1.7 + this.seed), s.look[1] + 0.03 * Math.sin(t * 1.1)];
  }
  // Blinks on a varied, seeded schedule (1.5 to 4.2 s apart, some doubles): close 2 frames, hold 1, open 3.
  _blink(t) {
    let tb = 0.6 + rnd(this.seed, 0) * 1.4, i = 0, v = 0;
    while (tb < t + 1 && i < 400) {
      const f = (t - tb) * 30, one = (f) => (f < 0 || f > 6 ? 0 : f < 2 ? f / 2 : f < 3 ? 1 : 1 - (f - 3) / 3);
      v = Math.max(v, one(f));
      if (rnd(this.seed, i * 7 + 3) < 0.22) v = Math.max(v, one(f - 8));
      tb += 1.5 + rnd(this.seed, i + 11) * 2.7; i++;
    }
    return v;
  }
  _flick(t) {
    let tf = 1.2 + rnd(this.seed, 99) * 2, i = 0, L = 0, R = 0;
    while (tf < t + 1 && i < 400) {
      const f = (t - tf) * 30, v = f < 0 || f > 9 ? 0 : f < 2 ? f / 2 : Math.max(0, Math.cos(((f - 2) / 7) * Math.PI * 1.5) * (1 - (f - 2) / 7));
      if (rnd(this.seed, i + 200) < 0.5) L = Math.max(L, v); else R = Math.max(R, v);
      tf += 1.8 + rnd(this.seed, i + 300) * 2.8; i++;
    }
    return [L, R];
  }
  _talk(t) {
    for (const sy of this.says) for (let i = 0; i < sy.words.length; i++) {
      const w = sy.words[i];
      if (t >= w.s - 0.2 && t < w.e + 0.2) {
        const bobW = w.stress ? Math.exp(-Math.pow((t - w.s - 0.07) / 0.08, 2)) : 0;
        let open = 0;
        if (t >= w.s && t < w.e) {
          const nS = syllables(w.w), ph = ((t - w.s) / Math.max(0.05, w.e - w.s)) * nS;
          open = (0.12 + 0.6 * Math.pow(Math.sin(Math.PI * (ph % 1)), 0.8)) * (w.stress ? 1.2 : 1);
        }
        return { open: clamp(open), bob: bobW, tilt: bobW * (i % 2 ? 1 : -1) };
      }
    }
    return { open: 0, bob: 0, tilt: 0 };
  }

  // ---- output
  // SVG <g> in frame pixels: world extras (ropes, echo ring, speed lines) behind the cat, then the cat.
  render(t, opt = {}) {
    const { R, s } = this.stateAt(t);
    if (R.x < -2000 || R.x > 3080 || R.y < -2600 || R.y > 4500) return '';
    const kp = keyPoints(s), I = { root: R, pawR: rootPt(R, bodyXfPt(s, kp.pawR)), pawL: rootPt(R, bodyXfPt(s, kp.pawL)) };
    let world = '', clip = null;
    const e = this._rootEntry(t);
    if (e) {
      const lt = t - e.t0;
      if (e.m.world && lt <= e.dur + 0.5) world += e.m.world(Math.min(lt, e.dur + 0.5), I);
      if (e.m.clip && lt <= e.dur) clip = e.m.clip(lt);
    }
    const cat = `<g transform="${rootXf(R)}">${draw(s, opt)}</g>`;
    let out = world + cat;
    if (clip && clip.length) {
      const id = uid('ac');
      const d = 'M-4000,-4000 H6000 V6000 H-4000 Z ' + clip.map(([x, y, w, h]) => `M${n(x)},${n(y)} h${n(w)} v${n(h)} h${n(-w)} Z`).join(' ');
      out = `<clipPath id="${id}"><path d="${d}" clip-rule="evenodd"/></clipPath><g clip-path="url(#${id})">${out}</g>`;
    }
    return `<g class="actor">${out}</g>`;
  }
  // World bounding box [x, y, w, h] of the drawn figure at t (props on the rig included roughly).
  box(t) {
    const { R, s } = this.stateAt(t);
    const pts = keyPoints(s).pts.map((p) => rootPt(R, bodyXfPt(s, p)));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
  }
  // Recommended number of sub-frame samples for motion blur at t (1 = no blur), and the shutter.
  blur(t) {
    const e = this._rootEntry(t), lt = e ? t - e.t0 : 0;
    const shutter = e && e.m.shutter && lt <= e.dur ? e.m.shutter(lt) : 0.5;
    const a = this._probe(t), b = this._probe(t - shutter / this.fps);
    let mx = 0; for (let i = 0; i < a.length; i++) mx = Math.max(mx, dist(a[i], b[i]));
    // only fast moves blur (12 px or more per shutter); samples at most 1.5 px apart up to 16, because
    // the 3 px keylines turn into separate ghost lines when samples are further apart
    return { n: mx < 12 ? 1 : Math.max(4, Math.min(16, Math.ceil(mx / 1.5))), shutter };
  }
  _probe(t) {
    const { R, s } = this.stateAt(t), kp = keyPoints(s);
    return [kp.head, kp.pawL, kp.pawR, [0, 520], [0, CENTER]].map((p) => rootPt(R, bodyXfPt(s, p)));
  }
  // Frames where the cat overlaps any rectangle (caption boxes, photo subjects) or leaves the safe
  // zone while not entering or exiting. Standing on top of a rectangle (feet on its top edge) is fine.
  lint(t0, t1, rects = this.avoid, { tol = 6, safe = this.safe } = {}) {
    const out = [];
    for (let f = Math.round(t0 * this.fps); f <= Math.round(t1 * this.fps); f++) {
      const t = f / this.fps, b = this.box(t), e = this._rootEntry(t);
      const exiting = e && (e.a.do === 'enter' || e.a.do === 'exit') && t - e.t0 < e.dur;
      const clip = e && e.m.clip && t - e.t0 <= e.dur ? e.m.clip(t - e.t0) : null;
      rects.forEach((r, i) => {
        if (clip && clip.some((c) => c === r)) return;
        const ox = Math.min(b[0] + b[2], r[0] + r[2]) - Math.max(b[0], r[0]);
        const oy = Math.min(b[1] + b[3], r[1] + r[3]) - Math.max(b[1], r[1]);
        if (ox > tol && oy > tol) out.push({ frame: f, rect: i, overlap: [Math.round(ox), Math.round(oy)] });
      });
      if (safe && !exiting) {
        const inside = b[0] >= safe[0] - tol && b[1] >= safe[1] - tol && b[0] + b[2] <= safe[0] + safe[2] + tol && b[1] + b[3] <= safe[1] + safe[3] + tol;
        if (!inside) out.push({ frame: f, rect: 'safe', box: b.map(Math.round) });
      }
    }
    return out;
  }
  // Size of the standing figure at this scale, relative to the anchor: [left, top, right, bottom] px.
  extent() { const k = this.k; return [-280 * k, -1080 * k, 330 * k, 30 * k]; }
  // Anchor point that puts the standing figure near `p` without touching `avoid` and inside `safe`.
  fit(p, { avoid = this.avoid, safe = this.safe, pad = 12 } = {}) {
    const [l, tp, r, bt] = this.extent();
    const boxAt = (q) => [q[0] + l - pad, q[1] + tp - pad, r - l + 2 * pad, bt - tp + 2 * pad];
    const hits = (q) => avoid.some((R) => { const b = boxAt(q); return b[0] < R[0] + R[2] && b[0] + b[2] > R[0] && b[1] < R[1] + R[3] && b[1] + b[3] > R[1]; });
    const clampQ = (q) => (safe ? [clamp(q[0], safe[0] - l, safe[0] + safe[2] - r), clamp(q[1], safe[1] - tp, safe[1] + safe[3] - bt)] : q);
    let best = clampQ(p);
    if (!hits(best)) return best;
    const cands = [];
    for (const R of avoid) {
      cands.push([p[0], R[1]], [R[0] - r - pad, p[1]], [R[0] + R[2] - l + pad, p[1]], [p[0], R[1] + R[3] - tp + pad]);
    }
    const ok = cands.map(clampQ).filter((q) => !hits(q)).sort((a, b) => dist(a, p) - dist(b, p));
    return ok[0] ?? best;
  }
}

// ---------------------------------------------------------------- placement helpers
// Anchor on top of a rectangle, `f` = 0..1 across it.
const standOn = (rect, f = 0.5) => [rect[0] + rect[2] * f, rect[1]];
// Anchor on the edge of a circle (a planet) at angle deg (0 = top, 90 = right); rotate with {rot: deg}.
const onCircle = ([cx, cy, r], deg) => [cx + r * Math.sin(deg * D2R), cy - r * Math.cos(deg * D2R)];
// Words with times from plain text at a steady rate (words per second); *word* marks stress.
function wordsFrom(text, t0, wps = 2.6) {
  const ws = text.split(/\s+/).filter(Boolean); let t = t0;
  return ws.map((w) => { const d = (0.18 + 0.07 * syllables(w)) * (2.6 / wps); const o = { w: w.replace(/\*/g, ''), s: t, e: t + d, stress: /^\*.*\*[.,!?]?$/.test(w) }; t += d + 0.06; return o; });
}
function syllables(w) { const m = String(w).toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g); return Math.max(1, m ? m.length : 1); }

// Motion blur by sub-frame averaging: renders `frame(tt)` n times across the shutter (frames) and
// averages them. Each sample must be an opaque full frame (draw the background in it). Samples are
// stacked with opacity 1/(i+1), which is an exact average, in nested groups of at most four:
// Chromium composites each layer in 8 bits and longer flat stacks drift by up to 2 levels.
// n is rounded to 1, 2, 3, 4, 8, 12 or 16.
function motionBlur(frame, t, nS = 1, shutter = 0.5, fps = FPS) {
  const N = nS <= 4 ? Math.max(1, Math.round(nS)) : nS <= 8 ? 8 : nS <= 12 ? 12 : 16;
  if (N <= 1) return frame(t);
  const samples = [];
  for (let i = 0; i < N; i++) samples.push(t - ((shutter / fps) * i) / (N - 1));
  const stack = (items) => items.map((s, i) => `<g opacity="${n((1 / (i + 1)) * 10000) / 10000}">${s}</g>`).join('');
  if (N <= 4) return stack(samples.map(frame));
  const groups = [];
  for (let g = 0; g < N / 4; g++) groups.push(stack(samples.slice(g * 4, g * 4 + 4).map(frame)));
  return stack(groups);
}
const MOVE_NAMES = Object.keys(MOVES);
const GESTURE_NAMES = Object.keys(G);

return { FPS, EASE, spring, impact, bump, ramp, rnd, rootPt, Actor, standOn, onCircle, wordsFrom, syllables, motionBlur, MOVE_NAMES, GESTURE_NAMES };
})();
