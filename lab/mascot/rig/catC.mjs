// catC.mjs: Direction C, "Signal Line".
// The cat drawn in the brand's diagram language: one paper line weight everywhere, equal to the
// echo ring's stroke at eye size (6/22 of the eye radius), on ink fills. Round head (the only
// round box in the system is the echo mark), tabby forehead ticks, whiskers, line headset.
import { PAL, el, n, P, state, headXf, armPose, armD, tailD, eyes, brows, mouth, fx } from './core.mjs';

const R_EYE = 46;
export const LW = (R_EYE * 6) / 22; // 12.5: the ring stroke is the line weight of the whole drawing
export const META = {
  id: 'C',
  name: 'SIGNAL LINE',
  line: 'The cat drawn in the diagram language: one paper line, as thick as the echo ring, on ink, so every part can be drawn on.',
};

const HC = [0, -200], HR = 168;
const EAR_L = [[-160, -262], [-52, -352], [-150, -452]];
const EAR_PIVOT = [-106, -307];
const BODY = 'M-104,0 L104,0 C136,4 150,30 150,70 L140,330 L-140,330 L-150,70 C-150,30 -136,4 -104,0 Z';
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
const poly = (pts) => pts.map(P).join(' ');
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function draw(st = {}, opt = {}) {
  const s = state(st);
  const L = { stroke: PAL.paper, 'stroke-width': LW, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const pose = armPose(s, { sx: 112, hw: HR, cheekY: -150, chinY: -40 });
  const tube = (d, w) => el('path', { d, fill: 'none', ...L, 'stroke-width': w + 2 * LW })
    + el('path', { d, fill: 'none', stroke: PAL.ink, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

  const tail = tube(tailD(s, [70, 300]), s.tail === 'puff' ? 54 : 26);
  const legs = [-1, 1].map((d) => tube(`M${d * 58},310 L${d * 60},520`, 46)
    + el('rect', { x: d * 66 - 48, y: 508, width: 96, height: 42, rx: 18, fill: PAL.ink, ...L })).join('');
  const neck = el('rect', { x: -44, y: -70, width: 88, height: 90, fill: PAL.ink, ...L });
  const body = neck + el('path', { d: BODY, fill: PAL.ink, ...L })
    + el('path', { d: 'M-104,0 L-50,0 L0,52 L50,0 L104,0', fill: 'none', ...L })
    + el('line', { x1: 0, y1: 52, x2: 0, y2: 330, ...L, 'stroke-width': LW * 0.6 })
    + el('line', { x1: -144, y1: 294, x2: 144, y2: 294, ...L })
    + el('rect', { x: -112, y: 120, width: 70, height: 56, fill: 'none', ...L, 'stroke-width': LW * 0.6 })
    + el('circle', { cx: 60, cy: 104, r: 11, fill: PAL.amber })
    + el('circle', { cx: 90, cy: 104, r: 9.5, fill: 'none', stroke: PAL.amber, 'stroke-width': 3 });
  const arm = (a) => {
    const h = a[2], cuff = lerp(h, a[1], 0.3), c2 = lerp(h, a[1], 0.42);
    const dir = [h[0] - a[1][0], h[1] - a[1][1]], len = Math.hypot(...dir), nx = -dir[1] / len * 27, ny = dir[0] / len * 27;
    return tube(armD(a), 50)
      + el('line', { x1: cuff[0] + nx, y1: cuff[1] + ny, x2: cuff[0] - nx, y2: cuff[1] - ny, ...L, 'stroke-width': LW * 0.6 })
      + el('circle', { cx: h[0], cy: h[1], r: 30, fill: PAL.ink, ...L });
  };
  const arms = arm(pose.L) + arm(pose.R);

  const ear = (side) => {
    const rot = side === 'L' ? -s.earL : s.earR, pts = side === 'L' ? EAR_L : mirror(EAR_L);
    const pv = side === 'L' ? EAR_PIVOT : [-EAR_PIVOT[0], EAR_PIVOT[1]];
    const inner = `M${P(lerp(pts[0], pts[2], 0.25))} L${P(lerp(pts[2], pts[0], 0.2))}`;
    return el('g', { transform: `rotate(${n(rot)} ${n(pv[0])} ${n(pv[1])})` },
      el('polygon', { points: poly(pts), fill: PAL.ink, ...L }) + el('path', { d: inner, fill: 'none', ...L, 'stroke-width': LW * 0.6 }));
  };
  const whisk = [-1, 1].map((d) =>
    el('line', { x1: d * 132, y1: -146, x2: d * 236, y2: -160, ...L, 'stroke-width': LW * 0.55 })
    + el('line', { x1: d * 132, y1: -124, x2: d * 230, y2: -108, ...L, 'stroke-width': LW * 0.55 })).join('');
  const headset = {
    band: el('path', { d: `M${-HR - 4},-200 C${-HR - 4},-452 ${HR + 4},-452 ${HR + 4},-200`, fill: 'none', ...L }),
    cups: [-1, 1].map((d) => el('rect', { x: d * (HR + 4) - 20, y: -246, width: 40, height: 84, rx: 10, fill: PAL.ink, ...L })).join('')
      + el('path', { d: `M${-HR - 4},-168 C${-HR},-104 -140,-92 -84,-96`, fill: 'none', ...L, 'stroke-width': LW * 0.7 })
      + el('circle', { cx: -80, cy: -96, r: 12, fill: PAL.paper }),
  };
  const head = el('g', { transform: headXf(s) },
    whisk + ear('L') + ear('R')
    + el('circle', { cx: HC[0], cy: HC[1], r: HR, fill: PAL.ink, ...L })
    + headset.band
    + [-30, 0, 30].map((x, i) => el('line', { x1: x, y1: HC[1] - HR + 22, x2: x, y2: HC[1] - HR + (i === 1 ? 64 : 50), ...L, 'stroke-width': LW * 0.7 })).join('')
    + eyes(s, { y: -200, R: R_EYE, lid: PAL.ink, lidLine: PAL.paper, lidLineW: LW * 0.8, discPupil: PAL.ink, ringPupil: null })
    + brows({ ...s, browL: { ...s.browL, dy: s.browL.dy * 0.6 }, browR: { ...s.browR, dy: s.browR.dy * 0.6 } }, { y: -272, dx: 62, len: 56, w: LW * 0.9, color: PAL.paper })
    + el('path', { d: 'M-14,-140 L14,-140 L0,-124 Z', fill: PAL.paper, ...L, 'stroke-width': 5 })
    + mouth(s, { y: -120, line: PAL.paper, fill: PAL.ink, tongue: null, w: LW * 0.8, k: 0.85 })
    + headset.cups
    + fx(s, { color: PAL.paper, w: LW, top: -380, hw: 190, tearAt: [-104, -150], tear: PAL.paper }));
  let g = tail + legs + body;
  g += pose.front ? head + arms : arms + head;
  return el('g', { transform: `translate(0 ${n(s.bodyDy)}) rotate(${n(s.lean)} 0 500)` }, g);
}
