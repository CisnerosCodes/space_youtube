// illus.js: stylized line-art illustrations drawn in code (never photoreal).
// Style: amber 4 px outlines (constant on screen), ink fills, flat paper accents, hatch shading.
// Local units; each function draws centred at (0,0) after the caller translates/scales.

function strokeW(ctx, px) { const m = ctx.getTransform(); return px / Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)); }
function poly(ctx, pts, close = true) { ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (close) ctx.closePath(); }
function outline(ctx, fill = INK, w = 4, col = AMBER) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = strokeW(ctx, w); ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
function hatch(ctx, x0, y0, x1, y1, step, col = AMBER, a = 0.5) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.strokeStyle = rgba(AMBER_RGB, a); ctx.lineWidth = strokeW(ctx, 2);
  ctx.beginPath();
  for (let x = x0 - (y1 - y0); x < x1; x += step) { ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0); }
  ctx.stroke(); ctx.restore();
}
// stylized flame (exhaust), pointing down from (0,0); len in local units; flicker from t
function flame(ctx, t, w, len, seed = 1) {
  const n1 = noise1(t * 14, seed) * 0.12, n2 = noise1(t * 21, seed + 7) * 0.1;
  const L = len * (1 + n1);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.bezierCurveTo(-w * 0.75, L * 0.3, -w * (0.25 + n2), L * 0.7, 0, L);
  ctx.bezierCurveTo(w * (0.25 - n2), L * 0.7, w * 0.75, L * 0.3, w / 2, 0);
  ctx.closePath();
  ctx.fillStyle = AMBER; ctx.fill();
  ctx.beginPath();
  const L2 = L * 0.55;
  ctx.moveTo(-w * 0.22, 0);
  ctx.bezierCurveTo(-w * 0.3, L2 * 0.4, -w * 0.08, L2 * 0.8, 0, L2);
  ctx.bezierCurveTo(w * 0.08, L2 * 0.8, w * 0.3, L2 * 0.4, w * 0.22, 0);
  ctx.closePath();
  ctx.fillStyle = PAPER; ctx.fill();
  ctx.restore();
}

// H3 rocket, side view, nose up. About 90 wide x 700 tall (y from -380 to 320).
function drawH3(ctx, t, o = {}) {
  ctx.save();
  // boosters (two visible)
  for (const sx of [-1, 1]) {
    const bx = sx * 52;
    poly(ctx, [[bx - 15, 300], [bx - 15, 40], [bx, 0], [bx + 15, 40], [bx + 15, 300]]);
    outline(ctx);
  }
  // core stage
  poly(ctx, [[-36, 320], [-36, -230], [36, -230], [36, 320]]);
  outline(ctx);
  // fairing
  ctx.beginPath();
  ctx.moveTo(-36, -230); ctx.lineTo(-36, -300);
  ctx.bezierCurveTo(-36, -350, -14, -385, 0, -392);
  ctx.bezierCurveTo(14, -385, 36, -350, 36, -300);
  ctx.lineTo(36, -230); ctx.closePath();
  outline(ctx, INK);
  // flat paper band and amber stripe (not livery, just graphic)
  ctx.fillStyle = PAPER; ctx.fillRect(-36, -230, 72, 16);
  hatch(ctx, -34, 120, 34, 318, 14, AMBER, 0.45);
  // nozzles
  for (const nx of [-14, 14]) { poly(ctx, [[nx - 8, 320], [nx + 8, 320], [nx + 12, 342], [nx - 12, 342]]); outline(ctx); }
  if (o.fire > 0) {
    ctx.save(); ctx.translate(0, 342); ctx.scale(1, o.fire); flame(ctx, t, 70, 260, 3); ctx.restore();
    for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 52, 302); ctx.scale(1, o.fire); flame(ctx, t + sx, 26, 170, 5 + sx); ctx.restore(); }
  }
  ctx.restore();
}

// MMX spacecraft (simplified, cruise): body, two wings, dish. ~520 wide.
function drawMMX(ctx, t, o = {}) {
  ctx.save();
  const wing = o.wing ?? 1;
  // wings
  for (const sx of [-1, 1]) {
    const x0 = sx * 70, x1 = sx * (70 + 190 * wing);
    line(ctx, sx * 60, 0, x0, 0, strokeW(ctx, 4), AMBER);
    poly(ctx, [[x0, -34], [x1, -34], [x1, 34], [x0, 34]]); outline(ctx);
    // panel grid
    ctx.save(); ctx.strokeStyle = rgba(AMBER_RGB, 0.55); ctx.lineWidth = strokeW(ctx, 2); ctx.beginPath();
    for (let k = 1; k < 4; k++) { const xx = lerp(x0, x1, k / 4); ctx.moveTo(xx, -34); ctx.lineTo(xx, 34); }
    ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.stroke(); ctx.restore();
  }
  // body
  poly(ctx, [[-60, -58], [60, -58], [60, 58], [-60, 58]]); outline(ctx);
  hatch(ctx, 8, -56, 58, 56, 12, AMBER, 0.4);
  // dish
  ctx.beginPath(); ctx.ellipse(0, -92, 46, 16, 0, 0, TAU); outline(ctx);
  line(ctx, 0, -76, 0, -58, strokeW(ctx, 4), AMBER);
  // engine bell
  poly(ctx, [[-16, 58], [16, 58], [24, 82], [-24, 82]]); outline(ctx);
  if (o.fire > 0) { ctx.save(); ctx.translate(0, 84); ctx.scale(1, o.fire); flame(ctx, t, 44, 150, 11); ctx.restore(); }
  ctx.restore();
}

// MMX as a lander (for the grab): body, four legs, coring arm (left), gas sampler on right leg.
// o.arm 0..1 (arm reach), o.core 0..1 (corer depth), o.blast 0..1 (gas burst)
function drawLander(ctx, t, o = {}) {
  ctx.save();
  // legs
  for (const sx of [-1, 1]) {
    line(ctx, sx * 50, 40, sx * 130, 170, strokeW(ctx, 4), AMBER);
    line(ctx, sx * 30, 40, sx * 95, 170, strokeW(ctx, 3), rgba(AMBER_RGB, 0.6));
    poly(ctx, [[sx * 130 - 22, 170], [sx * 130 + 22, 170], [sx * 130 + 16, 178], [sx * 130 - 16, 178]]); outline(ctx);
  }
  // wings (folded up)
  for (const sx of [-1, 1]) {
    poly(ctx, [[sx * 64, -50], [sx * 230, -110], [sx * 236, -86], [sx * 70, -26]]); outline(ctx);
  }
  // body
  poly(ctx, [[-70, -60], [70, -60], [70, 50], [-70, 50]]); outline(ctx);
  hatch(ctx, 10, -58, 68, 48, 12, AMBER, 0.4);
  // return capsule on top
  ctx.beginPath(); ctx.moveTo(-30, -60); ctx.lineTo(-18, -92); ctx.lineTo(18, -92); ctx.lineTo(30, -60); ctx.closePath(); outline(ctx, PAPER);
  // coring arm (viewer-left): shoulder at (-70, 10)
  const reach = o.arm ?? 0;
  const sh = [-70, 10];
  const a1 = lerp(-2.4, -2.0, reach), l1 = 90;
  const el = [sh[0] + Math.cos(a1) * l1, sh[1] - Math.sin(a1) * l1 * -1];
  const elb = [sh[0] - 70, sh[1] + lerp(-30, 40, reach)];
  const tip = [elb[0] - 20, elb[1] + lerp(30, 118 + 26 * (o.core ?? 0), reach)];
  ctx.lineCap = 'round';
  line(ctx, sh[0], sh[1], elb[0], elb[1], strokeW(ctx, 10), AMBER);
  line(ctx, elb[0], elb[1], tip[0], tip[1] - 30, strokeW(ctx, 8), AMBER);
  circle(ctx, elb[0], elb[1], 9); outline(ctx);
  // corer cylinder
  ctx.save(); ctx.translate(tip[0], tip[1]);
  poly(ctx, [[-13, -40], [13, -40], [13, 16], [-13, 16]]); outline(ctx, PAPER);
  ctx.restore();
  // gas sampler on right foot
  const fx = 130, fy = 170;
  poly(ctx, [[fx - 34, fy - 34], [fx - 6, fy - 34], [fx - 6, fy - 6], [fx - 34, fy - 6]]); outline(ctx);
  const b = o.blast ?? 0;
  if (b > 0 && b < 1) {
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const p = clamp(b * 1.4 - k * 0.18);
      if (p <= 0 || p >= 1) continue;
      ctx.beginPath(); ctx.arc(fx - 20, fy + 8, 20 + p * 120, Math.PI * 0.05, Math.PI * 0.95);
      ctx.lineWidth = strokeW(ctx, 4 * (1 - p) + 1); ctx.strokeStyle = rgba(AMBER_RGB, 1 - p); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  return { corerTip: tip, sampler: [fx - 20, fy] };
}

// IDEFIX rover (machine, crate-sized): box, solar lid, 4 wheels, small camera bar. ~260 wide.
function drawRover(ctx, t, o = {}) {
  ctx.save();
  const spin = o.spin ?? 0;
  // wheels (side view: two visible, two behind offset)
  for (const [wx, back] of [[-82, 1], [82, 1], [-96, 0], [96, 0]]) {
    ctx.save(); ctx.translate(wx + (back ? 10 : 0), 52 - (back ? 6 : 0));
    ctx.globalAlpha *= back ? 0.55 : 1;
    circle(ctx, 0, 0, 30); outline(ctx);
    ctx.rotate(spin);
    ctx.strokeStyle = AMBER; ctx.lineWidth = strokeW(ctx, 3); ctx.beginPath();
    for (let k = 0; k < 3; k++) { const a = (k * TAU) / 3; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); }
    ctx.stroke(); ctx.restore();
    line(ctx, wx * 0.8, 20, wx + (back ? 10 : 0), 52 - (back ? 6 : 0), strokeW(ctx, 4), back ? rgba(AMBER_RGB, 0.55) : AMBER);
  }
  // body
  poly(ctx, [[-110, -40], [110, -40], [110, 24], [-110, 24]]); outline(ctx);
  hatch(ctx, 30, -38, 108, 22, 12, AMBER, 0.4);
  // solar lid
  poly(ctx, [[-122, -54], [122, -54], [122, -42], [-122, -42]]); outline(ctx, PAPER);
  // camera bar
  poly(ctx, [[-108, -30], [-80, -30], [-80, -6], [-108, -6]]); outline(ctx);
  circle(ctx, -94, -18, 6); ctx.fillStyle = AMBER; ctx.fill();
  ctx.restore();
}

// Sample return capsule: blunt cone, heat shield facing the direction of travel (+x local). ~120 wide.
function drawCapsule(ctx, t, o = {}) {
  ctx.save();
  const heat = o.heat ?? 0;
  if (heat > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(60, 0, 10, 60, 0, 150);
    g.addColorStop(0, rgba(AMBER_RGB, 0.65 * heat)); g.addColorStop(1, rgba(AMBER_RGB, 0));
    ctx.fillStyle = g; ctx.fillRect(-100, -160, 320, 320);
    ctx.restore();
  }
  // back shell (cone)
  poly(ctx, [[50, -58], [-40, -26], [-40, 26], [50, 58]]); outline(ctx);
  hatch(ctx, -38, 0, 48, 56, 11, AMBER, 0.45);
  // heat shield (arc)
  ctx.beginPath(); ctx.moveTo(50, -58); ctx.quadraticCurveTo(84, 0, 50, 58); ctx.closePath();
  outline(ctx, heat > 0.2 ? AMBER : PAPER);
  ctx.restore();
}

// Small satellite (abstract): cube + two panels. ~80 wide.
function drawSat(ctx, t, o = {}) {
  ctx.save();
  for (const sx of [-1, 1]) { poly(ctx, [[sx * 14, -9], [sx * 44, -9], [sx * 44, 9], [sx * 14, 9]]); outline(ctx, INK, 3); }
  poly(ctx, [[-13, -13], [13, -13], [13, 13], [-13, 13]]); outline(ctx, PAPER, 3);
  ctx.restore();
}
