// ---------- Night Shift as a paper puppet (black cat, echo-mark eyes, headset, oversized jacket) ----------
function buildCat() {
  const headPts = () => {
    const p = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * TAU;
      let r = 1;
      const dl = Math.abs(((a - 0.42 + Math.PI) % TAU) - Math.PI), dr = Math.abs(((a - (Math.PI - 0.42) + Math.PI) % TAU) - Math.PI);
      if (dl < 0.22) r += 0.14 * (1 - Math.abs(dl - 0.11) / 0.11) * (dl < 0.11 ? 1 : 0.6);
      if (dr < 0.22) r += 0.14 * (1 - Math.abs(dr - 0.11) / 0.11) * (dr < 0.11 ? 1 : 0.6);
      p.push([Math.cos(a) * 114 * r, -92 + Math.sin(a) * 86 * (Math.sin(a) > 0 ? 0.94 : 1) * r]);
    }
    return p;
  };
  PC.catHead = new Piece({ shape: headPts, paper: 'ink', edge: 'cut', res: 2, blur: 10, jitter: 0.6 });
  const ear = (s) => new Piece({ shape: () => [[s * 100, -120], [s * 116, -236], [s * 38, -170]], paper: 'ink', edge: 'cut', res: 2, blur: 6,
    details: (g) => { g.fillStyle = pat(g, 'kraftDk', 9); g.beginPath(); g.moveTo(s * 92, -138); g.lineTo(s * 106, -212); g.lineTo(s * 56, -170); g.fill(); } });
  PC.catEarL = ear(-1); PC.catEarR = ear(1);
  PC.catTuft = new Piece({ shape: () => [[-30, -168], [-22, -214], [-7, -182], [4, -226], [14, -184], [32, -208], [32, -168]], paper: 'ink', edge: 'cut', res: 2, blur: 5 });
  PC.catDisc = new Piece({ shape: () => ellipsePts(0, 0, 26, 26, 36), paper: 'amber', edge: 'cut', res: 2.4, blur: 3 });
  PC.catRing = new Piece({ shape: () => [ellipsePts(0, 0, 26, 26, 36), ellipsePts(0, 0, 18.5, 18.5, 36)], paper: 'amber', edge: 'cut', res: 2.4, blur: 3 });
  PC.catBrow = new Piece({ shape: () => rrectPts(-18, -4, 36, 8, 4), paper: 'cream', edge: 'cut', res: 2.4, blur: 2 });
  PC.catBand = new Piece({ shape: () => stripPts(arcLine(0, -92, 120, Math.PI * 1.08, Math.PI * 1.92, 30), 12, 12), paper: 'cream', edge: 'cut', res: 2, blur: 4 });
  PC.catCup = new Piece({ shape: () => rrectPts(-15, -30, 30, 60, 9), paper: 'cream', edge: 'cut', res: 2, blur: 4 });
  PC.catMic = new Piece({ shape: () => [stripPts(quadLine([-112, -66], [-96, -40], [-50, -42], 14), 6, 6), ellipsePts(-44, -43, 10, 7, 16)], paper: 'cream', edge: 'cut', res: 2, blur: 3 });
  PC.catNose = new Piece({ shape: () => [[-9, -70], [9, -70], [0, -60]], paper: 'cream', edge: 'cut', res: 2.4, blur: 2 });
  PC.catNeck = new Piece({ shape: () => rectPts(-33, -286, 66, 70), paper: 'ink', edge: 'cut', res: 2, blur: 4 });
  PC.catJacket = new Piece({ shape: () => [[-62, -248], [-106, -234], [-118, -150], [-126, -6], [126, -6], [118, -150], [106, -234], [62, -248], [0, -206]], paper: 'cream', edge: 'cut', res: 2, blur: 12,
    details: (g) => {
      g.strokeStyle = 'rgba(25,20,25,0.65)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -206); g.lineTo(0, -8); g.stroke();
      g.fillStyle = pat(g, 'amber', 5); g.beginPath(); g.arc(-62, -150, 8, 0, TAU); g.fill();
      g.strokeStyle = pat(g, 'amber', 6); g.lineWidth = 3; g.beginPath(); g.arc(-40, -150, 7, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(25,20,25,0.25)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(30, -90); g.lineTo(84, -90); g.stroke();
    } });
  PC.catCollar = new Piece({ shape: () => [[[-64, -252], [-6, -200], [-30, -188], [-76, -226]], [[64, -252], [6, -200], [30, -188], [76, -226]]], paper: 'cream', edge: 'cut', res: 2, blur: 5,
    details: (g) => { g.strokeStyle = 'rgba(25,20,25,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-64, -252); g.lineTo(-6, -200); g.moveTo(64, -252); g.lineTo(6, -200); g.stroke(); } });
  PC.catSleeveU = new Piece({ shape: () => stripPts([[0, -6], [0, 96]], 48, 44), paper: 'cream', edge: 'cut', res: 2, blur: 6,
    details: (g) => { g.strokeStyle = 'rgba(25,20,25,0.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-18, 60); g.lineTo(14, 66); g.stroke(); } });
  PC.catSleeveF = new Piece({ shape: () => [stripPts([[0, -4], [0, 80]], 44, 40), ellipsePts(0, 100, 23, 22, 24)], paper: 'cream', edge: 'cut', res: 2, blur: 6,
    details: (g) => { g.fillStyle = pat(g, 'ink', 7); g.beginPath(); g.ellipse(0, 100, 23, 22, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(25,20,25,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-21, 74); g.lineTo(21, 74); g.stroke(); } });
  PC.catTail = new Piece({ shape: () => stripPts([[0, 0], [60, -8], [104, -44], [104, -100], [128, -136]], 20, 12), paper: 'ink', edge: 'cut', res: 2, blur: 6 });
  PC.catLeg = new Piece({ shape: () => [stripPts([[0, 0], [0, 118]], 24, 22), ellipsePts(-6, 124, 22, 12, 20)], paper: 'ink', edge: 'cut', res: 2, blur: 6 });
  PC.stick = new Piece({ shape: () => rrectPts(-11, -60, 22, 1500, 10), paper: 'wood', edge: 'cut', res: 1.2, blur: 8,
    details: (g) => { g.strokeStyle = 'rgba(90,60,30,0.25)'; g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-6 + k * 4, -60); g.lineTo(-6 + k * 4 + Math.sin(k) * 2, 1430); g.stroke(); } } });
}

// mouth openness from the narration word timings (one open-close per syllable)
function talkOpen(t, w0 = 0, w1 = 999) {
  for (let i = w0; i <= Math.min(w1, CAP.words.length - 1); i++) {
    const w = CAP.words[i];
    if (t >= w.start && t < w.end) {
      const syl = Math.max(1, Math.round(w.text.replace(/[^a-z]/gi, '').length / 3.2));
      const u = (t - w.start) / (w.end - w.start);
      return Math.pow(Math.abs(Math.sin(u * syl * Math.PI)), 0.7);
    }
  }
  return 0;
}
function blinkAt(t, seed) {
  // seeded blink schedule: close 2 frames, open 2 (on twos)
  const period = 2.6 + h1(seed) * 1.2;
  const ph = ((t + h1(seed + 1) * period) % period);
  return ph < 0.1 ? 1 : 0;
}

// draw the cat. base: matrix at the jacket hem center. s: {head, body, armL:[sh,el], armR:[sh,el], mouth, look:[x,y], stick, legs, tail, ear}
function drawCat(ctx, base, s, o = {}) {
  const tq = q2(G.t);
  const breath = Math.sin(tq * 2.4) * 0.012;
  const M = mmul(mPlace(base, 0, 0, s.body || 0), mS(1, 1 + breath));
  const lift = o.lift ?? 14;
  if (s.stick) drawP(ctx, PC.stick, mPlace(M, 0, 0), { lift: lift + 4 });
  if (s.legs) { drawP(ctx, PC.catLeg, mPlace(M, -40, -12), { lift }); drawP(ctx, PC.catLeg, mPlace(M, 40, -12), { lift }); }
  const tailM = mPlace(M, 46, -40, -0.1 + (s.tail ?? 0) + Math.sin(tq * 3.1) * 0.12);
  drawP(ctx, PC.catTail, tailM, { lift: lift - 2 });
  drawP(ctx, PC.catNeck, M, { lift: lift - 4 });
  drawP(ctx, PC.catJacket, M, { lift });
  drawP(ctx, PC.catCollar, M, { lift: 3 });
  splitPin(ctx, tailM, 0, 0, 6);
  // head group
  const H = mPlace(M, 0, -262, (s.head || 0) + Math.sin(tq * 1.9) * 0.02 - (s.mouth || 0) * 0.025);
  const earW = s.ear ?? 0;
  drawP(ctx, PC.catEarL, mmul(mPlace(H, -70, -145, -earW * 0.3), mT(70, 145)), { lift: 4 });
  drawP(ctx, PC.catEarR, mmul(mPlace(H, 70, -145, earW * 0.15), mT(-70, 145)), { lift: 4 });
  drawP(ctx, PC.catHead, H, { lift: 8 });
  drawP(ctx, PC.catTuft, H, { lift: 3 });
  const look = s.look || [0, 0];
  const blink = s.blink ?? blinkAt(G.t, 7);
  const ey = -98 + look[1] * 5;
  const sy = blink ? 0.12 : 1;
  drawP(ctx, PC.catDisc, mPlace(H, -44 + look[0] * 6, ey, 0, 1, sy), { lift: 2 });
  if (!blink) { ctx.setTransform(...mPlace(H, -44 + look[0] * 10, ey)); ctx.fillStyle = MP(ctx, 'ink', 3); ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 10, 0, 0, TAU); ctx.fill(); }
  drawP(ctx, PC.catRing, mPlace(H, 44 + look[0] * 6, ey, 0, 1, sy), { lift: 2 });
  const bY = -140 - (s.browUp ?? 0) * 10;
  drawP(ctx, PC.catBrow, mPlace(H, -46, bY, 0.12 - (s.browTilt ?? 0)), { lift: 2 });
  drawP(ctx, PC.catBrow, mPlace(H, 46, bY, -0.12 + (s.browTilt ?? 0)), { lift: 2 });
  drawP(ctx, PC.catNose, H, { lift: 2 });
  // mouth: a "w" when closed, an open paper mouth when talking
  ctx.setTransform(...H);
  const mo = s.mouth || 0;
  if (mo > 0.12) {
    ctx.fillStyle = MP(ctx, 'mouthIn', 5); ctx.beginPath(); ctx.ellipse(0, -46 + mo * 4, 15, 4 + mo * 13, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(240,232,215,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(240,232,215,0.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -52); ctx.quadraticCurveTo(-7, -44, 0, -54); ctx.quadraticCurveTo(7, -44, 14, -52); ctx.stroke();
  }
  drawP(ctx, PC.catBand, H, { lift: 3 });
  drawP(ctx, PC.catCup, mPlace(H, -118, -88), { lift: 4 });
  drawP(ctx, PC.catCup, mPlace(H, 118, -88), { lift: 4 });
  drawP(ctx, PC.catMic, H, { lift: 3 });
  // arms (0 = hanging down; left arm + raises outward, right arm - raises outward)
  for (const side of [0, 1]) {
    const arm = side ? s.armR || [0.1, 0.05] : s.armL || [-0.1, -0.05];
    const sx = side ? 104 : -104;
    const MU = mPlace(M, sx, -222, arm[0]);
    const MF = mPlace(MU, 0, 92, arm[1]);
    drawP(ctx, PC.catSleeveU, MU, { lift: 10 });
    drawP(ctx, PC.catSleeveF, MF, { lift: 11 });
    splitPin(ctx, MU, 0, 0, 7); splitPin(ctx, MF, 0, 0, 6.5);
  }
  return M;
}

// ---------- helpers for props held in a paw ----------
// the body matrix drawCat uses (breath on twos), evaluated at time t
function catBodyM(base, s, t) { const breath = Math.sin(q2(t) * 2.4) * 0.012; return mmul(mPlace(base, 0, 0, s.body || 0), mS(1, 1 + breath)); }
// forearm matrix for side (0 = left arm at x -104, 1 = right arm at x +104); the paw is at local (0, 100)
function catForearmM(M, side, arm) { const MU = mPlace(M, side ? 104 : -104, -222, arm[0]); return mPlace(MU, 0, 92, arm[1]); }
// redraw a forearm on top of a held prop, so the paw grips it
function catRedrawForearm(ctx, MF) { drawP(ctx, PC.catSleeveF, MF, { lift: 11 }); splitPin(ctx, MF, 0, 0, 6.5); }
