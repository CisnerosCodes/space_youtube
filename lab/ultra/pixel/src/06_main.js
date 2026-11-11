// ===== 06_main.js: timeline, HUD, stage cards, transitions, captions, renderAt =====
initImages();

const LINES = [[0, 9], [10, 20], [21, 25], [26, 34], [35, 40], [41, 48], [49, 53], [54, 65], [66, 74], [75, 85], [86, 88]];
const EMPH = new Set([6, 7, 14, 16, 25, 30, 32, 39, 40, 44, 47, 52, 53, 65, 67, 68]);
const wf = (i) => Math.floor(WORDS[i].start * FPS + 1e-6);   // frame a word appears (<= 1 frame early)
const BOX = { x: 20, y: 318, w: 206, h: 55 };
const TXT = { x: 68, y: 322, w: 154, lh: 13 };
// lay out every line once
const LAYOUT = LINES.map(([a, b]) => {
  const out = []; let x = 0, row = 0;
  for (let i = a; i <= b; i++) {
    const w = textWidth(FONT_M, WORDS[i].text);
    if (x > 0 && x + 4 + w > TXT.w) { row++; x = 0; }
    out.push({ i, x, row, w });
    x += w + 4;
  }
  return out;
});

const STAGES = [
  { f: 220, n: 1, name: 'MARS' },
  { f: 322, n: 2, name: 'LOOKOUT' },
  { f: 570, n: 3, name: 'THE GRAB' },
  { f: 768, n: 4, name: 'HOME' },
];
const EXPR = [[0, 'shock'], [103, 'sly'], [220, 'keen'], [322, 'focus'], [404, 'happy'], [446, 'focus'], [496, 'wow'], [570, 'focus'], [656, 'shock'], [687, 'keen'], [723, 'happy'], [768, 'keen'], [886, 'happy'], [928, 'keen'], [949, 'happy'], [1047, 'neutral'], [1141, 'happy'], [1167, 'happy'], [1197, 'wink']];

function currentLine(f) {
  let li = 0;
  for (let k = 0; k < LINES.length; k++) if (f >= wf(LINES[k][0])) li = k;
  return li;
}

// ---------- transitions ----------
function mosaic(b, y1) {
  b = Math.max(1, Math.round(b)); if (b <= 1) return;
  y1 = y1 || H;
  for (let y = 0; y < y1; y += b) for (let x = 0; x < W; x += b) {
    const c = FB[y * W + x];
    for (let j = y; j < Math.min(y + b, y1); j++) FB.fill(c, j * W + x, j * W + Math.min(x + b, W));
  }
}
function iris(cx, cy, r) {
  const rr = r * r;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    if (dx * dx + dy * dy > rr) FB[y * W + x] = C.K0;
  }
}
function flash(level, col) {
  if (level <= 0) return;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bayer(x, y) + 0.5 < level) FB[y * W + x] = col || C.P0;
}
function blinds(p, col) {
  const s = 16;
  for (let y = 0; y < H; y++) if ((y % s) < p * s) FB.fill(col || C.K0, y * W, y * W + W);
}

// ---------- HUD (top) ----------
function drawHUD(f) {
  if (f < 220 || f >= 1160) return;
  let st = 0; for (const s of STAGES) if (f >= s.f) st = s.n;
  const name = f >= 1047 ? 'NEXT' : f >= 928 ? 'LOOT' : 'STAGE ' + st + ' · ' + STAGES[st - 1].name;
  rect(14, 8, textWidth(FONT_S, name) + 8, 12, C.K0);
  drawText(FONT_S, name, 18, 10, C.A0);
  // four pips: steps done (filled), current (blinking), to come (hollow)
  const done = f >= 928 ? 4 : st - 1;
  for (let i = 0; i < 4; i++) {
    const x = 18 + textWidth(FONT_S, name) + 10 + i * 8, y = 10;
    if (i < done) rect(x, y, 5, 5, C.A0);
    else if (i === done && cad(f, 8) % 16 < 10) { rect(x, y, 5, 5, C.A1); }
    else { rect(x, y, 5, 5, C.K3); rect(x + 1, y + 1, 3, 3, C.K0); }
  }
}
function drawStageCard(f) {
  for (const s of STAGES) {
    const d = f - s.f;
    if (d < 0 || d > 46) continue;
    const yc = 66;
    let hh = 22;
    if (d < 5) hh = Math.round(22 * eout(d / 5));
    if (d > 40) hh = Math.round(22 * (1 - (d - 40) / 6));
    const wipe = d < 6 ? Math.round(W * eout(d / 6)) : W;
    rect(0, yc - hh, wipe, hh * 2, C.K0);
    if (hh > 2) { hline(0, wipe, yc - hh, C.A0); hline(0, wipe, yc + hh - 1, C.A0); }
    if (d >= 4 && d <= 40) {
      const t = titleSpr('STAGE ' + s.n, 2, ['A1', 'A0', 'A0', 'A2'], 'K0', 'A4');
      const slide = d < 10 ? Math.round((1 - eout((d - 4) / 6)) * 160) : 0;
      blit(t, Math.round(135 - t.w / 2) + slide, yc - 19);
      const nw = textWidth(FONT_M, s.name, true);
      if (d >= 8) drawText(FONT_M, s.name, Math.round(135 - nw / 2) - (d < 14 ? Math.round((1 - eout((d - 8) / 6)) * 120) : 0), yc + 6, C.P0, { bold: true, shadow: C.K3 });
    }
  }
}

// ---------- credits slot (above the dialog box) ----------
function drawCredits() {
  // real-image credits verbatim (joined on one line when they fit); illustrations merged into one line
  const photos = CREDITS.filter((c) => !c.startsWith('Illustration'));
  const src = [];
  let anyIll = false;
  for (const c of CREDITS) if (c.startsWith('Illustration')) { anyIll = true; const m = c.match(/facts: (.*)$/); if (m) for (const p of m[1].split(', ')) if (!src.includes(p)) src.push(p); }
  const lines = [];
  if (anyIll) lines.push(src.length ? 'Illustration · facts: ' + src.join(', ') : 'Illustration');
  if (photos.length) {
    const joined = photos.join('  |  ');
    if (textWidth(FONT_S, joined) <= 246) lines.push(joined); else for (const p of photos) lines.push(p);
  }
  let y = BOX.y - 10;
  for (const s of lines) {
    const w = textWidth(FONT_S, s);
    rect(BOX.x, y - 2, w + 5, 10, C.K0);
    drawText(FONT_S, s, BOX.x + 3, y, C.P1);
    y -= 10;
  }
}

// ---------- the dialog box: captions + talking comm portrait ----------
function exprAt(f) { let e = 'neutral'; for (const [ff, x] of EXPR) if (f >= ff) e = x; return e; }
function drawDialog(f) {
  const { x, y, w, h } = BOX;
  // frame
  rect(x, y, w, h, C.K0);
  rect(x + 1, y + 1, w - 2, h - 2, C.P1);
  rect(x + 2, y + 2, w - 4, h - 4, C.K3);
  for (let j = y + 3; j < y + h - 3; j++) {
    const u = (j - y) / h;
    for (let i = x + 3; i < x + w - 3; i++) FB[j * W + i] = bayer(i, j) + 0.5 < u ? C.K1 : C.K2;
  }
  for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) px(cx, cy, 0);
  // amber corner pips
  for (const [cx, cy] of [[x + 3, y + 3], [x + w - 5, y + 3], [x + 3, y + h - 5], [x + w - 5, y + h - 5]]) rect(cx, cy, 2, 2, C.A2);
  // comm window
  const pxw = x + 6, pyw = y + 6;
  rect(pxw - 1, pyw - 1, 38, 38, C.P2);
  rect(pxw, pyw, 36, 36, C.T0);
  for (let j = 0; j < 36; j++) if ((j + cad(f, 3) / 3) % 3 === 0) hline(pxw, pxw + 35, pyw + j, C.T1);
  const li = currentLine(f);
  const lineStart = wf(LINES[li][0]);
  const env = VENV[Math.max(0, cad(f, 2))] || 0;
  const mouth = env > 0.6 ? 2 : env > 0.16 ? 1 : 0;
  const expr = exprAt(f);
  const earTw = Math.sin(f * 0.07) > 0.97 ? 2 : 0;
  const pt = portraitSpr({ expr, mouth, blink: blinkAt(f, 1) && expr !== 'happy', look: 0, earTw });
  const bob = env > 0.5 && cad(f, 4) % 8 < 4 ? -1 : 0;
  for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) {
    const c = pt.d[j * 32 + i]; if (!c) continue;
    const yy = pyw + 4 + j + bob; if (yy >= pyw + 36 || yy < pyw) continue;
    FB[yy * W + pxw + 2 + i] = c;
  }
  // "comm open" static for 3 frames when a new line starts
  const sd = f - lineStart;
  if (sd >= 0 && sd < 3 && li > 0) for (let j = 0; j < 36; j++) for (let i = 0; i < 36; i++) if (hash(i + cad(f, 1) * 7, j) > 0.55) FB[(pyw + j) * W + pxw + i] = hash(i, j + f) > 0.5 ? C.T2 : C.P2;
  // signal meter under the portrait: echo mark + level bars (the real voice level)
  const my = y + h - 9;
  disc(pxw + 2, my + 1.5, 2.4, C.A0);
  ring(pxw + 8, my + 1.5, 2.4, C.A0, 1);
  for (let b = 0; b < 6; b++) {
    const on = env > (b + 0.5) / 6.5;
    rect(pxw + 15 + b * 4, my + 4 - b, 2, 1 + b, on ? (b > 3 ? C.A1 : C.A0) : C.K3);
  }
  // text
  if (f < wf(0)) {
    if (cad(f, 4) % 8 < 4) rect(TXT.x, TXT.y + 9, 5, 2, C.A0);
  } else {
    for (const it of LAYOUT[li]) {
      const sf = wf(it.i);
      if (f < sf) continue;
      const pop = f - sf < 2 ? -1 : 0;
      const col = EMPH.has(it.i) ? C.A0 : C.P0;
      drawText(FONT_M, WORDS[it.i].text, TXT.x + it.x, TXT.y + it.row * TXT.lh + pop, col, { shadow: C.K0 });
    }
    // next-page arrow once the line is fully spoken
    const lastI = LINES[li][1];
    if (li < LINES.length - 1 && f >= Math.ceil(WORDS[lastI].end * FPS) && cad(f, 6) % 12 < 8) {
      const ax = x + w - 12, ay = y + h - 9 + (cad(f, 6) % 12 < 4 ? 1 : 0);
      hline(ax, ax + 4, ay, C.A0); hline(ax + 1, ax + 3, ay + 1, C.A0); px(ax + 2, ay + 2, C.A0);
    }
  }
}

// ---------- the frame ----------
function renderFrame(f) {
  CREDITS = [];
  CAM_X = 0; CAM_Y = 0;
  // scene
  if (f < 103) sceneHook(f);
  else if (f < 220) sceneLaunch(f);
  else if (f < 322) sceneStage1(f);
  else if (f < 570) sceneStage2(f);
  else if (f < 768) sceneStage3(f);
  else if (f < 928) sceneStage4(f);
  else if (f < 1047) sceneLoot(f);
  else if (f < 1167) sceneNext(f);
  else sceneEnd(f);
  // overlays that ride the transitions
  drawHUD(f);
  drawStageCard(f);
  // transitions
  if (f >= 96 && f < 110) mosaic(f < 103 ? 1 + (f - 96) * 2.4 : 1 + (110 - f) * 2.4);
  if (f >= 304 && f < 340) {
    // iris out on MMX, iris in at Phobos
    const r = f < 322 ? lerp(260, 0, eio(ramp(f, 304, 320))) : lerp(0, 300, eout(ramp(f, 322, 336)));
    const cx = f < 322 ? 82 : 140, cy = f < 322 ? 150 : 90;
    iris(cx, cy, r);
  }
  if (f >= 900 && f < 940) flash(0.9 * (f < 928 ? ramp(f, 900, 927) : 1 - ramp(f, 928, 940)));
  if (f >= 1039 && f < 1055) blinds(f < 1047 ? ramp(f, 1039, 1047) : 1 - ramp(f, 1047, 1055));
  if (f >= 1160 && f < 1174) mosaic(f < 1167 ? 1 + (f - 1160) * 2.4 : 1 + (1174 - f) * 2.4);
  // UI that never transitions
  drawCredits();
  drawDialog(f);
}

window.renderAt = function (t) {
  const f = Math.round(t * FPS * 1000) / 1000;
  renderFrame(Math.round(f));
  present();
};
window.__ready = Promise.resolve();
