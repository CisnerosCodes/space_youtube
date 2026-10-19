// cards.js: the fact card (a quote or a claim from the source, line by line) and the NEXT card.

// fact card. spec: { lines: [{ at, text }], by: 'THE TEAM · SCIENCE, OCT 2026', by_at, art: diagram spec }
// Headline lines (Archivo 800, uppercase, *amber* words) slam in on their words beside an amber rule;
// the attribution sits under them in mono; optional line art fills the rest of the frame.
E.SHOTS.fact = (spec, b) => {
  const { A, Ao, C, L, k, slam, line, drawHeadline, drawMono, headlineWidth, CAP } = E;
  const lines = spec.lines.map((q, i) => ({ ...q, f: Ao(q.at, b.w + i * 10) }));
  const byF = Ao(spec.by_at, lines[lines.length - 1].f + 8);
  const st = { top: (b.spec.chip ? L.giantTopChip : L.contentTop) + 30, px: 88, pitch: 100, x: 116 };
  const art = spec.art ? E.SHOTS.diagram({ ...spec.art }, b) : null;
  function layout() {
    const w100 = Math.max(...lines.map((q) => headlineWidth(q.text, 100)));
    st.px = Math.floor(Math.min(spec.size ?? 100, (100 * (L.textX1 - st.x)) / w100));
    st.pitch = CAP.headline * st.px + 30;
    st.bottom = st.top + lines.length * st.pitch + (spec.by ? 56 : 0);
    if (art) { art.zoneTop = st.bottom + 40; art.layout(); }
  }
  function draw(g, f) {
    const shown = lines.filter((q) => f >= q.f);
    if (shown.length) line(g, [[86, st.top - 8], [86, st.top + shown.length * st.pitch - 22]], 6);
    lines.forEach((q, i) => {
      if (f < q.f) return;
      const top = st.top + i * st.pitch, cy = top + (CAP.headline * st.px) / 2, sc = slam(f - q.f);
      g.save(); g.translate(st.x, cy); g.scale(sc, sc); g.translate(-st.x, -cy);
      const pm = g.__moving; if (sc > 1.0001) g.__moving = true;
      drawHeadline(g, q.text, st.x, top, { px: st.px });
      g.__moving = pm; g.restore();
    });
    if (spec.by && f >= byF) drawMono(g, spec.by, st.x - 12, st.top + lines.length * st.pitch, { color: C.paper });
    art?.draw(g, f);
  }
  const rect = () => [80, st.top - 10, L.textX1 - 80, st.bottom - st.top + 10];
  return {
    layout, draw, drawsIn: true,
    dotIn: (f) => art?.dotIn(f) ?? [86, st.top], dotOut: (f) => art?.dotOut(f) ?? [86, st.top], dot: (f) => art?.dot(f) ?? null,
    credit: () => (b.spec.source ? `Source: ${b.spec.source}` : null),
    subjects: (f) => [rect(), ...(art ? art.subjects(f) : [])],
    anchors: (f) => ({ ...(art ? art.anchors(f) : {}), quote: rect() }),
    cues: () => [...lines.map((q, i) => ({ frame: q.f, type: 'impact', note: `fact line ${i + 1} slams in`, gain_db: -2, pri: i === lines.length - 1 ? 52 : 36 })), ...(art ? art.cues() : [])],
  };
};

// NEXT card. spec: { headline: ['NEXT STOP:', '*IDUBI*'], headline_at: [words], date: 'MON 19 OCT' | null, date_at,
//                    lines: [{ at, text }], pointer: { at, text: '*Follow* Downlink Cat' }, art: diagram spec }
// Ink ground, no photo. Kicker reads NEXT ON <SERIES>. Order: headline, date, lines, art, pointer, then the
// wordmark: the echo-mark dot lands just after the last word, its ring 12 frames later (with the sonic logo),
// and the last frame is the finished wordmark.
E.SHOTS.next = (spec, b) => {
  const { A, Ao, C, L, k, slam, sp, clamp01, drawHeadline, drawMono, monoWidth, CAP, WM, FONT, line, dot } = E;
  const heads = spec.headline.map((t, i) => ({ t, f: Ao(spec.headline_at?.[i], b.w + i * 8) }));
  const dateF = Ao(spec.date_at, b.w + 15);
  const lines = (spec.lines ?? []).map((q, i) => ({ ...q, f: Ao(q.at, b.w + 22 + i * 10) }));
  const ptrF = Ao(spec.pointer?.at, b.w + 30);
  const st = { top: 330, pitch: 84, dateY: 0, linesY: 0, artTop: 0, ptrY: 1004, wmY: 1094 };
  const art = spec.art ? E.SHOTS.diagram({ ...spec.art }, b) : null;
  function layout() {
    st.pitch = CAP.headline * 88 + 22;
    let y = st.top + heads.length * st.pitch + 8;
    if (spec.date) { st.dateY = y; y += 80; }
    st.linesY = y; y += lines.length * 46;
    st.artTop = y + 30;
    if (art) { art.zoneTop = st.artTop; art.zoneBottom = st.ptrY - 20; art.layout(); }
  }
  function drawPointer(g, f) {
    if (!spec.pointer || f < ptrF) return;
    const txt = spec.pointer.text, w = monoWidth(txt, 28) + 14 + 28 + 32, h = 62, x = 80, y = st.ptrY;
    if (E.track(g, x, y)) return;
    g.save(); g.fillStyle = C.ink; g.fillRect(x, y, w, h); g.strokeStyle = C.amber; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.translate(x + 14, y + 17); g.strokeStyle = C.amber; g.lineWidth = 3; g.beginPath(); g.moveTo(3, 14); g.lineTo(23, 14); g.moveTo(15, 6); g.lineTo(23, 14); g.lineTo(15, 22); g.stroke();
    g.restore();
    drawMono(g, txt, x + 14 + 28 + 2, y + 4, { box: false, padY: 8, padX: 12 });
  }
  function drawWordmark(g, f) {
    if (f < WM) return;
    const x = 80, y = st.wmY, de = sp(f - WM, 0.7, 4);
    dot(g, x + 22, y + 22, 22 * (0.4 + 0.6 * de));
    const dr = f - (WM + 12);
    if (dr >= 0) { g.save(); g.globalAlpha *= clamp01((dr + 1) / 3); E.ring(g, x + 82, y + 22, 19 * (0.4 + 0.6 * sp(dr)), 6); g.restore(); }
    if (f >= WM + 4 && !g.__probe) {
      FONT.wordmark(g, 64); g.textBaseline = 'middle'; g.fillStyle = C.paper; g.fillText('DOWNLINK', x + 128, y + 25);
      const w1 = g.measureText('DOWNLINK ').width; g.fillStyle = C.amber; g.fillText('CAT', x + 128 + w1, y + 25);
      E.regText(g, x + 128, y, w1 + g.measureText('CAT').width, 50, 'wordmark');
    }
  }
  function draw(g, f) {
    heads.forEach((h, i) => {
      if (f < h.f) return;
      const top = st.top + i * st.pitch, cy = top + CAP.headline * 44, sc = slam(f - h.f);
      g.save(); g.translate(80, cy); g.scale(sc, sc); g.translate(-80, -cy);
      const pm = g.__moving; if (sc > 1.0001) g.__moving = true;
      drawHeadline(g, h.t, 80, top, { px: 88 });
      g.__moving = pm; g.restore();
    });
    if (spec.date && f >= dateF) drawMono(g, `*${spec.date}*`, 80, st.dateY, { px: 64, box: false, padX: 0, padY: 0 });
    lines.forEach((q, i) => { if (f >= q.f) drawMono(g, q.text, 80, st.linesY + i * 46, { box: false, padX: 0, padY: 2 }); });
    art?.draw(g, f);
    drawPointer(g, f);
    drawWordmark(g, f);
  }
  const headRect = () => [80, st.top - 10, L.textX1 - 80, st.artTop - st.top - 20];
  const ptrRect = () => [80, st.ptrY, monoWidth(spec.pointer?.text ?? '', 28) + 88, 62];
  const wmRect = () => [80, st.wmY, 660, 50];
  return {
    layout, draw, drawsIn: true,
    dotIn: (f) => art?.dotIn(f) ?? [102, st.wmY + 22], dotOut: (f) => art?.dotOut(f) ?? [102, st.wmY + 22], dot: (f) => art?.dot(f) ?? null,
    credit: () => (b.spec.source ? `Source: ${b.spec.source}` : null),
    subjects: (f) => [headRect(), ...(f >= ptrF ? [ptrRect()] : []), ...(f >= WM ? [wmRect()] : []), ...(art ? art.subjects(f) : [])],
    anchors: (f) => ({ ...(art ? art.anchors(f) : {}), headline: headRect(), pointer: ptrRect(), wordmark: wmRect(), date: [80, st.dateY, 400, 70] }),
    cues: () => [{ frame: b.w, type: 'next_card_in', note: 'the NEXT card' }, ...(art ? art.cues() : [])],
  };
};
