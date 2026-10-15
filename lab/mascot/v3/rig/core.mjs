// core.mjs (v3): shared math, state, presets and face/limb builders for the Signal Delay cat.
// Pure functions from numbers to SVG strings. No DOM, no randomness, so any frame can be
// re-rendered exactly. Coordinates: origin at the collar (base of the neck), y down, feet on y 540.
// The figure spans roughly x -330..330, y -560..560.
// v3 changes against v2: limbs are numeric specs solved by two-bone IK (arms and legs blend
// smoothly between any two poses), new crouch / squash / lean channels, a thumbs-up paw, props,
// extra faces for the acting library. The eyes, brows, mouth and effects are unchanged from v2.

export const PAL = { ink: '#0B0B0C', paper: '#F2EFE8', amber: '#F5B83D', muted: '#8C8A85' };

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}
// Derived tones (only mixes of the four brand colours).
export const TONE = {
  earIn: mix(PAL.amber, PAL.ink, 0.56),   // warm dark amber inside the ears
  tongue: mix(PAL.amber, PAL.ink, 0.45),  // a lighter warm tone for the tongue
};

// Line weights used everywhere (in rig units; the full figure is about 1100 units tall).
export const LW = { key: 8, rim: 4, line: 7, band: 14 };

let _id = 0;
export const uid = (p = 'k') => `${p}${(++_id).toString(36)}`;
export const n = (v) => Math.round(v * 10) / 10;
export const P = (p) => `${n(p[0])},${n(p[1])}`;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;

export function rotP([x, y], [cx, cy], d) {
  const a = rad(d), c = Math.cos(a), s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}
export function attrs(o) {
  return Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${typeof v === 'number' ? n(v) : v}"`)
    .join(' ');
}
export const el = (tag, o = {}, inner = '') => (inner === '' && tag !== 'g' && tag !== 'clipPath'
  ? `<${tag} ${attrs(o)}/>` : `<${tag} ${attrs(o)}>${inner}</${tag}>`);

// Smooth closed/open path through points (Catmull-Rom converted to cubic Bezier).
export function smoothPath(pts, closed = false) {
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
export const ARM0 = { a: 88, r: 0.95, b: -0.2, paw: 'mitt', pa: 0, fr: 0, tx: 0, ty: 0, tw: 0, th: 0 };
export const LEG0 = { fx: 0, fy: 0, b: 0.35, fa: 0 };
export const TAIL0 = { a0: 2, bend: -9, curl: 44, puff: 1, wave: 0, sway: 0 };
export const PROPS0 = {
  board: 0, boardDir: 1, thrust: 0,   // thruster skid board under the feet; boardDir = side of the nozzle (-1 left, 1 right)
  jet: 0, flame: 0,                   // jet pack canisters behind the shoulders, flame length 0..1
  card: 0, cardText: '', cardSub: '', // sign on a stick in the right paw (0..1 = pops up)
  scoot: 0,                           // the amber-dot scooter (deck, stem, handlebar, wheel)
};
export const DEFAULT = {
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
export function state(over = {}) {
  const s = { ...DEFAULT, ...over };
  for (const k of NESTED) s[k] = { ...DEFAULT[k], ...(over[k] || {}) };
  s.look = [...(over.look || DEFAULT.look)];
  return s;
}
// Merge partial overrides onto a full state (nested objects merge one level deep).
export function merge(base, over = {}) {
  const s = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && NESTED.includes(k)) s[k] = { ...base[k], ...v };
    else if (Array.isArray(v)) s[k] = [...v];
    else s[k] = v;
  }
  return s;
}
// Linear blend between two states (numbers only; strings switch at t = 0.5).
export function lerpState(a, b, t) {
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
export const ARMS = {
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
export const LEGS = {
  stand: { legL: leg({}), legR: leg({}) },
  dangle: { legL: leg({ fy: 16, b: 0.15, fa: 16 }), legR: leg({ fy: 10, b: 0.15, fa: -12 }) },
  tuck: { legL: leg({ fy: -86, b: 1, fa: 10 }), legR: leg({ fy: -86, b: 1, fa: -10 }) },
  spread: { legL: leg({ fx: -64, fy: -24, b: 0.5, fa: 24 }), legR: leg({ fx: 64, fy: -24, b: 0.5, fa: -24 }) },
  wide: { legL: leg({ fx: -26, b: 0.6 }), legR: leg({ fx: 26, b: 0.6 }) },
};

// ---------------------------------------------------------------- expressions
// Neutral plus the six sheet expressions. Each is a full state; `faceOf` keeps only the face part,
// which is what the actor's expression track uses (gestures supply the body).
export const EXPR = {
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
export const EXPR_ORDER = ['curious', 'excited', 'shocked', 'sad', 'skeptical', 'angry'];
export const EXPR_LABEL = { neutral: 'NEUTRAL', curious: 'CURIOUS', excited: 'EXCITED', shocked: 'SHOCKED', sad: 'SAD', skeptical: 'SKEPTICAL', angry: 'ANGRY' };
export const EXPR_NOTE = {
  curious: 'TILT -12 · EAR R 28 · LOOK UP-RIGHT',
  excited: 'HOP -44 · SQUINT 0.5 · GRIN + FANG',
  shocked: 'EYES 1.3 · PUPIL DOT · EARS -26',
  sad: 'LIDS 0.52 SLANT -22 · EARS 56',
  skeptical: 'RING LID 0.6 · BROWS SPLIT · PAW ON HIP',
  angry: 'LIDS SLANT +26 · EARS FLAT · FANGS',
};
export const FACE_KEYS = ['earL', 'earR', 'earSqL', 'earSqR', 'lidL', 'lidR', 'lidAL', 'lidAR', 'lowL', 'lowR',
  'eyeScale', 'pupil', 'pw', 'glint', 'browL', 'browR', 'mouth', 'fx', 'fxAmt'];
export function faceOf(name) {
  const e = typeof name === 'object' ? state(name) : (EXPR[name] ?? EXPR.neutral);
  const o = {}; for (const k of FACE_KEYS) o[k] = (e[k] && typeof e[k] === 'object') ? { ...e[k] } : e[k];
  return o;
}

// ---------------------------------------------------------------- skeleton
export const NECK_TOP = [0, -84];
export function headXf(s) { return `rotate(${n(s.tilt)} ${NECK_TOP[0]} ${NECK_TOP[1]}) translate(${n(s.headDx)} ${n(s.headDy)})`; }
export function headPt(s, p) { return rotP([p[0] + s.headDx, p[1] + s.headDy], NECK_TOP, s.tilt); }

export const SHOULDER = [128, 40];
export const BONE = 120;            // upper arm and forearm length
export const HIP = [50, 320], FOOT = [58, 514], LEG_BONE = 100;
const angDiff = (a, b) => ((b - a + 540) % 360) - 180;
const ang = (a, b) => deg(Math.atan2(b[1] - a[1], b[0] - a[0]));

// Resolve one arm spec to joints in body space (before crouch): { S, E, W, paw, pa (deg), fr }.
// Joints are computed in a mirrored "outward" frame, so a left-arm spec equals the right-arm spec.
export function armJoints(s, side) {
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
export function resolveArms(s) {
  const L = armJoints(s, 'L'), R = armJoints(s, 'R');
  return { L, R };
}
// Legs: hip in body space (moves with crouch), foot in ground space. Returns {H, K, F, fa}.
export function legJoints(s, side) {
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
export function pawShapes(type, th = 1) {
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
export const TAIL = {
  neutral: { a0: 2, bend: -9, curl: 44, puff: 1, wave: 0 },
  question: { a0: -4, bend: -16, curl: 36, puff: 1, wave: 0 },
  up: { a0: -48, bend: -4, curl: 30, puff: 1, wave: 0 },
  puff: { a0: -70, bend: 1, curl: 0, puff: 1.9, wave: 0 },
  down: { a0: 26, bend: 5, curl: -14, puff: 0.95, wave: 0 },
  flick: { a0: -14, bend: -6, curl: 40, puff: 1, wave: 0 },
  lash: { a0: -46, bend: 0, curl: 0, puff: 1.45, wave: 1 },
  stream: { a0: 60, bend: 2, curl: 10, puff: 1, wave: 0 },
};
export function tailSpec(t, base = TAIL0) {
  if (t == null) return { ...TAIL0, ...base };
  if (typeof t === 'string') return { ...TAIL0, ...(TAIL[t] || TAIL.neutral), sway: 0 };
  if (typeof t === 'number') return { ...TAIL0, ...base, sway: t };
  return { ...TAIL0, ...base, ...t };
}
export function tailPath(spec, base = [64, 300], len = 330, w0 = 30, w1 = 19) {
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
export function eyes(s, o) {
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

export function brows(s, o) {
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
export function mouth(m, o) {
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
export function fx(s, o) {
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
