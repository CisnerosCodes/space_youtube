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
import { PAL, clamp, lerp, n, el, uid, state, merge, lerpState, ARMS, LEGS, EXPR, faceOf, TAIL } from './core.mjs';
import { draw, keyPoints, bodyXfPt } from './catA.mjs';

export const FPS = 30;
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
export const EASE = {
  enter: cubicBezier(0.16, 1, 0.3, 1),   // design-system tokens (Motion.md)
  move: cubicBezier(0.76, 0, 0.24, 1),
  exit: cubicBezier(0.7, 0, 0.84, 0),
  io: (u) => { const t = clamp(u); return t * t * (3 - 2 * t); },
  out: (u) => 1 - Math.pow(1 - clamp(u), 3),
  in: (u) => Math.pow(clamp(u), 3),
  lin: (u) => clamp(u),
};
// Spring step response 0 -> 1 (overshoots), t in seconds. Motion.md formula.
export function spring(t, zeta = 0.7, f = 4) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
}
// A landing impact: 1 at contact, then a damped rebound (negative = stretch), seconds.
export const impact = (dt) => (dt < 0 ? 0 : dt < 0.06 ? 1 : Math.exp(-(dt - 0.06) * 8) * Math.cos((dt - 0.06) * 15));
export const bump = (u) => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u));
const win = (t, a, b) => clamp((t - a) / (b - a));           // 0..1 over [a, b]
// Trapezoid-velocity progress: speeds up over the first `a`, cruises, slows over the last `a`.
export function ramp(u, a = 0.2) {
  u = clamp(u); const v = 1 / (1 - a);
  if (u < a) return (v * u * u) / (2 * a);
  if (u > 1 - a) { const w = 1 - u; return 1 - (v * w * w) / (2 * a); }
  return v * (u - a / 2);
}
// Seeded hash in [0, 1).
export function rnd(seed, i) {
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
export function rootPt(R, p) {           // rig point (after body transform) -> world px
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
export class Actor {
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
export const standOn = (rect, f = 0.5) => [rect[0] + rect[2] * f, rect[1]];
// Anchor on the edge of a circle (a planet) at angle deg (0 = top, 90 = right); rotate with {rot: deg}.
export const onCircle = ([cx, cy, r], deg) => [cx + r * Math.sin(deg * D2R), cy - r * Math.cos(deg * D2R)];
// Words with times from plain text at a steady rate (words per second); *word* marks stress.
export function wordsFrom(text, t0, wps = 2.6) {
  const ws = text.split(/\s+/).filter(Boolean); let t = t0;
  return ws.map((w) => { const d = (0.18 + 0.07 * syllables(w)) * (2.6 / wps); const o = { w: w.replace(/\*/g, ''), s: t, e: t + d, stress: /^\*.*\*[.,!?]?$/.test(w) }; t += d + 0.06; return o; });
}
export function syllables(w) { const m = String(w).toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g); return Math.max(1, m ? m.length : 1); }

// Motion blur by sub-frame averaging: renders `frame(tt)` n times across the shutter (frames) and
// averages them. Each sample must be an opaque full frame (draw the background in it). Samples are
// stacked with opacity 1/(i+1), which is an exact average, in nested groups of at most four:
// Chromium composites each layer in 8 bits and longer flat stacks drift by up to 2 levels.
// n is rounded to 1, 2, 3, 4, 8, 12 or 16.
export function motionBlur(frame, t, nS = 1, shutter = 0.5, fps = FPS) {
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
export const MOVE_NAMES = Object.keys(MOVES);
export const GESTURE_NAMES = Object.keys(G);
