// props3.js: generic drawn props for daily stories (all flat, stylized, clearly illustration; no logos,
// flags or markings): a crew capsule with its heat shield, parachutes, the Moon, the Earth's limb from
// low orbit, sky clouds, the sea with a splash, a manga burst badge for numbers.
'use strict';

// ---------- crew capsule (generic cone, heat shield dish at the base). origin = centre of the shield face;
// 1 unit = base width; the capsule points up (-y). plasma: reentry glow in front of the shield and streaks
// behind; window: 'cool' shows a cyan-lit window (the cabin stays cool); char: 0..1 darkens the shield
function drawCrewCapsule(x, y, s, { rot = 0, plasma = 0, window = '', seed = 5200, char = 0.3, chuteLines = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); G.S = s;
  regIllus(-0.6, -0.95, 1.2, 1.15);
  const lw = 4 / s;
  if (plasma > 0) {
    // the plasma envelope: wraps from the shield edges back past the nose into a long wake (flicker on twos)
    const L = 2.3 * plasma, fk = (i) => 1 + (hash(i, seed + 11, Math.floor(G.f / 2)) - 0.5) * 0.16;
    const env = (k) => [[-0.78 * k, 0.14], [-0.5 * k, 0.3 * k], [0, 0.36 * k], [0.5 * k, 0.3 * k], [0.78 * k, 0.14], [0.62 * k * fk(1), -0.55], [0.36 * k * fk(2), -1.2 * fk(3)], [0.12 * k, -L * fk(4)], [-0.1 * k, -L * 0.92 * fk(5)], [-0.38 * k * fk(6), -1.15 * fk(7)], [-0.64 * k * fk(8), -0.5]];
    ctx.save(); ctx.globalAlpha *= 0.9;
    shapePath(env(1.12), seed + 21, { px: 2 }); ctx.fillStyle = '#e2402f'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3 / s; ctx.stroke();
    shapePath(env(0.94).map(([a, b]) => [a, b * 0.86]), seed + 22, { px: 2 }); ctx.fillStyle = '#ff9a3d'; ctx.fill();
    shapePath(env(0.8).map(([a, b]) => [a, b < 0 ? b * 0.45 : b]), seed + 23, { px: 1.5 }); ctx.fillStyle = '#ffd77a'; ctx.fill();
    ctx.restore();
  }
  if (chuteLines > 0) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5 / s;
    for (const lx of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.moveTo(lx * 0.4, -0.78); ctx.lineTo(lx * 9 * chuteLines, -6 * chuteLines); ctx.stroke(); }
  }
  // body: truncated cone with panel lines
  const body = () => shapePath([[-0.5, -0.02], [-0.19, -0.74], [0.19, -0.74], [0.5, -0.02]], seed, { smooth: false });
  cel(body, { fill: '#d9dbe2', shade: '#9aa0b0', shadeFn: () => ctx.rect(-0.6, -0.8, 0.42, 0.9), hi: '#f6f6f8', hiFn: () => ctx.rect(0.12, -0.7, 0.07, 0.6), line: C.ink, lw });
  ctx.save(); body(); ctx.clip();
  ctx.strokeStyle = '#8a90a2'; ctx.lineWidth = 1.6 / s;
  for (let i = 1; i < 5; i++) { const yy = -0.02 - i * 0.15; ctx.beginPath(); ctx.moveTo(-0.6, yy); ctx.lineTo(0.6, yy); ctx.stroke(); }
  for (const xx of [-0.22, 0, 0.22]) { ctx.beginPath(); ctx.moveTo(xx * 1.9, 0); ctx.lineTo(xx * 0.7, -0.74); ctx.stroke(); }
  ctx.restore();
  // window
  if (window) {
    const cool = window === 'cool';
    ctx.save(); ctx.translate(0.08, -0.42); ctx.rotate(-0.08);
    if (cool) radGlow(0, 0, 0.32, 'rgba(127,214,255,0.55)');
    cel(() => { ctx.beginPath(); ctx.roundRect(-0.1, -0.075, 0.2, 0.15, 0.04); }, { fill: cool ? '#7fd6ff' : '#1b2152', hi: '#e8fbff', hiFn: () => ctx.rect(-0.08, -0.06, 0.05, 0.05), line: C.ink, lw });
    ctx.restore();
  }
  // docking ring on top
  cel(() => { ctx.beginPath(); ctx.roundRect(-0.15, -0.84, 0.3, 0.1, 0.03); }, { fill: '#b9c0cf', line: C.ink, lw });
  // bow shock: a hot glowing crescent in front of the shield (drawn after the body)
  if (plasma > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(plasma);
    radGlow(0, 0.18, 0.95, 'rgba(255,170,80,0.55)');
    const fk = 1 + (hash(Math.floor(G.f / 2), seed, 3) - 0.5) * 0.08;
    cel(() => { ctx.beginPath(); ctx.ellipse(0, 0.1, 0.7 * fk, 0.24 * fk, 0, 0, Math.PI); ctx.quadraticCurveTo(0, 0.02, 0.7 * fk, 0.1); ctx.closePath(); }, { fill: '#fff3c4', line: '#ff6a2a', lw: 3 / s });
    ctx.restore();
  }
  // heat shield: a shallow dish across the base
  const sh = () => { ctx.beginPath(); ctx.moveTo(-0.56, -0.04); ctx.quadraticCurveTo(0, 0.2, 0.56, -0.04); ctx.lineTo(0.5, -0.06); ctx.lineTo(-0.5, -0.06); ctx.closePath(); };
  const shieldC = plasma > 0 ? '#ff9a3d' : char > 0.5 ? '#3a2a22' : '#6b4a35';
  cel(sh, { fill: shieldC, shade: plasma > 0 ? '#e2402f' : '#2a1d17', shadeFn: () => ctx.rect(-0.6, 0.02, 1.2, 0.2), line: C.ink, lw });
  ctx.restore();
}
// three striped parachutes above (x, y) (the capsule's top), open 0..1
function drawChutes(x, y, s, open = 1, { seed = 5300, sway = 0 } = {}) {
  if (open <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); G.S = s;
  regIllus(-1.6, -3.2, 3.2, 3.2);
  const lw = 4 / s, o = E.back(clamp(open), 1.6);
  for (let i = -1; i <= 1; i++) {
    const cx = i * 1.05 * o + Math.sin(G.t * 1.3 + i) * 0.04 * sway, cy = -2.5 - (i === 0 ? 0.25 : 0) + Math.sin(G.t * 1.7 + i * 2) * 0.03 * sway;
    const r = 0.62 * o;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2 / s;
    for (const k of [-1, -0.33, 0.33, 1]) { ctx.beginPath(); ctx.moveTo(cx + k * r, cy); ctx.lineTo(0, 0); ctx.stroke(); }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * 0.12);
    const dome = () => { ctx.beginPath(); ctx.moveTo(-r, 0); ctx.bezierCurveTo(-r, -r * 0.95, r, -r * 0.95, r, 0); ctx.quadraticCurveTo(r * 0.5, r * 0.12, 0, 0.02); ctx.quadraticCurveTo(-r * 0.5, r * 0.12, -r, 0); ctx.closePath(); };
    cel(dome, { fill: C.paper, line: C.ink, lw });
    ctx.save(); dome(); ctx.clip(); ctx.fillStyle = C.red;
    for (let g = -3; g <= 3; g += 2) { ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(g * r * 0.3, 0.1); ctx.lineTo((g + 1) * r * 0.3, 0.1); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-r, -r, r * 0.6, r * 1.2);
    ctx.restore(); dome(); ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
// ---------- the Moon (drawn): grey disk, maria, craters, terminator
function drawMoonCel(x, y, r, { seed = 8800, light = [-0.6, -0.4] } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r); G.S = r;
  regIllus(-1, -1, 2, 2);
  const disk = () => { ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); };
  ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = C.paper; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.arc(0, 0, 1.04, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  cel(disk, { fill: '#cfcac0', line: C.ink, lw: 5 / r });
  ctx.save(); disk(); ctx.clip();
  ctx.fillStyle = '#9d988f';
  [[[-0.55, -0.35], [-0.15, -0.5], [0.1, -0.3], [-0.1, -0.05], [-0.5, -0.05]], [[0.15, -0.05], [0.5, -0.15], [0.62, 0.15], [0.3, 0.3], [0.1, 0.15]], [[-0.45, 0.25], [-0.15, 0.2], [-0.1, 0.45], [-0.4, 0.5]]].forEach((pts, i) => { shapePath(pts, seed + i); ctx.fill(); });
  const rnd = mulberry(seed);
  for (let i = 0; i < 14; i++) {
    const cx = (rnd() - 0.5) * 1.7, cy = (rnd() - 0.5) * 1.7, rr = 0.04 + rnd() * 0.09;
    if (cx * cx + cy * cy > 0.85) continue;
    cel(() => shapePath(ellPts(cx, cy, rr, rr * 0.85, 9), seed + 20 + i, { px: 0.8 }), { fill: '#b3ada3', shade: '#8a857c', shadeFn: () => ctx.ellipse(cx - rr * 0.3, cy - rr * 0.3, rr, rr * 0.7, 0, 0, Math.PI * 2), line: '#7d7872', lw: 0.012 });
  }
  ctx.fillStyle = 'rgba(14,18,48,0.62)'; ctx.beginPath(); ctx.arc(light[0] * 0.8, light[1] * 0.8, 1.32, 0, Math.PI * 2); ctx.rect(-2, -2, 4, 4); ctx.fill('evenodd');
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(light[0] * 0.5, light[1] * 0.5, 0.3, 0.15, Math.atan2(light[1], light[0]) + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}
// ---------- the Earth's limb from low orbit: a huge cel disk whose top edge is the horizon, with the
// atmosphere as a cyan band and cloud swirls. (cx, cy) is the disk centre, R its radius (px)
function drawLimb(cx, cy, R, { seed = 9100, glow = 1, hot = 0, spin = 0.0026 } = {}) {
  const rotA = G.f * spin;
  ctx.save(); G.S = 1;
  regIllus(cx - R, cy - R, 2 * R, R * 0.4);
  // atmosphere bands
  for (let i = 3; i >= 1; i--) { ctx.fillStyle = `rgba(127,214,255,${0.08 * glow * i})`; ctx.beginPath(); ctx.arc(cx, cy, R + i * 34, 0, Math.PI * 2); ctx.fill(); }
  if (hot > 0) { ctx.fillStyle = `rgba(255,120,60,${0.22 * hot})`; ctx.beginPath(); ctx.arc(cx, cy, R + 70, 0, Math.PI * 2); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2, true); ctx.fill(); }
  const disk = () => shapePath(ellPts(cx, cy, R, R, 72), seed, { px: 2 });
  cel(disk, { fill: '#2f6fd6', keyline: C.ink, keyW: 6, shade: '#1d4fae', shadeFn: () => ctx.arc(cx - R * 0.5, cy + R * 0.3, R * 1.05, 0, Math.PI * 2) });
  ctx.save(); disk(); ctx.clip();
  const rnd = mulberry(seed);
  ctx.fillStyle = '#d9a35a';
  const wrap = (u, w) => ((((u + w / 2) % w) + w) % w) - w / 2;
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + wrap((rnd() - 0.5) * 1.1 + rotA, 1.1), d = R * (0.86 + rnd() * 0.1); const x0 = cx + Math.cos(a) * d, y0 = cy + Math.sin(a) * d; shapePath(ellPts(x0, y0 + 30, 120 + rnd() * 160, 26 + rnd() * 20, 10, a + Math.PI / 2), seed + 10 + i); ctx.fill(); }
  ctx.fillStyle = '#f4f6fb';
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + wrap((rnd() - 0.5) * 1.3 + rotA * 1.4, 1.3), d = R * (0.9 + rnd() * 0.08); const x0 = cx + Math.cos(a) * d, y0 = cy + Math.sin(a) * d; shapePath(ellPts(x0, y0 + 20, 90 + rnd() * 140, 12 + rnd() * 12, 10, a + Math.PI / 2), seed + 30 + i); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = C.cyan; ctx.lineWidth = 10 * glow; ctx.beginPath(); ctx.arc(cx, cy, R + 4, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.restore();
}
// ---------- sky with cel cloud banks drifting (for parachute and launch scenes)
function drawSky(f, { seed = 9300, top = '#4f8fd6', bottom = '#cfe3f0', drift = 1 } = {}) {
  vGrad([[0, top], [1, bottom]]);
  for (let layer = 0; layer < 2; layer++) {
    const puffs = [];
    for (let i = 0; i < 7; i++) puffs.push({ x: ((hash(i, seed + layer, 1) * 1400 + f * (1.2 + layer) * drift) % 1500) - 210, y: 300 + layer * 760 + hash(i, seed + layer, 2) * 380, r: 70 + hash(i, seed + layer, 3) * 90 });
    cloudCluster(puffs, seed + 40 + layer * 7, { base: '#ffffff', shade: '#d6e4f2', line: 'rgba(11,11,12,0.55)', lw: 4, alpha: layer ? 0.95 : 0.8 });
  }
}
// ---------- sea from above the waves; splash: 0..1 time of a splash at (sx, sy)
function drawSea(f, y0, { seed = 9400, splash = 0, sx = 540, sy = 1200 } = {}) {
  ctx.fillStyle = '#123a7a'; ctx.fillRect(-200, y0, W + 400, H - y0 + 400);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-200, y0); ctx.lineTo(W + 200, y0); ctx.stroke();
  ctx.strokeStyle = 'rgba(127,214,255,0.45)'; ctx.lineWidth = 4;
  for (let i = 0; i < 16; i++) { const y = y0 + 30 + i * 40; const x = (hash(i, seed, 1) * 900 + f * (1.4 + i * 0.25)) % 1400 - 250; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 40, y - 10, x + 90 + i * 5, y); ctx.stroke(); }
  if (splash > 0 && splash < 1.2) {
    const puffs = [];
    for (let i = 0; i < 14; i++) { const a = Math.PI + (i / 13) * Math.PI; const rr = 50 + 260 * E.out(splash * 1.6); puffs.push({ x: sx + Math.cos(a) * rr * 1.2, y: sy + Math.sin(a) * rr * 0.55, r: (30 + hash(i, seed + 5, 1) * 40) * (1 - splash * 0.7) }); }
    cloudCluster(puffs, seed + 60, { base: '#f2fbff', shade: '#9cc4e6', lw: 4, alpha: 1 - inv(0.8, 1.2, splash) });
  }
}
// ---------- manga burst badge (number stamp): a spiky ink-and-amber star with the text in it
function drawBurst(x, y, r, text, k = 1, { fill = C.amber, ink = C.ink, size = null, sub = '', rot = -0.08 } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  const pts = [];
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; const rr = (i % 2 ? 0.74 : 1) * r * (0.92 + 0.16 * hash(i, 77, 1)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  shapePath(pts, 7700, { smooth: false }); ctx.fillStyle = ink; ctx.fill();
  shapePath(pts.map(([a, b]) => [a * 0.9, b * 0.9]), 7701, { smooth: false }); ctx.fillStyle = fill; ctx.fill();
  const px = size || r * 0.8;
  ctx.font = `400 ${px}px "Dela Gothic One"`; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const tw = ctx.measureText(text).width, sc = Math.min(1, (r * 1.3) / tw);
  ctx.save(); ctx.scale(sc, sc);
  ctx.strokeStyle = C.paper; ctx.lineWidth = px * 0.16; ctx.strokeText(text, -tw / 2, px * 0.34);
  ctx.fillStyle = ink; ctx.fillText(text, -tw / 2, px * 0.34);
  regText(-tw / 2, -px * 0.45, tw, px * 0.85, 'burst', text, Math.abs(k - 1) > 0.02);
  ctx.restore();
  if (sub) { ctx.font = '600 26px "Plex Mono"'; const sw = ctx.measureText(sub).width; ctx.fillStyle = ink; ctx.fillRect(-sw / 2 - 12, r * 0.62, sw + 24, 38); ctx.fillStyle = C.paper; ctx.fillText(sub, -sw / 2, r * 0.62 + 28); regText(-sw / 2 - 12, r * 0.62, sw + 24, 38, 'burst', sub, Math.abs(k - 1) > 0.02); }
  ctx.restore();
}
