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
import {
  PAL, TONE, LW, el, n, P, uid, clamp, lerp, state, merge, EXPR, ARMS, LEGS, headXf, headPt,
  resolveArms, legJoints, pawShapes, tailSpec, tailPath, eyes, brows, mouth, fx,
} from './core.mjs';

export const META = {
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
export function resolve(p = {}) {
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
export function draw(p = {}, opt = {}) {
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
        const L = 40 + 150 * pr.thrust, x0 = dir * 196;
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
          const L = 30 + 170 * pr.flame, y0 = 126 + shY;
          q = el('path', { d: `M${x - 18},${n(y0)} L${x},${n(y0 + L)} L${x + 18},${n(y0)} Z`, fill: PAL.amber })
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
    const W = arms.R.W, k = clamp(pr.card), tl = 14;
    const len = 210 * k, top = [W[0] + Math.sin((tl * Math.PI) / 180) * len, W[1] - Math.cos((tl * Math.PI) / 180) * len];
    const txt = String(pr.cardText), w = Math.max(230, txt.length * 52 + 70), h = pr.cardSub ? 190 : 150;
    let g = passShape(mode, 'path', { d: `M${P([W[0], W[1] + 10])} L${P(top)}`, fill: 'none', stroke: ink, 'stroke-width': 16 });
    if (mode === 'fill') g += el('path', { d: `M${P([W[0], W[1] + 10])} L${P(top)}`, fill: 'none', stroke: paper, 'stroke-width': 6 });
    const T = `translate(${P([top[0], top[1] - h / 2 + 10])}) rotate(${n(-4 + (1 - k) * 30)}) scale(${n(k * 100) / 100})`;
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
    const upright = J.paw === 'thumb';
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
export function keyPoints(s) {
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
export function bodyXfPt(s, [x, y]) {
  const sy = 1 - s.sq, sx = 1 + s.sq * 0.75;
  let px = x * sx, py = 540 + (y - 540) * sy;
  const a = (s.lean * Math.PI) / 180, c = Math.cos(a), si = Math.sin(a);
  const rx = px * c - (py - 540) * si, ry = 540 + px * si + (py - 540) * c;
  return [rx, ry + s.bodyDy];
}

// ---------------------------------------------------------------- framing
export const VIEW = {
  full: [-360, -600, 720, 1170],
  bust: [-340, -620, 680, 860],
  face: [-300, -560, 600, 520],
  peek: [-330, -580, 660, 600],
  point: [-300, -620, 780, 1190],
};

// Public API (unchanged from v2, plus `legs` and `props`). Returns a standalone <svg> string.
// drawCat({ expression, pose, legs, lookX, lookY, blink, mouthOpen, earTwitch, tail, pointAngle, edgeY, props, state }, opt)
export function drawCat(p = {}, opt = {}) {
  const vb = opt.viewBox ?? VIEW[p.pose === 'peek' ? 'peek' : p.pose === 'point' ? 'point' : 'full'];
  const w = opt.width ?? Math.round(vb[2] / 2), h = opt.height ?? Math.round((w * vb[3]) / vb[2]);
  const bg = opt.bg ? el('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: opt.bg }) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(n).join(' ')}" width="${w}" height="${h}">${bg}${draw(p, opt)}${opt.inner ?? ''}</svg>`;
}
