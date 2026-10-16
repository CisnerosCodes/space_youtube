// catA.mjs: Direction A, "Night Shift".
// A black cat whose face is the channel avatar: the echo mark on ink. Paper keyline around
// the silhouette only (two-pass: fat paper strokes first, flat shapes on top), paper headset,
// paper flight jacket with ink rib. No internal lines on the fur.
import { PAL, el, n, P, uid, state, headXf, armPose, armD, tailD, eyes, brows, mouth, fx } from './core.mjs';

const K = 7; // keyline width on each side

export const META = {
  id: 'A',
  name: 'NIGHT SHIFT',
  line: 'A black cat whose face is the channel avatar: the echo mark on ink, worn with a mission-control headset.',
};

const EAR_L = [[-198, -240], [-50, -318], [-178, -438]];
const EAR_L_IN = [[-168, -262], [-86, -306], [-166, -390]];
const EAR_PIVOT = [-124, -279];
const HEAD = 'M0,-332 C122,-332 204,-292 208,-205 L210,-170 L236,-142 L204,-124 C186,-76 104,-52 0,-52 '
  + 'C-104,-52 -186,-76 -204,-124 L-236,-142 L-210,-170 L-208,-205 C-204,-292 -122,-332 0,-332 Z';
const BODY = 'M-128,0 C-160,6 -172,44 -170,104 L-160,338 L160,338 L170,104 C172,44 160,6 128,0 Z';

function mirror(pts) { return pts.map(([x, y]) => [-x, y]); }
const poly = (pts) => pts.map(P).join(' ');

export function draw(st = {}, opt = {}) {
  const s = state(st);
  const KL = opt.keyline ?? PAL.paper;
  const pose = armPose(s, { hw: 205, cheekY: -150, chinY: -55 });

  // mode 'sil' renders the keyline pass, 'fill' the flat pass
  const sh = (mode, tag, a) => {
    if (mode !== 'sil') return el(tag, a);
    const hasFill = a.fill && a.fill !== 'none';
    return el(tag, { ...a, fill: hasFill ? KL : 'none', stroke: KL, 'stroke-width': (a['stroke-width'] || 0) + 2 * K,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round', transform: a.transform });
  };

  const tailW = s.tail === 'puff' ? 64 : 36;
  const tail = (m) => sh(m, 'path', { d: tailD(s, [80, 300]), fill: 'none', stroke: PAL.ink, 'stroke-width': tailW, 'stroke-linecap': 'round' });
  const legs = (m) => [-1, 1].map((d) =>
    sh(m, 'path', { d: `M${d * 62},320 L${d * 66},478`, stroke: PAL.ink, 'stroke-width': 66, 'stroke-linecap': 'round', fill: 'none' })
    + sh(m, 'ellipse', { cx: d * 82, cy: 500, rx: 56, ry: 28, fill: PAL.ink })).join('');
  const body = (m) => sh(m, 'rect', { x: -58, y: -90, width: 116, height: 110, fill: PAL.ink, transform: `rotate(${n(s.tilt * 0.5)} 0 0)` })
    + sh(m, 'path', { d: BODY, fill: PAL.paper });
  const arm = (m, a) => {
    const d = armD(a), h = a[2], r = pose.paws === 'open' ? 34 : 31;
    if (m === 'sil') return sh(m, 'path', { d, fill: 'none', stroke: PAL.paper, 'stroke-width': 60, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      + sh(m, 'circle', { cx: h[0], cy: h[1], r });
    // sleeve: ink outline under paper tube, ink cuff, ink paw with paper rim
    const cuff = [h[0] + (a[1][0] - h[0]) * 0.24, h[1] + (a[1][1] - h[1]) * 0.24];
    return el('path', { d, fill: 'none', stroke: PAL.ink, 'stroke-width': 68, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      + el('path', { d, fill: 'none', stroke: PAL.paper, 'stroke-width': 54, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      + el('circle', { cx: cuff[0], cy: cuff[1], r: 30, fill: PAL.ink })
      + el('circle', { cx: h[0], cy: h[1], r, fill: PAL.ink, stroke: PAL.paper, 'stroke-width': 6 });
  };
  const arms = (m) => arm(m, pose.L) + arm(m, pose.R);

  const ear = (m, side) => {
    const sgn = side === 'L' ? 1 : -1, rot = side === 'L' ? -s.earL : s.earR;
    const pts = side === 'L' ? EAR_L : mirror(EAR_L), inn = side === 'L' ? EAR_L_IN : mirror(EAR_L_IN);
    const pv = side === 'L' ? EAR_PIVOT : [-EAR_PIVOT[0], EAR_PIVOT[1]];
    const tf = `rotate(${n(rot)} ${n(pv[0])} ${n(pv[1])})`;
    return el('g', { transform: tf }, sh(m, 'polygon', { points: poly(pts), fill: PAL.ink, 'stroke-linejoin': 'round' })
      + (m === 'fill' ? el('polygon', { points: poly(inn), fill: PAL.muted }) : ''));
  };
  const headset = () => {
    const band = el('path', { d: 'M-206,-196 C-206,-386 206,-386 206,-196', fill: 'none', stroke: PAL.paper, 'stroke-width': 15 });
    const cup = (x) => el('rect', { x: x - 22, y: -244, width: 44, height: 88, rx: 8, fill: PAL.paper, stroke: PAL.ink, 'stroke-width': 5 });
    const boom = el('path', { d: 'M-212,-176 C-214,-100 -160,-92 -96,-96', fill: 'none', stroke: PAL.paper, 'stroke-width': 9, 'stroke-linecap': 'round' })
      + el('rect', { x: -108, y: -108, width: 34, height: 22, rx: 4, fill: PAL.paper });
    return { band, cups: cup(-212) + cup(212) + boom };
  };

  const head = (m) => {
    let g = ear(m, 'L') + ear(m, 'R') + sh(m, 'path', { d: HEAD, fill: PAL.ink });
    if (m === 'fill') {
      const hs = headset();
      g = ear(m, 'L') + ear(m, 'R') + el('path', { d: HEAD, fill: PAL.ink }) + hs.band
        + eyes(s, { y: -192, R: 46, lid: PAL.ink, lidLine: PAL.paper, lidLineW: 7, discPupil: PAL.ink, ringPupil: null })
        + brows(s, { y: -268, dx: 64, len: 58, w: 13, color: PAL.paper })
        + el('path', { d: 'M-15,-138 L15,-138 L0,-121 Z', fill: PAL.paper, stroke: PAL.paper, 'stroke-width': 6, 'stroke-linejoin': 'round' })
        + mouth(s, { y: -116, line: PAL.paper, fill: PAL.ink, tongue: PAL.muted, w: 7, k: 0.9 })
        + hs.cups
        + fx(s, { color: PAL.paper, w: 12, top: -360, hw: 215, tearAt: [-104, -150], tear: PAL.paper });
    }
    return el('g', { transform: headXf(s) }, g);
  };

  const jacketDetail = () =>
    el('path', { d: 'M-128,0 L-70,0 L0,58 L70,0 L128,0', fill: 'none', stroke: PAL.ink, 'stroke-width': 14, 'stroke-linejoin': 'round' })
    + el('line', { x1: 0, y1: 58, x2: 0, y2: 306, stroke: PAL.ink, 'stroke-width': 6 })
    + el('rect', { x: -161, y: 306, width: 322, height: 34, fill: PAL.ink })
    + el('circle', { cx: 74, cy: 104, r: 12, fill: PAL.amber })
    + el('circle', { cx: 108, cy: 104, r: 10.4, fill: 'none', stroke: PAL.amber, 'stroke-width': 3.3 });

  const pass = (m) => {
    let g = tail(m) + legs(m);
    if (!pose.front) g += body(m) + (m === 'fill' ? jacketDetail() : '') + arms(m) + head(m);
    else g += body(m) + (m === 'fill' ? jacketDetail() : '') + head(m) + arms(m);
    return g;
  };
  const xf = `translate(0 ${n(s.bodyDy)}) rotate(${n(s.lean)} 0 500)`;
  return el('g', { transform: xf }, el('g', {}, pass('sil')) + el('g', {}, pass('fill')));
}

// Head-only build for very small sizes (avatar, size tests): same parts, no body.
export const headBox = { x: -260, y: -470, w: 520, h: 470 };
