// points.js: a count shown as exactly that many points on the ground ahead of a viewpoint (the dot).
// Stage 1 (a small number, at most 400) pops its points in rows ahead of the viewpoint, with sight lines;
// stage 2 bursts out of the stage-1 points into a ground carpet; the points drawn are the count on screen.
// A photo lens can introduce each stage (large first, then it irises into the corner; a hard cut inside the
// lens on the stage-2 word; the lens shrinks into the viewpoint before the stage-2 count).
// spec: { stages: [{ at, value, data, image, image_at }, { at, value, data, image, image_at }], intro: 'full'|'corner' }
E.SHOTS.points = (spec, b) => {
  const { A, Ao, C, L, IMG, k, lerp, enter, move, exitE, sp, ring, dot, photo, frameCam, countU, clamp01, rng } = E;
  const [s1, s2] = spec.stages;
  const f1 = A(s1.at), f2 = A(s2.at);
  const img1 = s1.image ? IMG[s1.image] : null, img2 = s2.image ? IMG[s2.image] : null;
  const cut2 = Ao(s2.image_at, f2 - 10);
  const N1 = Math.min(400, s1.value), N2 = Math.min(1000000, s2.value);
  const num1 = NumberBlock({ value: s1.value, at: s1.at, data: s1.data, exit_at: s2.image_at ?? s2.at }, b, {});
  const num2 = NumberBlock({ value: s2.value, at: s2.at, data: s2.data }, b, {});
  // count of points on screen (stage 2): spring count-up, starts above the stage-1 count
  const n2 = (f) => (f < f2 ? 0 : Math.max(N1, Math.min(N2, Math.floor(N1 + (N2 - N1) * countU(f, f2)))));
  // the ground ahead in perspective: depth z in [1, 7.5], lateral l
  const VIEW = { x: 540, y: 1140 };
  const BUMPS = (() => { const r = rng(2006), o = []; for (let i = 0; i < 70; i++) { const z = 1.2 + r() * 6; o.push({ l: (r() * 2 - 1) * 0.9 * z, z, a: 0.03 + r() * 0.1, rr: 0.06 + r() * 0.16 }); } return o; })();
  const hgt = (l, z) => { let h = 0; for (const q of BUMPS) { const d2 = (l - q.l) ** 2 + ((z - q.z) / 2.2) ** 2; h += q.a * Math.exp(-d2 / (q.rr * q.rr)); } return h; };
  const proj = (l, z) => { const hy = 680, ny = 1150, h = hgt(l, z); return [540 + (l * 560) / z, hy + (ny - hy - h * 420) / z]; };
  const P1 = (() => { const cols = Math.ceil(Math.sqrt(N1 * 1.25)), rowsN = Math.ceil(N1 / cols), o = []; for (let i = 0; i < N1; i++) { const c = i % cols, r = Math.floor(i / cols); o.push(proj(-0.7 + (1.4 * c) / Math.max(1, cols - 1), 1.25 + (r * 2.2) / Math.max(1, rowsN))); } return o; })();
  let PTS = null;
  const FIELD = { y0: 600, h: 600 };
  let fieldC, fctx, fImg, fBuf, cnt, ALPHA;
  function buildField() {
    const r = rng(600000); PTS = new Float32Array(N2 * 3);
    for (let i = 0; i < N2; i++) {
      const z = 1 + r() * 6.5, l = (r() * 2 - 1) * 0.93 * z, [x, y] = proj(l, z);
      let best = 0, bd = 1e9; for (let j = 0; j < N1; j++) { const d = (P1[j][0] - x) ** 2 + (P1[j][1] - y) ** 2; if (d < bd) { bd = d; best = j; } }
      PTS[i * 3] = x; PTS[i * 3 + 1] = y; PTS[i * 3 + 2] = best;
    }
    fieldC = document.createElement('canvas'); fieldC.width = 1080; fieldC.height = FIELD.h;
    fctx = fieldC.getContext('2d'); fImg = fctx.createImageData(1080, FIELD.h); fBuf = new Uint32Array(fImg.data.buffer);
    cnt = new Uint16Array(1080 * FIELD.h);
    ALPHA = (() => { const t = new Uint32Array(64); for (let c = 0; c < 64; c++) { const al = Math.round(255 * (1 - Math.exp(-0.32 * c))); t[c] = new Uint32Array(new Uint8Array([245, 184, 61, al]).buffer)[0]; } return t; })();
  }
  const IMP = b.next ? b.T1 - 10 : Infinity;                // implosion into the next beat's dot
  const impT = (f) => (b.next ? b.next.shot.dotIn?.(f) ?? [540, 760] : [540, 760]);
  function field(g, f) {
    const n = n2(f); if (n <= N1 || g.__probe) return;
    cnt.fill(0);
    const imp = k(f, IMP, 10, (x) => x * x * x), T = impT(f);
    for (let i = 0; i < n; i++) {
      const tx = PTS[i * 3], ty = PTS[i * 3 + 1], p = PTS[i * 3 + 2] | 0;
      const e = enter(clamp01((f - f2 - (i / N2) * 2 + 1) / 10));
      let x = lerp(P1[p][0], tx, e), y = lerp(P1[p][1], ty, e);
      if (imp > 0) { x = lerp(x, T[0], imp); y = lerp(y, T[1], imp); }
      const xi = x | 0, yi = (y | 0) - FIELD.y0;
      if (xi < 0 || xi >= 1080 || yi < 0 || yi >= FIELD.h) continue;
      const q = yi * 1080 + xi; if (cnt[q] < 63) cnt[q]++;
    }
    for (let q = 0; q < cnt.length; q++) fBuf[q] = cnt[q] ? ALPHA[cnt[q]] : 0;
    fctx.putImageData(fImg, 0, 0);
    g.drawImage(fieldC, 0, FIELD.y0);
  }
  // the lens: full (intro) -> corner on the stage-1 word -> into the viewpoint before the stage-2 count
  const BIG = { x: 540, y: 820, r: 400 }, CORNER = { x: 800, y: 500, r: 150 };
  function lensAt(f) {
    const u = k(f, f1 - 2, 14, move), out = k(f, f2 - 8, 12, move);
    const intro = spec.intro === 'corner' ? 1 : u;
    const din = k(f, b.T0, 16, enter);
    const big = { ...BIG, y: lerp(BIG.y - 1400, BIG.y, b.tr.type === 'push' ? 1 : din) };
    return { x: lerp(lerp(big.x, CORNER.x, intro), VIEW.x, out), y: lerp(lerp(big.y, CORNER.y, intro), VIEW.y, out), r: lerp(lerp(big.r, CORNER.r, intro), 6, out), out };
  }
  function draw(g, f) {
    const Ls = lensAt(f), P = f >= cut2 ? img2 ?? img1 : img1;
    if (P && Ls.r > 7) {
      if (!g.__probe) { g.save(); g.beginPath(); g.arc(Ls.x, Ls.y, Ls.r, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill(); g.clip(); }
      const cam = frameCam(P, P.focus, Ls.x, Ls.y, 0.95, 1, Ls.r * 2, Ls.r * 2, false);
      photo(g, P, { ...cam, s: cam.s * (1 + 0.05 * k(f, b.T0, 60)) });
      if (!g.__probe) g.restore();
      ring(g, Ls.x, Ls.y, Ls.r, 4);
      if (f >= cut2 && f - cut2 < 16) { const d = f - cut2; ring(g, Ls.x, Ls.y, Ls.r + 50 * enter(d / 16), 4, 1 - d / 16); }
    }
    if (f >= f1) {
      const n = Math.max(1, Math.min(N1, Math.floor(N1 * countU(f, f1))));
      const imp = k(f, IMP, 10, (x) => x * x * x), T = impT(f);
      const fade = n2(f) > N1 ? 1 - k(f, f2, 10) : 1;
      for (let j = 0; j < n; j++) { const [x, y] = P1[j]; dot(g, lerp(x, T[0], imp), lerp(y, T[1], imp), 7, C.amber, Math.max(fade, imp)); }
      if (!g.__probe && Ls.out <= 0) {
        g.save(); g.strokeStyle = C.amber; g.globalAlpha *= 0.35 * fade; g.lineWidth = 2;
        for (let j = 0; j < n; j++) { g.beginPath(); g.moveTo(VIEW.x, VIEW.y); g.lineTo(P1[j][0], P1[j][1]); g.stroke(); }
        g.restore();
      }
    }
    if (f >= f1 && (Ls.out <= 0 || Ls.r <= 7)) { const imp = k(f, IMP, 10, (x) => x * x * x), T = impT(f); dot(g, lerp(VIEW.x, T[0], imp), lerp(VIEW.y, T[1], imp), 11); }
    field(g, f);
    num1.draw(g, f);
    if (f >= f2 && f < IMP + 6) num2.draw(g, f);
  }
  function layout() {
    num1.layout(L.giantTop); num2.layout(L.giantTop);
    for (const P of [img1, img2]) if (P && P.kind !== 'graphic') E.buildLayers(P, { layers: 1 });
    buildField();
    E.setBlurCap((f) => (f >= f2 && f < b.end ? 6 : 16));
  }
  const lensCredit = (f) => { const Ls = lensAt(f); return Ls.r > 7 ? (f >= cut2 ? img2 ?? img1 : img1)?.credit : null; };
  return {
    layout, draw, drawsIn: true, enterIris: true,
    dotIn: () => [VIEW.x, VIEW.y], dotOut: (f) => impT(f), dot: (f) => (f >= f1 ? [VIEW.x, VIEW.y] : null),
    credit: (f) => [lensCredit(f), f >= f1 && b.spec.source ? `Source: ${b.spec.source}` : null].filter(Boolean),
    subjects: (f) => { const Ls = lensAt(f); return [[Ls.x - Ls.r, Ls.y - Ls.r, 2 * Ls.r, 2 * Ls.r], ...(num1.on(f) ? [num1.rect()] : []), ...(f >= f2 ? [num2.rect(), [0, 640, 1080, 520]] : []), ...(f >= f1 && f < f2 ? [[200, 640, 680, 520]] : [])]; },
    anchors: (f) => { const Ls = lensAt(f); return { lens: [Ls.x - Ls.r, Ls.y - Ls.r, 2 * Ls.r, 2 * Ls.r], view: [VIEW.x, VIEW.y], number: (f >= f2 ? num2 : num1).rect() }; },
    cues: () => [
      { frame: f1, type: 'impact', note: `${s1.value} points pop in` },
      { frame: cut2, type: 'impact', note: 'hard cut inside the lens', sfx: 'tick', pri: 38 },
      { frame: f2, type: 'reveal', note: `${s2.value.toLocaleString('en-US')} points burst out`, sfx: 'swell_reveal', gain_db: -2 },
    ],
  };
};
