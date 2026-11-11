// catB.mjs: Direction B, "Paper Pilot".
// A cream cat cut from squares and triangles. The eyes sit in a hard ink band across the face,
// so the echo mark always appears exactly as it does on the channel (amber on ink).
// Ink ear tips and tail tip (colour-point coat), grey flight jacket with a paper collar.
import { PAL, el, n, P, state, headXf, armPose, armD, tailD, eyes, brows, mouth, fx, uid } from './core.mjs';

const K = 6;
export const META = {
  id: 'B',
  name: 'PAPER PILOT',
  line: 'A cream cat cut from squares and triangles; the echo eyes sit in a hard ink band, exactly as the logo sits on ink.',
};

const EAR_L = [[-200, -270], [-62, -343], [-206, -470]];
const EAR_PIVOT = [-140, -300];
const HX = 204, HT = -348, HB = -26, HR = 70; // head box
const HEAD = `M${-HX + HR},${HT} L${HX - HR},${HT} Q${HX},${HT} ${HX},${HT + HR} L${HX},${HB - HR} Q${HX},${HB} ${HX - HR},${HB} `
  + `L${-HX + HR},${HB} Q${-HX},${HB} ${-HX},${HB - HR} L${-HX},${HT + HR} Q${-HX},${HT} ${-HX + HR},${HT} Z`;
const EYE_Y = -204, BAND = [-270, -138];
const BODY = 'M-120,0 L120,0 L172,40 L162,338 L-162,338 L-172,40 Z';
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
const poly = (pts) => pts.map(P).join(' ');
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function draw(st = {}, opt = {}) {
  const s = state(st);
  const KL = opt.keyline ?? PAL.ink;
  const pose = armPose(s, { hw: 204, cheekY: -150, chinY: -30, sx: 128 });
  const sh = (mode, tag, a) => {
    if (mode !== 'sil') return el(tag, a);
    const hasFill = a.fill && a.fill !== 'none';
    return el(tag, { ...a, fill: hasFill ? KL : 'none', stroke: KL, 'stroke-width': (a['stroke-width'] || 0) + 2 * K,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  };
  const tube = (d, w, color, edge = PAL.ink, ew = 7) =>
    el('path', { d, fill: 'none', stroke: edge, 'stroke-width': w + 2 * ew, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    + el('path', { d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

  const tailW = s.tail === 'puff' ? 60 : 32, td = tailD(s, [80, 300]);
  const tail = (m) => m === 'sil' ? sh(m, 'path', { d: td, fill: 'none', stroke: PAL.paper, 'stroke-width': tailW + 14, 'stroke-linecap': 'round' })
    : tube(td, tailW, PAL.paper) + el('path', { d: td, pathLength: 1, 'stroke-dasharray': '0 0.7 1', fill: 'none', stroke: PAL.ink, 'stroke-width': tailW + 1, 'stroke-linecap': 'round' });
  const legs = (m) => [-1, 1].map((d) => {
    const ld = `M${d * 62},320 L${d * 64},476`;
    if (m === 'sil') return sh(m, 'path', { d: ld, stroke: PAL.paper, 'stroke-width': 70, fill: 'none' }) + sh(m, 'rect', { x: d * 82 - 56, y: 474, width: 112, height: 50, rx: 16, fill: PAL.paper });
    return tube(ld, 56, PAL.paper) + el('rect', { x: d * 82 - 56, y: 474, width: 112, height: 50, rx: 16, fill: PAL.paper, stroke: PAL.ink, 'stroke-width': 7 });
  }).join('');
  const neck = (m) => sh(m, 'rect', { x: -56, y: -80, width: 112, height: 100, fill: PAL.paper, stroke: m === 'fill' ? PAL.ink : undefined, 'stroke-width': m === 'fill' ? 7 : 0 });
  const body = (m) => neck(m) + sh(m, 'path', { d: BODY, fill: PAL.muted, stroke: m === 'fill' ? PAL.ink : undefined, 'stroke-width': m === 'fill' ? 7 : 0, 'stroke-linejoin': 'round' });
  const jacketDetail = () =>
    el('line', { x1: 0, y1: 70, x2: 0, y2: 304, stroke: PAL.ink, 'stroke-width': 7 })
    + el('rect', { x: -163, y: 300, width: 326, height: 38, fill: PAL.paper, stroke: PAL.ink, 'stroke-width': 7 })
    + el('polygon', { points: poly([[-140, 6], [-30, -10], [0, 74], [-96, 60]]), fill: PAL.paper, stroke: PAL.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' })
    + el('polygon', { points: poly(mirror([[-140, 6], [-30, -10], [0, 74], [-96, 60]])), fill: PAL.paper, stroke: PAL.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' })
    + el('rect', { x: 52, y: 112, width: 74, height: 38, fill: PAL.ink })
    + el('circle', { cx: 70, cy: 131, r: 11, fill: PAL.amber })
    + el('circle', { cx: 101, cy: 131, r: 9.5, fill: 'none', stroke: PAL.amber, 'stroke-width': 3 });
  const arm = (m, a) => {
    const d = armD(a), h = a[2];
    if (m === 'sil') return sh(m, 'path', { d, fill: 'none', stroke: PAL.paper, 'stroke-width': 66 }) + sh(m, 'circle', { cx: h[0], cy: h[1], r: 33 });
    const cuff = lerp(h, a[1], 0.26);
    return tube(d, 52, PAL.muted)
      + el('circle', { cx: cuff[0], cy: cuff[1], r: 29, fill: PAL.ink })
      + el('rect', { x: h[0] - 32, y: h[1] - 32, width: 64, height: 64, rx: 22, fill: PAL.paper, stroke: PAL.ink, 'stroke-width': 7,
        transform: `rotate(${n(Math.atan2(h[1] - a[1][1], h[0] - a[1][0]) * 57.3)} ${n(h[0])} ${n(h[1])})` });
  };
  const arms = (m) => (s.arms === 'cross' ? arm(m, pose.L) + arm(m, pose.R) : arm(m, pose.L) + arm(m, pose.R));

  const ear = (m, side) => {
    const rot = side === 'L' ? -s.earL : s.earR;
    const pts = side === 'L' ? EAR_L : mirror(EAR_L);
    const pv = side === 'L' ? EAR_PIVOT : [-EAR_PIVOT[0], EAR_PIVOT[1]];
    const c = [(pts[0][0] + pts[1][0] + pts[2][0]) / 3, (pts[0][1] + pts[1][1] + pts[2][1]) / 3];
    const tip = pts.map((p) => lerp(c, p, 0.4)).map(([x, y]) => [x, y + 12]);
    return el('g', { transform: `rotate(${n(rot)} ${n(pv[0])} ${n(pv[1])})` },
      sh(m, 'polygon', { points: poly(pts), fill: PAL.paper, stroke: m === 'fill' ? PAL.ink : undefined, 'stroke-width': m === 'fill' ? 7 : 0, 'stroke-linejoin': 'round' })
      + (m === 'fill' ? el('polygon', { points: poly(tip), fill: PAL.ink, stroke: PAL.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }) : ''));
  };
  const head = (m) => {
    let g = ear(m, 'L') + ear(m, 'R') + sh(m, 'path', { d: HEAD, fill: PAL.paper });
    if (m === 'fill') {
      const cid = uid('hd');
      g += `<clipPath id="${cid}"><path d="${HEAD}"/></clipPath>`
        + el('g', { 'clip-path': `url(#${cid})` }, el('rect', { x: -HX, y: BAND[0], width: 2 * HX, height: BAND[1] - BAND[0], fill: PAL.ink }))
        + el('path', { d: HEAD, fill: 'none', stroke: PAL.ink, 'stroke-width': 7 })
        + eyes(s, { y: EYE_Y, R: 44, lid: PAL.ink, discPupil: PAL.ink, ringPupil: null, lidLine: null })
        + brows({ ...s, browL: { ...s.browL, dy: s.browL.dy * 0.55 }, browR: { ...s.browR, dy: s.browR.dy * 0.55 } }, { y: -296, dx: 62, len: 66, w: 17, color: PAL.ink, cap: 'butt' })
        + el('polygon', { points: '-16,-124 16,-124 0,-106', fill: PAL.ink, stroke: PAL.ink, 'stroke-width': 6, 'stroke-linejoin': 'round' })
        + el('line', { x1: 0, y1: -106, x2: 0, y2: -96, stroke: PAL.ink, 'stroke-width': 7 })
        + mouth(s, { y: -96, line: PAL.ink, fill: PAL.ink, tongue: PAL.muted, w: 7, k: 0.78 })
        + fx(s, { color: PAL.paper, w: 13, top: -380, hw: 215, tearAt: [-100, -132], tear: PAL.paper });
      // tear sits on the paper cheek: give it an ink edge
      if (s.fx === 'tear') g += el('path', { d: 'M-100,-132 C-84,-106 -80,-92 -100,-84 C-120,-92 -116,-106 -100,-132 Z', fill: PAL.paper, stroke: PAL.ink, 'stroke-width': 6 });
    }
    return el('g', { transform: headXf(s) }, g);
  };
  const pass = (m) => {
    let g = tail(m) + legs(m) + body(m) + (m === 'fill' ? jacketDetail() : '');
    g += pose.front ? head(m) + arms(m) : arms(m) + head(m);
    return g;
  };
  return el('g', { transform: `translate(0 ${n(s.bodyDy)}) rotate(${n(s.lean)} 0 500)` }, el('g', {}, pass('sil')) + el('g', {}, pass('fill')));
}
