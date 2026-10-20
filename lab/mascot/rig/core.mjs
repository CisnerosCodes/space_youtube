// core.mjs: shared rig for the Signal Delay mascot concepts.
// Every direction draws the same skeleton from the same state object, so an
// expression preset (or an animated tween between two presets) works on A, B and C.
// Coordinates: origin at the neck base, y down. Head centre near (0,-190).

export const PAL = { ink: '#0B0B0C', paper: '#F2EFE8', amber: '#F5B83D', muted: '#8C8A85' };

let _id = 0;
export const uid = (p = 'k') => `${p}${(++_id).toString(36)}`;
export const n = (v) => Math.round(v * 10) / 10;
export const P = (p) => `${n(p[0])},${n(p[1])}`;

export function rotP([x, y], [cx, cy], deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
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

// ---------------------------------------------------------------- state
export const DEFAULT = {
  tilt: 0, headDx: 0, headDy: 0,          // head rotation (deg) about the neck, offset
  earL: 0, earR: 0,                        // ear rotation, + = droop outward, - = prick up/in
  lidL: 0, lidR: 0,                        // top lid closure 0..1 (L = solid disc, R = ring)
  lidAL: 0, lidAR: 0,                      // lid slant deg, + = inner corner down (angry), - = outer down (sad)
  lowL: 0, lowR: 0,                        // lower lid rise 0..1 (happy squint)
  eyeScale: 1,
  pupil: 'slit', pw: 1, ph: 1, look: [0, 0],
  browL: { dy: 0, a: 0 }, browR: { dy: 0, a: 0 },
  mouth: 'cat',
  arms: 'down', tail: 'neutral',
  bodyDy: 0, lean: 0,
  fx: null,
};
export function state(over = {}) {
  return { ...DEFAULT, ...over, browL: { ...DEFAULT.browL, ...(over.browL || {}) }, browR: { ...DEFAULT.browR, ...(over.browR || {}) } };
}

// Expression presets: the five sheet expressions plus a resting pose.
export const EXPR = {
  neutral: state({}),
  curious: state({
    tilt: -9, earL: -8, earR: 22, look: [0.55, -0.45], lidL: 0.06, lidR: 0.06,
    browL: { dy: -18, a: -8 }, browR: { dy: -2, a: 6 }, mouth: 'o-small', arms: 'chin', tail: 'question',
  }),
  excited: state({
    tilt: 5, headDy: -6, earL: -14, earR: -14, pupil: 'none', lowL: 0.34, lowR: 0.34,
    browL: { dy: -26, a: -4 }, browR: { dy: -26, a: -4 }, mouth: 'grin', arms: 'up', tail: 'up', bodyDy: -18, fx: 'spark',
  }),
  shocked: state({
    headDy: -10, eyeScale: 1.16, pupil: 'dot', pw: 0.6, earL: -20, earR: -20,
    browL: { dy: -40, a: -6 }, browR: { dy: -40, a: -6 }, mouth: 'O', arms: 'cheeks', tail: 'puff', bodyDy: -10, fx: 'shock',
  }),
  sad: state({
    tilt: 7, headDy: 10, earL: 48, earR: 48, lidL: 0.36, lidR: 0.36, lidAL: -20, lidAR: -20, look: [0, 0.5],
    browL: { dy: -4, a: -20 }, browR: { dy: -4, a: -20 }, mouth: 'frown', arms: 'limp', tail: 'down', bodyDy: 8, fx: 'tear',
  }),
  skeptical: state({
    tilt: -6, earL: 4, earR: 26, lidL: 0.12, lidR: 0.5, lidAR: -4, look: [-0.55, 0.05],
    browL: { dy: -30, a: -12 }, browR: { dy: 10, a: 16 }, mouth: 'smirk', arms: 'cross', tail: 'flick',
  }),
};
export const EXPR_LABEL = { curious: 'CURIOUS', excited: 'EXCITED', shocked: 'SHOCKED', sad: 'SAD', skeptical: 'SKEPTICAL' };
export const EXPR_NOTE = {
  curious: 'TILT -9 · EAR R 22 · LOOK UP-RIGHT',
  excited: 'LOWER LIDS 0.34 · EARS UP · ARMS UP',
  shocked: 'EYES 1.16 · PUPILS 0.6 · EARS UP',
  sad: 'LIDS 0.36 SLANT -20 · EARS 48',
  skeptical: 'RING LID 0.5 · BROWS SPLIT · SIDE-EYE',
};

// ---------------------------------------------------------------- skeleton
export const NECK = [0, -40];
export function headXf(s) { return `rotate(${n(s.tilt)} ${NECK[0]} ${NECK[1]}) translate(${n(s.headDx)} ${n(s.headDy)})`; }
export function headPt(s, p) { return rotP([p[0] + s.headDx, p[1] + s.headDy], NECK, s.tilt); }

// Arm poses: [shoulder, elbow, hand] for the figure's left arm (viewer left, x<0) and right arm.
export function armPose(s, o = {}) {
  const sx = o.sx ?? 125, sy = o.sy ?? 25, hw = o.hw ?? 200, cheekY = o.cheekY ?? -140, chinY = o.chinY ?? -55;
  const mir = (arm) => arm.map(([x, y]) => [-x, y]);
  let R, L, front = false, paws = 'fist';
  switch (s.arms) {
    case 'up':
      R = [[sx, sy], [sx + 105, sy - 45], [sx + 128, sy - 205]]; L = mir(R); break;
    case 'cheeks':
      R = [[sx, sy], [sx + 130, sy - 30], headPt(s, [hw - 20, cheekY])];
      L = [[-sx, sy], [-sx - 130, sy - 30], headPt(s, [-hw + 20, cheekY])]; front = true; paws = 'open'; break;
    case 'chin':
      R = [[sx, sy], [sx + 50, sy + 120], headPt(s, [45, chinY + 5])];
      L = [[-sx, sy], [-sx - 30, sy + 120], [-sx - 22, sy + 235]]; front = true; break;
    case 'cross':
      L = [[-sx, sy], [-sx - 40, sy + 120], [sx - 50, sy + 110]];
      R = [[sx, sy], [sx + 40, sy + 115], [-sx + 50, sy + 92]]; front = true; break;
    case 'limp':
      R = [[sx, sy], [sx + 12, sy + 125], [sx - 28, sy + 232]]; L = mir(R); break;
    case 'point':
      R = [[sx, sy], [sx + 110, sy - 35], [sx + 225, sy - 95]];
      L = [[-sx, sy], [-sx - 30, sy + 120], [-sx - 22, sy + 235]]; break;
    default:
      R = [[sx, sy], [sx + 32, sy + 120], [sx + 24, sy + 235]]; L = mir(R);
  }
  return { L, R, front, paws };
}
export const armD = (a) => `M${P(a[0])} L${P(a[1])} L${P(a[2])}`;

export function tailD(s, base = [70, 300]) {
  const [x, y] = base;
  switch (s.tail) {
    case 'question': return `M${x},${y} C${x + 170},${y + 20} ${x + 250},${y - 120} ${x + 180},${y - 200} C${x + 140},${y - 245} ${x + 90},${y - 210} ${x + 110},${y - 170}`;
    case 'up': return `M${x},${y} C${x + 150},${y} ${x + 190},${y - 150} ${x + 160},${y - 290}`;
    case 'puff': return `M${x},${y} C${x + 110},${y} ${x + 175},${y - 110} ${x + 175},${y - 250}`;
    case 'down': return `M${x},${y} C${x + 110},${y + 30} ${x + 170},${y + 130} ${x + 250},${y + 175}`;
    case 'flick': return `M${x},${y} C${x + 160},${y + 30} ${x + 140},${y - 110} ${x + 220},${y - 150}`;
    default: return `M${x},${y} C${x + 140},${y + 20} ${x + 200},${y - 70} ${x + 160},${y - 160}`;
  }
}

// ---------------------------------------------------------------- face parts
// Eyes = the echo mark: viewer-left a solid amber disc, viewer-right a hollow amber ring
// (outer radius equal to the disc, stroke 6/22 of it, centres 60/22 radii apart, as in the logo).
export function eyes(s, o) {
  const R0 = o.R ?? 46, R = R0 * s.eyeScale, dx = o.dx ?? (R0 * 60) / 44, y = o.y;
  const lidC = o.lid, ll = o.lidLine, lw = o.lidLineW ?? 8;
  let out = '';
  for (const side of ['L', 'R']) {
    const cx = side === 'L' ? -dx : dx, cy = y, id = uid('eye');
    const lid = s['lid' + side], la = s['lidA' + side], low = s['low' + side];
    let g = '';
    if (side === 'L') g += el('circle', { cx, cy, r: R, fill: PAL.amber });
    else g += el('circle', { cx, cy, r: (R * 19) / 22, fill: o.ringFill ?? 'none', stroke: PAL.amber, 'stroke-width': (R * 6) / 22 });
    // pupils
    const [lx, ly] = s.look, px = cx + lx * R * 0.34, py = cy + ly * R * 0.34;
    const pc = side === 'L' ? o.discPupil : o.ringPupil;
    if (pc) {
      if (s.pupil === 'slit') g += el('ellipse', { cx: px, cy: py, rx: R * 0.14 * s.pw, ry: R * 0.6 * s.ph, fill: pc });
      else if (s.pupil === 'round') g += el('circle', { cx: px, cy: py, r: R * 0.2 * s.pw, fill: pc });
      else if (s.pupil === 'dot') g += el('circle', { cx: px, cy: py, r: R * 0.2 * s.pw, fill: pc });
    }
    // top lid: a fur-coloured slab whose lower edge drops with `lid`, slanted by `la`
    if (lid > 0.001) {
      const ey = cy - R + 2 * R * lid, ang = side === 'L' ? la : -la;
      const tf = `rotate(${n(ang)} ${n(cx)} ${n(ey)})`;
      g += el('rect', { x: cx - 2 * R, y: ey - 3 * R, width: 4 * R, height: 3 * R, fill: lidC, transform: tf });
      if (ll) g += el('line', { x1: cx - 2 * R, y1: ey, x2: cx + 2 * R, y2: ey, stroke: ll, 'stroke-width': lw, transform: tf });
    }
    // lower lid: a big circle rising from below gives the happy crescent
    if (low > 0.001) {
      const rr = R * 1.25, ccy = cy + R - 2 * R * low + rr;
      g += el('circle', { cx, cy: ccy, r: rr, fill: lidC, stroke: ll || 'none', 'stroke-width': ll ? lw : 0 });
    }
    out += `<clipPath id="${id}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R + 0.6)}"/></clipPath><g clip-path="url(#${id})">${g}</g>`;
  }
  return out;
}

export function brows(s, o) {
  const dx = o.dx ?? 66, len = o.len ?? 70, y = o.y;
  let out = '';
  for (const side of ['L', 'R']) {
    const b = side === 'L' ? s.browL : s.browR, cx = side === 'L' ? -dx : dx, cy = y + b.dy;
    const ang = side === 'L' ? b.a : -b.a;
    out += el('line', { x1: cx - len / 2, y1: cy, x2: cx + len / 2, y2: cy, stroke: o.color, 'stroke-width': o.w ?? 16,
      'stroke-linecap': o.cap ?? 'round', transform: `rotate(${n(ang)} ${n(cx)} ${n(cy)})` });
  }
  return out;
}

// Mouth shapes, centred on (0, y). `line` = stroke colour, `fill` = mouth interior.
export function mouth(s, o) {
  const y = o.y, line = o.line, fill = o.fill, w = o.w ?? 8, k = o.k ?? 1, tongue = o.tongue;
  const T = `translate(0 ${n(y)}) scale(${k})`;
  const st = { stroke: line, 'stroke-width': w / k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  switch (s.mouth) {
    case 'o-small': return el('ellipse', { cx: 6, cy: 14, rx: 13, ry: 15, fill, ...st, transform: T });
    case 'grin': {
      const d = 'M-58,-4 Q0,10 58,-4 Q50,66 0,70 Q-50,66 -58,-4 Z';
      const id = uid('m');
      return `<g transform="${T}"><clipPath id="${id}"><path d="${d}"/></clipPath>${el('path', { d, fill })}`
        + (tongue ? `<g clip-path="url(#${id})">${el('ellipse', { cx: 0, cy: 66, rx: 30, ry: 22, fill: tongue })}</g>` : '')
        + el('path', { d, fill: 'none', ...st }) + '</g>';
    }
    case 'O': return el('ellipse', { cx: 0, cy: 30, rx: 27, ry: 40, fill, ...st, transform: T });
    case 'frown': return el('path', { d: 'M-36,22 Q0,-6 36,22', fill: 'none', ...st, transform: T });
    case 'smirk': return el('path', { d: 'M-38,14 L18,8 Q32,6 38,-6', fill: 'none', ...st, transform: T });
    case 'smile': return el('path', { d: 'M-40,0 Q0,30 40,0', fill: 'none', ...st, transform: T });
    default: return el('path', { d: 'M-32,2 Q-16,20 0,4 Q16,20 32,2', fill: 'none', ...st, transform: T });
  }
}

// Effects drawn around the head (in head space). Short straight strokes only.
export function fx(s, o) {
  const c = o.color, w = o.w ?? 12, top = o.top ?? -350, hw = o.hw ?? 200;
  const line = (a, b) => el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' });
  if (s.fx === 'shock') {
    return line([-hw - 40, top + 10], [-hw - 85, top - 30]) + line([-hw + 30, top - 55], [-hw + 10, top - 105])
      + line([hw + 40, top + 10], [hw + 85, top - 30]) + line([hw - 30, top - 55], [hw - 10, top - 105]);
  }
  if (s.fx === 'spark') {
    return line([-hw - 70, top + 40], [-hw - 120, top + 10]) + line([-hw - 60, top + 110], [-hw - 120, top + 115])
      + line([hw + 70, top + 40], [hw + 120, top + 10]) + line([hw + 60, top + 110], [hw + 120, top + 115]);
  }
  if (s.fx === 'tear') {
    const [x, y] = o.tearAt; // drop under the solid eye
    return el('path', { d: `M${x},${y} C${x + 16},${y + 26} ${x + 20},${y + 40} ${x},${y + 48} C${x - 20},${y + 40} ${x - 16},${y + 26} ${x},${y} Z`, fill: o.tear ?? c });
  }
  return '';
}
