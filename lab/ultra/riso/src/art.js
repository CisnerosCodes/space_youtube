// ============================================================================================
// ART: reusable riso drawings (all flat inks and screens, drawn in code)
// ============================================================================================

// halftone sky: a screened blue gradient, optional pink glow band
function skyGrad(y0, y1, d0 = 0.95, d1 = 0, col = 'b') {
  tone((c) => {
    const g = c.createLinearGradient(0, y0, 0, y1);
    const e = (d) => (col === 'b' ? enc(d, 0, 0) : col === 'p' ? enc(0, d, 0) : enc(0, 0, d));
    g.addColorStop(0, e(d0)); g.addColorStop(1, e(d1)); c.fillStyle = g; c.fillRect(0, Math.min(y0, y1) - 2, W, Math.abs(y1 - y0) + 4);
    if (d0 > 0.01 && y0 < y1) { c.fillStyle = e(d0); c.fillRect(0, 0, W, y0); }
    if (d1 > 0.01 && y1 > y0) { c.fillStyle = e(d1); c.fillRect(0, y1, W, H - y1 + 2); }
  }, C.B);
}
// stars knocked out of the ink (paper dots), twinkling on twos
function stars(seed, n, box, t, o = {}) {
  const r = mulberry32(seed), tt = twos(t);
  knock((c) => {
    for (let i = 0; i < n; i++) {
      const x = box[0] + r() * box[2], y = box[1] + r() * box[3], s = 1.5 + r() * (o.big || 3.2), ph = r() * 10;
      const tw = 0.75 + 0.25 * Math.sin(tt * (2 + ph * 0.3) + ph);
      if (s > 3.6 && o.cross !== false) { c.fillRect(x - s * 2.2 * tw, y - 1, s * 4.4 * tw, 2); c.fillRect(x - 1, y - s * 2.2 * tw, 2, s * 4.4 * tw); }
      circ(c, x, y, s * tw); c.fill();
    }
  });
}
// 70s space-age stripes (bottom band)
function stripes(y, t, o = {}) {
  const cols = o.cols || [C.Y, C.P, C.B], h = o.h || 34, gap = o.gap || 14;
  cols.forEach((col, i) => {
    const yy = y + i * (h + gap);
    solid(rect(-10, yy, W + 20, h), col);
  });
}
// dashed path through points (polyline) with crawling dashes
function dashed(pts, col, w, dash, gap, offset, o = {}) {
  solid((c) => { c.lineWidth = w; c.lineCap = o.cap || 'butt'; c.setLineDash([dash, gap]); c.lineDashOffset = offset; poly(c, pts, false); c.stroke(); }, col, o);
}
function arrowHead(x, y, ang, size, col, o = {}) {
  (o.tone ? tone : solid)((c) => { c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(size, 0); c.lineTo(-size * 0.7, -size * 0.75); c.lineTo(-size * 0.3, 0); c.lineTo(-size * 0.7, size * 0.75); c.closePath(); c.fill(); c.restore(); }, col, o);
}
// typewriter label on a paper chip. lines: array of strings
function label(lines, x, y, o = {}) {
  const font = o.font || F.mono(o.size || 26, o.weight || 700), lh = o.lh || (o.size || 26) * 1.3;
  const ws = lines.map((s) => measure(s, font, o.ls || 0)), w = Math.max(...ws);
  const ax = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  if (o.chip !== false) {
    knock(rect(ax - 14, y - lh * 0.8 - 6, w + 28, lh * lines.length + 12));
    if (o.box) solid((c) => { c.lineWidth = 3; c.strokeRect(ax - 14, y - lh * 0.8 - 6, w + 28, lh * lines.length + 12); }, o.boxCol || C.B);
  }
  lines.forEach((s, i) => text(s, ax, y + i * lh, o.col || C.B, { font, ls: o.ls || 0 }));
  return { x: ax - 14, y: y - lh * 0.8 - 6, w: w + 28, h: lh * lines.length + 12 };
}
// leader line with a dot
function leader(x0, y0, x1, y1, col = C.B) {
  solid((c) => { c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); circ(c, x1, y1, 7); c.fill(); }, col);
}
// typing reveal of a string (character count over time, on twos)
const typed = (s, lt, cps = 40) => s.slice(0, Math.max(0, Math.floor(twos(lt) * cps)));

// giant display type, optionally screened (tone density) with an offset second ink
function bigType(s, x, y, size, o = {}) {
  const font = o.font || F.anton(size);
  if (o.shadow) solid((c) => { setText(c, font, o.align || 'left', 'alphabetic', o.ls || 0); c.fillText(s, x + o.shadow[0], y + o.shadow[1]); }, o.shadowCol || C.B);
  if (o.knock) knock((c) => { setText(c, font, o.align || 'left', 'alphabetic', o.ls || 0); c.lineWidth = o.knock; c.lineJoin = 'round'; c.strokeText(s, x, y); c.fillText(s, x, y); });
  (o.tone != null ? tone : solid)((c) => { setText(c, font, o.align || 'left', 'alphabetic', o.ls || 0); c.fillText(s, x, y); }, o.tone != null ? (o.col === 'b' ? enc(o.tone, 0, 0) : o.col === 'y' ? enc(0, 0, o.tone) : enc(0, o.tone, 0)) : (o.col || C.P));
}

// sunburst rays (60s poster), screened
function sunburst(cx, cy, n, r0, r1, ang, col, o = {}) {
  tone((c) => {
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = ang + (i / n) * TAU, a1 = a0 + (TAU / n) * (o.duty || 0.5);
      c.moveTo(cx + r0 * Math.cos(a0), cy + r0 * Math.sin(a0)); c.lineTo(cx + r1 * Math.cos(a0), cy + r1 * Math.sin(a0));
      c.lineTo(cx + r1 * Math.cos(a1), cy + r1 * Math.sin(a1)); c.lineTo(cx + r0 * Math.cos(a1), cy + r0 * Math.sin(a1)); c.closePath();
    }
    c.fill();
  }, col, o);
}
// screened radial glow (halftone falls off), e.g. a sun or a burst
function radialTone(cx, cy, r, d0, d1, which = 'y', o = {}) {
  tone((c) => {
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    const e = (d) => (which === 'b' ? enc(d, 0, 0) : which === 'p' ? enc(0, d, 0) : which === 'py' ? enc(0, d, d) : enc(0, 0, d));
    g.addColorStop(0, e(d0)); g.addColorStop(1, e(d1)); c.fillStyle = g; circ(c, cx, cy, r); c.fill();
  }, C.Y, o);
}
// smoke / exhaust billow made of overlapping screened discs
function billow(seed, cx, cy, spread, n, rMin, rMax, t, cols, o = {}) {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * spread, rr = rMin + r() * (rMax - rMin), ph = r() * TAU, col = cols[i % cols.length];
    const grow = o.grow ? o.grow(i, r()) : 1;
    const x = cx + Math.cos(a) * d * (o.sx || 1) + Math.sin(t * 1.3 + ph) * 8, y = cy + Math.sin(a) * d * (o.sy || 0.5) + Math.cos(t * 1.1 + ph) * 6;
    tone((c) => { const g = c.createRadialGradient(x - rr * 0.3, y - rr * 0.35, rr * 0.1, x, y, rr * grow); g.addColorStop(0, enc(...col.map((v) => v * 0.15))); g.addColorStop(1, enc(...col)); c.fillStyle = g; circ(c, x, y, rr * grow); c.fill(); }, C.W, { knock: o.knock !== false });
  }
}

// flat riso cloud bank: two overlapping layers of scalloped shapes, each one flat screened ink
function cloudBank(seed, y, t, layers) {
  layers.forEach((L, li) => {
    const r = mulberry32(seed + li * 17), n = L.n || 9, drift = (L.drift || 0) * t, x0 = L.x0 ?? -150, span = L.span ?? (W + 300);
    const puffs = [];
    for (let i = 0; i < n; i++) { const rad = L.r0 + r() * (L.r1 - L.r0); puffs.push([((i / (n - 1)) * span + x0 + (r() - 0.5) * 80 * span / (W + 300) + drift), y + (L.dy || 0) + rad * 0.55 + (r() - 0.5) * 40, rad]); }
    const build = (c) => { c.beginPath(); puffs.forEach(([x, yy, rad]) => { c.moveTo(x + rad, yy); c.arc(x, yy, rad, 0, TAU); }); if (L.body !== false) c.rect(-20, y + (L.dy || 0) + L.r0 * 0.9, W + 40, H); };
    tone((c) => { build(c); c.fill(); }, L.col, { knock: true });
    if (L.shade) tone((c) => { c.save(); build(c); c.clip(); c.beginPath(); puffs.forEach(([x, yy, rad]) => { c.moveTo(x + rad, yy + rad * 0.35); c.arc(x + rad * 0.18, yy + rad * 0.35, rad * 0.95, 0, TAU); }); c.rect(-20, y + (L.dy || 0) + L.r0 * 1.6, W + 40, H); c.fill(); c.restore(); }, L.shade);
  });
}

// ---------------------------------------------------------------- the echo mark and wordmark
function echoMark(x, y, r, col = C.Y, o = {}) {
  solid(fillCirc(x, y, r), col, { knock: true, ...o });
  solid(ring(x + r * 60 / 22, y, r * 19 / 22, r * 6 / 22), col, { knock: true, ...o });
}

// ---------------------------------------------------------------- illustrations (stylized, flat; never photoreal)
// outline helper: knock the shape (paper), print ink fill, then a blue keyline
function inked(build, fill, o = {}) {
  const f = (c) => { build(c); c.fill(); };
  if (o.knock !== false) knock((c) => { build(c); c.fill(); if (o.line) { c.lineWidth = o.line + 4; c.stroke(); } });
  if (fill && fill !== C.W) (o.tone ? tone : solid)(f, fill);
  if (o.line) solid((c) => { build(c); c.lineWidth = o.line; c.lineJoin = 'round'; c.stroke(); }, o.lineCol || C.B);
}
const rr = (x, y, w, h, r) => (c) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const rp = (x, y, w, h) => (c) => { c.beginPath(); c.rect(x, y, w, h); };

// H3 launch vehicle (illustration): core stage, four boosters (two seen), long fairing
function rocketH3(x, y, s, t, o = {}) { // (x,y): base centre of the core
  xf(() => {
    tr(x, y); scl(s);
    // boosters (behind)
    for (const sx of [-1, 1]) {
      inked((c) => { c.beginPath(); c.moveTo(sx * 46, -20); c.lineTo(sx * 46, -250); c.quadraticCurveTo(sx * 70, -300, sx * 94, -250); c.lineTo(sx * 94, -20); c.closePath(); }, C.B, { line: 5 });
      solid(rect(sx > 0 ? 50 : -90, -40, 40, 20), C.Y);
    }
    // core
    inked((c) => { c.beginPath(); c.moveTo(-46, 0); c.lineTo(-46, -560); c.lineTo(-52, -580); c.lineTo(-52, -700); c.quadraticCurveTo(0, -830, 52, -700); c.lineTo(52, -580); c.lineTo(46, -560); c.lineTo(46, 0); c.closePath(); }, C.W, { line: 6 });
    // fairing band and nose, screened shading on the right side
    solid(rect(-52, -585, 104, 14), C.B);
    tone((c) => { c.fillRect(14, -560, 32, 560); }, enc(0.35, 0, 0));
    tone((c) => { c.beginPath(); c.moveTo(18, -700); c.lineTo(18, -585); c.lineTo(52, -585); c.lineTo(52, -700); c.quadraticCurveTo(40, -740, 18, -770); c.closePath(); c.fill(); }, enc(0, 0.55, 0));
    solid(rect(-46, -300, 92, 10), C.P);
    // engines
    solid((c) => { c.beginPath(); c.moveTo(-30, 0); c.lineTo(-38, 26); c.lineTo(-6, 26); c.lineTo(-10, 0); c.moveTo(10, 0); c.lineTo(6, 26); c.lineTo(38, 26); c.lineTo(30, 0); c.fill(); }, C.B);
    if (o.flame) flame(0, 26, o.flame, t, 1);
  });
}
// rocket flame: sunflower core in a pink mantle, flickering on twos
function flame(x, y, len, t, k = 1) {
  const tt = twos(t), fl = 1 + 0.09 * Math.sin(tt * 37) + 0.06 * Math.sin(tt * 23 + 1);
  const L = len * fl, w = 64 * k;
  solid((c) => { c.beginPath(); c.moveTo(x - w * 0.62, y); c.quadraticCurveTo(x - w * 0.9, y + L * 0.45, x, y + L); c.quadraticCurveTo(x + w * 0.9, y + L * 0.45, x + w * 0.62, y); c.closePath(); c.fill(); }, C.P);
  solid((c) => { c.beginPath(); c.moveTo(x - w * 0.38, y); c.quadraticCurveTo(x - w * 0.5, y + L * 0.32, x, y + L * 0.7); c.quadraticCurveTo(x + w * 0.5, y + L * 0.32, x + w * 0.38, y); c.closePath(); c.fill(); }, C.Y);
  knock((c) => { c.beginPath(); c.moveTo(x - w * 0.16, y); c.quadraticCurveTo(x - w * 0.2, y + L * 0.18, x, y + L * 0.36); c.quadraticCurveTo(x + w * 0.2, y + L * 0.18, x + w * 0.16, y); c.closePath(); c.fill(); });
}

// MMX spacecraft (illustration): box bus, two solar wings, dish, optional legs and engine burn
function mmx(x, y, s, t, o = {}) {
  xf(() => {
    tr(x, y); rot(o.rot || 0); scl(s);
    const wing = o.wing ?? 1;
    // wings
    for (const sx of [-1, 1]) {
      solid((c) => { c.lineWidth = 7; c.beginPath(); c.moveTo(sx * 60, 0); c.lineTo(sx * 92, 0); c.stroke(); }, C.B);
      const x0 = sx > 0 ? 90 : -90 - 250 * wing;
      inked((c) => { c.beginPath(); c.rect(x0, -30, 250 * wing, 60); }, C.B, { line: 0 });
      knock((c) => { c.lineWidth = 4; for (let k = 1; k < 3; k++) { c.beginPath(); c.moveTo(x0 + (250 * wing * k) / 3, -30); c.lineTo(x0 + (250 * wing * k) / 3, 30); c.stroke(); } c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + 250 * wing, 0); c.stroke(); });
    }
    // legs
    if (o.legs) {
      const L = o.legs; // 0..1 deployed
      for (const sx of [-1, 1]) {
        solid((c) => { c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx * 46, 50); c.lineTo(sx * (60 + 60 * L), 50 + 90 * L); c.stroke(); c.beginPath(); c.moveTo(sx * (44 + 52 * L), 50 + 90 * L); c.lineTo(sx * (76 + 52 * L), 50 + 90 * L); c.lineWidth = 9; c.stroke(); }, C.B);
      }
    }
    // body
    inked(rr(-62, -54, 124, 108, 8), C.Y, { line: 6 });
    tone(rect(14, -54, 48, 108), enc(0, 0.5, 0));
    solid(rect(-62, -6, 124, 10), C.B);
    // dish
    inked((c) => { c.beginPath(); c.ellipse(-8, -74, 46, 18, -0.2, 0, TAU); }, C.W, { line: 5 });
    solid((c) => { c.lineWidth = 5; c.beginPath(); c.moveTo(-8, -74); c.lineTo(-8, -54); c.stroke(); }, C.B);
    if (o.burn) xf(() => { rot(o.burnRot || 0); flame(0, 56, o.burn, t, 0.8); });
  });
}

// IDEFIX rover (illustration): a small boxy machine, solar panel lid, four wheels, camera mast. A machine, not a character.
function rover(x, y, s, t, o = {}) { // (x,y): ground contact centre
  xf(() => {
    tr(x, y); rot(o.rot || 0); scl(s);
    // wheels (two seen)
    for (const wx of [-52, 52]) {
      inked((c) => { circ(c, wx, -22, 22); }, C.B, { line: 0 });
      solid((c) => { c.lineWidth = 4; c.beginPath(); c.moveTo(wx, -22); c.lineTo(wx + 18 * Math.cos(o.spin || 0), -22 + 18 * Math.sin(o.spin || 0)); c.stroke(); }, C.Y);
      solid((c) => { c.lineWidth = 8; c.beginPath(); c.moveTo(wx, -22); c.lineTo(wx * 0.6, -54); c.stroke(); }, C.B);
    }
    // body
    inked(rr(-74, -96, 148, 54, 6), C.B, { line: 0 });
    knock(rect(-60, -86, 50, 8));
    // solar lid
    inked((c) => { c.beginPath(); c.rect(-82, -112, 164, 16); }, C.P, { line: 4 });
    // mast
    solid((c) => { c.lineWidth = 7; c.beginPath(); c.moveTo(48, -112); c.lineTo(48, -150); c.stroke(); }, C.B);
    inked(rr(30, -168, 40, 22, 4), C.Y, { line: 4 });
    solid(fillCirc(58, -157, 5), C.B);
  });
}

// kitchen-style spring scale with a dial (illustration)
function scaleDial(x, y, s, needle, o = {}) {
  xf(() => {
    tr(x, y); scl(s);
    // platform
    inked(rr(-230, -20, 460, 30, 8), C.B, { line: 0 });
    solid(rect(-30, 10, 60, 40), C.B);
    // body
    inked(rr(-200, 50, 400, 300, 40), C.Y, { line: 6 });
    tone(rect(80, 50, 120, 300), enc(0, 0.45, 0));
    // dial
    inked((c) => circ(c, 0, 200, 128), C.W, { line: 6 });
    solid((c) => {
      c.lineWidth = 4;
      for (let k = 0; k <= 20; k++) { const a = Math.PI * (0.75 + 1.5 * k / 20), r0 = k % 5 === 0 ? 92 : 104; c.beginPath(); c.moveTo(Math.cos(a) * r0, 200 + Math.sin(a) * r0); c.lineTo(Math.cos(a) * 118, 200 + Math.sin(a) * 118); c.stroke(); }
    }, C.B);
    if (o.mark != null) { // the one printed value: 15 g
      const a = Math.PI * (0.75 + 1.5 * o.mark);
      solid((c) => { c.lineWidth = 8; c.beginPath(); c.moveTo(Math.cos(a) * 86, 200 + Math.sin(a) * 86); c.lineTo(Math.cos(a) * 120, 200 + Math.sin(a) * 120); c.stroke(); }, C.P);
      if (o.markLabel) text(o.markLabel, Math.cos(a) * 58, 200 + Math.sin(a) * 58 + 10, C.P, { font: F.mono(28, 700), align: 'center' });
    }
    const a = Math.PI * (0.75 + 1.5 * needle);
    solid((c) => { c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(-Math.cos(a) * 20, 200 - Math.sin(a) * 20); c.lineTo(Math.cos(a) * 108, 200 + Math.sin(a) * 108); c.stroke(); }, C.P);
    solid(fillCirc(0, 200, 14), C.B);
    // feet
    solid(rect(-170, 350, 60, 16), C.B); solid(rect(110, 350, 60, 16), C.B);
  });
}

// sample return capsule (illustration): heat shield down
function capsule(x, y, s, ang, o = {}) {
  xf(() => {
    tr(x, y); rot(ang); scl(s);
    inked((c) => { c.beginPath(); c.moveTo(-34, -30); c.lineTo(34, -30); c.lineTo(58, 18); c.quadraticCurveTo(0, 44, -58, 18); c.closePath(); }, C.W, { line: 5 });
    solid((c) => { c.beginPath(); c.moveTo(-60, 14); c.quadraticCurveTo(0, 40, 60, 14); c.quadraticCurveTo(0, 62, -60, 14); c.fill(); }, C.P);
    tone(rect(8, -30, 30, 44), enc(0.4, 0, 0));
    solid(rect(-34, -36, 68, 8), C.B);
  });
}

// postmark (circular date stamp) with cancellation waves
function postmark(x, y, r, top, mid, bottom, ang, col = C.P, o = {}) {
  xf(() => {
    tr(x, y); rot(ang);
    solid((c) => { c.lineWidth = 9; circ(c, 0, 0, r); c.stroke(); c.lineWidth = 4; circ(c, 0, 0, r - 18); c.stroke(); }, col);
    // text on the arc
    const arcText = (s, rad, a0, dir) => solid((c) => {
      setText(c, F.mono(Math.round(r * 0.15), 700), 'center', 'middle', 4);
      const ws = [...s].map((ch) => c.measureText(ch).width + 4), tot = ws.reduce((a, b) => a + b, 0);
      let a = a0 - (dir * tot / 2) / rad;
      [...s].forEach((ch, i) => { const aa = a + dir * (ws[i] / 2) / rad; c.save(); c.translate(Math.cos(aa) * rad, Math.sin(aa) * rad); c.rotate(aa + dir * Math.PI / 2); c.fillText(ch, 0, 0); c.restore(); a += dir * ws[i] / rad; });
    }, col);
    arcText(top, r - 44, -Math.PI / 2, 1);
    if (bottom) arcText(bottom, r - 40, Math.PI / 2, -1);
    text(mid, 0, r * 0.2, col, { font: F.anton(Math.round(r * 0.62)), align: 'center' });
    if (o.waves) solid((c) => { c.lineWidth = 8; for (let k = -2; k <= 2; k++) { c.beginPath(); for (let i = 0; i <= 40; i++) { const xx = r + 30 + i * 9, yy = k * 30 + Math.sin(i * 0.5) * 9; i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); } }, col);
  });
}

// prize rosette with ribbon tails
function rosette(x, y, r, label, ang, o = {}) {
  xf(() => {
    tr(x, y); rot(ang);
    for (const sx of [-1, 1]) inked((c) => { c.beginPath(); c.moveTo(sx * 18, 20); c.lineTo(sx * 70, r * 1.9); c.lineTo(sx * 40, r * 1.75); c.lineTo(sx * 20, r * 1.95); c.lineTo(sx * -10, 40); c.closePath(); }, C.B, { line: 0 });
    inked((c) => { c.beginPath(); for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU, rr2 = r * (i % 2 ? 0.9 : 1); i ? c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : c.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } c.closePath(); }, C.P, { line: 0 });
    inked((c) => circ(c, 0, 0, r * 0.68), C.Y, { line: 0 });
    solid(ring(0, 0, r * 0.6, 4), C.B);
    text(label, 0, r * 0.18, C.B, { font: F.anton(Math.round(r * 0.5)), align: 'center', ls: 2 });
  });
}

// Electron (illustration): a small dark rocket with a wider fairing
function electron(x, y, s, t, o = {}) {
  xf(() => {
    tr(x, y); scl(s);
    inked((c) => { c.beginPath(); c.moveTo(-36, 0); c.lineTo(-36, -330); c.lineTo(-44, -350); c.lineTo(-44, -430); c.quadraticCurveTo(-30, -520, 0, -548); c.quadraticCurveTo(30, -520, 44, -430); c.lineTo(44, -350); c.lineTo(36, -330); c.lineTo(36, 0); c.closePath(); }, C.B, { line: 0 });
    knock(rect(-36, -230, 72, 10)); knock(rect(-44, -356, 88, 8));
    tone(rect(12, -330, 24, 330), enc(0, 0.65, 0));
    tone((c) => { c.beginPath(); c.moveTo(16, -350); c.lineTo(44, -350); c.lineTo(44, -430); c.quadraticCurveTo(32, -500, 16, -530); c.closePath(); c.fill(); }, enc(0, 0.65, 0));
    solid((c) => { c.beginPath(); c.moveTo(-30, 0); c.lineTo(-40, 30); c.lineTo(40, 30); c.lineTo(30, 0); c.fill(); }, C.B);
    if (o.flame) flame(0, 30, o.flame, t, 0.7);
  });
}
// small radio-mapping satellite icon (illustration)
function satIcon(x, y, s, ang) {
  xf(() => {
    tr(x, y); rot(ang); scl(s);
    for (const sx of [-1, 1]) { inked((c) => { c.beginPath(); c.rect(sx > 0 ? 34 : -94, -14, 60, 28); }, C.B, { line: 0 }); knock((c) => { c.lineWidth = 3; c.beginPath(); c.moveTo(sx > 0 ? 64 : -64, -14); c.lineTo(sx > 0 ? 64 : -64, 14); c.stroke(); }); }
    inked(rr(-30, -30, 60, 60, 6), C.Y, { line: 5 });
    solid((c) => { c.lineWidth = 4; c.beginPath(); c.moveTo(0, 30); c.lineTo(0, 52); c.stroke(); circ(c, 0, 56, 7); c.fill(); }, C.B);
  });
}
// scissors (open/close)
function scissors(x, y, s, ang, open) {
  xf(() => {
    tr(x, y); rot(ang); scl(s);
    for (const sx of [-1, 1]) xf(() => {
      rot(sx * open * 0.35);
      inked((c) => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(40, sx * 10, 92, sx * 3); c.quadraticCurveTo(40, sx * -6, 0, sx * -6); c.closePath(); }, C.W, { line: 5 });
      inked((c) => { c.beginPath(); c.ellipse(-40, sx * 18, 22, 15, 0, 0, TAU); }, C.P, { line: 0 });
      knock((c) => { c.beginPath(); c.ellipse(-40, sx * 18, 11, 7, 0, 0, TAU); c.fill(); });
    });
    solid(fillCirc(0, 0, 6), C.B);
  });
}
