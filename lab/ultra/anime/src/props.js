// props.js: stylized illustrations drawn in code (never photoreal): H3, MMX, IDEFIX, capsule, Electron,
// satellites, Earth with Australia, cel Mars, exhaust clouds, flames, Phobos ground.
'use strict';

// ---------- exhaust / smoke clouds ----------
// puffs: [{x, y, r}] in current units; light: direction of the flame light [dx, dy]; warm: 0..1 orange underlight
function cloudCluster(puffs, seed, { base = C.smoke, shade = C.smoke2, line = C.ink, lw = 6, warm = 0, warmC = C.fire2, lightDir = [0, 1], alpha = 1 } = {}) {
  if (!puffs.length) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const S = curScale();
  const circ = (p, i, k = 1) => { const pts = ellPts(p.x, p.y, p.r * k, p.r * k * 0.92, 12, i); shapePath(pts, seed + i * 7, { px: 2.2 }); };
  // union outline
  ctx.lineJoin = 'round';
  puffs.forEach((p, i) => { circ(p, i); ctx.strokeStyle = line; ctx.lineWidth = lw * 2 / S; ctx.stroke(); });
  puffs.forEach((p, i) => { circ(p, i); ctx.fillStyle = base; ctx.fill(); });
  // cel shadow (sky light from upper left -> shadow lower right) and a thin warm underlight crescent
  puffs.forEach((p, i) => {
    ctx.save(); circ(p, i); ctx.clip();
    ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(p.x - p.r * 0.32, p.y - p.r * 0.3, p.r * 0.92, 0, Math.PI * 2); ctx.rect(p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4); ctx.fill('evenodd');
    if (warm > 0) { ctx.globalAlpha = warm; ctx.fillStyle = warmC; ctx.beginPath(); ctx.arc(p.x - lightDir[0] * p.r * 0.38, p.y - lightDir[1] * p.r * 0.38, p.r * 0.9, 0, Math.PI * 2); ctx.rect(p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4); ctx.fill('evenodd'); }
    ctx.restore();
  });
  ctx.restore();
}
// expanding launch billows: returns puffs for time since ignition d (s); side spread along the ground
function launchPuffs(d, seed, { cx = 0, gy = 0, spread = 900, up = 260, n = 26, rMax = 170 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = hash(i, seed, 1) * 0.5;               // birth delay
    const k = clamp((d - b) / 1.6); if (k <= 0) continue;
    const side = i % 2 ? 1 : -1;
    const e = E.out(k);
    const reach = spread * (0.25 + 0.75 * hash(i, seed, 2));
    const x = cx + side * reach * e;
    const y = gy - up * hash(i, seed, 3) * e - 40 * Math.sin(k * 3);
    const r = rMax * (0.35 + 0.65 * hash(i, seed, 4)) * (0.3 + 0.7 * E.out(k * 1.4));
    out.push({ x, y, r });
  }
  // sort so back puffs (higher) draw first
  return out.sort((a, b) => a.y - b.y);
}
// flame plume pointing +y from (0,0), length len, width w; flicker on twos
function flame(len, w, seed, { core = C.fire3, mid = C.fire, outer = C.fire2, line = null } = {}) {
  const fk = (i) => 1 + (hash(i, seed, Math.floor(G.f / 2)) - 0.5) * 0.18;
  const plume = (k, ww) => {
    const pts = [[-ww * 0.5, 0], [-ww * 0.62 * fk(1), len * 0.18 * k], [-ww * 0.42 * fk(2), len * 0.55 * k], [0, len * k * fk(3)], [ww * 0.42 * fk(4), len * 0.55 * k], [ww * 0.62 * fk(5), len * 0.18 * k], [ww * 0.5, 0]];
    return pts;
  };
  shapePath(plume(1, w), seed, { px: 2 }); ctx.fillStyle = outer; ctx.fill(); if (line) { ctx.strokeStyle = line; ctx.lineWidth = 3 / curScale(); ctx.stroke(); }
  shapePath(plume(0.72, w * 0.72), seed + 1, { px: 2 }); ctx.fillStyle = mid; ctx.fill();
  shapePath(plume(0.42, w * 0.45), seed + 2, { px: 1.5 }); ctx.fillStyle = core; ctx.fill();
}

// ---------- H3 rocket (stylized). origin = base centre, units: 1 = core width; height ~ 11 ----------
function drawH3(x, y, s, { tilt = 0, flameK = 0, seed = 2000 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s); G.S = s;
  const lw = 4 / s;
  const white = '#f4f1ea', sh = '#b9c0cf', sh2 = '#8d96ab';
  // flames under the engines
  if (flameK > 0) {
    ctx.save(); ctx.translate(0, 0.2); flame(5.5 * flameK, 1.2, seed + 1); ctx.restore();
    for (const sx of [-0.78, 0.78]) { ctx.save(); ctx.translate(sx, 0.15); flame(6.5 * flameK, 0.55, seed + (sx > 0 ? 3 : 5)); ctx.restore(); }
  }
  // back boosters (darker)
  for (const sx of [-0.45, 0.45]) cel(() => shapePath([[sx - 0.22, 0], [sx - 0.22, -3.7], [sx, -4.3], [sx + 0.22, -3.7], [sx + 0.22, 0]], seed + 10 + (sx > 0 ? 1 : 0), { smooth: false }), { fill: sh, line: C.ink, lw });
  // core stage
  const core = () => shapePath([[-0.5, 0], [-0.5, -7.6], [0.5, -7.6], [0.5, 0]], seed + 20, { smooth: false });
  cel(core, { fill: white, shade: sh, shadeFn: () => ctx.rect(-0.5, -8, 0.32, 8.2), line: C.ink, lw });
  // amber-brown insulation band and interstage (stylized, no markings)
  ctx.fillStyle = '#d8894a'; shapePath([[-0.5, -2.4], [0.5, -2.4], [0.5, -5.6], [-0.5, -5.6]], seed + 21, { smooth: false }); ctx.fill();
  ctx.fillStyle = '#a9622f'; shapePath([[-0.5, -2.4], [-0.18, -2.4], [-0.18, -5.6], [-0.5, -5.6]], seed + 22, { smooth: false }); ctx.fill();
  core(); ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.stroke();
  inkLine([[-0.5, -2.4], [0.5, -2.4]], seed + 23, { lw });
  inkLine([[-0.5, -5.6], [0.5, -5.6]], seed + 24, { lw });
  ctx.fillStyle = '#3b3f4f'; ctx.fillRect(-0.5, -7.75, 1.0, 0.18);
  // long fairing (ogive)
  cel(() => shapePath([[-0.52, -7.6], [-0.52, -9.3], [-0.38, -10.4], [0, -11.0], [0.38, -10.4], [0.52, -9.3], [0.52, -7.6]], seed + 30), { fill: white, shade: sh, shadeFn: () => ctx.rect(-0.6, -11.2, 0.36, 3.7), hi: '#ffffff', hiFn: () => ctx.rect(0.14, -10.2, 0.1, 2.3), line: C.ink, lw });
  // front boosters
  for (const sx of [-0.78, 0.78]) {
    cel(() => shapePath([[sx - 0.24, 0.05], [sx - 0.24, -3.5], [sx - 0.14, -4.0], [sx, -4.2], [sx + 0.14, -4.0], [sx + 0.24, -3.5], [sx + 0.24, 0.05]], seed + 40 + (sx > 0 ? 1 : 0), { smooth: false }), { fill: white, shade: sh, shadeFn: () => ctx.rect(sx - 0.3, -4.4, 0.16, 4.6), line: C.ink, lw });
    ctx.fillStyle = '#2b2e3a'; ctx.beginPath(); ctx.moveTo(sx - 0.18, 0.05); ctx.lineTo(sx + 0.18, 0.05); ctx.lineTo(sx + 0.24, 0.32); ctx.lineTo(sx - 0.24, 0.32); ctx.fill();
  }
  // core nozzles
  for (const nx of [-0.2, 0.2]) { ctx.fillStyle = '#2b2e3a'; ctx.beginPath(); ctx.moveTo(nx - 0.12, 0); ctx.lineTo(nx + 0.12, 0); ctx.lineTo(nx + 0.18, 0.3); ctx.lineTo(nx - 0.18, 0.3); ctx.fill(); }
  ctx.restore();
}

// ---------- MMX (stylized, simplified; not an engineering drawing). origin body centre; 1 unit = body width ----------
function drawMMX(x, y, s, { rot = 0, legs = 0, arm = 0, armAng = 0, corer = 0, burn = 0, seed = 3000, wing = 1, sampler = 0, dig = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); G.S = s;
  const lw = 4 / s;
  if (burn > 0) { ctx.save(); ctx.translate(0, 0.62); flame(2.6 * burn, 0.42, seed + 1); ctx.restore(); }
  // landing legs
  if (legs > 0) {
    for (const sx of [-1, -0.35, 0.35, 1]) {
      const far = Math.abs(sx) < 0.5;
      const foot = [sx * 0.75 * (1 + 0.25 * legs), 0.55 + 0.55 * legs];
      inkLine([[sx * 0.4, 0.3], foot], seed + 10 + sx * 10, { color: far ? '#6b6f80' : C.ink, lw: (far ? 0.07 : 0.1) });
      inkLine([[sx * 0.4, 0.3], foot], seed + 10 + sx * 10, { color: far ? '#9aa0b4' : '#d7dbe6', lw: (far ? 0.035 : 0.05) });
      ctx.fillStyle = far ? '#6b6f80' : '#d7dbe6'; ctx.strokeStyle = C.ink; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.ellipse(foot[0], foot[1], 0.12, 0.04, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // P-sampler box on the front-right leg
      if (sx === 1 && sampler > 0) {
        cel(() => { ctx.beginPath(); ctx.roundRect(foot[0] - 0.2, foot[1] - 0.3, 0.2, 0.2, 0.03); }, { fill: C.amber, shade: C.amber2, shadeFn: () => ctx.rect(foot[0] - 0.2, foot[1] - 0.2, 0.2, 0.1), line: C.ink, lw });
      }
    }
  }
  // solar wings
  if (wing > 0) for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(sd, 1);
    inkLine([[0.5, -0.05], [0.72, -0.05]], seed + 20, { lw: 0.06 });
    const pw = 1.7 * wing;
    cel(() => shapePath([[0.72, -0.32], [0.72 + pw, -0.4], [0.72 + pw, 0.24], [0.72, 0.2]], seed + 21 + sd, { smooth: false }), { fill: '#1f2f78', shade: '#16225a', shadeFn: () => ctx.rect(0.6, 0.0, 3, 0.4), hi: '#3d57b8', hiFn: () => ctx.rect(0.72 + pw * 0.15, -0.36, pw * 0.08, 0.6), line: C.ink, lw });
    ctx.strokeStyle = '#5d74d6'; ctx.lineWidth = 0.015;
    for (let i = 1; i < 6; i++) { const xx = 0.72 + pw * i / 6; ctx.beginPath(); ctx.moveTo(xx, -0.32 - 0.08 * i / 6); ctx.lineTo(xx, 0.2 + 0.04 * i / 6); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0.72, -0.06); ctx.lineTo(0.72 + pw, -0.08); ctx.stroke();
    ctx.restore();
  }
  // body: gold-foil box in 3/4
  const front = () => shapePath([[-0.5, -0.4], [0.5, -0.4], [0.5, 0.38], [-0.5, 0.38]], seed + 30, { smooth: false });
  const top = () => shapePath([[-0.5, -0.4], [-0.3, -0.62], [0.68, -0.62], [0.5, -0.4]], seed + 31, { smooth: false });
  const side = () => shapePath([[0.5, -0.4], [0.68, -0.62], [0.68, 0.16], [0.5, 0.38]], seed + 32, { smooth: false });
  cel(side, { fill: C.amber2, line: C.ink, lw });
  cel(top, { fill: C.amber3, line: C.ink, lw });
  cel(front, { fill: C.amber, shade: C.amber2, shadeFn: () => ctx.rect(-0.5, 0.1, 1, 0.3), line: C.ink, lw });
  // foil crinkles
  inkLine([[-0.35, -0.3], [-0.2, -0.12], [-0.3, 0.05]], seed + 33, { color: C.amber2, lw: 0.025 });
  inkLine([[0.1, -0.25], [0.25, -0.05], [0.15, 0.2]], seed + 34, { color: C.amber3, lw: 0.025 });
  // dish antenna on top
  ctx.save(); ctx.translate(0.05, -0.72); ctx.rotate(-0.35);
  cel(() => { ctx.beginPath(); ctx.ellipse(0, 0, 0.36, 0.13, 0, 0, Math.PI * 2); }, { fill: '#eef0f4', shade: '#b9c0cf', shadeFn: () => ctx.rect(-0.4, 0, 0.8, 0.2), line: C.ink, lw });
  inkLine([[0, 0], [0, -0.16]], seed + 35, { lw: 0.03 });
  ctx.restore();
  // engine bell
  ctx.fillStyle = '#3b3f4f'; ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-0.12, 0.38); ctx.lineTo(0.12, 0.38); ctx.lineTo(0.2, 0.62); ctx.lineTo(-0.2, 0.62); ctx.closePath(); ctx.fill(); ctx.stroke();
  // coring arm (from the left side): stowed -> deployed, corer drives down to the ground at the feet
  if (arm > 0) {
    const sh = [-0.5, 0.12];
    const el = [lerp(-0.62, -1.08, arm), lerp(-0.1, 0.36, arm)];
    const wr = [lerp(-0.46, -1.0, arm), lerp(0.18, 0.8 + dig * 0.06, arm)];
    inkLine([sh, el, wr], seed + 40, { lw: 0.2, smooth: false });
    inkLine([sh, el, wr], seed + 40, { color: '#d7dbe6', lw: 0.12, smooth: false });
    inkLine([[sh[0] + 0.02, sh[1] - 0.02], [el[0] + 0.02, el[1] - 0.03]], seed + 41, { color: '#ffffff', lw: 0.03, smooth: false });
    for (const j of [sh, el]) { ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(j[0], j[1], 0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // corer cylinder pointing down
    ctx.save(); ctx.translate(wr[0], wr[1]);
    cel(() => { ctx.beginPath(); ctx.rect(-0.08, 0, 0.16, 0.32); }, { fill: '#c9ced9', shade: '#8d96ab', shadeFn: () => ctx.rect(-0.08, 0, 0.06, 0.32), line: C.ink, lw });
    ctx.fillStyle = C.amber; ctx.fillRect(-0.08, 0.02, 0.16, 0.05);
    if (corer > 0) { // drill spin ticks
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02;
      for (let i = 0; i < 3; i++) { const yy = 0.1 + ((G.f * 0.05 + i * 0.07) % 0.2); ctx.beginPath(); ctx.moveTo(-0.08, yy); ctx.lineTo(0.08, yy - 0.04); ctx.stroke(); }
    }
    ctx.restore();
  }
  ctx.restore();
}

// ---------- IDEFIX rover (a machine: box, wheels, panel, camera mast; no face). origin = bottom centre, 1 unit = body width ----------
function drawRover(x, y, s, { rot = 0, mast = 1, seed = 4000, wheelSpin = 0, scan = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); G.S = s;
  const lw = 4 / s;
  // wheels
  for (const wx of [-0.42, 0.42]) {
    ctx.save(); ctx.translate(wx, -0.14);
    cel(() => { ctx.beginPath(); ctx.arc(0, 0, 0.15, 0, Math.PI * 2); }, { fill: '#2b2e3a', line: C.ink, lw });
    ctx.strokeStyle = '#7d8296'; ctx.lineWidth = 0.03; ctx.rotate(wheelSpin);
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-0.11, 0); ctx.lineTo(0.11, 0); ctx.stroke(); }
    ctx.restore();
  }
  // body
  cel(() => shapePath([[-0.5, -0.2], [-0.5, -0.62], [0.5, -0.62], [0.5, -0.2]], seed, { smooth: false }), { fill: '#e3e6ee', shade: '#a7aec0', shadeFn: () => ctx.rect(-0.5, -0.4, 1, 0.3), line: C.ink, lw });
  // solar panel lid
  cel(() => shapePath([[-0.56, -0.62], [-0.44, -0.74], [0.6, -0.74], [0.52, -0.62]], seed + 1, { smooth: false }), { fill: '#1f2f78', hi: '#3d57b8', hiFn: () => ctx.rect(0, -0.75, 0.08, 0.2), line: C.ink, lw });
  // camera mast
  if (mast > 0) {
    const mh = 0.42 * mast;
    inkLine([[0.3, -0.74], [0.3, -0.74 - mh]], seed + 2, { lw: 0.08 });
    inkLine([[0.3, -0.74], [0.3, -0.74 - mh]], seed + 2, { color: '#c9ced9', lw: 0.04 });
    const cw = 0.26 * (0.55 + 0.45 * Math.abs(Math.cos(scan * 1.2)));
    cel(() => { ctx.beginPath(); ctx.roundRect(0.31 - cw / 2, -0.86 - mh, cw, 0.14, 0.03); }, { fill: '#c9ced9', line: C.ink, lw });
    ctx.fillStyle = '#2b2e3a'; ctx.beginPath(); ctx.arc(0.31 + Math.sin(scan * 1.2) * cw * 0.35 + 0.06 * Math.cos(scan * 1.2), -0.79 - mh, 0.035, 0, Math.PI * 2); ctx.fill();
  }
  // panel lines
  inkLine([[-0.3, -0.58], [-0.3, -0.24]], seed + 3, { color: '#8d96ab', lw: 0.02 });
  ctx.restore();
}

// ---------- sample return capsule (blunt cone). origin centre, size 1 = diameter ----------
function drawCapsule(x, y, s, { rot = 0, plasma = 0, seed = 5000 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); G.S = s;
  const lw = 4 / s;
  if (plasma > 0) {
    ctx.save(); ctx.translate(0, -0.25); ctx.rotate(Math.PI); flame(3.2 * plasma, 1.15, seed + 1, { core: '#fff7da', mid: '#ffc861', outer: '#ff6a2a' }); ctx.restore();
  }
  cel(() => shapePath([[-0.5, 0.05], [-0.28, -0.32], [0.28, -0.32], [0.5, 0.05]], seed, { smooth: false }), { fill: '#e8e3d8', shade: '#a9a294', shadeFn: () => ctx.rect(-0.6, -0.4, 0.4, 0.5), line: C.ink, lw });
  cel(() => { ctx.beginPath(); ctx.ellipse(0, 0.08, 0.52, 0.16, 0, 0, Math.PI * 2); }, { fill: '#5a3a2a', shade: '#3a241a', shadeFn: () => ctx.rect(-0.6, 0.08, 1.2, 0.2), line: C.ink, lw });
  ctx.restore();
}

// ---------- Electron (stylized, dark, no markings). origin base centre; 1 unit = body width; height ~ 14 ----------
function drawElectron(x, y, s, { seed = 6000, glow = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); G.S = s;
  const lw = 4 / s;
  const body = '#2e3242', sh = '#181a22', hi = '#8a93b8';
  if (glow > 0) { radGlow(0, 0.5, 4, `rgba(255,170,90,${0.35 * glow})`); }
  const outline = [[-0.5, 0], [-0.5, -10.5], [-0.52, -11.3], [-0.38, -12.6], [0, -13.4], [0.38, -12.6], [0.52, -11.3], [0.5, -10.5], [0.5, 0]];
  cel(() => shapePath(outline, seed), { fill: body, keyline: C.paper, keyW: 7 / s, shade: sh, shadeFn: () => ctx.rect(-0.6, -14, 0.42, 14.2), hi, hiFn: () => ctx.rect(0.16, -12.8, 0.16, 12.6) });
  // cyan rim from the searchlights on the right edge
  ctx.save(); shapePath(outline, seed); ctx.clip(); ctx.fillStyle = C.cyan; ctx.globalAlpha = 0.85; ctx.fillRect(0.38, -14, 0.2, 14.2); ctx.restore();
  for (const yy of [-3.2, -8.2, -11.3]) inkLine([[-0.5, yy], [0.5, yy]], seed + yy, { color: '#5a6080', lw: 0.08 });
  ctx.fillStyle = '#3b3f4f'; ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-0.38, 0); ctx.lineTo(0.38, 0); ctx.lineTo(0.5, 0.35); ctx.lineTo(-0.5, 0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// generic small satellite (box + two panels)
function drawSat(x, y, s, { rot = 0, seed = 7000 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); G.S = s;
  const lw = 3.5 / s;
  for (const sd of [-1, 1]) cel(() => shapePath([[sd * 0.32, -0.22], [sd * 1.15, -0.22], [sd * 1.15, 0.22], [sd * 0.32, 0.22]], seed + sd, { smooth: false }), { fill: '#1f2f78', hi: '#3d57b8', hiFn: () => ctx.rect(sd * 0.6, -0.25, 0.1, 0.5), line: C.ink, lw });
  cel(() => shapePath([[-0.32, -0.32], [0.32, -0.32], [0.32, 0.32], [-0.32, 0.32]], seed + 5, { smooth: false }), { fill: '#e3e6ee', shade: '#a7aec0', shadeFn: () => ctx.rect(-0.32, 0.05, 0.64, 0.3), line: C.ink, lw });
  ctx.restore();
}

// ---------- cel Mars (drawn) ----------
function drawMarsCel(x, y, r, { seed = 8000, rot = 0, light = [0.6, -0.4] } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r); G.S = r;
  const disk = () => { ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); };
  cel(disk, { fill: C.mars, line: C.ink, lw: 5 / r });
  ctx.save(); disk(); ctx.clip();
  ctx.rotate(rot);
  // dark regions
  ctx.fillStyle = '#9a3a20';
  [[[-0.5, -0.1], [-0.1, -0.25], [0.15, 0.05], [-0.05, 0.3], [-0.45, 0.25]], [[0.3, 0.3], [0.7, 0.2], [0.8, 0.5], [0.45, 0.6]], [[-0.8, -0.5], [-0.55, -0.62], [-0.4, -0.4], [-0.7, -0.3]]].forEach((pts, i) => { shapePath(pts, seed + i); ctx.fill(); });
  ctx.rotate(-rot);
  // canyon line
  inkLine([[-0.6, 0.12], [-0.2, 0.08], [0.2, 0.14]], seed + 9, { color: '#7a2a16', lw: 0.03 });
  // polar cap
  ctx.fillStyle = '#f7efe6'; shapePath(ellPts(0.05, -0.95, 0.35, 0.14, 10), seed + 10); ctx.fill();
  // terminator shadow
  ctx.fillStyle = C.mars2; ctx.beginPath(); ctx.arc(light[0] * 0.75, light[1] * 0.75, 1.28, 0, Math.PI * 2); ctx.rect(-2, -2, 4, 4); ctx.fill('evenodd');
  // highlight
  ctx.fillStyle = C.mars3; ctx.beginPath(); ctx.ellipse(light[0] * 0.55, light[1] * 0.55, 0.3, 0.16, Math.atan2(light[1], light[0]) + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ---------- Earth (drawn) centred on Australia, orthographic ----------
const AUS = [[142.5,-10.7],[143.5,-14],[145.3,-15],[146,-18.5],[149,-21],[150.8,-23.5],[153,-25.5],[153.6,-28.5],[153,-31],[151.5,-33.5],[150,-37.5],[148,-37.8],[146.4,-39],[144.5,-38.2],[141,-38.1],[139.7,-37.2],[138.5,-35.5],[137.5,-33.0],[136,-34.8],[135.2,-34.6],[134,-32.6],[131,-31.5],[126,-32.3],[123.5,-33.9],[119.8,-34.3],[117.9,-35.1],[115,-34.3],[115.6,-31.6],[114.9,-29.5],[113.5,-26.5],[113.8,-23.5],[114.1,-21.8],[116.7,-20.6],[119,-19.9],[121.5,-18.5],[122.3,-17],[123.6,-16.2],[125.5,-14.5],[127,-13.8],[129,-14.9],[130,-13],[132.6,-11.5],[135,-12.2],[136.7,-12],[136,-13.5],[135.5,-14.9],[137.8,-16.3],[139.5,-17.5],[141,-16.5],[141.6,-13],[141.9,-11]];
const TAS = [[144.7,-40.7],[148.3,-40.9],[148.3,-42.2],[147,-43.6],[145.3,-42.6]];
const NZN = [[172.7,-34.4],[174.6,-36.2],[176,-37.6],[178.5,-37.7],[177,-39.6],[175.2,-41.6],[174.6,-41.2],[173,-39.3]];
const NZS = [[172.6,-40.5],[174.3,-41.7],[173,-43.8],[171.2,-44.5],[169,-46.6],[166.5,-46],[168.2,-44.1],[171,-42.4]];
const NG = [[131,-1.5],[136,-2.2],[141,-2.6],[145.8,-4.8],[147.5,-6.5],[150,-10.5],[146,-8.8],[143.5,-9.1],[140,-8],[138,-8.3],[137.5,-5],[133,-4]];
function orthoPt(lon, lat, lon0, lat0) {
  const d = Math.PI / 180; const la = lat * d, lo = (lon - lon0) * d, la0 = lat0 * d;
  const x = Math.cos(la) * Math.sin(lo);
  const y = Math.cos(la0) * Math.sin(la) - Math.sin(la0) * Math.cos(la) * Math.cos(lo);
  const z = Math.sin(la0) * Math.sin(la) + Math.cos(la0) * Math.cos(la) * Math.cos(lo);
  return [x, -y, z];
}
function drawEarthCel(x, y, r, { lon0 = 134, lat0 = -25, seed = 8500, pin = 0, light = [-0.6, -0.5] } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r); G.S = r;
  const disk = () => { ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); };
  // atmosphere rim
  ctx.save(); ctx.globalAlpha = 0.9; ctx.strokeStyle = C.cyan; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(0, 0, 1.03, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  cel(disk, { fill: '#2f6fd6', line: C.ink, lw: 5 / r });
  ctx.save(); disk(); ctx.clip();
  const land = (poly, sd) => {
    const pts = poly.map(([lo, la]) => orthoPt(lo, la, lon0, lat0)).filter((p) => p[2] > 0).map((p) => [p[0], p[1]]);
    if (pts.length < 3) return;
    cel(() => shapePath(pts, sd, { smooth: false, px: 0.8 }), { fill: '#d9a35a', shade: '#a8733a', shadeFn: () => ctx.ellipse(0.25, 0.1, 0.25, 0.15, 0.3, 0, Math.PI * 2), line: C.ink, lw: 3 / r });
  };
  land(AUS, seed + 1); land(TAS, seed + 2); land(NZN, seed + 3); land(NZS, seed + 4); land(NG, seed + 5);
  // green edges of Australia (stylized)
  // clouds: cel swirls
  ctx.fillStyle = '#f4f6fb';
  [[[-0.9, -0.45], [-0.5, -0.6], [-0.2, -0.52], [-0.5, -0.42]], [[0.3, 0.55], [0.75, 0.42], [0.95, 0.55], [0.55, 0.7]], [[-0.7, 0.62], [-0.35, 0.72], [-0.6, 0.85]], [[0.55, -0.75], [0.85, -0.55], [0.6, -0.5]]].forEach((pts, i) => { shapePath(pts, seed + 20 + i); ctx.fill(); });
  ctx.fillStyle = 'rgba(160,210,255,0.35)'; ctx.beginPath(); ctx.ellipse(light[0] * 0.5, light[1] * 0.5, 0.45, 0.28, Math.atan2(light[1], light[0]) + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
  // night side
  ctx.fillStyle = 'rgba(10,16,48,0.72)'; ctx.beginPath(); ctx.arc(light[0] * 0.8, light[1] * 0.8, 1.35, 0, Math.PI * 2); ctx.rect(-2, -2, 4, 4); ctx.fill('evenodd');
  ctx.restore();
  ctx.restore();
}
// screen position of a lon/lat on a drawn Earth
function earthPt(x, y, r, lon, lat, lon0 = 134, lat0 = -25) { const p = orthoPt(lon, lat, lon0, lat0); return [x + p[0] * r, y + p[1] * r]; }

// ---------- Phobos ground (drawn): big curved horizon ----------
function drawPhoGround(cx, cy, R, { seed = 9000, light = 1, rim = C.amber } = {}) {
  // a huge disk whose top edge is the horizon
  const disk = () => shapePath(ellPts(cx, cy, R * 1.12, R * 0.9, 48), seed, { px: 2.5 });
  cel(disk, { fill: C.pho, keyline: C.ink, keyW: 6, shade: C.pho2, shadeFn: () => ctx.ellipse(cx - light * R * 0.9, cy + R * 0.5, R * 1.3, R * 1.1, 0, 0, Math.PI * 2) });
  ctx.save(); disk(); ctx.clip();
  ctx.save(); ctx.beginPath(); ctx.rect(light > 0 ? cx : cx - 3 * R, cy - 2 * R, 3 * R, 4 * R); ctx.clip(); disk(); ctx.strokeStyle = rim; ctx.lineWidth = 16; ctx.stroke(); ctx.restore();
  // craters in perspective (flattened ellipses), seeded
  const rnd = mulberry(seed);
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6, dd = 0.15 + rnd() * 0.85;
    const x = cx + Math.cos(a) * R * 1.12 * dd, y = cy - R * 0.9 + (1 - Math.cos((rnd() - 0.5) * 0.4)) * R + dd * R * 0.6 * rnd();
    const r = (8 + rnd() * 50) * (0.4 + (y - (cy - R * 0.9)) / (R * 0.6));
    if (y < cy - R * 0.88) continue;
    cel(() => shapePath(ellPts(x, y, r, r * 0.32, 10), seed + 30 + i, { px: 1.4 }), { fill: C.pho2, shade: C.pho4, shadeFn: () => ctx.ellipse(x - r * 0.2, y - r * 0.12, r * 0.9, r * 0.22, 0, 0, Math.PI * 2), line: C.pho4, lw: 2 });
    inkLine([[x - r * 0.8, y + r * 0.2], [x, y + r * 0.34], [x + r * 0.8, y + r * 0.2]], seed + 60 + i, { color: C.pho3, lw: Math.max(1.5, r * 0.06) });
  }
  // grooves
  for (let i = 0; i < 4; i++) inkLine([[cx - R * 0.9, cy - R * 0.72 + i * 40], [cx, cy - R * 0.66 + i * 46], [cx + R * 0.9, cy - R * 0.72 + i * 40]], seed + 90 + i, { color: C.pho2, lw: 3 });
  ctx.restore();
}
