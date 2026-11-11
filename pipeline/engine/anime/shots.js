// shots.js: the anime shot library. Each factory takes (spec, beat) and returns
//   { draw(f), subjects(f) -> [[x, y, w, h]], anchors(f) -> { name: [x, y] | rect }, hits() -> [[frame, amp]], cues() }
// Every draw paints the whole frame (backgrounds included) and is a pure function of the frame number.
'use strict';
const SHOTS = {};
const COLORS = { amber: C.amber, red: C.red, cyan: C.cyan, paper: C.paper, ink: C.ink, muted: '#8c8a85', blue: C.blue };
const col = (c, d = C.amber) => (c ? COLORS[c] || c : d);

// ---------------------------------------------------------------- backgrounds (speed lines, focus lines,
// rays, lightning, plasma, space, sky): bg(kind, f, { cx, cy, angle, color, seed })
function paintBg(kind, f, o = {}) {
  const cx = o.cx ?? 540, cy = o.cy ?? 760, seed = o.seed ?? 11;
  switch (kind) {
    case 'focus': vGrad([[0, '#0b0f2a'], [1, '#22184a']]); focusLines(cx, cy, o.r ?? 380, { n: 120, color: col(o.color, C.paper), alpha: 0.5, seed, wMax: 18, rate: 2 }); break;
    case 'red': vGrad([[0, '#3a0d10'], [0.6, '#7a1d17'], [1, '#160608']]); focusLines(cx, cy, o.r ?? 360, { n: 120, color: C.amber, alpha: 0.75, seed, wMax: 24, rate: 3 }); focusLines(cx, cy, (o.r ?? 360) * 1.45, { n: 60, color: C.ink, alpha: 0.6, seed: seed + 1, wMax: 14, rate: 3 }); break;
    case 'cyan': {
      vGrad([[0, '#10225c'], [1, '#050a20']]);
      ctx.save(); ctx.fillStyle = 'rgba(127,214,255,0.22)';
      for (let i = 0; i < 9; i++) { const x = hash(i, seed + 91, Math.floor(f / 6)) * W; ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x + 30, 700); ctx.lineTo(x - 20, 720); ctx.lineTo(x + 10, H + 50); ctx.lineTo(x - 6, H + 50); ctx.lineTo(x - 40, 740); ctx.lineTo(x + 10, 720); ctx.lineTo(x - 16, -50); ctx.fill(); }
      ctx.restore();
      focusLines(cx, cy, o.r ?? 400, { n: 130, color: C.paper, alpha: 0.45, seed, wMax: 18, rate: 4 }); break;
    }
    case 'speed': vGrad([[0, '#0b0f2a'], [1, '#1b2152']]); speedLines(o.angle ?? 90, { n: 64, alpha: 0.5, speed: 3400, seed, color: col(o.color, C.paper), w: [2, 12] }); break;
    case 'rays': {
      vGrad([[0, '#07070d'], [1, '#120c18']]);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(sec(f) * 0.6);
      for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? 'rgba(245,184,61,0.2)' : 'rgba(245,184,61,0.07)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1600, -160); ctx.lineTo(1600, 160); ctx.closePath(); ctx.fill(); }
      ctx.restore(); break;
    }
    case 'plasma': {
      vGrad([[0, '#2a0806'], [0.5, '#7a1d10'], [1, '#e2402f']]);
      speedLines(o.angle ?? -60, { n: 46, alpha: 0.55, speed: 4200, seed, color: '#ffb347', w: [3, 12] });
      speedLines(o.angle ?? -60, { n: 22, alpha: 0.5, speed: 5200, seed: seed + 3, color: '#fff3c4', w: [2, 6] });
      break;
    }
    case 'sky': drawSky(f, { seed: 9300 + seed }); break;
    case 'night': vGrad([[0, '#070b26'], [0.55, '#1b2152'], [0.85, '#4a2f5e'], [1, '#c2603d']]); stars(seed + 20, 50, { area: [0, 0, W, 1000], alpha: 0.6 }); break;
    case 'hq': vGrad([[0, '#090c22'], [1, '#04050c']]); radGlow(cx, cy, 900, 'rgba(127,214,255,0.14)'); break;
    case 'ink': fillBg(C.ink); break;
    default: vGrad([[0, '#05060d'], [0.6, '#0e1230'], [1, '#22184a']]); stars(seed + 30, 70, { alpha: 0.7, drift: [-f * (o.drift ?? 0.6), f * 0.2] }); break;
  }
}

// ---------------------------------------------------------------- photos
// draw image `name` covering the rect [x, y, w, h] (clipped by the caller), centred on its focus box
// centre, at zoom z, offset (ox, oy) px; registers the photo for the credit audit. Returns the mapping.
function coverMap(name, rect, focus, z = 1, ox = 0, oy = 0) {
  const I = IMG[name], P = IMAGES[name];
  const fc = focus || P.focus || [0.25, 0.25, 0.5, 0.5];
  const iw = I.width, ih = I.height;
  let s = Math.max(rect[2] / iw, rect[3] / ih);
  if (P.fill) s = Math.max(s, (rect[2] * P.fill) / (fc[2] * iw));
  s *= z;
  const ax = (fc[0] + fc[2] / 2) * iw, ay = (fc[1] + fc[3] / 2) * ih;
  let x = rect[0] + rect[2] / 2 + ox - ax * s, y = rect[1] + rect[3] / 2 + oy - ay * s;
  // keep the image covering the rect
  x = Math.min(rect[0], Math.max(rect[0] + rect[2] - iw * s, x)); y = Math.min(rect[1], Math.max(rect[1] + rect[3] - ih * s, y));
  return { x, y, s, iw, ih, pt: (fx, fy) => [x + fx * iw * s, y + fy * ih * s] };
}
function drawCover(name, rect, m) {
  ctx.drawImage(IMG[name], m.x, m.y, m.iw * m.s, m.ih * m.s);
  // only the visible part counts as on screen
  const vx0 = Math.max(rect[0], m.x), vy0 = Math.max(rect[1], m.y), vx1 = Math.min(rect[0] + rect[2], m.x + m.iw * m.s), vy1 = Math.min(rect[1] + rect[3], m.y + m.ih * m.s);
  if (vx1 > vx0 && vy1 > vy0) regPhoto(name, vx0, vy0, vx1 - vx0, vy1 - vy0);
}
// cel panel frame: ink border and paper keyline around a rect, tilted by rot (deg) about its centre
function panelPath(r, pad = 0) { ctx.beginPath(); ctx.rect(r[0] - pad, r[1] - pad, r[2] + 2 * pad, r[3] + 2 * pad); }
function withPanel(r, rot, fn) {
  ctx.save(); ctx.translate(r[0] + r[2] / 2, r[1] + r[3] / 2); ctx.rotate(rot * Math.PI / 180); ctx.translate(-(r[0] + r[2] / 2), -(r[1] + r[3] / 2));
  ctx.fillStyle = C.ink; panelPath(r, 22); ctx.fill();
  ctx.fillStyle = C.paper; panelPath(r, 12); ctx.fill();
  ctx.save(); panelPath(r); ctx.clip(); fn(); ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; panelPath(r); ctx.stroke();
  ctx.restore();
}
// photo camera for a beat: push over the beat, keys (zoom / focus), punches on words, the slam-in
function photoCam(spec, b, f) {
  const P = IMAGES[spec.image];
  let z = 1 + (spec.push ?? 0.06) * E.io(inv(b.w, b.T1, f)), focus = spec.focus || P.focus;
  for (const k of spec.keys || []) {
    const kf0 = A(k.at), kk = E.io(inv(kf0, kf0 + (k.frames ?? 12), f));
    if (kk <= 0) continue;
    if (k.zoom != null) z *= lerp(1, k.zoom, kk);
    if (k.focus) focus = focus.map((v, i) => lerp(v, k.focus[i], kk));
  }
  for (const p of spec.punch || []) { const d = f - A(p); if (d >= 0 && d < 30) z *= 1 + 0.07 * Math.exp(-d / 6) * (d < 3 ? d / 3 : 1); }
  const slam = spec.slam ? lerp(1.32, 1, E.out5(inv(b.w, b.w + 9, f))) : 1;
  const sw = spec.sway ?? 1, t = sec(f);
  return { z: z * slam, focus, slam, ox: Math.sin(t * 2.1 + b.i) * 14 * sw, oy: Math.cos(t * 1.7 + b.i) * 10 * sw, rot: Math.sin(t * 1.3 + b.i) * 0.7 * sw };
}
const PANEL_RECT = [70, 330, 940, 800], CIRCLE = [540, 740, 410];
SHOTS.photo = (spec, b) => {
  const mode = spec.frame || 'full';
  const rot = spec.rot ?? (mode === 'panel' ? -2.5 : 0);
  let last = null;
  const marks = (m, f) => {
    for (const mk of spec.marks || []) {
      const a = A(mk.at), u = A(mk.until ?? b.T1 + 30);
      if (f < a || f >= u) continue;
      const [x, y] = m.pt(mk.point[0], mk.point[1]), r = mk.r ?? 70;
      const d = f - a;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(x, y, r * E.back(clamp(d / 6), 2), 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = C.amber; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, y, r * E.back(clamp(d / 6), 2), 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 2; i++) { const q = ((d / 24) + i * 0.5) % 1; ctx.strokeStyle = `rgba(245,184,61,${0.9 * (1 - q)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r + q * 90, 0, Math.PI * 2); ctx.stroke(); }
    }
  };
  const scan = (cx, cy, r, f) => {
    if (!spec.scan) return;
    const a = A(spec.scan.at), u = A(spec.scan.until ?? b.T1);
    if (f < a || f >= u) return;
    const ang = (f - a) * 0.16 - Math.PI / 2;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(245,184,61,0.22)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, ang - 0.5, ang); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.amber; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.stroke();
    ctx.restore();
  };
  function draw(f) {
    const cam = photoCam(spec, b, f);
    const fl = spec.lines !== false;
    if (mode === 'full') {
      const rect = [-40, -40, W + 80, H + 80];
      const m = coverMap(spec.image, rect, cam.focus, cam.z, cam.ox, cam.oy);
      fillBg(C.ink);
      ctx.save(); ctx.translate(540, 960); ctx.rotate((rot + cam.rot + (spec.turn ?? 0) * inv(b.w, b.T1, f)) * Math.PI / 180); ctx.translate(-540, -960);
      drawCover(spec.image, rect, m); marks(m, f); ctx.restore();
      const fp = m.pt(cam.focus[0] + cam.focus[2] / 2, cam.focus[1] + cam.focus[3] / 2);
      if (spec.overlay === 'focus') focusLines(fp[0], fp[1], spec.overlay_r ?? 380, { n: 120, color: C.paper, alpha: 0.4, seed: 13 + b.i, wMax: 14, rate: 2 });
      if (spec.overlay === 'speed') speedLines(spec.angle ?? 90, { n: 30, alpha: 0.3, speed: 2600, seed: 13 + b.i });
      if (fl && cam.slam > 1.001) focusLines(fp[0], fp[1], 420, { n: 140, color: C.paper, alpha: 0.6 * (cam.slam - 1) * 3, seed: 3 + b.i, wMax: 14 });
      last = { m, rect: [m.pt(cam.focus[0], cam.focus[1]), m.pt(cam.focus[0] + cam.focus[2], cam.focus[1] + cam.focus[3])] };
    } else if (mode === 'panel' || mode === 'circle' || mode === 'cutout') {
      paintBg(spec.bg || (mode === 'circle' ? 'focus' : 'speed'), f, { seed: 20 + b.i, angle: spec.angle, cx: mode === 'circle' ? CIRCLE[0] : 540, cy: mode === 'circle' ? CIRCLE[1] : 730, r: mode === 'circle' ? CIRCLE[2] + 20 : 440 });
      if (mode === 'panel') {
        const r = spec.rect || PANEL_RECT;
        ctx.save(); ctx.translate(r[0] + r[2] / 2, r[1] + r[3] / 2); ctx.scale(cam.slam, cam.slam); ctx.translate(-(r[0] + r[2] / 2), -(r[1] + r[3] / 2));
        let m = null;
        withPanel(r, rot + cam.rot + (spec.turn ?? 1.5) * inv(b.w, b.T1, f), () => { m = coverMap(spec.image, r, cam.focus, cam.z / cam.slam * 1.04, cam.ox * 1.5, cam.oy * 1.5); drawCover(spec.image, r, m); marks(m, f); });
        ctx.restore();
        last = { m, rect: [[r[0], r[1]], [r[0] + r[2], r[1] + r[3]]] };
      } else if (mode === 'circle') {
        const [cx, cy, rr] = spec.circle || CIRCLE;
        const r = rr * cam.slam;
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, r + 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(cx, cy, r + 18, 0, Math.PI * 2); ctx.fill();
        const rect = [cx - r, cy - r, 2 * r, 2 * r];
        const m = coverMap(spec.image, rect, cam.focus, cam.z / cam.slam * 1.06);
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(sec(f - b.w) * (spec.spin ?? 0.05)); ctx.translate(-cx, -cy); drawCover(spec.image, rect, m); ctx.restore();
        marks(m, f); scan(cx, cy, r, f); ctx.restore();
        ctx.strokeStyle = C.amber; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
        last = { m, rect: [[cx - r * 0.75, cy - r * 0.75], [cx + r * 0.75, cy + r * 0.75]] };
      } else {
        const P = IMG[spec.image]; const cw = (spec.width ?? 900) * cam.z, ch = cw * P.height / P.width;
        const cx = spec.pos?.[0] ?? 540, cy = spec.pos?.[1] ?? 740;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * Math.PI / 180 + (spec.spin ?? 0) * sec(f - b.w));
        ctx.drawImage(P, -cw / 2, -ch / 2, cw, ch); regPhoto(spec.image, -cw / 2, -ch / 2, cw, ch);
        ctx.restore();
        last = { m: { pt: (fx, fy) => [cx + (fx - 0.5) * cw, cy + (fy - 0.5) * ch] }, rect: [[cx - cw * 0.4, cy - ch * 0.4], [cx + cw * 0.4, cy + ch * 0.4]] };
      }
    } else if (mode === 'monitor') {
      drawMonitorShot(spec, b, f, cam);
      last = { m: null, rect: [[200, 420], [880, 980]] };
    }
    if (spec.sparkle) for (let i = 0; i < 6; i++) { const tw = (sec(f) * 1.4 + i / 6) % 1, a = i / 6 * Math.PI * 2 + sec(f) * 0.6; kira(540 + Math.cos(a) * 460, 740 + Math.sin(a) * 440, 40 * Math.sin(tw * Math.PI), C.amber3, tw * 2); }
  }
  return {
    draw,
    subjects: (f) => { if (!last) draw(f); const [[x0, y0], [x1, y1]] = last.rect; return [[x0, y0, x1 - x0, y1 - y0]]; },
    anchors: (f) => {
      if (!last) return {};
      const out = { subject: [(last.rect[0][0] + last.rect[1][0]) / 2, (last.rect[0][1] + last.rect[1][1]) / 2] };
      (spec.marks || []).forEach((mk, i) => { if (last.m) out['mark' + i] = last.m.pt(mk.point[0], mk.point[1]); });
      return out;
    },
    hits: () => (spec.slam ? [[b.w, 0.6]] : []),
  };
};
SHOTS.hook = (spec, b) => SHOTS.photo(Object.assign({ slam: true }, spec), b);
// photo on a monitor in Night Shift's dark HQ, Night Shift over the shoulder (lower left), lit by the screen;
// the camera pulls back from the screen filling the frame when "pull" is set
function drawMonitorShot(spec, b, f, cam) {
  const SX = 160, SY = 380, SW = 760, SH = 640, scx = SX + SW / 2, scy = SY + SH / 2;
  const pull = spec.pull ? E.io(inv(b.w, b.w + 11, f)) : 1;
  const z = lerp(1080 / SW * 1.02, 1, pull) * (1 + 0.08 * E.io(inv(b.w + 9, b.T1, f)));
  ctx.save(); ctx.translate(540, 760); ctx.scale(z, z); ctx.translate(-scx, -scy);
  vGrad([[0, '#090c22'], [1, '#04050c']], -400, 2300);
  radGlow(scx, scy, 900, 'rgba(127,214,255,0.16)');
  ctx.fillStyle = '#0d1030'; ctx.fillRect(-400, 1180, 1900, 900);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-400, 1180); ctx.lineTo(1500, 1180); ctx.stroke();
  ctx.strokeStyle = 'rgba(127,214,255,0.12)'; ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-400, 200 + i * 230); ctx.lineTo(100, 200 + i * 230); ctx.moveTo(980, 220 + i * 230); ctx.lineTo(1500, 220 + i * 230); ctx.stroke(); }
  cel(() => { ctx.beginPath(); ctx.roundRect(SX - 34, SY - 34, SW + 68, SH + 68, 26); }, { fill: '#1b1e33', shade: '#11131f', shadeFn: () => ctx.rect(SX - 40, SY + SH * 0.6, SW + 80, SH), line: C.ink, lw: 8, keyline: C.paper, keyW: 16 });
  ctx.fillStyle = '#2b2f45'; ctx.fillRect(scx - 60, SY + SH + 34, 120, 110); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.strokeRect(scx - 60, SY + SH + 34, 120, 110);
  ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(SX + SW + 10, SY + SH + 14, 7, 0, Math.PI * 2); ctx.fill();
  const r = [SX, SY, SW, SH];
  ctx.save(); ctx.beginPath(); ctx.rect(SX, SY, SW, SH); ctx.clip();
  const m = coverMap(spec.image, r, cam.focus, cam.z);
  drawCover(spec.image, r, m);
  // scan lines of the screen (a cel effect, not a change to the photo)
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = SY; y < SY + SH; y += 6) ctx.fillRect(SX, y, SW, 2);
  for (const mk of spec.marks || []) { const a = A(mk.at); if (f < a) continue; const [x, y] = m.pt(mk.point[0], mk.point[1]); for (let i = 0; i < 2; i++) { const d = ((f - a) / 24 + i * 0.5) % 1; ctx.strokeStyle = `rgba(245,184,61,${0.9 * (1 - d)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, (mk.r ?? 30) + d * 80, 0, Math.PI * 2); ctx.stroke(); } }
  ctx.restore();
  const lean = E.out(inv(Ao(spec.lean_at, b.T1 - 20), Ao(spec.lean_at, b.T1 - 20) + 8, on2(f)));
  drawNSBack(330 + lean * 20, 1470 - lean * 30, 270, { tilt: 0.06 + lean * 0.06, earL: -0.1 - 0.15 * lean, earR: 0.1 * Math.sin(sec(f) * 3), rim: C.cyan });
  R.ns = true;
  ctx.restore();
}

// ---------------------------------------------------------------- number slam: a giant number over a drawn
// or photo backdrop; it slams in on its word (pop 1.8 to 1, clamped inside the safe zone)
SHOTS.number = (spec, b) => {
  const art = spec.art ? SHOTS.craft(Object.assign({ bg: spec.bg }, spec.art), b) : null;
  const ph = spec.image ? SHOTS.photo({ image: spec.image, frame: spec.frame || 'circle', bg: spec.bg || 'focus', push: spec.push, focus: spec.focus }, b) : null;
  const at = Ao(spec.at, b.w), y = spec.y ?? 700, maxW = 770;
  function draw(f) {
    if (art) art.draw(f); else if (ph) ph.draw(f); else paintBg(spec.bg || 'focus', f, { seed: 40 + b.i, cy: y - 120 });
    if (f >= at - 4 && f < at + 2) focusLines(540, y - 120, 260, { n: 150, color: C.paper, alpha: 0.6, seed: 401 + b.i, wMax: 10, rate: 1 });
    if (f < at) return;
    let size = spec.size ?? 300; const w = slamWidth(spec.text, size); if (w > maxW) size *= maxW / w;
    const pop = E.back(inv(at, at + 6, f), 2.2), k = lerp(1.8, 1, pop);
    const ww = slamWidth(spec.text, size), kmax = 790 / ww;
    slamText(spec.text, 490, y, size, Math.min(k, kmax), { rot: spec.rot ?? -0.05 });
  }
  return { draw, subjects: (f) => [[90, y - 300, 800, 330]], anchors: (f) => ({ subject: [490, y - 120], number: [490, y - 120], ...(art ? art.anchors(f) : {}) }), hits: () => [[at, 0.8], ...(art ? art.hits() : [])] };
};

// ---------------------------------------------------------------- drawn spacecraft (generic, clearly
// illustration): capsule, crew-capsule, rocket, rocket-slim, probe, rover, satellite; on a drawn backdrop
const CRAFT_SIZE = { capsule: 120, 'crew-capsule': 360, rocket: 120, 'rocket-slim': 70, probe: 200, rover: 160, satellite: 90 };
function drawCraft(kind, x, y, s, o = {}) {
  if (kind === 'crew-capsule') drawCrewCapsule(x, y, s, o);
  else if (kind === 'capsule') drawCapsule(x, y, s, o);
  else if (kind === 'rocket') drawH3(x, y, s, { tilt: o.rot || 0, flameK: o.flame || 0 });
  else if (kind === 'rocket-slim') drawElectron(x, y, s, { glow: o.glow ?? 0.4 });
  else if (kind === 'probe') drawMMX(x, y, s, o);
  else if (kind === 'rover') drawRover(x, y, s, o);
  else if (kind === 'satellite') drawSat(x, y, s, o);
}
function inWin(f, w) { if (!w) return 0; if (typeof w === 'number') return w; const a = A(w.at), u = w.until != null ? A(w.until) : Infinity; return f >= a && f < u ? (w.k ?? 1) * clamp((f - a) / 4) : 0; }
function paintBackdrop(kind, f, b, o = {}) {
  const seed = 60 + b.i;
  if (kind === 'limb') { paintBg('space', f, { seed }); drawLimb(540 + (o.limbX ?? 0), o.limbY ?? 3400, o.limbR ?? 2000, { hot: o.hot ?? 0 }); }
  else if (kind === 'sky') { paintBg('sky', f, { seed }); }
  else if (kind === 'sea') { drawSky(f, { seed: 9300 + seed, top: '#3f7fc8', bottom: '#cfe3f0' }); drawSea(f, o.seaY ?? 1250, { splash: o.splash ?? 0, sx: o.sx ?? 540, sy: (o.seaY ?? 1250) + 10 }); }
  else if (kind === 'earth') { paintBg('space', f, { seed }); drawEarthCel(o.ex ?? 540, o.ey ?? 1500, o.er ?? 640, { lon0: o.lon0 ?? 134, lat0: o.lat0 ?? -25, light: [-0.7, -0.5] }); }
  else if (kind === 'mars') { paintBg('space', f, { seed }); drawMarsCel(o.ex ?? 300, o.ey ?? 1500, o.er ?? 700, { light: [0.7, -0.6] }); }
  else if (kind === 'moon') { paintBg('space', f, { seed }); drawMoonCel(o.ex ?? 680, o.ey ?? 640, o.er ?? 330); }
  else if (kind === 'phobos') { paintBg('space', f, { seed }); drawMarsCel(900, 300, 210, { light: [-0.7, -0.3] }); drawPhoGround(540, 1000 + 0.9 * 2000, 2000, { light: 1 }); }
  else if (kind === 'pad') {
    paintBg('night', f, { seed });
    ctx.save(); ctx.translate(o.towerX ?? 330, 1700); ctx.scale(1.5, 1.4);
    ctx.fillStyle = '#10132e'; ctx.fillRect(-60, -1250, 120, 1250); ctx.strokeStyle = '#2c3266'; ctx.lineWidth = 6;
    for (let i = 0; i < 16; i++) { const yy = -i * 78; ctx.beginPath(); ctx.moveTo(-60, yy); ctx.lineTo(60, yy - 78); ctx.moveTo(60, yy); ctx.lineTo(-60, yy - 78); ctx.stroke(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.strokeRect(-60, -1250, 120, 1250);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = hash(i, 5, Math.floor(f / 8)) > 0.4 ? '#ff5a3c' : '#5a1f1c'; ctx.beginPath(); ctx.arc(60, -200 - i * 190, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  else paintBg(kind || 'space', f, { seed, angle: o.angle });
}
SHOTS.craft = (spec, b) => {
  const kind = spec.craft || 'capsule';
  const keys = (spec.keys || []).map((k) => ({ f: A(k.at), pos: k.pos, s: k.scale, rot: k.rot, frames: k.frames }));
  const base = { pos: spec.pos || [540, 860], s: spec.scale ?? 1, rot: spec.rot ?? 0 };
  let lastPos = base.pos;
  function pose(f) {
    let pos = base.pos, s = base.s, rot = base.rot, prev = { f: b.T0, pos, s, rot }, vel = 0;
    for (const k of keys) {
      const nk = { f: k.f, pos: k.pos || prev.pos, s: k.s ?? prev.s, rot: k.rot ?? prev.rot };
      const d = k.frames ?? 12, u = (spec.ease === 'in' ? E.in : E.io)(inv(nk.f, nk.f + d, f));
      if (u > 0) { pos = [lerp(prev.pos[0], nk.pos[0], u), lerp(prev.pos[1], nk.pos[1], u)]; s = lerp(prev.s, nk.s, u); rot = lerp(prev.rot, nk.rot, u); if (u < 1) vel = Math.hypot(nk.pos[0] - prev.pos[0], nk.pos[1] - prev.pos[1]) / d; }
      prev = { f: nk.f, pos: u >= 1 ? nk.pos : pos, s: u >= 1 ? nk.s : s, rot: u >= 1 ? nk.rot : rot };
    }
    const drift = spec.drift ?? [0, 0];
    const t = f - b.w;
    pos = [pos[0] + drift[0] * t, pos[1] + drift[1] * t + Math.sin(sec(f) * 2) * 6];
    return { pos, s, rot, vel };
  }
  const liftAt = spec.liftoff ? A(spec.liftoff.at) : null;
  function draw(f) {
    const splashT = spec.splash ? sec(f - A(spec.splash.at)) : -1;
    const z = 1 + (spec.push ?? 0.05) * E.io(inv(b.w, b.T1, f));
    const [sx, sy] = liftAt != null && f >= liftAt ? [(hash(f, 1, 7) - 0.5) * 14, (hash(f, 2, 7) - 0.5) * 14] : [0, 0];
    ctx.save(); ctx.translate(540 + sx, 960 + sy); ctx.scale(z, z); ctx.translate(-540, -960);
    paintBackdrop(spec.bg || 'space', f, b, Object.assign({ splash: splashT > 0 ? splashT : 0, hot: inWin(f, spec.plasma) }, spec.backdrop || {}));
    const P = pose(f);
    let { pos } = P;
    if (liftAt != null) { const lift = Math.max(0, sec(f - liftAt)); pos = [pos[0], pos[1] - 1100 * E.in(clamp(lift / 0.8)) - lift * 500]; }
    lastPos = pos;
    const size = (CRAFT_SIZE[kind] || 150) * P.s;
    const plasma = inWin(f, spec.plasma);
    const chutes = spec.chutes ? inv(A(spec.chutes.at), A(spec.chutes.at) + 10, f) : 0;
    const o = { rot: P.rot, plasma, window: spec.window || '', flame: liftAt != null && f >= liftAt - 8 ? 1 : inWin(f, spec.burn) ? 1 : 0, burn: inWin(f, spec.burn) ? 1.4 : 0, legs: spec.legs ?? 0, wing: spec.wing ?? 1, arm: spec.arm ? E.back(inv(A(spec.arm.at), A(spec.arm.at) + 12, on2(f)), 1.4) : 0, corer: spec.arm && f > A(spec.arm.at) + 12 ? 1 : 0, sampler: spec.sampler ? 1 : 0, mast: 1, char: spec.char ?? 0.3 };
    if (spec.speed != null) speedLines(spec.speed, { n: 30, alpha: 0.55, speed: 4200, seed: 70 + b.i, area: [pos[0] - 500, pos[1] - 500, 1000, 1000], len: [120, 500], w: [3, 9] });
    if (chutes > 0 && kind === 'crew-capsule') drawChutes(pos[0], pos[1] - size * 0.84, size * 0.55, chutes, { sway: 1 });
    const one = (k) => drawCraft(kind, pos[0] - k * (P.vel ? 90 : 0), pos[1] + k * (P.vel ? 60 : 0), size, o);
    if (P.vel > 18 || (spec.smear && plasma > 0)) smear(one, 3, 0.3); else one(0);
    if (liftAt != null && f >= liftAt - 8) {
      const ig = sec(f - liftAt + 8);
      cloudCluster(launchPuffs(ig, 17 + b.i, { cx: base.pos[0], gy: base.pos[1] + 40, spread: 1000, up: 320, n: 26, rMax: 240 }), 400, { warm: 0.85, warmC: '#ff8a3d', lightDir: [0, 1], lw: 7 });
      speedLines(90, { n: 30, alpha: 0.5 * clamp(ig * 2), speed: 3800, seed: 9 });
    }
    if (spec.bg === 'pad') { ctx.fillStyle = '#0a0c1e'; ctx.fillRect(-200, base.pos[1] + 45, W + 400, 800); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-200, base.pos[1] + 45); ctx.lineTo(W + 200, base.pos[1] + 45); ctx.stroke(); }
    ctx.restore();
  }
  return {
    draw,
    subjects: (f) => { const s = (CRAFT_SIZE[kind] || 150) * pose(f).s; return [[lastPos[0] - s * 0.6, lastPos[1] - s * 0.9, s * 1.2, s * 1.1]]; },
    anchors: (f) => ({ subject: lastPos, craft: lastPos }),
    hits: () => [...(liftAt != null ? [[liftAt, 0.8]] : []), ...(spec.splash ? [[A(spec.splash.at), 0.9]] : [])],
  };
};
