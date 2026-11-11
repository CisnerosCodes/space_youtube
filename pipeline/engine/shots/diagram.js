// diagram.js: flat amber line art on ink that draws in, for any beat no real photo depicts.
// Coordinates are diagram units: a box `size` (default [1000, 800]) fitted into the content zone (or into
// its left or right part with `region`), under the number block when there is one. Strokes stay 4 px at
// every camera scale. The persistent amber dot can travel along a path in the drawing.
// spec: { region: 'full'|'left'|'right', size: [w, h], number, subject: [x, y, w, h] | 'none',
//         elements: [ { path: [[x, y], ...], id, style: 'solid'|'dashed'|'thin'|'route', smooth, grow: { at, to } }
//                     { circle: [cx, cy, r] } { ellipse: [cx, cy, rx, ry, deg] } { marker: [x, y] }
//                     { ring: [x, y, r], pulse: [words], ink } { craft: [x, y] }
//                     { label: 'TEXT', pos: [x, y], anchor: 'right'|'left'|'above'|'below' }
//                     { glyph: 'dish'|'dome'|'rocket'|'rover'|'spiral'|'blob'|'planet'|'binary', pos, size, rot, seed }
//                     { hazards: [x, y, w, h], count, seed, reveal: 'fan'|'at' } { fan: range, half: deg } ]
//         every element also takes at, until, draw (frames), mute_at (turns muted and dashed), id
//         dot: { path: id, keys: [{ at, u }] } or { keys: [{ at, pos: [x, y] }] }, ease, pulse: [words] }
//         camera: [{ at, center: [x, y], zoom, frames }] or { follow: 'dot', lead } }
E.SHOTS.diagram = (spec, b) => {
  const { A, Ao, C, L, k, lerp, elerp, enter, move, sp, ring, dot, line, inkDisc, drawMono, monoWidth, smooth, polyLen, polyAt, polySlice, clamp01, rng } = E;
  const isHook = b.i === 0;
  const hasChip = !!b.spec.chip;
  const num = spec.number ? NumberBlock(spec.number, b, { top: hasChip ? L.giantTopChip : L.giantTop, frame0: isHook }) : null;
  const [UW, UH] = spec.size ?? [1000, 800];
  const defAt = isHook ? 0 : b.T0 + Math.round(b.tr.N * 0.5);
  const Z = { x: 60, y: 330, w: 980, h: 810, s: 1, cx: 540, cy: 735 };
  const els = (spec.elements ?? []).map((e, i) => ({ ...e, i, f0: Ao(e.at, defAt), fu: Ao(e.until, null), fm: Ao(e.mute_at, null), d: e.draw ?? 16 }));
  const byId = {}; els.forEach((e) => { if (e.id) byId[e.id] = e; });
  for (const e of els) if (e.path) { e.pts = e.smooth === false ? e.path : smooth(e.path); e.PL = polyLen(e.pts); if (e.grow) { e.gpts = smooth([e.path[e.path.length - 1], ...e.grow.to]); e.gPL = polyLen(e.gpts); e.gf = A(e.grow.at); } }
  // ---- the dot (persistent actor) in diagram units
  const DS = spec.dot ? { ...spec.dot, keys: spec.dot.keys.map((q) => ({ ...q, f: A(q.at) })), pulses: (spec.dot.pulse ?? []).map(A) } : null;
  const easeDot = DS?.ease === 'linear' ? (x) => x : DS?.ease === 'drive' ? (x) => (x < 0.12 ? (0.5 * x * x) / 0.12 : x - 0.06) / 0.94 : move;
  function dotU(f) {
    if (!DS) return null;
    const K = DS.keys; let q = K[0];
    if (f <= K[0].f) return { ...K[0] };
    for (let i = 0; i + 1 < K.length; i++) {
      if (f < K[i + 1].f) {
        const u = easeDot(clamp01((f - K[i].f) / Math.max(1, K[i + 1].f - K[i].f)));
        if (K[i].pos) return { pos: [lerp(K[i].pos[0], K[i + 1].pos[0], u), lerp(K[i].pos[1], K[i + 1].pos[1], u)] };
        return { u: lerp(K[i].u, K[i + 1].u, u) };
      }
      q = K[i + 1];
    }
    return { ...q };
  }
  function dotUnits(f) {
    const d = dotU(f); if (!d) return null;
    if (d.pos) return [d.pos[0], d.pos[1], 0];
    const P = byId[DS.path]; return polyAt(P.pts, d.u, P.PL);
  }
  // ---- camera
  const camKeys = Array.isArray(spec.camera) ? spec.camera.map((c) => ({ ...c, f: A(c.at), frames: c.frames ?? 24 })) : [];
  const follow = spec.camera && !Array.isArray(spec.camera) && spec.camera.follow === 'dot' ? spec.camera : null;
  function cam(f) {
    let c = { x: UW / 2, y: UH / 2, z: 1 };
    for (const q of camKeys) { const u = k(f, q.f, q.frames, move); if (u > 0) c = { x: lerp(c.x, q.center?.[0] ?? c.x, u), y: lerp(c.y, q.center?.[1] ?? c.y, u), z: elerp(c.z, q.zoom ?? c.z, u) }; }
    if (follow) { const d = dotUnits(f); if (d) c.y = Math.min(c.y, d[1] - (follow.lead ?? UH * 0.25)); }
    return c;
  }
  // units -> screen
  let CAM = null;
  const S = (x, y) => [Z.cx + (x - CAM.x) * Z.s * CAM.z, Z.cy + (y - CAM.y) * Z.s * CAM.z];
  const SL = (len) => len * Z.s * (CAM ? CAM.z : 1);
  function layout() {
    const top = self.zoneTop ?? (num ? num.st.bottom + 30 : hasChip ? L.giantTopChip : L.contentTop);
    const bottom = self.zoneBottom ?? L.contentBottom;
    const R = { full: [60, 980], left: [60, 640], right: [400, 640] }[spec.region ?? 'full'];
    Z.x = R[0]; Z.w = R[1]; Z.y = top; Z.h = bottom - top;
    Z.s = Math.min(Z.w / UW, Z.h / UH);
    Z.cx = Z.x + Z.w / 2; Z.cy = Z.y + Z.h / 2;
    // hazards: seeded rocks, and (with a fan) the first frame the dot's fan reaches each one
    for (const e of els) if (e.hazards) {
      const r = rng(e.seed ?? 7), [hx, hy, hw, hh] = e.hazards, out = [];
      for (let i = 0; i < (e.count ?? 30); i++) {
        const q = { x: hx + r() * hw, y: hy + r() * hh, rx: 10 + r() * 26, rot: r() * 0.6 - 0.3 };
        q.ry = q.rx * (0.55 + 0.2 * r());
        // keep the rocks off the dot's path
        if (DS && byId[DS.path]) { const P = byId[DS.path]; let dm = 1e9; for (const p of P.pts) dm = Math.min(dm, Math.hypot(p[0] - q.x, p[1] - q.y)); if (dm < q.rx + 40) continue; }
        out.push(q);
      }
      e.rocks = out;
      const fan = els.find((x) => x.fan != null);
      if ((e.reveal ?? (fan ? 'fan' : 'at')) === 'fan' && fan && DS) {
        const range = fan.fan, half = ((fan.half ?? 32) * Math.PI) / 180;
        for (const q of out) {
          q.first = null;
          for (let qf = fan.f0; qf <= b.end; qf += 2) {
            const d = dotUnits(qf), vx = q.x - d[0], vy = q.y - d[1], dd = Math.hypot(vx, vy);
            const ang = Math.atan2(vy, vx) - d[2]; const da = Math.atan2(Math.sin(ang), Math.cos(ang));
            if (dd < range && Math.abs(da) < half + 0.25) { q.first = qf; break; }
          }
        }
      } else out.forEach((q, i) => { q.first = e.f0 + Math.round((i / out.length) * 20); });
    }
  }
  // ---- glyphs: polylines in local units (the larger dimension is 1), drawn in by arc length
  function glyphLines(e, f) {
    const s = e.seed ?? 3, Lns = [];
    const arc = (cx, cy, r, a0, a1, n = 36, sy = 1) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a) * sy]); } return o; };
    switch (e.glyph) {
      case 'planet': Lns.push(arc(0, 0, 0.5, -Math.PI / 2, 1.5 * Math.PI, 64)); break;
      case 'blob': { const o = []; for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; const r = 0.5 * (1 + 0.12 * Math.sin(3 * a + s) + 0.08 * Math.sin(5 * a + 2 * s)) / 1.2; o.push([r * Math.cos(a), r * Math.sin(a) * 0.8]); } Lns.push(o); break; }
      case 'spiral': {
        Lns.push(arc(0, 0, 0.5, 0, Math.PI * 2, 64, 0.42));
        for (const ph of [0, Math.PI]) { const o = []; for (let i = 0; i <= 40; i++) { const a = ph + (i / 40) * Math.PI * 1.7; const r = 0.06 * Math.exp(0.48 * (i / 40) * Math.PI * 1.7) ; o.push([r * Math.cos(a), r * Math.sin(a) * 0.42]); } Lns.push(o); }
        break;
      }
      case 'dish': {
        // a radio dish: the bowl and its rim, the feed on a strut at the focus, a mount and an A-frame
        const dish = []; for (let i = 0; i <= 24; i++) { const x = -0.5 + i / 24; dish.push([x, 0.05 - 0.9 * x * x]); }
        Lns.push(dish, [[-0.5, -0.175], [0.5, -0.175]], [[0, 0.05], [0, -0.45]], [[-0.045, -0.5], [0.045, -0.5], [0.045, -0.41], [-0.045, -0.41], [-0.045, -0.5]],
          [[0, 0.05], [0, 0.22]], [[-0.22, 0.5], [0, 0.22], [0.22, 0.5]], [[-0.4, 0.5], [0.4, 0.5]]);
        break;
      }
      case 'dome': Lns.push(arc(0, 0.05, 0.36, Math.PI, 2 * Math.PI, 32), [[-0.42, 0.05], [0.42, 0.05], [0.42, 0.42], [-0.42, 0.42], [-0.42, 0.05]], [[0.05, -0.12], [0.36, -0.42]], [[-0.5, 0.42], [0.5, 0.42]]); break;
      case 'rocket': Lns.push([[-0.07, 0.42], [-0.07, -0.28], [0, -0.5], [0.07, -0.28], [0.07, 0.42], [-0.07, 0.42]], [[-0.07, 0.24], [-0.17, 0.44], [-0.07, 0.42]], [[0.07, 0.24], [0.17, 0.44], [0.07, 0.42]], [[-0.3, 0.5], [0.3, 0.5]]); break;
      case 'rover': Lns.push([[-0.42, -0.02], [0.42, -0.02], [0.42, 0.12], [-0.42, 0.12], [-0.42, -0.02]], [[0.25, -0.02], [0.25, -0.38], [0.36, -0.38]], arc(-0.32, 0.26, 0.11, 0, Math.PI * 2, 20), arc(0, 0.26, 0.11, 0, Math.PI * 2, 20), arc(0.32, 0.26, 0.11, 0, Math.PI * 2, 20)); break;
      case 'binary': Lns.push(arc(0, 0, 0.5, 0, Math.PI * 2, 48, 0.4)); break;
      default: break;
    }
    return Lns;
  }
  function strokeStyle(e, f) {
    const muted = e.fm != null && f >= e.fm;
    return { color: muted ? C.muted : C.amber, dash: muted || e.style === 'dashed' ? [10, 12] : null, w: e.style === 'thin' ? 2 : 4 };
  }
  function drawLines(g, Lns, u, st, xf) {
    // u: 0..1 of the total length drawn
    const all = Lns.map((ln) => ln.map(xf)); const lens = all.map((ln) => polyLen(ln).s); const tot = lens.reduce((a, c) => a + c, 0) || 1;
    let left = u * tot;
    all.forEach((ln, i) => { if (left <= 0) return; const part = Math.min(1, left / (lens[i] || 1)); line(g, part >= 1 ? ln : polySlice(ln, 0, part), st.w, st.dash, 1, st.color); left -= lens[i]; });
  }
  function draw(g, f) {
    CAM = cam(f);
    const clip = follow || camKeys.length;
    if (clip && !g.__probe) { g.save(); g.beginPath(); g.rect(0, Z.y - 8, 1080, Z.h + 16); g.clip(); }
    const D = dotUnits(f);
    for (const e of els) {
      if (f < e.f0 && !(isHook && e.f0 <= 6)) continue;
      if (e.fu != null && f >= e.fu) continue;
      const u = isHook && e.f0 <= 6 ? 1 : k(f, e.f0, e.d, enter);
      const st = strokeStyle(e, f);
      if (e.path) {
        let pts = e.pts.map((p) => S(p[0], p[1]));
        if (e.style === 'route' && DS && DS.path === e.id && D) {
          const du = dotU(f).u ?? 0;
          line(g, polySlice(pts, 0, Math.min(u, du)), 4, [10, 12], 1, st.color);
          if (u > du) line(g, polySlice(pts, du, u), 4, null, 1, st.color);
        } else line(g, u >= 1 ? pts : polySlice(pts, 0, u), st.w, st.dash, 1, st.color);
        if (e.gpts && f >= e.gf) { const gu = k(f, e.gf, 30, enter); const gp = e.gpts.map((p) => S(p[0], p[1])); line(g, polySlice(gp, 0, gu), 4, null, 1, st.color); }
        E.track(g, ...S(e.pts[0][0], e.pts[0][1]));
      } else if (e.circle) {
        const [cx, cy] = S(e.circle[0], e.circle[1]), r = SL(e.circle[2]);
        if (!g.__probe) { g.save(); g.strokeStyle = st.color; g.lineWidth = st.w; if (st.dash) g.setLineDash(st.dash); g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u); g.stroke(); g.restore(); }
        E.track(g, cx, cy);
      } else if (e.ellipse) {
        const [cx, cy] = S(e.ellipse[0], e.ellipse[1]);
        if (!g.__probe) { g.save(); g.strokeStyle = st.color; g.lineWidth = st.w; if (st.dash) g.setLineDash(st.dash); g.beginPath(); g.ellipse(cx, cy, SL(e.ellipse[2]), SL(e.ellipse[3]), ((e.ellipse[4] ?? 0) * Math.PI) / 180, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u); g.stroke(); g.restore(); }
        E.track(g, cx, cy);
      } else if (e.marker) {
        const [x, y] = S(e.marker[0], e.marker[1]); dot(g, x, y, (e.r ?? 11) * (0.4 + 0.6 * (isHook && e.f0 <= 6 ? 1 : sp(f - e.f0))), st.color);
      } else if (e.ring) {
        const [x, y] = S(e.ring[0], e.ring[1]), r = SL(e.ring[2]) * (0.4 + 0.6 * (isHook && e.f0 <= 6 ? 1 : sp(f - e.f0)));
        if (e.ink) inkDisc(g, x, y, r);
        ring(g, x, y, r, 4, 1, st.dash, st.color);
        for (const pw of (e.pulse ?? []).map(A)) { const d = f - pw; if (d >= 0 && d < 18) ring(g, x, y, r + 60 * enter(d / 18), 4, 1 - d / 18); }
      } else if (e.craft) {
        const [x, y] = S(e.craft[0], e.craft[1]); if (!E.track(g, x, y)) { g.fillStyle = C.paper; g.fillRect(x - 9, y - 9, 18, 18); }
      } else if (e.label) {
        const [x, y] = S(e.pos[0], e.pos[1]); const w = monoWidth(e.label, 24, 'label') + 16;
        const an = e.anchor ?? 'right';
        const lx = an === 'right' ? x + 18 : an === 'left' ? x - 18 - w : x - w / 2, ly = an === 'above' ? y - 54 : an === 'below' ? y + 18 : y - 18;
        drawMono(g, e.label, Math.max(80, Math.min(900 - w, lx)), ly, { px: 24, kind: 'label', padX: 8, padY: 4, color: e.color === 'amber' ? C.amber : e.color === 'muted' ? C.muted : C.paper });
      } else if (e.glyph) {
        const sz = e.size ?? 300, [px, py] = e.pos, rot = ((e.rot ?? 0) * Math.PI) / 180, cr = Math.cos(rot), sr = Math.sin(rot);
        const xf = ([lx, ly]) => S(px + (lx * cr - ly * sr) * sz, py + (lx * sr + ly * cr) * sz);
        drawLines(g, glyphLines(e, f), u, st, xf);
        if (e.glyph === 'binary') {
          // two neutron stars on one orbit, spiralling in slowly
          const ph = (f - e.f0) * 0.16, rr = 0.5 * (1 - 0.25 * clamp01((f - e.f0) / 90));
          for (const s0 of [0, Math.PI]) { const a = ph + s0; const [x, y] = xf([rr * Math.cos(a), rr * Math.sin(a) * 0.4]); dot(g, x, y, 13 * u, st.color); }
        }
        E.track(g, ...S(px, py));
      } else if (e.hazards) {
        if (!g.__probe) {
          g.save(); g.strokeStyle = st.color; g.lineWidth = 4;
          for (const q of e.rocks) {
            if (q.first == null || f < q.first) continue;
            const uu = k(f, q.first, 8, enter), [x, y] = S(q.x, q.y);
            if (y < Z.y - 40 || y > Z.y + Z.h + 40) continue;
            g.beginPath(); g.ellipse(x, y, SL(q.rx), SL(q.ry), q.rot, 0, Math.PI * 2 * uu); g.stroke();
          }
          g.restore();
        }
      } else if (e.fan != null && D) {
        const [x, y] = S(D[0], D[1]), R = SL(e.fan) * u, half = ((e.half ?? 32) * Math.PI) / 180, a0 = D[2];
        if (!g.__probe && R > 1) { g.save(); g.strokeStyle = st.color; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R * Math.cos(a0 - half), y + R * Math.sin(a0 - half)); g.arc(x, y, R, a0 - half, a0 + half); g.lineTo(x, y); g.stroke(); g.restore(); }
      }
    }
    if (D) {
      const [x, y] = S(D[0], D[1]);
      dot(g, x, y, 11);
      for (const pw of DS.pulses) { const d = f - pw; if (d >= 0 && d < 18) ring(g, x, y, 11 + 50 * enter(d / 18), 4, 1 - d / 18); }
    }
    if (clip && !g.__probe) g.restore();
    num?.draw(g, f);
  }
  // screen bounds of one element (null for elements the cat may cross: hazards, fans, thin lines)
  function elRect(e, f) {
    let pts = [];
    if (e.circle) pts = [[e.circle[0] - e.circle[2], e.circle[1] - e.circle[2]], [e.circle[0] + e.circle[2], e.circle[1] + e.circle[2]]];
    else if (e.ellipse) pts = [[e.ellipse[0] - e.ellipse[2], e.ellipse[1] - e.ellipse[3]], [e.ellipse[0] + e.ellipse[2], e.ellipse[1] + e.ellipse[3]]];
    else if (e.ring) pts = [[e.ring[0] - e.ring[2], e.ring[1] - e.ring[2]], [e.ring[0] + e.ring[2], e.ring[1] + e.ring[2]]];
    else if (e.marker || e.craft) { const q = e.marker ?? e.craft; pts = [[q[0] - 14, q[1] - 14], [q[0] + 14, q[1] + 14]]; }
    else if (e.glyph) {
      const sz = e.size ?? 300, rot = ((e.rot ?? 0) * Math.PI) / 180, cr = Math.cos(rot), sr = Math.sin(rot);
      pts = glyphLines(e, f).flat().map(([lx, ly]) => [e.pos[0] + (lx * cr - ly * sr) * sz, e.pos[1] + (lx * sr + ly * cr) * sz]);
    } else if (e.path && e.style !== 'thin') pts = e.pts;
    else if (e.label) {
      const [x, y] = S(e.pos[0], e.pos[1]), w = monoWidth(e.label, 24, 'label') + 16, an = e.anchor ?? 'right';
      const lx = an === 'right' ? x + 18 : an === 'left' ? x - 18 - w : x - w / 2, ly = an === 'above' ? y - 54 : an === 'below' ? y + 18 : y - 18;
      return [lx, ly, w, 36];
    }
    if (!pts.length) return null;
    const sp2 = pts.map((p) => S(p[0], p[1])), xs = sp2.map((p) => p[0]), ys = sp2.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    return [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0];
  }
  // what the cat must not cover: the director's subject box, or every drawn element on its own
  function subjectRects(f) {
    CAM = cam(f);
    if (spec.subject === 'none') return [];
    if (Array.isArray(spec.subject)) { const [x0, y0] = S(spec.subject[0], spec.subject[1]), [x1, y1] = S(spec.subject[0] + spec.subject[2], spec.subject[1] + spec.subject[3]); return [[x0, y0, x1 - x0, y1 - y0]]; }
    return els.filter((e) => f >= e.f0 && !(e.fu != null && f >= e.fu)).map((e) => elRect(e, f)).filter(Boolean);
  }
  function subjectRect(f) {
    const R = subjectRects(f); if (!R.length) return null;
    const x0 = Math.max(0, Math.min(...R.map((r) => r[0]))), y0 = Math.max(0, Math.min(...R.map((r) => r[1])));
    return [x0, y0, Math.min(1080, Math.max(...R.map((r) => r[0] + r[2]))) - x0, Math.min(1920, Math.max(...R.map((r) => r[1] + r[3]))) - y0];
  }
  const dotScreen = (f) => { const d = dotUnits(f); if (!d) return null; CAM = cam(f); return S(d[0], d[1]); };
  const zoneCenter = () => [Z.cx, Z.cy];
  const self = {
    layout, draw, drawsIn: true,
    dotIn: (f) => dotScreen(Math.max(f, b.T0)) ?? zoneCenter(),
    dotOut: (f) => dotScreen(f) ?? zoneCenter(),
    dot: (f) => dotScreen(f),
    credit: () => (b.spec.source ? `Source: ${b.spec.source}` : null),
    subjects: (f) => [...subjectRects(f), ...(num && num.on(f) ? [num.rect()] : [])],
    anchors: (f) => {
      CAM = cam(f);
      const a = { zone: [Z.x, Z.y, Z.w, Z.h] };
      const sr = subjectRect(f); if (sr) a.subject = sr;
      if (num) a.number = num.rect();
      const d = dotScreen(f); if (d) a.dot = d;
      CAM = cam(f);
      for (const e of els) if (e.id) {
        if (e.ring) { const [x, y] = S(e.ring[0], e.ring[1]), r = SL(e.ring[2]); a[e.id] = [x - r, y - r, 2 * r, 2 * r]; }
        else if (e.circle) { const [x, y] = S(e.circle[0], e.circle[1]), r = SL(e.circle[2]); a[e.id] = [x - r, y - r, 2 * r, 2 * r]; }
        else if (e.glyph) a[e.id] = elRect(e, f);
        else if (e.marker || e.craft) a[e.id] = S(...(e.marker ?? e.craft));
        else if (e.path) { const p = e.pts.map((q) => S(q[0], q[1])); const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); a[e.id] = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; }
        else if (e.pos) a[e.id] = S(e.pos[0], e.pos[1]);
      }
      return a;
    },
    cues: () => [
      ...(num ? num.cues() : []),
      ...els.filter((e) => e.cue).map((e) => ({ frame: e.f0, type: e.cue, note: `${e.id ?? 'element'} draws in` })),
      ...els.flatMap((e) => (e.pulse ?? []).map((w) => ({ frame: A(w), type: 'impact', sfx: 'tick', note: `pulse on ${e.id ?? 'ring'}`, pri: 40 }))),
      ...(DS ? DS.pulses.map((pf) => ({ frame: pf, type: 'impact', sfx: 'tick', note: 'dot pulse', pri: 40 })) : []),
    ],
  };
  return self;
};
E.SHOTS.count = (spec, b) => (spec.image ? E.SHOTS.lens(spec, b) : E.SHOTS.diagram({ ...(spec.diagram ?? {}), number: spec.number }, b));
