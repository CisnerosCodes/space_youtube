// shots.js: the timeline. Every shot is a pure function of the frame number.
'use strict';
const sec = (f) => f / FPS;
// keyframe interpolation on frames: kf(f, [[f0, v0], [f1, v1], ...], ease)
function kf(f, keys, ease = E.io) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const k = ease((f - a) / (b - a)); return Array.isArray(va) ? va.map((x, j) => lerp(x, vb[j], k)) : lerp(va, vb, k); }
  }
  return keys[keys.length - 1][1];
}
const on2 = (f) => Math.floor(f / 2) * 2;   // character animation on twos

// impact frames: ONE frame each (high-contrast ink multiplied with red), on emphasis words only,
// never closer than 60 frames (2 s) to each other (photosensitivity: tools/pse.py).
const IMPACTS = [54, 147, 280, 496, 604, 723, 802, 886];
// camera shake hits [frame, amplitude 0..1]
const HITS = [[54, 1], [130, 0.8], [147, 0.7], [188, 0.35], [280, 1], [324, 0.5], [375, 0.6], [404, 0.6], [496, 1], [568, 0.8], [604, 1], [653, 0.9], [706, 0.45], [723, 0.8], [770, 0.4], [802, 0.9], [886, 1], [949, 0.5], [1141, 0.45], [1185, 0.3], [1212, 0.4]];
function shakeF(f, scale = 1) { const [x, y, r] = shakeAt(sec(f), HITS.map(([h, a]) => [sec(h), a]), 30 * scale, 0.55); return [x, y, r]; }

// speech: mouth openness for Night Shift while a word is being spoken (on twos)
function speak(f) {
  const t = sec(on2(f));
  for (const w of WORDS) if (t >= w.start && t < w.end) { const d = w.end - w.start, syl = Math.max(1, Math.round(d / 0.16)); return 0.25 + 0.55 * Math.abs(Math.sin(Math.PI * syl * (t - w.start) / d)); }
  return 0;
}
// blinks: seeded schedule, 3 frames closed
function blinkAt(f, seed = 3) {
  let s = 0, i = 0;
  while (s < f + 10) { s += 50 + Math.floor(hash(i, seed, 9) * 70); const d = f - s; if (d >= 0 && d < 4) return [0.6, 1, 1, 0.5][d]; i++; }
  return 0;
}
// ghosting smear: draws fn(k) at n sub-steps behind, fading
function smear(fn, n, alpha0 = 0.35) { for (let i = n; i >= 1; i--) { ctx.save(); ctx.globalAlpha *= alpha0 * (1 - i / (n + 1)); fn(i / n); ctx.restore(); } fn(0); }

// ---------------------------------------------------------------- S1 HOOK (f0-103)
function shotHook(f) {
  // deep space with a red glow rising from Mars below
  vGrad([[0, '#05060d'], [0.55, '#140b1c'], [1, '#3a1410']], 0, H + 1600);
  stars(11, 70, { drift: [0, f * 0.4], alpha: 0.7 });
  const wide = E.out5(inv(52, 66, f));           // snap to the wide at "collision"
  const push = f / 103;
  // Mars rising from the bottom (real photo)
  const marsY = lerp(2700, 2020, wide) - push * 40;
  const marsW = lerp(1900, 1800, wide);
  if (wide > 0) {
    radGlow(540, marsY - marsW * 0.42, 900, 'rgba(201,86,47,0.35)');
    drawImg('mars', 540, marsY, marsW, -6);
  }
  // Phobos (real photo): big push, then the snap up-right
  const px = lerp(540, 770, wide) + inv(62, 103, f) * 45, py = lerp(800, 600, wide) - inv(62, 103, f) * 25;
  const slam = lerp(1.32, 1, E.out5(inv(0, 9, f)));
  const pw = lerp(lerp(980, 1060, push) * slam, 500, wide);
  const rot = lerp(-6, 4, push);
  // focus lines (anime) around Phobos
  focusLines(px, py, pw * 0.62, { n: 110, color: C.paper, alpha: lerp(0.55, 0.25, wide) + (slam - 1) * 1.2, seed: 3, wMax: 16 });
  if (f >= 52 && f < 62) focusLines(px, py, pw * 0.5, { n: 160, color: C.paper, alpha: 0.7 * (1 - inv(56, 62, f)), seed: 5, wMax: 10 });
  drawImg('phobos', px, py, pw, rot);
  // collision course: a slow inward spiral from Phobos toward Mars (diagram, amber), stopping short of the limb
  if (f >= 58) {
    const k = E.out(inv(58, 96, f));
    const mcx = 540, mcy = marsY, R0 = Math.hypot(px - mcx, py - mcy) - pw * 0.3;
    const a0 = Math.atan2(py - mcy, px - mcx), R1 = marsW * 0.5 + 90;
    ctx.save(); ctx.setLineDash([22, 16]); ctx.lineDashOffset = -f * 2; ctx.strokeStyle = C.amber; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); let last = null, prev = null;
    const N = 60;
    for (let i = 0; i <= N * k; i++) { const u = i / N; const a = a0 - u * 0.62; const r = lerp(R0, R1, u); const x = mcx + Math.cos(a) * r, y = mcy + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); prev = last; last = [x, y]; }
    ctx.stroke(); ctx.setLineDash([]);
    if (last && prev) { const ang = Math.atan2(last[1] - prev[1], last[0] - prev[0]); ctx.fillStyle = C.amber; ctx.save(); ctx.translate(last[0], last[1]); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, -15); ctx.lineTo(-14, 15); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  drawChip(['IN 50 MILLION YEARS:', 'CRASH INTO MARS', 'OR BREAK UP INTO A RING', { t: 'SOURCE: NASA', c: '#8c8a85' }], 80, 330, inv(66, 76, f), { size: 31 });
  drawChip(['1.8 M (6 FT) CLOSER', 'TO MARS EVERY 100 YEARS'], 80, 580, inv(80, 88, f), { size: 31 });
  // menacing katakana before the snap
  if (f < 54) sfxText('ゴゴゴ', 630, 380, 80, { rot: 0.08, alpha: 0.95, fill: C.amber });
  return wide > 0 ? [CR.phobos, CR.mars] : [CR.phobos];   // Mars is on screen from the first frame of the snap
}

// ---------------------------------------------------------------- S2 LAUNCH (f100-150)
function shotLaunch(f) {
  const ig = sec(f) - sec(118);                  // time since ignition
  const lift = Math.max(0, sec(f) - sec(130));   // time since liftoff
  const camUp = 1150 * E.in(clamp(lift / 0.65));  // camera tilts up with the rocket
  // predawn sky (04:41 JST)
  vGrad([[0, '#070b26'], [0.55, '#1b2152'], [0.82, '#4a2f5e'], [1, '#c2603d']], -camUp * 0.2, H - camUp * 0.2 + 300);
  stars(21, 50, { area: [0, 0, W, 1000], drift: [0, camUp * 0.15], alpha: 0.6 });
  ctx.save(); ctx.translate(540, 1400); ctx.rotate(-0.035); ctx.scale(1 + 0.06 * E.io(inv(103, 132, f)), 1 + 0.06 * E.io(inv(103, 132, f))); ctx.translate(-540, -1400); ctx.translate(0, camUp);
  // ground glow when burning
  if (ig > 0) radGlow(790, 1700, 1000, `rgba(255,150,70,${0.55 * clamp(ig * 3)})`);
  // launch tower (lattice) at left
  ctx.save(); ctx.translate(330, 1700); ctx.scale(1.5, 1.4);
  ctx.fillStyle = '#10132e'; ctx.fillRect(-60, -1250, 120, 1250);
  ctx.strokeStyle = '#2c3266'; ctx.lineWidth = 6;
  for (let i = 0; i < 16; i++) { const y = -i * 78; ctx.beginPath(); ctx.moveTo(-60, y); ctx.lineTo(60, y - 78); ctx.moveTo(60, y); ctx.lineTo(-60, y - 78); ctx.stroke(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.strokeRect(-60, -1250, 120, 1250);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = hash(i, 5, Math.floor(f / 8)) > 0.4 ? '#ff5a3c' : '#5a1f1c'; ctx.beginPath(); ctx.arc(60, -200 - i * 190, 7, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // rocket
  const ry = 1690 - 1100 * E.in(clamp(lift / 0.7)) - lift * 600;
  const flameK = ig > 0 ? clamp(ig * 4) * (0.85 + 0.15 * hash(f, 7, 1)) : 0;
  // vapour wisps before ignition
  if (ig < 0.3) cloudCluster([0, 1, 2, 3].map((i) => ({ x: 790 + (i - 1.5) * 110 + Math.sin(f * 0.1 + i) * 10, y: 1700 - i * 8 - (f % 30) * 0.6, r: 55 + i * 8 })), 300, { alpha: 0.7, lw: 4 });
  drawH3(790, ry, 152, { tilt: 0, flameK });
  // ground/pad
  ctx.fillStyle = '#0a0c1e'; ctx.fillRect(-200, 1735, W + 400, 600);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-200, 1735); ctx.lineTo(W + 200, 1735); ctx.stroke();
  // exhaust billows
  if (ig > 0) {
    const puffs = launchPuffs(ig, 17, { cx: 790, gy: 1730, spread: 1100, up: 340, n: 30, rMax: 260 });
    cloudCluster(puffs, 400, { warm: 0.85, warmC: '#ff8a3d', lightDir: [0, 1], lw: 7 });
  }
  ctx.restore();
  // vertical speed lines during liftoff
  if (lift > 0) speedLines(90, { n: 34, alpha: 0.55 * clamp(lift * 3), speed: 3800, color: C.paper, seed: 9 });
  // cloud wipe into the next shot: billows rise from the bottom and cover the frame
  if (f >= 139) {
    const k = E.in(inv(139, 148, f));
    const puffs = [];
    for (let i = 0; i < 16; i++) puffs.push({ x: (i % 4) * 330 + 40 + (hash(i, 61, 1) - 0.5) * 120, y: lerp(2400, 200, k) + Math.floor(i / 4) * 420 + (hash(i, 62, 1) - 0.5) * 150, r: 300 + hash(i, 63, 1) * 120 });
    cloudCluster(puffs, 500, { warm: 0.25, lw: 7 });
  }
  drawChip(['H3 FLIGHT No.10 · TANEGASHIMA', 'LIFTOFF 04:41:03 JST, OCT 20, 2026', { t: '(19:41:03 UTC, OCT 19)', c: '#a9a6a0' }], 80, 330, inv(105, 113, f) * (1 - inv(140, 146, f)), { size: 28 });
  if (f >= 130 && f < 144) sfxText('ドドド', 120, 900, 110, { rot: -0.15, alpha: 1 - inv(140, 144, f) });
  return ['Illustration · facts: JAXA'];
}

// ---------------------------------------------------------------- S3 HEIST (f147-168)
function shotHeist(f) {
  vGrad([[0, '#3a0d10'], [0.6, '#7a1d17'], [1, '#160608']]);
  focusLines(540, 720, 360, { n: 120, color: C.amber, alpha: 0.85, seed: 13, wMax: 26 });
  focusLines(540, 720, 520, { n: 60, color: C.ink, alpha: 0.7, seed: 14, wMax: 14 });
  const ff = on2(f);
  const turn = kf(ff, [[147, 0.95], [153, 0]], E.out);
  const push = kf(f, [[147, 300], [168, 345]], E.out);
  const p = { turn, mouth: 'smirk', slant: 0.55, lidL: 0.22, lidR: 0.3, glint: kf(ff, [[152, 0], [156, 1.2], [166, 0.6]], E.out), rim: C.amber, light: 1, look: [0.1, 0], open: speak(f) * 0.6, earR: kf(ff, [[158, 0], [160, 0.25], [164, 0]]) };
  if (ff < 153) smear((k) => drawNSHead(540 + k * 120, 760, push, Object.assign({}, p, { turn: Math.min(1, turn + k * 0.4) })), 3, 0.45);
  else drawNSHead(540, 760, push, p);
  // jacket collar hint at the bottom edge
  sfxText('ドン', 615, 405, 120, { rot: 0.12 });
  return [];
}

// ---------------------------------------------------------------- S4 TARGET (f168-222)
function shotTarget(f) {
  const whip = 1 - E.out5(inv(166, 174, f));
  vGrad([[0, '#0b0f2a'], [1, '#22184a']]);
  stars(31, 60, { drift: [-whip * 900 - f * 1.4, f * 0.5], alpha: 0.7 });
  const pcx = 690, pcy = 640;
  // camera: slow push on Pho through the line, a snap-zoom punch on "piece"
  const cz = 1 + 0.12 * E.io(inv(172, 214, f)) + 0.08 * E.out5(inv(188, 192, f));
  ctx.save(); ctx.translate(whip * 900, 0);
  ctx.translate(pcx, pcy); ctx.scale(cz, cz); ctx.rotate(-0.035 * inv(172, 214, f)); ctx.translate(-pcx, -pcy);
  const fur = f >= 202, notice = f >= 186;
  const look = fur ? [0, 0] : f >= 190 ? [-0.9, 0.8] : notice ? [-0.8, 0.4] : [0.2, -0.2];
  const pe = { expr: fur ? 'furious' : notice ? 'alarm' : 'grumpy', look, vein: fur ? E.back(inv(202, 208, f)) : 0, shake: fur ? 12 * (1 - inv(202, 222, f)) : 0, piece: inv(188, 193, f), rim: C.amber, sweat: f >= 192 && !fur ? E.back(inv(192, 198, f)) : 0 };
  const pbob = Math.sin(sec(f) * 2.2) * 10, py = pcy + pbob;
  drawPho(pcx, py, 245, pe, -0.06);
  const pp = phoPt(pcx, py, 245, -0.06, -0.62, 0.12);
  if (f >= 188 && f < 204) kira(pp[0] - 40, pp[1] - 46, 52 * Math.sin(Math.PI * inv(188, 204, f)), C.amber3, f * 0.08);
  // target reticle: closes on Pho, then jumps to the piece when it is named
  const rk = E.out(inv(172, 186, f)), jk = E.out5(inv(188, 192, f));
  const rr = lerp(lerp(560, 330, rk), 150, jk), ra = lerp(0.8, 0, rk) + sec(f) * (0.15 + jk * 0.6);
  ctx.save(); ctx.translate(lerp(pcx, pp[0], jk), lerp(py, pp[1], jk)); ctx.rotate(ra); ctx.strokeStyle = C.red; ctx.lineWidth = 9; ctx.lineCap = 'square';
  ctx.globalAlpha = rk;
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(rr, rr * 0.55); ctx.lineTo(rr, rr); ctx.lineTo(rr * 0.55, rr); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, 0, rr * 0.18, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Night Shift's pointing arm in the foreground (from the left edge), jabs again on "steal" and "piece"
  const ak = E.back(inv(168, 176, on2(f)), 1.4);
  const jab = 0.5 * Math.max(0, Math.sin(Math.PI * inv(188, 194, on2(f))));
  const paw = [lerp(-260, 470, ak) + jab * 60, lerp(1180, 930, ak) - jab * 40];
  ctx.save();
  G.S = 1;
  const sleeve = [[-200, 1330], [60, 1170], [paw[0] - 110, paw[1] + 30]];
  inkLine(sleeve, 1200, { color: C.ink, lw: 270 });
  inkLine(sleeve, 1200, { color: C.paper, lw: 246 });
  inkLine([[-160, 1390], [40, 1260], [paw[0] - 150, paw[1] + 110]], 1201, { color: C.paper3, lw: 70 });
  inkLine([[-60, 1180], [80, 1110]], 1202, { color: C.paper3, lw: 10 });
  ctx.save(); ctx.translate(paw[0] - 110, paw[1] + 30); ctx.rotate(Math.atan2(paw[1] - 1170, paw[0] - 60));
  cel(() => { ctx.beginPath(); ctx.roundRect(-40, -135, 80, 270, 22); }, { fill: C.paper2, line: C.ink, lw: 9 });
  ctx.translate(60, 0); ctx.scale(380, 380); G.S = 380; nsPaw('point', 1210, 1);
  ctx.restore();
  ctx.restore();
  // insert panel: his eyes narrow on "a piece of it"
  eyeStrip(f, 191, 214);
  drawChip(['TARGET: PHOBOS', { t: '27 x 22 x 18 km', c: C.amber }], 80, 330, inv(176, 184, f), { size: 30 });
  if (fur) sfxText('ムカッ', 640, 410, 80, { rot: 0.15, fill: C.red, alpha: 1 - inv(218, 222, f) });
  return ['Illustration · facts: NASA'];
}

// Mars, August 2027 (real photo); a drawn MMX (not to scale) arcs in and arrives on "2027."
// ---------------------------------------------------------------- STEP banners (band wipe transitions)
// Each STEP card has its own entry axis, angle, colour, camera move and Night Shift staging, so the device
// never repeats the same layout: 1 slides in from the left (amber), 2 drops from the top and bounces
// (amber, binoculars), 3 slams in from the right at a steep angle with a zoom punch (red, grit + fist),
// 4 rises from the bottom with a camera roll and a numeral that zooms from huge (ink and amber).
const BAND_ST = {
  1: { y: 820, ang: -8, axis: 'x', dir: 1, Lin: 1650, Lout: 1750, color: C.amber, step: 1, face: 'top', faceX: -240, bg: -20 },
  2: { y: 860, ang: 6, axis: 'y', dir: 1, Lin: 1300, Lout: 1500, color: C.amber, step: 2, face: 'binocs', bounce: 1.7, bg: 90, enter: 10 },
  3: { y: 760, ang: -16, axis: 'x', dir: -1, Lin: 1700, Lout: 1800, color: C.red, numC: C.amber, numDrop: C.ink, step: 3, face: 'side', zoom: 0.4, bg: 164, hatch: 'rgba(0,0,0,0.18)' },
  4: { y: 820, ang: 10, axis: 'y', dir: -1, Lin: 1550, Lout: 1300, color: C.ink2, text: C.amber, numC: C.amber, numDrop: C.red2, ink: C.ink, hatch: 'rgba(245,184,61,0.10)', step: 4, face: 'top', faceX: 240, spin: 16, numZoom: 3.2, bg: -90, enter: 10 },
  next: { y: 820, ang: -6, axis: 'x', dir: 1, Lin: 1650, Lout: 1750, color: C.paper, text: C.ink, ink: C.ink, face: 'top', faceX: 250, bg: -20 },
};
function bandBg(f, st, seed = 71) {
  vGrad(st.color === C.red ? [[0, '#2a0c14'], [1, '#12060b']] : [[0, '#0b0f2a'], [1, '#1b2152']]);
  speedLines(st.bg, { n: 40, alpha: 0.35, speed: 2600, seed });
}
// half-plane in band-local coordinates: along-axis coordinate u = dir * (x or y); greater ? u > e : u < e
function halfRect(st, e, greater) {
  const s = st.dir; let lo, hi;
  if (greater) { if (s > 0) { lo = e; hi = e + 9000; } else { lo = -e - 9000; hi = -e; } }
  else { if (s > 0) { lo = e - 9000; hi = e; } else { lo = -e; hi = -e + 9000; } }
  ctx.beginPath();
  if (st.axis === 'y') ctx.rect(-5000, lo, 10000, hi - lo); else ctx.rect(lo, -5000, hi - lo, 10000);
}
function bandCam(f, o, st) {
  // camera on the whole band shot: slow push through the hold, plus the style's own entry move
  const kk = inv(o.fIn, o.fIn + 12, f);
  let z = 1 + 0.035 * inv(o.fIn + 8, o.fOut + 8, f);
  if (st.zoom) z *= 1 + st.zoom * (1 - E.out5(kk));
  const r = (st.spin ? st.spin * (1 - E.out5(kk)) + 1.2 * Math.sin(sec(f - o.fIn) * 2.2) * (1 - inv(o.fOut, o.fOut + 8, f)) : 0) * Math.PI / 180;
  ctx.translate(540, 960); ctx.rotate(r); ctx.scale(z, z); ctx.translate(-540, -960);
}
// The band sweeps in over the previous scene (prev visible ahead of its leading edge) and sweeps out
// revealing the next scene behind its trailing edge. One continuous wipe, never an empty frame.
function bandShot(f, o) {
  const st = Object.assign({ fIn: o.fIn }, BAND_ST[o.style]);
  const en = st.enter || 8;
  const k = inv(o.fIn, o.fIn + en, f), out = inv(o.fOut, o.fOut + 8, f);
  const ein = st.bounce ? E.back(k, st.bounce) : E.io(k);
  const off = (1 - ein) * -st.Lin + E.io(out) * st.Lout;     // along-axis offset of the front band
  const h = st.axis === 'y' ? 175 : 1000;                    // half extent of the front band along its axis
  ctx.save();
  bandCam(f, o, st);
  const base = ctx.getTransform();
  const local = () => { ctx.setTransform(base); ctx.translate(540, st.y); ctx.rotate(st.ang * Math.PI / 180); };
  let credit = o.credit || [];
  const entering = k < 1 && o.prev, leaving = out > 0 && o.next;
  if (entering) { ctx.save(); local(); halfRect(st, off + h, true); ctx.setTransform(base); ctx.clip(); credit = o.prev(f) || []; ctx.restore(); }
  const clipMid = () => { if (entering) { local(); halfRect(st, off + h, false); ctx.setTransform(base); ctx.clip(); } if (leaving) { local(); halfRect(st, off - h, true); ctx.setTransform(base); ctx.clip(); } };
  ctx.save(); clipMid(); bandBg(f, st, o.seed || 71); if (o.extra) o.extra(f); ctx.restore();
  if (leaving) { ctx.save(); local(); halfRect(st, off - h, false); ctx.setTransform(base); ctx.clip(); credit = o.next(f) || []; ctx.restore(); }
  // Night Shift staging (behind or around the band)
  ctx.save(); clipMid(); bandFace(f, o, st, off, out); ctx.restore();
  drawBanner(o.ci, off, out, Object.assign(st, { num: o.num, stamp: o.stamp }));
  if (st.face === 'top') { ctx.save(); bandFaceTop(f, o, st, off, out); ctx.restore(); }
  if (o.extraTop) o.extraTop(f);
  ctx.restore();
  return credit;
}
// face peeking over the band's top edge (styles 1 and 4), clipped by the band
function bandFaceTop(f, o, st, off, out) {
  const up = E.back(inv(o.fIn + 6, o.fIn + 14, on2(f)), 2) * (1 - E.io(out));
  if (up <= 0) return;
  bandXform(st, off);
  ctx.beginPath(); ctx.rect(-1200, -1600, 2400, 1600 - 205); ctx.clip();
  ctx.save(); ctx.translate(st.faceX, -92 - up * 175); ctx.rotate(-st.ang * Math.PI / 180 * 0.5);
  drawNSHead(0, 0, 150, Object.assign({ look: [st.faceX > 0 ? -0.5 : 0.6, 0.3], open: speak(f) * 0.7, blink: 0 }, o.faceP || {}));
  ctx.restore();
}
// staging for styles 2 (binoculars lookout, lower right) and 3 (grit + fist, lower left)
function bandFace(f, o, st, off, out) {
  const ff = on2(f);
  if (st.face === 'binocs') {
    const up = E.back(inv(o.fIn + 8, o.fIn + 16, ff), 1.6);
    if (up <= 0) return;
    const y = lerp(2250, 1270, up) + E.in(out) * 900, x = 700;
    const lower = E.back(inv(o.fIn + 22, o.fIn + 27, ff), 2);   // binoculars come down: a wink at the camera
    const p = Object.assign({ tilt: -0.12 + Math.sin(sec(f) * 3) * 0.04, look: [-0.4, -0.2], open: speak(f) * 0.6, blink: 0, mouth: lower > 0.5 ? 'smirk' : 'w', lidR: lower > 0.5 ? 1 : 0, rim: C.amber }, o.faceP || {});
    drawNSHead(x, y, 165, p);
    // binoculars (drawn): two barrels over the eyes, held by both paws
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.tilt); ctx.scale(165, 165); G.S = 165;
    ctx.translate(0, lerp(0, 1.05, lower));
    for (const s of [-1, 1]) {
      cel(() => { ctx.beginPath(); ctx.roundRect(s * 0.41 - 0.28, -0.3, 0.56, 0.6, 0.16); }, { fill: '#2b2f45', shade: '#171a28', shadeFn: () => ctx.rect(s * 0.41 - 0.3, 0.08, 0.6, 0.4), line: C.paper, lw: 0.05 });
      cel(() => { ctx.beginPath(); ctx.arc(s * 0.41, -0.01, 0.2, 0, Math.PI * 2); }, { fill: '#2f6fd6', shade: '#163a8f', shadeFn: () => ctx.rect(s * 0.41 - 0.3, 0.04, 0.6, 0.3), line: C.ink, lw: 0.04 });
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(s * 0.41 - 0.07, -0.08, 0.07, 0.045, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(s * 0.62, 0.32); ctx.rotate(s > 0 ? -2.2 : -0.9); nsPaw('mitt', 1400 + (s > 0 ? 1 : 0), s); ctx.restore();
    }
    ctx.fillStyle = C.ink; ctx.fillRect(-0.18, -0.12, 0.36, 0.16);
    ctx.restore();
    if (lower > 0.5) kira(x - 0.41 * 165 - 30, y - 55, 34 * Math.min(1, (ff - o.fIn - 24) / 4), '#fffdf2', 0.3);
  } else if (st.face === 'side') {
    const kin = E.out5(inv(o.fIn + 6, o.fIn + 12, ff));
    if (kin <= 0) return;
    const x = lerp(-300, 250, kin) - E.in(out) * 700, y = 1230;
    focusLines(x, y, 220, { n: 70, color: C.amber, alpha: 0.35, seed: 377, wMax: 12, rate: 4, reach: 900 });
    drawNSHead(x, y, 205, Object.assign({ turn: -0.25, mouth: 'grit', open: 0.35, slant: 1, lidL: 0.22, lidR: 0.22, rim: C.red, light: 1, look: [0.5, -0.1] }, o.faceP || {}));
    const fk = E.back(inv(o.fIn + 14, o.fIn + 20, ff), 2.2);
    if (fk > 0) {
      ctx.save(); ctx.translate(lerp(x + 120, 620, fk) - E.in(out) * 700, lerp(1600, 1300, fk)); ctx.rotate(-0.25); const s = lerp(60, 150, fk); ctx.scale(s, s); G.S = s; bigPaw(1); ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- S5 STEP ONE (band f216-244, Mars f244-316)
function mmxFlyby(f) {
  const k = inv(224, 246, f);
  if (k > 0 && k < 1) {
    const x = lerp(-450, 1500, E.io(k)), y = lerp(1500, 200, E.io(k));
    speedLines(-34, { n: 20, alpha: 0.6, speed: 4200, seed: 76, area: [x - 500, y - 300, 1000, 600], len: [200, 600], w: [3, 8] });
    smear((s) => drawMMX(x - s * 300, y + s * 200, 230, { rot: -0.55 }), 4, 0.3);
  }
}
function bandOne(f) {
  const cr = bandShot(f, { style: 1, ci: 6, num: '1', fIn: 212, fOut: 236, prev: shotTarget, next: sceneMars, extraTop: mmxFlyby, credit: ['Illustration · facts: NASA'], faceP: { mouth: 'smirk', slant: 0.5, lidL: 0.2, lidR: 0.2 } });
  // the drawn MMX flies over the real Mars photo: say so
  return f >= 224 && f < 246 ? [...new Set([...cr, 'Illustration · not to scale'])] : cr;
}
// Mars, August 2027 (real photo)
function sceneMars(f) {
  vGrad([[0, '#07070d'], [1, '#1a0b0b']]);
  stars(41, 60, { alpha: 0.6, drift: [-f * 0.9, f * 0.2] });
  const mw = lerp(980, 1160, inv(236, 322, f));
  const mx = lerp(600, 510, inv(236, 322, f));
  focusLines(mx, 820, mw * 0.56, { n: 100, color: C.paper, alpha: 0.32, seed: 43, wMax: 12, rate: 3 });
  radGlow(mx, 820, mw * 0.7, 'rgba(201,86,47,0.25)');
  drawImg('mars', mx, 820, mw, lerp(0, -4, inv(236, 322, f)));
  const ak = inv(246, 282, f);
  let mmxOn = false;
  if (ak > 0) {
    mmxOn = true;
    const P0 = [-160, 1560], P1 = [120, 380], P2 = [850, 430];
    const bez = (u) => [(1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0], (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1]];
    const u = E.out(ak);
    let [x, y] = bez(u);
    const drift = Math.max(0, f - 282); x += drift * 0.5; y += Math.sin(drift * 0.08) * 6;
    // dashed amber trail
    ctx.save(); ctx.setLineDash([16, 12]); ctx.lineDashOffset = -f * 3; ctx.strokeStyle = C.amber; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); for (let i = 0; i <= 30; i++) { const q = bez(Math.max(0, u - 0.45) + (u - Math.max(0, u - 0.45)) * i / 30); i ? ctx.lineTo(q[0] + (i === 30 ? drift * 0.5 : 0), q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke(); ctx.restore();
    const [tx, ty] = bez(Math.min(1, u + 0.01)); const ang = Math.atan2(ty - y, tx - x);
    if (ak < 1) speedLines(ang * 180 / Math.PI, { n: 12, alpha: 0.5 * (1 - ak), speed: 3600, seed: 47, area: [x - 260, y - 260, 520, 520], len: [80, 260], w: [2, 5] });
    drawMMX(x, y, 92, { rot: ak < 1 ? ang * 0.35 : 0.0 });
    // arrival pulse on "2027."
    if (f >= 280 && f < 300) { const d = (f - 280) / 20; ctx.strokeStyle = `rgba(245,184,61,${1 - d})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, 60 + d * 140, 0, Math.PI * 2); ctx.stroke(); }
  }
  drawChip(['JUST UNDER ONE YEAR', 'EACH WAY (JAXA)'], 80, 330, inv(288, 296, f), { size: 31 });
  if (f >= 280 && f < 300) sfxText('ドン', 615, 1060, 110, { rot: 0.1, alpha: 1 - inv(296, 300, f) });
  return mmxOn ? [CR.mars, 'Illustration · not to scale'] : [CR.mars];
}

// a paper luggage tag on a string (number prop), anchored at (x, y), swing angle a
// ---------------------------------------------------------------- S6 STEP TWO (f306-446): drop a lookout
function sceneSurface(f, cam = { s: 1, x: 540, y: 960 }, { mmx = true, rover = null, measure = 0 } = {}) {
  vGrad([[0, '#060818'], [0.6, '#141a44'], [1, '#2a2350']]);
  stars(51, 70, { alpha: 0.7, area: [0, 0, W, 1300] });
  ctx.save();
  ctx.translate(540, 960); ctx.scale(cam.s, cam.s); ctx.translate(-cam.x, -cam.y);
  drawMarsCel(900, 300, 210, { light: [-0.7, -0.3] });
  drawPhoGround(540, 1000 + 0.9 * 2000, 2000, { light: 1 });
  if (mmx) drawMMX(600, 600 + Math.sin(sec(f) * 2) * 8, 150, { legs: 0.2 });
  if (measure > 0) {
    ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = C.amber; ctx.lineWidth = 4; ctx.globalAlpha = measure;
    ctx.beginPath(); ctx.moveTo(860, 690); ctx.lineTo(860, 1000); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(835, 690); ctx.lineTo(885, 690); ctx.moveTo(835, 1000); ctx.lineTo(885, 1000); ctx.stroke(); ctx.restore();
  }
  if (rover) rover();
  ctx.restore();
}
function bandTwo(f) {
  return bandShot(f, { style: 2, ci: 8, num: '2', fIn: 314, fOut: 348, prev: sceneMars, next: sceneDrop, seed: 72 });
}
function sceneDrop(f) {
  // rover drop: release at 352, lands 375
  const fallK = inv(352, 375, f);
  const landF = 375;
  const zoom = E.io(inv(393, 425, f));
  const cam = { s: lerp(1, 2.5, zoom) + inv(425, 446, f) * 0.15, x: lerp(540, 600, zoom), y: lerp(960, 950, zoom) };
  const [sx, sy] = shakeF(f, 0.8);
  ctx.save(); ctx.translate(sx, sy);
  ctx.translate(540, 960); ctx.rotate(-0.05 * E.io(inv(410, 446, f))); ctx.translate(-540, -960);
  sceneSurface(f, cam, {
    measure: inv(356, 362, f) * (1 - inv(400, 410, f)),
    rover: () => {
      let x = 600, y, rot;
      if (f < landF) { y = lerp(690, 1004, fallK * fallK); rot = fallK * 2.2; }
      else {
        const d = sec(f - landF);
        const hop = Math.max(0, Math.sin(Math.min(1, d / 0.45) * Math.PI)) * 70 * (d < 0.45 ? 1 : 0);
        y = 1004 - hop; rot = d < 0.45 ? lerp(2.2, Math.PI * 0.5, d / 0.45) : lerp(Math.PI * 0.5, 0, E.back(inv(0.45, 0.6, d), 2.5));
        if (d >= 0.6) rot = 0;
      }
      const mast = E.back(inv(388, 396, f), 2);
      const draw = (s) => drawRover(x, y - s * 60, 80, { rot, mast, scan: f > 398 ? Math.sin(sec(f - 398) * 4) : 0 });
      if (f < landF && f > 354) { smear(draw, 3, 0.35); speedLines(90, { n: 14, alpha: 0.6, speed: 3000, seed: 77, area: [x - 150, y - 400, 300, 450], len: [60, 220], w: [2, 5] }); }
      else draw(0);
      // the number as a prop: a "25 KG" tag pops onto the rover on "25" and swings
      const tk = E.back(inv(404, 409, f), 2.4);
      if (tk > 0) { ctx.save(); ctx.translate(x + 26, y - 44); ctx.scale(tk, tk); drawTag(0, 0, '25 KG', 0.18 + Math.sin(sec(f) * 3.5) * 0.12, { size: 19, len: -30 }); ctx.restore(); }
      // landing dust burst
      if (f >= landF && f < landF + 30) {
        const d = sec(f - landF);
        const puffs = [];
        for (let i = 0; i < 12; i++) { const a = Math.PI + (i / 11) * Math.PI; const rr = 60 + 220 * E.out(d * 2.2); puffs.push({ x: x + Math.cos(a) * rr * 1.1, y: 1006 + Math.sin(a) * rr * 0.3, r: (24 + hash(i, 81, 1) * 30) * (1 - d * 0.9) }); }
        cloudCluster(puffs, 600, { base: C.pho3, shade: C.pho2, lw: 4, alpha: 1 - inv(0.6, 1.0, d) });
      }
    },
  });
  ctx.restore();
  // Pho inset panel: an eye glances up at the landing
  if (f >= 378 && f < 402) {
    const k = E.out5(inv(378, 383, f)) * (1 - inv(398, 402, f));
    ctx.save(); ctx.translate(lerp(1200, 640, k), 720); ctx.rotate(0.03);
    ctx.fillStyle = C.ink; ctx.fillRect(-12, -12, 304, 244);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 280, 220); ctx.clip();
    vGrad([[0, '#2a2350'], [1, '#141a44']]);
    drawPho(140, 118, 108, { expr: 'alarm', look: [0.2, -1] });
    ctx.restore();
    ctx.strokeStyle = C.paper; ctx.lineWidth = 6; ctx.strokeRect(0, 0, 280, 220);
    ctx.restore();
  }
  drawChip(['DROPPED FROM ABOUT 40 M,', 'IN FREE FALL (DLR)'], 80, 330, inv(356, 364, f) * (1 - inv(400, 406, f)), { size: 31 });
  drawChip(['ABOUT THE SIZE OF', 'A CRATE OF DRINKS (DLR)'], 80, 330, inv(410, 418, f), { size: 31 });
  if (f >= 375 && f < 392) sfxText('ズン', 140, 820, 90, { rot: -0.1, alpha: 1 - inv(388, 392, f) });
  return ['Illustration · facts: DLR, ESA'];
}

// ---------------------------------------------------------------- S7 15 GRAMS (wide f446-496, shock f496-544)
function sceneWide(f) {
  // pull out: the rover is a speck on top of Pho; it floats up on "weighs..."
  const k = E.out5(inv(446, 466, f));
  vGrad([[0, '#060818'], [1, '#22184a']]);
  stars(61, 70, { alpha: 0.7, drift: [f * 2.2, -f * 0.6] });
  ctx.save(); ctx.translate(540, 900); ctx.rotate(0.11 * E.io(inv(446, 496, f)) - 0.04); ctx.translate(-540 + 40 * inv(446, 496, f), -900);
  focusLines(540, 900, 520, { n: 70, color: C.paper, alpha: 0.18 * k, seed: 63, wMax: 10, rate: 3 });
  const ps = lerp(1100, 330, k) * (1 + inv(458, 496, f) * 0.1);
  const py = lerp(2000, 920, k);
  const fl = E.io(inv(479, 494, f));
  const look = [0.15 + Math.sin(sec(f) * 1.5) * 0.15, -1];
  const pe = { expr: f > 484 ? 'alarm' : 'grumpy', look, lid: 0.35 };
  if (k < 1) speedLines(90, { n: 30, alpha: 0.5 * (1 - k), speed: 4000, seed: 64 });
  drawPho(540, py, ps, pe, 0.02 + Math.sin(sec(f)) * 0.03);
  const ry = py - ps * 0.84 - fl * 150 + Math.sin(sec(f) * 3) * 3;
  const rs = ps * 0.24;
  drawRover(560, ry, rs, { rot: fl * 0.25 });
  // the number as a prop: a "25 KG" tag on the rover, swinging; it drifts up, weightless, on "weighs..."
  drawTag(560 + rs * 0.55, ry - rs * 0.1, '25 KG', 0.35 + Math.sin(sec(f) * 4) * 0.18 - fl * 1.1, { size: 38, len: 60 });
  if (fl > 0.05) { ctx.save(); ctx.globalAlpha = fl; ctx.strokeStyle = C.paper; ctx.lineWidth = 4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(520 + i * 40, ry + 18 + i % 2 * 6 + rs * 0.3); ctx.lineTo(520 + i * 40, ry + 50 + i % 2 * 6 + rs * 0.3); ctx.stroke(); } ctx.restore(); }
  ctx.restore();
  drawChip(['25 KG ROVER.', 'ON PHOBOS IT WEIGHS', 'THE EQUIVALENT OF', { t: '15 GRAMS (ESA)', c: C.amber }], 80, 330, inv(452, 460, f), { size: 31 });
  return ['Illustration · facts: DLR, ESA'];
}
function sceneShock(f) {
  // SHOCK close-up
  const ff = on2(f);
  vGrad([[0, '#10225c'], [1, '#050a20']]);
  // gag lightning background stripes
  ctx.save(); ctx.fillStyle = 'rgba(127,214,255,0.22)';
  for (let i = 0; i < 9; i++) { const x = hash(i, 91, Math.floor(f / 6)) * W; ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x + 30, 700); ctx.lineTo(x - 20, 720); ctx.lineTo(x + 10, H + 50); ctx.lineTo(x - 6, H + 50); ctx.lineTo(x - 40, 740); ctx.lineTo(x + 10, 720); ctx.lineTo(x - 16, -50); ctx.fill(); }
  ctx.restore();
  focusLines(540, 600, 400, { n: 130, color: C.paper, alpha: 0.5, seed: 93, wMax: 18, rate: 4 });
  const lean = kf(ff, [[496, 0], [500, 1], [523, 1], [528, 1.15]], E.out);
  const size = lerp(300, 360, lean);
  const shiver = (hash(ff, 95, 1) - 0.5) * 8;
  const p = { mouth: 'shout', open: kf(ff, [[496, 0.6], [500, 1], [520, 0.85], [526, 1]]), eyeK: kf(ff, [[496, 1.1], [500, 1.32]], E.out), pupil: 0.42, shock: 1, brow: 1.2, sweat: E.back(inv(500, 508, ff)), tuftUp: 1, earL: -0.2, earR: -0.2, rim: C.cyan, light: -1 };
  drawNSHead(540 + shiver, 610 + lean * 10, size * 0.92, p);
  sfxText('エッ!?', 515, 1010, 110, { rot: -0.1, fill: C.cyan });
  return [];
}

// ---------------------------------------------------------------- S8 STEP THREE (f544-690)
function sceneRecover(f) {
  {
    // recover: Night Shift shakes it off and gets serious
    const ff = on2(f);
    vGrad([[0, '#1a0c2c'], [1, '#08060f']]);
    focusLines(540, 760, 420, { n: 90, color: C.amber, alpha: 0.4, seed: 101, wMax: 14 });
    const shake = Math.sin(ff * 1.4) * 0.35 * (1 - inv(546, 560, ff));
    drawNSBust(540, 760, 260, { turn: shake, mouth: ff < 552 ? 'flat' : 'grit', open: 0.3, slant: lerp(0, 0.9, inv(548, 556, ff)), lidL: 0.25, lidR: 0.25, rim: C.amber, sweat: 1 - inv(546, 556, ff) }, { L: { e: [-1.8, 2.4], w: [-1.0, 1.9], paw: 'fist', front: true }, R: { e: [1.8, 2.4], w: [1.0, 1.9], paw: 'fist', front: true } }, { bottom: 5 });
    return [];
  }
}
function bandThree(f) {
  return bandShot(f, { style: 3, ci: 14, num: '3', fIn: 560, fOut: 592, prev: sceneRecover, next: sceneGrab, seed: 73 });
}
function sceneGrab(f) {
  {
    // THE GRAB: paw thrusts at the camera and closes
    const ff = on2(f);
    vGrad([[0, '#5a0f12'], [1, '#14050a']]);
    focusLines(540, 860, 330, { n: 130, color: C.amber, alpha: 0.65, seed: 111, wMax: 24, rate: 4 });
    drawNSHead(540, 470, 210, { mouth: 'grit', open: 0.5, slant: 1, lidL: 0.2, lidR: 0.2, rim: C.red, look: [0, 0.4] });
    const k = E.out5(inv(600, 606, ff));
    const close = inv(606, 612, ff);
    const ps = lerp(160, 500, k);
    const draw = (s) => {
      ctx.save(); ctx.translate(540, lerp(1500, 1080, k) + s * 160); ctx.scale(ps * (1 - s * 0.3), ps * (1 - s * 0.3)); G.S = ps;
      bigPaw(close);
      ctx.restore();
    };
    if (ff < 606) smear(draw, 3, 0.4); else draw(0);
    if (f >= 604 && f < 622) sfxText('ガシッ', 135, 740, 120, { rot: -0.12, alpha: 1 - inv(618, 622, f) });
    return [];
  }
}
function sceneCore(f) {
  // coring arm + nitrogen blaster
  const blast = sec(f) - sec(653);
  const [sx, sy] = shakeF(f, 0.8);
  ctx.save(); ctx.translate(sx, sy);
  vGrad([[0, '#060818'], [0.6, '#141a44'], [1, '#2a2350']]);
  stars(121, 50, { area: [0, 0, W, 1000], alpha: 0.6 });
  const cam = kf(f, [[630, 1.0], [652, 1.08], [656, 1.25], [686, 1.3]], E.out);
  ctx.save(); ctx.translate(540, 1000); ctx.scale(cam, cam); ctx.translate(-540, -1000);
  drawMarsCel(960, 330, 170, { light: [-0.6, -0.4] });
  drawPhoGround(540, 1160 + 0.9 * 2200, 2200, { light: -1 });
  const armK = E.back(inv(632, 644, on2(f)), 1.4);
  drawMMX(600, 790, 330, { legs: 1, arm: armK, corer: f > 644 ? 1 : 0, sampler: 1, wing: 0.7, dig: inv(644, 660, f) });
  // rock chips from the corer
  if (f > 644 && f < 680) {
    for (let i = 0; i < 8; i++) { const d = ((f - 644) * 0.06 + hash(i, 131, 1)) % 1; const x = 270 + (hash(i, 132, 1) - 0.5) * 80 + Math.cos(i) * d * 170, y = 1160 - d * 240 + d * d * 220; ctx.fillStyle = C.pho2; ctx.save(); ctx.translate(x, y); ctx.rotate(d * 6 + i); ctx.fillRect(-8, -6, 16, 12); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(-8, -6, 16, 12); ctx.restore(); }
  }
  // nitrogen blast at the right foot
  if (blast > 0) {
    const fx = 600 + 330 * 0.75 * 1.25, fy = 1160;
    const puffs = [];
    for (let i = 0; i < 14; i++) { const a = -Math.PI + (i / 13) * Math.PI; const rr = 40 + 330 * E.out(blast * 2.5) * (0.5 + hash(i, 141, 1) * 0.6); puffs.push({ x: fx + Math.cos(a) * rr * 1.1, y: fy + Math.sin(a) * rr * 0.5 - 10, r: (40 + hash(i, 142, 1) * 50) * (1 - clamp(blast * 0.7)) + 10 }); }
    cloudCluster(puffs, 700, { base: '#e6f4ff', shade: '#9cc4e6', lw: 5, alpha: 1 - inv(0.8, 1.1, blast) });
    // grains lofted up into the sampler
    for (let i = 0; i < 26; i++) { const d = clamp(blast * 1.6 - hash(i, 143, 1) * 0.5); if (d <= 0 || d >= 1) continue; const x = fx + (hash(i, 144, 1) - 0.5) * 260 * (1 - d) - 60 * d, y = fy - d * 300; ctx.fillStyle = i % 3 ? C.pho3 : C.pho2; ctx.beginPath(); ctx.arc(x, y, 5 + hash(i, 145, 1) * 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); }
  }
  ctx.restore();
  ctx.restore();
  drawChip(['CORER DIGS TO 2 CM (JAXA)'], 80, 330, inv(634, 642, f) * (1 - inv(652, 656, f)), { size: 31 });
  drawChip(['BURSTS OF HIGH-PRESSURE', 'NITROGEN GAS (NASA)'], 80, 330, inv(656, 664, f), { size: 31 });
  if (blast > 0 && blast < 0.6) sfxText('バシュッ', 450, 640, 110, { rot: -0.1, fill: C.cyan, alpha: 1 - inv(0.45, 0.6, blast) });
  // Pho inset: flinch
  if (f >= 662 && f < 690) {
    const k = E.out5(inv(662, 667, f)) * (1 - inv(684, 690, f));
    ctx.save(); ctx.translate(lerp(-400, 80, k), 470); ctx.rotate(-0.03);
    ctx.fillStyle = C.ink; ctx.fillRect(-12, -12, 304, 244);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 280, 220); ctx.clip();
    vGrad([[0, '#2a2350'], [1, '#141a44']]);
    drawPho(140 + (hash(f, 3, 3) - 0.5) * 8, 115, 108, { expr: 'flinch', sweat: 1 });
    ctx.restore();
    ctx.strokeStyle = C.paper; ctx.lineWidth = 6; ctx.strokeRect(0, 0, 280, 220);
    ctx.restore();
  }
  return ['Illustration · facts: JAXA, NASA'];
}
// big paw facing the camera: open palm with pads, then a fist (close 0..1). units: ~1 = paw radius
function bigPaw(close) {
  const c = clamp(close);
  cel(() => { ctx.beginPath(); ctx.ellipse(0, 0.82, 0.7, 0.36, 0, 0, Math.PI * 2); }, { fill: C.paper2, shade: C.paper3, shadeFn: () => ctx.rect(-1, 0.86, 2, 1), line: C.ink, lw: 0.035 });
  if (c < 0.5) {
    const palm = ellPts(0, 0.15, 0.62, 0.58, 14);
    cel(() => shapePath(palm, 1300), { fill: C.fur, keyline: C.paper, keyW: 0.05, shade: C.fur2, shadeFn: () => ctx.ellipse(-0.4, 0.4, 0.5, 0.5, 0, 0, Math.PI * 2) });
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.48 * (1 - c * 0.6);
      const d = lerp(0.84, 0.62, c * 2);
      const x = Math.cos(a) * d, y = 0.12 + Math.sin(a) * d;
      cel(() => shapePath(ellPts(x, y, 0.21, 0.25, 10, a + Math.PI / 2), 1310 + i), { fill: C.fur, keyline: C.paper, keyW: 0.04 });
      ctx.fillStyle = '#b5677a'; ctx.beginPath(); ctx.ellipse(x * 0.95, y + 0.02, 0.09, 0.11, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#b5677a'; shapePath([[-0.28, 0.32], [0, 0.12], [0.28, 0.32], [0.18, 0.5], [-0.18, 0.5]], 1320); ctx.fill();
  } else {
    // fist: knuckles toward the camera, fingers curled, thumb across
    cel(() => shapePath([[-0.62, -0.2], [-0.5, -0.42], [0.5, -0.42], [0.64, -0.2], [0.6, 0.45], [0.3, 0.62], [-0.35, 0.62], [-0.62, 0.42]], 1330), { fill: C.fur, keyline: C.paper, keyW: 0.06, shade: C.fur2, shadeFn: () => ctx.rect(-0.7, 0.2, 1.4, 0.5) });
    for (let i = 0; i < 4; i++) {
      const x = -0.42 + i * 0.28;
      cel(() => shapePath(ellPts(x, -0.3, 0.15, 0.13, 10), 1340 + i), { fill: C.fur3, line: C.paper, lw: 0.025 });
      inkLine([[x, -0.12], [x + 0.01, 0.12]], 1350 + i, { color: C.furLine, lw: 0.03 });
    }
    cel(() => shapePath([[-0.62, 0.22], [-0.1, 0.18], [0.18, 0.28], [0.1, 0.42], [-0.6, 0.45]], 1360), { fill: C.fur, line: C.paper, lw: 0.03 });
  }
}

// ---------------------------------------------------------------- S9 TARGET 10 g (f687-750)
function shotTen(f) {
  const cx = 540, cy = 690, R = 372;
  vGrad([[0, '#05060d'], [1, '#100a1e']]);
  const z1 = E.out5(inv(706, 710, f)), z2 = E.out5(inv(723, 727, f));
  const lockK = f >= 723 ? 1 : 0;
  // housing: focus lines around the scope (red once locked)
  focusLines(cx, cy, R + 30, { n: 80, color: lockK ? C.red : C.night3, alpha: lockK ? 0.55 : 0.45, seed: 701, wMax: 14, rate: 4, reach: 1500 });
  const iris = E.out5(inv(687, 693, f));
  // what the scope sees: Pho, a handheld sway that settles, the aim walks onto the patch
  const size = 230 * (1 + 0.85 * z1) * (1 + 0.95 * z2) * (1 + 0.05 * inv(687, 758, f));
  const sway = (1 - 0.8 * lockK) * (1 - 0.5 * z1);
  const aim0 = [lerp(1.35, 0.15, E.io(inv(687, 702, f))), lerp(-0.85, -0.1, E.io(inv(687, 702, f)))];
  const aim = [lerp(lerp(aim0[0], -0.25, z1), -0.62, z2) + Math.sin(sec(f) * 2.3) * 0.07 * sway, lerp(lerp(aim0[1], 0.0, z1), 0.12, z2) + Math.sin(sec(f) * 3.1 + 1) * 0.05 * sway];
  const rot = -0.04;
  const px = cx - (Math.cos(rot) * aim[0] - Math.sin(rot) * aim[1]) * size, py = cy - (Math.sin(rot) * aim[0] + Math.cos(rot) * aim[1]) * size;
  if (iris > 0) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * iris, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, cy - R, 0, cy + R); g.addColorStop(0, '#0b0f2a'); g.addColorStop(1, '#2a1240'); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    stars(151, 40, { alpha: 0.7, area: [cx - R, cy - R, 2 * R, 2 * R], drift: [aim[0] * -120 * (1 + z1 + z2), aim[1] * -120] });
    const fur = f >= 714, alarm = f >= 706;
    drawPho(px, py, size, { expr: fur ? 'furious' : alarm ? 'alarm' : 'grumpy', vein: fur ? E.back(inv(714, 720, f)) : 0, look: alarm ? [0, 0] : [0.8, -0.3], piece: 1, shake: lockK ? 6 : fur ? 3 : 0, sweat: lockK ? 1 : 0 }, rot);
    // zoom snaps: radial streaks inside the scope
    for (const [a, b] of [[706, 712], [723, 729]]) if (f >= a && f < b) focusLines(cx, cy, 90, { n: 70, color: C.paper, alpha: 0.6 * (1 - inv(a, b, f)), seed: 703 + a, wMax: 8, rate: 1, reach: R });
    // crosshair (no numbers: tick marks only)
    ctx.strokeStyle = lockK ? C.red : 'rgba(242,239,232,0.75)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx - 60, cy); ctx.moveTo(cx + 60, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy - 60); ctx.moveTo(cx, cy + 60); ctx.lineTo(cx, cy + R); ctx.stroke();
    for (let i = -6; i <= 6; i++) if (i) { const d = i * 46; ctx.beginPath(); ctx.moveTo(cx + d, cy - 10); ctx.lineTo(cx + d, cy + 10); ctx.moveTo(cx - 10, cy + d); ctx.lineTo(cx + 10, cy + d); ctx.stroke(); }
    // lock brackets close on the patch
    const bk = E.back(inv(723, 729, f), 2);
    if (bk > 0) {
      const rr = lerp(260, 120, bk);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((1 - bk) * 0.8 + sec(f) * 0.25); ctx.strokeStyle = C.red; ctx.lineWidth = 10; ctx.lineCap = 'square';
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(rr, rr * 0.5); ctx.lineTo(rr, rr); ctx.lineTo(rr * 0.5, rr); ctx.stroke(); }
      ctx.restore();
    }
    // lens vignette
    const vg = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = vg; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.restore();
  }
  // scope bezel: thick cel ring with ticks that turn on every zoom stage
  ctx.save(); ctx.translate(cx, cy);
  const br = R * Math.max(iris, 0.02);
  ctx.lineWidth = 44; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, br + 22, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 30; ctx.strokeStyle = '#2b2f45'; ctx.beginPath(); ctx.arc(0, 0, br + 22, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = C.paper; ctx.beginPath(); ctx.arc(0, 0, br + 46, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(0.5 * z1 + 0.5 * z2 + sec(f) * 0.05);
  ctx.strokeStyle = lockK ? C.red : C.amber; ctx.lineWidth = 6;
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, l = i % 3 ? 10 : 22; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (br + 10), Math.sin(a) * (br + 10)); ctx.lineTo(Math.cos(a) * (br + 10 + l), Math.sin(a) * (br + 10 + l)); ctx.stroke(); }
  ctx.restore();
  drawChip(['HAYABUSA2 AIMED FOR 0.1 G', 'AND GOT 5.4 G (JAXA)'], 80, 330, inv(728, 736, f), { size: 31 });
  if (f >= 723 && f < 744) sfxText('ロックオン', 550, 1150, 64, { rot: -0.08, fill: C.red, alpha: 1 - inv(740, 744, f) });
  return ['Illustration · facts: JAXA'];
}

// ---------------------------------------------------------------- S10 STEP FOUR (f747-913)
function bandFour(f) {
  return bandShot(f, { style: 4, ci: 19, num: '4', fIn: 758, fOut: 784, prev: shotTen, next: sceneBurn, seed: 74, faceP: { mouth: 'smirk', slant: 0.4, lidL: 0.15, lidR: 0.3, glint: 1 } });
}
function sceneBurn(f) {
  return sceneBurnInner(f);
}
function sceneBurnInner(f) {
  {
    // one burn to leave Mars
    const burnT = sec(f) - sec(802);
    const away = E.in(clamp(burnT / 1.4));
    const [sx, sy] = shakeF(f, 0.9);
    ctx.save(); ctx.translate(sx, sy);
    vGrad([[0, '#070818'], [1, '#1a1030']]);
    stars(161, 80, { drift: [-away * 500, away * 700], alpha: 0.7 });
    const recede = lerp(1, 0.45, away);
    drawMarsCel(260 + away * -60, 1620 + away * 300, 720 * recede, { light: [0.7, -0.6] });
    drawPho(260 + away * 40, 560 + away * 240, 110 * recede, { expr: burnT > 0.1 ? 'furious' : 'grumpy', vein: burnT > 0.1 ? 1 : 0, look: [1, -0.3], shake: burnT > 0 ? 6 : 0 });
    // anticipation before the burn: MMX settles back, shivers, the engine glows
    const pre = burnT < 0 ? inv(790, 802, f) : 0;
    const vib = pre > 0 ? (hash(f, 171, 1) - 0.5) * 10 * pre : 0;
    const mx = lerp(620, 1250, away) - E.in(pre) * 46 + vib, my = lerp(880, -300, away) + E.in(pre) * 56 + vib * 0.6;
    const ang = -0.75;
    if (pre > 0) radGlow(mx - 110, my + 120, 70 + 120 * pre, `rgba(255,170,80,${0.55 * pre})`);
    if (burnT > 0) {
      speedLines(-55, { n: 36, alpha: 0.5 * clamp(burnT * 3), speed: 4200, seed: 162 });
      // exhaust burst behind the engine
      const ex = mx - Math.sin(ang) * -1 * 0, ey = my;
      const puffs = []; for (let i = 0; i < 12; i++) { const d = clamp(burnT * 2 - hash(i, 163, 1) * 0.4); if (d <= 0) continue; puffs.push({ x: ex - (220 + 380 * d) * 0.6 + (hash(i, 164, 1) - 0.5) * 220, y: ey + (220 + 380 * d) * 0.8 + (hash(i, 165, 1) - 0.5) * 160, r: 40 + 80 * d * hash(i, 166, 1) + 20 }); }
      cloudCluster(puffs, 800, { base: '#f3e6d0', shade: '#b8a58f', warm: 0.6, warmC: '#ff8a3d', lightDir: [0.6, -0.8], lw: 5, alpha: 1 - inv(1.0, 1.4, burnT) });
    }
    const draw = (s) => drawMMX(mx - s * 160, my + s * 220, 220 * (1 - away * 0.3), { rot: ang + Math.PI * 0.0, burn: burnT > 0 ? 1.4 : 0, legs: 0 });
    if (burnT > 0.2) smear(draw, 4, 0.35); else draw(0);
    ctx.restore();
    if (burnT > 0 && burnT < 0.6) sfxText('ゴオッ', 120, 760, 110, { rot: -0.12, alpha: 1 - inv(0.45, 0.6, burnT) });
    return ['Illustration · facts: JAXA'];
  }
}
function sceneCapsule(f) {
  return sceneCapsuleInner(f);
}
function sceneCapsuleInner(f) {
  // capsule lands in Australia, 2031
  const k = sec(f) - sec(846);
  const push = E.io(inv(866, 900, f));
  vGrad([[0, '#040714'], [1, '#0d1638']]);
  stars(171, 70, { alpha: 0.7 });
  const er = lerp(400, 560, push), ex = 540, ey = lerp(900, 960, push);
  const lon0 = 122 + 18 * inv(846, 913, f);
  drawEarthCel(ex, ey, er, { light: [-0.7, -0.5], lon0 });
  const land = earthPt(ex, ey, er, 134, -26, lon0);
  // capsule path from the upper right into Australia
  const ck = E.out(clamp(k / 0.8));
  const cx = lerp(1020, land[0], ck), cy = lerp(240, land[1], ck);
  if (ck < 1) {
    speedLines(125, { n: 16, alpha: 0.5, speed: 3600, seed: 172, area: [cx - 300, cy - 300, 600, 600], len: [100, 400], w: [2, 6] });
    const draw = (s) => drawCapsule(cx + s * 90, cy - s * 70, 80, { rot: Math.atan2(land[1] - 240, land[0] - 1020) - Math.PI / 2, plasma: 1 - ck * 0.5 });
    smear(draw, 3, 0.35);
  }
  // landing marker: an amber dot and its echo ring
  if (ck >= 1) {
    const d = sec(f) - sec(846) - 0.8;
    ctx.fillStyle = C.amber; ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(land[0], land[1], 18 * E.back(clamp(d * 6)), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 2; i++) { const dd = (d * 1.2 + i * 0.5) % 1; ctx.strokeStyle = `rgba(245,184,61,${1 - dd})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(land[0], land[1], 20 + dd * 120, 0, Math.PI * 2); ctx.stroke(); }
  }
  drawChip(['SAMPLE CAPSULE: ABOUT 60 CM', 'ACROSS, WITH A HEAT SHIELD (ESA)'], 80, 330, inv(850, 858, f), { size: 31 });
  if (f >= 886 && f < 905) sfxText('ドン', 615, 640, 110, { rot: 0.1, alpha: 1 - inv(900, 905, f) });
  return ['Illustration · facts: JAXA, ESA, NASA'];
}

// ---------------------------------------------------------------- S11 LOOT (f913-1032)
function sceneLoot(f) {
  const ff = on2(f);
  vGrad([[0, '#1d0f33'], [1, '#07060d']]);
  // diagonal amber stripes sweep in (no white flash), then keep sliding
  const sw = E.out5(inv(913, 921, f));
  ctx.save(); ctx.translate(540 + (1 - sw) * 1400, 900); ctx.rotate(-0.5); ctx.fillStyle = 'rgba(245,184,61,0.14)';
  for (let i = -7; i < 8; i++) ctx.fillRect(i * 190 + (f * 3) % 190, -1700, 70, 3400);
  ctx.restore();
  focusLines(540, 760, 470, { n: 70, color: C.amber, alpha: 0.18, seed: 917, wMax: 10, rate: 3 });
  const ent = E.out5(inv(913, 921, ff));
  const raise = E.back(inv(936, 944, ff), 1.8);
  const p = { turn: -0.32, mouth: 'smirk', open: speak(f) * 0.7, slant: 0.45, lidL: 0.15, lidR: 0.55, brow: 0.3, glint: kf(ff, [[928, 0], [934, 1.2]], E.out), rim: C.amber, look: lerp(-0.2, -0.75, raise) > -1 ? [lerp(-0.2, -0.7, raise), lerp(0.1, -0.5, raise)] : [-0.5, 0.1] };
  const L = { e: [lerp(-1.9, -2.15, raise), lerp(2.4, 1.25, raise)], w: [lerp(-1.5, -1.95, raise), lerp(3.2, 0.2, raise)], paw: 'mitt', front: true };
  const bx = 600, by = lerp(1000, 780, ent), bs = 200;
  drawNSBust(bx, by, bs, p, { L, R: { e: [1.75, 2.3], w: [0.78, 1.05], paw: 'mitt', front: true } }, { bottom: 7 });
  // the loot: a canister (drawn) held up on "loot?"
  if (raise > 0.001) {
    const wx = bx + L.w[0] * bs, wy = by + L.w[1] * bs;
    drawCanister(wx + 4, wy - 0.62 * bs * 0.75, bs * 0.62, { tag: inv(940, 946, f), rot: -0.08 + Math.sin(sec(f) * 2.5) * 0.04 });
    for (let i = 0; i < 4; i++) { const tw = (sec(f) * 1.6 + i * 0.25) % 1; kira(wx - 120 + hash(i, 185, 1) * 240, wy - 280 + hash(i, 186, 1) * 200, 34 * Math.sin(tw * Math.PI), C.amber3, tw); }
  }
  for (let i = 0; i < 5; i++) { const tw = (sec(f) * 2 + i * 0.37) % 1; kira(560 + hash(i, 181, 1) * 340, 340 + hash(i, 182, 1) * 300, 30 * Math.sin(tw * Math.PI), C.amber3, tw); }
  return raise > 0.001 ? ['Illustration · facts: JAXA, ESA'] : [];
}
function sceneFirst(f) {
  // FIRST piece of Phobos (real photo) presented like treasure: rotating rays behind, a pop-in, a slow push
  vGrad([[0, '#07070d'], [1, '#120c18']]);
  const k = inv(949, 999, f);
  ctx.save(); ctx.translate(540, 760); ctx.rotate(sec(f) * 0.6);
  for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? 'rgba(245,184,61,0.2)' : 'rgba(245,184,61,0.07)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1500, -150); ctx.lineTo(1500, 150); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  const pop = E.back(inv(949, 956, f), 1.8);
  const pw = lerp(820, 980, pop) + E.io(k) * 140;
  focusLines(540, 760, pw * 0.55, { n: 110, color: C.amber, alpha: 0.4, seed: 191, wMax: 14, rate: 3 });
  radGlow(540, 760, pw * 0.75, 'rgba(245,184,61,0.18)');
  drawImg('phobos', 540, 760, pw, lerp(-6, 5, k));
  for (let i = 0; i < 6; i++) { const tw = (sec(f) * 1.4 + i / 6) % 1, a = i / 6 * Math.PI * 2 + sec(f) * 0.6; kira(540 + Math.cos(a) * pw * 0.55, 760 + Math.sin(a) * pw * 0.52, 40 * Math.sin(tw * Math.PI), C.amber3, tw * 2); }
  return [CR.phobos];
}
// back of Night Shift's head and shoulders (over-the-shoulder shots); rim light from a screen
function sceneEarthset(f) {
  const SX = 160, SY = 380, SW = 760, SH = 640, scx = SX + SW / 2, scy = SY + SH / 2;
  const pull = E.io(inv(999, 1010, f));
  const cam = lerp(1080 / SW * 1.02, 1, pull) * (1 + 0.1 * E.io(inv(1008, 1040, f)));
  // camera: the screen starts filling the frame (continuing the previous shot), then pulls back
  ctx.save();
  ctx.translate(540, 760); ctx.scale(cam, cam); ctx.translate(-scx, -scy);
  ctx.translate(0, (1 - pull) * 0);
  // the room: dark HQ, screen glow on the wall
  vGrad([[0, '#090c22'], [1, '#04050c']], -400, 2300);
  radGlow(scx, scy, 900, 'rgba(127,214,255,0.16)');
  // desk edge and a few panel lines on the wall (cel)
  ctx.fillStyle = '#0d1030'; ctx.fillRect(-400, 1180, 1900, 900);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-400, 1180); ctx.lineTo(1500, 1180); ctx.stroke();
  ctx.strokeStyle = 'rgba(127,214,255,0.12)'; ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-400, 200 + i * 230); ctx.lineTo(100, 200 + i * 230); ctx.moveTo(980, 220 + i * 230); ctx.lineTo(1500, 220 + i * 230); ctx.stroke(); }
  // monitor bezel
  cel(() => { ctx.beginPath(); ctx.roundRect(SX - 34, SY - 34, SW + 68, SH + 68, 26); }, { fill: '#1b1e33', shade: '#11131f', shadeFn: () => ctx.rect(SX - 40, SY + SH * 0.6, SW + 80, SH), line: C.ink, lw: 8, keyline: C.paper, keyW: 16 });
  ctx.fillStyle = '#2b2f45'; ctx.fillRect(scx - 60, SY + SH + 34, 120, 110); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.strokeRect(scx - 60, SY + SH + 34, 120, 110);
  ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(SX + SW + 10, SY + SH + 14, 7, 0, Math.PI * 2); ctx.fill();
  // screen content
  const sw = E.io(inv(1004, 1010, f));      // channel switch (wipe) from the Phobos photo to PIA26362
  ctx.save(); ctx.beginPath(); ctx.rect(SX, SY, SW, SH); ctx.clip();
  ctx.fillStyle = '#000'; ctx.fillRect(SX, SY, SW, SH);
  const wipeX = SX + SW * sw;
  if (sw < 1) {
    ctx.save(); ctx.beginPath(); ctx.rect(wipeX, SY, SW, SH); ctx.clip();
    // the previous shot, mapped into the screen (so the cut is invisible at the first frame)
    const s0 = SW / 1080 / 1.02;
    ctx.translate(scx, scy); ctx.scale(s0, s0); ctx.translate(-540, -760);
    sceneFirst(f);
    ctx.restore();
  }
  if (sw > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(SX, SY, wipeX - SX, SH); ctx.clip();
    const im = IMG.earthset;
    const ix0 = 36, iy0 = 36, iw = 345, ih = 301;              // the photo's inset (Phobos and Earth), in photo pixels
    const zs = SW / iw * 1.24 * (1 + 0.08 * inv(1010, 1038, f));
    const icx = 212 + Math.sin(sec(f) * 0.9) * 4, icy = 182;
    ctx.translate(scx, scy); ctx.scale(zs, zs); ctx.translate(-icx, -icy);
    ctx.drawImage(im, ix0, iy0, iw, ih, ix0, iy0, iw, ih);
    ctx.restore();
    // amber echo ring on the small blue dot (Earth), no label
    if (f >= 1014) {
      const zs2 = SW / 345 * 1.24 * (1 + 0.08 * inv(1010, 1038, f));
      const ex = scx + (296 - (212 + Math.sin(sec(f) * 0.9) * 4)) * zs2, ey = scy + (176.5 - 182) * zs2;
      for (let i = 0; i < 2; i++) { const d = ((f - 1014) / 24 + i * 0.5) % 1; ctx.strokeStyle = `rgba(245,184,61,${0.9 * (1 - d)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(ex, ey, 24 + d * 80, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
  // wipe edge (a bright scan bar, amber)
  if (sw > 0 && sw < 1) { ctx.fillStyle = C.amber; ctx.fillRect(wipeX - 6, SY, 12, SH); }
  // screen glass glare (a cel band on the bezel side, not over the photo centre)
  ctx.restore();
  // Night Shift, over the shoulder (lower left), lit by the screen; leans in on "home"
  const lean = E.out(inv(1016, 1024, on2(f)));
  drawNSBack(330 + lean * 20, 1470 - lean * 30, 270, { tilt: 0.06 + lean * 0.06, earL: -0.1 - 0.15 * lean, earR: 0.1 * Math.sin(sec(f) * 3), rim: C.cyan });
  ctx.restore();
  return sw < 1 ? [CR.phobos, CR.earthset] : [CR.earthset];
}
// ---------------------------------------------------------------- S12 NEXT (f1030-1166)
function bandNext(f) {
  return bandShot(f, { style: 'next', ci: 27, num: '', fIn: 1038, fOut: 1056, prev: sceneEarthset, next: sceneElectron, seed: 75, faceP: { mouth: 'w', look: [-0.6, 0.4], brow: 0.3, glint: 0.45 }, stamp: { f: 1047, t: 'WED 21 OCT', x: -170, y: 124, rot: 0.04, size: 54 } });
}
function sceneElectron(f) {
  return sceneElectronInner(f);
}
function sceneElectronInner(f) {
  // the camera never holds: a parallax truck (stars slow, rocket medium, Night Shift and the rock fast)
  // plus a slow push; the three satellites fly in on "three" and are loaded into the nose on "satellites"
  const pan = E.io(inv(1048, 1166, f));
  const cz = 1 + 0.14 * pan, pivot = [640, 900];
  const rx = lerp(-110, 70, pan);
  vGrad([[0, '#050716'], [0.7, '#141a44'], [1, '#2a1f45']]);
  stars(201, 80, { alpha: 0.7, area: [0, 0, W, 1300], drift: [-f * 0.5 + pan * 70, 0] });
  const L = (x, y) => [pivot[0] + cz * (x + rx - pivot[0]), pivot[1] + cz * (y - pivot[1])];  // rocket layer -> screen
  ctx.save(); ctx.translate(pivot[0], pivot[1]); ctx.scale(cz, cz); ctx.translate(-pivot[0] + rx, -pivot[1]);
  // sea and coast (night)
  ctx.fillStyle = '#0a1230'; ctx.fillRect(-500, 1380, W + 1000, 700);
  ctx.strokeStyle = 'rgba(127,214,255,0.25)'; ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const y = 1400 + i * 22; const x = (hash(i, 202, 1) * 900 + f * (1.5 + i * 0.3)) % 1400 - 250; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 80 + i * 6, y); ctx.stroke(); }
  cel(() => shapePath([[300, 1500], [460, 1420], [700, 1395], [920, 1405], [1350, 1450], [1350, 1800], [300, 1800]], 210), { fill: '#141322', line: C.ink, lw: 5 });
  // searchlights sweep
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#cfe3f0';
  for (const [x0, a] of [[560, -1.25 + Math.sin(sec(f) * 1.7) * 0.2], [880, -1.9 + Math.sin(sec(f) * 2.1 + 1) * 0.2]]) { ctx.beginPath(); ctx.moveTo(x0, 1410); ctx.lineTo(x0 + Math.cos(a - 0.07) * 1800, 1410 + Math.sin(a - 0.07) * 1800); ctx.lineTo(x0 + Math.cos(a + 0.07) * 1800, 1410 + Math.sin(a + 0.07) * 1800); ctx.fill(); }
  ctx.restore();
  // strongback + rocket
  ctx.fillStyle = '#1e2240'; ctx.fillRect(785, 520, 34, 890); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(785, 520, 34, 890);
  for (let i = 0; i < 9; i++) { ctx.strokeStyle = '#2c3266'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(785, 560 + i * 95); ctx.lineTo(740, 560 + i * 95); ctx.stroke(); }
  drawElectron(700, 1400, 76, { glow: 0.4 + 0.2 * Math.sin(sec(f) * 3) });
  ctx.restore();
  const nz = L(700, 1400 - 12.6 * 76);
  // three satellites: fly in on "three" (1094), bob in a row, then dive into the nose one by one (1124 on)
  [1094, 1098, 1102].forEach((fs, i) => {
    const k = E.out(inv(fs, fs + 12, f)); if (k <= 0) return;
    const ld = E.in(inv(1124 + i * 5, 1132 + i * 5, f));
    if (ld >= 1) {
      // a small amber pop at the nose as each one goes in
      const d = (f - (1132 + i * 5)) / 10; if (d < 1) { ctx.strokeStyle = `rgba(245,184,61,${1 - d})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(nz[0], nz[1], 14 + d * 60, 0, Math.PI * 2); ctx.stroke(); }
      return;
    }
    const tx = 260 + i * 185 + rx * 0.6, ty = 610 + (i === 1 ? -36 : 0);
    let x = lerp(-260, tx, k) + Math.sin(sec(f) * 2 + i) * 8 * k, y = lerp(980 - i * 60, ty, k) + Math.sin(sec(f) * 2.4 + i) * 10;
    x = lerp(x, nz[0], ld); y = lerp(y, nz[1], ld);
    const sc = 66 * (1 - 0.8 * ld);
    if (k < 1) speedLines(-18, { n: 10, alpha: 0.6 * (1 - k), speed: 4200, seed: 230 + i, area: [x - 320, y - 90, 380, 180], len: [80, 240], w: [2, 5] });
    const draw = (s) => drawSat(x - s * 140 * (1 - ld) - s * (nz[0] - x) * 0.3 * ld, y + s * 30, sc, { rot: -0.25 + i * 0.12 + (1 - k) * 0.6 + Math.sin(sec(f) * 1.5 + i) * 0.08 + ld * 1.2 });
    if (k < 1 || ld > 0) smear(draw, 3, 0.35); else draw(0);
  });
  // Night Shift on the headland (whole head above y 1500), pointing at the rocket, then a fist pump on "Wednesday"
  const up = E.back(inv(1058, 1068, on2(f)), 1.6);
  const pump = E.back(inv(1141, 1147, on2(f)), 2);
  const cx = lerp(150, 330, pan);
  const cy = lerp(1700, 930, up) + (f > 1141 ? -16 * Math.max(0, Math.sin(sec(f - 1141) * 9)) * (1 - inv(1141, 1160, f)) : 0) + Math.sin(sec(f) * 2.2) * 5;
  const jab = 0.3 * Math.max(0, Math.sin(Math.PI * inv(1094, 1100, on2(f))));
  const pR = pump > 0 ? { e: [2.0, 1.4], w: [lerp(2.7, 1.85, pump), lerp(-0.6, 0.15, pump)], paw: pump > 0.5 ? 'fist' : 'point', front: true, pr: lerp(-1.0, -1.5, pump) } : { e: [2.0, 0.6 - jab], w: [2.7 + jab, -0.6 - jab], paw: 'point', front: true, pr: -1.0 };
  drawNSBust(cx, cy, 128, { turn: 0.35, mouth: f > 1141 ? 'grin' : 'w', open: speak(f) * 0.8 + (f > 1141 ? 0.3 : 0), look: f > 1124 && f < 1141 ? [0.9, -0.9] : [0.7, -0.6], brow: 0.4, rim: C.cyan, light: 1, blink: 0, glint: kf(f, [[1141, 0], [1145, 1.1], [1160, 0.3]], E.out) }, { R: pR, L: { e: [-1.6, 2.4], w: [-1.3, 3.3], paw: 'mitt' } }, { bottom: 4 });
  // foreground rock lip hides his jacket hem (he never touches the frame bottom)
  const fx = lerp(-150, 90, pan);
  cel(() => shapePath([[-160 + fx, 1400], [150 + fx, 1355], [390 + fx, 1375], [560 + fx, 1440], [640 + fx, 2000], [-160 + fx, 2000]], 240), { fill: '#0b0a16', line: C.ink, lw: 6, shade: '#07060f', shadeFn: () => ctx.rect(-300, 1600, 1200, 500) });
  // date chip from "Next:" on: the facts of the NEXT line, with the date
  drawChip(['ROCKET LAB ELECTRON', 'THREE HAWKEYE 360 SATELLITES', { t: 'WED 21 OCT', c: C.amber }], 80, 330, inv(1050, 1056, f), { size: 30 });
  // date stamp slam on "Wednesday"
  const dk = E.back(inv(1141, 1147, f), 2);
  if (dk > 0) {
    ctx.save(); ctx.translate(490, 690); ctx.rotate(-0.06); ctx.scale(dk, dk);
    ctx.font = '400 88px "Dela Gothic One"'; ctx.lineJoin = 'round';
    const tw = ctx.measureText('WED 21 OCT').width;
    ctx.fillStyle = C.red2; ctx.fillText('WED 21 OCT', -tw / 2 + 6, 8);
    ctx.strokeStyle = C.paper; ctx.lineWidth = 20; ctx.strokeText('WED 21 OCT', -tw / 2, 0);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 11; ctx.strokeText('WED 21 OCT', -tw / 2, 0);
    ctx.fillStyle = C.amber; ctx.fillText('WED 21 OCT', -tw / 2, 0);
    ctx.restore();
  }
  return ['Illustration · facts: Launch Library 2'];
}
// ---------------------------------------------------------------- S13 END CARD (f1162-1260)
function shotEnd(f) {
  const ff = on2(f);
  vGrad([[0, '#05060d'], [0.6, '#11142e'], [1, '#2a1a3e']]);
  const hd = endHead(f);
  // echo rings ripple out from behind him: a signal and its echo, all through the card
  ctx.save(); ctx.translate(540, 1250); ctx.rotate(sec(f) * 0.3);
  for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? 'rgba(245,184,61,0.10)' : 'rgba(245,184,61,0.04)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1700, -170); ctx.lineTo(1700, 170); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  for (let i = 0; i < 4; i++) { const d = ((f - 1162) / 48 + i / 4) % 1; ctx.strokeStyle = `rgba(245,184,61,${0.45 * (1 - d)})`; ctx.lineWidth = i % 2 ? 10 : 22; ctx.beginPath(); ctx.arc(540, 1250, 160 + d * 900, 0, Math.PI * 2); ctx.stroke(); }
  focusLines(540, 1300, 560, { n: 90, color: C.amber, alpha: 0.24, seed: 221, wMax: 16, rate: 3 });
  stars(223, 40, { alpha: 0.6, area: [0, 0, W, 1100], drift: [f * 0.4, 0] });
  // low-angle hero: salute, a wink, eyes glint on the logo notes
  const sal = E.back(inv(1167, 1175, ff), 1.8);
  const flick = E.out(inv(1212, 1218, ff));
  const wink = f >= 1236 && f < 1250 ? 1 : 0;
  const p = { turn: -0.15, tilt: 0.04, mouth: f >= 1210 ? 'smirk' : 'w', open: speak(f) * 0.8, slant: 0.35, lidL: 0.1, lidR: wink ? 1 : 0.15, glint: kf(f, [[1211, 0], [1215, 1.1], [1228, 0]], E.out), look: [-0.1, 0.35], rim: C.amber, blink: 0 };
  const salW = [lerp(1.6, 1.5 + flick * 0.9, sal), lerp(2.6, -0.5 - flick * 0.45, sal)];
  const salE = [lerp(1.9, 2.35 + flick * 0.3, sal), lerp(2.6, 0.75 - flick * 0.3, sal)];
  drawNSBust(hd.x, hd.y, hd.s, p, { R: { e: salE, w: salW, paw: 'flat', front: true, pr: lerp(0, -2.5 + flick * 0.9, sal) }, L: { e: [-1.8, 2.5], w: [-1.5, 3.4], paw: 'mitt' } }, { bottom: 5, flap: 1 });
  speedLines(185, { n: 14, alpha: 0.25, speed: 2400, seed: 222, len: [150, 500], w: [2, 5] });
  drawWordmark(f);
  return [];
}
// the wordmark lands on "Downlink Cat" (f1184-1200) and holds through the sonic logo. The echo mark
// (amber dot + hollow ring) flies out of Night Shift's eyes into place; it pulses on the logo note (1212)
// and on its echo (1224). DOWNLINK paper, CAT amber.
function drawWordmark(f) {
  const note = 1212, echo = 1224, land = 1185;
  ctx.save();
  const size = 120;
  ctx.font = `800 ${size}px Archivo`; ctx.fontStretch = 'normal';
  const wD = ctx.measureText('DOWNLINK ').width, wC = ctx.measureText('CAT').width;
  const r = size * 0.3, gap = r * 60 / 22, sw = r * 6 / 22 * 2;
  const markW = r * 2 + gap + 34;
  const total = markW + wD + wC;
  const sc = Math.min(1, 740 / total);
  const x0 = 490 - total * sc / 2, y0 = 640;
  const my = -size * 0.36;
  // slab behind
  const sk = E.out5(inv(land - 6, land, f));
  ctx.save(); ctx.translate(x0, y0); ctx.scale(sc, sc);
  if (sk > 0) { ctx.fillStyle = 'rgba(11,11,12,0.9)'; ctx.save(); ctx.transform(1, 0, -0.18, 1, 0, 0); ctx.fillRect(-40, -size * 0.95, (total + 80) * sk, size * 1.35); ctx.fillStyle = C.amber; ctx.fillRect(-40, size * 0.4 - 8, (total + 80) * sk, 8); ctx.restore(); }
  ctx.restore();
  // echo mark: flies from the eyes (f1176-1185), then pulses with the logo
  const hd = endHead(f);
  const fk = E.io(inv(1176, land, f));
  const eyeD = [hd.x + (-0.41 - 0.036) * hd.s, hd.y], eyeR = [hd.x + (0.41 - 0.036) * hd.s, hd.y], er = 0.3 * hd.s;
  const dotT = [x0 + r * sc, y0 + my * sc], ringT = [x0 + (r + gap) * sc, y0 + my * sc];
  if (fk > 0) {
    const arc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(Math.PI * k) * 160];
    const pulse = (fs) => { const d = (f - fs) / 6; return d > 0 && d < 1 ? 1 + 0.35 * Math.sin(Math.PI * d) : 1; };
    const drawMark = (k, alpha = 1) => {
      ctx.save(); ctx.globalAlpha *= alpha;
      const pd = arc(eyeD, dotT, k), pr = arc(eyeR, ringT, k);
      const rd = lerp(er, r * sc, k) * pulse(note), rr = lerp(er, r * sc, k) * pulse(echo);
      ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(pd[0], pd[1], rd, 0, Math.PI * 2); ctx.fill();
      const lw = sw * sc * (k < 1 ? lerp(er / (r * sc), 1, k) : 1);
      ctx.strokeStyle = C.amber; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(pr[0], pr[1], Math.max(1, rr - lw / 2), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    };
    if (fk < 1) { for (let i = 3; i >= 1; i--) drawMark(Math.max(0, fk - i * 0.08), 0.25); }
    drawMark(fk);
    // pulse rings on the logo notes
    for (const [fs, c] of [[note, dotT], [echo, ringT]]) { const d = (f - fs) / 18; if (d > 0 && d < 1) { ctx.strokeStyle = `rgba(245,184,61,${1 - d})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(c[0], c[1], r * sc + d * 90, 0, Math.PI * 2); ctx.stroke(); } }
  }
  // letters slam in on the spoken words: DOWNLINK on "Downlink" (1184), CAT on "Cat." (1197)
  ctx.save(); ctx.translate(x0, y0); ctx.scale(sc, sc);
  ctx.font = `800 ${size}px Archivo`;
  const word = 'DOWNLINK CAT';
  let x = markW;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]; const w = ctx.measureText(ch).width;
    const fs = i >= 9 ? 1197 + (i - 9) * 0.8 : 1184 + i * 0.8;
    const lk = E.back(inv(fs, fs + 4, f), 2.6);
    if (lk > 0 && ch !== ' ') {
      ctx.save(); ctx.translate(x + w / 2, -size * 0.35); ctx.scale(lk, lk); ctx.translate(-w / 2, size * 0.35);
      ctx.fillStyle = i >= 9 ? C.amber : C.paper; ctx.fillText(ch, 0, 0); ctx.restore();
    }
    x += w;
  }
  ctx.restore();
  ctx.restore();
}
// heist progress meter by the kicker: four pips, one per step (hidden while a STEP card shows its own)
function phoPt(x, y, size, rot, px, py) { const c = Math.cos(rot), s = Math.sin(rot); return [x + (c * px - s * py) * size, y + (s * px + c * py) * size]; }
// manga insert panel: a diagonal strip with Night Shift's eyes in extreme close-up
function eyeStrip(f, f0, f1, { cy = 975, hh = 105, ang = -0.07, look = [0.5, 0.25] } = {}) {
  const k = E.out5(inv(f0, f0 + 5, f));
  if (k <= 0 || f >= f1) return;
  const ff = on2(f);
  ctx.save(); ctx.translate(540 + lerp(-1300, 0, k), cy); ctx.rotate(ang);
  ctx.fillStyle = C.ink; ctx.fillRect(-760, -hh - 18, 1520, 2 * hh + 36);
  ctx.fillStyle = C.paper; ctx.fillRect(-760, -hh - 9, 1520, 2 * hh + 18);
  ctx.beginPath(); ctx.rect(-760, -hh, 1520, 2 * hh); ctx.clip();
  const g = ctx.createLinearGradient(0, -hh, 0, hh); g.addColorStop(0, '#4a1014'); g.addColorStop(1, '#14060a'); ctx.fillStyle = g; ctx.fillRect(-760, -hh, 1520, 2 * hh);
  focusLines(-60, 20, 200, { n: 80, color: C.red, alpha: 0.55, seed: 611, wMax: 10, rate: 4, reach: 900 });
  const lid = lerp(0.1, 0.36, inv(f0 + 4, f0 + 12, ff));
  drawNSHead(-60 + (f - f0) * 1.6, 22, 470, { slant: 0.8, lidL: lid, lidR: lid, mouth: 'smirk', rim: C.red, glint: kf(ff, [[f0 + 6, 0], [f0 + 10, 0.75], [f1, 0.35]], E.out), look, brow: -0.1 });
  ctx.restore();
}
// a paper tag on a string (number prop)
function drawTag(x, y, txt, a, { size = 40, len = 70 } = {}) {
  // len < 0: the tag floats UP on its string (low gravity); the hole is always at the string end
  const upward = len < 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = C.paper; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
  ctx.font = `400 ${size}px "Dela Gothic One"`;
  const w = ctx.measureText(txt).width + 50, h = size * (upward ? 2.3 : 2.0);
  ctx.translate(0, upward ? len - h + 6 : len - 6);
  if (upward) { ctx.translate(0, h); ctx.scale(1, -1); }
  const shape = (o) => { ctx.beginPath(); ctx.moveTo(-w / 2 - o, 18); ctx.lineTo(-w / 2 + 20 - o, -o); ctx.lineTo(w / 2 - 20 + o, -o); ctx.lineTo(w / 2 + o, 18); ctx.lineTo(w / 2 + o, h + o); ctx.lineTo(-w / 2 - o, h + o); ctx.closePath(); };
  shape(6); ctx.fillStyle = C.ink; ctx.fill();
  shape(0); ctx.fillStyle = C.paper; ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 12, 6, 0, Math.PI * 2); ctx.fill();
  if (upward) { ctx.translate(0, h); ctx.scale(1, -1); }
  ctx.fillStyle = C.ink; ctx.fillText(txt, -w / 2 + 25, upward ? h * 0.52 : h * 0.8);
  ctx.restore();
}

// drawn sample canister with a tag (illustration; the tag carries the fact)
function drawCanister(x, y, s, { tag = 1, rot = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); G.S = s;
  const lw = 4 / s;
  cel(() => { ctx.beginPath(); ctx.roundRect(-0.42, -0.55, 0.84, 1.15, 0.12); }, { fill: '#cfe3f0', shade: '#8fb0c4', shadeFn: () => ctx.rect(0.12, -0.6, 0.4, 1.3), line: C.ink, lw });
  // grains inside
  ctx.save(); ctx.beginPath(); ctx.roundRect(-0.42, -0.55, 0.84, 1.15, 0.12); ctx.clip();
  ctx.fillStyle = C.pho2; ctx.fillRect(-0.5, 0.2, 1, 0.5);
  for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? C.pho : C.pho4; ctx.beginPath(); ctx.arc(-0.36 + hash(i, 951, 1) * 0.72, 0.16 + hash(i, 952, 1) * 0.12, 0.05 + hash(i, 953, 1) * 0.04, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(-0.3, -0.45, 0.08, 0.9);
  ctx.restore();
  cel(() => { ctx.beginPath(); ctx.roundRect(-0.5, -0.78, 1.0, 0.28, 0.08); }, { fill: C.amber, shade: C.amber2, shadeFn: () => ctx.rect(-0.6, -0.62, 1.2, 0.2), line: C.ink, lw });
  ctx.restore();
  if (tag > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(tag);
    drawTag(x + s * 0.3 + 34, y + s * 0.5, 'AT LEAST 10 G', 0.12 + Math.sin(G.t * 3.2) * 0.06, { size: 34, len: 46 });
    ctx.restore();
  }
}
function drawNSBack(x, y, size, { tilt = 0, earL = 0, earR = 0, rim = C.cyan } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(size, size); G.S = size;
  const seed = 1600;
  // shoulders (jacket back + stand-up collar)
  const jk = [[-0.55, 0.7], [-1.3, 1.05], [-1.75, 1.6], [-1.85, 3.2], [1.85, 3.2], [1.75, 1.6], [1.3, 1.05], [0.55, 0.7]];
  cel(() => shapePath(jk, seed), { fill: C.paper3, keyline: C.ink, keyW: 0.08, shade: '#8f887b', shadeFn: () => ctx.ellipse(-0.6, 2.3, 1.4, 1.5, 0, 0, Math.PI * 2) });
  ctx.save(); shapePath(jk, seed); ctx.clip(); ctx.strokeStyle = rim; ctx.lineWidth = 0.14; shapePath(jk.map(([a, b]) => [a + 0.05, b + 0.04]), seed); ctx.stroke(); ctx.restore();
  cel(() => shapePath([[-0.62, 0.62], [0.62, 0.62], [0.7, 1.05], [-0.7, 1.05]], seed + 1, { smooth: false }), { fill: C.paper2, line: C.ink, lw: 0.04 });
  // ears (backs: fur only)
  for (const [s, a] of [[-1, earL], [1, earR]]) {
    ctx.save(); ctx.translate(s * 0.6, -0.66); ctx.rotate(s * a);
    cel(() => shapePath([[s * -0.34, -0.12], [s * 0.05, -0.62], [s * 0.4, -0.86], [s * 0.36, -0.2], [s * 0.3, 0.14]], seed + 5 + s, { smooth: false }), { fill: C.fur, keyline: C.paper, keyW: 0.06 });
    ctx.restore();
  }
  const hp = () => shapePath(headPts(0), seed + 10);
  cel(hp, { fill: C.fur, keyline: C.paper, keyW: 0.1, shade: C.fur2, shadeFn: () => ctx.ellipse(-0.5, 0.5, 1.2, 1.1, 0, 0, Math.PI * 2) });
  ctx.save(); hp(); ctx.clip(); ctx.strokeStyle = rim; ctx.lineWidth = 0.2; ctx.translate(0.06, 0.06); hp(); ctx.stroke(); ctx.restore();
  // tuft from behind
  cel(() => shapePath([[-0.42, -0.6], [-0.5, -1.12], [-0.16, -0.96], [-0.08, -1.42], [0.16, -1.0], [0.5, -1.24], [0.36, -0.9], [0.46, -0.6]], seed + 20, { smooth: false }), { fill: C.fur, keyline: C.paper, keyW: 0.08 });
  // headset band over the crown and the cups
  const band = [[-1.02, -0.12], [-0.9, -0.55], [-0.5, -0.86], [0.5, -0.86], [0.9, -0.55], [1.02, -0.12]];
  inkLine(band, seed + 30, { color: C.ink, lw: 0.13 }); inkLine(band, seed + 30, { color: C.paper, lw: 0.08 });
  for (const s of [-1, 1]) cel(() => { ctx.beginPath(); ctx.roundRect(s * 1.04 - 0.12, -0.28, 0.24, 0.44, 0.09); }, { fill: C.paper, shade: C.paper3, shadeFn: () => ctx.rect(s * 1.04 - 0.12, -0.02, 0.24, 0.3), line: C.ink, lw: 0.035 });
  ctx.restore();
}
// ever brought home: pull back from the Phobos photo to reveal it on Night Shift's screen, the screen
// switches to Curiosity's Earth-and-Phobos photo, and the photo's own inset fills the screen

function endHead(f) {
  // where the end-card head is (shared by the bust and the flying echo mark)
  const ent = E.out5(inv(1162, 1170, f));
  return { x: 540, y: lerp(2100, 1420, ent) + Math.sin(sec(f) * 1.6) * 6, s: 215 };
}
function drawHeistPips(f) {
  if (f < 244 || f >= 913) return;
  for (const [a, b] of [[314, 356], [560, 600], [758, 792]]) if (f >= a && f < b) return;
  const step = f < 322 ? 1 : f < 570 ? 2 : f < 768 ? 3 : 4;
  ctx.save();
  ctx.font = '600 26px "Plex Mono"';
  const x0 = 80 + ctx.measureText('LAUNCH DAY').width + 70 + 10;
  ctx.fillStyle = 'rgba(11,11,12,0.8)'; ctx.fillRect(x0, 262, 4 * 30 + 18, 42);
  for (let i = 0; i < 4; i++) {
    const on = i < step;
    ctx.save(); ctx.translate(x0 + 24 + i * 30, 283); ctx.rotate(Math.PI / 4);
    if (on) { ctx.fillStyle = C.amber; ctx.fillRect(-8, -8, 16, 16); } else { ctx.strokeStyle = C.paper3; ctx.lineWidth = 3; ctx.strokeRect(-7, -7, 14, 14); }
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- timeline + render
const SHOTS = [
  [0, 103, shotHook], [103, 147, shotLaunch], [147, 168, shotHeist], [168, 212, shotTarget],
  [212, 244, bandOne], [244, 314, sceneMars], [314, 356, bandTwo], [356, 446, sceneDrop],
  [446, 496, sceneWide], [496, 544, sceneShock], [544, 560, sceneRecover], [560, 600, bandThree],
  [600, 630, sceneGrab], [630, 687, sceneCore], [687, 758, shotTen], [758, 792, bandFour],
  [792, 846, sceneBurn], [846, 913, sceneCapsule], [913, 949, sceneLoot], [949, 999, sceneFirst],
  [999, 1038, sceneEarthset], [1038, 1064, bandNext], [1064, 1162, sceneElectron], [1162, 1300, shotEnd],
];
// whip pans: both shots on screen, the outgoing one leaving as the incoming one arrives (dir = where B comes from)
const TRANS = [
  { f0: 97, f1: 107, a: shotHook, b: shotLaunch, dir: [0, 1] },
  { f0: 840, f1: 850, a: sceneBurn, b: sceneCapsule, dir: [-0.62, 0.78] },
  { f0: 1156, f1: 1166, a: sceneElectron, b: shotEnd, dir: [0, 1] },
];
function drawTrans(f, tr) {
  const u = E.io(inv(tr.f0, tr.f1, f));
  const D = Math.abs(tr.dir[1]) > 0.9 ? H : 1700;
  const base = ctx.getTransform();
  let cr = [];
  ctx.save(); ctx.translate(-tr.dir[0] * u * D, -tr.dir[1] * u * D); ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); ctx.clip(); const ca = tr.a(f) || []; ctx.restore();
  ctx.save(); ctx.translate(tr.dir[0] * (1 - u) * D, tr.dir[1] * (1 - u) * D); ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); ctx.clip(); const cb = tr.b(f) || []; ctx.restore();
  ctx.setTransform(base);
  const ang = Math.atan2(tr.dir[1], tr.dir[0]) * 180 / Math.PI;
  speedLines(ang, { n: 50, alpha: 0.85 * Math.sin(Math.PI * u), speed: 7000, seed: 8, color: C.paper });
  // both shots are on screen during the pan, so both credits show
  cr = [...new Set([...ca, ...cb])];
  return cr;
}
function impactPost(f) {
  const i = IMPACTS.indexOf(f);
  if (i < 0) return;
  {
    if (!G.tmp) { G.tmp = document.createElement('canvas'); G.tmp.width = W; G.tmp.height = H; }
    const tc = G.tmp.getContext('2d'); tc.setTransform(1, 0, 0, 1, 0, 0); tc.filter = 'none'; tc.drawImage(ctx.canvas, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'grayscale(1) contrast(7) brightness(1.15)'; ctx.drawImage(G.tmp, 0, 0); ctx.filter = 'none';
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#ff3b2f'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
function renderFrame(t) {
  const f = G.f;
  const [sx, sy, sr] = shakeF(f);
  let credit = [];
  G.capBoxes = [];
  ctx.save();
  ctx.translate(540 + sx, 960 + sy); ctx.rotate(sr); ctx.scale(1.03, 1.03); ctx.translate(-540, -960); // overscan so shake never shows edges
  ctx.fillStyle = C.ink; ctx.fillRect(-300, -300, W + 600, H + 600);
  const tr = TRANS.find((x) => f >= x.f0 && f < x.f1);
  if (tr) credit = drawTrans(f, tr);
  else for (const [a, b, fn] of SHOTS) if (f >= a && f < b) { credit = fn(f) || []; break; }
  ctx.restore();
  // UI layer (captions shake a little with the hits, clamped to the safe area; credits and kicker do not)
  ctx.save();
  drawCaptions(t, { shake: [sx * 0.35, sy * 0.35] });
  ctx.restore();
  if (f < 1162) { drawKicker(0.95); drawHeistPips(f); }
  drawCredit(credit);
  impactPost(f);
}
