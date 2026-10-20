// ===== 05_scenes2.js: STAGE 3 THE GRAB, STAGE 4 HOME, LOOT, NEXT, END =====
const MMX_LAND = { x: 401, z: 84 };
const SLOT = { x: 184, y: 30 }; // HUD sample slot (target panel)

function sceneStage3(f) {
  const cam = sceneMode7(f);
  // rover (the lookout) parked where it landed, mast lamp blinking
  const rw = roverAt(f);
  const g = m7project(cam, rw.x, rw.z, 0);
  if (g) {
    const rs = roverSpr({ wheel: rw.moving ? cad(f, 3) / 3 : 0 });
    blit(rs, Math.round(g.x - rs.w / 2), Math.round(g.y - rs.h + 1));
    if (cad(f, 10) % 20 < 10) px(g.x + 6, g.y - 17, C.F2);
    for (let i = -6; i <= 6; i++) px(g.x + i, g.y, C.H0);
    credit(CR.rover);
  }
  const L = m7project(cam, MMX_LAND.x, MMX_LAND.z, 0);
  const landY = L.y - 15;
  const tdown = 606;
  const u = eout(ramp(f, 574, tdown));
  const hover = f < tdown ? Math.round(Math.sin(f * 0.1) * 2 * (1 - u)) : 0;
  const my = lerp(112, landY, u) + hover;
  const g0 = m7project(cam, ROVER_W.x, ROVER_W.z, 0);
  const mx = lerp(g0 ? g0.x + 4 : L.x, L.x, eio(ramp(f, 572, 604)));
  // landing thrusters
  if (f < tdown) {
    const fl = 4 + 3 * hash(cad(f, 2), 3);
    for (const lx of [-14, 14]) for (let i = 0; i < fl; i++) px(mx + lx, my + 16 + i, i < 2 ? C.F3 : i < 4 ? C.F2 : C.F1);
  }
  // shadow
  for (let i = -16; i <= 16; i++) if (bayer(Math.round(L.x + i), Math.round(L.y)) + 0.5 < 0.4 + 0.5 * u) px(L.x + i, L.y, C.H0);
  // touchdown dust (low gravity, slow arcs)
  dust(f, tdown, L.x - 18, L.y, 18, 21, { g: 0.009, life: 90, speed: 0.55 });
  dust(f, tdown, L.x + 18, L.y, 18, 22, { g: 0.009, life: 90, speed: 0.55 });
  // coring arm (front, right side) and the corer drilling into the regolith
  const armBase = [mx + 9, my + 4];
  const tip0 = [mx + 34, L.y - 1];
  const ext = eout(ramp(f, 630, 642));
  if (f >= 630) {
    const tip = [lerp(armBase[0] + 6, tip0[0], ext), lerp(armBase[1] + 2, tip0[1] - 8, ext)];
    const elbow = [lerp(armBase[0] + 8, (armBase[0] + tip[0]) / 2 + 6, ext), Math.min(armBase[1], tip[1]) - 10 * ext];
    thick(armBase[0], armBase[1], elbow[0], elbow[1], 3.2, C.K0); thick(elbow[0], elbow[1], tip[0], tip[1], 3.2, C.K0);
    thick(armBase[0], armBase[1], elbow[0], elbow[1], 2, C.P2);
    thick(elbow[0], elbow[1], tip[0], tip[1], 2, C.P1);
    disc(elbow[0], elbow[1], 2, C.A0); px(elbow[0], elbow[1], C.A3);
    // corer: sinks 3 px while drilling (2 cm in the real thing)
    const dig = f >= 642 ? Math.min(3, (f - 642) / 6) : 0;
    const vib = f >= 642 && f < 672 ? (cad(f, 1) % 2) : 0;
    rect(tip[0] - 3 + vib, tip[1] + dig - 3, 7, 11, C.K0);
    rect(tip[0] - 2 + vib, tip[1] + dig - 2, 5, 9, C.P1); rect(tip[0] + 1 + vib, tip[1] + dig - 2, 2, 9, C.P3);
    rect(tip[0] - 2 + vib, tip[1] + dig - 2, 5, 2, C.A0);
    for (let i = 0; i < 3; i++) px(tip[0] - 2 + vib + ((cad(f, 2) / 2 + i) % 5), tip[1] + dig + 2 + i * 2, C.P2);
    if (f >= 642) dust(f, 642, tip0[0], L.y - 1, 10, 31, { g: 0.03, life: 30, speed: 0.6, wide: 0.8, c1: C.H5, c2: C.H3 });
    if (f >= 656) dust(f, 656, tip0[0], L.y - 1, 10, 32, { g: 0.03, life: 30, speed: 0.6, wide: 0.8, c1: C.H5, c2: C.H3 });

  }
  // nitrogen blaster at the front footpad: gas burst lofts grains into the canister
  const foot = [mx + 14, L.y - 1];
  if (f >= 656 && f < 700) {
    const d = f - 656;
    const rr = Math.min(24, d * 2.2);
    for (let yy = -rr; yy <= 2; yy++) for (let xx = -rr; xx <= rr; xx++) {
      const q = Math.sqrt(xx * xx + yy * yy * 2.2);
      if (q > rr || q < rr - 4) continue;
      const X = Math.round(foot[0] + xx), Y = Math.round(foot[1] + yy);
      if (bayer(X, Y) + 0.5 < 0.9 - d / 46) px(X, Y, q > rr - 2 ? C.B4 : C.P1);
    }
    // grains up into the canister within a fraction of a second (6 frames)
    const r = mulberry(44);
    for (let i = 0; i < 16; i++) {
      const s = sat((d - r() * 4) / 6);
      if (s <= 0 || s >= 1) continue;
      px(lerp(foot[0] - 8 + r() * 16, mx + 13, s), lerp(foot[1], my + 8, s), r() > 0.5 ? C.H5 : C.H4);
    }

  }
  drawMMXwithCat(mx, my, f, {
    rover: false, pad: !(f >= 718 && f < 750), cheer: f >= 718 && f < 750,
    expr: f >= 718 ? 'happy' : f >= 656 ? 'shock' : 'focus', look: 1,
  });
  credit(CR.jaxa);
  // game-style 2x zoom window on the sampling area (magnifies the frame itself)
  if (f >= 634 && f < 700) {
    const k = ramp(f, 634, 640) * (1 - ramp(f, 694, 700));
    const rx0 = Math.round(mx + 4), ry0 = Math.round(L.y - 21), rw = 50, rh = 26;
    const dx = 146, dy = 92, dw = Math.round(rw * 2 * k), dh = rh * 2;
    const copy = new Uint32Array(rw * rh);
    for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) copy[j * rw + i] = getpx(rx0 + i, ry0 + j);
    rect(dx - 3, dy - 3, dw + 6, dh + 6, C.K0); rect(dx - 2, dy - 2, dw + 4, dh + 4, C.A0); rect(dx - 1, dy - 1, dw + 2, dh + 2, C.K0);
    for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) px(dx + i, dy + j, copy[(j >> 1) * rw + (i >> 1)] || C.K0);
    if (k >= 1) {
      // frame marker around the source area
      brackets(rx0 - 1, ry0 - 1, rw + 1, rh + 1, C.A0, 3);
      label(dx, dy + dh + 6, f < 656 ? 'CORING ARM: DIGS TO 2 cm' : 'NITROGEN GAS BURST', C.P0);
      if (f >= 656) label(dx, dy + dh + 16, 'IN A FRACTION OF A SECOND', C.A0);
      drawText(FONT_S, 'ZOOM x2', dx + 2, dy + 2, C.A0);
    }
  }
  // target panel + the sample "coin" collect
  const panelOn = f >= 687;
  if (panelOn) {
    const k = ramp(f, 687, 692);
    rect(SLOT.x - 4, SLOT.y - 4, Math.round(84 * k), 22, C.K0);
    rect(SLOT.x - 4, SLOT.y - 4, Math.round(84 * k), 1, C.A2);
    if (k >= 1) {
      const filled = f >= 723;
      rect(SLOT.x, SLOT.y, 13, 13, filled ? (f < 727 ? C.P0 : C.A3) : C.K2);
      ring(SLOT.x + 6.5, SLOT.y + 6.5, 6.4, C.A0, 1);
      if (filled) coinSpr(f, SLOT.x + 6.5, SLOT.y + 6.5, true);
      drawText(FONT_S, 'TARGET', SLOT.x + 16, SLOT.y - 1, C.P1);
      drawText(FONT_S, 'AT LEAST 10 g', SLOT.x + 16, SLOT.y + 7, filled ? C.A0 : C.P0);
    }
  }
  if (f >= 700 && f < 723) {
    // pops out of the canister, arcs up spinning, flies to the slot
    const s = (f - 700) / 23;
    const p0 = [mx + 14, my + 6], p1 = [SLOT.x + 6.5, SLOT.y + 6.5];
    const x = lerp(p0[0], p1[0], eio(s)), y = lerp(p0[1], p1[1], s) - Math.sin(s * Math.PI) * 60;
    coinSpr(f, x, y, false);
    sparkle(x - 6 + (f % 3), y + 5, 1, C.A1);
  }
  if (f >= 723 && f < 735) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, r = (f - 723) * 2.2; sparkle(SLOT.x + 6.5 + Math.cos(a) * r, SLOT.y + 6.5 + Math.sin(a) * r, 1, C.A1, C.A0); }
  if (f >= 706) {
    if (f < 762) label(135, 90, 'AT LEAST', C.P1, { center: true });
    slam('10 g', 135, 124, f, 723, 3, ['A1', 'A0', 'A0', 'A2'], { shadow: 'A4', until: 762 });
  }
}
// the sample as a spinning pixel "coin" (a little Phobos rock in a gold ring)
function coinSpr(f, x, y, still) {
  const ph = still ? 0 : cad(f, 3) / 3 % 4;
  const wv = [5, 3, 1, 3][ph];
  for (let j = -5; j <= 5; j++) for (let i = -wv; i <= wv; i++) {
    const q = (i / (wv + 0.5)) ** 2 + (j / 5.5) ** 2;
    if (q > 1) continue;
    const edge = q > 0.55;
    px(x + i, y + j, edge ? (i < 0 ? C.A1 : C.A0) : (j < 0 ? C.H4 : C.H2));
  }
  if (!still && ph === 0) px(x - 2, y - 2, C.P0);
}

function sceneStage4(f) {
  if (f < 806) {
    // lift-off from Phobos: camera tilts up with MMX, the ground drops away
    const cam = sceneMode7(f);
    const L = m7project(cam, MMX_LAND.x, MMX_LAND.z, 0);
    const rw = roverAt(f);
    const g = m7project(cam, rw.x, rw.z, 0);
    if (g && g.y < H + 10) { const rs = roverSpr({}); blit(rs, Math.round(g.x - rs.w / 2), Math.round(g.y - rs.h + 1)); credit(CR.rover); }
    const landY = L ? L.y - 15 : 400;
    const u = eio(ramp(f, 772, 804));
    const my = lerp(landY, 150, u), mx = lerp(L ? L.x : 160, 130, u);
    if (f >= 772) for (const lx of [-14, 14]) for (let i = 0; i < 7; i++) px(mx + lx, my + 16 + i, i < 2 ? C.F3 : i < 4 ? C.F2 : C.F1);
    if (L) dust(f, 774, L.x, L.y, 24, 61, { g: 0.008, life: 80, speed: 0.5 });
    drawMMXwithCat(mx, my, f, { rover: false, pad: true, expr: 'keen' });
    credit(CR.jaxa);
    return;
  }
  // deep space: one burn to leave Mars, then the capsule home to Earth
  const [sx, sy] = shakeAt(f, [[802, 3, 16]]);
  bands(0, H, ['K0', 'K0', 'K1']);
  milkyWay(f, f * 3, 40);
  const sp = f < 846 ? 4 + 3 * ramp(f, 802, 812) : 3;
  drawStars(f, f * sp, 0, { streak: f < 846 ? 9 : 4, dx: 1 });
  // Mars receding behind (real image), shrinking to the left
  if (f < 860) {
    const u = eout(ramp(f, 800, 850));
    const r = lerp(110, 10, u);
    drawPhoto('mars', lerp(150, -10, u) + sx, lerp(330, 300, u) + sy, r * 2, { pal: PAL.mars });
    credit(CR.mars);
  }
  // Earth (drawn) arrives from the right
  const eu = eout(ramp(f, 836, 868));
  const er = Math.round(lerp(50, 98, eu));
  const ex = Math.round(lerp(330, 178, eu)), ey = 186;
  let pin = null;
  if (f >= 836) {
    const lon0 = 134 + (f - 870) * 0.03, lat0 = -20;
    const es = earthSpr(er, lon0, lat0);
    blit(es, ex - es.c0, ey - es.c0);
    credit(CR.earth);
    const p = earthPt(er, lon0, lat0, 135, -30);
    if (p) pin = [ex + p.x, ey + p.y];
    if (pin && f >= 869) {
      const d = f - 869, drop = d < 8 ? (8 - d) * (8 - d) * 0.6 : 0;
      const X = pin[0], Y = pin[1] - drop;
      disc(X, Y - 10, 3.6, C.K0); disc(X, Y - 10, 2.8, C.A0); px(X, Y - 10, C.K0); vline(X, Y - 7, Y - 1, C.A0);
      label(X, Y - 27, 'AUSTRALIA', C.A0, { center: true });
    }
  }
  // MMX releases the capsule (on "Capsule") and peels away up-left
  const relF = 852;
  let mx = 110 + sx, my = 150 + sy;
  if (f >= 846) { mx = lerp(110, 92, eio(ramp(f, 846, 852))); my = lerp(150, 140, eio(ramp(f, 846, 852))); }
  if (f > relF) { const e = f - relF; mx -= e * e * 0.06; my -= e * e * 0.04 + e * 0.3; }
  if (f < 900) {
    const flame = f < 846 ? (f >= 802 ? 52 + 6 * Math.sin(f * 0.7) : 6) : 10;
    drawMMXwithCat(mx, my, f, { rover: false, capsule: f < relF, pad: f < 846, expr: f >= 802 ? 'happy' : 'keen', flame, cheer: f >= 846 && f < 870 });
    credit(CR.jaxa);
  }
  // the capsule: from MMX down to the pin, heating up as it enters the atmosphere
  if (f >= relF && pin) {
    const s0 = ramp(f, relF, 902), s = ein(s0) * 0.7 + s0 * 0.3;
    const p0 = [92.5, 123];
    const P = (q) => [lerp(p0[0], pin[0], q) + Math.sin(q * Math.PI) * 18, lerp(p0[1], pin[1], q * q)];
    const [cx, cy] = P(s);
    const hot = s > 0.35;
    if (s < 1) {
      for (let i = 1; i < 30; i++) {
        const q = Math.max(0, s - i * 0.012);
        const [tx, ty] = P(q);
        const w = hot ? Math.max(0.6, 3.6 - i * 0.12) : Math.max(0.5, 1.2 - i * 0.05);
        const c = !hot ? (i < 8 ? C.P3 : C.K4) : i < 4 ? C.F3 : i < 10 ? C.F2 : i < 18 ? C.F1 : C.F0;
        disc(tx, ty, w, c);
        if (hot && hash(cad(f, 1), i) > 0.7) px(tx + (hash(i, f) - 0.5) * 10, ty + (hash(f, i) - 0.5) * 10, C.F2);
      }
      if (hot) for (let a = 0; a < 6.28; a += 0.2) if (hash(cad(f, 1), Math.round(a * 10)) > 0.35) px(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, a < 3.14 ? C.F2 : C.F1);
      const cs = capsuleSpr({ hot });
      blit(cs, Math.round(cx - cs.w / 2), Math.round(cy - cs.h / 2));
      credit(CR.jaxa);
      if (s < 0.45) label(cx, cy - 18, 'CAPSULE', C.P0, { center: true });
    }
    if (f >= 902 && f < 916) for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, r = (f - 902) * 2; sparkle(pin[0] + Math.cos(a) * r, pin[1] + Math.sin(a) * r, 1, C.F3, C.F2); }
  }
  if (f >= 806 && f < 852) {
    // overworld route home: travelled (amber) from Mars, ahead (dim) off toward Earth
    const u = eout(ramp(f, 800, 850));
    const m0 = [lerp(150, -10, u), lerp(330, 300, u)], ship = [92, 176];
    const back = [], ahead = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; back.push([lerp(m0[0], ship[0], t), lerp(m0[1], ship[1], t) - Math.sin(t * Math.PI) * 20]); }
    for (let i = 0; i <= 20; i++) { const t = i / 20; ahead.push([lerp(ship[0], 280, t), lerp(ship[1], 150, t) + Math.sin(t * Math.PI) * 24]); }
    dottedPath(back, 1, C.A2, 0);
    dottedPath(ahead, 1, C.K5, -cad(f, 2));
  }
  if (f >= 806 && f < 846) {
    label(135, 236, 'ONE BURN: LEAVE MARS', C.A0, { center: true });
    label(135, 246, 'EACH WAY: JUST UNDER ONE YEAR', C.P1, { center: true });
  }
  slam('2031', 74, 272, f, 886, 3, ['P0', 'P0', 'A1', 'A0'], { shadow: 'K3' });
}

// ---------- LOOT (f 928..1047): outback dawn, the capsule opens like a treasure chest ----------
function sceneLoot(f) {
  const lf = f - 928;
  const pan = lf * 0.22;
  bands(0, 206, ['K1', 'K3', 'R1', 'R3', 'F1', 'F2']);
  disc(212 - pan * 0.1, 200, 17, C.F2); disc(212 - pan * 0.1, 200, 13, C.F3);
  for (let i = 0; i < 4; i++) hline(150 - pan * 0.1, 270, 168 + i * 9, C.F1);
  const mx0 = -pan * 0.3;
  poly([[mx0 - 20, 207], [mx0 + 10, 188], [mx0 + 60, 186], [mx0 + 80, 207]], C.R1);
  poly([[mx0 + 150, 207], [mx0 + 165, 180], [mx0 + 230, 178], [mx0 + 250, 192], [mx0 + 300, 194], [mx0 + 310, 207]], C.R1);
  rect(0, 204, W, 6, C.R2);
  bands(208, H, ['R2', 'R3', 'R4', 'R4', 'R5']);
  const r = mulberry(5150);
  for (let i = 0; i < 50; i++) {
    const y = 214 + r() * 260, depth = (y - 200) / 280;
    let x = (r() * 400 - pan * (0.4 + depth)) % 300; if (x < -20) x += 300;
    const s = 1 + Math.round(depth * 3);
    if (r() > 0.5) { for (let k = -s; k <= s; k++) { px(x + k, y - Math.abs(k) % 2 - 1, C.G1); px(x + k, y, C.G0); } px(x, y - s - 1, C.G2); }
    else { rect(x, y, s + 1, Math.max(1, s - 1), C.R2); px(x, y, C.R5); }
  }
  // the capsule in its little landing scar
  const cx = 186 - pan * 0.6, gy = 292;
  ellipse(cx, gy - 1, 30, 6, C.R2); ellipse(cx, gy - 2, 24, 4, C.R3);
  const open = f >= 940 ? eback(ramp(f, 940, 952)) * 1.2 : 0;
  // light from inside: soft dithered rays
  if (f >= 944) {
    const k = ramp(f, 944, 954);
    const ox = cx, oy = gy - 14;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.27 + Math.sin(f * 0.05) * 0.05;
      const len = (40 + (i % 2) * 16) * k;
      for (let d = 4; d < len; d++) {
        const w = 1 + d * 0.05;
        for (let j = -w; j <= w; j++) {
          const X = Math.round(ox + Math.cos(a) * d - Math.sin(a) * j), Y = Math.round(oy + Math.sin(a) * d + Math.cos(a) * j);
          const u = d / len;
          if (u < 0.45 || bayer(X, Y) + 0.5 < 1.6 * (1 - u)) px(X, Y, u < 0.3 ? C.F3 : i % 2 ? C.A1 : C.A0);
        }
      }
    }
  }
  const cs = capsuleBigSpr(open);
  blit(cs, Math.round(cx - cs.w / 2), gy - cs.h + 2);
  credit(CR.jaxa);
  if (f < 944) for (let i = 0; i < 10; i++) { const a = (f * 0.6 + i * 9) % 60; px(cx - 6 + Math.sin(a * 0.15 + i) * 3, gy - 24 - a, a > 40 ? C.R4 : C.P2); }
  // Night Shift (big): hops in, "?" at the loot, then lifts the sample overhead
  let x, y, o;
  if (f < 946) {
    const s = clamp((f - 926) / 20, 0, 1), hs = (s * 2) % 1;
    x = lerp(-30, 100, s); y = gy - Math.abs(Math.sin(hs * Math.PI)) * 26;
    o = { expr: 'keen', hL: [-16, -30], hR: [16, -30] };
  } else {
    x = 100; y = gy;
    const jump = f >= 949 && f < 963 ? Math.sin((f - 949) / 14 * Math.PI) * 18 : 0;
    y -= jump;
    if (f >= 949) o = { expr: 'happy', prop: 'rock', hL: [-16, -76], hR: [16, -76] };
    else o = { expr: 'shock', hL: [-17, -26], hR: [17, -26], mouth: 2 };
  }
  drawCatBig(x, y, Object.assign({ tail: f * 0.25, blink: blinkAt(f, 5) && f < 940 }, o));
  if (f >= 938 && f < 950) {
    const bx = x + 18, by = y - 102;
    rect(bx - 1, by - 1, 15, 17, C.K0); rect(bx, by, 13, 15, C.P0); px(bx + 3, by + 15, C.P0); px(bx + 3, by + 16, C.K0);
    drawText(FONT_M, '?', bx + 4, by + 3, C.K0);
  }
  if (f >= 949) for (let i = 0; i < 6; i++) { const a = f * 0.09 + i * 1.047; sparkle(x + Math.cos(a) * 20, y - 82 + Math.sin(a) * 9, (f + i) % 6 < 3 ? 2 : 1, C.A1, C.A0); }
  // item banner
  if (f >= 951) {
    const k = ramp(f, 951, 957);
    const bw = Math.round(224 * k);
    rect(135 - bw / 2, 44, bw, 46, C.K0);
    rect(135 - bw / 2, 44, bw, 2, C.A0); rect(135 - bw / 2, 88, bw, 2, C.A0);
    if (k >= 1) {
      const t = titleSpr('PHOBOS SAMPLE', 2, ['A1', 'A0', 'A0', 'A2'], 'K0', null);
      blit(t, Math.round(135 - t.w / 2), 49);
      label(135, 76, 'FIRST EVER BROUGHT HOME', C.P0, { center: true });
    }
  }
}

// ---------- NEXT (f 1047..1167) ----------
let ELEC = null;
function sceneNext(f) {
  bands(0, 236, ['K0', 'K1', 'K2', 'B0']);
  milkyWay(f, f * 0.2, 0, 236);
  drawStars(f, f * 0.2, 0, { yMax: 234 });
  rect(0, 236, W, H - 236, C.B0);
  for (let i = 0; i < 50; i++) { const wy = 239 + i * 5, wx = ((i * 67 + f * (0.3 + (i % 5) * 0.08)) % (W + 30)) - 15; if (wy < H) hline(wx, wx + 5 + (i % 4) * 2, wy, i % 3 ? C.B1 : C.K3); }
  // headland with the pad (Mahia Peninsula)
  poly([[150, 480], [162, 246], [186, 236], [270, 233], [270, 480]], C.G0);
  poly([[162, 246], [186, 236], [270, 233], [270, 239], [186, 242]], C.G1);
  for (let i = 0; i < 16; i++) hline(176 + (i * 29) % 90, 179 + (i * 29) % 90, 250 + (i * 17) % 200, C.K3);
  rect(196, 226, 50, 8, C.P3); rect(196, 226, 50, 1, C.P2); rect(196, 234, 50, 2, C.K4);
  if (!ELEC) ELEC = electronSpr();
  const ex = 214, ey = 228 - ELEC.h + 2;
  for (let y = ey + 8; y < 226; y++) { px(228, y, C.K4); px(233, y, C.K4); if (y % 5 === 0) hline(228, 233, y, C.K4); }
  if (cad(f, 15) % 30 < 15) { px(230, ey + 6, C.F0); px(231, ey + 6, C.F0); }
  for (let i = 0; i < 7; i++) { const a = (f * 0.5 + i * 11) % 44; px(ex + 3 + Math.sin(i + a * 0.2) * 3, 224 - a * 0.6, a > 30 ? C.K4 : C.P3); }
  blit(ELEC, ex - 7, ey);
  credit(CR.ll2);
  label(221, 246, 'MAHIA, NEW ZEALAND', C.P1, { center: true });
  // Night Shift (big) on a rock in the foreground, pointing at the rocket
  poly([[18, 300], [30, 284], [70, 280], [104, 286], [118, 300]], C.K3); poly([[30, 284], [70, 280], [104, 286], [96, 288], [40, 288]], C.K4);
  const ent = eout(ramp(f, 1046, 1060));
  drawCatBig(lerp(-40, 66, ent), 284, {
    expr: f >= 1141 ? 'happy' : 'keen', tail: f * 0.2, blink: blinkAt(f, 7), look: 1,
    hL: [-15, -18], hR: f >= 1060 ? [28, -58] : [15, -18], mouth: 0,
  });
  // the card
  slam('NEXT', 112, 42, f, 1047, 2, ['A1', 'A0', 'A0', 'A2'], { shadow: 'A4' });
  if (f >= 1060) {
    const tw = textWidth(FONT_M, 'Rocket Lab Electron');
    const k = ramp(f, 1060, 1066), w = Math.round(tw * k);
    rect(112 - w / 2 - 4, 62, w + 8, 16, C.K0);
    if (k >= 1) drawText(FONT_M, 'Rocket Lab Electron', 112 - Math.round(tw / 2), 64, C.P0, { shadow: C.K3 });
  }
  if (f >= 1094) {
    const sat = satSpr();
    for (let i = 0; i < 3; i++) {
      const fi = 1094 + i * 4;
      if (f < fi) continue;
      const d = f - fi;
      const yb = d < 4 ? -(4 - d) * 2 : Math.round(Math.sin((f + i * 10) * 0.12) * 1);
      blit(sat, 82 + i * 26, 86 + yb);
      if (d < 3) sparkle(82 + i * 26 + 5, 88 + yb, 3, C.P0, C.A1);
    }
  }
  if (f >= 1102) label(112, 102, '3 HAWKEYE 360 SATELLITES', C.P0, { center: true });
  slam('WED 21 OCT', 100, 136, f, 1141, 2, ['P0', 'P0', 'A1', 'A0'], { shadow: 'K3' });
}

// ---------- END CARD (f 1167..1260) ----------
function sceneEnd(f) {
  bands(0, H, ['K0', 'K0', 'K1', 'K2']);
  milkyWay(f, f * 0.25, -f * 0.1);
  drawStars(f, f * 0.25, -f * 0.1);
  // MMX cameo, far away, cruising across
  {
    const u = (f - 1167) / 93;
    const m = mmxCached({ rover: false, capsule: false, legs: true });
    const x = Math.round(lerp(-40, 250, u)), y = Math.round(166 - u * 20);
    drawFlame(x + 18, y + 22, 8, f, -1);
    blit(m, x, y);
    credit(CR.jaxa);
  }
  // the wordmark: echo mark (solid dot, hollow ring) + DOWNLINK (off-white) + CAT (amber)
  const dl = titleSpr('DOWNLINK', 2, ['P0', 'P0', 'P1', 'P1'], 'K0', 'K3');
  const ct = titleSpr('CAT', 2, ['A1', 'A0', 'A0', 'A2'], 'K0', 'A4');
  const mark = 36;
  const total = mark + dl.w + 6 + ct.w;
  const x0 = Math.round(135 - total / 2), y0 = 104;
  if (f >= 1170) disc(x0 + 8, y0 + 12, f - 1170 < 2 ? 9 : 7, C.A0);
  if (f >= 1212) {
    ring(x0 + 26, y0 + 12, 7.4, C.A0, 2.6);
    for (let k = 0; k < 2; k++) {
      const d = f - 1212 - k * 8; if (d < 0 || d > 26) continue;
      const rr = 8 + d * 1.8;
      for (let a = 0; a < 6.283; a += 1 / rr) { const X = Math.round(x0 + 26 + Math.cos(a) * rr), Y = Math.round(y0 + 12 + Math.sin(a) * rr); if (bayer(X, Y) + 0.5 > d / 26) px(X, Y, C.A2); }
    }
  } else if (f >= 1180 && cad(f, 4) % 8 < 4) ring(x0 + 26, y0 + 12, 7.4, C.A3, 1);
  const typed = clamp(Math.floor((f - 1172) / 2), 0, 8);
  if (typed > 0) blit(titleSpr('DOWNLINK'.slice(0, typed), 2, ['P0', 'P0', 'P1', 'P1'], 'K0', 'K3'), x0 + mark, y0);
  if (f >= 1188) blit(ct, x0 + mark + dl.w + 6, y0 + (f < 1191 ? -3 : 0));
  if (f >= 1192 && cad(f, 8) % 16 < 12) label(135, y0 + 36, '> FOLLOW', C.A0, { center: true });
  // ground and Night Shift (big) waving goodbye
  bands(292, H, ['K3', 'K2', 'K1', 'K0']);
  hline(0, W, 292, C.K5);
  for (let i = 0; i < 12; i++) { const x = (i * 41 + 7) % W; hline(x, x + 6, 300 + (i * 13) % 30, C.K4); }
  const wv = Math.sin(f * 0.45);
  drawCatBig(135, 292, {
    expr: f >= 1212 && f < 1232 ? 'wink' : 'happy', tail: f * 0.22, blink: false, mouth: 0,
    hL: [-15, -18], hR: [20 + Math.round(wv * 4), -58 - Math.round(Math.abs(wv) * 2)],
  });
}
