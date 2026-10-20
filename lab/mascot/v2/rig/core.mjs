// core.mjs (v2): shared math, state, presets and face/limb builders for the Signal Delay cat.
// Pure functions from numbers to SVG strings. No DOM, no randomness, so any frame can be
// re-rendered exactly. Coordinates: origin at the collar (base of the neck), y down.
// The figure spans roughly x -330..330, y -560..560.

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
// Every field is a number (or a small object of numbers) except the named presets for
// arms / paws / tail / fx, which resolve to numbers at draw time (see resolveArms, tailSpec).
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
  arms: 'down', tail: 'neutral',
  bodyDy: 0, lean: 0, shoulderDy: 0,
  fx: null, fxAmt: 1,
  pointAngle: -30, edgeY: -40,
};
export function state(over = {}) {
  return {
    ...DEFAULT, ...over,
    browL: { ...DEFAULT.browL, ...(over.browL || {}) },
    browR: { ...DEFAULT.browR, ...(over.browR || {}) },
    mouth: { ...DEFAULT.mouth, ...(over.mouth || {}) },
  };
}

// ---------------------------------------------------------------- presets
// Neutral plus the six sheet expressions. Each is a plain set of numbers.
export const EXPR = {
  neutral: state({}),
  curious: state({
    tilt: -12, headDx: -4, headDy: 14, earL: -10, earR: 28, look: [0.6, -0.55], lidL: 0.04, lidR: 0.04,
    browL: { dy: -26, a: -10 }, browR: { dy: -4, a: 8 }, mouth: { w: 13, op: 0.34, rnd: 1, sm: 0 },
    arms: 'chin', tail: 'question', lean: -1.5,
  }),
  excited: state({
    tilt: 7, headDy: -16, earL: -20, earR: -20, pupil: 'round', pw: 1.15, lowL: 0.5, lowR: 0.5, eyeScale: 1.06,
    browL: { dy: -40, a: -6 }, browR: { dy: -40, a: -6 }, mouth: { w: 64, sm: 1, op: 0.9, rnd: 0, fang: 1 },
    arms: 'up', tail: 'up', bodyDy: -44, fx: 'spark',
  }),
  shocked: state({
    headDy: -24, eyeScale: 1.3, pupil: 'dot', pw: 0.6, earL: -26, earR: -26, glint: 0,
    browL: { dy: -58, a: -8 }, browR: { dy: -58, a: -8 }, mouth: { w: 42, op: 1, rnd: 1, sm: 0 },
    arms: 'cheeks', tail: 'puff', bodyDy: -26, fx: 'shock',
  }),
  sad: state({
    tilt: 8, headDy: 18, earL: 56, earR: 56, lidL: 0.52, lidR: 0.52, lidAL: -22, lidAR: -22, look: [0, 0.5],
    browL: { dy: -8, a: -24 }, browR: { dy: -8, a: -24 }, mouth: { w: 30, sm: -1, op: 0 },
    arms: 'limp', tail: 'down', bodyDy: 10, shoulderDy: 10, fx: 'tear',
  }),
  skeptical: state({
    tilt: -7, earL: 6, earR: 30, lidL: 0.16, lidR: 0.6, lidAR: -4, look: [-0.6, 0.05],
    browL: { dy: -38, a: -14 }, browR: { dy: 14, a: 18 }, mouth: { w: 32, sm: 0.1, sk: 1 },
    arms: 'hip1', tail: 'flick',
  }),
  angry: state({
    headDy: 8, earL: 64, earR: 64, earSqL: 0.82, earSqR: 0.82, lidL: 0.42, lidR: 0.42, lidAL: 26, lidAR: 26,
    pupil: 'round', pw: 0.75, look: [0, 0.15], glint: 0,
    browL: { dy: 8, a: 28 }, browR: { dy: 8, a: 28 }, mouth: { w: 46, sm: -0.9, op: 0.5, rnd: 0, fang: 2 },
    arms: 'hips', tail: 'lash', fx: 'anger',
  }),
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

// Linear blend between two states (numbers only; named presets switch at t = 0.5).
export function lerpState(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) {
    const va = a[k], vb = b[k];
    if (typeof va === 'number' && typeof vb === 'number') out[k] = lerp(va, vb, t);
    else if (Array.isArray(va) && Array.isArray(vb)) out[k] = va.map((v, i) => lerp(v, vb[i], t));
    else if (va && vb && typeof va === 'object') out[k] = lerpState(va, vb, t);
    else out[k] = t < 0.5 ? va : vb;
  }
  return out;
}

// ---------------------------------------------------------------- skeleton
export const NECK_TOP = [0, -84];
export function headXf(s) { return `rotate(${n(s.tilt)} ${NECK_TOP[0]} ${NECK_TOP[1]}) translate(${n(s.headDx)} ${n(s.headDy)})`; }
export function headPt(s, p) { return rotP([p[0] + s.headDx, p[1] + s.headDy], NECK_TOP, s.tilt); }

// Arm joints for the viewer-left (L, x<0) and viewer-right (R, x>0) arm:
// [shoulder, elbow, wrist], plus the paw type and the paw's pointing angle (deg, 0 = +x).
const SH = [128, 40];
const mir = (arm) => arm.map(([x, y]) => [-x, y]);
const ang = (a, b) => deg(Math.atan2(b[1] - a[1], b[0] - a[0]));
export function resolveArms(s) {
  const sx = SH[0], sy = SH[1] + s.shoulderDy;
  let L, R, front = false, pawL = 'mitt', pawR = 'mitt', aL = null, aR = null;
  switch (s.arms) {
    case 'up':
      R = [[sx, sy], [sx + 120, sy - 60], [sx + 150, sy - 205]]; L = mir(R); pawL = pawR = 'open'; break;
    case 'cheeks':
      R = [[sx, sy], [sx + 96, sy + 46], headPt(s, [216, -146])];
      L = [[-sx, sy], [-sx - 96, sy + 46], headPt(s, [-216, -146])];
      front = true; pawL = pawR = 'open'; aR = ang(R[1], R[2]) - 18; aL = ang(L[1], L[2]) + 18; break;
    case 'chin': // thinking: elbow out, fist propping the chin
      R = [[sx, sy], [sx + 78, sy + 4], headPt(s, [64, -104])];
      L = [[-sx, sy], [-sx - 22, sy + 116], [-sx - 18, sy + 228]]; front = true; pawR = 'fist'; break;
    case 'hip1': // one fist on the hip, the other arm hanging
      L = [[-sx, sy], [-sx - 112, sy + 92], [-sx - 34, sy + 190]];
      R = [[sx, sy], [sx + 20, sy + 118], [sx + 18, sy + 230]]; pawL = 'fist'; break;
    case 'cross': // folded arms: sleeves hug the sides, forearms cross in an X, fists tucked
      L = [[-sx, sy], [-sx - 30, sy + 122], [sx - 20, sy + 70]];
      R = [[sx, sy], [sx + 30, sy + 128], [-sx + 14, sy + 92]];
      pawL = pawR = 'fist'; break;

    case 'limp':
      R = [[sx - 4, sy], [sx + 6, sy + 118], [sx - 26, sy + 228]]; L = mir(R); break;
    case 'hips':
      R = [[sx, sy], [sx + 112, sy + 92], [sx + 34, sy + 190]]; L = mir(R); pawL = pawR = 'fist'; break;
    case 'point': {
      const a = s.pointAngle, right = Math.cos(rad(a)) >= 0, sgn = right ? 1 : -1;
      const S = [sgn * sx, sy], bend = right ? 14 : -14;
      const E = [S[0] + 118 * Math.cos(rad(a + bend)), S[1] + 118 * Math.sin(rad(a + bend))];
      const W = [E[0] + 124 * Math.cos(rad(a)), E[1] + 124 * Math.sin(rad(a))];
      const rest = [[-sgn * sx, sy], [-sgn * (sx + 22), sy + 116], [-sgn * (sx + 18), sy + 228]];
      if (right) { R = [S, E, W]; L = rest; pawR = 'point'; aR = a; }
      else { L = [S, E, W]; R = rest; pawL = 'point'; aL = a; }
      break;
    }
    case 'peek': {
      const e = s.edgeY;
      R = [[sx, sy], [sx + 70, e + 60], [150, e - 30]]; L = mir(R);
      pawL = pawR = 'grip'; aL = aR = 90; front = true; break;
    }
    case 'wave':
      R = [[sx, sy], [sx + 112, sy - 40], [sx + 110, sy - 168]];
      L = [[-sx, sy], [-sx - 22, sy + 116], [-sx - 18, sy + 228]]; pawR = 'open'; break;
    default:
      R = [[sx, sy], [sx + 20, sy + 118], [sx + 18, sy + 230]]; L = mir(R);
  }
  return { L, R, front, pawL, pawR, aL: aL ?? ang(L[1], L[2]), aR: aR ?? ang(R[1], R[2]) };
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
    case 'grip': // seen from the front, resting on a ledge: a low dome, flat underside at local y 30,
      // two short paper toe splits (the only lines drawn on fur, so the mitten reads at small size)
      path('M-40,30 C-44,2 -28,-22 0,-22 C28,-22 44,2 40,30 Z');
      S.push(['line', { x1: -13, y1: 30, x2: -13, y2: 14, detail: 1 }]);
      S.push(['line', { x1: 13, y1: 30, x2: 13, y2: 14, detail: 1 }]); break;
    case 'fist':
      circ(0, 24, 29); ell(-20, 10, 10, 14, 30); break;
    case 'point': // mitten fist, index finger out along one edge, thumb bump on the same side
      path('M-24,-6 C-30,16 -28,40 -8,46 C10,50 26,40 26,20 C26,8 25,0 22,-6 Z');
      path('M6,26 L8,78 A11,11 0 0 0 30,77 L26,24 Z'); ell(28, 10, 10, 13, -20); break;
    default: // 'mitt': closed mitten with a thumb bump
      path('M-24,-6 C-31,22 -30,50 -10,60 C4,66 22,58 27,40 C31,24 28,6 24,-6 Z');
      ell(-26, 18, 10.5, 15, 24);
  }
  return S;
}

// ---------------------------------------------------------------- tail
// The tail is a chain of 12 segments; each preset is four numbers, so it tweens and sways.
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
};
export function tailSpec(t, base = 'neutral') {
  const b = TAIL[base] || TAIL.neutral;
  if (t == null) return { ...b, sway: 0 };
  if (typeof t === 'string') return { ...(TAIL[t] || TAIL.neutral), sway: 0 };
  if (typeof t === 'number') return { ...b, sway: t };
  return { ...b, sway: 0, ...t };
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
  // round tip: a few points around the end
  const e = pts[N], e0 = pts[N - 1], ta = Math.atan2(e[1] - e0[1], e[0] - e0[0]);
  const wt = (w1 + 5.4) * spec.puff / 2, cap = [];
  for (let k = 1; k < 6; k++) { const q = ta + Math.PI / 2 - (k * Math.PI) / 6; cap.push([e[0] + Math.cos(q) * wt, e[1] + Math.sin(q) * wt]); }
  return smoothPath([...L, ...cap, ...R.reverse()], false) + ' Z';
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
