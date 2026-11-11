// ============================================================================================
// SCENES: the eleven sheets of the press run. Times are from kit/captions.json.
// ============================================================================================
const CR = {
  hirise: 'NASA/JPL-Caltech/University of Arizona',
  model: 'NASA/JPL-Caltech',
  viking: 'USGS Astrogeology Science Center/NASA Ames (Viking Orbiter)',
};
const wS = (i) => WORDS[i].start; // spoken start of word i (s)

// Phobos model orientation (row-major mat3) for a slow tumble
function phobosRot(a, b, c) { return matMul(rotZ(c), matMul(rotX(b), rotY(a))); }

// ------------------------------------------------------------------ 1. HOOK
// a decaying orbit drawn as a perspective spiral around Mars's axis
function courseSpiral(u0, u1, n = 90) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const u = lerp(u0, u1, k / n), th = 0.55 + u * TAU * 1.45, rx = lerp(600, 330, u), cy = lerp(905, 1215, u);
    pts.push([540 + rx * Math.cos(th), cy + rx * 0.2 * Math.sin(th), Math.sin(th)]);
  }
  return pts;
}
const S1 = {
  id: 'hook', t0: 0, cap: 'top',
  credit: () => [CR.model, CR.viking],
  draw(lt, t) {
    const z = 1 + 0.045 * eIO(lt / 3.4);
    const P = { x: 540, y: 735 + 10 * eIO(lt / 3.4) };
    const rotm = phobosRot(0.9 + lt * 0.2, -0.3 + lt * 0.04, 0.2);
    const sp = courseSpiral(0, 1), crawl = -lt * (lt > 1.75 ? 150 : 60);
    const seg = (front) => { const out = []; let cur = []; sp.forEach((q) => { if ((q[2] > 0) === front) cur.push(q); else if (cur.length) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); return out; };
    xf(() => {
      tr(540, 900); scl(z); tr(-540, -900);
      skyGrad(0, 1250, 0.97, 0.3);
      stars(7, 80, [0, 0, W, 1150], t);
      // Mars horizon (USGS Viking mosaic on a rotating globe)
      draw3D([{ kind: 'mars', x: 540, y: 2260, r: 1060, spin: 1.05 + t * 0.045, tilt: -0.08, lat: -0.85, light: [-0.35, 0.8, 0.5], night: 0.75 }]);
      // back half of the decaying orbit (behind Phobos)
      seg(false).forEach((g) => dashed(g, enc(0, 0.75, 0), 6, 22, 18, crawl));
      // ghosts: earlier positions (stroboscopic slow motion)
      const ghost = clamp((lt - 0.95) / 0.3);
      if (ghost > 0) {
        const cv = G3.render([{ kind: 'phobos', x: P.x, y: P.y, s: 23, rot: rotm }]);
        const tmp = mkCanvas(), x2 = tmp.getContext('2d'); x2.drawImage(cv, 0, 0); x2.globalCompositeOperation = 'source-in';
        [[-118, -150, 0.34], [-205, -270, 0.22], [-262, -370, 0.13]].forEach(([dx, dy, d], i) => {
          const g = clamp(ghost * 3 - i); if (g <= 0) return;
          x2.fillStyle = enc(0, d, 0); x2.fillRect(0, 0, W, H);
          const T = SH.T; T.save(); T.globalCompositeOperation = 'multiply'; T.globalAlpha = g; T.translate(P.x + dx, P.y + dy); T.scale(0.82 - i * 0.1, 0.82 - i * 0.1); T.drawImage(tmp, -P.x, -P.y); T.restore();
        });
      }
      // PHOBOS: NASA's shape model of the real moon, tumbling slowly
      draw3D([{ kind: 'phobos', x: P.x, y: P.y, s: 23, rot: rotm, light: [-0.45, 0.5, 0.74], amb: 0.1 }]);
      // front half of the orbit + chevrons
      const front = seg(true);
      front.forEach((g) => dashed(g, C.P, 10, 30, 18, crawl, { cap: 'round' }));
      for (let j = 0; j < 5; j++) {
        const u = (lt * 0.06 + j * 0.2) % 1, k = Math.floor(u * (sp.length - 2)), p0 = sp[k], p1 = sp[k + 1];
        if (p0[2] > 0) arrowHead(p0[0], p0[1], Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), 22, C.P);
      }
    });
    // vertical title along the left edge
    xf(() => { tr(132, 1215); rot(-Math.PI / 2); bigType('PHOBOS', 0, 0, 178, { col: C.P, shadow: [7, 7], shadowCol: C.B, ls: 4 }); });
    xf(() => { tr(170, 1215); rot(-Math.PI / 2); text('27 x 22 x 18 km', 0, 22, C.Y, { font: F.mono(24, 700), ls: 2 }); });
    if (lt > 1.05) label([typed('1.8 m (6 ft) closer', lt - 1.05, 34) || ' ', typed('to Mars every 100 years', lt - 1.55, 34) || ' '], 900, 1040, { size: 25, align: 'right' });
    if (lt > 2.0) label([typed('* in 50 million years: crash into', lt - 2.0, 44) || ' ', typed('Mars or break up into a ring', lt - 2.45, 44) || ' '], 900, 1135, { size: 19, weight: 400, align: 'right' });
  },
};

const IL = (src) => 'Illustration · facts: ' + src;
const fS = (f) => f / FPS; // frame -> s

// ------------------------------------------------------------------ 2a. THE HEIST: H3 launch
const S2 = {
  id: 'heist', t0: fS(92), cut: 'roller', cap: 'bottom',
  credit: () => [IL('JAXA')],
  draw(lt, t) {
    // dawn: pink into sunflower (no blue under the yellow: no muddy overprints)
    tone((c) => { const g = c.createLinearGradient(0, 0, 0, 1400); g.addColorStop(0, enc(0.12, 0.8, 0.0)); g.addColorStop(0.55, enc(0, 0.45, 0.3)); g.addColorStop(1, enc(0, 0.12, 0.75)); c.fillStyle = g; c.fillRect(0, 0, W, H); }, C.W);
    sunburst(540, 1060, 28, 150, 1700, -lt * 0.12, enc(0, 0, 0.7));
    radialTone(540, 1060, 430, 0.95, 0.0, 'y');
    stars(21, 34, [0, 0, W, 430], t, { big: 2.6 });
    const rise = 360 * eIn(lt / 2.2) + 60 * lt;
    const ry = 1120 - rise;
    // launch tower (generic lattice, stylized), its arm swinging away
    solid((c) => {
      c.lineWidth = 7; c.beginPath(); c.moveTo(300, 1250); c.lineTo(300, 520); c.moveTo(372, 1250); c.lineTo(372, 520); c.stroke();
      c.lineWidth = 3.5; c.beginPath(); for (let y = 540; y < 1250; y += 58) { c.moveTo(300, y); c.lineTo(372, y + 58); c.moveTo(372, y); c.lineTo(300, y + 58); c.moveTo(300, y); c.lineTo(372, y); } c.stroke();
      c.lineWidth = 8; c.beginPath(); c.moveTo(286, 520); c.lineTo(386, 520); c.stroke();
      const sw = eOut(clamp(lt / 0.5)) * 0.9; c.lineWidth = 10; c.beginPath(); c.moveTo(372, 640); c.lineTo(372 + Math.cos(-sw) * 120, 640 + Math.sin(-sw) * 120); c.stroke();
    }, C.B, { knock: false });
    tone(rect(372 - 18, 520, 18, 730), enc(0, 0.6, 0));
    // exhaust column under the rocket
    tone((c) => { const g = c.createLinearGradient(0, ry, 0, 1300); g.addColorStop(0, enc(0, 0.85, 0.95)); g.addColorStop(1, enc(0, 0.25, 0.5)); c.fillStyle = g; c.beginPath(); c.moveTo(540 - 34, ry + 30); c.lineTo(540 + 34, ry + 30); c.lineTo(540 + 170, 1320); c.lineTo(540 - 170, 1320); c.closePath(); c.fill(); }, C.W, { knock: true });
    rocketH3(540, ry, 0.95, t, { flame: 220 + 60 * clamp(lt) });
    cloudBank(31, 1150, lt, [
      { n: 8, r0: 120, r1: 210, col: enc(0, 0.5, 0.15), dy: -50, drift: -22, shade: enc(0.3, 0, 0) },
      { n: 9, r0: 100, r1: 180, col: enc(0, 0.1, 0.32), dy: 45, drift: 16, shade: enc(0, 0.32, 0) },
    ]);
    if (lt > 0.25) label([typed('H3 flight No.10', lt - 0.25, 40)], 88, 330, { size: 28 });
    if (lt > 0.7) label([typed('04:41:03 JST, Oct 20, 2026', lt - 0.7, 48), typed('(19:41:03 UTC, Oct 19)', lt - 1.15, 48) || ' '], 88, 410, { size: 22, weight: 400 });
  },
};

// ------------------------------------------------------------------ 2b. STEAL A PIECE: cut along the dotted line
function cutPath() { // closed blob on the HiRISE Phobos (local px of phA, 1400 x 1332)
  const pts = [], cx = 960, cy = 700, r = 270;
  for (let k = 0; k < 72; k++) { const a = (k / 72) * TAU - 2.2; const w = 1 + 0.14 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 5); pts.push([cx + Math.cos(a) * r * w * 1.05, cy + Math.sin(a) * r * w * 0.9]); }
  return pts;
}
const S2b = {
  id: 'steal', t0: fS(158), cut: 'side', cap: 'bottom',
  credit: () => [CR.hirise],
  draw(lt, t) {
    skyGrad(0, 1500, 0.94, 0.5);
    stars(41, 60, [0, 0, W, 1500], t);
    const img = A.phA, sc = 0.7 + 0.02 * lt, pw = img.width * sc, ph = img.height * sc;
    const ox = 540 - pw / 2 - 20, oy = 760 - ph / 2;
    tone((c) => { c.drawImage(tinted(img, enc(0, 0.65, 0)), ox + 26, oy + 26, pw, ph); }, C.W);
    photo(img, ox, oy, pw, ph);
    const path = cutPath().map(([x, y]) => [ox + x * sc, oy + y * sc]);
    const cutU = clamp((lt - fS(166 - 158)) / 0.9);
    const lift = clamp((lt - fS(193 - 158)) / 0.4);
    if (lift > 0) {
      knock((c) => poly(c, path));
      tone((c) => { poly(c, path); c.fill(); }, enc(0.25, 0.1, 0));
      dashed([...path, path[0]], C.B, 4, 12, 9, 0);
      const dx = 110 * eBack(lift), dy = -170 * eBack(lift), a = 0.2 * eBack(lift);
      const bb = path.reduce((m, p) => [Math.min(m[0], p[0]), Math.min(m[1], p[1]), Math.max(m[2], p[0]), Math.max(m[3], p[1])], [1e9, 1e9, -1e9, -1e9]);
      const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
      xf(() => {
        tr(cx + dx, cy + dy); rot(a); scl(1 + 0.08 * lift); tr(-cx, -cy);
        tone((c) => { c.translate(22, 24); poly(c, path); c.fill(); }, enc(0, 0.7, 0));
        xf(() => { clipPath((c) => poly(c, path)); photo(img, ox, oy, pw, ph); });
        solid((c) => { c.lineWidth = 6; poly(c, path); c.stroke(); }, C.K);
      });
    } else {
      if (lt > 0.1) dashed([...path, path[0]], C.W, 5, 16, 11, 0, {});
      knock((c) => { c.lineWidth = 7; c.setLineDash([16, 11]); poly(c, path); c.stroke(); });
      if (cutU > 0) {
        const n = Math.max(2, Math.floor((path.length - 1) * cutU));
        solid((c) => { c.lineWidth = 6; poly(c, path.slice(0, n + 1), false); c.stroke(); }, C.B);
        const p0 = path[n], p1 = path[(n + 1) % path.length];
        scissors(p0[0], p0[1], 1.5, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + Math.PI, 0.5 + 0.5 * Math.sin(twos(lt) * 30));
      }
    }
    if (lt > 0.12) label(['CUT HERE'], 820, 470, { size: 30, box: true, align: 'center' });
  },
};

// ------------------------------------------------------------------ 3. STEP ONE: Mars, August 2027
const S3 = {
  id: 'one', t0: fS(208), cut: 'feed', cap: 'bottom', step: 1,
  credit: () => [CR.viking, IL('NASA')],
  draw(lt, t) {
    skyGrad(0, 1500, 0.95, 0.6);
    stars(51, 70, [0, 0, W, 1500], t);
    // giant step numeral, screened sunflower with a pink offset
    bigType('1', 34 + 16, 1250 + 16, 1050, { tone: 0.5, col: 'p', knock: 2 });
    bigType('1', 34, 1250, 1050, { tone: 0.9, col: 'y', knock: 2 });
    const M = { x: 610, y: 800, r: 320 };
    // orbit ellipse
    solid((c) => { c.lineWidth = 4; c.setLineDash([16, 12]); c.lineDashOffset = -lt * 40; c.beginPath(); c.ellipse(M.x, M.y, 400, 130, -0.25, 0, TAU); c.stroke(); }, C.Y);
    draw3D([{ kind: 'mars', x: M.x, y: M.y, r: M.r, spin: 1.25 + t * 0.12, tilt: -0.25, lat: 0.2, light: [-0.7, 0.4, 0.6], night: 0.9 }]);
    // MMX arrives along a long dashed transfer arc from the top-left
    const u = eOut(clamp(lt / fS(264 - 208)));
    const bez = (u) => { const p0 = [-160, 300], p1 = [380, 220], p2 = [1010, 420], p3 = [960, 668]; const v = 1 - u; return [0, 1].map((k) => v * v * v * p0[k] + 3 * v * v * u * p1[k] + 3 * v * u * u * p2[k] + u * u * u * p3[k]); };
    const trail = []; for (let k = 0; k <= 40; k++) trail.push(bez((k / 40) * u));
    dashed(trail, C.P, 6, 18, 12, -lt * 60);
    const pos = bez(u), pos2 = bez(Math.min(1, u + 0.01));
    const orbit = clamp((lt - fS(264 - 208)) / 1.5);
    let mx = pos[0], my = pos[1];
    if (orbit > 0) { const a = -0.3 + orbit * 0.9; mx = M.x + 400 * Math.cos(a) * Math.cos(-0.25) - 130 * Math.sin(a) * Math.sin(-0.25); my = M.y + 400 * Math.cos(a) * Math.sin(-0.25) + 130 * Math.sin(a) * Math.cos(-0.25); }
    mmx(mx, my, 0.5, t, { rot: Math.atan2(pos2[1] - pos[1], pos2[0] - pos[0]) * 0.15 });
    // date stamp slams on "2027"
    const sf = fS(280 - 208);
    if (lt > sf - 1 / FPS) {
      const k = lt - sf, sc = 1 + 0.5 * Math.exp(-k * 18) * (k < 0 ? 1 : 1);
      xf(() => {
        tr(560, 1065); rot(-0.12); scl(Math.max(1, sc));
        knock(rr(-250, -95, 500, 190, 22)); knock((c) => { c.fill(); });
        solid((c) => { c.lineWidth = 9; c.beginPath(); c.roundRect(-250, -95, 500, 190, 22); c.stroke(); c.lineWidth = 3; c.beginPath(); c.roundRect(-234, -79, 468, 158, 14); c.stroke(); }, C.P);
        text('MARS ARRIVAL', 0, -38, C.P, { font: F.mono(28, 700), align: 'center', ls: 6 });
        text('AUG 2027', 0, 66, C.P, { font: F.anton(104), align: 'center', ls: 4 });
      });
    }
    if (lt > 0.5) label([typed('Mars: August 2027 (NASA)', lt - 0.5, 40) || ' '], 88, 330, { size: 24 });
  },
};

// ------------------------------------------------------------------ 4. STEP TWO: drop a lookout, a 25 kilo rover
const S4 = {
  id: 'two', t0: fS(310), cut: 'feed', cap: 'bottom', step: 2,
  credit: () => [CR.hirise, IL('DLR, ESA')],
  draw(lt, t) {
    const zf = fS(393 - 310), zu = eIO(clamp((lt - zf) / 0.45));
    const land = fS(390 - 310), dropT = fS(352 - 310);
    const ground = 1010, RX = 430;
    const piv = [RX, ground - 70], tgt = [lerp(piv[0], 520, zu), lerp(piv[1], 860, zu)], z = 1 + 1.25 * zu;
    xf(() => {
      tr(tgt[0], tgt[1]); scl(z); tr(-piv[0], -piv[1]);
      skyGrad(0, 1100, 0.96, 0.5);
      stars(61, 70, [0, 0, W, 1000], t);
      // Phobos as the ground: HiRISE PIA10368 turned over so its smooth sunlit limb is the horizon
      const img = A.phHi, sc = 1.85, pw = img.width * sc, ph = img.height * sc;
      xf(() => { tr(560, ground + 1195 * 1.0 + 0); rot(Math.PI + 0.12 + lt * 0.01); photo(img, -pw / 2, -ph / 2, pw, ph); });
      // mothership overhead
      const my = 360 - 14 * Math.sin(lt * 1.6);
      mmx(600, my, 0.55, t, { legs: 1 });
      const fall = clamp((lt - dropT) / (land - dropT));
      const ry = lerp(my + 120, ground, fall * fall);
      if (lt > dropT - 0.2 && zu < 1) {
        dashed([[RX, my + 90], [RX, ground - 4]], C.P, 5, 14, 10, -lt * 30);
        if (lt < land + 0.7 && zu <= 0) label(['dropped from about 40 m,', 'in free fall (DLR)'], 500, 560, { size: 22, weight: 400 });
      }
      const bounce = lt > land ? Math.abs(Math.sin((lt - land) * 6)) * 34 * Math.exp(-(lt - land) * 3) : 0;
      const rr2 = lt > dropT && lt < land ? Math.sin((lt - dropT) * 2.6) * 0.3 : 0;
      if (lt > dropT) rover(RX, ry - bounce, 0.9, t, { rot: rr2 });
      else rover(RX + 170, my + 150, 0.55, t);
      const look = clamp((lt - fS(375 - 310)) / 0.25) * (1 - zu);
      if (look > 0 && lt > land) {
        const a = -0.55 + 0.3 * Math.sin((lt - fS(375 - 310)) * 2.6);
        tone((c) => { c.globalAlpha = look; c.beginPath(); const mx = RX + 52 * 0.9, mty = ground - 150 * 0.9; c.moveTo(mx, mty); c.lineTo(mx + 620 * Math.cos(a - 0.17), mty + 620 * Math.sin(a - 0.17)); c.lineTo(mx + 620 * Math.cos(a + 0.17), mty + 620 * Math.sin(a + 0.17)); c.closePath(); c.fill(); }, enc(0, 0, 0.8));
      }
    });
    const sf = fS(404 - 310);
    if (lt > sf - 1 / FPS) {
      const k = Math.max(0, lt - sf), s = 1 + 0.6 * Math.exp(-k * 16);
      xf(() => { tr(790, 520); rot(-0.06); scl(s); bigType('25', 0, 0, 300, { col: C.P, shadow: [10, 10], shadowCol: C.B, align: 'center', knock: 18 }); bigType('KG', 0, 112, 110, { col: C.B, align: 'center', knock: 12, ls: 8 }); });
    }
    if (lt > fS(418 - 310)) label([typed('about the size of a crate of drinks', lt - fS(418 - 310), 50)], 88, 1150, { size: 23 });
  },
};

// ------------------------------------------------------------------ 5. ON PHOBOS IT WEIGHS ... 15 GRAMS
const S5 = {
  id: 'weigh', t0: fS(436), cut: 'roller', cap: 'bottom', step: 2,
  credit: () => [CR.hirise, IL('ESA, JAXA')],
  draw(lt, t) {
    // pink paper flood with a blue horizon band
    tone(rect(0, 0, W, H), enc(0, 0.22, 0.05));
    skyGrad(0, 700, 0.9, 0.0);
    // Phobos badge (photo) top right
    const img = A.phA, sc = 0.3, pw = img.width * sc, ph = img.height * sc;
    xf(() => { tr(800, 470); rot(Math.sin(lt * 0.8) * 0.05 + lt * 0.03); photo(img, -pw / 2, -ph / 2, pw, ph); });
    label(['ON PHOBOS'], 690, 715, { size: 30, box: true });
    // the scale; the needle trembles on "weighs..." and swings to 15 g on "15"
    const fW = fS(484 - 436), f15 = fS(496 - 436);
    const target = 0.12;
    let nd = 0.02 * Math.sin(lt * 31) * clamp((lt - fW + 0.2) / 0.2);
    if (lt > f15) nd = target * spr(lt - f15, 0.25, 2.2);
    const sx = 560, sy = 760;
    // rover on the platform
    rover(sx, sy - 14, 0.9, t);
    scaleDial(sx, sy, 0.95, nd, { mark: lt > f15 ? target : null, markLabel: lt > f15 ? '15 g' : null });
    // big 15 g
    if (lt > f15 - 1 / FPS) {
      const k = Math.max(0, lt - f15), s = 1 + 0.7 * Math.exp(-k * 15);
      xf(() => { tr(820, 1050); rot(0.05); scl(s); bigType('15 g', 0, 0, 200, { col: C.P, shadow: [9, 9], shadowCol: C.B, align: 'center', knock: 16 }); });
    }
    if (lt > fS(523 - 436)) label([typed('Phobos gravity: 1/1700 of Earth (JAXA)', lt - fS(523 - 436), 52)], 88, 335, { size: 22 });
  },
};

// ------------------------------------------------------------------ 6. STEP THREE: the grab (corer + nitrogen gas)
const S6 = {
  id: 'three', t0: fS(558), cut: 'feed', cap: 'bottom', step: 3,
  credit: () => [IL('JAXA, NASA')],
  draw(lt, t) {
    const G = 930;
    skyGrad(0, G, 0.95, 0.6);
    stars(71, 60, [0, 0, W, 800], t);
    // regolith cross-section (illustrated strata, not a photo)
    knock(rect(0, G, W, H - G));
    tone(rect(0, G, W, H - G), enc(0.0, 0.4, 0.45));
    for (let k = 0; k < 4; k++) tone((c) => { c.lineWidth = 12 + k * 4; c.beginPath(); for (let i = 0; i <= 24; i++) { const x = i * 45, y = G + 150 + k * 175 + Math.sin(i * 0.55 + k * 1.7) * 18; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }, enc(0.38, 0.12, 0));
    const r = mulberry32(5); solid((c) => { for (let i = 0; i < 70; i++) { const x = r() * W, y = G + 40 + r() * 950, s = 4 + r() * 13; c.beginPath(); c.ellipse(x, y, s, s * 0.7, r() * 3, 0, TAU); c.fill(); } }, enc(0.75, 0.2, 0));
    solid(rect(0, G - 5, W, 10), C.B);
    // MMX descends and lands on "the grab"
    const S = 1.05, fl = fS(604 - 558), dl = clamp(lt / fl);
    const rest = G - 140 * S;
    const by = lerp(260, rest, eOut(dl)) + (lt > fl ? Math.sin((lt - fl) * 12) * 12 * Math.exp(-(lt - fl) * 5) : 0);
    const bx = 470;
    if (lt > fl) cloudBank(81, G - 50, lt, [{ n: 9, r0: 22, r1: 40 + 46 * clamp((lt - fl) * 3), col: enc(0, 0.3, 0.35), dy: 0, drift: 0, body: false, x0: bx - 330, span: 660 }]);
    if (lt > fl - 0.05) solid(rect(0, G - 5, W, 10), C.B);
    // coring arm reaches to the ground, the corer turns its way in (to 2 cm)
    const fa = fS(630 - 558), au = eIO(clamp((lt - fa) / 0.5)), dig = clamp((lt - fa - 0.5) / 0.6);
    const sh = [bx + 60 * S, by + 20 * S];
    const tip = [lerp(bx + 120, bx + 330, au), lerp(by + 40, G - 70 + 26 * dig, au)];
    const elbow = [lerp(sh[0] + 60, bx + 300, au), lerp(sh[1] - 30, by - 60, au)];
    solid((c) => { c.lineWidth = 20; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(...sh); c.lineTo(...elbow); c.lineTo(...tip); c.stroke(); }, C.B);
    solid(fillCirc(elbow[0], elbow[1], 16), C.Y);
    xf(() => { tr(tip[0], tip[1]); inked(rp(-20, -10, 40, 90), C.Y, { line: 5 }); const ph = (twos(lt) * 70) % 22; xf(() => { clipRect(-20, -10, 40, 90); solid((c) => { c.lineWidth = 5; for (let k = -40 + ph; k < 100; k += 22) { c.beginPath(); c.moveTo(-20, k); c.lineTo(20, k + 12); c.stroke(); } }, C.B); }); });
    mmx(bx, by, S, t, { legs: 1, wing: 0.75 });
    // P-sampler on the left leg: bursts of high-pressure nitrogen loft grains into the sampler
    const fn = fS(653 - 558);
    if (lt > fn) {
      const k = lt - fn, fx = bx - 128 * S, fy = G - 8;
      solid((c) => { c.lineCap = 'round'; for (let i = 0; i < 13; i++) { const a = -Math.PI / 2 + (i - 6) * 0.13, L = 60 + 300 * eOut(k * 2.2) * (0.6 + 0.4 * hash(i + Math.floor(k * 15) * 3.1)), L0 = 30 + 40 * hash(i * 7.7); c.lineWidth = i % 3 ? 5 : 9; c.beginPath(); c.moveTo(fx + Math.cos(a) * L0, fy + Math.sin(a) * L0); c.lineTo(fx + Math.cos(a) * L, fy + Math.sin(a) * L); c.stroke(); } }, C.Y, { knock: true });
      cloudBank(83, fy - 26, k, [{ n: 7, r0: 18, r1: 30 + 34 * eOut(k * 2), col: enc(0, 0.6, 0.15), dy: 0, drift: 0, body: false, x0: fx - 150, span: 300 }]);
      solid((c) => { const rr3 = mulberry32(9); for (let i = 0; i < 30; i++) { const a = -Math.PI / 2 + (rr3() - 0.5) * 1.3, d = 360 * eOut(k * 1.5) * rr3(); circ(c, fx + Math.cos(a) * d * 0.8, fy + Math.sin(a) * d, 4 + rr3() * 6); c.fill(); } }, C.B);
    }
    if (lt > fa + 0.35) { leader(tip[0] + 26, tip[1] + 60, 860, 1100); label([typed('corer digs to 2 cm', lt - fa - 0.35, 40)], 560, 1160, { size: 24 }); }
    if (lt > fn + 0.15) { label([typed('bursts of high-pressure', lt - fn - 0.15, 46), typed('nitrogen gas', lt - fn - 0.55, 46) || ' '], 88, 330, { size: 24 }); if (lt > fn + 0.9) label([typed('in a fraction of a second', lt - fn - 0.9, 46) || ' '], 88, 432, { size: 20, weight: 400 }); }
  },
};

// ------------------------------------------------------------------ 7. TARGET: at least 10 grams
const S7 = {
  id: 'target', t0: fS(677), cut: 'roller', cap: 'bottom', step: 3,
  credit: () => [],
  draw(lt, t) {
    tone(rect(0, 0, W, H), enc(0, 0, 0.18));
    const cx = 520, cy = 760, rot0 = lt * 0.4;
    // bullseye rings, each ink its own plate (misregistration shows)
    const rings = [[440, C.B], [360, C.W], [290, C.P], [220, C.W], [150, C.B]];
    rings.forEach(([r, col], i) => { const rIn = spr(lt - i * 0.05, 0.4, 2.6); if (col === C.W) knock(fillCirc(cx, cy, r * rIn)); else solid(fillCirc(cx, cy, r * rIn), col, { knock: true }); });
    tone(fillCirc(cx, cy, 440 * spr(lt, 0.4, 2.6)), enc(0, 0.25, 0), {});
    // rotating tick ring
    solid((c) => { c.lineWidth = 6; for (let k = 0; k < 72; k++) { const a = rot0 + (k / 72) * TAU, r0 = k % 6 === 0 ? 452 : 466; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * 486, cy + Math.sin(a) * 486); c.stroke(); } }, C.B);
    // crosshair closes in
    const lock = eOut(clamp((lt - 0.3) / 0.9));
    solid((c) => { c.lineWidth = 5; const g = lerp(260, 0, lock); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(cx + dx * (500 + g), cy + dy * (500 + g)); c.lineTo(cx + dx * (90 + g * 0.3), cy + dy * (90 + g * 0.3)); c.stroke(); } }, C.K);
    const f10 = fS(723 - 677);
    text('AT LEAST', cx, cy - 118, C.W, { font: F.mono(34, 700), align: 'center', ls: 6 });
    knock((c) => { setText(c, F.mono(34, 700), 'center', 'alphabetic', 6); c.fillText('AT LEAST', cx, cy - 118); });
    if (lt > f10 - 1 / FPS) {
      const k = Math.max(0, lt - f10), s = 1 + 0.8 * Math.exp(-k * 16);
      xf(() => { tr(cx, cy + 70); scl(s); bigType('10 g', 0, 0, 190, { col: C.Y, align: 'center', knock: 14, shadow: [8, 8], shadowCol: C.P }); });
    }
    if (lt > 0.9) label([typed('Hayabusa2 aimed for 0.1 g and got 5.4 g', lt - 0.9, 60)], 88, 1150, { size: 20, weight: 400 });
  },
};

// ------------------------------------------------------------------ 8a. STEP FOUR: one burn to leave Mars
const S8 = {
  id: 'four', t0: fS(756), cut: 'feed', cap: 'bottom', step: 4,
  credit: () => [CR.viking, IL('JAXA')],
  draw(lt, t) {
    skyGrad(0, 1500, 0.97, 0.7);
    stars(91, 90, [0, 0, W, 1500], t);
    bigType('4', 560, 930, 860, { tone: 0.85, col: 'y', knock: 2 });
    draw3D([{ kind: 'mars', x: 300, y: 1180, r: 560, spin: 0.6 + t * 0.1, tilt: 0.3, lat: 0.15, light: [0.6, 0.55, 0.55], night: 0.9 }]);
    // escape path and MMX accelerating away after the burn
    const fb = fS(802 - 756), u = lt < fb ? 0.08 * lt / fb : 0.08 + 0.92 * eIn(clamp((lt - fb) / 1.5)) ;
    const bez = (u) => { const p0 = [520, 700], p1 = [700, 560], p2 = [860, 420], p3 = [1240, -100]; const v = 1 - u; return [0, 1].map((k) => v * v * v * p0[k] + 3 * v * v * u * p1[k] + 3 * v * u * u * p2[k] + u * u * u * p3[k]); };
    const pts = []; for (let k = 0; k <= 40; k++) pts.push(bez(k / 40));
    dashed(pts, C.P, 6, 20, 14, -lt * 80);
    const p = bez(u), q = bez(Math.min(1, u + 0.02)), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const burn = lt > fb ? 230 * clamp((lt - fb) * 4) : 0;
    if (burn > 0) { tone((c) => { c.lineWidth = 60; c.lineCap = 'round'; c.beginPath(); c.moveTo(p[0], p[1]); const b = bez(Math.max(0, u - 0.18)); c.lineTo(b[0], b[1]); c.stroke(); }, enc(0, 0.4, 0.7)); }
    mmx(p[0], p[1], 0.42, t, { rot: ang - Math.PI / 2 + Math.PI, burn: burn ? burn : 0, burnRot: 0, wing: 1 });
    if (lt > fb + 0.1) label([typed('escape in a single manoeuvre (JAXA)', lt - fb - 0.1, 44)], 88, 330, { size: 23 });
  },
};

// ------------------------------------------------------------------ 8b. CAPSULE LANDS IN AUSTRALIA, 2031
const S8b = {
  id: 'capsule', t0: fS(838), cut: 'side', cap: 'bottom', step: 4,
  credit: () => [IL('JAXA, ESA')],
  draw(lt, t) {
    tone((c) => { const g = c.createLinearGradient(0, 0, 0, 1300); g.addColorStop(0, enc(0.92, 0.1, 0)); g.addColorStop(0.65, enc(0.35, 0.3, 0.05)); g.addColorStop(1, enc(0.0, 0.35, 0.45)); c.fillStyle = g; c.fillRect(0, 0, W, H); }, C.W);
    stars(101, 50, [0, 0, W, 700], t);
    // the curve of the Earth, screened sunflower over pink
    tone((c) => { c.beginPath(); c.ellipse(540, 2350, 1500, 1150, 0, 0, TAU); c.fill(); }, enc(0, 0.5, 0.85), { knock: true });
    tone((c) => { c.lineWidth = 26; c.beginPath(); c.ellipse(540, 2350, 1500, 1150, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }, enc(0.0, 0.0, 0.6));
    // re-entry: the capsule leads with its heat shield, a tapering screened trail behind it
    const u = eOut(clamp(lt / 1.3));
    const x = lerp(1240, 470, u), y = lerp(-200, 760, u), ang = Math.atan2(760 + 200, 470 - 1240);
    const bx = Math.cos(ang + Math.PI), by = Math.sin(ang + Math.PI), nx = -by, ny = bx;
    const tongue = (wid, len, col, isTone, knockIt) => {
      const fl = 1 + 0.07 * Math.sin(twos(lt) * 29 + len * 0.01), L = len * fl;
      (isTone ? tone : solid)((c) => { c.beginPath(); c.moveTo(x + nx * wid / 2, y + ny * wid / 2); c.quadraticCurveTo(x + bx * L * 0.35 + nx * wid * 0.5, y + by * L * 0.35 + ny * wid * 0.5, x + bx * L, y + by * L); c.quadraticCurveTo(x + bx * L * 0.35 - nx * wid * 0.5, y + by * L * 0.35 - ny * wid * 0.5, x - nx * wid / 2, y - ny * wid / 2); c.closePath(); c.fill(); }, col, { knock: knockIt });
    };
    tongue(240, 1250, enc(0.25, 0.35, 0.2), true, true);
    tongue(150, 950, enc(0, 0.85, 0.85), true, false);
    tongue(90, 620, C.Y, false, false);
    tongue(40, 330, C.W, false, false); knock((c) => { c.beginPath(); c.moveTo(x + nx * 20, y + ny * 20); c.lineTo(x + bx * 300, y + by * 300); c.lineTo(x - nx * 20, y - ny * 20); c.closePath(); c.fill(); });
    knock((c) => { c.lineWidth = 5; for (let i = -2; i <= 2; i++) { const o = i * 24, l0 = 120 + 60 * Math.abs(i) + (twos(lt) * 900) % 120; c.beginPath(); c.moveTo(x + bx * l0 + nx * o, y + by * l0 + ny * o); c.lineTo(x + bx * (l0 + 160) + nx * o * 0.7, y + by * (l0 + 160) + ny * o * 0.7); c.stroke(); } });
    // bow shock in front of the shield
    solid((c) => { c.lineWidth = 16; c.beginPath(); c.arc(x - bx * 10, y - by * 10, 120, ang - 0.9, ang + 0.9); c.stroke(); }, C.Y);
    solid((c) => { c.lineWidth = 7; c.beginPath(); c.arc(x - bx * 10, y - by * 10, 146, ang - 0.7, ang + 0.7); c.stroke(); }, C.P);
    capsule(x, y, 2.0, ang - Math.PI / 2, {});
    if (lt > 0.35) label([typed('Capsule: about 60 cm across,', lt - 0.35, 48), typed('with a heat shield', lt - 0.95, 48) || ' '], 88, 330, { size: 22 });
    const f31 = fS(886 - 838);
    if (lt > f31 - 1 / FPS) {
      const k = Math.max(0, lt - f31), s = 1 + 0.6 * Math.exp(-k * 16);
      xf(() => { tr(640, 1010); scl(s); knock(fillCirc(0, 0, 222)); postmark(0, 0, 210, 'LANDS IN AUSTRALIA', '2031', 'SAMPLE RETURN', -0.18, C.P, {}); });
    }
  },
};

// ------------------------------------------------------------------ 9. THE LOOT
const S9 = {
  id: 'loot', t0: fS(916), cut: 'feed', cap: 'bottom',
  credit: () => [CR.hirise],
  draw(lt, t) {
    tone(rect(0, 0, W, H), enc(0.2, 0.1, 0.0));
    sunburst(540, 720, 32, 0, 1600, lt * 0.18, enc(0, 0, 0.8));
    sunburst(540, 720, 32, 0, 1600, lt * 0.18 + TAU / 64, enc(0, 0.32, 0.12));
    radialTone(540, 720, 520, 0.0, 0.0, 'y');
    const img = A.phA, sc = 0.5 + 0.03 * eOut(lt), pw = img.width * sc, ph = img.height * sc;
    xf(() => {
      tr(540, 720 + Math.sin(lt * 2) * 10); rot(Math.sin(lt * 0.9) * 0.06);
      tone((c) => c.drawImage(tinted(img, enc(0.55, 0.45, 0)), -pw / 2 + 26, -ph / 2 + 26, pw, ph), C.W);
      photo(img, -pw / 2, -ph / 2, pw, ph);
    });
    // FIRST rosette on "First"
    const ff = fS(949 - 916);
    if (lt > ff - 1 / FPS) { const k = Math.max(0, lt - ff), s = spr(k + 0.02, 0.35, 2.4); rosette(830, 420, 125 * s, 'FIRST', 0.18 - 0.1 * s); }
    if (lt > 0.3) bigType('THE LOOT', 88, 1180, 150, { col: C.B, knock: 14, shadow: [7, 7], shadowCol: C.P, ls: 3 });
  },
};

// ------------------------------------------------------------------ 10. NEXT
const S10 = {
  id: 'next', t0: fS(1035), cut: 'feed', cap: 'bottom',
  slug: () => ({ kicker: 'NEXT LAUNCH' }),
  credit: () => [IL('Launch Library 2')],
  draw(lt, t) {
    tone(rect(0, 0, W, H), enc(0, 0.12, 0.3));
    skyGrad(0, 900, 0.8, 0.0);
    stars(111, 40, [0, 0, W, 700], t);
    // Electron on the pad (illustration)
    const ry = 1150;
    electron(175, ry, 1.0, t, {});
    tone(rect(60, ry + 28, 240, 18), enc(0.6, 0, 0));
    // ticket slides in, stepped like a press feed
    const steps = [0, 0, 0.45, 0.45, 0.8, 0.8, 0.95, 1];
    const u = steps[Math.min(steps.length - 1, Math.floor(lt * 15))];
    const tx = lerp(1150, 470, u), ty = 350;
    xf(() => {
      tr(tx, ty); rot(0.03);
      const w = 430, h = 640;
      tone((c) => { c.fillRect(16, 16, w, h); }, enc(0, 0.5, 0), {});
      knock(rect(0, 0, w, h));
      solid((c) => { c.lineWidth = 5; c.strokeRect(10, 10, w - 20, h - 20); }, C.B);
      solid(rect(10, 10, w - 20, 92), C.P);
      knock((c) => { setText(c, F.anton(62), 'center', 'alphabetic', 6); c.fillText('NEXT', w / 2, 82); });
      text('ROCKET LAB', 34, 170, C.B, { font: F.cond(54, 800) });
      text('ELECTRON', 34, 222, C.B, { font: F.cond(46, 700) });
      solid((c) => { c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(24, 252); c.lineTo(w - 24, 252); c.stroke(); }, C.B);
      text('3 x HawkEye 360', 34, 306, C.B, { font: F.cond(48, 800) });
      text('satellites', 34, 350, C.B, { font: F.cond(40, 600) });
      solid((c) => { c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(24, 384); c.lineTo(w - 24, 384); c.stroke(); }, C.B);
      const fw = fS(1141 - 1035);
      const sW = lt > fw - 1 / FPS ? 1 + 0.5 * Math.exp(-Math.max(0, lt - fw) * 15) : 1;
      xf(() => { tr(w / 2, 520); scl(sW); bigType('WED 21 OCT', 0, 0, 90, { col: C.B, align: 'center', ls: 1 }); });
      // perforation
      knock((c) => { for (let k = 0; k < 14; k++) { circ(c, k * 36 + 12, h + 2, 7); c.fill(); } });
    });
    // three satellites pop on "three"
    const f3 = fS(1094 - 1035);
    for (let i = 0; i < 3; i++) { const k = lt - f3 - i * 0.1; if (k > 0) satIcon(110 + i * 150 + Math.sin(lt * 2 + i) * 6, 330 + (i % 2) * 40 + Math.cos(lt * 1.7 + i) * 6, 0.62 * spr(k, 0.35, 2.6), 0.2 * Math.sin(lt + i)); }
  },
};

// ------------------------------------------------------------------ 11. END CARD
const S11 = {
  id: 'end', t0: fS(1157), cut: 'roller', cap: 'bottom',
  slug: () => ({ kicker: 'FOLLOW' }),
  credit: () => [],
  draw(lt, t) {
    solid(rect(0, 0, W, H), C.B);
    sunburst(540, 700, 24, 380, 1400, -lt * 0.1, enc(0, 0.45, 0));
    // paper medallion for Night Shift
    knock(fillCirc(540, 700, 330));
    tone(fillCirc(540, 700, 330), enc(0, 0.12, 0.25));
    solid(ring(540, 700, 330, 10), C.Y);
    // wordmark: echo mark, DOWNLINK (paper), CAT (amber)
    const fe = fS(1208 - 1157), wy = 1175;
    const font = F.anton(122), wD = measure('DOWNLINK', font, 4), wC = measure('CAT', font, 4), r = 26;
    const total = r * 2 + r * 60 / 22 + r + 34 + wD + 26 + wC, x0 = 540 - total / 2;
    const e = clamp((lt - fe + 0.04) / 0.12), e2 = clamp((lt - fe - 0.4 + 0.04) / 0.12);
    if (e > 0) solid(fillCirc(x0 + r, wy - 44, r * spr(lt - fe + 0.1, 0.4, 3)), C.Y, { knock: true });
    if (e2 > 0) solid(ring(x0 + r + r * 60 / 22, wy - 44, r * 19 / 22 * spr(lt - fe - 0.4 + 0.1, 0.4, 3), r * 6 / 22), C.Y, { knock: true });
    const tx = x0 + r * 2 + r * 60 / 22 + r * 0.9 + 34;
    const wIn = eOut(clamp((lt - 0.15) / 0.35));
    xf(() => {
      clipRect(0, wy - 140, tx + (wD + 26 + wC + 40) * wIn, 200);
      knock((c) => { setText(c, font, 'left', 'alphabetic', 4); c.fillText('DOWNLINK', tx, wy); });
      knock((c) => { setText(c, font, 'left', 'alphabetic', 4); c.fillText('CAT', tx + wD + 26, wy); });
      solid((c) => { setText(c, font, 'left', 'alphabetic', 4); c.fillText('CAT', tx + wD + 26, wy); }, C.Y);
    });
  },
};

let SCENES = [S1, S2, S2b, S3, S4, S5, S6, S7, S8, S8b, S9, S10, S11];

// ------------------------------------------------------------------ Night Shift's performance
function sayLine(a, b, t0) { return { t: t0 ?? wS(a) - 0.05, do: 'say', words: WORDS.slice(a, b + 1).map((w, k) => ({ w: w.text, s: w.start, e: w.end, stress: EMPH.has(a + k) })) }; }
function catTimeline() {
  return [
    // heist: he pops up from behind the cloud bank, sly, and watches the rocket go
    { t: fS(136), do: 'enter', how: 'pop', box: [660, 1200, 280, 300], at: 0.5 },
    { t: fS(136), do: 'expr', expr: 'keen' },
    { t: fS(150), do: 'look', at: [540, 500] },
    { t: fS(166), do: 'point', at: [700, 640], dur: 1.3 },
    { t: fS(166), do: 'expr', expr: 'excited' },
    { t: fS(206), do: 'exit', how: 'zip', to: 'up' },
    // 15 grams: skids in, leans in to read the dial, gasps, then WHAT
    { t: fS(440), do: 'enter', how: 'skid', from: 'left', to: [200, 1190] },
    { t: fS(440), do: 'expr', expr: 'curious' },
    { t: fS(478), do: 'listen', dur: 0.6 },
    { t: fS(478), do: 'look', at: [560, 960] },
    { t: fS(497), do: 'gasp', at: [560, 960], dur: 0.8 },
    { t: fS(522), do: 'what', dur: 1.1 },
    { t: fS(556), do: 'exit', how: 'zip', to: 'left' },
    // target: drops in on a tether like a cat burglar, points at the 10 g
    { t: fS(684), do: 'enter', how: 'drop', to: [830, 1190] },
    { t: fS(684), do: 'expr', expr: 'focus' },
    { t: fS(718), do: 'point', at: [520, 830], dur: 1.0 },
    { t: fS(752), do: 'exit', how: 'tether' },
    // the loot: floats in, bounces on "First"
    { t: fS(918), do: 'enter', how: 'skid', from: 'right', to: [820, 1190] },
    { t: fS(918), do: 'expr', expr: 'excited' },
    { t: fS(946), do: 'bounce', count: 3, period: 0.34 },
    { t: fS(1000), do: 'look', at: [540, 720] },
    { t: fS(1012), do: 'thumbs' },
    // next: hops to the left, points at the ticket
    { t: fS(1040), do: 'hop', to: [262, 1190] },
    { t: fS(1062), do: 'point', at: [640, 700], dur: 1.4 },
    { t: fS(1140), do: 'nod', count: 2 },
    // end: walks into the medallion and waves
    { t: fS(1160), do: 'hop', to: [540, 960] },
    { t: fS(1172), do: 'wave', dur: 1.6 },
    { t: fS(1172), do: 'expr', expr: 'happy' },
    { t: fS(1215), do: 'thumbs', dur: 1.2 },
    sayLine(10, 20), sayLine(35, 40), sayLine(49, 53), sayLine(66, 74), sayLine(75, 85), sayLine(86, 88),
  ];
}
function initScenes() {
  KICKS.length = 0; SHAKES.length = 0;
  KICKS.push(...SCENES.slice(1).map((s) => ({ t: s.t0, amp: s.cut === 'roller' ? 7 : 11 })));
  // slams: 2027, 25, 15, 10, 2031, First
  for (const f of [280, 404, 496, 723, 886, 949]) { SHAKES.push({ t: fS(f), amp: 9 }); KICKS.push({ t: fS(f), amp: 6 }); }
}
