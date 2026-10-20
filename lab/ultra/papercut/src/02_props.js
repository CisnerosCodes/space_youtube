// ---------- props: every paper piece in the diorama ----------
// inlay a torn patch inside a sprite being built (layered paper look without a separate piece)
function inlay(g, poly, paper, seed, o = {}) {
  const torn = o.torn ?? true;
  const top = roughen(poly, { amp: o.amp ?? (torn ? 2.4 : 0.5), freq: o.freq ?? 0.07, seed, bias: -1, amp2: torn ? 0.8 : 0.2, step: 3 });
  if (o.shadow ?? true) {
    g.save(); g.filter = `blur(${o.sb ?? 3}px)`; g.fillStyle = `rgba(20,10,20,${o.sa ?? 0.28})`;
    g.translate(o.sx ?? 2.5, o.sy ?? 3.5); pathPolys(g, [top]); g.fill(); g.restore();
  }
  if (torn) { const core = roughen(poly, { amp: 2.8, freq: 0.09, seed: seed + 5, bias: 1.6, amp2: 1, freq2: 0.7, step: 3 }); g.fillStyle = pat(g, coreFor(paper), seed + 1); pathPolys(g, [core]); g.fill(); }
  g.fillStyle = pat(g, paper, seed); pathPolys(g, [top]); g.fill();
  if (o.edge ?? true) { g.save(); pathPolys(g, [top]); g.clip(); g.strokeStyle = 'rgba(20,10,5,0.12)'; g.lineWidth = 4; pathPolys(g, [top]); g.stroke(); g.restore(); }
  return top;
}
function textIn(g, str, x, y, font, color, o = {}) {
  g.save(); g.font = font; g.fontStretch = o.stretch || 'normal'; g.letterSpacing = o.ls || '0px';
  g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
  g.fillStyle = color; g.globalAlpha = o.alpha ?? 0.92;
  if (o.rot) { g.translate(x, y); g.rotate(o.rot); g.fillText(str, 0, 0); } else g.fillText(str, x, y);
  g.restore();
}

// ---------- space backdrop (one big canvas, punched-hole stars) ----------
const BACK = { w: 1700, h: 2900, stars: [] };
function buildBackdrop() {
  const c = document.createElement('canvas'); c.width = BACK.w; c.height = BACK.h;
  const g = c.getContext('2d');
  g.fillStyle = pat(g, 'space0', 3); g.fillRect(0, 0, BACK.w, BACK.h);
  const rng = mulberry32(4242);
  // big soft mottles of a second dark paper (layered sheets)
  for (let i = 0; i < 7; i++) {
    const poly = blobPts(rng() * BACK.w, rng() * BACK.h, 300 + rng() * 300, 120 + rng() * 140, 50 + i, 0.25, 90, rng() * 3);
    inlay(g, poly, i % 2 ? 'space1' : 'space2', 300 + i, { sa: 0.35, sb: 8, sx: 6, sy: 9 });
  }
  // punched holes
  for (let i = 0; i < 330; i++) {
    const x = rng() * BACK.w, y = rng() * BACK.h, r = 0.9 + Math.pow(rng(), 3) * 3.6;
    g.fillStyle = 'rgba(0,0,0,0.65)'; g.beginPath(); g.arc(x - 0.6, y - 0.8, r + 1.3, 0, TAU); g.fill();
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.6, '#f8e6bd'); gr.addColorStop(1, '#d9c497');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    if (r > 2.2) BACK.stars.push([x, y, r, rng()]);
  }
  BACK.c = c;
}
function drawBackdrop(ctx, cam, alpha = 1) {
  const M = camM(cam, 4.5);
  ctx.globalAlpha = alpha;
  ctx.setTransform(...mmul(M, mT(540 - BACK.w / 2, 960 - BACK.h / 2)));
  ctx.drawImage(BACK.c, 0, 0);
  // twinkle: light behind the holes flickers (on twos)
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < BACK.stars.length; i++) {
    const [x, y, r, ph] = BACK.stars[i];
    const tw = Math.pow(h2(G.step * 0.5 | 0, i + 1), 6);
    if (tw < 0.25) continue;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
    gr.addColorStop(0, `rgba(255,236,190,${0.55 * tw * alpha})`); gr.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// ---------- generic factories ----------
const PC = {}; // piece registry
function cloudPts(R, seed, n = 9, flat = 0.55) {
  const p = []; const ph = h1(seed) * TAU;
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * TAU;
    let r = R * (0.78 + 0.22 * Math.abs(Math.sin(a * n / 2 + ph)) + 0.05 * Math.sin(a * 3 + seed));
    let y = Math.sin(a) * r; if (y > 0) y *= flat;
    p.push([Math.cos(a) * r * 1.25, y]);
  }
  return p;
}
function flamePts(w, L, seed) {
  const p = [];
  const n = 40;
  for (let i = 0; i <= n; i++) { // right side going down
    const u = i / n; const wob = 1 + 0.18 * Math.sin(u * 9 + seed * 3.1) + 0.1 * Math.sin(u * 17 + seed);
    p.push([w / 2 * Math.pow(Math.sin(Math.PI * (0.15 + 0.85 * u) * 0.5 + 0.6), 1) * (1 - u) * 1.15 * wob, u * L]);
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n; const wob = 1 + 0.2 * Math.sin(u * 8 + seed * 2.3 + 1) + 0.1 * Math.sin(u * 15 + seed * 1.7);
    p.push([-w / 2 * Math.pow(Math.sin(Math.PI * (0.15 + 0.85 * u) * 0.5 + 0.6), 1) * (1 - u) * 1.15 * wob, u * L]);
  }
  // pointed tip with a little curl
  p.splice(n + 1, 0, [Math.sin(seed * 5) * w * 0.12, L * 1.04]);
  return p;
}
function crater(g, x, y, r, seed, lt = 'phoLt', mid = 'phoDk', dk = 'phoDk2') {
  inlay(g, blobPts(x, y, r * 1.28, r * 1.18, seed, 0.12, 40), lt, seed, { sa: 0.22, sb: 2, sx: 1.5, sy: 2 });
  g.save();
  const floor = blobPts(x, y, r, r * 0.92, seed + 1, 0.1, 36);
  g.fillStyle = pat(g, mid, seed + 2); pathPolys(g, [floor]); g.fill();
  pathPolys(g, [floor]); g.clip();
  // inner shadow on the upper-left wall (light from upper-left)
  g.fillStyle = pat(g, dk, seed + 3);
  g.beginPath(); g.arc(x - r * 0.05, y - r * 0.05, r, 0, TAU); g.arc(x + r * 0.32, y + r * 0.36, r * 0.98, 0, TAU, true); g.fill('evenodd');
  g.restore();
}

function buildProps() {
  // ----- Mars (authored radius 500) -----
  const MR = 500;
  PC.marsBase = new Piece({ shape: () => ellipsePts(0, 0, MR, MR, 220), paper: 'mars', edge: 'torn', res: 1.7, variants: 2, blur: 16, amp: 3.2, jitter: 0.5,
    details: (g) => {
      const lg = g.createRadialGradient(-160, -180, 60, 0, 0, MR); lg.addColorStop(0, 'rgba(255,220,170,0.10)'); lg.addColorStop(1, 'rgba(60,10,0,0.12)'); g.fillStyle = lg; g.fillRect(-MR, -MR, MR * 2, MR * 2);
    } });
  const mp = [];
  const rng = mulberry32(77);
  const patch = (x, y, rx, ry, paper, lump = 0.3, rot = 0) => mp.push({ p: new Piece({ shape: () => blobPts(0, 0, rx, ry, 600 + mp.length * 7, lump, 60, rot), paper, edge: 'torn', res: 1.6, blur: 5, jitter: 0.4 }), x, y });
  patch(-150, -40, 150, 70, 'marsDk', 0.35, 0.3); patch(130, 120, 120, 80, 'marsDk', 0.4, -0.4); patch(-60, 220, 170, 60, 'marsDk', 0.3, 0.1);
  patch(210, -170, 90, 50, 'marsDk2', 0.4, 0.6); patch(-260, 140, 80, 60, 'marsDk2', 0.4, 0);
  patch(60, -230, 160, 60, 'marsLt', 0.3, -0.2); patch(-230, -230, 90, 50, 'marsLt', 0.4, 0.5); patch(250, 260, 100, 60, 'marsSand', 0.4, 0.3);
  patch(-10, 60, 110, 45, 'marsSand', 0.4, -0.1); patch(-330, 0, 60, 90, 'marsLt', 0.3, 0.1);
  PC.marsPatches = mp;
  PC.marsValles = new Piece({ shape: () => stripPts(quadLine([-230, 70], [-20, 10], [200, 40], 30), 22, 10), paper: 'marsDk2', edge: 'torn', res: 1.6, blur: 4, amp: 1.6 });
  PC.marsCap = new Piece({ shape: () => blobPts(0, 0, 62, 20, 991, 0.3, 60), paper: 'cap', edge: 'torn', res: 1.6, blur: 5 });
  PC.marsNight = new Piece({ shape: () => { const p = []; for (let i = 0; i <= 60; i++) { const a = -Math.PI / 2 + (i / 60) * Math.PI; p.push([Math.cos(a) * (MR + 4), Math.sin(a) * (MR + 4)]); } for (let i = 60; i >= 0; i--) { const a = -Math.PI / 2 + (i / 60) * Math.PI; p.push([Math.cos(a) * MR * 0.42 + 80, Math.sin(a) * (MR + 4)]); } return p; }, paper: 'marsDk2', edge: 'torn', res: 1.2, blur: 10, variants: 2 });

  // ----- nebula strips -----
  PC.neb1 = new Piece({ shape: () => blobPts(0, 0, 900, 170, 31, 0.3, 120, 0.25), paper: 'space2', edge: 'torn', res: 0.8, variants: 2, blur: 18, jitter: 0.3 });
  PC.neb2 = new Piece({ shape: () => blobPts(0, 0, 800, 130, 32, 0.35, 120, -0.3), paper: 'space1', edge: 'torn', res: 0.8, variants: 2, blur: 18, jitter: 0.3 });
  // paper stars on threads
  PC.pstar = [0, 1, 2].map((i) => new Piece({ shape: () => { const p = []; for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU - Math.PI / 2; const r = k % 2 ? 9 : 26; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }, paper: i === 1 ? 'amber' : 'cream', edge: 'cut', blur: 5, res: 1.5 }));

  // ----- clouds / puffs -----
  PC.cloud = [0, 1, 2, 3, 4].map((i) => new Piece({ shape: () => cloudPts(70 + i * 6, 40 + i, 7 + (i % 3), 0.5), paper: 'cloud', edge: 'torn', res: 1.5, blur: 8,
    details: (g) => { g.fillStyle = pat(g, 'cloudSh', 70 + i); g.beginPath(); g.ellipse(10, 46, 120, 34, 0, 0, TAU); g.fill(); } }));
  PC.puff = [0, 1, 2].map((i) => new Piece({ shape: () => cloudPts(40, 90 + i, 6, 0.8), paper: i === 2 ? 'blueTag' : 'cloud', edge: 'torn', res: 2.4, blur: 6 }));
  // flames: replacement library (6 shapes x 3 layers)
  PC.flame = [0, 1, 2, 3, 4, 5].map((i) => [
    new Piece({ shape: () => flamePts(70, 210, i + 1), paper: 'flameR', edge: 'torn', res: 1.4, blur: 6, variants: 1, amp: 1.8 }),
    new Piece({ shape: () => flamePts(52, 150, i + 7), paper: 'flameO', edge: 'torn', res: 1.4, blur: 4, variants: 1, amp: 1.5 }),
    new Piece({ shape: () => flamePts(32, 90, i + 13), paper: 'flameY', edge: 'cut', res: 1.4, blur: 3, variants: 1 }),
  ]);

  // ----- Earth launch site -----
  const wave = (w, h, amp, n, seed, paper) => new Piece({ shape: () => { const p = []; for (let i = 0; i <= 90; i++) { const x = -w / 2 + (i / 90) * w; p.push([x, -amp * (0.5 + 0.5 * Math.sin((i / 90) * n * TAU + seed)) - amp * 0.3 * Math.sin((i / 90) * n * 2.3 * TAU + seed * 2)]); } p.push([w / 2, h], [-w / 2, h]); return p; }, paper, edge: 'torn', res: 0.9, variants: 2, blur: 14, jitter: 0.5,
    details: (g) => { g.strokeStyle = 'rgba(230,240,250,0.18)'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.beginPath(); const y = 30 + k * 34; for (let i = 0; i <= 40; i++) { const x = -w / 2 + (i / 40) * w; const yy = y + 6 * Math.sin(i * 0.9 + k * 2 + seed); i ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } } });
  PC.wave = [wave(1500, 520, 40, 3, 1, 'sea0'), wave(1500, 520, 46, 2.5, 2, 'sea1'), wave(1550, 520, 56, 2, 3, 'sea2'), wave(1600, 600, 70, 1.6, 4, 'sea3')];
  PC.island = new Piece({ shape: () => { const p = [[-560, 120]]; for (let i = 0; i <= 60; i++) { const x = -560 + (i / 60) * 1120; const u = i / 60; p.push([x, -30 - 70 * Math.sin(Math.PI * u) - 40 * fbm(5, u * 6) - 25 * Math.sin(u * 20)]); } p.push([560, 120]); return p; }, paper: 'island', edge: 'torn', res: 1, variants: 2, blur: 12 });
  PC.island2 = new Piece({ shape: () => { const p = [[-420, 100]]; for (let i = 0; i <= 40; i++) { const x = -420 + (i / 40) * 840; const u = i / 40; p.push([x, -10 - 50 * Math.sin(Math.PI * u) - 30 * fbm(9, u * 5)]); } p.push([420, 100]); return p; }, paper: 'island2', edge: 'torn', res: 1, variants: 2, blur: 10 });
  PC.tower = new Piece({ shape: () => { const polys = [rectPts(-22, -600, 44, 600)]; for (let k = 0; k < 13; k++) { const y = -585 + k * 45; polys.push([[-14, y], [14, y], [0, y + 18]], [[-14, y + 38], [14, y + 38], [0, y + 20]]); } return polys; }, paper: 'steelDk', edge: 'cut', res: 1.3, blur: 6 });
  PC.pad = new Piece({ shape: () => rectPts(-160, 0, 320, 36), paper: 'steelDk', edge: 'cut', res: 1, blur: 8 });
  // H3 (stylized illustration), origin at the core nozzle exit
  PC.h3core = new Piece({ shape: () => [[-27, -20], [-27, -470], [-31, -480], [-31, -560], [-22, -610], [0, -640], [22, -610], [31, -560], [31, -480], [27, -470], [27, -20]], paper: 'white', edge: 'cut', res: 1.4, blur: 8,
    details: (g) => { g.fillStyle = pat(g, 'ink', 5); g.fillRect(-27, -330, 54, 10); g.fillRect(-27, -120, 54, 6); g.fillStyle = pat(g, 'amber', 6); g.fillRect(-31, -480, 62, 5); g.strokeStyle = 'rgba(40,30,30,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -470); g.lineTo(0, -40); g.stroke(); } });
  PC.h3srb = new Piece({ shape: () => [[-11, -10], [-11, -200], [-6, -225], [0, -232], [6, -225], [11, -200], [11, -10]], paper: 'cream', edge: 'cut', res: 1.4, blur: 6,
    details: (g) => { g.fillStyle = 'rgba(40,30,30,0.18)'; g.fillRect(-11, -60, 22, 5); } });
  PC.nozzle = new Piece({ shape: () => [[-9, -6], [9, -6], [14, 18], [-14, 18]], paper: 'steelDk', edge: 'cut', res: 1.5, blur: 4 });

  // ----- MMX (stylized illustration, side view), origin at the body center -----
  PC.mmxBody = new Piece({ shape: () => rectPts(-78, -58, 156, 116), paper: 'gold', edge: 'cut', res: 2.8, blur: 8,
    details: (g, r) => { for (let i = 0; i < 26; i++) { const x = -78 + r() * 156, y = -58 + r() * 116; g.fillStyle = r() < 0.5 ? 'rgba(255,240,190,0.22)' : 'rgba(90,55,10,0.20)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 40); g.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 40); g.fill(); }
      g.strokeStyle = 'rgba(80,50,10,0.45)'; g.lineWidth = 2; g.strokeRect(-70, -50, 140, 100); g.beginPath(); g.moveTo(-70, 0); g.lineTo(70, 0); g.stroke(); } });
  PC.mmxPanel = new Piece({ shape: () => rectPts(0, -34, 200, 68), paper: 'panel', edge: 'cut', res: 2.6, blur: 7,
    details: (g) => { g.strokeStyle = 'rgba(160,190,230,0.35)'; g.lineWidth = 2; for (let x = 0; x <= 200; x += 25) { g.beginPath(); g.moveTo(x, -34); g.lineTo(x, 34); g.stroke(); } g.beginPath(); g.moveTo(0, 0); g.lineTo(200, 0); g.stroke(); g.strokeStyle = 'rgba(200,200,210,0.6)'; g.lineWidth = 4; g.strokeRect(1, -33, 198, 66); } });
  PC.mmxBoom = new Piece({ shape: () => rectPts(0, -5, 34, 10), paper: 'steel', edge: 'cut', res: 2.6, blur: 4 });
  PC.mmxDish = new Piece({ shape: () => { const p = []; for (let i = 0; i <= 30; i++) { const a = Math.PI + (i / 30) * Math.PI; p.push([Math.cos(a) * 46, Math.sin(a) * 18 - 6]); } p.push([6, -4], [6, 20], [-6, 20], [-6, -4]); return p; }, paper: 'white', edge: 'cut', res: 2.6, blur: 5 });
  PC.mmxLeg = new Piece({ shape: () => stripPts([[0, 0], [-30, 50], [-44, 78]], 9, 7).concat([]), paper: 'steelDk', edge: 'cut', res: 2.8, blur: 4 });
  PC.mmxPad = new Piece({ shape: () => ellipsePts(0, 0, 16, 6, 24), paper: 'steel', edge: 'cut', res: 2.8, blur: 3 });
  PC.mmxNozzle = new Piece({ shape: () => [[-14, 0], [14, 0], [22, 32], [-22, 32]], paper: 'steelDk', edge: 'cut', res: 2.6, blur: 4 });
  PC.armA = new Piece({ shape: () => stripPts([[0, 0], [86, 0]], 15, 13), paper: 'steel', edge: 'cut', res: 3, blur: 4 });
  PC.armB = new Piece({ shape: () => stripPts([[0, 0], [70, 0]], 13, 11), paper: 'steel', edge: 'cut', res: 3, blur: 4 });
  PC.corer = new Piece({ shape: () => rectPts(-10, -6, 20, 50), paper: 'steelDk', edge: 'cut', res: 3, blur: 4,
    details: (g) => { g.strokeStyle = 'rgba(230,230,240,0.35)'; g.lineWidth = 2; for (let y = 4; y < 44; y += 8) { g.beginPath(); g.moveTo(-10, y); g.lineTo(10, y + 4); g.stroke(); } } });

  // ----- IDEFIX rover (stylized machine), origin at the body center -----
  PC.rovBody = new Piece({ shape: () => rrectPts(-58, -26, 116, 46, 6), paper: 'steel', edge: 'cut', res: 2.6, blur: 6,
    details: (g) => { g.fillStyle = pat(g, 'gold', 8); g.fillRect(-58, -26, 116, 10); g.strokeStyle = 'rgba(40,40,50,0.35)'; g.lineWidth = 2; g.strokeRect(-48, -10, 40, 22); g.strokeRect(6, -10, 40, 22); } });
  PC.rovPanel = new Piece({ shape: () => rectPts(-54, -6, 108, 12), paper: 'panel', edge: 'cut', res: 2.6, blur: 4,
    details: (g) => { g.strokeStyle = 'rgba(160,190,230,0.4)'; g.lineWidth = 1.5; for (let x = -54; x <= 54; x += 18) { g.beginPath(); g.moveTo(x, -6); g.lineTo(x, 6); g.stroke(); } } });
  PC.rovMast = new Piece({ shape: () => [[-3, 0], [3, 0], [3, -34], [12, -34], [12, -48], [-12, -48], [-12, -34], [-3, -34]], paper: 'steelDk', edge: 'cut', res: 2.6, blur: 4 });
  PC.wheel = new Piece({ shape: () => ellipsePts(0, 0, 17, 17, 30), paper: 'ink', edge: 'cut', res: 2.8, blur: 4,
    details: (g) => { g.strokeStyle = 'rgba(230,220,200,0.55)'; g.lineWidth = 2.5; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); g.lineTo(-Math.cos(a) * 14, -Math.sin(a) * 14); g.stroke(); } } });

  // ----- the photo card (the one real photo), origin at the top eyelet -----
  PC.card = new Piece({ shape: () => rectPts(-200, 0, 400, 520), paper: 'white', edge: 'cut', res: 1.4, blur: 12, variants: 2, jitter: 0.5,
    details: (g) => {
      g.fillStyle = 'rgba(20,10,10,0.9)'; g.fillRect(-180, 30, 360, 352);
      g.save(); g.filter = 'contrast(1.06) saturate(0.92) sepia(0.06)'; g.drawImage(IMG.phobos, 0, 0, IMG.phobos.width, IMG.phobos.height, -180, 30, 360, 352); g.restore();
      // ink-on-paper: a whisper of paper fiber printed over the photo
      g.globalAlpha = 0.10; g.globalCompositeOperation = 'multiply'; g.fillStyle = pat(g, 'news', 4); g.fillRect(-180, 30, 360, 352); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      textIn(g, 'PHOBOS', -178, 428, '400 34px "Special Elite"', '#1b1a20');
      textIn(g, '27 x 22 x 18 km', 178, 428, '400 26px "Special Elite"', '#1b1a20', { align: 'right' });
      textIn(g, 'NASA/JPL-Caltech/University of Arizona', -178, 470, '500 15.5px "IBM Plex Mono"', '#3a3530');
      g.strokeStyle = 'rgba(30,20,20,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-178, 444); g.lineTo(178, 444); g.stroke();
    } });
  PC.targetTab = new Piece({ shape: () => rectPts(-102, -26, 204, 52), paper: 'red', edge: 'cut', res: 1.6, blur: 6,
    details: (g) => textIn(g, 'TARGET', 0, 14, '800 36px Archivo', '#f6efe0', { align: 'center', stretch: 'semi-expanded', ls: '3px' }) });

  // ----- calendar pad -----
  PC.calBack = new Piece({ shape: () => rectPts(-140, -30, 280, 330), paper: 'kraft', edge: 'cut', res: 1.4, blur: 10 });
  const months = [['OCT', '2026'], ['NOV', '2026'], ['DEC', '2026'], ['JAN', '2027'], ['FEB', '2027'], ['MAR', '2027'], ['APR', '2027'], ['MAY', '2027'], ['JUN', '2027'], ['JUL', '2027'], ['AUG', '2027']];
  PC.calPages = months.map(([m, y], i) => new Piece({ shape: () => rectPts(-122, 0, 244, 280), paper: 'cream', edge: 'cut', res: 1.5, blur: 6, variants: 2,
    details: (g) => {
      g.fillStyle = pat(g, i === 10 ? 'amber' : 'red', 30 + i); g.fillRect(-122, 0, 244, 66);
      if (i !== 0 && i !== 10) return; // blank riffle page: no month or year shown in between
      textIn(g, y, 0, 48, '600 34px "IBM Plex Mono"', i === 10 ? '#1b1a20' : '#f6efe0', { align: 'center', ls: '4px' });
      textIn(g, m, 0, 196, '800 90px Archivo', '#1b1a20', { align: 'center', stretch: 'semi-expanded' });
      g.strokeStyle = 'rgba(30,20,20,0.18)'; g.lineWidth = 2; for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(-100 + k * 33, 228); g.lineTo(-86 + k * 33, 228); g.stroke(); }
    } }));
  PC.calBackPage = new Piece({ shape: () => rectPts(-122, 0, 244, 280), paper: 'cream', edge: 'cut', res: 1.2, blur: 6, variants: 2 });

  // ----- tags (manila, typewriter) -----
  PC.tags = {};
  // luggage tag: front 25 kg, back 15 g (two-sided card)
  const lug = (lines, paper, big) => new Piece({ shape: () => [[-96, -20], [-71, -50], [100, -50], [100, 50], [-71, 50], [-96, 20]], paper, edge: 'cut', res: 2.6, blur: 6, variants: 2,
    details: (g) => { g.fillStyle = 'rgba(20,10,10,0.75)'; g.beginPath(); g.arc(-74, 0, 7, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.beginPath(); g.arc(-74, 0, 10, 0, TAU); g.stroke();
      if (lines[0]) textIn(g, lines[0], 14, -20, '600 17px "IBM Plex Mono"', '#2a2520', { align: 'center', alpha: 1 });
      textIn(g, big, 14, lines[0] ? 36 : 22, '800 54px Archivo', '#1b1a20', { align: 'center', stretch: 'semi-expanded', alpha: 1 }); } });
  PC.lugFront = lug(['ROVER (DLR)'], 'manila', '25 kg');
  PC.lugBack = lug(['ON PHOBOS (ESA)'], 'amber', '15 g');

  // ----- sample jar (vellum) -----
  PC.jarBack = new Piece({ shape: () => rrectPts(-80, -110, 160, 220, 22), paper: 'vellum', edge: 'cut', res: 2.2, blur: 8 });
  PC.jarLid = new Piece({ shape: () => rrectPts(-88, -136, 176, 34, 8), paper: 'steelDk', edge: 'cut', res: 2.2, blur: 6,
    details: (g) => { g.strokeStyle = 'rgba(230,230,240,0.3)'; g.lineWidth = 2; for (let x = -80; x < 88; x += 10) { g.beginPath(); g.moveTo(x, -134); g.lineTo(x, -104); g.stroke(); } } });
  PC.jarLabel = new Piece({ shape: () => rectPts(-70, -36, 140, 72), paper: 'cream', edge: 'cut', res: 2.6, blur: 4,
    details: (g) => { textIn(g, 'AT LEAST', 0, -7, '600 23px "IBM Plex Mono"', '#2a2520', { align: 'center', ls: '0.5px' }); textIn(g, '10 g', 0, 26, '800 38px Archivo', '#1b1a20', { align: 'center', stretch: 'semi-expanded' }); } });
  PC.grain = [0, 1, 2, 3, 4, 5].map((i) => new Piece({ shape: () => blobPts(0, 0, 9 + (i % 3) * 3, 7 + (i % 2) * 3, 700 + i, 0.4, 14), paper: i % 2 ? 'phoDk' : 'pho', edge: 'cut', res: 3, blur: 2, variants: 2 }));
  PC.bandaid = new Piece({ shape: () => rrectPts(-46, -14, 92, 28, 12), paper: 'manila', edge: 'cut', res: 2, blur: 4,
    details: (g) => { g.fillStyle = 'rgba(160,110,60,0.35)'; g.fillRect(-14, -14, 28, 28); g.fillStyle = 'rgba(90,60,30,0.35)'; for (const [x, y] of [[-30, -5], [-24, 5], [24, -5], [30, 5]]) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); } } });

  // ----- capsule (stylized) origin center -----
  PC.capsule = new Piece({ shape: () => [[-62, 18], [-40, -30], [-16, -42], [16, -42], [40, -30], [62, 18], [50, 30], [-50, 30]], paper: 'white', edge: 'cut', res: 1.8, blur: 7,
    details: (g) => { g.fillStyle = pat(g, 'ochreDk', 12); g.beginPath(); g.moveTo(-62, 18); g.quadraticCurveTo(0, 50, 62, 18); g.lineTo(50, 34); g.lineTo(-50, 34); g.fill(); g.fillStyle = 'rgba(20,10,10,0.22)'; g.fillRect(-48, -10, 96, 4); } });
  PC.capLid = new Piece({ shape: () => [[-44, 0], [-30, -24], [-12, -32], [12, -32], [30, -24], [44, 0]], paper: 'white', edge: 'cut', res: 1.8, blur: 6 });

  // ----- Earth globe (Australia facing us) -----
  const ER = 500;
  const proj = (lon, lat, lon0 = 136, lat0 = -24) => { const L = lon * D2R, P = lat * D2R, L0 = lon0 * D2R, P0 = lat0 * D2R; return [ER * Math.cos(P) * Math.sin(L - L0), -ER * (Math.cos(P0) * Math.sin(P) - Math.sin(P0) * Math.cos(P) * Math.cos(L - L0))]; };
  const AUS = [[142.5, -10.7], [143.5, -14], [145.3, -15.5], [145.8, -16.9], [146.8, -19.3], [149.2, -21.1], [150.5, -23.4], [153.2, -25.0], [153.1, -27.4], [153.6, -28.6], [152.5, -32], [151.2, -33.9], [150, -37.5], [147.8, -37.9], [146.3, -39.1], [144.9, -38.1], [143.5, -38.8], [141.6, -38.4], [139.6, -36.5], [138.2, -35.6], [138.5, -34.8], [137.7, -35.0], [137.5, -33.3], [135.6, -34.9], [133.7, -32.1], [131.5, -31.5], [129, -31.6], [124, -33], [121.9, -33.9], [118, -35], [115.1, -34.4], [115.7, -32], [114.6, -28.8], [113.5, -25.5], [114, -22], [118.6, -20.3], [121, -19.5], [122.2, -18], [124, -16.3], [126, -14], [128, -15], [129.5, -14.9], [130.8, -12.4], [132.5, -11.3], [136.0, -12.0], [136.8, -12.2], [136.5, -15.5], [139, -17.2], [140.5, -17.5], [141.6, -16], [141.5, -13]];
  const TAS = [[144.6, -40.7], [148.3, -40.9], [148.0, -43.2], [146.8, -43.6], [145.2, -42.2]];
  const NG = [[131, -1.5], [135, -3.5], [138, -1.8], [141, -2.6], [145, -4.5], [147.5, -6.2], [150, -10.3], [146, -8.2], [143.5, -9.2], [141, -9.1], [138.5, -8.3], [137.5, -5], [134.5, -4]];
  const NZN = [[172.7, -34.4], [174.5, -36], [176, -37.6], [178.5, -37.7], [177.9, -39.1], [176.9, -39.6], [176.2, -41.4], [174.6, -41.3], [175.1, -40], [173.8, -39.2], [174.6, -37.5]];
  const NZS = [[172.6, -40.6], [174.3, -41.7], [173.2, -43.7], [171.2, -44.4], [169.3, -46.6], [166.5, -46], [167.5, -44.6], [170.5, -42.9]];
  const IND = [[[105, -5.8], [110, -6.9], [114.5, -8.6], [112, -8.4], [106, -7]], [[95.5, 5.6], [98.5, 3.5], [104, -2], [106, -5.7], [103.8, -5], [101, -2], [97.5, 2]], [[109, 1.5], [113.5, -3.5], [116.5, -2.8], [117.8, 1], [115, 4.8], [111, 2]], [[119, 0.5], [120.5, -5.5], [123, -4.5], [121, -1.5], [125, 1.4], [122, 0.8], [120.2, 0.2]]];
  PC.earthOcean = new Piece({ shape: () => ellipsePts(0, 0, ER, ER, 220), paper: 'earth0', edge: 'torn', res: 1.7, variants: 2, blur: 16,
    details: (g) => { for (let k = 0; k < 5; k++) inlay(g, blobPts(-300 + k * 150, -350 + k * 170, 260, 90, 120 + k, 0.3, 60, 0.3), 'earth1', 130 + k, { sa: 0.18 }); } });
  const landPiece = (pts, paper, seed, det) => new Piece({ shape: () => pts.map(([lo, la]) => proj(lo, la)), paper, edge: 'torn', res: 1.8, blur: 6, amp: 1.6, freq: 0.12, seed, details: det });
  PC.aus = landPiece(AUS, 'ochre', 5001, (g) => { inlay(g, blobPts(-60, 40, 120, 80, 51, 0.4, 40), 'ochreLt', 52, { sa: 0.2 }); inlay(g, blobPts(90, -40, 60, 90, 53, 0.4, 40), 'land', 54, { sa: 0.2 }); inlay(g, blobPts(-140, -60, 60, 40, 55, 0.4, 40), 'ochreDk', 56, { sa: 0.2 }); inlay(g, blobPts(100, 120, 40, 60, 57, 0.5, 30), 'landDk', 58, { sa: 0.2 }); });
  PC.tas = landPiece(TAS, 'land', 5002); PC.ng = landPiece(NG, 'land', 5003); PC.nzn = landPiece(NZN, 'land', 5004); PC.nzs = landPiece(NZS, 'land', 5005);
  PC.ind = IND.map((p, i) => landPiece(p, 'land', 5010 + i));
  PC.earthNight = new Piece({ shape: () => { const p = []; for (let i = 0; i <= 60; i++) { const a = -Math.PI / 2 + (i / 60) * Math.PI; p.push([Math.cos(a) * (ER + 4), Math.sin(a) * (ER + 4)]); } for (let i = 60; i >= 0; i--) { const a = -Math.PI / 2 + (i / 60) * Math.PI; p.push([Math.cos(a) * ER * 0.35 + 150, Math.sin(a) * (ER + 4)]); } return p; }, paper: 'space1', edge: 'torn', res: 1.2, blur: 10, variants: 2 });
  PC.swirl = [0, 1, 2].map((i) => new Piece({ shape: () => stripPts(arcLine(0, 0, 70 + i * 16, -0.4, 1.0 + i * 0.2, 20), 13, 4), paper: 'cloud', edge: 'torn', res: 1.6, blur: 5, amp: 1.5 }));

  // ----- vault / loot -----
  PC.pedestal = new Piece({ shape: () => [[-110, 0], [110, 0], [110, 26], [92, 26], [92, 330], [118, 330], [118, 370], [-118, 370], [-118, 330], [-92, 330], [-92, 26], [-110, 26]], paper: 'cream', edge: 'cut', res: 1.3, blur: 12,
    details: (g) => { g.strokeStyle = 'rgba(40,30,20,0.18)'; g.lineWidth = 3; for (let x = -70; x <= 70; x += 35) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, 320); g.stroke(); } } });
  PC.plaque = new Piece({ shape: () => rectPts(-100, -22, 200, 44), paper: 'gold', edge: 'cut', res: 1.8, blur: 4,
    details: (g) => textIn(g, 'PHOBOS', 0, 11, '700 26px "IBM Plex Mono"', '#3a2a10', { align: 'center', ls: '6px' }) });
  PC.vaultBack = new Piece({ shape: () => rectPts(-700, -1100, 1400, 2200), paper: 'vault0', edge: 'none', res: 0.6, variants: 1, blur: 4, shade: 0,
    details: (g) => { for (let k = 0; k < 9; k++) inlay(g, rectPts(-700 + k * 160, -1100, 150, 2200), k % 2 ? 'vault1' : 'vault0', 900 + k, { torn: false, sa: 0.4, sb: 6, sx: 6, sy: 0 }); } });
  PC.rock = new Piece({ shape: () => [[-34, -6], [-22, -26], [4, -30], [28, -20], [36, 2], [26, 22], [-4, 28], [-28, 18]], paper: 'phoDk2', edge: 'cut', res: 4, blur: 4, amp: 0.8,
    details: (g) => {
      const facet = (pts, paper, sd) => { g.fillStyle = pat(g, paper, sd); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.strokeStyle = 'rgba(20,12,10,0.35)'; g.lineWidth = 0.8; g.stroke(); };
      facet([[-22, -26], [4, -30], [-2, -6], [-26, -4]], 'phoLt', 1); facet([[4, -30], [28, -20], [14, 0], [-2, -6]], 'pho', 2);
      facet([[-34, -6], [-26, -4], [-2, -6], [-10, 14], [-28, 18]], 'phoDk', 3); facet([[-2, -6], [14, 0], [8, 20], [-10, 14]], 'phoDk', 4);
      g.fillStyle = 'rgba(20,12,10,0.5)'; g.beginPath(); g.ellipse(-12, -14, 4.5, 3.5, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(18, -12, 3, 2.4, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(230,220,200,0.35)'; g.beginPath(); g.ellipse(-11, -15.5, 3, 1.2, 0, 0, TAU); g.fill();
    } });
  PC.cushion = new Piece({ shape: () => blobPts(0, 0, 120, 30, 4400, 0.12, 50), paper: 'red', edge: 'cut', res: 1.6, blur: 6, details: (g) => { g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(0, 14, 110, 12, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(-20, -12, 70, 8, 0, 0, TAU); g.fill(); } });
  PC.post = new Piece({ shape: () => [rectPts(-9, -150, 18, 150), ellipsePts(0, -158, 16, 16, 20), rectPts(-26, -8, 52, 12)], paper: 'gold', edge: 'cut', res: 1.6, blur: 6 });

  // ----- NEXT: dusk coast, Electron, satellites -----
  const band = (y, h, paper, seed) => new Piece({ shape: () => { const p = []; for (let i = 0; i <= 50; i++) p.push([-800 + i * 32, y + 18 * fbm(seed, i * 0.3)]); p.push([800, y + h], [-800, y + h]); return p; }, paper, edge: 'torn', res: 0.7, variants: 2, blur: 14, jitter: 0.4 });
  PC.dusk = [band(-900, 1900, 'dusk0', 1), band(-500, 1500, 'dusk1', 2), band(-160, 1200, 'dusk2', 3), band(80, 1000, 'dusk3', 4), band(230, 900, 'dusk4', 5)];
  const hill = (w, hgt, seed, paper) => new Piece({ shape: () => { const p = [[-w / 2, 600]]; for (let i = 0; i <= 50; i++) { const u = i / 50; p.push([-w / 2 + u * w, -hgt * (0.5 + 0.5 * fbm(seed, u * 3)) - hgt * 0.3 * Math.sin(Math.PI * u)]); } p.push([w / 2, 600]); return p; }, paper, edge: 'torn', res: 0.9, variants: 2, blur: 14 });
  PC.hills = [hill(1500, 160, 11, 'hill0'), hill(1400, 120, 12, 'hill1'), hill(1500, 90, 13, 'hill2')];
  PC.electron = new Piece({ shape: () => [[-17, -10], [-17, -400], [-20, -408], [-20, -470], [-12, -505], [0, -520], [12, -505], [20, -470], [20, -408], [17, -400], [17, -10]], paper: 'ink', edge: 'cut', res: 1.5, blur: 7,
    details: (g) => { g.fillStyle = pat(g, 'cream', 4); g.fillRect(-17, -300, 34, 6); g.fillRect(-20, -412, 40, 4); g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -395); g.lineTo(-8, -20); g.stroke(); } });
  PC.sat = [0, 1, 2].map((i) => new Piece({ shape: () => [rectPts(-16, -14, 32, 28), rectPts(-58, -8, 38, 16), rectPts(20, -8, 38, 16)], paper: i === 1 ? 'gold' : 'steel', edge: 'cut', res: 2, blur: 4,
    details: (g) => { g.fillStyle = pat(g, 'panel', 3 + i); g.fillRect(-58, -8, 38, 16); g.fillRect(20, -8, 38, 16); g.strokeStyle = 'rgba(160,190,230,0.4)'; g.lineWidth = 1.2; for (const x0 of [-58, 20]) for (let x = x0; x <= x0 + 38; x += 9.5) { g.beginPath(); g.moveTo(x, -8); g.lineTo(x, 8); g.stroke(); } } }));
  PC.nextSign = new Piece({ shape: () => rectPts(-150, -52, 300, 104), paper: 'ink', edge: 'torn', res: 1.6, blur: 10,
    details: (g) => { textIn(g, 'NEXT', 6, 30, '800 84px Archivo', AMBER, { align: 'center', stretch: 'semi-expanded', ls: '6px', alpha: 1 }); } });
  PC.dateTag = new Piece({ shape: () => [[-190, -46], [-160, -80], [190, -80], [190, 80], [-160, 80], [-190, 46]], paper: 'amber', edge: 'cut', res: 1.8, blur: 7,
    details: (g) => { g.fillStyle = 'rgba(20,10,10,0.75)'; g.beginPath(); g.arc(-162, 0, 8, 0, TAU); g.fill(); textIn(g, 'ROCKET LAB ELECTRON', 18, -42, '600 21px "IBM Plex Mono"', '#3a2a10', { align: 'center', alpha: 1, ls: '1px' }); textIn(g, '3x HAWKEYE 360', 18, -12, '600 21px "IBM Plex Mono"', '#3a2a10', { align: 'center', alpha: 1, ls: '1px' }); textIn(g, 'WED 21 OCT', 18, 52, '800 50px Archivo', '#1b1a20', { align: 'center', stretch: 'normal', alpha: 1 }); } });

  // ----- frame border (torn black mat) -----
  const strip = (pts, seed) => new Piece({ shape: () => pts, paper: 'ink', edge: 'torn', res: 0.8, variants: 2, blur: 22, amp: 4, freq: 0.05, seed, jitter: 0.6 });
  PC.border = [strip([[-200, -200], [1280, -200], [1280, 26], [-200, 20]], 61), strip([[-200, 1896], [1280, 1890], [1280, 2120], [-200, 2120]], 62), strip([[-200, -200], [22, -200], [26, 2120], [-200, 2120]], 63), strip([[1056, -200], [1280, -200], [1280, 2120], [1060, 2120]], 64)];
}
