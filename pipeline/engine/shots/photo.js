// photo.js: a full-bleed photo in 2 to 3 parallax layers that pushes 3 to 7% over the beat.
// Types 'photo' and 'hook' (the hook is beat 0: kicker plus a giant number or headline on the photo,
// and frame 0 is a finished composition: nothing on it is still arriving).
// spec: { image, frame: 'left'|'center'|'right', y: 'top'|'center'|'bottom', fill (subject width / frame
//         width), zoom, push (0.03..0.07), drift: 'left'|'right'|'up'|'down', punch: [words], layers (0..2),
//         camera: [{ at, focus: [x, y, w, h] (0..1), frame, y, fill, frames }],
//         marks: [{ at, point: [nx, ny] (0..1 of the image), r (px), label, until }],
//         number: NumberBlock spec, headline: ['OFF-WORLD', '*RECORD*'], headline_at: [words] }
E.SHOTS.photo = (spec, b) => {
  const { A, Ao, C, L, IMG, k, lerp, elerp, move, enter, sp, punch, photo, photoPt, frameCam, frameX, frameY, buildLayers, drawHeadline, ring, dot, drawMono, slam, clamp01, headlineWidth, CAP } = E;
  const P = IMG[spec.image];
  const isHook = spec.type === 'hook' || b.i === 0;
  const pushAmt = spec.push ?? 0.05;
  const DRIFT = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[spec.drift] ?? [0, 0];
  const punches = (spec.punch ?? []).map(A);
  const marks = (spec.marks ?? []).map((m) => ({ ...m, f: Ao(m.at, b.w), fu: Ao(m.until, null) }));
  const camKeys = (spec.camera ?? []).map((c) => ({ ...c, f: A(c.at), frames: c.frames ?? 20 }));
  const hasChip = !!b.spec.chip;
  const topY = hasChip ? L.giantTopChip : L.giantTop;
  const num = spec.number ? NumberBlock(spec.number, b, { box: true, top: topY, frame0: isHook }) : null;
  const heads = (spec.headline ?? []).map((t, i) => ({ t, f: isHook && !spec.headline_at ? 0 : Ao(spec.headline_at?.[i], b.w + i * 8) }));
  let hPx = 120;
  const base = (c) => frameCam(P, c.focus ?? P.focus, frameX[c.frame ?? spec.frame ?? 'center'] ?? 540, frameY[c.y ?? spec.y ?? 'center'] ?? 760, c.fill ?? spec.fill ?? null, c.zoom ?? spec.zoom ?? 1);
  const cam0 = base({});
  const camKeyed = camKeys.map((c) => base(c));
  const span = [b.T0, b.end];
  function cam(f) {
    let c = cam0;
    camKeys.forEach((q, i) => {
      const u = k(f, q.f, q.frames, move); if (u <= 0) return;
      const d = camKeyed[i];
      c = { x: lerp(c.x, d.x, u), y: lerp(c.y, d.y, u), ax: lerp(c.ax, d.ax, u), ay: lerp(c.ay, d.ay, u), s: elerp(c.s, d.s, u) };
    });
    const p = clamp01((f - span[0]) / Math.max(1, span[1] - span[0]));
    const s = c.s * (1 + pushAmt * 0.6 * p) * punch(f, punches);
    return { ...c, s, push: pushAmt * p, drift: [DRIFT[0] * 40 * p, DRIFT[1] * 40 * p] };
  }
  function layout() {
    if (P.kind !== 'graphic') buildLayers(P, spec);
    if (heads.length) {
      const maxW = L.textX1 - L.giantX - 28;
      const w100 = Math.max(...heads.map((h) => headlineWidth(h.t, 100)));
      hPx = Math.floor(Math.min(spec.headline_size ?? 230, (100 * maxW) / w100));
    }
  }
  const headTop = (i) => topY + 14 + i * (CAP.headline * hPx + 40);
  function draw(g, f) {
    const c = cam(f);
    photo(g, P, c);
    for (const m of marks) {
      if (f < m.f || (m.fu != null && f >= m.fu)) continue;
      const [x, y] = photoPt(P, c, m.point[0], m.point[1]);
      const r = (m.r ?? 70) * (0.4 + 0.6 * sp(f - m.f));
      ring(g, x, y, r, 4);
      if (m.label) {
        // beside the ring when it fits, else under it
        const w = E.monoWidth(m.label, 24, 'label') + 24, R = (m.r ?? 70);
        const side = x + R + 16 + w <= E.L.textX1;
        drawMono(g, m.label, side ? x + R + 16 : Math.max(E.L.textX0, Math.min(E.L.textX1 - w, x - w / 2)), side ? y - 20 : y + R + 14, { px: 24, kind: 'label' });
      }
    }
    heads.forEach((h, i) => {
      if (f < h.f) return;
      const sc = isHook && h.f <= 6 ? 1 : slam(f - h.f), top = headTop(i), cy = top + (CAP.headline * hPx) / 2;
      g.save(); g.translate(L.giantX + 14, cy); g.scale(sc, sc); g.translate(-(L.giantX + 14), -cy);
      const pm = g.__moving; if (sc > 1.0001) g.__moving = true;
      drawHeadline(g, h.t, L.giantX + 14, top, { px: hPx, box: true });
      g.__moving = pm; g.restore();
    });
    num?.draw(g, f);
  }
  const subjRect = (f) => {
    const c = cam(f), fc = (camKeys.length && f >= camKeys[camKeys.length - 1].f ? camKeys[camKeys.length - 1].focus : null) ?? P.focus ?? [0.3, 0.3, 0.4, 0.4];
    const [x0, y0] = photoPt(P, c, fc[0], fc[1]), [x1, y1] = photoPt(P, c, fc[0] + fc[2], fc[1] + fc[3]);
    const r = [Math.max(0, x0), Math.max(0, y0), Math.min(1080, x1) - Math.max(0, x0), Math.min(1920, y1) - Math.max(0, y0)];
    return r;
  };
  const headRect = () => (heads.length ? [L.giantX, topY, L.textX1 - L.giantX, headTop(heads.length) - topY] : null);
  const focusPt = (f) => { const c = cam(f); const fc = P.focus ?? [0.4, 0.4, 0.2, 0.2]; return photoPt(P, c, fc[0] + fc[2] / 2, fc[1] + fc[3] / 2); };
  return {
    layout, draw,
    dotIn: (f) => (marks.length ? photoPt(P, cam(f), marks[0].point[0], marks[0].point[1]) : focusPt(f)),
    dotOut: (f) => (marks.length ? photoPt(P, cam(f), marks[marks.length - 1].point[0], marks[marks.length - 1].point[1]) : focusPt(f)),
    credit: () => P.credit,
    subjects: (f) => [subjRect(f), ...(num && num.on(f) ? [num.rect()] : []), ...(heads.length && f >= heads[0].f ? [headRect()] : [])],
    anchors: (f) => {
      const a = { subject: subjRect(f) };
      if (num) a.number = num.rect();
      if (heads.length) a.headline = headRect();
      marks.forEach((m, i) => { a['mark' + i] = photoPt(P, cam(f), m.point[0], m.point[1]); });
      return a;
    },
    cues: () => [
      ...(num ? num.cues() : []),
      ...punches.map((pf) => ({ frame: pf, type: 'impact', note: 'punch-in', gain_db: -3, pri: 35 })),
      ...marks.map((m) => ({ frame: m.f, type: 'impact', note: 'a ring marks the subject', sfx: 'tick', pri: 40 })),
    ],
  };
};
E.SHOTS.hook = (spec, b) => (spec.image ? E.SHOTS.photo(spec, b) : E.SHOTS.diagram(spec, b));

// lens.js part: a photo inside a ringed circle on ink (the "lens"), with an optional number above.
// spec: { image, side: 'left'|'center'|'right', r (px), fill (subject share of the diameter), push, number }
E.SHOTS.lens = (spec, b) => {
  const { A, Ao, C, L, IMG, k, lerp, elerp, move, enter, photo, frameCam, ring, dot, inkDisc, clamp01, sp } = E;
  const P = IMG[spec.image];
  const hasChip = !!b.spec.chip;
  const num = spec.number ? NumberBlock({ exit_at: b.next ? b.T1 : null, ...spec.number }, b, { top: hasChip ? L.giantTopChip : L.giantTop, frame0: b.i === 0 }) : null;
  const st = { x: 540, y: 760, r: 300 };
  function layout() {
    const top = num ? num.st.bottom + 40 : L.contentTop + 20, bot = L.contentBottom - 10;
    st.r = spec.r ?? Math.min(330, (bot - top) / 2);
    st.y = (top + bot) / 2;
    st.x = { left: 80 + st.r, center: 540, right: 1000 - st.r }[spec.side ?? 'left'];
    if (P.kind !== 'graphic') E.buildLayers(P, spec);
  }
  // the lens grows out of the dot on its way in (iris or morph) and shrinks into it on the way out
  function geom(f) {
    let { x, y, r } = st;
    const pi = E.pIn(b, f);
    if (pi < 1 && b.prev && (b.tr.type === 'iris' || b.tr.type === 'morph')) {
      const from = b.prev.shot.dotOut?.(f) ?? [540, 760], u = enter(clamp01((pi - 0.3) / 0.7));
      x = lerp(from[0], x, u); y = lerp(from[1], y, u); r = lerp(11, r, u);
    }
    const po = E.pOut(b, f);
    if (po > 0 && (b.next.tr.type === 'iris' || b.next.tr.type === 'morph')) {
      const to = b.next.shot.dotIn?.(f) ?? [x, y], u = move(clamp01(po / 0.7));
      x = lerp(x, to[0], u); y = lerp(y, to[1], u); r = lerp(r, 0, u);
    }
    return { x, y, r };
  }
  function draw(g, f) {
    const G = geom(f);
    const p = clamp01((f - b.T0) / Math.max(1, b.end - b.T0));
    if (G.r < 12) { dot(g, G.x, G.y, 11); num?.draw(g, f); return; }
    if (!g.__probe) { g.save(); g.beginPath(); g.arc(G.x, G.y, G.r, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill(); g.clip(); }
    const fill = spec.fill ?? 0.95;
    const cam = frameCam(P, P.focus, G.x, G.y, fill, 1, G.r * 2, G.r * 2, false);
    const pu = spec.push ?? 0.04;
    photo(g, P, { ...cam, s: cam.s * (1 + pu * 0.6 * p), push: pu * p });
    if (!g.__probe) g.restore();
    ring(g, G.x, G.y, G.r, 4);
    num?.draw(g, f);
  }
  return {
    layout, draw, enterIris: true, leaveIris: true, drawsIn: true,
    dotIn: () => [st.x, st.y], dotOut: () => [st.x, st.y],
    credit: (f) => (geom(f).r >= 12 ? P.credit : null),
    subjects: (f) => { const G = geom(f); return [[G.x - G.r, G.y - G.r, 2 * G.r, 2 * G.r], ...(num && num.on(f) ? [num.rect()] : [])]; },
    anchors: (f) => { const G = geom(f); const a = { lens: [G.x - G.r, G.y - G.r, 2 * G.r, 2 * G.r], subject: [G.x - G.r, G.y - G.r, 2 * G.r, 2 * G.r] }; if (num) a.number = num.rect(); return a; },
    cues: () => (num ? num.cues() : []),
  };
};
