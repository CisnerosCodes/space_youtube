// ===== 04_scenes.js: the nine scenes of the Short =====
// Each scene draws into FB for global frame f (float allowed). CREDITS collects what is on screen.
let CREDITS = [];
function credit(s) { if (!CREDITS.includes(s)) CREDITS.push(s); }
// Milky Way: a dithered diagonal band of faint light with clustered stars (parallax layer)
function milkyWay(f, sx, sy, yMax) {
  yMax = yMax || H;
  for (let y = 0; y < yMax; y++) for (let x = 0; x < W; x++) {
    const X = x + sx * 0.08, Y = y + sy * 0.08;
    const d = Math.abs((X * 0.55 - Y + 140) / 1.14);
    const n = 0.55 * Math.sin(X * 0.05 + Y * 0.03) + 0.45 * Math.sin(X * 0.013 - Y * 0.041 + 2);
    const v = Math.max(0, 1 - d / (38 + 12 * n));
    if (v <= 0) continue;
    const b = bayer(x, y) + 0.5;
    if (v > 0.55 && b < (v - 0.55) * 1.6) FB[y * W + x] = C.K3;
    else if (b < v * 0.9) FB[y * W + x] = C.K2;
  }
}
const CR = {
  hirise: 'NASA/JPL-Caltech/University of Arizona',
  mars: 'NASA/JPL/USGS',
  tex: 'NASA/JPL/Solar System Simulator',
  jaxa: 'Illustration · facts: JAXA',
  rover: 'Illustration · facts: DLR, ESA',
  ll2: 'Illustration · facts: Launch Library 2',
  earth: 'Illustration',
};

// ---------- helpers ----------
function bands(y0, y1, cols) {
  // vertical gradient through cols with dithered steps
  const n = cols.length - 1;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, y1); y++) {
    const u = (y - y0) / (y1 - y0) * n;
    const i = clamp(Math.floor(u), 0, n - 1), fr = u - i;
    const a = C[cols[i]], b = C[cols[Math.min(n, i + 1)]];
    for (let x = 0; x < W; x++) FB[y * W + x] = bayer(x, y) + 0.5 < fr ? b : a;
  }
}
function label(x, y, text, col, opt) {
  opt = opt || {};
  const w = textWidth(FONT_S, text);
  const xx = opt.right ? x - w : opt.center ? Math.round(x - w / 2) : x;
  rect(xx - 2, y - 2, w + 4, 11, C.K0);
  if (opt.border) { hline(xx - 2, xx + w + 1, y - 3, C[opt.border]); }
  drawText(FONT_S, text, xx, y, col || C.P0);
  return { x: xx, w };
}
// number / word slam with game pop: 1 frame solid white at k+1, then settle at k with a bounce
function slam(str, cx, cy, f, f0, k, bandsCols, opt) {
  opt = opt || {};
  const lf = f - f0;
  if (lf < 0) return;
  if (opt.until !== undefined && f > opt.until) {
    const o = f - opt.until; if (o > 6) return;
    cy -= o * o * 1.2; // fly out up
  }
  let kk = lf < 2 ? k + 1 : k;
  if (kk > k && textWidth(FONT_M, str, true) * kk > 250) kk = k;
  const s = titleSpr(str, kk, lf < 1 ? ['P0'] : bandsCols, 'K0', opt.shadow || 'K0');
  const bounce = lf < 2 ? 0 : Math.round(-Math.exp(-lf / 5) * Math.sin(lf * 0.9) * 3);
  blit(s, clamp(Math.round(cx - s.w / 2), 2, W - s.w - 2), Math.round(cy - s.h / 2) + bounce);
}
function shakeAt(f, hits) {
  let ox = 0, oy = 0;
  for (const [f0, amp, dur] of hits) {
    const d = f - f0;
    if (d < 0 || d > dur) continue;
    const a = amp * (1 - d / dur);
    ox += Math.round((hash(cad(f, 1), 11) - 0.5) * 2 * a);
    oy += Math.round((hash(cad(f, 1), 23) - 0.5) * 2 * a);
  }
  return [ox, oy];
}
function dottedPath(pts, upTo, col, phase) {
  // pts: polyline; draws dots every 3 px up to fraction upTo, marching
  let total = 0; const seg = [];
  for (let i = 0; i + 1 < pts.length; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); total += l; }
  const lim = total * upTo;
  for (let s = (phase || 0) % 4; s < lim; s += 4) {
    let acc = 0, i = 0;
    while (i < seg.length && acc + seg[i] < s) { acc += seg[i]; i++; }
    if (i >= seg.length) break;
    const u = (s - acc) / seg[i];
    px(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, col);
    px(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u + 1, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, col);
  }
}
function brackets(x, y, w, h, col, len) {
  len = len || 6;
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    hline(cx, cx + sx * len, cy, col); vline(cx, cy, cy + sy * len, col);
    hline(cx, cx + sx * len, cy + sy, col); vline(cx + sx, cy, cy + sy * len, col);
  }
}
// low-gravity dust burst: particles launched at f0, pure function of f
function dust(f, f0, x, y, n, seed, opt) {
  opt = opt || {};
  const g = opt.g ?? 0.012, life = opt.life ?? 70, sp = opt.speed ?? 1.0;
  const lf = f - f0; if (lf < 0 || lf > life) return;
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI * (0.08 + 0.84 * r()), v = sp * (0.4 + r() * 1.2);
    const vx = Math.cos(ang) * v * (opt.wide ?? 1.6), vy = Math.sin(ang) * v;
    const px_ = x + vx * lf, py_ = y + vy * lf + 0.5 * g * lf * lf;
    if (py_ > y + 1) continue;
    const c = r() > 0.5 ? (opt.c1 || C.H4) : (opt.c2 || C.H3);
    if (lf > life * 0.7 && bayer(Math.round(px_), Math.round(py_)) + 0.5 < (lf - life * 0.7) / (life * 0.3)) continue;
    px(px_, py_, c);
  }
}

// ---------- S1: HOOK (f 0..103) ----------
function sceneHook(f) {
  const [sx, sy] = shakeAt(f, [[54, 3, 10], [66, 2, 8]]);
  bands(0, 300, ['K0', 'K0', 'K1', 'K2']);
  drawStars(f, f * 0.35, -f * 0.12);
  // Mars horizon (real image), slowly rising
  const my = 430 - f * 0.05;
  drawPhoto('mars', 135 + sx, my + sy, 372, { pal: PAL.mars, bright: 1.05 });
  credit(CR.mars);
  // Phobos, the "boss", drifting toward Mars in slow motion
  const bob = Math.round(Math.sin(f * 0.09) * 2);
  const pin = eout(ramp(f, 0, 12));
  const pxp = 142 - f * 0.06 + sx, pyp = lerp(132, 150, pin) + f * 0.05 + bob + sy;
  const pw = Math.round(lerp(176, 150, pin));
  const r = drawPhoto('phobos', pxp, pyp, pw, { pal: PAL.phobos, bright: 1.08 });
  credit(CR.hirise);
  // lock-on brackets
  const snap = Math.round((1 - eout(ramp(f, 0, 9))) * 60);
  const blink = f < 12 || cad(f, 4) % 8 < 4 || f > 30;
  if (blink) brackets(r.x - 6 - snap, r.y - 6 - snap, r.w + 12 + 2 * snap, r.h + 12 + 2 * snap, f >= 54 && f < 60 ? C.F1 : C.A0, 7);
  label(r.x - 4, r.y + r.h + 10, 'PHOBOS', C.A0);
  label(r.x + 30, r.y + r.h + 10, '27 x 22 x 18 km', C.P0);
  // trajectory: dotted spiral from Phobos toward Mars (draws on "course")
  if (f >= 64) {
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const u = i / 30, a = -0.4 + u * 2.6;
      pts.push([pxp + Math.cos(a) * (70 - u * 30) * (1 - u * 0.3) - 10 * u, pyp + 40 + Math.sin(a) * 20 + u * 75]);
    }
    dottedPath(pts, ramp(f, 64, 90), C.A0, cad(f, 2) * 0.5);
  }
  // either/or menu (keeps NASA's two outcomes)
  if (f >= 70) {
    const k = ramp(f, 70, 76);
    const x0 = 24, y0 = 238;
    rect(x0 - 3, y0 - 3, Math.round(152 * k) + 6, 36, C.K0);
    rect(x0 - 2, y0 - 2, Math.round(152 * k) + 4, 1, C.A2);
    if (k >= 1) {
      drawText(FONT_S, 'IN 50 MILLION YEARS:', x0, y0 + 1, C.P1);
      const sel = cad(f, 10) % 20 < 10 ? 0 : 1;
      drawText(FONT_S, 'CRASH INTO MARS', x0 + 8, y0 + 11, sel === 0 ? C.A0 : C.P0);
      drawText(FONT_S, 'OR BREAK UP INTO A RING', x0 + 8, y0 + 20, sel === 1 ? C.A0 : C.P0);
      drawText(FONT_S, '>', x0 + 1, y0 + 11 + sel * 9, C.A0);
    }
  }
  // WARNING banner (shmup boss alarm) + rate ticker
  const by = 30;
  const flashRed = f >= 54 && f < 58;
  rect(0, by, W, 30, flashRed ? C.F0 : C.K0);
  for (let x = -12; x < W + 12; x++) {
    const s = ((x + cad(f, 1) * 1) % 8 + 8) % 8 < 4;
    px(x, by, s ? C.A0 : C.K0); px(x, by + 1, s ? C.A0 : C.K0); px(x + 1, by + 1, s ? C.A0 : C.K0);
    px(x, by + 28, s ? C.A0 : C.K0); px(x, by + 29, s ? C.A0 : C.K0);
  }
  const on = cad(f, 6) % 12 < 8 || f < 6;
  if (on) {
    const t = titleSpr('WARNING', 2, flashRed ? ['P0'] : ['F2', 'F1', 'F1', 'F0'], 'K0', null);
    blit(t, Math.round(W / 2 - t.w / 2), by + 3);
  }
  label(W / 2, by + 36, '1.8 m (6 ft) CLOSER TO MARS EVERY 100 YEARS', C.P0, { center: true });
}

// ---------- S2: LAUNCH (f 103..220) ----------
const H3S = () => (H3S._s || (H3S._s = h3Spr()));
function launchState(f) {
  const lf = f - 130; // liftoff at f130
  const rise = lf <= 0 ? 0 : 0.5 * 0.085 * lf * lf + 0.15 * lf;
  const camY = Math.max(0, rise - 20);
  return { lf, rise, camY };
}
function sceneLaunch(f) {
  const { lf, rise, camY } = launchState(f);
  const [sx, sy] = shakeAt(f, [[130, 3, 26]]);
  const alt = camY;
  const GY = 292; // pad level when the camera is at rest
  const gy = GY + alt + sy;
  // sky: pre-dawn night over Tanegashima (04:41 JST), darkening to space with altitude
  const k = clamp(alt / 600, 0, 1);
  const top = 'K0', mid = k > 0.5 ? 'K0' : 'K1', low = k > 0.75 ? 'K1' : k > 0.35 ? 'K2' : 'B0';
  bands(0, 252 + alt * 0.6, [top, mid, 'K2', low]);
  drawStars(f, f * 0.1, -alt * 0.3);
  // sea horizon + far island ridge
  const hz = Math.round(250 + alt * 0.6);
  if (hz < H) {
    poly([[150, hz + 1], [180, hz - 7], [214, hz - 5], [240, hz - 11], [270, hz - 8], [270, hz + 1]], C.K3);
    rect(0, hz + 1, W, H, C.B0);
    for (let i = 0; i < 46; i++) {
      const wy = hz + 3 + i * 4 + Math.floor(i * i * 0.05), wx = ((i * 53 + f * (0.25 + (i % 7) * 0.05)) % (W + 30)) - 15;
      if (wy < H) hline(wx, wx + 4 + (i % 3) * 3, wy, i % 2 ? C.B1 : C.K3);
    }
  }
  // searchlights crossing on the rocket (until liftoff)
  if (lf < 8) {
    const fade = lf < 0 ? 0.18 : 0.18 * (1 - lf / 8);
    for (const [bx, a0] of [[96, -1.05], [196, -2.12]]) {
      const ang = a0 + Math.sin(f * 0.05 + bx) * 0.06;
      for (let i = 0; i < 300; i++) {
        const w = 1 + i * 0.09, cxx = bx + Math.cos(ang) * i, cyy = gy - 6 + Math.sin(ang) * i;
        for (let j = -w; j <= w; j++) { const xx = Math.round(cxx - Math.sin(ang) * j), yy = Math.round(cyy + Math.cos(ang) * j); if (yy < gy - 4 && bayer(xx, yy) + 0.5 < fade * (1 - i / 300)) px(xx, yy, C.K5); }
      }
    }
  }
  // coastal launch site: cliff, pad, tower
  if (gy - 120 < H) {
    poly([[104, gy + 1], [112, gy - 4], [270, gy - 6], [270, H + 300], [96, H + 300]], C.G0);
    for (let i = 0; i < 30; i++) { const xx = 120 + (i * 37) % 150, yy = gy + 6 + (i * 23) % 120; hline(xx, xx + 3, yy, C.G1); }
    poly([[96, H + 300], [104, gy + 1], [112, gy + 10], [106, H + 300]], C.K3);
    rect(112, gy - 4, 64, 3, C.P3); rect(112, gy - 1, 64, 2, C.K4); rect(130, gy - 1, 12, 6, C.K0);
    for (let i = 0; i < 8; i++) if ((cad(f, 10) / 10 + i) % 3 !== 0) px(114 + i * 8, gy - 5, C.A1);
    for (let y = gy - 118; y < gy - 4; y++) { px(156, y, C.K4); px(161, y, C.K4); if ((y - gy) % 6 === 0) hline(156, 161, y, C.K4); if (((y - gy) % 6 + 6) % 6 === 3) { px(158, y, C.K4); px(159, y, C.K4); } }
    hline(152, 165, gy - 119, C.P3);
    if (lf < 4) { hline(144, 156, gy - 86, C.P3); hline(144, 156, gy - 60, C.P3); }
    if (cad(f, 15) % 30 < 15) { px(158, gy - 121, C.F0); px(159, gy - 121, C.F0); }
  }
  // rocket
  const s = H3S(), G = H3G;
  const sepSRB = 160, sepFair = 176, sepMMX = 192;
  const fallC = f > sepMMX ? 0.12 * (f - sepMMX) * (f - sepMMX) : 0; // spent stage falls behind
  const rx = 136 + sx, base = gy - 4 - rise + fallC;
  const rTop = Math.round(base - G.h + 6), rLeft = Math.round(rx - G.cx);
  // smoke: billows along the pad at ignition, then a trail along the climb
  if (lf >= -4) {
    const pr = mulberry(77);
    for (let i = 0; i < 80; i++) {
      const t0 = 126 + i * 1.4; if (f < t0) break;
      const age = f - t0;
      const r0 = launchState(t0).rise;
      const wy = GY - 4 - r0 + alt;
      const side = (pr() - 0.5) * 2;
      const ground = r0 < 24;
      const grow = Math.min(ground ? 22 : 13, 2 + age * (ground ? 0.6 : 0.32)) * (0.6 + pr() * 0.6);
      const cx = rx + side * (ground ? age * 1.8 : age * 0.25), cy = wy - (ground ? age * 0.18 : -age * 0.15);
      if (cy - grow > H || cy + grow < 0) continue;
      const fade = ramp(age, 40, 100);
      for (let yy = -grow; yy <= grow; yy++) for (let xx = -grow; xx <= grow; xx++) {
        if (xx * xx + yy * yy > grow * grow) continue;
        const X = Math.round(cx + xx), Y = Math.round(cy + yy);
        if (bayer(X, Y) + 0.5 < fade) continue;
        const lit = yy > grow * 0.35 && age < 30 ? C.F2 : yy < -grow * 0.3 ? C.P1 : (xx > grow * 0.3 ? C.P3 : C.P2);
        px(X, Y, lit);
      }
    }
  }
  // flames
  if (lf >= 0 && f < sepMMX) {
    const flameLen = lf < 5 ? lf * 8 : 40 + Math.sin(f * 1.3) * 4;
    const nozzles = [[rx, 1, 3.6]];
    if (f < sepSRB) nozzles.push([rLeft + 9, 0.85, 2.6], [rLeft + 29, 0.85, 2.6]);
    for (const [fx, m, wd] of nozzles) {
      const fl = flameLen * m;
      for (let i = 0; i < fl; i++) {
        const sN = i / fl, half = (1 - sN) * wd + (hash(cad(f, 2), i + fx) - 0.5);
        for (let j = -Math.ceil(half); j <= Math.ceil(half); j++) {
          if (Math.abs(j) > half) continue;
          const kk = sN + Math.abs(j) / (half + 0.1) * 0.4;
          px(fx + j, base + 1 + i, kk < 0.3 ? C.F3 : kk < 0.55 ? C.F2 : kk < 0.8 ? C.F1 : C.F0);
        }
      }
    }
  }
  if (f < sepSRB) blit(s, rLeft, rTop);
  else {
    for (let j = 0; j < s.h; j++) for (let i = G.core[0] - 1; i <= G.core[1] + 2; i++) { const c = s.d[j * s.w + i]; if (c && (j < 88 || i > G.core[0] - 1)) px(rLeft + i, rTop + j, c); }
    const d = f - sepSRB;
    for (const [k, [x0, x1]] of G.srb.entries()) {
      const sgn = k === 0 ? -1 : 1;
      const bw = x1 - x0 + 3, bh = G.h - G.srbY[0] + 6;
      const bs = new Spr(bw, bh);
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) bs.d[j * bw + i] = s.d[(G.srbY[0] - 6 + j) * s.w + x0 - 1 + i] || 0;
      const rs = rotSpr(bs, sgn * d * 0.05);
      blit(rs, rLeft + (x0 + x1) / 2 + sgn * d * 0.8 - rs.R, rTop + G.srbY[0] + 20 + d * d * 0.06 + d * 2 - rs.R);
    }
  }
  credit(CR.jaxa);
  // fairing opens, MMX with Night Shift revealed on the upper stage, then separation
  if (f >= sepFair) {
    const d = f - sepFair;
    for (let j = 0; j <= G.fairH + 1; j++) for (let i = 0; i < G.w; i++) {
      const X = rLeft + i, Y = rTop + j;
      if (X >= 0 && Y >= 0 && X < W && Y < H && s.d[j * s.w + i] && j <= G.fairH) FB[Y * W + X] = C.K1;
    }
    for (const sgn of [-1, 1]) {
      const hw = 9;
      const hs = new Spr(hw, G.fairH + 2);
      for (let j = 0; j < G.fairH + 2; j++) for (let i = 0; i < hw; i++) hs.d[j * hw + i] = s.d[j * s.w + (sgn < 0 ? G.cx - hw + 1 + i : G.cx + i)] || 0;
      const rs = rotSpr(hs, sgn * (0.2 + d * 0.08));
      blit(rs, rx + sgn * (7 + d * 1.7 + d * d * 0.03) - rs.R, rTop + 14 + d * 0.9 - rs.R);
    }
    const climb = f > sepMMX ? fallC : 0;
    let mx = rx, my = rTop + 10 - climb;
    if (f >= sepMMX) { const u = eio(ramp(f, sepMMX, 220)); mx = lerp(rx, 112, u); my = lerp(rTop + 10 - climb, 150, u); }
    drawMMXwithCat(mx, my, f, { expr: f < 200 ? 'sly' : 'happy', pad: true, flame: f >= sepMMX ? 6 : 0, thumbs: f >= 182 && f < 202 });
    if (f >= sepMMX + 2) label(135, 248, 'SEPARATED ~71 MIN 13 S AFTER LIFTOFF', C.P0, { center: true });
  }
  // title: the game's name, on "heist"
  if (f >= 147) slam('PHOBOS HEIST', 135, 52, f, 147, 2, ['A1', 'A0', 'A0', 'A2'], { shadow: 'A4', until: 214 });
  if (f >= 152 && f < 214) label(135, 70, 'MMX · MARTIAN MOONS eXPLORATION', C.P1, { center: true });
  // date / place chip
  if (f < 147) {
    const k2 = ramp(f, 104, 110);
    const x0 = 20, y0 = 34;
    if (k2 > 0) {
      rect(x0 - 3, y0 - 3, Math.round(122 * k2), 36, C.K0);
      rect(x0 - 3, y0 - 3, 2, 36, C.A0);
      if (k2 >= 1) {
        drawText(FONT_S, 'JAPAN · TANEGASHIMA', x0 + 2, y0, C.A0);
        drawText(FONT_S, 'H3 FLIGHT No.10', x0 + 2, y0 + 10, C.P0);
        drawText(FONT_S, '04:41:03 JST OCT 20, 2026', x0 + 2, y0 + 20, C.P1);
      }
    }
  }
}
// MMX sprite with Night Shift seated on top, piloting
const MMX_CACHE = {};
function mmxCached(o) {
  const key = JSON.stringify(o || {});
  return MMX_CACHE[key] || (MMX_CACHE[key] = mmxSpr(o));
}
function drawMMXwithCat(cx, cy, f, o) {
  o = o || {};
  const m = mmxCached({ rover: o.rover !== false, capsule: o.capsule !== false, legs: true });
  const x = Math.round(cx - m.w / 2), y = Math.round(cy - m.h / 2);
  if (o.flame) drawFlame(x + 18, y + 22, o.flame, f, -1);
  blit(m, x, y);
  // cat sits on the return module (seat at sprite x 34, y 9)
  if (o.cat !== false) {
    const hop = o.hop || 0;
    const tw = o.thumbs ? { hR: [8, -22], expr: 'wink' } : {};
    const arms = o.cheer ? { hL: [-9, -24], hR: [9, -24] } : o.point ? { hL: [-4, -7], hR: o.point } : { hL: [-4, -7], hR: [4, -7] };
    drawCat(x + 35, y + (o.capsule === false ? 9 : 6) - hop, Object.assign({
      pose: 'sit', prop: (o.cheer || o.point || o.thumbs) ? null : (o.pad ? 'pad' : null), expr: o.expr || 'neutral',
      tail: f * 0.18, blink: blinkAt(f, 3), look: o.look || 0,
    }, arms, tw, o.thumbs ? { expr: 'wink' } : {}));
  }
  return { x, y, w: m.w, h: m.h };
}
function blinkAt(f, seed) {
  const period = 70 + (seed * 13) % 30;
  const ph = (f + seed * 17) % period;
  return ph < 3;
}

// ---------- S3: STAGE 1 MARS (f 220..322) ----------
function sceneStage1(f) {
  const lf = f - 220;
  bands(0, H, ['K0', 'K0', 'K1', 'K1']);
  const speed = 2.2;
  milkyWay(f, f * speed, 0);
  drawStars(f, f * speed, 0, { streak: 6, dx: 1, dy: 0 });
  // Earth (drawn) falls behind on the left
  {
    const eu = ramp(f, 220, 300);
    const er = Math.round(lerp(30, 9, eout(eu)));
    const es = earthSpr(er, 120 + f * 0.2, 10);
    blit(es, Math.round(lerp(34, -2, eu) - es.c0), Math.round(lerp(262, 236, eu) - es.c0));
    credit(CR.earth);
  }
  // Mars approaches from the right (real image)
  const u = ramp(f, 236, 318);
  const mr = lerp(10, 92, ein(u) * 0.75 + u * 0.25);
  const mxp = lerp(300, 196, eout(u)), myp = lerp(120, 150, u);
  if (f >= 236) {
    drawPhoto('mars', mxp, myp, mr * 2, { pal: PAL.mars, bright: 1.05 });
    credit(CR.mars);
  }
  // MMX + cat cruising
  const bob = Math.round(Math.sin(f * 0.12) * 2);
  const mx = lerp(112, 82, eio(ramp(f, 220, 300))), my = 150 + bob;
  // overworld route: dotted path Earth -> MMX (travelled, amber) -> Mars (ahead, dim)
  {
    const eu = ramp(f, 220, 300);
    const e0 = [lerp(34, -2, eu), lerp(262, 236, eu)];
    const m1 = f >= 236 ? [mxp, myp] : [300, 120];
    const q = (a, b, c, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]];
    const ship = [mx - 4, my + 26];
    const back = [], ahead = [];
    for (let i = 0; i <= 24; i++) back.push(q(e0, [e0[0] + 30, ship[1] + 30], ship, i / 24));
    for (let i = 0; i <= 24; i++) ahead.push(q(ship, [ship[0] + 60, ship[1] + 10], m1, i / 24));
    dottedPath(back, 1, C.A2, 0);
    dottedPath(ahead, 1, C.K5, -cad(f, 2));
  }
  drawMMXwithCat(mx, my, f, {
    pad: !(f >= 240 && f < 262) && !(f >= 280 && f < 305), point: (f >= 240 && f < 262) ? [12, -16] : null,
    cheer: f >= 280 && f < 305, expr: f >= 280 ? 'happy' : 'keen', flame: 7, look: 1,
  });
  credit(CR.jaxa);
  // speed lines streaking past
  for (let i = 0; i < 6; i++) {
    const yy = 60 + i * 37 % 240, xx = W - ((f * 9 + i * 71) % (W + 60));
    hline(xx, xx + 14 + (i % 3) * 6, yy, C.K4);
  }
  // arrival date
  if (f >= 264) {
    label(168, 206, 'ARRIVE AT MARS', C.P1, { center: true });
  }
  slam('AUG 2027', 168, 236, f, 280, 2, ['A1', 'A0', 'A0', 'A2'], { shadow: 'A4' });
}

// ---------- S4/S5: Phobos surface (Mode 7), STAGE 2 LOOKOUT and STAGE 3 THE GRAB (f 322..768) ----------
function phobosCam(f) {
  // the camera orbits the landing site (pivot between the rover and MMX's landing spot):
  // the Mode-7 floor rotates and Mars slides across the sky
  const P = { x: 388, z: 80 }, R = 62;
  const yaw = -0.30 + 0.62 * eio(ramp(f, 330, 800)) + 0.015 * Math.sin(f * 0.02);
  const u = eout(ramp(f, 322, 372));
  const A = 240 * (1 - u); // approach from far away
  const fx = -Math.sin(yaw), fz = Math.cos(yaw);
  let hz = 150;
  if (f >= 772) hz = Math.round(150 + eio(ramp(f, 772, 806)) * 360);
  return { horizon: hz, camX: P.x - (R + A) * fx, camZ: P.z - (R + A) * fz, camH: 36, focal: 150, yaw, yEnd: H };
}
const ROVER_W = { x: 375, z: 74 }; // rover ground spot (world), close to the camera
function roverAt(f) { const u = eio(ramp(f, 612, 760)); return { x: ROVER_W.x - 9 * u, z: ROVER_W.z + 4 * u, moving: f > 612 && f < 760 }; }
function roverPhysics(f) {
  // drop: slow low-g free fall with a slight tilt; one big slow bounce with a full flip that
  // lands it upright (on "rover"), a small second bounce, then it rests
  const f0 = 354, g = 0.05, h0 = 64;
  if (f < f0) return null;
  const t = f - f0, tFall = Math.sqrt(2 * h0 / g); // ~51 frames
  if (t < tFall) return { h: h0 - 0.5 * g * t * t, rot: 0.3 * (t / tFall), phase: 'fall' };
  const v0 = g * 30 / 2, d0 = 30;
  let tt = t - tFall;
  if (tt < d0) return { h: v0 * tt - 0.5 * g * tt * tt, rot: lerp(0.3, Math.PI * 2, eio(tt / d0)), phase: 'bounce' };
  tt -= d0;
  const d1 = 10, v1 = g * d1 / 2;
  if (tt < d1) return { h: v1 * tt - 0.5 * g * tt * tt, rot: 0, phase: 'bounce2' };
  return { h: 0, rot: 0, phase: 'rest', tRest: tt - d1 };
}
function sceneMode7(f) {
  const cam = phobosCam(f);
  // sky
  rect(0, 0, W, Math.max(0, cam.horizon + 1), C.K0);
  drawStars(f, cam.yaw * 150 + f * 0.05, -(cam.horizon - 150) * 0.3, { yMax: cam.horizon });
  // giant Mars in Phobos' sky (real image), clipped by the horizon
  const marsY = 132 + (cam.horizon - 150) * 0.9;
  const marsX = 135 - cam.yaw * 150;
  if (marsY - 110 < cam.horizon) {
    drawPhoto('mars', marsX, marsY, 236, { pal: PAL.mars, bright: 0.95, clipY: cam.horizon + 1 });
    credit(CR.mars);
  }
  if (cam.horizon < H) { mode7(Object.assign({ contrast: 1.05, bias: -0.1 }, cam)); credit(CR.tex); }
  return cam;
}
function sceneStage2(f) {
  const cam = sceneMode7(f);
  const rp = roverPhysics(f);
  const g = m7project(cam, ROVER_W.x, ROVER_W.z, 0);
  // MMX hovering above the drop point (~40 m)
  const hover = Math.round(Math.sin(f * 0.1) * 2);
  const mmxY = 112 + hover + (f < 372 ? Math.round((1 - eout(ramp(f, 322, 372))) * -60) : 0);
  const mmxX = g ? g.x + 4 : 140;
  // shadow of MMX far below
  if (g) for (let i = -8; i <= 8; i++) if (bayer(Math.round(g.x + i), Math.round(g.y + 4)) + 0.5 < 0.6) px(g.x + i, g.y + 4, C.H0);
  const dropped = f >= 354;
  drawMMXwithCat(mmxX, mmxY, f, { rover: !dropped, pad: true, expr: f >= 496 ? 'shock' : f >= 404 ? 'happy' : 'focus', look: 0, cheer: f >= 404 && f < 430 });
  credit(CR.jaxa);
  // the rover: drop, bounce, right itself
  if (rp && g) {
    const rs = roverSpr({ wheel: cad(f, 4) / 4 });
    const rot = rp.rot;
    const halfH = Math.abs(rs.w / 2 * Math.sin(rot)) + Math.abs(rs.h / 2 * Math.cos(rot));
    const groundC = g.y - halfH + 1;          // sprite centre when resting on the ground
    const startC = mmxY + 10;                  // centre when released under MMX
    const k = 1 - rp.h / 64;
    let cy = rp.phase === 'fall' ? lerp(startC, groundC, k) : groundC - rp.h * 3.2;
    // feather hop on "15 grams" (low gravity)
    if (f >= 498 && f < 568) { const u = (f - 498) / 70; cy += -Math.sin(u * Math.PI) * 46; }
    const shk = rp.phase === 'fall' ? k : 1;
    const sh = Math.round(4 + 7 * shk);
    for (let i = -sh; i <= sh; i++) if (bayer(Math.round(g.x + i), g.y) + 0.5 < 0.4 + 0.6 * shk) px(g.x + i, g.y, C.H0);
    const rr = rotSpr(rs, rot);
    blit(rr, Math.round(g.x - rr.R), Math.round(cy - rr.R));
    credit(CR.rover);
    // impact dust
    const tF = 354 + Math.sqrt(2 * 64 / 0.05);
    dust(f, Math.round(tF), g.x, g.y - 1, 30, 5, { g: 0.01, life: 90, speed: 0.6 });
    dust(f, Math.round(tF + 30), g.x + 2, g.y - 1, 16, 6, { g: 0.01, life: 60, speed: 0.4 });
    dust(f, 500, g.x, g.y - 1, 14, 9, { g: 0.008, life: 60, speed: 0.4 });
    // drop measurement: about 40 m, free fall (DLR)
    if (f >= 352 && f < 404) {
      const x = g.x - 30;
      for (let y = mmxY + 16; y < g.y - 2; y += 3) px(x, y, C.A0);
      hline(x - 2, x + 2, mmxY + 16, C.A0); hline(x - 2, x + 2, g.y - 2, C.A0);
      label(x - 4, Math.round((mmxY + g.y) / 2) - 8, 'FREE FALL', C.P1, { right: true });
      label(x - 4, Math.round((mmxY + g.y) / 2) + 2, '~40 m (DLR)', C.A0, { right: true });
    }
    if (f >= 392 && f < 560) label(g.x, g.y + 8, 'IDEFIX ROVER', C.P0, { center: true });
  }
  // 25 kg -> 15 g
  if (f >= 404 && f < 484) slam('25 kg', 196, 196, f, 404, 2, ['P0', 'P0', 'P1', 'P2'], { shadow: 'K3' });
  if (f >= 484 && f < 496) {
    // "weighs..." pause: the 25 kg plate drops out of a slot window; nothing in between is shown
    const u = (f - 484) / 12;
    const s1 = titleSpr('25 kg', 2, ['P1', 'P2'], 'K0', 'K3');
    const y = 196 - Math.round(s1.h / 2) + Math.round(ein(u) * 30);
    blit(s1, Math.round(196 - s1.w / 2), y, { clipY: 214 });
    for (let i = 0; i < 3; i++) if (f - 484 > i * 3) rect(184 + i * 10, 220, 3, 3, C.A0);
  }
  if (f >= 404 && f < 570) label(196, 168, f >= 484 ? 'ON PHOBOS IT WEIGHS' : 'ROVER MASS', C.P1, { center: true });
  if (f >= 496) slam('15 g', 196, 198, f, 496, 3, ['A1', 'A0', 'A0', 'A2'], { shadow: 'A4', until: 566 });
}
