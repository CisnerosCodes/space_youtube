// bars.js: comparison bars on ONE scale, growing at one speed, so the shorter bar stops first.
// spec: { rows: [{ value, at, land, label, data, icon (asset with a crop), decimals }], max, ticks (units
//         per tick), race (all rows start together, no giant numbers; for many rows), at, land,
//         mark: { row, at }, dot_row (the row whose icon becomes the amber dot at the end) }
// With 1 to 4 rows each row gets a giant count-up number (never zero, only counts up) above its bar.
E.SHOTS.bars = (spec, b) => {
  const { A, Ao, C, L, IMG, k, lerp, enter, move, sp, ring, dot, line, drawGiant, drawMono, giantWidth, CAP, clamp01, exitE } = E;
  const rows = spec.rows.map((r, i) => ({ ...r, i, f0: Ao(r.at, Ao(spec.at, b.w)), fl: Ao(r.land, null) }));
  const race = spec.race ?? rows.length > 4;
  const max = spec.max ?? Math.max(...rows.map((r) => r.value));
  // speed in units per frame: from the first row's word span, or the longest row in 36 frames
  let speed;
  if (race) { const a = Ao(spec.at, b.w), z = Ao(spec.land, a + 36); rows.forEach((r) => { r.f0 = a; }); speed = max / Math.max(8, z - a); }
  else speed = rows[0].fl != null ? rows[0].value / Math.max(8, rows[0].fl - rows[0].f0) : max / 36;
  const EA = 0.15, ease = (x) => (x < EA ? (x * x) / (2 * EA * (1 - EA)) : x > 1 - EA ? 1 - ((1 - x) * (1 - x)) / (2 * EA * (1 - EA)) : (x - EA / 2) / (1 - EA));
  rows.forEach((r) => { r.dur = r.value / speed; r.f1 = r.f0 + r.dur; });
  const valAt = (r, f) => r.value * ease(clamp01((f - r.f0) / r.dur));
  const st = { top: L.contentTop, bottom: L.contentBottom, rowH: 0, iconH: 80, x0: 80, scale: 1, px: 200 };
  const icon = (r) => (r.icon ? IMG[r.icon] : null);
  const iconW = (r) => { const P = icon(r); if (!P) return 0; const cr = P.crop ?? [0, 0, P.w, P.h]; return (cr[2] / cr[3]) * st.iconH; };
  const fmt = (r, v) => { const d = r.decimals ?? (String(r.value).includes('.') ? String(r.value).split('.')[1].length : 0), step = Math.pow(10, -d); return Math.max(step, Math.floor(v / step + 1e-6) * step).toFixed(d); };
  function layout() {
    const hasChip = !!b.spec.chip;
    st.top = hasChip ? L.giantTopChip : L.contentTop - 16;
    st.rowH = (st.bottom - st.top) / rows.length;
    if (race) { st.iconH = Math.min(96, st.rowH * 0.72); }
    else {
      st.px = Math.min(240, Math.floor(st.rowH * 0.42));
      st.iconH = Math.min(120, st.rowH * 0.26);
    }
    const wMax = Math.max(...rows.map(iconW));
    st.scale = (1040 - st.x0 - wMax) / max;
  }
  // y of row i's bar line
  const barY = (i) => (race ? st.top + st.rowH * (i + 0.78) : st.top + st.rowH * i + CAP.giant * st.px + 128);
  const front = (r, f) => st.x0 + valAt(r, f) * st.scale;
  function drawSprite(g, P, x, yBottom, h, alpha = 1) {
    const cr = P.crop ?? [0, 0, P.w, P.h], w = (cr[2] / cr[3]) * h;
    if (E.track(g, x, yBottom - h / 2)) return [w, h];
    g.save(); g.globalAlpha *= alpha; g.drawImage(P.img, cr[0], cr[1], cr[2], cr[3], x, yBottom - h, w, h); g.restore();
    return [w, h];
  }
  function draw(g, f) {
    rows.forEach((r) => {
      if (f < r.f0 - (race ? 0 : 2)) return;
      const y = barY(r.i), fx = front(r, f);
      const a = k(f, r.f0 - 2, 6);
      line(g, [[st.x0, y], [fx, y]], 4, null, a);
      if (spec.ticks) {
        const n = Math.floor(valAt(r, f) / spec.ticks + 1e-6);
        for (let q = 1; q <= n; q++) { const tx = st.x0 + q * spec.ticks * st.scale; line(g, [[tx, y + 2], [tx, y + 18]], 4, null, a); }
      }
      const P = icon(r);
      if (P) drawSprite(g, P, fx, y - 2, st.iconH, a);
      if (!race) {
        const top = st.top + st.rowH * r.i + 8;
        drawGiant(g, fmt(r, valAt(r, f)), L.giantX, top, st.px, C.amber);
        if (r.data && f >= Ao(r.data_at, r.fl ?? r.f0 + 6)) drawMono(g, r.data, L.textX0, top + CAP.giant * st.px + 22, {});
      }
      if (r.label && f >= r.f0 + 4) drawMono(g, r.label, st.x0, y + (race ? 8 : 30), { px: 24, kind: 'label' });
    });
    if (spec.mark) {
      const r = rows[spec.mark.row ?? 0], mf = A(spec.mark.at);
      if (f >= mf) {
        const P = icon(r), w = P ? iconW(r) : 60, x = front(r, f) + w / 2, y = barY(r.i) - st.iconH / 2;
        ring(g, x, y, Math.max(w, st.iconH) * 0.62 * (0.4 + 0.6 * sp(f - mf)));
      }
    }
  }
  const iconCenter = (r, f) => [front(r, f) + iconW(r) / 2, barY(r.i) - st.iconH / 2];
  const dotRow = rows[spec.dot_row ?? rows.length - 1];
  return {
    layout, draw, drawsIn: true,
    dotIn: (f) => iconCenter(rows[0], Math.max(f, rows[0].f0)),
    dotOut: (f) => iconCenter(dotRow, f),
    credit: () => {
      const cr = [...new Set(rows.map((r) => icon(r)?.credit).filter(Boolean))];
      const src = b.spec.source ? `Source: ${b.spec.source}` : null;
      return [src, ...cr.map((c) => (src ? `icons ${c}` : c))].filter(Boolean).join(' · ');
    },
    subjects: (f) => rows.filter((r) => f >= r.f0).map((r) => {
      const top = race ? barY(r.i) - st.iconH - 4 : st.top + st.rowH * r.i;
      return [race ? st.x0 : 40, top, Math.max(front(r, f) + iconW(r), race ? 0 : 40 + giantWidth(fmt(r, r.value), st.px) + 32) - (race ? st.x0 : 40), barY(r.i) + (r.label ? 64 : 24) - top];
    }),
    anchors: (f) => {
      const a = { bars: [40, st.top, 1000, st.bottom - st.top] };
      rows.forEach((r) => { const [x, y] = iconCenter(r, f); a['row' + r.i] = [x - iconW(r) / 2, y - st.iconH / 2, iconW(r), st.iconH]; });
      return a;
    },
    cues: () => race
      ? [{ frame: rows[0].f0 + 2, type: 'scene_move', note: 'the rows race in', gain_db: -2, pri: 48 }, ...(spec.mark ? [{ frame: A(spec.mark.at), type: 'impact', note: 'ring on a row', sfx: 'tick', pri: 50 }] : [])]
      : rows.map((r) => ({ frame: Math.round(r.f1), type: 'number_slam', note: `bar ${r.i + 1} lands on ${fmt(r, r.value)}`, gain_db: -3 })),
  };
};
