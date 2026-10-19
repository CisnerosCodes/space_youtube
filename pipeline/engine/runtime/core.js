// core.js: the Downlink Cat page runtime (shared by every Short the engine builds).
// Every frame is a pure function of the frame number f: renderAt(t) -> f = round(t * 30).
// Layers, back to front: the picture canvas (every shot, transitions, the amber dot, motion blur),
// the cat (SVG), then the fixed chrome in the DOM (kicker, chip, captions, credit).
'use strict';
const E = (() => {
  const FPS = 30, WID = 1080, HEI = 1920;
  const C = { ink: '#0B0B0C', paper: '#F2EFE8', amber: '#F5B83D', muted: '#8C8A85' };
  // fixed layout (design-system/tokens.motion-v1.json, positions)
  const L = {
    kickerY: 246, chipY: 302, giantTop: 314, giantTopChip: 374, contentTop: 330, contentBottom: 1140,
    captionTop: 1196, floor: 1196, creditBottom: 1498, textX0: 80, textX1: 900, giantX: 40,
  };
  const SERIES_MARK = {
    'LAUNCH DAY': { d: 'M14 3 L26 25 H2 Z', fill: true },
    'JUST DISCOVERED': { d: 'M14 1 L27 14 L14 27 L1 14 Z', fill: true },
    'HOW DOES THAT WORK': { d: 'M5 14 A9 9 0 1 0 23 14 A9 9 0 1 0 5 14 M14 1 V27 M1 14 H27', fill: false },
    'BY THE NUMBERS': { d: 'M2 17 H8 V25 H2 Z M11 10 H17 V25 H11 Z M20 3 H26 V25 H20 Z', fill: true },
  };

  // ================================================================ easing, springs, noise
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const e = sx(t) - x, d = dx(t); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; t -= e / d; }
      let lo = 0, hi = 1;
      for (let i = 0; i < 30 && Math.abs(sx(t) - x) > 1e-6; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return sy(t);
    };
  }
  const enter = bezier(0.16, 1, 0.3, 1), move = bezier(0.76, 0, 0.24, 1), exitE = bezier(0.7, 0, 0.84, 0);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const elerp = (a, b, t) => a * Math.pow(b / a, t);
  const k = (f, a, d, e = (x) => x) => e(clamp01(d <= 0 ? (f >= a ? 1 : 0) : (f - a) / d));
  function spring(t, zeta, fr) {
    if (t <= 0) return 0;
    const w = 2 * Math.PI * fr, wd = w * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
  }
  const sp = (df, zeta = 0.7, fr = 4) => (df <= 0 ? 0 : spring(df / FPS, zeta, fr));
  const punch = (f, list, amt = 0.04) => list.reduce((p, pf) => p * (1 + amt * sp(f - pf)), 1);
  // count-up: spring zeta 0.8, f 2, monotonic (running peak), capped at 1
  const countU = (f, a) => { let p = 0; for (let q = a; q <= f; q++) p = Math.max(p, spring((q - a + 1) / FPS, 0.8, 2)); return Math.min(1, p); };
  const slam = (df) => 1.12 - 0.12 * enter(clamp01(df / 5));
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ================================================================ words and anchors
  const W = CAPTIONS.words.map((w) => ({ ...w, f: Math.round(w.start * FPS), fe: Math.round(w.end * FPS), key: String(w.text).toLowerCase().replace(/[^a-z0-9]/g, '') }));
  const AF = PLAN.anchors;
  function A(s) {
    if (typeof s === 'number') return s;
    if (!(s in AF)) throw new Error('engine: anchor not resolved by the builder: ' + s);
    return AF[s];
  }
  const Ao = (s, d) => (s == null ? d : A(s));
  const LASTWORD = W[W.length - 1];
  const WM = LASTWORD.fe + 3;                                       // the wordmark dot lands after the last word
  const NF = Math.max(Math.ceil(CAPTIONS.duration * FPS - 1e-6), WM + 48);
  const LAST = NF - 1;

  // ================================================================ text markup and canvas text
  // "*amber*" and "_muted_" spans; everything else paper (or the default color given)
  function markup(s, base = C.paper) {
    const out = []; const re = /(\*[^*]+\*|_[^_]+_)/g; let i = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > i) out.push({ t: s.slice(i, m.index), c: base });
      out.push({ t: m[0].slice(1, -1), c: m[0][0] === '*' ? C.amber : C.muted });
      i = m.index + m[0].length;
    }
    if (i < s.length) out.push({ t: s.slice(i), c: base });
    return out;
  }
  const plain = (s) => String(s).replace(/[*_]/g, '');
  const FONT = {
    giant: (g, px) => { g.font = `800 ${px}px Archivo`; g.fontStretch = 'semi-expanded'; g.letterSpacing = '0px'; },
    headline: (g, px = 88) => { g.font = `800 ${px}px Archivo`; g.fontStretch = 'semi-expanded'; g.letterSpacing = '0px'; },
    wordmark: (g, px = 64) => { g.font = `800 ${px}px Archivo`; g.fontStretch = 'expanded'; g.letterSpacing = '0px'; },
    mono: (g, px = 28) => { g.font = `500 ${px}px 'IBM Plex Mono'`; g.fontStretch = 'normal'; g.letterSpacing = '0px'; },
    label: (g, px = 24) => { g.font = `500 ${px}px 'IBM Plex Mono'`; g.fontStretch = 'normal'; g.letterSpacing = (px * 0.05).toFixed(2) + 'px'; },
  };
  const mctx = document.createElement('canvas').getContext('2d');
  const CAP = {};                                                 // measured cap heights (fraction of size)
  function measureFonts() {
    FONT.giant(mctx, 100); CAP.giant = mctx.measureText('0').actualBoundingBoxAscent / 100;
    FONT.giant(mctx, 100); CAP.digit = Math.max(...'0123456789'.split('').map((d) => mctx.measureText(d).width)) / 100;
    FONT.headline(mctx, 100); CAP.headline = mctx.measureText('H').actualBoundingBoxAscent / 100;
  }
  // width of giant text with tabular digits (each digit takes the widest digit's advance)
  function giantWidth(text, px) {
    FONT.giant(mctx, px); let w = 0;
    for (const ch of text) w += /\d/.test(ch) ? CAP.digit * px : mctx.measureText(ch).width;
    return w;
  }
  function monoWidth(text, px = 28, kind = 'mono') { FONT[kind](mctx, px); return mctx.measureText(plain(text)).width; }
  function headlineWidth(text, px = 88) { FONT.headline(mctx, px); return mctx.measureText(plain(text).toUpperCase()).width; }

  // text rectangles registered while checking (screen coordinates), for the layout check
  const TXT = { on: false, list: [] };
  function regText(g, x, y, w, h, kind) {
    if (!TXT.on || g.__probe) return;
    const m = g.getTransform();
    const p = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    TXT.list.push({ kind, x: Math.min(...xs), y: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), moving: !!g.__moving });
  }
  // giant text, top-left at (x, top); returns [w, h]. Digits on fixed advances (tabular numerals).
  function drawGiant(g, text, x, top, px, color = C.amber, opt = {}) {
    const h = CAP.giant * px, w = giantWidth(text, px);
    if (track(g, x, top + h / 2)) return [w, h];
    if (opt.box) { g.fillStyle = C.ink; g.fillRect(x - 16, top - 16, w + 32, h + 32); }
    FONT.giant(g, px); g.fillStyle = color; g.textBaseline = 'alphabetic';
    let cx = x;
    for (const ch of text) {
      if (/\d/.test(ch)) { const cw = g.measureText(ch).width; g.fillText(ch, cx + (CAP.digit * px - cw) / 2, top + h); cx += CAP.digit * px; }
      else { g.fillText(ch, cx, top + h); cx += g.measureText(ch).width; }
    }
    regText(g, x, top, w, h, 'giant');
    return [w, h];
  }
  // one line of mono text with markup, in an ink box; (x, y) = top-left of the box. Returns [w, h] of the box.
  function drawMono(g, text, x, y, opt = {}) {
    const px = opt.px ?? 28, kind = opt.kind ?? 'mono', padY = opt.padY ?? 6, padX = opt.padX ?? 12;
    const lh = px === 24 ? 28 : Math.round(px * 1.3);
    FONT[kind](g.__probe ? mctx : g, px);
    const segs = markup(kind === 'label' || opt.upper ? String(text).toUpperCase() : String(text), opt.color ?? C.paper);
    const w = segs.reduce((s, q) => s + (g.__probe ? mctx : g).measureText(q.t).width, 0) + 2 * padX, h = lh + 2 * padY;
    if (track(g, x, y)) return [w, h];
    if (opt.box !== false) { g.fillStyle = C.ink; g.fillRect(x, y, w, h); }
    g.textBaseline = 'middle'; let cx = x + padX;
    for (const q of segs) { g.fillStyle = q.c; g.fillText(q.t, cx, y + padY + lh / 2 + 1); cx += g.measureText(q.t).width; }
    regText(g, x + padX, y + padY, w - 2 * padX, lh, kind);
    return [w, h];
  }
  // headline line (Archivo 800 width 112, uppercase) with markup; (x, top); returns [w, h]
  function drawHeadline(g, text, x, top, opt = {}) {
    const px = opt.px ?? 88, h = CAP.headline * px;
    const segs = markup(plain(text) === text ? text.toUpperCase() : text.toUpperCase(), opt.color ?? C.paper);
    FONT.headline(g.__probe ? mctx : g, px);
    const w = segs.reduce((s, q) => s + (g.__probe ? mctx : g).measureText(q.t).width, 0);
    if (track(g, x, top + h / 2)) return [w, h];
    if (opt.box) { g.fillStyle = C.ink; g.fillRect(x - 14, top - 14, w + 28, h + 28); }
    g.textBaseline = 'alphabetic'; let cx = x;
    for (const q of segs) { g.fillStyle = q.c; g.fillText(q.t, cx, top + h); cx += g.measureText(q.t).width; }
    regText(g, x, top, w, h, 'headline');
    return [w, h];
  }

  // ================================================================ canvas drawing helpers (probe-aware)
  // In probe mode (g.__probe) nothing is drawn: tracked points are recorded in screen space so the
  // motion blur can measure how far things move between two sub-frame times.
  let PROBE = null;
  function track(g, ...pts) {
    if (!g.__probe) return false;
    const m = g.getTransform();
    for (let i = 0; i < pts.length; i += 2) PROBE.push(m.a * pts[i] + m.c * pts[i + 1] + m.e, m.b * pts[i] + m.d * pts[i + 1] + m.f);
    return true;
  }
  function dot(g, x, y, r = 11, color = C.amber, alpha = 1) {
    if (track(g, x, y)) return;
    g.save(); g.globalAlpha *= alpha; g.fillStyle = color; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); g.fill(); g.restore();
  }
  function ring(g, x, y, r, w = 4, alpha = 1, dash = null, color = C.amber) {
    if (track(g, x, y)) return;
    if (r <= 0.1) return;
    g.save(); g.globalAlpha *= alpha; g.strokeStyle = color; g.lineWidth = w; if (dash) g.setLineDash(dash);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); g.restore();
  }
  function line(g, pts, w = 4, dash = null, alpha = 1, color = C.amber) {
    if (g.__probe || pts.length < 2) return;
    g.save(); g.globalAlpha *= alpha; g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'butt'; g.lineJoin = 'round'; if (dash) g.setLineDash(dash);
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.restore();
  }
  function inkDisc(g, x, y, r) { if (g.__probe) return; g.save(); g.fillStyle = C.ink; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.restore(); }
  // part of a polyline by arc length fraction [u0, u1]
  function polyLen(pts) { let s = 0; const acc = [0]; for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(s); } return { s, acc }; }
  function polyAt(pts, u, PL = polyLen(pts)) {
    const d = clamp01(u) * PL.s; let i = 1; while (i < pts.length - 1 && PL.acc[i] < d) i++;
    const a = pts[i - 1], b = pts[i], seg = PL.acc[i] - PL.acc[i - 1] || 1, t = (d - PL.acc[i - 1]) / seg;
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  function polySlice(pts, u0, u1, PL = polyLen(pts)) {
    if (u1 <= u0) return [];
    const d0 = clamp01(u0) * PL.s, d1 = clamp01(u1) * PL.s, out = [polyAt(pts, u0, PL).slice(0, 2)];
    for (let i = 1; i < pts.length - 1; i++) if (PL.acc[i] > d0 && PL.acc[i] < d1) out.push(pts[i]);
    out.push(polyAt(pts, u1, PL).slice(0, 2));
    return out;
  }
  // Catmull-Rom smoothing for paths given as a few points
  function smooth(pts, seg = 10) {
    if (pts.length < 3) return pts;
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < seg; s++) {
        const t = s / seg, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // ================================================================ images and parallax photos
  // IMAGES: { name: { src, w, h, credit, focus: [x, y, w, h] (0..1), crop: [x, y, w, h] px, kind } }
  const IMG = {};
  const imgPromises = [];
  for (const [name, I] of Object.entries(IMAGES)) {
    const im = new Image(); im.src = I.src;
    IMG[name] = { ...I, img: im, lay: null };
    imgPromises.push(im.decode().then(() => { IMG[name].w = im.naturalWidth; IMG[name].h = im.naturalHeight; }));
  }
  // parallax layers: soft-masked copies of the regions nearer the camera, built once per photo.
  // layers: [[cx, cy, radius (fraction of width), depth]]; default from the focus box
  function buildLayers(P, spec) {
    if (P.lay) return;
    const fc = P.focus ?? [0.25, 0.25, 0.5, 0.5];
    const def = [[fc[0] + fc[2] / 2, fc[1] + fc[3] * 0.55, Math.max(fc[2], fc[3] * P.h / P.w) * 0.6, 1.0],
      [fc[0] + fc[2] / 2, fc[1] + fc[3] * 0.85, Math.max(fc[2], fc[3] * P.h / P.w) * 0.3, 1.7]];
    const n = spec?.layers ?? 2;
    const list = Array.isArray(n) ? n : def.slice(0, n);
    // layer canvases at most 2400 px wide (memory), drawn scaled
    const sc = Math.min(1, 2400 / P.w);
    P.lay = list.map(([mx, my, r, d]) => {
      const c = document.createElement('canvas'); c.width = Math.round(P.w * sc); c.height = Math.round(P.h * sc);
      const g = c.getContext('2d'); g.drawImage(P.img, 0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in';
      const R = r * c.width, gr = g.createRadialGradient(mx * c.width, my * c.height, R * 0.35, mx * c.width, my * c.height, R);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
      return { c, d, sc };
    });
  }
  // cam: { x, y (screen point of the image anchor), ax, ay (image anchor, 0..1), s (px per image px),
  //        push (extra scale on the near layers), drift: [dx, dy] px on the near layers, rot (deg), alpha }
  function photo(g, P, cam) {
    const ax = cam.ax * P.w, ay = cam.ay * P.h;
    if (g.__probe) {
      // track the anchor and the frame-corner points of the image
      const m = g.getTransform(); g.save(); g.translate(cam.x, cam.y); g.scale(cam.s, cam.s);
      track(g, 0, 0, -ax, -ay, P.w - ax, P.h - ay); g.restore(); void m; return;
    }
    const push = cam.push || 0, [dx, dy] = cam.drift || [0, 0];
    g.save(); g.globalAlpha *= cam.alpha ?? 1;
    const one = (src, d, sc = 1) => {
      g.save(); g.translate(cam.x + dx * d, cam.y + dy * d); if (cam.rot) g.rotate((cam.rot * Math.PI) / 180);
      const ss = cam.s * (1 + push * d); g.scale(ss / sc, ss / sc);
      g.drawImage(src, -ax * sc, -ay * sc); g.restore();
    };
    one(P.img, 0);
    if (P.lay && push) for (const Ly of P.lay) one(Ly.c, Ly.d, Ly.sc);
    g.restore();
  }
  // screen point of an image point (0..1) under a camera (no push)
  const photoPt = (P, cam, nx, ny) => [cam.x + (nx - cam.ax) * P.w * cam.s, cam.y + (ny - cam.ay) * P.h * cam.s];
  // a camera that puts the focus box's centre at screen point (sx, sy), with the box `fill` of the
  // frame width (or covering the frame, whichever is larger), clamped so the image always covers the frame
  function frameCam(P, focus, sx, sy, fill = null, zoom = 1, coverW = WID, coverH = HEI, cover = true) {
    const fc = focus ?? [0.25, 0.25, 0.5, 0.5];
    const sCover = Math.max(coverW / P.w, coverH / P.h);
    let s = (fill ? Math.max(cover ? sCover : 0, (fill * coverW) / (fc[2] * P.w)) : sCover) * zoom;
    const ax = fc[0] + fc[2] / 2, ay = fc[1] + fc[3] / 2;
    let x = sx, y = sy;
    if (cover) {
      // keep the image edges outside the frame
      const left = x - ax * P.w * s, top = y - ay * P.h * s;
      x += Math.max(0, left) - Math.max(0, -(left + P.w * s - coverW));
      y += Math.max(0, top) - Math.max(0, -(top + P.h * s - coverH));
    }
    return { x, y, ax, ay, s };
  }
  const frameX = { left: 360, center: 540, right: 720 };
  const frameY = { top: 640, center: 760, bottom: 900 };

  // ================================================================ beats, transitions, the amber dot
  const BEATS = [];
  const SHOTS = {};                               // shot factories register here (shots/*.js)
  const TR = {
    // transition kinds: how the incoming beat enters and the outgoing beat leaves
    push: { lead: 0.5 }, iris: { lead: 0.55 }, morph: { lead: 0.5 }, cut: { lead: 0 }, none: { lead: 0 },
  };
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function setupBeats() {
    PLAN.beats.forEach((spec, i) => {
      const t = spec.transition ?? { type: i === 0 ? 'none' : 'morph' };
      const N = t.type === 'cut' || t.type === 'none' ? 0 : clamp(t.frames ?? 12, 6, 16);
      const w = A(spec.start);
      const T0 = i === 0 ? 0 : Math.max(0, w - Math.round(N * TR[t.type].lead));
      BEATS.push({ i, id: spec.id ?? 'beat' + i, spec, tr: { ...t, N }, w, T0, shot: null });
    });
    BEATS.forEach((b, i) => {
      const nx = BEATS[i + 1];
      b.T1 = nx ? nx.T0 : NF;                                                   // the next beat starts entering
      b.end = nx ? nx.T0 + (nx.tr.type === 'cut' ? 0 : nx.tr.N) : NF;            // last frame drawn + 1
      b.next = nx ?? null; b.prev = BEATS[i - 1] ?? null;
    });
    for (const b of BEATS) {
      const make = SHOTS[b.spec.shot.type];
      if (!make) throw new Error(`engine: beat ${b.i} (${b.id}): unknown shot type "${b.spec.shot.type}"`);
      b.shot = make(b.spec.shot, b);
    }
    for (const b of BEATS) b.shot.layout?.();
  }
  const visible = (f) => BEATS.filter((b) => f >= b.T0 && f < b.end);
  const pIn = (b, f) => (b.tr.N ? clamp01((f - b.T0) / b.tr.N) : 1);
  const pOut = (b, f) => (b.next && f >= b.next.T0 ? pIn(b.next, f) : 0);
  const RMAX = Math.hypot(WID, HEI);
  const center = [540, 760];
  const dotIn = (b, f) => b.shot.dotIn?.(f) ?? center;
  const dotOut = (b, f) => b.shot.dotOut?.(f) ?? b.shot.dotIn?.(f) ?? center;
  // transition geometry for one beat at f: { skip, clip: [x, y, r], ring, tx, ty, s, about, alpha, moving }
  function beatXf(b, f) {
    const o = { skip: false, clip: null, tx: 0, ty: 0, s: 1, about: center, alpha: 1, moving: false };
    const pi = pIn(b, f), po = pOut(b, f);
    if (pi < 1) {
      o.moving = true;
      const kind = b.tr.type;
      if (kind === 'push') { const d = DIRV[b.tr.dir ?? 'up'], u = move(pi); o.tx -= d[0] * WID * (1 - u); o.ty -= d[1] * HEI * (1 - u); }
      if (kind === 'iris' && !b.shot.enterIris) {
        const c = dotIn(b, f), r = RMAX * Math.pow(clamp01((pi - 0.4) / 0.6), 1.6) * 1.0;
        if (r <= 0.5) o.skip = true; else o.clip = [c[0], c[1], enter(clamp01((pi - 0.4) / 0.6)) * RMAX];
      }
      if (kind === 'morph' && !b.shot.drawsIn) {
        const u = clamp01((pi - 0.35) / 0.65); if (u <= 0) o.skip = true;
        o.s *= elerp(0.03, 1, enter(u)); o.about = dotIn(b, f);
      }
    }
    if (po > 0) {
      o.moving = true;
      const kind = b.next.tr.type;
      if (kind === 'push') { const d = DIRV[b.next.tr.dir ?? 'up'], u = move(po); o.tx += d[0] * WID * u; o.ty += d[1] * HEI * u; }
      if (kind === 'iris' && !b.shot.leaveIris) {
        const c = dotOut(b, f), r = RMAX * (1 - move(clamp01(po / 0.6)));
        if (r < 12) o.skip = true; else o.clip = [c[0], c[1], r];
      }
      if (kind === 'morph' && !b.shot.leaveIris) {
        const u = clamp01(po / 0.65); if (u >= 1) o.skip = true;
        o.s *= elerp(1, 0.02, move(u)); o.about = dotOut(b, f); o.alpha *= 1 - k(u, 0.6, 0.4);
      }
    }
    return o;
  }
  // where the persistent amber dot is during a transition (null when the shots draw it themselves)
  function transitionDot(f) {
    for (const b of BEATS) {
      if (!b.prev || !b.tr.N || f < b.T0 || f >= b.T0 + b.tr.N) continue;
      if (b.tr.type !== 'iris' && b.tr.type !== 'morph') continue;
      const p = pIn(b, f), a = dotOut(b.prev, f), c = dotIn(b, f);
      const u = move(clamp01((p - 0.3) / 0.4));
      return { x: lerp(a[0], c[0], u), y: lerp(a[1], c[1], u), r: 11, p };
    }
    return null;
  }
  function dotAt(f) {
    const t = transitionDot(f); if (t) return [t.x, t.y];
    for (const b of visible(f).reverse()) { const d = b.shot.dot?.(f); if (d) return d; }
    const b = visible(f).pop(); return b ? dotIn(b, f) : center;
  }

  // ================================================================ the picture (with motion blur)
  const pic = document.getElementById('pic'), pctx = pic.getContext('2d');
  const mk = () => { const c = document.createElement('canvas'); c.width = WID; c.height = HEI; return c; };
  const tmp = mk(), tctx = tmp.getContext('2d'), acc = mk(), actx = acc.getContext('2d');
  const probeCtx = document.createElement('canvas').getContext('2d'); probeCtx.__probe = true;
  function drawPicture(g, f) {
    if (!g.__probe) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = C.ink; g.fillRect(0, 0, WID, HEI); }
    else g.setTransform(1, 0, 0, 1, 0, 0);
    for (const b of visible(f)) {
      const o = beatXf(b, f); if (o.skip) continue;
      g.save();
      if (o.clip) { if (!g.__probe) { g.beginPath(); g.arc(o.clip[0], o.clip[1], Math.max(0.1, o.clip[2]), 0, Math.PI * 2); g.clip(); } }
      g.translate(o.tx, o.ty);
      if (o.s !== 1) { g.translate(o.about[0], o.about[1]); g.scale(o.s, o.s); g.translate(-o.about[0], -o.about[1]); }
      g.globalAlpha = o.alpha; g.__moving = o.moving;
      track(g, 0, 0, WID, HEI, 540, 960);
      b.shot.draw(g, f, o);
      g.__moving = false;
      g.restore();
      if (o.clip && o.clip[2] < RMAX * 0.7) ring(g, o.clip[0], o.clip[1], o.clip[2], 4);
    }
    const td = transitionDot(f);
    if (td) dot(g, td.x, td.y, td.r);
  }
  const SHUTTER = 0.5;
  let BLUR_CAP = (f) => 16;
  function blurSamples(f) {
    if (f - SHUTTER < 0) return 1;
    PROBE = []; drawPicture(probeCtx, f); const a = PROBE;
    PROBE = []; drawPicture(probeCtx, f - SHUTTER); const b = PROBE; PROBE = null;
    if (a.length !== b.length) return 4;
    let mx = 0; for (let i = 0; i < a.length; i += 2) mx = Math.max(mx, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1]));
    return Math.max(1, Math.min(BLUR_CAP(f), 16, Math.ceil(mx / 2.5)));
  }
  function renderPicture(f) {
    const N = blurSamples(f);
    if (N <= 1) { drawPicture(pctx, f); return 1; }
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, WID, HEI);
    for (let i = 0; i < N; i++) {
      drawPicture(tctx, f - (SHUTTER * i) / (N - 1));
      actx.globalAlpha = 1 / (i + 1); actx.drawImage(tmp, 0, 0);
    }
    actx.globalAlpha = 1; pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.drawImage(acc, 0, 0);
    return N;
  }

  // ================================================================ DOM chrome: kicker, chip, credit
  const $ = (id) => document.getElementById(id);
  const show = (el, on, disp = 'block') => { el.style.display = on ? disp : 'none'; };
  const ringEl = (el, df) => { el.style.opacity = df < 0 ? 0 : clamp01((df + 1) / 3); el.style.transform = `scale(${(0.4 + 0.6 * sp(Math.max(0, df))).toFixed(4)})`; };
  const CHIPS = [];
  function setupChrome() {
    const mk2 = SERIES_MARK[PLAN.series];
    $('kMark').setAttribute('d', mk2.d);
    if (mk2.fill) $('kMark').setAttribute('fill', C.amber);
    else { $('kMark').setAttribute('fill', 'none'); $('kMark').setAttribute('stroke', C.amber); $('kMark').setAttribute('stroke-width', '3'); }
    for (const b of BEATS) {
      const c = b.spec.chip; if (!c) continue;
      const el = document.createElement('div'); el.className = 'mono box chip';
      el.innerHTML = `<svg width="47.27" height="20" viewBox="0 0 104 44" aria-hidden="true" style="overflow: visible"><circle cx="22" cy="22" r="22" fill="${C.amber}"></circle>`
        + `<circle class="cr" cx="82" cy="22" r="19" fill="none" stroke="${C.amber}" stroke-width="6" style="transform-box: fill-box; transform-origin: center"></circle></svg>`
        + `<span>SIGNAL DELAY</span><span style="color: var(--amber)"></span>`;
      el.lastChild.textContent = `${String(c.body).toUpperCase()} ${c.value}`;
      $('chips').appendChild(el);
      const a = Ao(c.at, b.w) + 4, z = Ao(c.until, b.T1);
      // the echo ring lands the real delay later when it is short (Moon 1.3 s = 39 frames), else 24 frames
      const echo = c.echo_frames ?? (c.seconds != null && c.seconds <= 1.6 ? Math.round(c.seconds * FPS) : 24);
      CHIPS.push({ el, ring: el.querySelector('.cr'), a, z, echo, beat: b });
    }
  }
  const chipOn = (f) => CHIPS.some((c) => f >= c.a && f < c.z);
  function renderChrome(f) {
    const nb = BEATS.find((b) => b.spec.shot.type === 'next');
    const onNext = nb && f >= nb.w;
    $('kText').textContent = onNext ? `Next on ${PLAN.series}` : PLAN.series;
    for (const c of CHIPS) { const on = f >= c.a && f < c.z; show(c.el, on, 'flex'); if (on) ringEl(c.ring, f - (c.a + c.echo)); }
    // credit slot: every photo on screen, or the source of the facts on line art
    const parts = [];
    for (const b of visible(f)) {
      const o = beatXf(b, f); if (o.skip) continue;
      let cr = b.shot.credit?.(f);
      if (cr == null) continue;
      for (const s of [].concat(cr)) if (s && !parts.includes(s)) parts.push(s);
    }
    const ce = $('credit');
    // photo credits first; line-art sources only when they fit in two lines with them
    let txt = parts.join(' · ');
    if (txt.length > 64 * 2) txt = parts.filter((s) => !/^Source:/.test(s)).join(' · ') || parts[0];
    ce.textContent = txt; show(ce, !!txt);
  }

  // ================================================================ captions
  let CHUNKS = [];
  const GLUE = /^(a|an|the|to|of|on|by|set|in|into|and|or|is|it|its|from|that|almost|five|ever|at|for|with|as|than|very|no|our|their|his|her|this|these)$/i;
  const UNIT = /^(miles?|years?|points?|km|kilometers?|feet|ft|days?|hours?|minutes?|seconds?|percent|times|million|billion|thousand|meters?|kg|tons?|light-years?|degrees?|x)\b/i;
  function buildChunks() {
    const m = document.createElement('canvas').getContext('2d');
    m.font = "700 90px 'Archivo'";
    const wid = (ws) => m.measureText(ws.map((w) => w.text).join(' ')).width;
    const MAXW = 820 - 32;
    const segs = []; let cur = [];
    W.forEach((w, i) => {
      const prev = W[i - 1];
      if (cur.length && prev && !prev.keep_with_next && (/[.?!:]$/.test(prev.text) || w.start - prev.end > 0.45)) { segs.push(cur); cur = []; }
      cur.push(w);
    });
    if (cur.length) segs.push(cur);
    const chunks = [];
    for (const sg of segs) {
      const n = sg.length, best = new Array(n + 1).fill(Infinity), from = new Array(n + 1).fill(-1); best[0] = 0;
      for (let i = 1; i <= n; i++) for (let j = Math.max(0, i - 4); j < i; j++) {
        const ws = sg.slice(j, i), w = wid(ws); if (w > MAXW || best[j] === Infinity) continue;
        let c = i === n ? 0.3 * ((MAXW - w) / 100) ** 2 : ((MAXW - w) / 100) ** 2;
        if (ws.length === 1 && n > 1) c += 40;
        if (i < n && /,$/.test(sg[i - 1].text)) c -= 12;
        if (ws.slice(0, -1).some((x) => /,$/.test(x.text))) c += 18;
        if (i < n && GLUE.test(sg[i - 1].text)) c += 30;
        if (i < n && /^(\d[\d.,]*)$/.test(sg[i - 1].text) && UNIT.test(sg[i].text)) c += 60;
        if (i < n && sg[i - 1].keep_with_next) c += 400;                 // never split a two-word name
        if (best[j] + c < best[i]) { best[i] = best[j] + c; from[i] = j; }
      }
      if (best[n] === Infinity) throw new Error('engine: a caption word is wider than the caption line: ' + sg.map((w) => w.text).join(' '));
      const lines = []; for (let i = n; i > 0; i = from[i]) lines.unshift(sg.slice(from[i], i));
      const Ln = lines.length, cb = new Array(Ln + 1).fill(Infinity), cf = new Array(Ln + 1).fill(-1); cb[0] = 0;
      for (let i = 1; i <= Ln; i++) for (let j = Math.max(0, i - 2); j < i; j++) {
        let c = i - j === 1 ? (Ln === 1 ? 0 : 10 + (lines[j].length === 1 ? 30 : 0)) : 0;
        if (i < Ln && lines[i - 1].slice(-1)[0].keep_with_next) c += 400;
        if (cb[j] + c < cb[i]) { cb[i] = cb[j] + c; cf[i] = j; }
      }
      const grp = []; for (let i = Ln; i > 0; i = cf[i]) grp.unshift(lines.slice(cf[i], i));
      for (const g of grp) chunks.push({ lines: g });
    }
    chunks.forEach((c) => { c.f0 = c.lines[0][0].f; c.lastW = c.lines[c.lines.length - 1].slice(-1)[0]; });
    chunks.forEach((c, j) => {
      const nxt = chunks[j + 1];
      c.f1 = !nxt ? LAST + 1 : nxt.f0 - c.lastW.fe > 30 ? c.lastW.fe + 24 : nxt.f0;
      c.rects = c.lines.map((ln, li) => [80, L.captionTop + li * 120, Math.ceil(wid(ln)) + 32, 112]);
      c.el = document.createElement('div'); c.el.style.cssText = 'display:none;flex-direction:column;align-items:flex-start;gap:8px';
      c.lineEls = c.lines.map((ln) => {
        const le = document.createElement('div'); le.className = 'line';
        ln.forEach((w, q) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = (q ? ' ' : '') + w.text; le.appendChild(s); w.el = s; });
        c.el.appendChild(le); return le;
      });
      $('caps').appendChild(c.el);
    });
    CHUNKS = chunks;
  }
  const chunkAt = (f) => CHUNKS.find((c) => f >= c.f0 && f < c.f1) ?? null;
  // caption line rectangles at f (only lines that have a word on screen)
  function captionRects(f) {
    const c = chunkAt(f); if (!c) return [];
    return c.rects.filter((r, li) => c.lines[li][0].f <= f);
  }
  function renderCaptions(f) {
    for (const c of CHUNKS) {
      const on = f >= c.f0 && f < c.f1; show(c.el, on, 'flex'); if (!on) continue;
      let lastW = null;
      c.lines.forEach((ln, li) => {
        let any = false;
        ln.forEach((w) => { const v = f >= w.f; w.el.style.display = v ? 'inline' : 'none'; w.el.classList.remove('on'); if (v) { lastW = w; any = true; } });
        c.lineEls[li].style.display = any ? 'block' : 'none';
      });
      if (lastW) lastW.el.classList.add('on');
    }
  }

  // ================================================================ the cat (v3 actor)
  const CAT = { actor: null, on: [], list: [], moves: [], scales: [] };
  const catSafe = [40, 200, 900, 1300];
  function subjectsAt(f) {
    const R = [];
    for (const b of visible(f)) { const o = beatXf(b, f); if (o.skip) continue; for (const r of b.shot.subjects?.(f) ?? []) R.push(r); }
    return R;
  }
  function anchorsAt(f, beatId) {
    const bs = beatId ? BEATS.filter((b) => b.id === beatId) : visible(f).slice().reverse();
    for (const b of bs) { const a = b.shot.anchors?.(f); if (a) return { b, a }; }
    return { b: null, a: {} };
  }
  const centerOf = (r) => (r.length === 2 ? r : [r[0] + r[2] / 2, r[1] + r[3] / 2]);
  // resolve a target spec to a point; mode 'stand' (feet anchor) or 'look' (a point to look or point at)
  function target(spec, f, mode, scale) {
    if (spec == null) return null;
    if (Array.isArray(spec)) return mode === 'stand' ? fitStand(spec, f, scale) : spec;
    const s = String(spec);
    if (s === 'camera') return null;
    if (s === 'dot') return dotAt(f);
    if (s.startsWith('caption')) {
      const fr = s.includes(':') ? Number(s.split(':')[1]) : 0.5;
      const ff = mode === 'stand' ? f + 6 : f;
      const r = (chunkAt(ff) ?? chunkAt(f) ?? CHUNKS[0]).rects[0];
      return mode === 'stand' ? [clamp(r[0] + r[2] * fr, 100, 880), r[1]] : centerOf(r);
    }
    if (s === 'left' || s === 'right' || s === 'center') {
      const x = { left: 190, right: 790, center: 540 }[s];
      return mode === 'stand' ? fitStand([x, L.floor], f, scale) : [x, 900];
    }
    if (s.startsWith('el:')) {
      let nm = s.slice(3), bid = null;
      if (nm.includes('.')) [bid, nm] = nm.split('.');
      const { a } = anchorsAt(f, bid);
      const r = a[nm];
      if (!r) throw new Error(`engine: cat target "${s}" at frame ${f}: the shot on screen has no element "${nm}" (it has: ${Object.keys(a).join(', ') || 'none'})`);
      if (mode === 'stand') return r.length === 2 ? r : [r[0] + r[2] / 2, r[1]];
      return centerOf(r);
    }
    throw new Error('engine: unknown cat target ' + s);
  }
  function fitStand(p, f, scale) {
    const fa = f + 12;
    const caps = captionRects(fa).map((r) => [r[0] + 6, r[1] + 40, r[2] - 12, r[3] - 40]);
    const probe = new M_actor.Actor({ scale, safe: catSafe });
    return probe.fit(p, { avoid: [...caps, ...subjectsAt(fa)], safe: catSafe });
  }
  const POINTISH = new Set(['point', 'gasp', 'look']);
  function buildCat() {
    const spec = PLAN.cat; if (!spec) return;
    const K = spec.scale ?? 0.34;
    const actor = new M_actor.Actor({ scale: K, seed: spec.seed ?? 7, safe: catSafe });
    const TL = [];
    for (const m of spec.moves) {
      const f = A(m.at), t = f / FPS;
      const { at: _a, target: tg, to, box, along, do: d, ...rest } = m;
      const e = { t, do: d, ...rest };
      const sc = m.scale ?? K;
      if (to != null) e.to = target(to, f, 'stand', sc);
      if (tg !== undefined) e.at = target(tg, f, 'look', sc);
      if (d === 'enter' && m.how === 'pop') {
        const r = typeof box === 'string' && box.startsWith('el:') ? null : (chunkAt(f + 2) ?? chunkAt(f) ?? CHUNKS[0]).rects[0];
        e.box = r ?? target(box, f, 'look', sc); e.at = along ?? 0.2;
      }
      if (d === 'enter' && !e.to && m.how !== 'pop') e.to = target('left', f, 'stand', sc);
      TL.push(e);
    }
    const stress = new Set((PLAN.stress ?? []).map((s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')));
    TL.push({ t: 0, do: 'say', words: W.map((w) => ({ w: w.text, s: w.start, e: w.end, stress: stress.has(w.key) })) });
    if (!TL.some((q) => q.do === 'expr')) TL.push({ t: 0, do: 'expr', expr: 'curious' });
    actor.timeline(TL);
    CAT.actor = actor; CAT.list = TL;
    // on-screen windows: from each entrance until he is fully out of frame after the next exit
    const Es = TL.filter((q) => q.do === 'enter' || q.do === 'exit').sort((p, q) => p.t - q.t);
    const gone = (fr) => { const tt = fr / FPS; if (!actor.render(tt)) return true; const b = actor.box(tt); return b[0] > WID || b[0] + b[2] < 0 || b[1] > HEI || b[1] + b[3] < 0; };
    CAT.on = [];
    for (let i = 0; i < Es.length; i++) if (Es[i].do === 'enter') {
      let a0 = Math.max(0, Math.round(Es[i].t * FPS)); while (a0 < LAST && gone(a0)) a0++;
      let b0 = LAST;
      if (Es[i + 1] && Es[i + 1].do === 'exit') { b0 = Math.round(Es[i + 1].t * FPS); while (b0 < LAST && !gone(b0)) b0++; b0--; }
      CAT.on.push([a0, b0]);
    }
    CAT.moves = [...new Set(spec.moves.filter((m) => !['expr', 'look', 'say'].includes(m.do)).map((m) => (m.do === 'enter' || m.do === 'exit' ? `${m.do} ${m.how ?? (m.do === 'enter' ? 'skid' : 'zip')}` : m.do)))];
  }
  const catOn = (f) => CAT.on.some(([a, b]) => f >= a - 1 && f <= b + 1);
  function renderCat(f) {
    const svg = $('cat');
    if (!CAT.actor || !catOn(f)) { show(svg, false); return 1; }
    const t = f / FPS, bl = CAT.actor.blur(t);
    const g = M_actor.motionBlur((tt) => CAT.actor.render(tt), t, bl.n, bl.shutter * 0.5, FPS);
    show(svg, !!g); svg.innerHTML = g;
    return bl.n;
  }
  function lintCat() {
    const hits = [], A2 = CAT.actor; if (!A2) return { windows: [], framesOn: 0, share: 0, hits, moves: [] };
    for (const [a, b] of CAT.on) for (let f = a; f <= Math.min(b, LAST); f++) {
      // caption words: the line box minus its padding; photo subjects and numbers: the shots' subject rects
      const caps = captionRects(f).map((r) => [r[0] + 16, r[1] + 8, r[2] - 32, r[3] - 16]);
      const subj = subjectsAt(f);
      const t = f / FPS;
      const e = A2._rootEntry(t);
      const moving = e && (e.a.do === 'enter' || e.a.do === 'exit') && t - e.t0 < e.dur;
      for (const h of A2.lint(t, t, [...caps, ...subj], { tol: 8 })) {
        const kind = h.rect === 'safe' ? 'safe' : h.rect < caps.length ? 'caption' : 'subject';
        hits.push({ frame: f, kind, during: e ? (e.a.do + (e.a.how ? ' ' + e.a.how : '')) : null, exempt: !!moving, overlap: h.overlap ?? null });
      }
    }
    const on = CAT.on.reduce((s, [a, b]) => s + Math.min(b, LAST) - a + 1, 0);
    return { windows: CAT.on, framesOn: on, share: +(on / NF).toFixed(3), hits, moves: CAT.moves };
  }

  // ================================================================ sound cues (curated)
  const PRI = { wordmark_echo: 100, next_card_in: 90, number_slam: 80, chip_in: 72, hard_cut: 70, echo_land: 62, reveal: 60, cat_in: 55, impact: 50, scene_move: 45, cat_chirp: 44, riser: 30, glitch: 25, cat_out: 20 };
  function cues() {
    const raw = [];
    const c = (frame, type, note, extra = {}) => raw.push({ frame: Math.round(frame), fps: FPS, t: +(Math.round(frame) / FPS).toFixed(3), type, note, ...extra });
    for (const b of BEATS) {
      if (b.i > 0) {
        if (b.tr.type === 'cut' && b.spec.shot.type !== 'next') c(b.w, 'hard_cut', `hard cut on "${W.find((w) => w.f === b.w)?.text ?? ''}" into ${b.id}`);
        else if (b.tr.type === 'push') c(b.T0, 'hard_cut', `${b.prev.id} leaves ${b.tr.dir ?? 'up'}, ${b.id} arrives`, { sfx: 'whoosh_short', pri: 46 });
        else if (b.tr.type === 'iris' || b.tr.type === 'morph') c(b.T0 + 2, 'scene_move', `${b.prev.id} ${b.tr.type === 'iris' ? 'irises' : 'shrinks'} into the dot, ${b.id} opens`, { gain_db: -1, pri: 42 });
      }
      for (const q of b.shot.cues?.() ?? []) c(q.frame, q.type, `${b.id}: ${q.note}`, { ...(q.sfx ? { sfx: q.sfx } : {}), ...(q.gain_db != null ? { gain_db: q.gain_db } : {}), ...(q.pri ? { pri: q.pri } : {}) });
    }
    for (const ch of CHIPS) { c(ch.a, 'chip_in', 'signal delay chip'); c(ch.a + ch.echo, 'echo_land', 'chip echo ring lands', { gain_db: -2 }); }
    if (CAT.actor) {
      const ent = CAT.list.filter((q) => q.do === 'enter').sort((a, b) => a.t - b.t);
      if (ent[0]) c(Math.round(ent[0].t * FPS) + 6, 'cat_in', 'the cat enters (' + (ent[0].how ?? 'skid') + ')');
      const chirp = CAT.list.find((q) => ['thumbs', 'sign', 'what', 'gasp'].includes(q.do));
      if (chirp) c(Math.round(chirp.t * FPS) + 4, 'cat_chirp', 'the cat reacts (' + chirp.do + ')');
    }
    c(WM, 'wordmark_echo', 'wordmark dot, then its echo ring 12 frames later (sonic logo)');
    // curate: 12 to 18 cues per 35 s, at least 0.3 s apart, by priority
    const maxN = Math.max(6, Math.floor((18 * NF) / (35 * FPS))), minGap = 9;
    const sorted = raw.map((q) => ({ ...q, p: q.pri ?? PRI[q.type] ?? 30 })).sort((a, b) => b.p - a.p || a.frame - b.frame);
    const keep = [];
    for (const q of sorted) {
      if (keep.length >= maxN) break;
      if (keep.some((x) => Math.abs(x.frame - q.frame) < minGap)) continue;
      keep.push(q);
    }
    return keep.sort((a, b) => a.frame - b.frame).map(({ p, pri, ...q }) => q);
  }

  // ================================================================ checks (run by the builder in a headless browser)
  function settledFrames() {
    const out = [];
    for (const b of BEATS) {
      const a = b.T0 + b.tr.N + 8, z = (b.next ? b.next.T0 : NF) - 2;
      for (let f = a; f < z; f += 5) out.push({ f, b });
    }
    return out;
  }
  function checkLayout() {
    const problems = [];
    TXT.on = true;
    for (const { f, b } of settledFrames()) {
      TXT.list = [];
      drawPicture(tctx, f);
      for (const r of TXT.list) {
        if (r.moving) continue;
        const x0 = r.kind === 'giant' ? 40 : 80;
        if (r.x < x0 - 2 || r.x1 > L.textX1 + 2 || r.y < 240 || r.y1 > 1160) problems.push({ frame: f, beat: b.id, kind: r.kind, rect: [r.x, r.y, r.x1, r.y1].map(Math.round) });
      }
    }
    TXT.on = false;
    return problems;
  }
  // fill check: share of the band y 640 to 1150 that is plain ink (no picture) on settled frames, with the cat counted
  function checkFill() {
    const out = [];
    for (const { f, b } of settledFrames()) {
      drawPicture(tctx, f);
      const d = tctx.getImageData(0, 640, WID, 510).data;
      let ink = 0, n = 0;
      const cb = CAT.actor && catOn(f) ? CAT.actor.box(f / FPS) : null;
      for (let y = 0; y < 510; y += 6) for (let x = 0; x < WID; x += 6) {
        const i = (y * WID + x) * 4; n++;
        if (cb && x >= cb[0] && x <= cb[0] + cb[2] && y + 640 >= cb[1] && y + 640 <= cb[1] + cb[3]) continue;
        if (Math.abs(d[i] - 11) < 6 && Math.abs(d[i + 1] - 11) < 6 && Math.abs(d[i + 2] - 12) < 6) ink++;
      }
      out.push({ frame: f, beat: b.id, emptyShare: +(ink / n).toFixed(3) });
    }
    return out;
  }

  // ================================================================ frame
  let lastN = 1;
  function renderAt(t) {
    const f = Math.min(LAST, Math.max(0, Math.round(t * FPS)));
    lastN = renderPicture(f);
    renderChrome(f);
    renderCaptions(f);
    lastN = Math.max(lastN, renderCat(f));
  }

  return {
    FPS, WID, HEI, C, L, NF, LAST, WM, W, A, Ao, IMG, BEATS, SHOTS, CAT, CHIPS,
    enter, move, exitE, clamp01, clamp, lerp, elerp, k, spring, sp, punch, countU, slam, rng,
    markup, plain, FONT, CAP, giantWidth, monoWidth, headlineWidth, drawGiant, drawMono, drawHeadline, mctx,
    track, dot, ring, line, inkDisc, polyLen, polyAt, polySlice, smooth, photo, photoPt, frameCam, frameX, frameY, buildLayers,
    setupBeats, setupChrome, buildChunks, buildCat, measureFonts, renderAt, cues, lintCat, checkLayout, checkFill,
    captionRects, chunkAt, chipOn, dotAt, visible, pIn, pOut, imgPromises, regText,
    get CHUNKS() { return CHUNKS; }, setBlurCap: (fn) => { BLUR_CAP = fn; }, lastSamples: () => lastN,
    captionsAt: renderCaptions,
  };
})();
