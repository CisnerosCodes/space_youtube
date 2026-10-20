// ---------- paper engine: textures, pieces (sprites + baked soft shadows), boil, light, camera ----------
const PAPERS = {
  // name: [base color, mottling strength, fiber strength, grain]
  core: ['#f7f1e3', 0.05, 0.6, 7],
  cream: ['#efe6d2', 0.06, 0.6, 8],
  white: ['#f6f2ea', 0.05, 0.5, 6],
  amber: ['#f5b83d', 0.07, 0.5, 9],
  amberDk: ['#d9962a', 0.07, 0.5, 9],
  ink: ['#1b1a20', 0.10, 0.35, 6],
  inkSoft: ['#25242c', 0.10, 0.35, 6],
  space0: ['#0f1018', 0.10, 0.25, 5],
  space1: ['#171a28', 0.10, 0.3, 5],
  space2: ['#20253a', 0.10, 0.3, 6],
  space3: ['#2b3150', 0.10, 0.3, 6],
  night0: ['#16223a', 0.10, 0.3, 6],
  night1: ['#1e3150', 0.10, 0.3, 6],
  night2: ['#2a4266', 0.10, 0.3, 6],
  sea0: ['#173a5a', 0.10, 0.35, 7],
  sea1: ['#1d4a70', 0.10, 0.35, 7],
  sea2: ['#245a85', 0.10, 0.35, 7],
  sea3: ['#2f6d9b', 0.10, 0.35, 7],
  island: ['#1f3a2e', 0.12, 0.35, 7],
  island2: ['#2c4d3a', 0.12, 0.35, 7],
  mars: ['#c4552f', 0.10, 0.45, 9],
  marsDk: ['#963a22', 0.10, 0.45, 9],
  marsDk2: ['#6f2a1a', 0.10, 0.45, 9],
  marsLt: ['#df8448', 0.10, 0.45, 9],
  marsSand: ['#e9a865', 0.10, 0.45, 9],
  cap: ['#f3ece0', 0.05, 0.5, 6],
  pho: ['#8c7d70', 0.12, 0.5, 10],
  phoLt: ['#a99a89', 0.10, 0.5, 10],
  phoDk: ['#65584d', 0.12, 0.5, 10],
  phoDk2: ['#463b33', 0.12, 0.5, 10],
  mouth: ['#2a1e1b', 0.10, 0.3, 6],
  mouthIn: ['#5b2a24', 0.10, 0.3, 6],
  brow: ['#3b302a', 0.10, 0.4, 7],
  gold: ['#d6a542', 0.18, 0.5, 14],
  goldDk: ['#a8792a', 0.18, 0.5, 14],
  steel: ['#b9bcc2', 0.08, 0.4, 8],
  steelDk: ['#7d828c', 0.08, 0.4, 8],
  panel: ['#24345a', 0.10, 0.35, 7],
  panelLt: ['#34507e', 0.10, 0.35, 7],
  red: ['#c8352e', 0.08, 0.45, 8],
  redDk: ['#962520', 0.08, 0.45, 8],
  flameY: ['#ffd25a', 0.08, 0.4, 8],
  flameO: ['#f28a2e', 0.08, 0.4, 8],
  flameR: ['#d9462b', 0.08, 0.4, 8],
  cloud: ['#ece6dc', 0.06, 0.55, 7],
  cloudSh: ['#c9c2b8', 0.06, 0.55, 7],
  kraft: ['#b88b57', 0.12, 0.9, 12],
  kraftDk: ['#8f6a40', 0.12, 0.9, 12],
  manila: ['#e6cf96', 0.08, 0.6, 9],
  news: ['#d9d4c7', 0.06, 0.5, 9],
  earth0: ['#1d5a8c', 0.10, 0.35, 7],
  earth1: ['#2a73aa', 0.10, 0.35, 7],
  land: ['#5f8d45', 0.12, 0.45, 9],
  landDk: ['#456c33', 0.12, 0.45, 9],
  ochre: ['#c9763a', 0.12, 0.5, 10],
  ochreLt: ['#dc9a55', 0.12, 0.5, 10],
  ochreDk: ['#9c5228', 0.12, 0.5, 10],
  dusk0: ['#2a2346', 0.10, 0.3, 6],
  dusk1: ['#4b3460', 0.10, 0.3, 6],
  dusk2: ['#a2506a', 0.10, 0.35, 7],
  dusk3: ['#e08a5a', 0.10, 0.35, 7],
  dusk4: ['#f2b56d', 0.10, 0.35, 7],
  hill0: ['#2c2440', 0.12, 0.35, 7],
  hill1: ['#3b2f4a', 0.12, 0.35, 7],
  hill2: ['#243a35', 0.12, 0.35, 7],
  vault0: ['#1c1714', 0.10, 0.4, 7],
  vault1: ['#2a221d', 0.10, 0.4, 7],
  vault2: ['#3a2f27', 0.10, 0.4, 7],
  wood: ['#c99a5e', 0.12, 0.9, 12],
  cork: ['#b98a5a', 0.2, 0.6, 18],
  vellum: ['#f4efe4', 0.04, 0.4, 5],
  blueTag: ['#bcd3e0', 0.06, 0.5, 8],
};

const TILE = 320;
const _tiles = {};
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function paperTile(name) {
  if (_tiles[name]) return _tiles[name];
  const [base, mot, fib, grain] = PAPERS[name] || PAPERS.cream;
  const c = document.createElement('canvas'); c.width = c.height = TILE;
  const g = c.getContext('2d');
  const rng = mulberry32(name.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0);
  g.fillStyle = base; g.fillRect(0, 0, TILE, TILE);
  // mottling: soft blotches (wrapped for tiling)
  const blot = (x, y, r, col) => {
    for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) {
      const X = x + ox, Y = y + oy;
      if (X + r < 0 || X - r > TILE || Y + r < 0 || Y - r > TILE) continue;
      const gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(X - r, Y - r, r * 2, r * 2);
    }
  };
  for (let i = 0; i < 46; i++) {
    const light = rng() < 0.5;
    blot(rng() * TILE, rng() * TILE, 20 + rng() * 70, light ? `rgba(255,250,240,${mot * rng()})` : `rgba(30,20,10,${mot * rng()})`);
  }
  // fibers: short curved strokes, light and dark
  g.lineCap = 'round';
  const nf = Math.round(380 * fib);
  for (let i = 0; i < nf; i++) {
    const x = rng() * TILE, y = rng() * TILE, a = rng() * TAU, L = 6 + rng() * 26, bend = (rng() - 0.5) * 10;
    const light = rng() < 0.6;
    g.strokeStyle = light ? `rgba(255,252,245,${0.06 + rng() * 0.14})` : `rgba(40,25,15,${0.04 + rng() * 0.08})`;
    g.lineWidth = 0.4 + rng() * 0.9;
    for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) {
      const X = x + ox, Y = y + oy;
      if (X < -40 || X > TILE + 40 || Y < -40 || Y > TILE + 40) continue;
      g.beginPath(); g.moveTo(X, Y);
      g.quadraticCurveTo(X + Math.cos(a) * L / 2 - Math.sin(a) * bend, Y + Math.sin(a) * L / 2 + Math.cos(a) * bend, X + Math.cos(a) * L, Y + Math.sin(a) * L);
      g.stroke();
    }
  }
  // per-pixel grain
  const id = g.getImageData(0, 0, TILE, TILE), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rng() - 0.5) * grain * 2; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
  _tiles[name] = c;
  return c;
}
function coreFor(paper) {
  const base = (PAPERS[paper] || PAPERS.cream)[0];
  const [r, g, b] = hexRgb(base);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum > 0.42) return 'core';
  const name = paper + '_core';
  if (!PAPERS[name]) { const m = (v) => Math.round(v + (235 - v) * 0.2).toString(16).padStart(2, '0'); PAPERS[name] = ['#' + m(r) + m(g) + m(b), 0.06, 0.7, 6]; }
  return name;
}
function pat(ctx, name, seed = 0, scale = 1) {
  const p = ctx.createPattern(paperTile(name), 'repeat');
  const m = new DOMMatrix().translateSelf(h1(seed) * TILE, h1(seed + 3) * TILE).rotateSelf((h1(seed + 5) - 0.5) * 40).scaleSelf(scale);
  p.setTransform(m);
  return p;
}

// ---------- global frame state (set by renderAt) ----------
const G = { t: 0, F: 0, step: 0, light: { mode: 'dir', dx: 0.6, dy: 0.8, k: 0.9, a: 0.42, px: 540, py: 900 } };

// ---------- pieces ----------
let _seedCounter = 1000;
class Piece {
  constructor(o) {
    Object.assign(this, {
      variants: 3, edge: 'cut', paper: 'cream', amp: null, freq: null, res: 1, pad: 18, blur: 9,
      shade: 1, details: null, seed: _seedCounter++, jitter: 0.7, coreW: 2.2, fringe: true, shadowRes: 0.5,
      paperScale: 1, inkEdge: 0.11,
    }, o);
    this.cache = [];
  }
  build(v) {
    const polys0 = this.shape();
    const P = Array.isArray(polys0[0][0]) ? polys0 : [polys0];
    const torn = this.edge === 'torn';
    const amp = this.amp ?? (torn ? 2.6 : 0.55), freq = this.freq ?? (torn ? 0.07 : 0.02);
    const sd = this.seed * 13 + v * 7919;
    const top = this.edge === 'none' ? P : P.map((p, i) => roughen(p, { amp, freq, seed: sd + i, bias: torn ? -1.2 : 0, amp2: torn ? 0.9 : 0.25, freq2: torn ? 0.6 : 0.3, step: torn ? 3 : 5 }));
    const core = torn ? P.map((p, i) => roughen(p, { amp: amp * 1.15, freq: freq * 1.25, seed: sd + 101 + i, bias: this.coreW, amp2: 1.1, freq2: 0.7, step: 3 })) : null;
    const bb = bboxOf(core || top);
    const pad = this.pad + this.blur * 2;
    const x0 = bb.x - pad, y0 = bb.y - pad, w = bb.w + pad * 2, h = bb.h + pad * 2;
    const res = this.res;
    const c = document.createElement('canvas'); c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
    const g = c.getContext('2d');
    g.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
    const rng = mulberry32(sd);
    if (core) {
      g.fillStyle = pat(g, this.coreP || coreFor(this.paper), this.seed + 9); pathPolys(g, core); g.fill('evenodd');
      if (this.fringe) {
        g.strokeStyle = coreFor(this.paper) === 'core' ? 'rgba(250,246,236,0.55)' : 'rgba(150,150,160,0.35)'; g.lineWidth = 0.6; g.lineCap = 'round';
        for (const cp of core) for (let i = 0; i < cp.length; i += 2) {
          const a = cp[i], b = cp[(i + 1) % cp.length];
          const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
          const s = signedArea(cp) > 0 ? 1 : -1;
          const L = 0.8 + rng() * 2.4, ang = (rng() - 0.5) * 0.9;
          let nx = (dy / l) * s, ny = (-dx / l) * s;
          const cx = nx * Math.cos(ang) - ny * Math.sin(ang), cy = nx * Math.sin(ang) + ny * Math.cos(ang);
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[0] + cx * L, a[1] + cy * L); g.stroke();
        }
      }
    }
    g.fillStyle = pat(g, this.paper, this.seed, this.paperScale); pathPolys(g, top); g.fill('evenodd');
    g.save(); pathPolys(g, top); g.clip('evenodd');
    if (this.details) this.details(g, rng, v, bb);
    if (this.shade) {
      const lg = g.createLinearGradient(bb.x, bb.y, bb.x + bb.w, bb.y + bb.h);
      lg.addColorStop(0, `rgba(255,250,238,${0.10 * this.shade})`); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, `rgba(20,10,10,${0.13 * this.shade})`);
      g.fillStyle = lg; g.fillRect(bb.x, bb.y, bb.w, bb.h);
      // inner edge darkening (paper edge catching less light)
      g.strokeStyle = `rgba(20,10,5,${this.inkEdge})`; g.lineWidth = 5; pathPolys(g, top); g.stroke();
      g.strokeStyle = `rgba(255,250,240,${0.10 * this.shade})`; g.lineWidth = 1.4; g.save(); g.translate(0.8, 0.8); pathPolys(g, top); g.stroke(); g.restore();
    }
    g.restore();
    // shadow sprite
    const sr = this.shadowRes;
    const sc = document.createElement('canvas'); sc.width = Math.ceil(w * sr); sc.height = Math.ceil(h * sr);
    const sg = sc.getContext('2d');
    const tmp = document.createElement('canvas'); tmp.width = sc.width; tmp.height = sc.height;
    const tg = tmp.getContext('2d');
    tg.setTransform(sr, 0, 0, sr, -x0 * sr, -y0 * sr);
    tg.fillStyle = '#140c1c'; pathPolys(tg, core || top); tg.fill('evenodd');
    sg.filter = `blur(${Math.max(0.5, this.blur * sr)}px)`; sg.drawImage(tmp, 0, 0); sg.filter = 'none';
    return { c, sh: sc, x: x0, y: y0, w, h, top };
  }
  get(v) { if (!this.cache[v]) this.cache[v] = this.build(v); return this.cache[v]; }
  warm() { for (let v = 0; v < this.variants; v++) this.get(v); }
}

// boil variant & placement jitter: change every 2 frames
function boilV(P) { return Math.floor(h2(G.step, P.seed) * P.variants) % P.variants; }
function jitM(P, amt = 1) {
  const j = P.jitter * amt;
  if (!j) return MI;
  const a = (h2(G.step + 0.5, P.seed + 3) - 0.5) * 2 * j, b = (h2(G.step + 0.25, P.seed + 7) - 0.5) * 2 * j;
  const r = (h2(G.step + 0.75, P.seed + 11) - 0.5) * 2 * j * 0.0045;
  return mmul(mT(a, b), mR(r));
}
function shadowOff(M, lift) {
  const L = G.light, s = mScale(M);
  if (L.mode === 'point') {
    const [x, y] = mApply(M, 0, 0);
    let vx = x - L.px, vy = y - L.py; const d = Math.hypot(vx, vy) || 1;
    const k = L.k * (0.7 + 260 / (d + 160));
    return [vx / d * lift * s * k, vy / d * lift * s * k];
  }
  return [L.dx * lift * s * L.k, L.dy * lift * s * L.k];
}
// draw a piece with matrix M (local -> screen). o: {lift, alpha, sa (shadow alpha mult), jit}
function drawP(ctx, P, M, o = {}) {
  const v = o.v ?? boilV(P);
  const S = P.get(v);
  const M2 = o.jit === 0 ? M : mmul(M, jitM(P, o.jit ?? 1));
  const alpha = o.alpha ?? 1;
  if (alpha <= 0.003) return;
  const lift = o.lift ?? 6;
  if (lift > 0 && P.shadow !== false) {
    const [ox, oy] = shadowOff(M2, lift);
    const grow = 1 + Math.min(0.06, lift * 0.0012);
    const cx = S.x + S.w / 2, cy = S.y + S.h / 2;
    ctx.setTransform(1, 0, 0, 1, ox, oy); ctx.transform(...M2);
    ctx.translate(cx, cy); ctx.scale(grow, grow); ctx.translate(-cx, -cy);
    ctx.globalAlpha = clamp(G.light.a * alpha * (o.sa ?? 1) * (1 - Math.min(0.35, lift * 0.004)), 0, 1);
    ctx.drawImage(S.sh, S.x, S.y, S.w, S.h);
  }
  ctx.setTransform(...M2);
  ctx.globalAlpha = alpha;
  if (o.comp) ctx.globalCompositeOperation = o.comp;
  ctx.drawImage(S.c, S.x, S.y, S.w, S.h);
  ctx.globalAlpha = 1;
  if (o.comp) ctx.globalCompositeOperation = 'source-over';
}

// ---------- camera (multiplane) ----------
// cam: {x, y, zoom, push, roll, cx, cy}; a layer at depth d moves with parallax 1/d and grows with push/d
function camM(cam, d) {
  const k = 1 / d;
  const s = (cam.zoom ?? 1) * (1 + (cam.push ?? 0) * k);
  const cx = cam.cx ?? 540, cy = cam.cy ?? 760;
  let m = mT(cx, cy);
  if (cam.roll) m = mmul(m, mR(cam.roll * k));
  m = mmul(m, mS(s));
  m = mmul(m, mT(-cx - (cam.x ?? 0) * k, -cy - (cam.y ?? 0) * k));
  return m;
}

// ---------- small craft helpers drawn directly ----------
// brass split pin (paper fastener) at screen-space matrix M, local (x,y), radius r
function splitPin(ctx, M, x, y, r = 7, rot = 0) {
  ctx.setTransform(...mPlace(M, x, y, rot));
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(20,10,20,0.35)'; ctx.beginPath(); ctx.arc(1.4, 1.8, r * 1.05, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fff2c0'); g.addColorStop(0.35, '#e6b94f'); g.addColorStop(1, '#8a6420');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(70,45,10,0.55)'; ctx.lineWidth = Math.max(0.8, r * 0.12); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,38,8,0.75)'; ctx.lineWidth = Math.max(0.8, r * 0.16);
  ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(r * 0.45, 0); ctx.stroke();
}
// thread / string from screen point a to b with a slight sag; drawn in screen space
function thread(ctx, ax, ay, bx, by, o = {}) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sag = o.sag ?? 0;
  const mx = (ax + bx) / 2 + (o.sway ?? 0), my = (ay + by) / 2 + sag;
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.strokeStyle = 'rgba(10,6,14,0.28)'; ctx.lineWidth = (o.w ?? 1.6) + 1;
  ctx.beginPath(); ctx.moveTo(ax + 4, ay + 5); ctx.quadraticCurveTo(mx + 4, my + 5, bx + 4, by + 5); ctx.stroke();
  ctx.strokeStyle = o.color ?? 'rgba(235,228,210,0.85)'; ctx.lineWidth = o.w ?? 1.6;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------- text helpers ----------
function setFont(g, spec) { g.font = spec.font; g.fontStretch = spec.stretch || 'normal'; g.letterSpacing = spec.ls || '0px'; }
const FONTS = {
  cap: { font: '800 80px Archivo', stretch: 'normal' },
  capWide: { font: '800 80px Archivo', stretch: 'semi-expanded' },
  mono: { font: '500 24px "IBM Plex Mono"' },
  monoB: { font: '600 28px "IBM Plex Mono"' },
  type: { font: '400 30px "Special Elite"' },
  hand: { font: '400 34px "Patrick Hand"' },
};
// text-shaped cut paper (wordmark letters, big numbers): sprite = paper masked by glyphs
class TextPiece {
  constructor(o) { Object.assign(this, { variants: 2, paper: 'cream', blur: 8, seed: _seedCounter++, jitter: 0.8, res: 1, stretch: 'normal', ls: '0px', outline: 0 }, o); this.cache = []; }
  build(v) {
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = this.font; meas.fontStretch = this.stretch; meas.letterSpacing = this.ls;
    const m = meas.measureText(this.text);
    const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    const pad = 10 + this.blur * 2 + this.outline;
    const x0 = -m.actualBoundingBoxLeft - pad, y0 = -asc - pad, w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight + pad * 2, h = asc + desc + pad * 2;
    const res = this.res;
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(w * res); c.height = Math.ceil(h * res); const g = c.getContext('2d'); g.setTransform(res, 0, 0, res, -x0 * res, -y0 * res); g.font = this.font; g.fontStretch = this.stretch; g.letterSpacing = this.ls; g.textBaseline = 'alphabetic'; return [c, g]; };
    const [c, g] = mk();
    const rot = (h1(this.seed + v * 3) - 0.5) * 0.006;
    g.rotate(rot);
    if (this.outline) { g.lineJoin = 'round'; g.lineWidth = this.outline * 2; g.strokeStyle = '#000'; g.strokeText(this.text, 0, 0); }
    g.fillStyle = '#000'; g.fillText(this.text, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = pat(g, this.paper, this.seed + v); g.fillRect(x0, y0, w, h);
    g.globalCompositeOperation = 'source-atop';
    const lg = g.createLinearGradient(x0, y0, x0 + w, y0 + h);
    lg.addColorStop(0, 'rgba(255,250,238,0.12)'); lg.addColorStop(1, 'rgba(20,10,10,0.14)');
    g.fillStyle = lg; g.fillRect(x0, y0, w, h);
    g.globalCompositeOperation = 'source-over';
    const [sc, sg] = mk();
    sg.rotate(rot);
    if (this.outline) { sg.lineJoin = 'round'; sg.lineWidth = this.outline * 2; sg.strokeStyle = '#140c1c'; sg.strokeText(this.text, 0, 0); }
    sg.fillStyle = '#140c1c'; sg.fillText(this.text, 0, 0);
    const sc2 = document.createElement('canvas'); sc2.width = sc.width; sc2.height = sc.height;
    const s2 = sc2.getContext('2d'); s2.filter = `blur(${this.blur * res}px)`; s2.drawImage(sc, 0, 0);
    return { c, sh: sc2, x: x0, y: y0, w, h, adv: m.width };
  }
  get(v) { if (!this.cache[v]) this.cache[v] = this.build(v); return this.cache[v]; }
}
