// number.js: the giant number block used by hook, photo, lens, count, diagram, bars and points shots.
// spec: { value | text, decimals, prefix, suffix, style: 'count' | 'slam' | 'roll', from (roll), at, land,
//         data: "MILES _·_ 45.16 KM" | [{ at, text }], size, exit_at }
// count: spring count-up (zeta 0.8, f 2), monotonic, capped at the value, starting on the first nonzero step.
// roll: a mechanical odometer from `from` to `value` between `at` and `land`.
// slam: the whole value slams in (1.12 to 1.0 over 5 frames).
// On a photo the number sits on an ink box (amber on ink, 11:1); on ink it is plain amber.
const NumberBlock = (spec, b, opt = {}) => {
  const { A, Ao, FPS, C, L, k, enter, exitE, countU, slam, lerp, move, drawGiant, drawMono, giantWidth, CAP, clamp01 } = E;
  const at = Ao(spec.at, opt.defaultAt ?? b.w), land = Ao(spec.land, null);
  const exitAt = Ao(spec.exit_at, null);
  const style = spec.style ?? (spec.text != null ? 'slam' : 'count');
  const dec = spec.decimals ?? (spec.value != null && String(spec.value).includes('.') ? String(spec.value).split('.')[1].length : 0);
  const fmt = (v) => (spec.prefix ?? '') + (spec.text != null ? spec.text : Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: Math.abs(spec.value) >= 1000 })) + (spec.suffix ?? '');
  const finalText = fmt(spec.value);
  const box = opt.box ?? false;
  const data = spec.data == null ? [] : typeof spec.data === 'string' ? [{ at: null, text: spec.data }] : spec.data;
  const dataAt = data.map((d) => Ao(d.at, at + 4));
  const st = { top: opt.top ?? L.giantTop, px: 300, w: 0, h: 0, bottom: 0, x: opt.x ?? L.giantX + (box ? 16 : 0) };
  function layout(top = st.top) {
    st.top = top;
    const maxW = (L.textX1 - st.x) - (box ? 16 : 0);
    const w100 = giantWidth(finalText, 100);
    st.px = Math.floor(Math.min(spec.size ?? opt.maxSize ?? 340, (100 * maxW) / w100));
    st.w = giantWidth(finalText, st.px); st.h = CAP.giant * st.px;
    st.dataY = st.top + st.h + (box ? 34 : 26);
    st.bottom = data.length ? st.dataY + 40 : st.top + st.h + (box ? 16 : 0);
    return st;
  }
  layout();
  const first = Math.pow(10, -dec);
  // displayed numeric value at f (never zero, never more than the value, only counts up)
  function valueAt(f) {
    if (spec.text != null || style === 'slam') return spec.value;
    if (style === 'roll') return lerp(spec.from ?? 0, spec.value, k(f, at + 2, Math.max(4, (land ?? at + 30) - at - 2), move));
    const u = land != null && opt.countLinear ? clamp01((f - at) / Math.max(1, land - at)) : countU(f, at);
    const v = Math.floor((spec.value * u) / first + 1e-6) * first;
    return Math.max(first, Math.min(spec.value, v));
  }
  const visible = (f) => f >= at || (opt.frame0 && at <= 6);
  const exitY = (f) => (exitAt == null ? 0 : -1300 * k(f, exitAt, 8, exitE));
  // odometer digits: each place rolls when every place to its right passes 9
  function drawRoll(g, f, x, top, px) {
    const u = valueAt(f), n = Math.round(u * Math.pow(10, dec) * 1000) / 1000;
    const txt = fmt(u), h = CAP.giant * px, cellW = CAP.digit * px;
    if (box && !g.__probe) { g.fillStyle = C.ink; g.fillRect(x - 16, top - 16, giantWidth(finalText, px) + 32, h + 32); }
    if (E.track(g, x, top + h / 2)) return;
    E.FONT.giant(g, px); g.fillStyle = C.amber; g.textBaseline = 'alphabetic';
    const digits = [...txt].filter((c) => /\d/.test(c)).length;
    let cx = x, place = digits - 1;
    for (const ch of txt) {
      if (!/\d/.test(ch)) { g.fillText(ch, cx, top + h); cx += g.measureText(ch).width; continue; }
      const p10 = Math.pow(10, place), base = Math.floor(n / p10) % 10;
      const lower = n - Math.floor(n / p10) * p10;
      const carry = place === 0 ? n - Math.floor(n) : Math.max(0, lower - (p10 - 1));
      const v = base + (place === 0 ? 0 : carry), d0 = Math.floor(v) % 10, fr = place === 0 ? carry : v - Math.floor(v);
      g.save(); g.beginPath(); g.rect(cx - 4, top - 6, cellW + 8, h + 12); g.clip();
      const lh = h * 1.25;
      for (const [d, dy] of [[d0, -fr * lh], [(d0 + 1) % 10, (1 - fr) * lh]]) {
        const w = g.measureText(String(d)).width; g.fillText(String(d), cx + (cellW - w) / 2, top + h + dy);
      }
      g.restore();
      cx += cellW; place--;
    }
    E.regText(g, x, top, giantWidth(finalText, px), h, 'giant');
  }
  function draw(g, f) {
    const ey = exitY(f); if (ey < -1200) return;
    if (visible(f)) drawNumber(g, f, ey);
    drawData(g, f, ey);
  }
  function drawNumber(g, f, ey) {
    const sc = opt.frame0 && at <= 6 ? 1 : slam(f - at);
    g.save();
    const cy = st.top + st.h / 2;
    g.translate(0, ey); g.translate(st.x, cy); g.scale(sc, sc); g.translate(-st.x, -cy);
    const prevMoving = g.__moving; if (sc > 1.0001 || ey) g.__moving = true;
    if (style === 'roll') drawRoll(g, f, st.x, st.top, st.px);
    else drawGiant(g, fmt(valueAt(f)), st.x, st.top, st.px, opt.color ?? C.amber, { box });
    g.__moving = prevMoving;
    g.restore();
  }
  function drawData(g, f, ey) {
    // data line: the newest one whose word has been said
    let di = -1; data.forEach((d, i) => { if (f >= dataAt[i]) di = i; });
    if (di >= 0) {
      g.save(); g.translate(0, ey);
      drawMono(g, data[di].text, L.textX0, st.dataY, {});
      g.restore();
    }
  }
  const rect = () => [st.x - 16, st.top - 16, st.w + 32, st.bottom - st.top + 16];
  return {
    st, layout, draw, rect, at, land, valueAt, finalText,
    on: (f) => (visible(f) || (dataAt.length && f >= Math.min(...dataAt))) && exitY(f) > -1200,
    cues: () => [{ frame: style === 'roll' && land != null ? land : at, type: 'number_slam', note: `${finalText} ${style === 'count' ? 'counts up' : style === 'roll' ? 'rolls in' : 'slams in'}`, ...(style === 'count' ? { gain_db: -2 } : {}) }],
  };
};
