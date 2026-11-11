// actor.js: Night Shift (anime design) and Pho (the grumpy Phobos) as rigs with a director API, like the
// v3 actor: the shot list gives each character a list of moves anchored to narration words,
//   { "at": "capped", "do": "point", "target": "el:cap" }
// and the rig turns them into poses on every frame: entrances and exits, travels between places, acting
// gestures (two-bone sleeve arms and paws), expressions, eye direction, blinks, lip sync on the narration
// (on twos), idle bob, squash on expression changes. Gestures hold for "for" frames (default 36) or until
// the next gesture.
'use strict';
// face presets for Night Shift (the params of drawNSHead)
const NS_EXPR = {
  neutral: { mouth: 'w' },
  smirk: { mouth: 'smirk', slant: 0.5, lidL: 0.2, lidR: 0.25 },
  grin: { mouth: 'grin', open: 0.35, brow: 0.3, lidL: 0.1, lidR: 0.1 },
  happy: { mouth: 'grin', open: 0.25, lidL: 0.15, lidR: 0.15, brow: 0.2 },
  proud: { mouth: 'smirk', lidL: 0.3, lidR: 0.3, brow: -0.1, glint: 0.8 },
  shock: { mouth: 'shout', open: 0.9, eyeK: 1.3, pupil: 0.42, shock: 1, brow: 1.2, sweat: 1, tuftUp: 1, earL: -0.2, earR: -0.2 },
  grit: { mouth: 'grit', open: 0.35, slant: 1, lidL: 0.22, lidR: 0.22 },
  wink: { mouth: 'smirk', lidR: 1, slant: 0.3, glint: 0.9 },
  curious: { mouth: 'w', brow: 0.35, tilt: 0.08, earR: 0.12 },
  worried: { mouth: 'flat', brow: 0.7, sweat: 0.7, lidL: 0.1, lidR: 0.1 },
  focus: { mouth: 'flat', slant: 0.6, lidL: 0.3, lidR: 0.3 },
  meh: { mouth: 'flat', lidL: 0.45, lidR: 0.45, brow: 0.2 },
};
const NS_GESTURE_EXPR = { gasp: 'shock', pump: 'grin', fist: 'grit', think: 'curious', shrug: 'meh', salute: 'smirk', wave: 'happy', point: 'smirk', hold: 'proud', nod: null, lean: 'focus', wink: 'wink' };
const NS_PLACES = {
  left: [240, 1030, 104], right: [845, 1030, 104], center: [540, 1040, 110], 'low-left': [215, 1130, 96], 'low-right': [865, 1130, 96],
  'peek-right': [1012, 600, 150], 'peek-left': [68, 600, 150], 'peek-right-low': [1000, 1270, 140], 'peek-left-low': [80, 1270, 140], back: [300, 1470, 262], close: [540, 680, 300],
};
const PHO_PLACES = { 'top-right': [770, 640, 190], 'top-left': [310, 640, 190], right: [790, 900, 170], left: [290, 900, 170], center: [540, 720, 270], 'inset-right': [640, 760, 108], 'inset-left': [120, 520, 108] };
const NS_REST = { L: { e: [-1.7, 2.5], w: [-1.35, 3.4], paw: 'mitt' }, R: { e: [1.7, 2.5], w: [1.35, 3.4], paw: 'mitt' } };
const GESTURES = new Set(['point', 'pump', 'fist', 'salute', 'wave', 'shrug', 'think', 'gasp', 'nod', 'lean', 'hold', 'wink']);

function placeOf(p, table) { return Array.isArray(p) ? [p[0], p[1], p[2] ?? table.right[2]] : table[p || 'right'] || table.right; }
// target spec -> screen point
function targetPt(spec, f) {
  if (spec == null || spec === 'camera') return null;
  if (Array.isArray(spec)) return spec;
  const s = String(spec);
  if (s.startsWith('el:')) {
    const nm = s.slice(3);
    const b = beatAt(f); if (!b) return null;
    if (nm === 'subject') { const r = (b.shot.subjects?.(f) || [])[0]; return r ? [r[0] + r[2] / 2, r[1] + r[3] / 2] : null; }
    const a = b.shot.anchors?.(f) || {};
    const r = a[nm]; if (!r) return null;
    return r.length === 2 ? r : [r[0] + r[2] / 2, r[1] + r[3] / 2];
  }
  if (s === 'caption') return [400, 1250];
  return null;
}

function makeActor(spec, kind) {
  if (!spec || !spec.moves) return null;
  const moves = spec.moves.map((m, i) => ({ ...m, i, f: A(m.at) })).sort((a, b) => a.f - b.f || a.i - b.i);
  const visits = [];
  for (const m of moves) {
    if (m.do === 'enter') visits.push({ f0: m.f, enter: m, exit: null, f1: NF + 20 });
    if (m.do === 'exit' && visits.length && !visits[visits.length - 1].exit) { const v = visits[visits.length - 1]; v.exit = m; v.f1 = m.f + 10; }
  }
  const table = kind === 'ns' ? NS_PLACES : PHO_PLACES;
  // the place (x, y, s) at frame f inside a visit: the entrance place, then every "move" in turn
  function placeAt(v, f) {
    let cur = placeOf(v.enter.place, table);
    for (const m of moves) {
      if (m.do !== 'move' || m.f < v.f0 || m.f >= v.f1 || m.f > f) continue;
      const to = placeOf(m.to, table), d = m.frames ?? 10;
      const k = E.io(inv(m.f, m.f + d, f));
      cur = [lerp(cur[0], to[0], k), lerp(cur[1], to[1], k), lerp(cur[2], to[2], k)];
    }
    return cur;
  }
  function visitAt(f) { return visits.find((v) => f >= v.f0 && f < v.f1) || null; }
  function onAt(f) { return !!visitAt(f); }
  // last move of a kind at or before f inside the visit
  const lastOf = (v, f, test) => { let r = null; for (const m of moves) if (m.f <= f && m.f >= v.f0 - 1 && test(m)) r = m; return r; };
  function state(f) {
    const v = visitAt(f); if (!v) return null;
    const ff = on2(f);
    let [x, y, s] = placeAt(v, ff);
    const baseY = y;
    const how = v.enter.how || 'pop', side = x > 540 ? 1 : -1;
    // entrance and exit
    const ek = E.back(inv(v.f0, v.f0 + 8, ff), 1.6);
    let moving = ek < 1, smearK = 0, zipping = false;
    if (how === 'pop') y += (1 - ek) * 760;
    else if (how === 'slide') x += (1 - E.out5(inv(v.f0, v.f0 + 8, ff))) * side * 700;
    else if (how === 'drop') y -= (1 - ek) * 1400;
    else if (how === 'smear') { const k = E.out5(inv(v.f0, v.f0 + 6, f)); x += (1 - k) * side * 900; smearK = 1 - k; }
    if (v.exit) {
      const xk = E.in(inv(v.exit.f, v.exit.f + 8, f)), xh = v.exit.how || 'down';
      if (xk > 0) moving = true;
      if (xh === 'down') y += xk * 900;
      else if (xh === 'slide') x += xk * side * 800;
      else if (xh === 'zip') { y -= xk * 1700; smearK = Math.max(smearK, xk); if (xk > 0) zipping = true; }
    }
    const bob = Math.sin(sec(f) * 2.2 + (kind === 'ns' ? 0 : 1)) * 0.03;
    if (kind === 'pho') return Object.assign(phoState(v, f, ff, x, y, s, bob, moving, smearK), { baseY });
    // gesture in effect
    const g = lastOf(v, ff, (m) => GESTURES.has(m.do));
    const nextG = g && moves.find((m) => m.f > g.f && GESTURES.has(m.do));
    const gEnd = g ? Math.min(g.f + (g.for ?? 36), nextG ? nextG.f : Infinity, v.f1) : -1;
    const gOn = g && ff < gEnd;
    const gk = gOn ? E.back(inv(g.f, g.f + 5, ff), 1.8) * (1 - E.io(inv(gEnd - 5, gEnd, ff))) : 0;
    // expression: the last explicit expr, unless a gesture implies one that started later
    const ex = lastOf(v, ff, (m) => m.do === 'expr');
    let exprName = ex ? ex.expr : spec.expr || 'neutral';
    if (gOn && (!ex || ex.f < g.f) && NS_GESTURE_EXPR[g.do] && gk > 0.3) exprName = NS_GESTURE_EXPR[g.do];
    const changeF = Math.max(ex ? ex.f : -99, gOn ? g.f : -99);
    const p = Object.assign({ rim: spec.rim || C.amber, light: x > 540 ? -1 : 1 }, NS_EXPR[exprName] || NS_EXPR.neutral);
    p.squash = 1 - 0.06 * Math.max(0, 1 - (ff - changeF) / 4) * (ff >= changeF ? 1 : 0);
    // look and head turn toward the action
    const lk = lastOf(v, ff, (m) => m.do === 'look' || (m.do === 'point' && m.target != null) || (m.do === 'lean' && m.target != null));
    const tp = lk ? targetPt(lk.target, f) : null;
    if (tp) { const dx = tp[0] - x, dy = tp[1] - y, d = Math.hypot(dx, dy) || 1; p.look = [clamp(dx / d * 1.1, -1, 1), clamp(dy / d * 0.9, -1, 1)]; p.turn = clamp(dx / 900, -0.4, 0.4); }
    else { p.look = [clamp((540 - x) / 500, -0.6, 0.6) * 0.5, 0.15]; p.turn = clamp((540 - x) / 1600, -0.25, 0.25); }
    if (lk && lk.target === 'camera') { p.look = [0, 0.1]; p.turn = 0; }
    // lip sync on the narration and blinks
    const talk = speak(f);
    if (!['shout', 'grit'].includes(p.mouth)) { p.open = Math.max(p.open || 0, talk * 0.75); if (talk > 0 && p.mouth === 'w') p.mouth = 'smirk'; }
    const bl = blinkAt(f, 3 + v.f0);
    if (bl > 0 && !p.shock) { p.lidL = Math.max(p.lidL || 0, bl); p.lidR = Math.max(p.lidR || 0, bl); }
    // arms
    let arms = { L: { ...NS_REST.L }, R: { ...NS_REST.R } };
    let headDy = bob, tilt = (p.tilt || 0) + Math.sin(sec(f) * 1.3) * 0.02, prop = null, lean = [0, 0];
    if (gOn) {
      const d = g.do, k = gk;
      const mix = (a, b) => ({ e: [lerp(a.e[0], b.e[0], k), lerp(a.e[1], b.e[1], k)], w: [lerp(a.w[0], b.w[0], k), lerp(a.w[1], b.w[1], k)], paw: k > 0.4 ? b.paw : a.paw, pr: b.pr, front: true, pk: b.pk });
      if (d === 'point') {
        const t2 = tp || [540, 700];
        const useR = t2[0] >= x;
        const sd = useR ? 1 : -1, sh = [sd * 1.2, 1.5];
        let dx = (t2[0] - (x + sh[0] * s)), dy = (t2[1] - (y + sh[1] * s)); const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
        const jab = 0.25 * Math.max(0, Math.sin(Math.PI * inv(g.f + 5, g.f + 11, ff)));
        const reach = 1.85 + jab;
        const w = [sh[0] + dx * reach, sh[1] + dy * reach], e = [sh[0] + dx * reach * 0.5 - dy * 0.3 * sd, sh[1] + dy * reach * 0.5 + dx * 0.3 * sd];
        arms[useR ? 'R' : 'L'] = mix(NS_REST[useR ? 'R' : 'L'], { e, w, paw: 'point', pr: Math.atan2(dy, dx) });
      } else if (d === 'pump') {
        const b = Math.sin(sec(ff - g.f) * 14) * 0.15 * (1 - inv(g.f + 6, g.f + 20, ff));
        arms.R = mix(NS_REST.R, { e: [2.0, 1.0], w: [2.0, -0.7 + b], paw: 'fist', pr: -1.6 });
        headDy -= 0.06 * Math.max(0, Math.sin(sec(ff - g.f) * 9)) * (1 - inv(g.f, g.f + 18, ff));
      } else if (d === 'fist') {
        arms.L = mix(NS_REST.L, { e: [-1.8, 2.4], w: [-1.0, 1.9], paw: 'fist' }); arms.R = mix(NS_REST.R, { e: [1.8, 2.4], w: [1.0, 1.9], paw: 'fist' });
      } else if (d === 'salute') {
        arms.R = mix(NS_REST.R, { e: [2.35, 0.75], w: [1.5, -0.5], paw: 'flat', pr: -2.5 });
      } else if (d === 'wave') {
        const o = Math.sin(sec(ff - g.f) * 9) * 0.35;
        arms.R = mix(NS_REST.R, { e: [2.2, 1.0], w: [2.5 + o * 0.4, -0.5], paw: 'open', pr: -1.4 + o });
      } else if (d === 'shrug') {
        arms.L = mix(NS_REST.L, { e: [-2.0, 2.3], w: [-2.7, 1.7], paw: 'open', pr: Math.PI + 0.35 }); arms.R = mix(NS_REST.R, { e: [2.0, 2.3], w: [2.7, 1.7], paw: 'open', pr: -0.35 });
        tilt += 0.12 * k; headDy -= 0.05 * k;
      } else if (d === 'think') {
        arms.R = mix(NS_REST.R, { e: [1.9, 2.7], w: [0.55, 1.15], paw: 'fist', pr: -2.0 }); tilt += 0.08 * k;
      } else if (d === 'gasp') {
        arms.L = mix(NS_REST.L, { e: [-1.9, 2.1], w: [-1.15, 0.7], paw: 'open', pr: -1.9 }); arms.R = mix(NS_REST.R, { e: [1.9, 2.1], w: [1.15, 0.7], paw: 'open', pr: -1.2 });
        x += (hash(ff, 17, 1) - 0.5) * 6 * k;
      } else if (d === 'hold') {
        arms.R = mix(NS_REST.R, { e: [2.0, 1.7], w: [1.9, 0.35], paw: 'mitt', pr: -1.5 });
        prop = { kind: g.prop || 'tag', text: g.text || '', k };
      } else if (d === 'nod') {
        headDy += 0.07 * Math.max(0, Math.sin(sec(ff - g.f) * 12)) * (1 - inv(g.f, g.f + 20, ff));
      } else if (d === 'lean') {
        const t2 = tp || [540, 700]; lean = [clamp((t2[0] - x) / 10, -24, 24) * k, -12 * k]; tilt += clamp((t2[0] - x) / 3000, -0.12, 0.12) * k;
      }
    }
    p.tilt = tilt;
    return { kind: 'ns', place: Array.isArray(v.enter.place) ? 'custom' : v.enter.place || 'right', x: x + lean[0], y: y + lean[1], baseY, zipping, s, p, arms, headDy, prop, moving, smearK, back: v.enter.place === 'back', peek: String(v.enter.place || '').startsWith('peek') };
  }
  function phoState(v, f, ff, x, y, s, bob, moving, smearK) {
    const ex = lastOf(v, ff, (m) => m.do === 'expr');
    const expr = ex ? ex.expr : spec.expr || 'grumpy';
    const lk = lastOf(v, ff, (m) => m.do === 'look');
    const tp = lk ? targetPt(lk.target, f) : null;
    const look = tp ? [clamp((tp[0] - x) / 300, -1, 1), clamp((tp[1] - y) / 300, -1, 1)] : [0.2, -0.1];
    const sh = lastOf(v, ff, (m) => m.do === 'shake');
    const shake = sh && ff < sh.f + (sh.for ?? 24) ? 12 * (1 - inv(sh.f, sh.f + (sh.for ?? 24), ff)) : 0;
    const sw = lastOf(v, ff, (m) => m.do === 'sweat');
    const pc = lastOf(v, ff, (m) => m.do === 'piece');
    const changeF = ex ? ex.f : -99;
    const squash = 1 - 0.07 * Math.max(0, 1 - (ff - changeF) / 4) * (ff >= changeF ? 1 : 0);
    const p = { expr, look, vein: expr === 'furious' ? E.back(inv(changeF, changeF + 6, f)) : 0, shake: shake + (expr === 'furious' ? 4 : 0), sweat: sw && sw.on !== false ? E.back(inv(sw.f, sw.f + 6, f)) : 0, piece: pc && pc.on !== false ? inv(pc.f, pc.f + 5, f) : 0, squash, rim: spec.rim || C.amber, light: x > 540 ? -1 : 1 };
    return { kind: 'pho', place: v.enter.place, x, y: y + bob * s, s, p, moving, smearK, inset: String(v.enter.place || '').startsWith('inset') };
  }
  const distinct = [...new Set(moves.filter((m) => !['expr', 'look'].includes(m.do)).map((m) => (m.do === 'enter' || m.do === 'exit' ? `${m.do} ${m.how || ''}`.trim() : m.do)))];
  return { kind, moves, visits, state, onAt, distinct };
}

// draw an actor state (screen space)
function drawActor(st) {
  if (!st) return;
  if (st.kind === 'pho') {
    if (st.inset) {
      ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(0.03);
      ctx.fillStyle = C.ink; ctx.fillRect(-12, -12, 304, 244);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 280, 220); ctx.clip();
      const g = ctx.createLinearGradient(0, 0, 0, 220); g.addColorStop(0, '#2a2350'); g.addColorStop(1, '#141a44'); ctx.fillStyle = g; ctx.fillRect(0, 0, 280, 220);
      drawPho(140, 115, st.s, st.p);
      ctx.restore();
      ctx.strokeStyle = C.paper; ctx.lineWidth = 6; ctx.strokeRect(0, 0, 280, 220);
      ctx.restore();
      return;
    }
    const d = (k) => drawPho(st.x, st.y - k * 120 * st.smearK, st.s, st.p, Math.sin(G.t * 0.7) * 0.04);
    if (st.smearK > 0.05) smear(d, 3, 0.35); else d(0);
    return;
  }
  if (st.back) { drawNSBack(st.x, st.y, st.s, { tilt: st.p.tilt * 0.5, earL: -0.1, earR: 0.1 * Math.sin(G.t * 3), rim: st.p.rim === C.amber ? C.cyan : st.p.rim }); return; }
  const draw = (k) => {
    if (st.peek) {
      const side = st.x > 540 ? 1 : -1;
      drawNSHead(st.x + k * side * 200, st.y + st.headDy * st.s, st.s, Object.assign({}, st.p, { tilt: -side * 0.38 + st.p.tilt }));
      return;
    }
    const bottom = st.zipping ? 4.2 : Math.max(3.4, (H + 60 - (st.baseY ?? st.y)) / st.s);
    drawNSBust(st.x, st.y - k * 160, st.s, Object.assign({}, st.p), st.arms, { bottom, bob: st.headDy, flap: 0.4 });
    if (st.prop && st.prop.k > 0.3) {
      const w = st.arms.R.w, px = st.x + w[0] * st.s, py = st.y + w[1] * st.s;
      if (st.prop.kind === 'canister') drawCanister(px + 4, py - 0.62 * st.s * 0.75, st.s * 0.62, { text: st.prop.text, tag: 1, rot: -0.08 + Math.sin(G.t * 2.5) * 0.04 });
      else if (st.prop.text) drawTag(px, py - 10, st.prop.text, 0.25 + Math.sin(G.t * 3.5) * 0.12, { size: 34, len: 50 });
    }
  };
  if (st.smearK > 0.05) smear(draw, 3, 0.35); else draw(0);
}
// screen box of an actor (for the subject lint)
function actorBox(st) {
  if (!st) return null;
  if (st.kind === 'pho') return st.inset ? [st.x - 12, st.y - 12, 304, 244] : [st.x - st.s * 1.15, st.y - st.s * 0.95, st.s * 2.3, st.s * 1.9];
  if (st.back) return [st.x - st.s * 1.9, st.y - st.s * 1.5, st.s * 3.8, H - st.y + st.s * 1.5];
  if (st.peek) return [st.x - st.s * 1.2, st.y - st.s * 1.4, st.s * 2.4, st.s * 2.3];
  return [st.x - st.s * 1.7, st.y - st.s * 1.45, st.s * 3.4, H - st.y + st.s * 1.45];
}
