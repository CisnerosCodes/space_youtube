// shots2.js: comparison panels, diagrams and paths, reaction close-ups, STEP / NEXT bands, the NEXT scene
// and the end card.
'use strict';
// ---------------------------------------------------------------- path helpers (unit or screen space)
function smoothPts(pts, seg = 12) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function polyLen(pts) { let s = 0; const acc = [0]; for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(s); } return { s, acc }; }
function polyAt(pts, u, PL = polyLen(pts)) {
  const d = clamp(u) * PL.s; let i = 1; while (i < pts.length - 1 && PL.acc[i] < d) i++;
  const a = pts[i - 1], b2 = pts[i], seg = PL.acc[i] - PL.acc[i - 1] || 1, t = (d - PL.acc[i - 1]) / seg;
  return [lerp(a[0], b2[0], t), lerp(a[1], b2[1], t), Math.atan2(b2[1] - a[1], b2[0] - a[0])];
}
function polySlice(pts, u0, u1, PL = polyLen(pts)) {
  if (u1 <= u0) return [];
  const d0 = clamp(u0) * PL.s, d1 = clamp(u1) * PL.s, out = [polyAt(pts, u0, PL).slice(0, 2)];
  for (let i = 1; i < pts.length - 1; i++) if (PL.acc[i] > d0 && PL.acc[i] < d1) out.push(pts[i]);
  out.push(polyAt(pts, u1, PL).slice(0, 2));
  return out;
}
// a mono label chip at screen point (x, y) (top-left), shifted to stay inside x 80 to 900
function labelChip(lines, x, y, k, opt = {}) {
  const [w] = chipSize(lines, opt.size ?? 30);
  const xx = clamp(x, 82, 898 - w);
  return drawChip(lines, xx, y, k, Object.assign({ size: 30 }, opt));
}

// ---------------------------------------------------------------- compare: two panels (photos or drawn
// craft), each with its label, and a number burst that slams on its word
SHOTS.compare = (spec, b) => {
  const items = spec.items || [];
  const side = spec.layout === 'side', lens = spec.layout === 'lens';
  const LENS = [[330, 565, 235], [720, 925, 235]];
  const rects = lens ? LENS.map(([x, y, r]) => [x - r, y - r, 2 * r, 2 * r]) : side ? [[60, 360, 470, 740], [550, 360, 470, 740]] : [[70, 340, 940, 380], [70, 770, 940, 380]];
  const rots = [-2, 1.6];
  function draw(f) {
    paintBg(spec.bg || (lens ? 'focus' : 'speed'), f, { seed: 80 + b.i, angle: side ? 90 : 0, color: spec.color, cy: 760, r: 520 });
    items.forEach((it, i) => {
      const a = Ao(it.at, b.w), r = rects[i];
      const k = E.out5(inv(a, a + 8, f)); if (k <= 0) return;
      const dx = (1 - k) * (i ? 1 : -1) * 1100;
      R.moving += k < 1 ? 1 : 0;
      ctx.save(); ctx.translate(dx, 0);
      const z = 1 + (spec.push ?? 0.05) * E.io(inv(a, b.T1, f));
      if (lens) {
        let [cx, cy, rr] = LENS[i];
        if (i === 0 && items[1]) { const mv = E.io(inv(Ao(items[1].at, b.w), Ao(items[1].at, b.w) + 10, f)); cx = lerp(540, cx, mv); cy = lerp(690, cy, mv); rr = lerp(330, rr, mv); }
        const pop = E.back(inv(a, a + 7, f), 1.8), r2 = rr * pop;
        ctx.restore(); ctx.save();
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, r2 + 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(cx, cy, r2 + 18, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r2), 0, Math.PI * 2); ctx.clip();
        const rr2 = [cx - r2, cy - r2, 2 * r2, 2 * r2];
        const m = coverMap(it.image, rr2, it.focus || IMAGES[it.image].focus, z * 1.06);
        ctx.translate(cx, cy); ctx.rotate(sec(f - a) * 0.05 * (i ? -1 : 1)); ctx.translate(-cx, -cy); drawCover(it.image, rr2, m);
        ctx.restore();
        ctx.strokeStyle = it.tone === 'bad' ? C.red : C.amber; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, r2 + 4, 0, Math.PI * 2); ctx.stroke();
        if (it.label) { const [lw] = chipSize([it.label], 30); drawChip([it.label], cx - lw / 2, i ? cy - rr - 66 : cy + rr - 40, inv(a + 4, a + 10, f), { size: 30, accent: it.tone === 'bad' ? C.red : C.amber }); }
        ctx.restore();
        R.moving -= k < 1 ? 1 : 0;
        if (it.value != null) {
          const va = Ao(it.value_at, a + 10); const vk = E.back(inv(va, va + 6, f), 2.4);
          const bx = i ? 290 : Math.min(735, cx + rr * 0.82), by = i ? 905 : cy - rr * 0.78;
          drawBurst(bx, by, it.burst_r ?? (i ? 105 : 125), String(it.value), vk, { fill: it.tone === 'bad' ? C.red : C.amber, sub: it.value_sub || '' });
        }
        return;
      }
      withPanel(r, rots[i], () => {
        if (it.image) { const m = coverMap(it.image, r, it.focus || IMAGES[it.image].focus, z); drawCover(it.image, r, m); }
        else { paintBg('space', f, { seed: 90 + i }); drawCraft(it.craft || 'capsule', r[0] + r[2] / 2, r[1] + r[3] * 0.7, (CRAFT_SIZE[it.craft || 'capsule'] || 150) * 0.8, {}); }
        if (it.dim) { ctx.fillStyle = `rgba(11,11,12,${it.dim})`; ctx.fillRect(r[0], r[1], r[2], r[3]); }
      });
      if (it.label) labelChip([it.label], r[0] + 18, r[1] + 16, inv(a + 4, a + 10, f), { size: 30, accent: it.tone === 'bad' ? C.red : C.amber });
      ctx.restore();
      R.moving -= k < 1 ? 1 : 0;
      if (it.value != null) {
        const va = Ao(it.value_at, a + 10); const vk = E.back(inv(va, va + 6, f), 2.4);
        const bx = side ? r[0] + r[2] / 2 : r[0] + r[2] - 190, by = side ? r[1] + r[3] - 150 : r[1] + r[3] / 2 + 10;
        drawBurst(bx, by, it.burst_r ?? 130, String(it.value), vk, { fill: it.tone === 'bad' ? C.red : C.amber, sub: it.value_sub || '' });
      }
    });
    if (spec.slash !== false && items.length > 1 && !lens) {
      const a = Ao(items[1].at, b.w); const k = E.out5(inv(a, a + 6, f));
      if (k > 0) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = C.amber; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); if (side) { ctx.moveTo(530, 330); ctx.lineTo(560, 700); ctx.lineTo(536, 720); ctx.lineTo(552, 1130); ctx.lineTo(522, 740); ctx.lineTo(544, 722); ctx.closePath(); } else { ctx.moveTo(-20, 752); ctx.lineTo(540, 736); ctx.lineTo(560, 752); ctx.lineTo(1100, 740); ctx.lineTo(560, 770); ctx.lineTo(540, 756); ctx.closePath(); } ctx.fill(); ctx.stroke(); ctx.restore(); }
    }
  }
  return {
    draw,
    subjects: (f) => items.map((it, i) => (f >= Ao(it.at, b.w) ? rects[i] : null)).filter(Boolean),
    anchors: () => ({ a: [rects[0][0] + rects[0][2] / 2, rects[0][1] + rects[0][3] / 2], b: rects[1] ? [rects[1][0] + rects[1][2] / 2, rects[1][1] + rects[1][3] / 2] : null, subject: [540, 740] }),
    hits: () => items.filter((it) => it.value != null).map((it) => [Ao(it.value_at, Ao(it.at, b.w) + 10), 0.5]),
  };
};

// ---------------------------------------------------------------- diagram: paths that draw in on words,
// a craft riding a path, hot segments, stop markers, labels, rings, drawn bodies; a backdrop and camera keys
SHOTS.diagram = (spec, b) => {
  const size = spec.size || [1000, 1000];
  const reg = spec.region || [60, 330, 960, 900];
  const sc = Math.min(reg[2] / size[0], reg[3] / size[1]);
  const ox = reg[0] + (reg[2] - size[0] * sc) / 2, oy = reg[1] + (reg[3] - size[1] * sc) / 2;
  const els = spec.elements || [];
  const paths = {};
  els.forEach((e) => { if (Array.isArray(e.path)) { const pts = e.smooth === false ? e.path : smoothPts(e.path); paths[e.id || 'p' + Object.keys(paths).length] = { e, pts, PL: polyLen(pts) }; } });
  let camM = null;
  const toS = (p) => [ox + p[0] * sc, oy + p[1] * sc];
  function camAt(f) {
    let z = 1, c = [size[0] / 2, size[1] / 2];
    for (const k of spec.camera || []) { const a = A(k.at), u = E.io(inv(a, a + (k.frames ?? 14), f)); if (u <= 0) continue; if (k.zoom != null) z = lerp(z, k.zoom, u); if (k.center) c = [lerp(c[0], k.center[0], u), lerp(c[1], k.center[1], u)]; }
    z *= 1 + 0.04 * E.io(inv(b.w, b.T1, f));
    return { z, c };
  }
  // screen point of a unit point under the camera at f
  const PIV = toS([size[0] / 2, size[1] / 2]);
  function scr(p, f) { const { z, c } = camAt(f); const s0 = toS(c), s1 = toS(p); return [PIV[0] + (s1[0] - s0[0]) * z, PIV[1] + (s1[1] - s0[1]) * z]; }
  const progress = (e, f) => { const a = Ao(e.at, b.w); return E.io(inv(a, a + (e.draw ?? 18), f)); };
  function crafts(f) {
    return els.filter((e) => e.craft && e.path).map((e) => {
      const P = paths[e.path]; if (!P) return null;
      let u = 0; const ks = (e.keys || []).map((k) => ({ f: A(k.at), u: k.u, d: k.frames }));
      let prev = { f: b.T0, u: ks.length ? ks[0].u : 0 };
      for (const k of ks) { const t = (e.ease === 'linear' ? (x) => clamp(x) : E.io)(inv(prev.f, k.f, f)); u = lerp(prev.u, k.u, t); if (f < k.f) break; prev = k; u = k.u; }
      const p = polyAt(P.pts, u, P.PL);
      return { e, u, p, P };
    }).filter(Boolean);
  }
  function draw(f) {
    const bk = spec.backdrop || {};
    if (bk.kind === 'limb') { paintBg('space', f, { seed: 100 + b.i, drift: 1.6 }); }
    else paintBg(bk.kind || 'space', f, { seed: 100 + b.i, angle: bk.angle });
    if (bk.lines !== false) speedLines(bk.angle ?? 42, { n: 50, alpha: 0.42, speed: 3400, seed: 140 + b.i, w: [3, 10], len: [200, 700] });
    const { z, c } = camAt(f); const cs = toS(c);
    ctx.save(); ctx.translate(PIV[0] + Math.sin(sec(f) * 1.1) * 8, PIV[1] + Math.cos(sec(f) * 0.9) * 6); ctx.rotate(Math.sin(sec(f) * 0.7) * 0.006); ctx.scale(z, z); ctx.translate(-cs[0], -cs[1]);
    camM = ctx.getTransform();
    if (bk.kind === 'limb') drawLimb(540, (bk.y ?? 1000) + (bk.r ?? 2400), bk.r ?? 2400, { hot: 0 });
    ctx.translate(ox, oy); ctx.scale(sc, sc); G.S = sc;
    regIllus(0, 0, size[0], size[1]);
    for (const e of els) {
      const a = Ao(e.at, b.w); if (f < a) continue;
      if (e.body) { const k = E.back(inv(a, a + 8, f), 1.6); const [x, y] = e.pos; const r = e.r * k; if (r > 1) { ctx.save(); ctx.setTransform(ctx.getTransform()); if (e.body === 'earth') drawEarthCel(x, y, r, { lon0: e.lon0 ?? 0, lat0: e.lat0 ?? 10 }); else if (e.body === 'moon') drawMoonCel(x, y, r); else if (e.body === 'mars') drawMarsCel(x, y, r); ctx.restore(); } }
      if (e.zone) { const k = inv(a, a + 10, f); ctx.save(); ctx.globalAlpha = 0.28 * k; ctx.fillStyle = col(e.color, C.red); const [x, y, w, h] = e.zone; ctx.fillRect(x, y, w, h); ctx.restore(); }
    }
    for (const [id, P] of Object.entries(paths)) {
      const e = P.e, u = progress(e, f); if (u <= 0) continue;
      const pts = polySlice(P.pts, 0, u, P.PL); if (pts.length < 2) continue;
      const w = (e.width ?? 9) / sc * 0.9, c2 = col(e.color, C.amber);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = C.ink; ctx.lineWidth = w + 8 / sc; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      if (e.dash) { ctx.setLineDash([28 / sc, 18 / sc]); ctx.lineDashOffset = -f * 2 / sc; }
      ctx.strokeStyle = c2; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.restore();
      if (u < 1 && e.arrow !== false) { const q = polyAt(P.pts, u, P.PL); ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(q[2]); ctx.fillStyle = c2; ctx.strokeStyle = C.ink; ctx.lineWidth = 4 / sc; ctx.beginPath(); ctx.moveTo(26 / sc, 0); ctx.lineTo(-16 / sc, -18 / sc); ctx.lineTo(-16 / sc, 18 / sc); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    }
    // hot segments along paths (glow + flicker), only where the path is already drawn
    for (const e of els) {
      if (!e.heat) continue; const P = paths[e.heat]; if (!P) continue;
      const a = Ao(e.at, b.w); if (f < a) continue;
      const k = E.io(inv(a, a + (e.draw ?? 10), f)), pu = progress(P.e, f);
      const u1 = Math.min(pu, lerp(e.from, e.to, k)); if (u1 <= e.from) continue;
      const pts = polySlice(P.pts, e.from, u1, P.PL);
      const fl = 0.85 + 0.15 * hash(on2(f), 31, 1);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(255,106,42,${0.35 * fl})`; ctx.lineWidth = 46 / sc; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = e.color ? col(e.color) : '#ff6a2a'; ctx.lineWidth = 18 / sc; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 6 / sc; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.restore();
    }
    for (const e of els) {
      const a = Ao(e.at, b.w); if (f < a) continue;
      if (e.marker) {
        const k = E.back(inv(a, a + 6, f), 2.2), [x, y] = e.pos;
        ctx.save(); ctx.translate(x, y); ctx.rotate((e.angle ?? 0) * Math.PI / 180); ctx.scale(k / sc, k / sc);
        if (e.marker === 'stop') {
          ctx.fillStyle = C.ink; ctx.fillRect(-16, -110, 32, 220);
          ctx.fillStyle = col(e.color, C.amber); ctx.fillRect(-10, -104, 20, 208);
          ctx.save(); ctx.beginPath(); ctx.rect(-10, -104, 20, 208); ctx.clip(); ctx.fillStyle = C.ink; for (let i = -6; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-12, i * 34); ctx.lineTo(12, i * 34 - 18); ctx.lineTo(12, i * 34 - 6); ctx.lineTo(-12, i * 34 + 12); ctx.fill(); } ctx.restore();
        } else if (e.marker === 'x') { ctx.strokeStyle = C.ink; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(-34, -34); ctx.lineTo(34, 34); ctx.moveTo(34, -34); ctx.lineTo(-34, 34); ctx.stroke(); ctx.strokeStyle = col(e.color, C.red); ctx.lineWidth = 12; ctx.stroke(); }
        else { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = col(e.color, C.amber); ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      if (e.ring) { const [x, y, r] = e.ring; for (const p of [a, ...(e.pulse || []).map(A)]) { const d = (f - p) / 20; if (d >= 0 && d < 1) { ctx.strokeStyle = `rgba(245,184,61,${1 - d})`; ctx.lineWidth = 6 / sc; ctx.beginPath(); ctx.arc(x, y, r + d * 120, 0, Math.PI * 2); ctx.stroke(); } } ctx.strokeStyle = C.amber; ctx.lineWidth = 6 / sc; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
    }
    for (const cr of crafts(f)) {
      const { e, p, u, P } = cr;
      const hot = els.some((h) => h.heat === e.path && f >= Ao(h.at, b.w) && u >= h.from && u <= h.to);
      const s2 = (e.size ?? 80) / sc;
      const ang = p[2];
      const one = (q) => drawCraft(e.craft, p[0] - Math.cos(ang) * q * 40 / sc, p[1] - Math.sin(ang) * q * 40 / sc, s2, { rot: ang - Math.PI / 2, plasma: hot ? 0.9 : 0, char: 0.6 });
      smear(one, 2, 0.3);
    }
    ctx.restore();
    // labels in screen space (chips stay upright and inside the safe zone)
    for (const e of els) {
      if (!e.label) continue;
      const a = Ao(e.at, b.w); if (f < a) continue;
      const s = scr(e.pos, f);
      labelChip([{ t: e.label, c: e.color === 'muted' ? '#a9a6a0' : e.color === 'red' ? C.red : e.color === 'paper' ? C.paper : C.amber }], s[0], s[1], inv(a, a + 7, f), { size: e.size ?? 30, accent: col(e.color === 'muted' ? 'muted' : e.color, C.amber) });
    }
  }
  return {
    draw,
    subjects: (f) => [[ox, oy, size[0] * sc, size[1] * sc]],
    anchors: (f) => {
      const out = { subject: [540, 730] };
      for (const e of els) if (e.id) { const P = paths[e.id]; const p = P ? P.pts[P.pts.length - 1] : e.pos || (e.ring ? e.ring.slice(0, 2) : null); if (p) out[e.id] = scr(p, f); }
      for (const cr of crafts(f)) out[cr.e.id || 'craft'] = scr(cr.p, f);
      return out;
    },
    hits: () => els.filter((e) => e.marker === 'stop').map((e) => [Ao(e.at, b.w), 0.7]),
  };
};

// ---------------------------------------------------------------- reaction close-up (Night Shift or Pho)
SHOTS.react = (spec, b) => {
  const who = spec.who || 'ns';
  const faces = (spec.faces || [{ at: null, expr: who === 'ns' ? 'shock' : 'grumpy' }]).map((x) => ({ ...x, f: Ao(x.at, b.T0) }));
  const pos = spec.pos || (who === 'ns' ? [540, 640] : [600, 700]);
  const size = spec.size || (who === 'ns' ? 290 : 250);
  function faceAt(ff) { let cur = faces[0]; for (const x of faces) if (x.f <= ff) cur = x; return cur; }
  function draw(f) {
    const ff = on2(f);
    paintBg(spec.bg || (who === 'ns' ? 'red' : 'focus'), f, { seed: 120 + b.i, cx: pos[0], cy: pos[1] + 60, r: size * 1.2, color: spec.color });
    const cur = faceAt(ff);
    const push = 1 + 0.08 * E.io(inv(b.w, b.T1, f));
    if (who === 'ns') {
      const p = Object.assign({ rim: col(spec.rim, C.amber), light: 1 }, NS_EXPR[cur.expr] || {}, cur.p || {});
      const talk = speak(f); if (!['shout', 'grit'].includes(p.mouth)) p.open = Math.max(p.open || 0, talk * 0.7);
      const bl = blinkAt(f, 7 + b.i); if (bl && !p.shock) { p.lidL = Math.max(p.lidL || 0, bl); p.lidR = Math.max(p.lidR || 0, bl); }
      p.squash = 1 - 0.06 * Math.max(0, 1 - (ff - cur.f) / 4) * (ff >= cur.f ? 1 : 0);
      const shiver = p.shock ? (hash(ff, 95, 1) - 0.5) * 8 : 0;
      const turn = spec.turn_in ? kf(ff, [[b.w, 0.95], [b.w + 6, 0]], E.out) : 0;
      if (spec.look) p.look = spec.look;
      const d = (k) => drawNSHead(pos[0] + shiver + k * 120, pos[1], size * push, Object.assign({}, p, { turn: Math.min(1, turn + k * 0.4) }));
      if (spec.turn_in && ff < b.w + 6) smear(d, 3, 0.45); else d(0);
      R.ns = true;
      if (spec.paw) {
        const pa = A(spec.paw.at), pc = Ao(spec.paw.close_at, pa + 6);
        const k = E.out5(inv(pa, pa + 6, ff)), close = inv(pc, pc + 6, ff), ps = lerp(160, 500, k);
        if (k > 0) {
          const dp = (s) => { ctx.save(); ctx.translate(540, lerp(1500, 1080, k) + s * 160); ctx.scale(ps * (1 - s * 0.3), ps * (1 - s * 0.3)); G.S = ps; bigPaw(close); ctx.restore(); };
          if (ff < pa + 6) smear(dp, 3, 0.4); else dp(0);
        }
      }
    } else {
      const p = { expr: cur.expr || 'grumpy', look: cur.look || [0, 0], vein: cur.expr === 'furious' ? E.back(inv(cur.f, cur.f + 6, f)) : 0, shake: cur.expr === 'furious' ? 10 * (1 - inv(cur.f, cur.f + 20, f)) : cur.expr === 'flinch' ? 6 : 0, sweat: cur.sweat ? E.back(inv(cur.f, cur.f + 6, f)) : 0, piece: spec.piece ? inv(A(spec.piece), A(spec.piece) + 5, f) : 0, squash: 1 - 0.07 * Math.max(0, 1 - (ff - cur.f) / 4) * (ff >= cur.f ? 1 : 0) };
      drawPho(pos[0], pos[1] + Math.sin(sec(f) * 2.2) * 10, size * push, p, -0.06);
      if (spec.reticle) {
        const ra = A(spec.reticle.at), rk = E.out(inv(ra, ra + 14, f));
        const pj = spec.reticle.piece_at ? E.out5(inv(A(spec.reticle.piece_at), A(spec.reticle.piece_at) + 4, f)) : 0;
        const pp = phoPt(pos[0], pos[1], size * push, -0.06, -0.62, 0.12);
        const rr = lerp(lerp(size * 2.2, size * 1.35, rk), size * 0.6, pj);
        ctx.save(); ctx.translate(lerp(pos[0], pp[0], pj), lerp(pos[1], pp[1], pj)); ctx.rotate(lerp(0.8, 0, rk) + sec(f) * (0.15 + pj * 0.6)); ctx.strokeStyle = C.red; ctx.lineWidth = 9; ctx.lineCap = 'square'; ctx.globalAlpha = rk;
        for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(rr, rr * 0.55); ctx.lineTo(rr, rr); ctx.lineTo(rr * 0.55, rr); ctx.stroke(); }
        ctx.restore();
      }
    }
  }
  return { draw, subjects: () => [[pos[0] - size, pos[1] - size, size * 2, size * 1.8]], anchors: () => ({ subject: pos, face: pos }), hits: () => (spec.paw ? [[A(spec.paw.at), 1]] : []) };
};

// ---------------------------------------------------------------- STEP / NEXT band (a wipe transition):
// the band sweeps in over the previous shot and sweeps out revealing the next one
const BAND_ST = {
  1: { y: 820, ang: -8, axis: 'x', dir: 1, Lin: 1650, Lout: 1750, color: C.amber, face: 'top', faceX: -240, bg: -20 },
  2: { y: 860, ang: 6, axis: 'y', dir: 1, Lin: 1300, Lout: 1500, color: C.amber, face: 'binocs', bounce: 1.7, bg: 90, enter: 10 },
  3: { y: 760, ang: -16, axis: 'x', dir: -1, Lin: 1700, Lout: 1800, color: C.red, numC: C.amber, numDrop: C.ink, face: 'side', zoom: 0.4, bg: 164, hatch: 'rgba(0,0,0,0.18)' },
  4: { y: 820, ang: 10, axis: 'y', dir: -1, Lin: 1550, Lout: 1300, color: C.ink2, text: C.amber, numC: C.amber, numDrop: C.red2, ink: C.ink, hatch: 'rgba(245,184,61,0.10)', face: 'top', faceX: 240, spin: 16, numZoom: 3.2, bg: -90, enter: 10 },
  next: { y: 820, ang: -6, axis: 'x', dir: 1, Lin: 1650, Lout: 1750, color: C.paper, text: C.ink, ink: C.ink, face: 'top', faceX: 250, bg: -20 },
};
function halfRect(st, e, greater) {
  const s = st.dir; let lo, hi;
  if (greater) { if (s > 0) { lo = e; hi = e + 9000; } else { lo = -e - 9000; hi = -e; } }
  else { if (s > 0) { lo = e - 9000; hi = e; } else { lo = -e; hi = -e + 9000; } }
  ctx.beginPath();
  if (st.axis === 'y') ctx.rect(-5000, lo, 10000, hi - lo); else ctx.rect(lo, -5000, hi - lo, 10000);
}
SHOTS.band = (spec, b) => {
  const st0 = Object.assign({}, BAND_ST[spec.style ?? 1]);
  const words = spec.words ? [wordIndexAt(A(spec.words[0])), wordIndexAt(A(spec.words[1] ?? spec.words[0]))] : null;
  if (words) for (let i = words[0]; i <= words[1]; i++) BANNER_WORDS.add(i);
  function draw(f) {
    const fIn = b.T0, fOut = b.T1 - 8;
    const st = Object.assign({ fIn, num: spec.num || '', words, label: spec.label || null, step: spec.step, steps: spec.steps, size: spec.size }, st0);
    if (spec.stamp) st.stamp = { f: A(spec.stamp.at), t: spec.stamp.text, x: spec.stamp.x, y: spec.stamp.y, size: spec.stamp.size };
    const en = st.enter || 8;
    const k = inv(fIn, fIn + en, f), out = inv(fOut, fOut + 8, f);
    const ein = st.bounce ? E.back(k, st.bounce) : E.io(k);
    const off = (1 - ein) * -st.Lin + E.io(out) * st.Lout;
    const h = st.axis === 'y' ? 175 : 1000;
    ctx.save();
    // camera on the band shot: slow push plus the style's entry move
    const kk = inv(fIn, fIn + 12, f);
    let z = 1 + 0.035 * inv(fIn + 8, fOut + 8, f); if (st.zoom) z *= 1 + st.zoom * (1 - E.out5(kk));
    const r = (st.spin ? st.spin * (1 - E.out5(kk)) + 1.2 * Math.sin(sec(f - fIn) * 2.2) * (1 - inv(fOut, fOut + 8, f)) : 0) * Math.PI / 180;
    ctx.translate(540, 960); ctx.rotate(r); ctx.scale(z, z); ctx.translate(-540, -960);
    const base = ctx.getTransform();
    const local = () => { ctx.setTransform(base); ctx.translate(540, st.y); ctx.rotate(st.ang * Math.PI / 180); };
    const entering = k < 1 && b.prev, leaving = out > 0 && b.next;
    if (entering) { ctx.save(); local(); halfRect(st, off + h, true); ctx.setTransform(base); ctx.clip(); R.moving++; drawBeat(b.prev, f, true); R.moving--; ctx.restore(); }
    const clipMid = () => { if (entering) { local(); halfRect(st, off + h, false); ctx.setTransform(base); ctx.clip(); } if (leaving) { local(); halfRect(st, off - h, true); ctx.setTransform(base); ctx.clip(); } };
    ctx.save(); clipMid();
    vGrad(st.color === C.red ? [[0, '#2a0c14'], [1, '#12060b']] : [[0, '#0b0f2a'], [1, '#1b2152']]);
    speedLines(st.bg, { n: 40, alpha: 0.35, speed: 2600, seed: 71 + b.i });
    ctx.restore();
    if (leaving) { ctx.save(); local(); halfRect(st, off - h, false); ctx.setTransform(base); ctx.clip(); R.moving++; drawBeat(b.next, f, true); R.moving--; ctx.restore(); }
    if (spec.face !== false) { ctx.save(); clipMid(); bandFace(f, st, off, out, spec); ctx.restore(); }
    drawBanner(st, off, out);
    if (spec.face !== false && st.face === 'top') { ctx.save(); bandFaceTop(f, st, off, out, spec); ctx.restore(); }
    ctx.restore();
  }
  return { draw, subjects: () => [], anchors: () => ({ subject: [540, st0.y] }), hits: () => (spec.style === 3 ? [[b.T0 + 8, 0.8]] : spec.style === 2 ? [[b.T0 + 10, 0.5]] : []), band: true };
};
function bandFaceTop(f, st, off, out, spec) {
  const up = E.back(inv(st.fIn + 6, st.fIn + 14, on2(f)), 2) * (1 - E.io(out));
  if (up <= 0) return;
  bandXform(st, off);
  ctx.beginPath(); ctx.rect(-1200, -1600, 2400, 1600 - 205); ctx.clip();
  ctx.save(); ctx.translate(st.faceX, -92 - up * 175); ctx.rotate(-st.ang * Math.PI / 180 * 0.5);
  drawNSHead(0, 0, 150, Object.assign({ look: [st.faceX > 0 ? -0.5 : 0.6, 0.3], open: speak(f) * 0.7 }, NS_EXPR[spec.expr || 'smirk'] || {}));
  ctx.restore();
  R.ns = true;
}
function bandFace(f, st, off, out, spec) {
  const ff = on2(f);
  if (st.face === 'binocs') {
    const up = E.back(inv(st.fIn + 8, st.fIn + 16, ff), 1.6);
    if (up <= 0) return;
    const y = lerp(2250, 1270, up) + E.in(out) * 900, x = 700;
    const lower = E.back(inv(st.fIn + 22, st.fIn + 27, ff), 2);
    const p = { tilt: -0.12 + Math.sin(sec(f) * 3) * 0.04, look: [-0.4, -0.2], open: speak(f) * 0.6, mouth: lower > 0.5 ? 'smirk' : 'w', lidR: lower > 0.5 ? 1 : 0, rim: C.amber };
    drawNSHead(x, y, 165, p); R.ns = true;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.tilt); ctx.scale(165, 165); G.S = 165;
    ctx.translate(0, lerp(0, 1.05, lower));
    for (const s of [-1, 1]) {
      cel(() => { ctx.beginPath(); ctx.roundRect(s * 0.41 - 0.28, -0.3, 0.56, 0.6, 0.16); }, { fill: '#2b2f45', shade: '#171a28', shadeFn: () => ctx.rect(s * 0.41 - 0.3, 0.08, 0.6, 0.4), line: C.paper, lw: 0.05 });
      cel(() => { ctx.beginPath(); ctx.arc(s * 0.41, -0.01, 0.2, 0, Math.PI * 2); }, { fill: '#2f6fd6', shade: '#163a8f', shadeFn: () => ctx.rect(s * 0.41 - 0.3, 0.04, 0.6, 0.3), line: C.ink, lw: 0.04 });
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(s * 0.41 - 0.07, -0.08, 0.07, 0.045, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(s * 0.62, 0.32); ctx.rotate(s > 0 ? -2.2 : -0.9); nsPaw('mitt', 1400 + (s > 0 ? 1 : 0), s); ctx.restore();
    }
    ctx.fillStyle = C.ink; ctx.fillRect(-0.18, -0.12, 0.36, 0.16);
    ctx.restore();
    if (lower > 0.5) kira(x - 0.41 * 165 - 30, y - 55, 34 * Math.min(1, (ff - st.fIn - 24) / 4), '#fffdf2', 0.3);
  } else if (st.face === 'side') {
    const kin = E.out5(inv(st.fIn + 6, st.fIn + 12, ff));
    if (kin <= 0) return;
    const x = lerp(-300, 250, kin) - E.in(out) * 700, y = 1230;
    focusLines(x, y, 220, { n: 70, color: C.amber, alpha: 0.35, seed: 377, wMax: 12, rate: 4, reach: 900 });
    drawNSHead(x, y, 205, Object.assign({}, NS_EXPR.grit, { turn: -0.25, rim: C.red, light: 1, look: [0.5, -0.1] })); R.ns = true;
    const fk = E.back(inv(st.fIn + 14, st.fIn + 20, ff), 2.2);
    if (fk > 0) { ctx.save(); ctx.translate(lerp(x + 120, 620, fk) - E.in(out) * 700, lerp(1600, 1300, fk)); ctx.rotate(-0.25); const s = lerp(60, 150, fk); ctx.scale(s, s); G.S = s; bigPaw(1); ctx.restore(); }
  }
}
function wordIndexAt(frame) { const i = WF.findIndex((w) => w.f === frame); if (i < 0) throw new Error('anime engine: no word starts at frame ' + frame); return i; }

// ---------------------------------------------------------------- NEXT scene: the next event, drawn, with its
// facts on a chip and the date slammed on its word
SHOTS.next = (spec, b) => {
  const scene = spec.scene || 'rocket';
  const ph = spec.image ? SHOTS.photo({ image: spec.image, frame: 'panel', push: 0.06, bg: 'speed' }, b) : null;
  let subj = [540, 700, 300];
  function draw(f) {
    const pan = E.io(inv(b.w, b.T1, f));
    if (ph) ph.draw(f);
    else if (scene === 'moon') {
      paintBg('space', f, { seed: 140, drift: 2.2 });
      speedLines(-30, { n: 26, alpha: 0.25, speed: 2400, seed: 141, w: [2, 6] });
      const ex = lerp(170, 190, pan), ey = 770;
      drawEarthCel(ex, ey, 105, { lon0: -80, lat0: 20, light: [0.6, -0.4] });
      const mx = lerp(720, 670, pan), my = lerp(630, 580, pan), mr = lerp(270, 320, pan);
      const ak = E.io(inv(b.w + 4, b.w + 30, f));
      if (ak > 0) {
        const P0 = [ex + 70, ey - 80], P1 = [ex + 120, my - 300], P2 = [mx - mr * 0.85, my - mr * 0.3];
        ctx.save(); ctx.setLineDash([22, 16]); ctx.lineDashOffset = -f * 2; ctx.strokeStyle = C.amber; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); for (let i = 0; i <= 40 * ak; i++) { const u = i / 40; const x = (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0], y = (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
      }
      drawMoonCel(mx, my, mr);
      subj = [mx, my, mr];
    } else if (scene === 'rocket') {
      const rx = lerp(-110, 70, pan), cz = 1 + 0.14 * pan, pivot = [640, 900];
      vGrad([[0, '#050716'], [0.7, '#141a44'], [1, '#2a1f45']]);
      stars(201, 80, { alpha: 0.7, area: [0, 0, W, 1300], drift: [-f * 0.5 + pan * 70, 0] });
      ctx.save(); ctx.translate(pivot[0], pivot[1]); ctx.scale(cz, cz); ctx.translate(-pivot[0] + rx, -pivot[1]);
      ctx.fillStyle = '#0a1230'; ctx.fillRect(-500, 1380, W + 1000, 700);
      cel(() => shapePath([[300, 1500], [460, 1420], [700, 1395], [920, 1405], [1350, 1450], [1350, 1800], [300, 1800]], 210), { fill: '#141322', line: C.ink, lw: 5 });
      ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#cfe3f0';
      for (const [x0, a] of [[560, -1.25 + Math.sin(sec(f) * 1.7) * 0.2], [880, -1.9 + Math.sin(sec(f) * 2.1 + 1) * 0.2]]) { ctx.beginPath(); ctx.moveTo(x0, 1410); ctx.lineTo(x0 + Math.cos(a - 0.07) * 1800, 1410 + Math.sin(a - 0.07) * 1800); ctx.lineTo(x0 + Math.cos(a + 0.07) * 1800, 1410 + Math.sin(a + 0.07) * 1800); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#1e2240'; ctx.fillRect(785, 520, 34, 890); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(785, 520, 34, 890);
      drawElectron(700, 1400, 76, { glow: 0.4 + 0.2 * Math.sin(sec(f) * 3) });
      ctx.restore();
      subj = [700 + rx, 900, 200];
    } else { paintBackdrop(scene, f, b, spec.backdrop || {}); subj = [540, 1200, 400]; }
    if (spec.chip) drawChip(spec.chip, 80, 330, inv(Ao(spec.chip_at, b.w), Ao(spec.chip_at, b.w) + 6, f), { size: 30 });
    if (spec.stamp) {
      const a = A(spec.stamp.at), dk = E.back(inv(a, a + 6, f), 2);
      if (dk > 0) {
        ctx.font = '400 88px "Dela Gothic One"'; ctx.lineJoin = 'round';
        const t = spec.stamp.text, tw = ctx.measureText(t).width;
        const sx0 = clamp(spec.stamp.x ?? 490, 96 + tw / 2, 884 - tw / 2);
        ctx.save(); ctx.translate(sx0, spec.stamp.y ?? 690); ctx.rotate(-0.06); ctx.scale(dk, dk);
        ctx.fillStyle = C.red2; ctx.fillText(t, -tw / 2 + 6, 8);
        ctx.strokeStyle = C.paper; ctx.lineWidth = 20; ctx.strokeText(t, -tw / 2, 0);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 11; ctx.strokeText(t, -tw / 2, 0);
        ctx.fillStyle = C.amber; ctx.fillText(t, -tw / 2, 0);
        regText(-tw / 2 - 10, -76, tw + 20, 96, 'stamp', t, Math.abs(dk - 1) > 0.01);
        ctx.restore();
      }
    }
  }
  return { draw, subjects: () => [[subj[0] - subj[2], subj[1] - subj[2], subj[2] * 2, subj[2] * 2]], anchors: () => ({ subject: [subj[0], subj[1]], moon: [subj[0], subj[1]], rocket: [subj[0], subj[1]] }), hits: () => (spec.stamp ? [[A(spec.stamp.at), 0.45]] : []) };
};

// ---------------------------------------------------------------- end card: low-angle salute, the echo mark
// flies out of his eyes into the wordmark (DOWNLINK on "Downlink", CAT on "Cat"), rays, echo rings, a wink
SHOTS.end = (spec, b) => {
  const fD = Ao(spec.downlink, b.w + 14), fC = Ao(spec.cat, fD + 12);
  const head = (f) => { const ent = E.out5(inv(b.T0, b.T0 + 8, f)); return { x: 540, y: lerp(2100, 1420, ent) + Math.sin(sec(f) * 1.6) * 6, s: 215 }; };
  function draw(f) {
    const ff = on2(f);
    vGrad([[0, '#05060d'], [0.6, '#11142e'], [1, '#2a1a3e']]);
    const hd = head(f);
    ctx.save(); ctx.translate(540, 1250); ctx.rotate(sec(f) * 0.3);
    for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? 'rgba(245,184,61,0.10)' : 'rgba(245,184,61,0.04)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1700, -170); ctx.lineTo(1700, 170); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    for (let i = 0; i < 4; i++) { const d = ((f - b.T0) / 48 + i / 4) % 1; ctx.strokeStyle = `rgba(245,184,61,${0.45 * (1 - d)})`; ctx.lineWidth = i % 2 ? 10 : 22; ctx.beginPath(); ctx.arc(540, 1250, 160 + d * 900, 0, Math.PI * 2); ctx.stroke(); }
    focusLines(540, 1300, 560, { n: 90, color: C.amber, alpha: 0.24, seed: 221, wMax: 16, rate: 3 });
    stars(223, 40, { alpha: 0.6, area: [0, 0, W, 1100], drift: [f * 0.4, 0] });
    const sal = E.back(inv(b.T0 + 5, b.T0 + 13, ff), 1.8);
    const flick = E.out(inv(WM + 1, WM + 7, ff));
    const wink = f >= WM + 25 && f < WM + 39 ? 1 : 0;
    const p = { turn: -0.15, tilt: 0.04, mouth: f >= WM - 1 ? 'smirk' : 'w', open: speak(f) * 0.8, slant: 0.35, lidL: 0.1, lidR: wink ? 1 : 0.15, glint: kf(f, [[WM, 0], [WM + 4, 1.1], [WM + 17, 0]], E.out), look: [-0.1, 0.35], rim: C.amber };
    const salW = [lerp(1.6, 1.5 + flick * 0.9, sal), lerp(2.6, -0.5 - flick * 0.45, sal)];
    const salE = [lerp(1.9, 2.35 + flick * 0.3, sal), lerp(2.6, 0.75 - flick * 0.3, sal)];
    drawNSBust(hd.x, hd.y, hd.s, p, { R: { e: salE, w: salW, paw: 'flat', front: true, pr: lerp(0, -2.5 + flick * 0.9, sal) }, L: { e: [-1.8, 2.5], w: [-1.5, 3.4], paw: 'mitt' } }, { bottom: 5, flap: 1 });
    R.ns = true;
    speedLines(185, { n: 14, alpha: 0.25, speed: 2400, seed: 222, len: [150, 500], w: [2, 5] });
    drawWordmark(f, hd, fD, fC);
  }
  return { draw, subjects: () => [], anchors: () => ({ subject: [540, 640] }), hits: () => [[fD + 1, 0.3], [WM, 0.4]], end: true };
};
