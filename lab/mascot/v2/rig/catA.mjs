// catA.mjs (v2): Direction A, "Night Shift", refined.
// A young, scrawny, excited black cat whose face is the channel avatar (the echo mark on ink).
// Paper keyline around the silhouette (two passes: fat paper strokes first, flat shapes on top)
// plus a thin outer ink rim so the outline also holds on bright photos. Oversized paper flight
// jacket with the sleeves pushed up, thin ink forearms, mitten paws, a cowlick and a slightly
// crooked headset mic. No internal lines on the fur.
import {
  PAL, TONE, LW, el, n, P, uid, clamp, lerp, rotP, state, EXPR, headXf, headPt, NECK_TOP,
  resolveArms, pawShapes, tailSpec, tailPath, eyes, brows, mouth, fx,
} from './core.mjs';

export const META = {
  id: 'A',
  name: 'NIGHT SHIFT',
  line: 'A young night-shift cat whose face is the channel avatar: the echo mark on ink, a borrowed headset, a jacket one size too big.',
};

const K = LW.key;

// ---------------------------------------------------------------- geometry
// Head: rounder crown, two scruffy cheek tufts each side, soft jaw. Chin at y -84.
const HEAD = 'M0,-444 C124,-444 216,-388 228,-284 C232,-252 233,-232 236,-214 L262,-198 L240,-184 L256,-160 L226,-150 '
  + 'C198,-104 120,-84 0,-84 C-120,-84 -198,-104 -226,-150 L-256,-160 L-240,-184 L-262,-198 L-236,-214 '
  + 'C-233,-232 -232,-252 -228,-284 C-216,-388 -124,-444 0,-444 Z';
// Cowlick: three soft spikes at the crown (the one nerd detail that reads at 48 px).
const TUFT = 'M-38,-436 C-46,-466 -40,-494 -22,-512 C-20,-490 -12,-474 0,-466 C2,-492 16,-510 40,-518 '
  + 'C30,-496 30,-470 34,-440 Z';
// Ears (viewer-left; the right ear is mirrored). Curved sides, rounded tip, warm inner ear.
const EAR = 'M-218,-300 C-230,-372 -226,-452 -204,-510 Q-196,-526 -184,-514 C-148,-480 -104,-440 -64,-410 Z';
const EAR_IN = 'M-194,-326 C-202,-378 -200,-434 -190,-472 C-162,-446 -132,-420 -104,-400 C-134,-378 -168,-352 -194,-326 Z';
const EAR_PIVOT = [-150, -352];
// Oversized jacket: dropped shoulders, long boxy body, ribbed hem.
const BODY = 'M-58,-6 C-96,-2 -128,10 -146,34 C-164,58 -170,100 -170,150 L-164,330 C-164,340 -158,346 -148,346 '
  + 'L148,346 C158,346 164,340 164,330 L170,150 C170,100 164,58 146,34 C128,10 96,-2 58,-6 Z';

const HEAD_FACE = { eyeY: -236, R: 50, browY: -316, noseY: -172, mouthY: -156 };

// ---------------------------------------------------------------- params
// drawCat params -> one resolved state (all numbers, see core.mjs DEFAULT).
export function resolve(p = {}) {
  const base = typeof p.expression === 'object' ? state(p.expression) : (EXPR[p.expression ?? 'neutral'] ?? EXPR.neutral);
  const s = state({ ...base, ...(p.state || {}) });
  const pose = p.pose ?? 'auto';
  if (pose === 'stand') s.arms = 'down';
  else if (pose === 'peek') { s.arms = 'peek'; s.bodyDy = 0; s.lean = 0; s.headDy = Math.min(s.headDy, 6); s.fxAmt *= 0.8; }
  else if (pose === 'point') { s.arms = 'point'; s.bodyDy = Math.min(0, s.bodyDy * 0.3); }
  else if (pose !== 'auto') s.arms = pose;
  if (p.pointAngle != null) s.pointAngle = p.pointAngle;
  if (p.edgeY != null) s.edgeY = p.edgeY;
  if (p.lookX != null || p.lookY != null) s.look = [p.lookX ?? s.look[0], p.lookY ?? s.look[1]];
  s.blink = clamp(p.blink ?? 0);
  s.talk = clamp(p.mouthOpen ?? 0);
  s.twitch = clamp(p.earTwitch ?? 0);
  s.tailSpec = tailSpec(p.tail, typeof base.tail === 'string' ? base.tail : 'neutral');
  if (pose === 'point' && p.tail == null) s.tailSpec = tailSpec('flick');
  s.pose = pose;
  return s;
}

// ---------------------------------------------------------------- draw
// Returns the cat as an SVG <g> string in rig space.
export function draw(p = {}, opt = {}) {
  const s = p.__resolved ? p : resolve(p);
  const KL = opt.keyline ?? PAL.paper, RIM = opt.rim ?? PAL.ink, rimW = opt.rimW ?? LW.rim;
  const arms = resolveArms(s);
  const ink = PAL.ink;

  // A part = list of [tag, attrs] ink/paper shapes. `sil` shapes form the silhouette.
  // Passes: 'rim' (thin ink outside the keyline), 'sil' (paper keyline), 'fill' (flat art).
  const silOf = (tag, a, col, extra) => {
    const hasFill = a.fill && a.fill !== 'none';
    return el(tag, { ...a, fill: hasFill ? col : 'none', stroke: col, 'stroke-width': (a['stroke-width'] || 0) + 2 * extra,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  };
  const passShape = (mode, tag, a) => {
    if (mode === 'rim') return silOf(tag, a, RIM, K + rimW);
    if (mode === 'sil') return silOf(tag, a, KL, K);
    return el(tag, a);
  };
  // shapes flagged `detail` are paper lines drawn on top in the fill pass only (paw toe splits)
  const shapes = (mode, list) => list.map(([t, a]) => {
    if (a.detail) return mode === 'fill' ? el(t, { ...a, detail: undefined, fill: undefined, stroke: PAL.paper, 'stroke-width': LW.line * 0.8, 'stroke-linecap': 'round' }) : '';
    return passShape(mode, t, a);
  }).join('');

  // ---- tail
  const tailList = [['path', { d: tailPath(s.tailSpec, [70, 306], 380), fill: ink }]];

  // ---- legs: thin, slightly knock-kneed, big feet
  const legList = [];
  for (const d of [-1, 1]) {
    legList.push(['path', { d: `M${d * 50},320 Q${d * 44},430 ${d * 58},514`, fill: 'none', stroke: ink, 'stroke-width': 30, 'stroke-linecap': 'round' }]);
    legList.push(['path', { d: `M${d * 26},516 C${d * 24},492 ${d * 66},488 ${d * 94},500 C${d * 118},510 ${d * 112},540 ${d * 80},540 L${d * 36},540 C${d * 26},540 ${d * 26},528 ${d * 26},516 Z`, fill: ink }]);
  }

  // ---- neck (long and thin), follows the head tilt
  const nTop = headPt(s, [0, -110]);
  const neckList = [['path', { d: `M0,12 Q${n(nTop[0] * 0.3)},${n(-50)} ${P(nTop)}`, fill: 'none', stroke: ink, 'stroke-width': 46, 'stroke-linecap': 'round' }]];

  // ---- body (jacket); shoulders drop with shoulderDy
  const bodyList = [['path', { d: BODY, fill: PAL.paper, transform: s.shoulderDy ? `translate(0 ${n(s.shoulderDy * 0.4)})` : undefined }]];
  const jacketDetail = () => {
    const t = s.shoulderDy ? ` transform="translate(0 ${n(s.shoulderDy * 0.4)})"` : '';
    return `<g${t}>`
      + el('path', { d: 'M-64,-4 C-40,18 -18,40 0,60 C18,40 40,18 64,-4', fill: 'none', stroke: ink, 'stroke-width': LW.band, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      + el('line', { x1: 0, y1: 60, x2: 0, y2: 314, stroke: ink, 'stroke-width': LW.line * 0.8 })
      + el('rect', { x: -166, y: 312, width: 332, height: 34, fill: ink })
      + el('circle', { cx: 44, cy: 112, r: 12, fill: PAL.amber })
      + el('circle', { cx: 76.7, cy: 112, r: 10.4, fill: 'none', stroke: PAL.amber, 'stroke-width': 3.3 })
      + '</g>';
  };

  // ---- arms: wide paper sleeve pushed up to the elbow, bunched cuff, thin ink forearm, mitten paw
  const armParts = (side) => {
    const a = arms[side], paw = side === 'L' ? arms.pawL : arms.pawR, pa = side === 'L' ? arms.aL : arms.aR;
    const [S, E, W] = a;
    const ua = Math.atan2(E[1] - S[1], E[0] - S[0]);
    const cuff = [E[0] - Math.cos(ua) * 6, E[1] - Math.sin(ua) * 6];
    // forearm stops a little short of the paw centre so the mitten sits on the wrist
    const fore = [['path', { d: `M${P(E)} L${P(W)}`, fill: 'none', stroke: ink, 'stroke-width': 26, 'stroke-linecap': 'round' }]];
    const th = side === 'R' ? -1 : 1;
    const pawT = `translate(${n(W[0])} ${n(W[1])}) rotate(${n(pa - 90)})`;
    const pawList = pawShapes(paw, (paw === 'point' || paw === 'grip') ? 1 : th).map(([t, at]) => [t, { ...at, fill: ink }]);
    // sleeve (paper with an ink outline) and the pushed-up cuff
    const sleeveD = `M${P(S)} L${P(cuff)}`;
    const cuffT = `rotate(${n((ua * 180) / Math.PI + 90)} ${n(cuff[0])} ${n(cuff[1])})`;
    return { fore, sleeveD, cuff, cuffT, pawList, pawT, ua };
  };
  // which: 'all' | 'arm' (sleeve + forearm) | 'paw'
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
    return armSil('sil', side, which) // local keyline so arms in front of the head or body stay separated
      + shapes('fill', A.fore)
      + el('path', { d: A.sleeveD, fill: 'none', stroke: ink, 'stroke-width': 66, 'stroke-linecap': 'round' })
      + el('path', { d: A.sleeveD, fill: 'none', stroke: PAL.paper, 'stroke-width': 66 - 2 * LW.line, 'stroke-linecap': 'round' })
      + el('ellipse', { cx: A.cuff[0], cy: A.cuff[1], rx: 42, ry: 24, fill: PAL.paper, stroke: ink, 'stroke-width': LW.line, transform: A.cuffT })
      + fold(-1) + fold(1)
      + (which === 'all' ? `<g transform="${A.pawT}">${shapes('fill', A.pawList)}</g>` : '');
  };

  // ---- head
  const earG = (mode, side) => {
    const sgn = side === 'L' ? 1 : -1;
    let rot = side === 'L' ? -s.earL : s.earR;
    let sq = side === 'L' ? s.earSqL : s.earSqR;
    if (side === 'R' && s.twitch > 0) { rot += 24 * s.twitch; sq *= 1 - 0.14 * s.twitch; }
    const pv = side === 'L' ? EAR_PIVOT : [-EAR_PIVOT[0], EAR_PIVOT[1]];
    const look = s.look[0] * -6;
    const tf = `translate(${n(look)} 0) rotate(${n(rot)} ${n(pv[0])} ${n(pv[1])}) translate(${n(pv[0])} ${n(pv[1])}) scale(1 ${n(sq * 100) / 100}) translate(${n(-pv[0])} ${n(-pv[1])})`;
    const mirror = sgn < 0 ? 'scale(-1 1)' : '';
    let g = passShape(mode, 'path', { d: EAR, fill: ink });
    if (mode === 'fill') g += el('path', { d: EAR_IN, fill: TONE.earIn });
    return `<g transform="${tf}"><g transform="${mirror}">${g}</g></g>`;
  };
  const headset = () => {
    const band = el('path', { d: 'M-230,-226 C-232,-462 232,-462 230,-226', fill: 'none', stroke: PAL.paper, 'stroke-width': LW.band, 'stroke-linecap': 'round' });
    const cup = (x) => el('rect', { x: x - 23, y: -274, width: 46, height: 92, rx: 10, fill: PAL.paper, stroke: ink, 'stroke-width': LW.line * 0.8 });
    // boom bends down and in, capsule sits a little crooked (tilted up) beside the mouth
    const boom = el('path', { d: 'M-232,-196 C-238,-128 -196,-112 -140,-118 L-112,-128', fill: 'none', stroke: PAL.paper, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      + el('rect', { x: -124, y: -142, width: 36, height: 22, rx: 8, fill: PAL.paper, stroke: ink, 'stroke-width': LW.line * 0.6, transform: 'rotate(-16 -106 -131)' });
    return { band, cups: cup(-230) + cup(230) + boom };
  };
  const face = () => {
    const fxo = { color: PAL.paper, w: 13, top: -400, hw: 250, tearAt: [-112 * s.eyeScale, -196], tear: PAL.paper, angerAt: [178, -486] };
    const lx = s.look[0] * 12, ly = s.look[1] * 6;
    return `<g transform="translate(${n(lx)} ${n(ly)})">`
      + eyes(s, { y: HEAD_FACE.eyeY, R: HEAD_FACE.R, fur: ink, lidLine: PAL.paper, lidLineW: LW.line, blink: s.blink })
      + brows(s, { y: HEAD_FACE.browY, dx: 68, len: 54, w: LW.band, color: PAL.paper })
      + el('path', { d: `M-13,${HEAD_FACE.noseY - 6} L13,${HEAD_FACE.noseY - 6} L0,${HEAD_FACE.noseY + 8} Z`, fill: PAL.paper, stroke: PAL.paper, 'stroke-width': 6, 'stroke-linejoin': 'round' })
      + mouth(s.mouth, { y: HEAD_FACE.mouthY, line: PAL.paper, fill: ink, tongue: TONE.tongue, talk: s.talk })
      + '</g>'
      + fx(s, fxo);
  };
  const head = (mode) => {
    let g = earG(mode, 'L') + earG(mode, 'R') + passShape(mode, 'path', { d: HEAD, fill: ink }) + passShape(mode, 'path', { d: TUFT, fill: ink });
    if (mode === 'fill') {
      const hs = headset();
      g += hs.band + face() + hs.cups;
    }
    return `<g transform="${headXf(s)}">${g}</g>`;
  };

  // ---- assemble
  const peek = s.arms === 'peek';
  const clipId = peek ? uid('pk') : null;
  const clipDef = peek ? `<clipPath id="${clipId}"><rect x="-3000" y="-3000" width="6000" height="${n(3000 + s.edgeY)}"/></clipPath>` : '';
  const wrapClip = (inner) => (peek ? `<g clip-path="url(#${clipId})">${inner}</g>` : inner);

  const pass = (mode) => {
    const body = shapes(mode, tailList) + shapes(mode, legList) + shapes(mode, neckList) + shapes(mode, bodyList)
      + (mode === 'fill' ? jacketDetail() : '');
    const armsM = (mode === 'fill') ? armFill('L') + armFill('R') : armSil(mode, 'L') + armSil(mode, 'R');
    if (peek) {
      const A = (w) => ((mode === 'fill') ? armFill('L', w) + armFill('R', w) : armSil(mode, 'L', w) + armSil(mode, 'R', w));
      return { under: wrapClip(body + head(mode) + A('arm')), over: A('paw') };
    }
    if (arms.front) return { under: body + head(mode) + armsM, over: '' };
    return { under: body + armsM + head(mode), over: '' };
  };
  const rim = opt.rim === false ? { under: '', over: '' } : pass('rim');
  const sil = pass('sil'), fill = pass('fill');
  const xf = `translate(0 ${n(s.bodyDy)}) rotate(${n(s.lean)} 0 540)`;
  return el('g', { transform: xf }, clipDef + rim.under + sil.under + fill.under + rim.over + fill.over);
}

// ---------------------------------------------------------------- framing
// Recommended view boxes (rig units) for common crops.
export const VIEW = {
  full: [-360, -600, 720, 1170],
  bust: [-340, -620, 680, 860],
  face: [-300, -560, 600, 520],
  peek: [-330, -580, 660, 600],     // bottom of the box = the edge line + paw overhang (edgeY -40 -> y 20)
  point: [-300, -620, 780, 1190],
};

// Public API. Returns a standalone <svg> string.
// drawCat({ expression, pose, lookX, lookY, blink, mouthOpen, earTwitch, tail, pointAngle, edgeY, state }, opt)
//   expression: 'neutral' | 'curious' | 'excited' | 'shocked' | 'sad' | 'skeptical' | 'angry' | state object
//   pose: 'auto' (the expression's own arms) | 'stand' | 'peek' | 'point' | 'wave' | any arm preset name
//   lookX, lookY: -1..1 pupil and face shift. blink 0..1. mouthOpen 0..1 (talking). earTwitch 0..1 (ring-side ear).
//   tail: preset name | number (sway offset, -1..1, animatable) | { a0, bend, curl, puff, wave, sway }
//   pointAngle: degrees for pose 'point' (0 = right, -90 = up, 180 = left; picks the arm on that side)
//   edgeY: the edge line for pose 'peek' in rig units (default -40, just under the chin)
// opt: { width, height, viewBox (array), keyline, rim (false to drop the ink rim), bg, inner (extra SVG) }
export function drawCat(p = {}, opt = {}) {
  const vb = opt.viewBox ?? VIEW[p.pose === 'peek' ? 'peek' : p.pose === 'point' ? 'point' : 'full'];
  const w = opt.width ?? Math.round(vb[2] / 2), h = opt.height ?? Math.round((w * vb[3]) / vb[2]);
  const bg = opt.bg ? el('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: opt.bg }) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(n).join(' ')}" width="${w}" height="${h}">${bg}${draw(p, opt)}${opt.inner ?? ''}</svg>`;
}
