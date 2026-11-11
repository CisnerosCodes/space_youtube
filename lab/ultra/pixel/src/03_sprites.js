// ===== 03_sprites.js: characters and machines, all drawn in code as pixel art =====
// MMX, H3, IDEFIX, the capsule and Electron are clearly stylized game sprites (illustrations).

// ---------- Night Shift, in-scene sprite (little spacesuit + glass helmet) ----------
// o = { pose:'stand'|'sit', hL:[dx,dy], hR:[dx,dy] (hand targets rel. to the feet anchor),
//       expr, blink, mouth, look:[-1..1], tail (phase), prop:'pad'|'rock'|null, helmet:true, squash }
function catSprite(o) {
  const S = new Spr(44, 56);
  const ax = 22, ay = 53;
  const sit = o.pose === 'sit';
  const dy = sit ? 3 : 0; // everything above the hips drops when sitting
  const bodyTop = ay - 14 + dy;
  const P = (k) => C[k];
  // tail (behind)
  const tp = o.tail || 0;
  const tail = [];
  for (let i = 0; i <= 7; i++) {
    const s = i / 7;
    tail.push([ax + 5 + i * 1.3, ay - 6 + dy - i * 1.1 + Math.sin(tp + i * 0.75) * s * 2.2]);
  }
  const tailS = new Spr(44, 56);
  for (let i = 0; i < tail.length - 1; i++) thick(tail[i][0], tail[i][1], tail[i + 1][0], tail[i + 1][1], 2.2, P('C0') || C.K0, tailS);
  const tailO = outlined(tailS, C.P2);
  for (let y = 0; y < tailO.h; y++) for (let x = 0; x < tailO.w; x++) { const c = tailO.d[y * tailO.w + x]; if (c) S.set(x - 1, y - 1, c); }
  // legs and boots
  if (!sit) {
    S.rect(ax - 4, ay - 5, 3, 3, C.P0); S.rect(ax + 1, ay - 5, 3, 3, C.P1);
    S.rect(ax - 5, ay - 2, 4, 2, C.P3); S.rect(ax + 1, ay - 2, 4, 2, C.P3);
  } else {
    S.rect(ax - 6, ay - 2, 4, 2, C.P0); S.rect(ax + 2, ay - 2, 4, 2, C.P1);
    S.rect(ax - 8, ay - 2, 2, 2, C.P3); S.rect(ax + 6, ay - 2, 2, 2, C.P3);
  }
  // arms behind torso? (only when the hand is behind; we keep both in front for readability)
  // torso (rounded)
  const tx0 = ax - 5, tx1 = ax + 5;
  for (let y = bodyTop; y <= ay - 5 + dy - (sit ? 2 : 0); y++) for (let x = tx0; x <= tx1; x++) {
    const corner = (y === bodyTop || y === ay - 5 + dy - (sit ? 2 : 0)) && (x === tx0 || x === tx1);
    if (corner) continue;
    S.set(x, y, x >= tx1 - 2 ? C.P1 : C.P0);
  }
  const belt = ay - 6 + dy - (sit ? 2 : 0);
  for (let x = tx0 + 1; x < tx1; x++) S.set(x, belt, C.P2);
  // chest echo mark: solid dot + hollow ring
  const my = bodyTop + 3;
  [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]].forEach(([i, j]) => S.set(ax - 4 + i, my - 1 + j, C.A0));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== 1 || j !== 1) S.set(ax + 0 + i, my - 1 + j, C.A0);
  // collar ring
  for (let x = ax - 4; x <= ax + 4; x++) S.set(x, bodyTop - 1, C.P2);
  // ---- helmet + head
  const hx = ax, hy = ay - 24 + dy;
  if (o.helmet !== false) disc(hx, hy, 9.6, C.K2, S);
  // head into its own buffer for the light keyline
  const HD = new Spr(44, 56);
  ellipse(hx, hy + 1, 6.6, 5.0, C.K0 === 0 ? 1 : C.K0, HD);
  const ear = (sgn, tw) => {
    const e = [[hx + sgn * 6.5, hy - 1], [hx + sgn * (5.6 + tw * 0.6), hy - 8 + Math.abs(tw)], [hx + sgn * 1.2, hy - 4]];
    poly(e, C.K0, HD);
    HD.set(Math.round(hx + sgn * 4.6 - (sgn < 0 ? 1 : 0)), hy - 4, C.A3);
    HD.set(Math.round(hx + sgn * 4.6 - (sgn < 0 ? 1 : 0)), hy - 5, C.A3);
  };
  ear(-1, o.earL || 0); ear(1, o.earR || 0);
  HD.set(hx, hy - 5, C.K0); HD.set(hx + 1, hy - 6, C.K0); HD.set(hx - 1, hy - 5, C.K0);
  const HO = outlined(HD, C.P2);
  for (let y = 0; y < HO.h; y++) for (let x = 0; x < HO.w; x++) { const c = HO.d[y * HO.w + x]; if (c) S.set(x - 1, y - 1, c); }
  // eyes
  const lk = Math.round((o.look || 0) * 1);
  const ex0 = hx - 5 + lk, ex1 = hx + 1 + lk, ey = hy - 2;
  const expr = o.expr || 'neutral';
  if (o.blink || expr === 'closed') {
    for (let i = 0; i < 4; i++) { S.set(ex0 + i, ey + 2, C.A2); S.set(ex1 + i, ey + 2, C.A2); }
  } else if (expr === 'happy') {
    [[0, 2], [1, 1], [2, 1], [3, 2]].forEach(([i, j]) => { S.set(ex0 + i, ey + j, C.A0); S.set(ex1 + i, ey + j, C.A0); });
    [[0, 3], [3, 3]].forEach(([i, j]) => { S.set(ex0 + i, ey + j, C.A0); S.set(ex1 + i, ey + j, C.A0); });
  } else {
    const dot = ['.##.', '####', '####', '.##.'], rg = ['.##.', '#..#', '#..#', '.##.'];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      if (dot[j][i] === '#') S.set(ex0 + i, ey + j, C.A0);
      if (rg[j][i] === '#') S.set(ex1 + i, ey + j, C.A0);
    }
    S.set(ex0 + 1, ey + 1, C.A1);
    if (expr === 'wink') { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) S.set(ex1 + i, ey + j, C.K0); [[0, 2], [1, 1], [2, 1], [3, 2]].forEach(([i, j]) => S.set(ex1 + i, ey + j, C.A0)); }
    if (expr === 'sly') { for (let i = 0; i < 4; i++) { S.set(ex0 + i, ey, C.K0); S.set(ex1 + i, ey, C.K0); S.set(ex0 + i, ey - 1, C.P2); S.set(ex1 + i, ey - 1, C.P2); } }
    if (expr === 'shock') { S.set(ex0 + 1, ey + 1, C.K0); S.set(ex0 + 2, ey + 2, C.A0); }
  }
  // nose + mouth
  S.set(hx, hy + 2, C.P1);
  if (o.mouth >= 1) { S.set(hx - 1, hy + 3, C.M0); S.set(hx, hy + 3, C.M0); S.set(hx + 1, hy + 3, C.M0); if (o.mouth >= 2) { S.set(hx, hy + 4, C.M1); S.set(hx - 1, hy + 4, C.M0); S.set(hx + 1, hy + 4, C.M0); } }
  else if (expr === 'sly' || expr === 'happy') { S.set(hx - 2, hy + 3, C.P1); S.set(hx - 1, hy + 4, C.P1); S.set(hx, hy + 4, C.P1); S.set(hx + 1, hy + 4, C.P1); S.set(hx + 2, hy + 3, C.P1); }
  else { S.set(hx - 1, hy + 3, C.P1); S.set(hx + 1, hy + 3, C.P1); }
  // helmet rim + glints
  if (o.helmet !== false) {
    ring(hx, hy, 9.6, C.P1, 1, S);
    [[-6, -6], [-7, -5], [-7, -4], [-5, -7], [-4, -8]].forEach(([i, j]) => S.set(hx + i, hy + j, C.P0));
    S.set(hx + 6, hy + 5, C.B4); S.set(hx + 7, hy + 3, C.B4);
  }
  // props
  const shY = bodyTop + 1;
  const shL = [ax - 5, shY], shR = [ax + 5, shY];
  const hL = [ax + (o.hL ? o.hL[0] : -7), ay + (o.hL ? o.hL[1] : -7 + dy)];
  const hR = [ax + (o.hR ? o.hR[0] : 7), ay + (o.hR ? o.hR[1] : -7 + dy)];
  const arm = (sh, hd) => { thick(sh[0], sh[1], hd[0], hd[1], 3, C.P0, S); disc(hd[0], hd[1], 1.6, C.P2, S); };
  if (o.prop === 'pad') {
    S.rect(ax - 4, ay - 8 + dy - 1, 9, 3, C.K3);
    S.set(ax + 2, ay - 8 + dy - 1, C.A0); S.set(ax + 3, ay - 8 + dy, C.F0); S.set(ax - 3, ay - 8 + dy, C.P2);
  }
  arm(shL, hL); arm(shR, hR);
  if (o.prop === 'rock') {
    const rx = (hL[0] + hR[0]) / 2, ry = Math.min(hL[1], hR[1]) - 4;
    const rk = sprFromRows(['..####..', '.#4433#.', '#433322#', '#332221#', '.#2211#.', '..####..'], { '#': 'H1', 4: 'H5', 3: 'H4', 2: 'H3', 1: 'H2' });
    for (let y = 0; y < rk.h; y++) for (let x = 0; x < rk.w; x++) { const c = rk.d[y * rk.w + x]; if (c) S.set(Math.round(rx) - 4 + x, Math.round(ry) - 3 + y, c); }
  }
  const out = outlined(S, C.K0);
  out.ax = ax + 1; out.ay = ay + 1;
  return out;
}
function drawCat(x, y, o) {
  const s = catSprite(o);
  blit(s, Math.round(x) - s.ax, Math.round(y) - s.ay);
  return s;
}

// ---------- Night Shift comm portrait (32 x 32) ----------
function portraitSpr(o) {
  const S = new Spr(32, 32);
  const hx = 16, hy = 18;
  // jacket collar + neck
  poly([[3, 32], [9, 25.5], [15, 32]], C.P0, S); poly([[29, 32], [23, 25.5], [17, 32]], C.P0, S);
  S.rect(12, 26, 8, 6, C.K0 === 0 ? 1 : C.K0);
  poly([[9, 25.5], [12, 27], [13, 32], [10, 32]], C.P1, S); poly([[23, 25.5], [20, 27], [19, 32], [22, 32]], C.P1, S);
  S.set(6, 30, C.A0); S.set(7, 30, C.A0); S.set(6, 31, C.A0); S.set(7, 31, C.A0);
  // head
  const HD = new Spr(32, 32);
  const tw = o.earTw || 0;
  ellipse(hx, hy, 11.4, 8.6, C.K0, HD);
  poly([[4.5, 15], [3.5 - tw * 0.5, 2 + Math.abs(tw)], [12.5, 10]], C.K0, HD);
  poly([[27.5, 15], [28.5 + tw * 0.5, 2 + Math.abs(tw)], [19.5, 10]], C.K0, HD);
  poly([[6, 12], [5.5, 5.5], [10, 10]], C.A3, HD); poly([[26, 12], [26.5, 5.5], [22, 10]], C.A3, HD);
  [[14, 9], [15, 8], [16, 7], [17, 8], [18, 7], [19, 9], [13, 9]].forEach(([x, y]) => HD.set(x, y, C.K0));
  HD.set(16, 6, C.K0); HD.set(18, 6, C.K0);
  const HO = outlined(HD, C.P2);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = HO.get(x + 1, y + 1); if (c) S.set(x, y, c); }
  // headset band and cups
  for (let a = Math.PI * 1.04; a <= Math.PI * 1.96; a += 0.02) {
    S.set(Math.round(hx + Math.cos(a) * 12.8), Math.round(hy - 1 + Math.sin(a) * 11.2), C.P0);
    S.set(Math.round(hx + Math.cos(a) * 12.0), Math.round(hy - 1 + Math.sin(a) * 10.4), C.P1);
  }
  S.rect(1, 13, 4, 8, C.P0); S.rect(27, 13, 4, 8, C.P0); S.rect(4, 14, 1, 6, C.P1); S.rect(27, 14, 1, 6, C.P1);
  S.set(1, 13, 0); S.set(1, 20, 0); S.set(30, 13, 0); S.set(30, 20, 0);
  // mic boom from viewer-left cup to the mouth
  [[3, 21], [4, 22], [5, 23], [6, 24], [7, 24], [8, 25]].forEach(([x, y]) => S.set(x, y, C.P0));
  S.rect(9, 24, 2, 2, C.P2);
  // eyes
  const expr = o.expr || 'neutral';
  const lx = Math.round(o.look || 0);
  const e0 = [11 + lx, 16.5], e1 = [21 + lx, 16.5];
  const big = expr === 'shock' || expr === 'wow';
  const r = big ? 4.1 : 3.5;
  if (o.blink) {
    for (let i = -3; i <= 3; i++) { S.set(e0[0] + i, 17, C.A2); S.set(e1[0] + i, 17, C.A2); }
  } else if (expr === 'happy') {
    for (const e of [e0, e1]) { ring(e[0], e[1] + 2, 3.5, C.A0, 1.6, S); for (let y = Math.round(e[1] + 1.5); y < 24; y++) for (let x = e[0] - 5; x <= e[0] + 5; x++) if (S.get(x, y) === C.A0) S.set(x, y, C.K0); }
  } else {
    disc(e0[0], e0[1], r, C.A0, S);
    ring(e1[0], e1[1], r, C.A0, 1.3, S);
    S.set(e0[0] - 2, e0[1] - 2.5, C.A1); S.set(e0[0] - 1, e0[1] - 2.5, C.A1);
    if (big) { S.set(e0[0], e0[1], C.K0); S.set(e0[0] - 1, e0[1], C.K0); S.set(e0[0], e0[1] - 1, C.K0); S.set(e0[0] - 1, e0[1] - 1, C.K0); }
    if (expr === 'wink') { for (let y = 12; y < 22; y++) for (let x = e1[0] - 5; x <= e1[0] + 5; x++) if (S.get(x, y) === C.A0) S.set(x, y, C.K0); for (let i = -3; i <= 3; i++) S.set(e1[0] + i, 17 - (Math.abs(i) < 2 ? 1 : 0), C.A0); }
    if (expr === 'sly' || expr === 'focus') {
      const cut = expr === 'sly' ? 3 : 2;
      for (const e of [e0, e1]) for (let y = Math.round(e[1] - r - 1); y < Math.round(e[1] - r + cut); y++) for (let x = e[0] - 5; x <= e[0] + 5; x++) if (S.get(x, y) === C.A0 || S.get(x, y) === C.A1) S.set(x, y, C.K0);
      for (const e of [e0, e1]) for (let i = -3; i <= 3; i++) S.set(e[0] + i, Math.round(e[1] - r + cut - 1), C.P2);
    }
  }
  // brows
  const bt = { neutral: 0, shock: -2, wow: -2, sly: 1, focus: 1, happy: -1, wink: 0, keen: -1 }[expr] || 0;
  const slant = { sly: 1, focus: 1 }[expr] || 0;
  for (let i = 0; i < 4; i++) {
    S.set(e0[0] - 2 + i, 11 + bt + (slant ? (i > 1 ? 1 : 0) : 0) - (o.browUp || 0), C.P1);
    S.set(e1[0] - 1 + i, 11 + bt + (slant ? (i < 2 ? 1 : 0) : 0) - (o.browUp || 0), C.P1);
  }
  // nose
  S.set(15, 21, C.P1); S.set(16, 21, C.P1); S.set(17, 21, C.P1); S.set(16, 22, C.P1);
  // mouth
  const m = o.mouth || 0;
  if (m === 0) {
    if (expr === 'sly' || expr === 'happy' || expr === 'wink') { [[12, 22], [13, 23], [14, 24], [15, 24], [16, 23], [17, 24], [18, 24], [19, 23], [20, 22]].forEach(([x, y]) => S.set(x, y, C.P1)); }
    else if (expr === 'shock') { ellipse(16, 25, 1.4, 1.6, C.M0, S); ring(16, 25, 2.2, C.P1, 0.9, S); }
    else { [[14, 23], [15, 24], [16, 23], [17, 24], [18, 23]].forEach(([x, y]) => S.set(x, y, C.P1)); }
  } else {
    const w = m === 1 ? 2.2 : 3.0, h = m === 1 ? 1.2 : 2.2;
    ellipse(16, 24.6, w, h, C.M0, S);
    if (m === 2) { S.set(15, 26, C.M1); S.set(16, 26, C.M1); S.set(17, 26, C.M1); }
    for (let x = 13; x <= 19; x++) if (S.get(x, 22) === C.K0 || !S.get(x, 22)) { /* keep */ }
    S.set(16 - Math.round(w), 23, C.P1); S.set(16 + Math.round(w), 23, C.P1);
  }
  return S;
}

// ---------- MMX (stylized game sprite, side view, facing right) ----------
function mmxSpr(o) {
  o = o || {};
  const S = new Spr(68, 44);
  // solar wings
  const wing = (x0, x1) => {
    for (let x = x0; x <= x1; x++) for (let y = 15; y <= 21; y++) {
      let c = C.B1;
      if (y === 15) c = C.B3; else if ((x - x0) % 4 === 0 || y === 18) c = C.B0;
      S.set(x, y, c);
    }
    for (let x = x0; x <= x1; x++) { S.set(x, 14, C.P2); S.set(x, 22, C.P3); }
    for (let y = 14; y <= 22; y++) { S.set(x0, y, C.P2); S.set(x1, y, C.P2); }
  };
  wing(2, 20); wing(47, 65);
  S.rect(21, 17, 3, 2, C.P2); S.rect(44, 17, 3, 2, C.P2);
  // landing legs (behind body)
  if (o.legs !== false) {
    line(26, 27, 20, 36, C.P2, S); line(27, 27, 21, 36, C.P3, S);
    line(41, 27, 47, 36, C.P2, S); line(40, 27, 46, 36, C.P3, S);
    S.rect(17, 36, 6, 2, C.P1); S.rect(45, 36, 6, 2, C.P1);
    // pneumatic sampler canister on the front leg
    S.rect(44, 30, 3, 3, C.P1); S.set(44, 31, C.A0); S.set(45, 31, C.A0); S.set(46, 31, C.A0);
  }
  // main body (gold thermal blanket)
  for (let y = 13; y <= 27; y++) for (let x = 24; x <= 43; x++) {
    let c = C.A2;
    if (y === 13) c = C.A1; else if (y === 14) c = C.A0; else if (y >= 26) c = C.A3;
    if ((x === 30 || x === 37) && y > 14) c = C.A3;
    if (hash(x, y) > 0.93 && y > 14 && y < 26) c = C.A0;
    S.set(x, y, c);
  }
  // upper module (return module)
  for (let y = 8; y <= 12; y++) for (let x = 27; x <= 40; x++) S.set(x, y, y === 8 ? C.P0 : x > 37 ? C.P2 : C.P1);
  // sample return capsule on top
  if (o.capsule !== false) {
    for (let y = 4; y <= 7; y++) for (let x = 31; x <= 36; x++) {
      const e = (y === 4 && (x === 31 || x === 36));
      if (!e) S.set(x, y, y >= 6 ? C.A3 : C.P0);
    }
  }
  // dish antenna on a mast (front)
  line(42, 12, 46, 8, C.P2, S);
  for (let i = 0; i < 6; i++) { S.set(44 + i, 3 + i, C.P0); S.set(45 + i, 3 + i, i > 3 ? C.P2 : C.P1); }
  S.set(47, 7, C.A0);
  // engine nozzle (rear)
  S.rect(20, 19, 4, 5, C.P3); S.rect(18, 18, 2, 7, C.K4);
  // rover tucked between the legs
  if (o.rover !== false) {
    S.rect(30, 28, 8, 4, C.P1); S.rect(30, 28, 8, 1, C.B2); S.set(37, 30, C.A0);
  }
  return outlined(S, C.K0);
}
// main-engine flame (drawn to the left of the sprite), f = frame for flicker
function drawFlame(x, y, len, f, dir) {
  dir = dir || -1;
  const fl = cad(f, 2);
  const L = len * (0.85 + 0.15 * hash(fl, 7));
  for (let i = 0; i < L; i++) {
    const s = i / L, half = Math.max(0, (1 - s) * (L > 30 ? 5.5 : 3.4) + (hash(fl, i) - 0.5) * 1.2);
    for (let j = -Math.ceil(half); j <= Math.ceil(half); j++) {
      const a = Math.abs(j) / (half + 0.01);
      if (a > 1) continue;
      const k = s + a * 0.5;
      const c = k < 0.25 ? C.F3 : k < 0.5 ? C.F2 : k < 0.8 ? C.F1 : C.F0;
      px(x + dir * i, y + j, c);
    }
  }
}

// ---------- H3 rocket (stylized, no logos), drawn natively at 39 x 150 ----------
const H3G = { w: 39, h: 152, cx: 19, core: [14, 24], fairH: 34, srb: [[7, 11], [27, 31]], srbY: [96, 140], coreY: [34, 140] };
function h3Spr() {
  const G = H3G;
  const S = new Spr(G.w, G.h);
  const body = (x0, x1, y0, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) S.set(x, y, x === x0 ? C.P1 : x >= x1 - 1 ? C.P2 : x >= x1 - 3 ? C.P1 : C.P0);
  };
  body(G.core[0], G.core[1], G.coreY[0], G.coreY[1]);
  // long fairing with an ogive nose
  for (let y = 0; y <= G.fairH; y++) {
    const t = y / G.fairH, half = 6.2 * Math.sqrt(sat(t * 1.3));
    for (let x = Math.round(G.cx - half); x <= Math.round(G.cx + half); x++) S.set(x, y, x > G.cx + half - 2 ? C.P2 : x > G.cx + half - 4 ? C.P1 : C.P0);
  }
  for (let x = G.core[0]; x <= G.core[1]; x++) { S.set(x, G.fairH + 1, C.P3); S.set(x, 88, C.P3); S.set(x, 89, C.P2); S.set(x, 130, C.P3); }
  // a few panel marks on the core (stylized, no markings)
  for (let y = 48; y < 84; y += 9) S.set(G.core[0] + 2, y, C.P2);
  for (const [x0, x1] of G.srb) {
    body(x0, x1, G.srbY[0], G.srbY[1]);
    for (let y = G.srbY[0] - 6; y < G.srbY[0]; y++) { const half = (y - (G.srbY[0] - 6)) / 6 * 2.5; for (let x = Math.round((x0 + x1) / 2 - half); x <= Math.round((x0 + x1) / 2 + half); x++) S.set(x, y, C.P0); }
    S.rect(x0, G.srbY[1] + 1, x1 - x0 + 1, 4, C.P3); S.rect(x0 + 1, G.srbY[1] + 4, x1 - x0 - 1, 1, C.K4);
  }
  S.rect(15, 141, 3, 6, C.K4); S.rect(21, 141, 3, 6, C.K4); S.rect(14, 146, 11, 1, C.P3);
  return outlined(S, C.K0);
}
// ---------- Electron (stylized, black, no logos), 14 x 104 ----------
function electronSpr() {
  const S = new Spr(14, 106);
  for (let y = 0; y < 100; y++) {
    const half = y < 20 ? 4.6 * Math.sqrt(y / 20) : 4.6;
    for (let x = Math.round(6.5 - half); x <= Math.round(6.5 + half); x++) S.set(x, y, x <= 4 ? C.K5 : x <= 6 ? C.K4 : x <= 8 ? C.K3 : C.K2);
  }
  for (let x = 2; x <= 11; x++) { S.set(x, 30, C.P3); S.set(x, 66, C.P3); S.set(x, 67, C.K4); }
  S.rect(3, 100, 8, 4, C.P3); S.rect(4, 104, 6, 1, C.K4);
  return outlined(S, C.P3);
}
// ---------- IDEFIX rover (stylized machine, 24 x 17) ----------
function roverSpr(o) {
  o = o || {};
  const S = new Spr(26, 18);
  // solar panel deck with cells
  for (let x = 1; x <= 24; x++) { S.set(x, 5, C.B3); S.set(x, 6, (x % 4 === 0) ? C.B0 : C.B2); S.set(x, 7, (x % 4 === 0) ? C.B0 : C.B1); }
  // body box
  for (let y = 8; y <= 12; y++) for (let x = 4; x <= 21; x++) S.set(x, y, y === 8 ? C.P0 : x >= 19 ? C.P2 : x >= 17 ? C.P1 : C.P0);
  for (let x = 4; x <= 21; x++) S.set(x, 12, C.P2);
  S.rect(6, 10, 4, 1, C.P2); S.set(14, 10, C.A0);
  // camera mast with stereo head
  S.rect(19, 1, 1, 4, C.P2); S.rect(17, 0, 5, 2, C.K3); S.set(18, 1, C.B3); S.set(20, 1, C.B3);
  // legs/wheels (two visible), turning
  const wp = (o.wheel || 0) % 4;
  for (const wx of [7, 18]) {
    line(wx, 12, wx, 14, C.P3, S);
    disc(wx, 15, 2.4, C.K3, S);
    const a = wp * Math.PI / 4;
    S.set(Math.round(wx + Math.cos(a) * 1.3), Math.round(15 + Math.sin(a) * 1.3), C.P2);
    S.set(Math.round(wx - Math.cos(a) * 1.3), Math.round(15 - Math.sin(a) * 1.3), C.P2);
  }
  return outlined(S, C.K0);
}
// ---------- sample return capsule ----------
function capsuleSpr(o) {
  o = o || {};
  const S = new Spr(14, 12);
  const lid = o.open ? Math.round(o.open) : 0;
  // heat shield base
  for (let y = 7; y <= 10; y++) for (let x = 1; x <= 12; x++) {
    const e = (y === 10 && (x < 3 || x > 10)) || (y === 9 && (x < 2 || x > 11));
    if (!e) S.set(x, y, y >= 9 ? C.A4 : C.A3);
  }
  if (o.hot) for (let x = 2; x <= 11; x++) S.set(x, 10, C.F2);
  // dome lid
  for (let y = 2; y <= 6; y++) for (let x = 2; x <= 11; x++) {
    const dx = (x - 6.5) / 5.2, dy = (y - 7) / 5.0;
    if (dx * dx + dy * dy <= 1) S.set(x, y - lid, x > 8 ? C.P1 : C.P0);
  }
  S.rect(2, 6 - lid, 10, 1, C.P2);
  return outlined(S, C.K0);
}
// ---------- generic small satellite (HawkEye 360 stand-in, stylized) ----------
function satSpr() {
  const S = sprFromRows([
    '##.....##',
    'bb.ppp.bb',
    'bb-ppp-bb',
    'bb.ppp.bb',
    '##.....##',
  ], { '#': 'B3', b: 'B1', p: 'P1', '-': 'P2' });
  return outlined(S, C.K0);
}

// ---------- stars: three seeded parallax layers ----------
const STARS = (() => {
  const r = mulberry(1977);
  const L = [];
  for (const [n, kind] of [[150, 0], [60, 1], [18, 2]]) {
    const a = [];
    for (let i = 0; i < n; i++) a.push({ x: r() * W, y: r() * H, k: kind, tw: r() * 6.28, c: r() });
    L.push(a);
  }
  return L;
})();
// draw stars with per-layer scroll (sx, sy multiplied by depth), streak length for speed
function drawStars(f, sx, sy, opt) {
  opt = opt || {};
  const depth = [0.15, 0.4, 1.0];
  const streak = opt.streak || 0;
  for (let l = 0; l < 3; l++) for (const s of STARS[l]) {
    let x = (s.x - sx * depth[l]) % W; if (x < 0) x += W;
    let y = (s.y - sy * depth[l]) % H; if (y < 0) y += H;
    x = Math.floor(x); y = Math.floor(y);
    if (opt.yMax && y > opt.yMax) continue;
    if (l === 0) px(x, y, s.c > 0.5 ? C.K4 : C.K5);
    else if (l === 1) {
      px(x, y, s.c > 0.6 ? C.P2 : C.K6);
      for (let i = 1; i <= streak * 0.5; i++) px(x + i * (opt.dx || 1), y + i * (opt.dy || 0), C.K4);
    } else {
      const tw = Math.sin(f * 0.21 + s.tw) > 0.6;
      px(x, y, C.P0);
      if (tw && !streak) { px(x - 1, y, C.P2); px(x + 1, y, C.P2); px(x, y - 1, C.P2); px(x, y + 1, C.P2); }
      for (let i = 1; i <= streak; i++) px(x + i * (opt.dx || 1), y + i * (opt.dy || 0), i < streak / 2 ? C.P2 : C.K5);
    }
  }
}

// ---------- illustrated Earth (orthographic, hand-traced coastlines, clearly a drawing) ----------
const LAND = [
  // Australia
  [[142.5, -10.7], [143.5, -13.5], [144.5, -14.5], [145.4, -15], [145.8, -17], [146.3, -19], [148.8, -20.3], [150.5, -22.5], [151.2, -24], [153.2, -25.2], [153.6, -28.2], [153.1, -31], [152.5, -32.4], [151.3, -33.9], [150.2, -35.6], [149.9, -37.5], [147.8, -37.9], [146.3, -39.1], [144.9, -37.9], [143.5, -38.8], [141.5, -38.4], [139.8, -37.3], [139.6, -36], [138.5, -35.5], [138.1, -34.2], [137.6, -35.1], [136.8, -35.3], [137.4, -34.4], [137.9, -33.2], [137.3, -33.6], [135.9, -34.8], [135.2, -34.5], [134.2, -32.8], [132, -32], [131.2, -31.5], [129, -31.7], [126, -32.3], [124, -33], [123.5, -33.9], [121.8, -33.9], [119.8, -34], [118, -35], [116.5, -35], [115.1, -34.3], [115.6, -33.5], [115.7, -32], [115, -30], [114.9, -29], [113.6, -26.5], [113.4, -25.5], [114.1, -22], [116.7, -20.6], [118.6, -20.3], [121, -19.5], [122.3, -17.7], [123.6, -16.3], [125, -15], [126.8, -13.9], [128.2, -15], [129.6, -14.9], [130.2, -13.2], [130.8, -12.4], [132.6, -11.5], [134.2, -12], [135.9, -11.9], [136.8, -12.3], [136.5, -13.3], [135.5, -14.8], [136.3, -15.7], [138, -16.7], [139.3, -17.4], [140.8, -17.4], [141.6, -15.2], [141.6, -12.6]],
  [[144.6, -40.7], [148.3, -40.9], [148.3, -42.2], [147.5, -43.2], [146, -43.6], [145.2, -42.2]],
  [[131, -1.3], [134, -0.9], [137, -1.5], [141, -2.6], [145, -4.3], [147.5, -6], [150.8, -10.3], [147, -10.1], [144, -7.8], [142.5, -9.3], [141, -9.1], [139, -8.1], [138, -5.3], [135, -4.4], [133, -4], [132, -2.6]],
  [[172.7, -34.4], [174.5, -35.8], [176, -37.5], [178.5, -37.7], [177.9, -39.2], [176.8, -40], [175.2, -41.6], [174.6, -39.9], [173.8, -39.2], [174.6, -37.5]],
  [[172.7, -40.5], [174.3, -41.7], [173.2, -43.7], [171.2, -44.5], [170.5, -45.9], [169, -46.6], [166.5, -46], [166.8, -45], [168.3, -44], [170.6, -42.7], [172, -41]],
  [[105.2, -6.8], [108, -6.3], [111, -6.4], [114.5, -7.7], [114.4, -8.7], [110, -8.1], [106, -7.4]],
  [[95.3, 5.6], [98, 3.8], [100.5, 1], [103.7, -1], [106, -3.2], [105.8, -5.8], [104.5, -5.9], [102.3, -4], [100.3, -1], [98.6, 1.7], [95.5, 4]],
  [[109.6, 1.8], [111, 1.5], [113, 3.2], [115.4, 5], [117, 7], [119, 5], [118, 2.5], [117.5, 0.5], [116.5, -2], [116, -3.8], [114.5, -3.5], [111, -3], [110, -1.5], [109, 0]],
  [[119.5, 0.5], [120.5, 0], [123, 0.5], [125, 1.5], [124.5, 0.8], [121.5, -1], [123.3, -0.9], [122.7, -4.5], [121, -2.8], [120.5, -5.5], [119.5, -5.3], [119.3, -3]],
  [[98, 8], [100.3, 6.5], [101, 2.8], [103.5, 1.3], [104.2, 1.4], [103, 5], [102.3, 6.2], [100.8, 8.5], [100, 12.8], [102.5, 12], [105, 8.6], [106.7, 10.5], [109.2, 11.5], [109, 15], [106.5, 17.5], [106.7, 20.5], [108.5, 21.6], [110.5, 20.3], [113, 22.3], [117, 23.5], [120, 26.5], [122, 30], [121, 32], [119.5, 35], [122.5, 37], [121.5, 39], [118, 39], [117.5, 41], [120, 45], [110, 45], [100, 45], [90, 45], [90, 22], [92, 20.5], [94.5, 16], [97.5, 16.5], [98.5, 13]],
  [[120, 18.5], [122.2, 18.5], [122, 16], [121.5, 14], [124, 13], [125.5, 11], [126, 7], [125, 6], [122, 7], [122.5, 9.5], [120.5, 12], [120, 14.5]],
  [[130, 31.5], [131.5, 31.5], [132.5, 33.5], [135, 33.5], [137, 34.5], [140, 35], [141, 38], [142, 41.5], [141.2, 41.2], [140, 40], [139.5, 38], [137, 37], [136, 35.8], [133, 35.5], [131, 34.3]],
  [[140, 41.5], [141.5, 42.5], [144, 43], [145.5, 43.3], [142, 45.5], [141.5, 45]],
];
function inPoly(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
}
const _earthCache = new Map();
// returns a sprite of the drawn Earth, radius r, centred on lon0/lat0
function earthSpr(r, lon0, lat0) {
  r = Math.round(r);
  const key = r + '|' + lon0.toFixed(1) + '|' + lat0.toFixed(1);
  if (_earthCache.has(key)) return _earthCache.get(key);
  const S = new Spr(2 * r + 6, 2 * r + 6);
  const c0 = r + 3;
  const la0 = lat0 * Math.PI / 180, cl = Math.cos(la0), sl = Math.sin(la0);
  for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) {
    const X = (x + 0.5) / r, Y = -(y + 0.5) / r, rr = X * X + Y * Y;
    if (rr > 1) {
      if (rr < Math.pow((r + 2) / r, 2)) S.set(c0 + x, c0 + y, rr < Math.pow((r + 1) / r, 2) ? C.B3 : C.B2);
      continue;
    }
    const Z = Math.sqrt(1 - rr);
    const lat = Math.asin(Y * cl + Z * sl);
    const lon = lon0 * Math.PI / 180 + Math.atan2(X, Z * cl - Y * sl);
    const LA = lat * 180 / Math.PI;
    let LO = lon * 180 / Math.PI; LO = ((LO + 540) % 360) - 180;
    // light from the upper left
    const L = clamp(0.25 + 0.75 * (-0.55 * X + 0.45 * Y + 0.7 * Z), 0, 1);
    const d = BAYER4[((y + 64) & 3) * 4 + ((x + 64) & 3)] * 0.35;
    let land = LA < -67;
    let inner = false;
    if (!land) for (const P of LAND) if (inPoly(LO, LA, P)) { land = true; break; }
    if (land && LA > -45 && LA < -18 && LO > 117 && LO < 150) inner = true;
    let col;
    if (LA < -67) col = L + d > 0.5 ? C.P0 : C.P1;
    else if (land) {
      const v = L + d;
      if (inner) col = v > 0.7 ? C.R5 : v > 0.45 ? C.R4 : v > 0.25 ? C.R3 : C.R2;
      else col = v > 0.7 ? C.G3 : v > 0.45 ? C.G2 : v > 0.25 ? C.G1 : C.G0;
    } else {
      const v = L + d;
      col = v > 0.8 ? C.B3 : v > 0.55 ? C.B2 : v > 0.3 ? C.B1 : C.B0;
    }
    // drawn cloud bands (stylized swirls from hash noise)
    const cn = Math.sin(LO * 0.09 + LA * 0.21) + Math.sin(LO * 0.031 - LA * 0.13 + 1.7) + (hash(Math.floor(LO / 6), Math.floor(LA / 4)) - 0.5);
    if (cn > 1.35 && L + d > 0.3) col = L + d > 0.6 ? C.P0 : C.P1;
    S.set(c0 + x, c0 + y, col);
  }
  S.c0 = c0;
  _earthCache.set(key, S);
  return S;
}
// lon/lat -> screen offset on the drawn globe (null if on the far side)
function earthPt(r, lon0, lat0, lon, lat) {
  const la0 = lat0 * Math.PI / 180, la = lat * Math.PI / 180, dl = (lon - lon0) * Math.PI / 180;
  const z = Math.sin(la0) * Math.sin(la) + Math.cos(la0) * Math.cos(la) * Math.cos(dl);
  if (z < 0) return null;
  const x = Math.cos(la) * Math.sin(dl);
  const y = Math.cos(la0) * Math.sin(la) - Math.sin(la0) * Math.cos(la) * Math.cos(dl);
  return { x: x * r, y: -y * r };
}

// small 4-point sparkle
function sparkle(x, y, size, col, col2) {
  x = Math.round(x); y = Math.round(y);
  px(x, y, col);
  for (let i = 1; i <= size; i++) { const c = i === size ? (col2 || col) : col; px(x - i, y, c); px(x + i, y, c); px(x, y - i, c); px(x, y + i, c); }
}

// ---------- Night Shift, big sprite (native 2x detail; head shared with the comm portrait) ----------
// o: { expr, mouth, blink, hL, hR (hand targets rel. to feet anchor), tail, prop:'rock'|null, look }
function catBigSpr(o) {
  const S = new Spr(80, 96);
  const ax = 40, ay = 93;
  // tail (behind)
  const TS = new Spr(80, 96);
  const tp = o.tail || 0;
  let prev = null;
  for (let i = 0; i <= 10; i++) {
    const s = i / 10;
    const p = [ax + 9 + i * 2.2, ay - 14 - i * 2.0 + Math.sin(tp + i * 0.55) * s * 4.5];
    if (prev) thick(prev[0], prev[1], p[0], p[1], 3.6, C.K0, TS);
    prev = p;
  }
  const TO = outlined(TS, C.P2);
  for (let y = 0; y < 96; y++) for (let x = 0; x < 80; x++) { const c = TO.get(x + 1, y + 1); if (c) S.set(x, y, c); }
  // legs + boots
  S.rect(ax - 8, ay - 12, 6, 8, C.P0); S.rect(ax + 2, ay - 12, 6, 8, C.P1); S.rect(ax + 6, ay - 12, 2, 8, C.P2);
  S.rect(ax - 9, ay - 5, 8, 5, C.P3); S.rect(ax + 1, ay - 5, 8, 5, C.P3); S.rect(ax - 9, ay - 1, 8, 1, C.K4); S.rect(ax + 1, ay - 1, 8, 1, C.K4);
  // torso
  const tx0 = ax - 11, tx1 = ax + 11, ty0 = ay - 33, ty1 = ay - 11;
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    const cx = Math.min(x - tx0, tx1 - x), cy = Math.min(y - ty0, ty1 - y);
    if (cx + cy < 2) continue;
    S.set(x, y, x >= tx1 - 3 ? C.P1 : x >= tx1 - 1 ? C.P2 : C.P0);
  }
  for (let x = tx0 + 1; x < tx1; x++) { S.set(x, ty1 - 2, C.P2); S.set(x, ty1 - 3, C.P3); }
  S.rect(ax - 2, ty1 - 3, 4, 2, C.A0);
  // chest: echo mark (solid dot + hollow ring) and a tiny panel
  disc(ax - 6, ty0 + 8, 2.3, C.A0, S); ring(ax + 1, ty0 + 8, 2.3, C.A0, 1, S);
  S.rect(ax + 5, ty0 + 5, 4, 6, C.K3); S.set(ax + 6, ty0 + 6, C.B3); S.set(ax + 7, ty0 + 8, C.F0); S.set(ax + 6, ty0 + 9, C.A0);
  // collar ring
  for (let x = ax - 9; x <= ax + 9; x++) { S.set(x, ty0 - 1, C.P2); S.set(x, ty0, C.P3); }
  // arms + gloves (raised arms go behind the helmet so they never cover the face)
  const shL = [ax - 11, ty0 + 3], shR = [ax + 11, ty0 + 3];
  const hL = [ax + (o.hL ? o.hL[0] : -15), ay + (o.hL ? o.hL[1] : -16)];
  const hR = [ax + (o.hR ? o.hR[0] : 15), ay + (o.hR ? o.hR[1] : -16)];
  const arm = (sh, hd) => { thick(sh[0], sh[1], hd[0], hd[1], 6, C.P0, S); thick(sh[0] + 1, sh[1] + 1, hd[0] + 1, hd[1] + 1, 2, C.P1, S); disc(hd[0], hd[1], 3.3, C.P2, S); S.set(Math.round(hd[0]) - 1, Math.round(hd[1]) - 1, C.P1); };
  const behindL = hL[1] < ty0 - 6, behindR = hR[1] < ty0 - 6;
  if (behindL) arm(shL, hL);
  if (behindR) arm(shR, hR);
  // helmet glass + head from the portrait
  const hx = ax, hy = ty0 - 19;
  disc(hx, hy, 19.5, C.K2, S);
  const pt = portraitSpr({ expr: o.expr, mouth: o.mouth || 0, blink: o.blink, look: o.look || 0, earTw: o.earTw || 0 });
  for (let j = 0; j < 27; j++) for (let i = 0; i < 32; i++) {
    const c = pt.d[j * 32 + i]; if (!c) continue;
    const X = hx - 16 + i, Y = hy - 17 + j;
    const dx = X + 0.5 - hx, dy = Y + 0.5 - hy;
    if (dx * dx + dy * dy < 18.5 * 18.5) S.set(X, Y, c);
  }
  ring(hx, hy, 19.5, C.P1, 1.6, S);
  for (let a = 3.5; a < 4.4; a += 0.06) { S.set(Math.round(hx + Math.cos(a) * 16), Math.round(hy + Math.sin(a) * 16), C.P0); }
  for (let a = 3.7; a < 4.1; a += 0.08) { S.set(Math.round(hx + Math.cos(a) * 14), Math.round(hy + Math.sin(a) * 14), C.B4); }
  S.set(hx + 13, hy + 11, C.B4); S.set(hx + 14, hy + 10, C.B4); S.set(hx + 12, hy + 12, C.B4);
  if (!behindL) arm(shL, hL);
  if (!behindR) arm(shR, hR);
  // gloves of raised arms peek over the helmet rim
  if (behindL) { disc(hL[0], hL[1], 3.3, C.P2, S); S.set(Math.round(hL[0]) - 1, Math.round(hL[1]) - 1, C.P1); }
  if (behindR) { disc(hR[0], hR[1], 3.3, C.P2, S); S.set(Math.round(hR[0]) - 1, Math.round(hR[1]) - 1, C.P1); }
  if (o.prop === 'rock') {
    const rx = Math.round((hL[0] + hR[0]) / 2), ry = Math.round(Math.min(hL[1], hR[1]) - 7);
    ellipse(rx, ry, 7.5, 5.5, C.H1, S); ellipse(rx - 1, ry - 1, 6.2, 4.2, C.H3, S); ellipse(rx - 2, ry - 2, 3.8, 2.6, C.H4, S);
    S.set(rx + 2, ry + 1, C.H2); S.set(rx + 3, ry, C.H2); S.set(rx - 3, ry + 2, C.H2); S.set(rx - 3, ry - 3, C.H5); S.set(rx + 1, ry - 4, C.H6);
  }
  const out = outlined(S, C.K0);
  out.ax = ax + 1; out.ay = ay + 1;
  return out;
}
function drawCatBig(x, y, o) {
  const s = catBigSpr(o);
  blit(s, Math.round(x) - s.ax, Math.round(y) - s.ay);
  return s;
}
// big capsule for the loot scene (heat shield base + dome lid on a hinge)
function capsuleBigSpr(open) {
  const S = new Spr(40, 34);
  // heat shield
  for (let y = 22; y <= 30; y++) for (let x = 3; x <= 36; x++) {
    const dx = (x - 19.5) / 17, dy = (y - 22) / 9;
    if (dx * dx + dy * dy > 1) continue;
    S.set(x, y, y > 27 ? C.A4 : y > 24 ? C.A3 : C.A2);
  }
  for (let x = 6; x <= 33; x++) { S.set(x, 22, C.P2); S.set(x, 21, C.P3); }
  // inside glow when open
  if (open > 0) { for (let x = 8; x <= 31; x++) { S.set(x, 20, C.A1); S.set(x, 19, C.F3); } }
  // lid: rotates about the hinge at the right (x 34, y 20)
  const ang = -open * 0.9;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const LS = new Spr(40, 34);
  for (let y = 4; y <= 20; y++) for (let x = 5; x <= 34; x++) {
    const dx = (x - 19.5) / 15, dy = (y - 20) / 16;
    if (dx * dx + dy * dy > 1 || y > 20) continue;
    let c = x > 27 ? C.P1 : C.P0;
    if (y === 20) c = C.P2;
    if ((x - 19) * (x - 19) + (y - 10) * (y - 10) < 6) c = C.P2;
    // rotate about hinge
    const hx = 34, hy = 20;
    const X = hx + (x - hx) * ca - (y - hy) * sa, Y = hy + (x - hx) * sa + (y - hy) * ca;
    LS.set(Math.round(X), Math.round(Y), c);
  }
  for (let i = 0; i < LS.d.length; i++) if (LS.d[i]) S.d[i] = LS.d[i];
  return outlined(S, C.K0);
}
