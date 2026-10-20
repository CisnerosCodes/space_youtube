// ============================================================================================
// RISO ENGINE: every frame is a three-ink risograph print.
//   Each sheet has two plates canvases, S (solid: type, line art, flat ink) and T (tone: tints,
//   photos, 3D renders; screened into halftone dots by the press shader). Colours on both are
//   ENCODED transmissions: R = 1 - blue density, G = 1 - pink density, B = 1 - sunflower density.
//   Drawing with 'multiply' overprints inks; 'source-over' knocks out what is below.
//   The press shader screens T, adds S, misregisters each ink, overprints (multiply) on paper,
//   adds paper fibre, ink mottling, speckle and grain, and runs the transitions (ink roller passes
//   and paper feeds) between two sheets.
// Everything is a pure function of t: no timers, no Date, seeded noise only.
// ============================================================================================
'use strict';
const W = 1080, H = 1920, FPS = 30, DUR = 42.0;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const eIn = (t) => Math.pow(clamp(t), 3);
const eIO = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = (t, s = 1.8) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
const spr = (t, z = 0.42, f = 3.0) => (t <= 0 ? 0 : 1 - Math.exp(-z * TAU * f * t) * Math.cos(TAU * f * Math.sqrt(1 - z * z) * t));
const kick = (t, f = 9, d = 7) => (t < 0 ? 0 : Math.exp(-t * d) * Math.sin(t * TAU * f * 0.5) * 1.4);
// print "on twos": the press advances 15 times a second
const twos = (t) => Math.floor(t * 15 + 1e-6) / 15;
const fr = (f) => f / FPS;
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- inks
const INK = { blue: [0x3D, 0x55, 0x88], pink: [0xFF, 0x48, 0xB0], sun: [0xFF, 0xB8, 0x2E] };
const PAPER = [0xF4, 0xEE, 0xE1];
const enc = (b = 0, p = 0, s = 0) => `rgb(${Math.round(255 * (1 - b))},${Math.round(255 * (1 - p))},${Math.round(255 * (1 - s))})`;
const C = { B: enc(1, 0, 0), P: enc(0, 1, 0), Y: enc(0, 0, 1), BP: enc(1, 1, 0), PY: enc(0, 1, 1), BY: enc(1, 0, 1), K: enc(1, 1, 1), W: '#ffffff' };

function mkCanvas(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext; c.getContext = function (type, o) { return type === '2d' ? g.call(this, type, { willReadFrequently: true, ...(o || {}) }) : g.call(this, type, o); }; return c; }

class Sheet {
  constructor() {
    this.cS = mkCanvas(); this.cT = mkCanvas();
    this.S = this.cS.getContext('2d'); this.T = this.cT.getContext('2d');
  }
  clear() {
    for (const c of [this.S, this.T]) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.filter = 'none'; c.setLineDash([]); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    }
  }
}
let SH = null; // the sheet being printed

// ---- plate drawing. fn(ctx, colour) must draw with `colour` (fillStyle/strokeStyle are preset).
function knock(fn) {
  for (const c of [SH.S, SH.T]) { c.save(); c.globalCompositeOperation = 'source-over'; c.fillStyle = c.strokeStyle = '#fff'; fn(c, '#fff'); c.restore(); }
}
function solid(fn, col, o = {}) {
  if (o.knock) knock(o.knockFn || fn);
  const c = SH.S; c.save(); c.globalCompositeOperation = 'multiply'; if (o.alpha != null) c.globalAlpha = o.alpha;
  c.fillStyle = c.strokeStyle = col; fn(c, col); c.restore();
}
function tone(fn, col, o = {}) {
  if (o.knock) knock(o.knockFn || fn);
  const c = SH.T; c.save(); c.globalCompositeOperation = 'multiply'; if (o.alpha != null) c.globalAlpha = o.alpha;
  c.fillStyle = c.strokeStyle = col; fn(c, col); c.restore();
}
// same transform on both plates
function xf(fn) { SH.S.save(); SH.T.save(); try { fn(); } finally { SH.S.restore(); SH.T.restore(); } }
function tr(x, y) { SH.S.translate(x, y); SH.T.translate(x, y); }
function rot(a) { SH.S.rotate(a); SH.T.rotate(a); }
function scl(a, b = a) { SH.S.scale(a, b); SH.T.scale(a, b); }
function clipRect(x, y, w, h) { for (const c of [SH.S, SH.T]) { c.beginPath(); c.rect(x, y, w, h); c.clip(); } }
function clipPath(build) { for (const c of [SH.S, SH.T]) { c.beginPath(); build(c); c.clip(); } }

// fonts
const F = {
  anton: (px) => `400 ${px}px Anton`,
  gothic: (px) => `400 ${px}px "League Gothic"`,
  cond: (px, w = 800) => `${w} ${px}px "Barlow Condensed"`,
  mono: (px, w = 700) => `${w} ${px}px "Space Mono"`,
};
function setText(c, font, align = 'left', base = 'alphabetic', ls = 0) {
  c.font = font; c.textAlign = align; c.textBaseline = base; c.letterSpacing = ls + 'px';
}
// text on the solid plate. o: { font, align, base, ls, knock: px halo of paper, tone: density (screened) }
function text(s, x, y, col, o = {}) {
  const draw = (c) => {
    setText(c, o.font, o.align, o.base, o.ls || 0);
    c.fillText(s, x, y);
  };
  if (o.halo) {
    knock((c) => { setText(c, o.font, o.align, o.base, o.ls || 0); c.lineWidth = o.halo; c.lineJoin = 'round'; c.strokeText(s, x, y); c.fillText(s, x, y); });
  }
  (o.tone ? tone : solid)(draw, col, { knock: o.knock && !o.halo });
}
function measure(s, font, ls = 0) { const c = SH ? SH.S : MEAS; setText(c, font, 'left', 'alphabetic', ls); return c.measureText(s).width; }
const MEAS = mkCanvas(8, 8).getContext('2d');

// shapes
const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); };
const fillCirc = (x, y, r) => (c) => { circ(c, x, y, r); c.fill(); };
const ring = (x, y, r, w) => (c) => { c.lineWidth = w; circ(c, x, y, r); c.stroke(); };
const rect = (x, y, w, h) => (c) => { c.fillRect(x, y, w, h); };
function poly(c, pts, close = true) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (close) c.closePath(); }

// ---------------------------------------------------------------- photo separation (load time)
function separate(src, map, w, h) {
  w = w || src.width; h = h || src.height;
  const c = mkCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i] / 255, g = a[i + 1] / 255, b = a[i + 2] / 255;
    const m = map(r, g, b);
    a[i] = 255 * (1 - clamp(m[0])); a[i + 1] = 255 * (1 - clamp(m[1])); a[i + 2] = 255 * (1 - clamp(m[2]));
  }
  x.putImageData(d, 0, 0);
  c.sil = silhouette(c);
  return c;
}
function silhouette(src) {
  const c = mkCanvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
// the silhouette of a separated image filled with one encoded colour (cached), for screened shadows
function tinted(img, col) {
  img._tint = img._tint || {};
  if (!img._tint[col]) { const c = mkCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img.sil || img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); img._tint[col] = c; }
  return img._tint[col];
}
// draw a separated image on the tone plate. knock (default) replaces what is below; over: overprint.
function photo(img, x, y, w, h, o = {}) {
  const T = SH.T; T.save(); T.globalCompositeOperation = o.over ? 'multiply' : 'source-over';
  if (o.alpha != null) T.globalAlpha = o.alpha; T.drawImage(img, x, y, w, h); T.restore();
  if (o.knockS !== false && img.sil) { const S = SH.S; S.save(); if (o.alpha != null) S.globalAlpha = o.alpha; S.drawImage(img.sil, x, y, w, h); S.restore(); }
}
// a sub-rectangle of a separated image
function photoPart(img, sx, sy, sw, sh, x, y, w, h, o = {}) {
  const T = SH.T; T.save(); T.globalCompositeOperation = o.over ? 'multiply' : 'source-over';
  if (o.alpha != null) T.globalAlpha = o.alpha; T.drawImage(img, sx, sy, sw, sh, x, y, w, h); T.restore();
  if (o.knockS !== false && img.sil) { const S = SH.S; S.save(); S.drawImage(img.sil, sx, sy, sw, sh, x, y, w, h); S.restore(); }
}

// ---------------------------------------------------------------- 3D layer (Phobos model, Mars globe)
const VS_QUAD = `#version 300 es
in vec2 aQ; uniform vec4 uBox; uniform vec2 uRes; out vec2 vP;
void main(){ vec2 px = uBox.xy + aQ * uBox.zw; vP = px; gl_Position = vec4(px.x/uRes.x*2.0-1.0, 1.0-px.y/uRes.y*2.0, 0.0, 1.0); }`;
const FS_GLOBE = `#version 300 es
precision highp float;
in vec2 vP; out vec4 o;
uniform vec2 uC; uniform float uR; uniform mat3 uRot; uniform vec3 uL; uniform sampler2D uTex; uniform float uNight; uniform vec4 uK;
void main(){
  vec2 d = (vP - uC) / uR; d.y = -d.y;
  float r2 = dot(d, d); if (r2 > 1.0) discard;
  float aa = clamp((1.0 - sqrt(r2)) * uR * 1.2, 0.0, 1.0);
  vec3 n = vec3(d, sqrt(max(0.0, 1.0 - r2)));
  vec3 b = uRot * n;
  float lon = atan(b.x, b.z), lat = asin(clamp(b.y, -1.0, 1.0));
  vec2 uv = vec2(fract(lon / 6.2831853 + 0.5), 0.5 - lat / 3.14159265);
  vec3 c = texture(uTex, uv).rgb;
  float L = dot(c, vec3(0.30, 0.59, 0.11));
  float red = c.r - 0.5 * (c.g + c.b);
  L = clamp((L - 0.36) * 1.9 + 0.45, 0.0, 1.0);
  float lam = dot(n, normalize(uL));
  float lit = smoothstep(-0.12, 0.55, lam);
  float limb = pow(n.z, 0.35);
  float sun = clamp((0.05 + 1.25 * L) * lit * mix(0.75, 1.0, limb), 0.0, 1.0) * uK.z;
  float pink = clamp((0.16 + 1.9 * red + 0.25 * (1.0 - L)) * mix(0.35, 1.0, lit), 0.0, 1.0) * uK.y;
  float blue = clamp(max((0.50 - L) * 1.5 * lit, 0.0) + (1.0 - lit) * uNight + (1.0 - limb) * 0.25, 0.0, 1.0) * uK.x;
  o = vec4(vec3(1.0 - blue, 1.0 - pink, 1.0 - sun) * aa, aa);
}`;
const VS_MESH = `#version 300 es
in vec3 aP; in vec3 aN; in vec2 aUV;
uniform mat3 uRot; uniform vec2 uC; uniform float uS; uniform vec2 uRes; uniform vec2 uSquash;
out vec3 vN; out vec2 vUV; out vec3 vPos;
void main(){ vec3 p = uRot * aP * uS; vec2 px = vec2(uC.x + p.x, uC.y - p.y);
  gl_Position = vec4(px.x/uRes.x*2.0-1.0, 1.0-px.y/uRes.y*2.0, -p.z/20000.0, 1.0);
  vN = uRot * aN; vUV = aUV; vPos = p; }`;
const FS_MESH = `#version 300 es
precision highp float;
in vec3 vN; in vec2 vUV; in vec3 vPos; out vec4 o;
uniform sampler2D uTex; uniform vec3 uL; uniform float uAmb; uniform vec4 uK; uniform float uFlat;
void main(){
  float tex = texture(uTex, vUV).r;
  tex = clamp((tex - 0.42) * 1.9 + 0.5, 0.0, 1.0);
  vec3 n = normalize(vN);
  float lam = max(dot(n, normalize(uL)), 0.0);
  float rim = pow(1.0 - max(n.z, 0.0), 2.0);
  float sh = (0.2 + 0.8 * tex) * (uAmb + (1.0 - uAmb) * lam) * 1.02;
  sh = mix(sh, 0.55, uFlat);
  float blue = smoothstep(0.50, 0.08, sh);
  float pink = smoothstep(1.02, 0.28, sh) * 0.9;
  float sun = smoothstep(0.55, 0.95, sh) * 0.30 + rim * lam * 0.3;
  blue *= uK.x; pink *= uK.y; sun *= uK.z;
  o = vec4(1.0 - blue, 1.0 - pink, 1.0 - sun, 1.0);
}`;

function glProgram(gl, vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.slice(0, 200)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}
function glTex(gl, src, o = {}) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, o.mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const wrap = o.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, o.wrapS === 'repeat' ? gl.REPEAT : wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  if (o.mip) gl.generateMipmap(gl.TEXTURE_2D);
  return t;
}
// rotation matrices (column-major mat3 for GL)
function matMul(a, b) { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[i * 3 + k] * b[k * 3 + j]; r[i * 3 + j] = s; } return r; } // row-major
const rotX = (a) => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
const rotY = (a) => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
const rotZ = (a) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
const toGL = (m) => new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]); // row-major -> column-major
const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

class GL3D {
  constructor(assets) {
    this.cv = mkCanvas();
    const gl = this.gl = this.cv.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true, alpha: true, depth: true });
    this.globe = glProgram(gl, VS_QUAD, FS_GLOBE);
    this.mesh = glProgram(gl, VS_MESH, FS_MESH);
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    this.marsTex = glTex(gl, assets.marsTex, { mip: true, wrapS: 'repeat' });
    this.phobosTex = glTex(gl, assets.phobosTex, { mip: true });
    // Phobos geometry
    const g = assets.phobosGeo, dv = new DataView(g), nv = dv.getUint32(0, true), ni = dv.getUint32(4, true);
    let off = 8;
    const pos = new Float32Array(g, off, nv * 3); off += nv * 12;
    const nrm = new Float32Array(g, off, nv * 3); off += nv * 12;
    const uv = new Float32Array(g, off, nv * 2); off += nv * 8;
    const idx = new Uint16Array(g, off, ni);
    this.ni = ni;
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const buf = (data, loc, n) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
    const pm = this.mesh.p;
    buf(pos, gl.getAttribLocation(pm, 'aP'), 3); buf(nrm, gl.getAttribLocation(pm, 'aN'), 3); buf(uv, gl.getAttribLocation(pm, 'aUV'), 2);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.qvao = gl.createVertexArray(); gl.bindVertexArray(this.qvao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); const ql = gl.getAttribLocation(this.globe.p, 'aQ'); gl.enableVertexAttribArray(ql); gl.vertexAttribPointer(ql, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }
  // items: [{ kind: 'mars', x, y, r, spin, tilt, light:[x,y,z], night, k:[b,p,s] } | { kind: 'phobos', x, y, s (px per km), rot: rowmajor mat3, light, amb, k }]
  render(items) {
    const gl = this.gl;
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (const it of items) {
      if (it.kind === 'mars') {
        const P = this.globe; gl.useProgram(P.p); gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(this.qvao);
        const pad = 3; gl.uniform4f(P.u.uBox, it.x - it.r - pad, it.y - it.r - pad, 2 * it.r + 2 * pad, 2 * it.r + 2 * pad);
        gl.uniform2f(P.u.uRes, W, H); gl.uniform2f(P.u.uC, it.x, it.y); gl.uniform1f(P.u.uR, it.r);
        // globe orientation: tilt about view z, then spin about the body axis; shader needs view->body
        const M = matMul(rotZ(it.tilt || 0), matMul(rotX(it.lat || 0), rotY(it.spin || 0))); // body->view
        gl.uniformMatrix3fv(P.u.uRot, false, toGL(transpose(M)));
        const L = it.light || [-0.6, 0.35, 0.72]; gl.uniform3f(P.u.uL, L[0], L[1], L[2]);
        gl.uniform1f(P.u.uNight, it.night ?? 0.85);
        const k = it.k || [1, 1, 1]; gl.uniform4f(P.u.uK, k[0], k[1], k[2], 1);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.marsTex); gl.uniform1i(P.u.uTex, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else if (it.kind === 'phobos') {
        const P = this.mesh; gl.useProgram(P.p); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.bindVertexArray(this.vao);
        gl.uniformMatrix3fv(P.u.uRot, false, toGL(it.rot)); gl.uniform2f(P.u.uC, it.x, it.y); gl.uniform1f(P.u.uS, it.s); gl.uniform2f(P.u.uRes, W, H);
        const L = it.light || [-0.55, 0.45, 0.7]; gl.uniform3f(P.u.uL, L[0], L[1], L[2]);
        gl.uniform1f(P.u.uAmb, it.amb ?? 0.18); gl.uniform1f(P.u.uFlat, it.flat ?? 0);
        const k = it.k || [1, 1, 1]; gl.uniform4f(P.u.uK, k[0], k[1], k[2], 1);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.phobosTex); gl.uniform1i(P.u.uTex, 0);
        gl.drawElements(gl.TRIANGLES, this.ni, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.DEPTH_TEST);
      }
    }
    gl.bindVertexArray(null);
    return this.cv;
  }
}
// draw 3D items onto the tone plate (knock out below, and on the solid plate unless knockS:false)
let G3 = null;
function draw3D(items, o = {}) {
  const cv = G3.render(items);
  const T = SH.T; T.save(); T.globalCompositeOperation = o.over ? 'multiply' : 'source-over'; if (o.alpha != null) T.globalAlpha = o.alpha; T.drawImage(cv, 0, 0); T.restore();
  if (o.knockS !== false) { const S = SH.S; S.save(); S.filter = 'brightness(0) invert(1)'; S.drawImage(cv, 0, 0); S.restore(); }
}

// ---------------------------------------------------------------- the press (composite shader)
const FS_PRESS = `#version 300 es
precision highp float;
precision highp int;
#define TRANS __TRANS__
uniform sampler2D uSA, uTA, uSB, uTB, uNoise;
uniform vec2 uRes;
uniform vec2 uOff[3];
uniform mat2 uMR[3];
uniform mat2 uMS[3];
uniform vec3 uInk[3];
uniform vec3 uPaper;
uniform int uMode;
uniform vec3 uWipe;
uniform vec2 uSlide;
uniform vec2 uShake;
uniform vec4 uSeed;
uniform float uGrain;
uniform float uWob;
out vec4 o;
// piecewise-quadratic cosine of one screen period (cheap, C1)
float pcos(float x){ float a = abs(fract(x) - 0.5); return a > 0.25 ? 1.0 - 8.0 * (0.5 - a) * (0.5 - a) : 8.0 * a * a - 1.0; }
vec2 plates(bool b, vec2 q, int i){
  ivec2 ip = clamp(ivec2(floor(q)), ivec2(0), ivec2(uRes) - 1);
#if TRANS
  if (b) return vec2(texelFetch(uSB, ip, 0)[i], texelFetch(uTB, ip, 0)[i]);
#endif
  return vec2(texelFetch(uSA, ip, 0)[i], texelFetch(uTA, ip, 0)[i]);
}
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) - uShake;
  vec3 col = vec3(1.0);
  bool inB = false; vec2 bp = p - uSlide;
#if TRANS
  if (uMode == 2) inB = bp.x >= 0.0 && bp.y >= 0.0 && bp.x < uRes.x && bp.y < uRes.y;
#endif
  vec2 sp = inB ? bp : p;
  float shadow = 0.0;
#if TRANS
  if (uMode == 2 && !inB) {
    vec2 e = uSlide; float dist = 1e5;
    if (e.y > 0.5) dist = e.y - p.y; else if (e.y < -0.5) dist = p.y - (uRes.y + e.y);
    if (e.x > 0.5) dist = min(dist, e.x - p.x); else if (e.x < -0.5) dist = min(dist, p.x - (uRes.x + e.x));
    if (dist >= 0.0) shadow = (1.0 - smoothstep(0.0, 46.0, dist)) * 0.55;
  }
#endif
  vec4 nw = texture(uNoise, sp / 140.0) - 0.5;
  vec4 nm = texture(uNoise, sp / 1100.0 + uSeed.zw);
  vec2 c0 = uRes * 0.5;
  ivec2 gp = ivec2(mod(floor(sp) + floor(uSeed.xy * 512.0), 512.0));
  vec2 wobs[3]; wobs[0] = nw.ba; wobs[1] = vec2(nw.a, -nw.b); wobs[2] = vec2(-nw.b, -nw.a);
  float motts[3]; motts[0] = nm.b; motts[1] = nm.a; motts[2] = nm.r;
  for (int i = 0; i < 3; i++) {
    bool useB = inB;
    float bead = 0.0;
#if TRANS
    if (uMode == 1) { useB = p.y < uWipe[i]; bead = (1.0 - smoothstep(0.0, 5.0, abs(uWipe[i] - p.y - 3.0))); }
#endif
    vec2 q = uMR[i] * (sp - c0) + c0 + uOff[i] + wobs[i] * uWob;
    vec2 st = 1.0 - plates(useB, q, i);
    float s = st.x, d = st.y;
    vec2 hp = uMS[i] * sp;
    float spot = 0.5 - 0.25 * (pcos(hp.x) + pcos(hp.y));
    float aa = 0.085;
    d = clamp(d * 1.04, 0.0, 1.0);
    float h = d < 0.004 ? 0.0 : smoothstep(spot - aa, spot + aa, d);
    float cov = 1.0 - (1.0 - s) * (1.0 - h);
    cov = max(cov, bead * 0.95);
    float g = texelFetch(uNoise, (gp + ivec2(97 * i, 61 * i)) % 512, 0).g;
    cov *= mix(0.80, 1.0, smoothstep(0.15, 0.85, motts[i]));
    cov *= g > 0.985 ? 0.35 : (g > 0.96 ? 0.82 : 1.0);
    col *= mix(vec3(1.0), uInk[i], clamp(cov, 0.0, 1.0));
  }
  float fib = texture(uNoise, sp / 900.0).r;
  float fine = texelFetch(uNoise, ivec2(mod(floor(sp) + vec2(211.0, 87.0), 512.0)), 0).g;
  vec3 paper = uPaper * (0.955 + 0.06 * fib) + (fine - 0.5) * uGrain;
  o = vec4(paper * col * (1.0 - shadow * 0.5), 1.0);
}`;

class Press {
  constructor(canvas) {
    const gl = this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
    this.P0 = glProgram(gl, VS_QUAD, FS_PRESS.replace('__TRANS__', '0')); this.P1 = glProgram(gl, VS_QUAD, FS_PRESS.replace('__TRANS__', '1')); this.P = this.P0;
    const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const l = gl.getAttribLocation(this.P.p, 'aQ'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    this.tex = {};
    for (const k of ['SA', 'TA', 'SB', 'TB']) {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      this.tex[k] = t;
    }
    this.noise = glTex(gl, makeNoise(), { repeat: true });
  }
  upload(key, canvas) { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tex[key]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas); }
  draw(u) {
    const gl = this.gl, P = u.mode ? this.P1 : this.P0; gl.viewport(0, 0, W, H); gl.useProgram(P.p); gl.bindVertexArray(this.vao);
    const names = ['SA', 'TA', 'SB', 'TB'];
    names.forEach((k, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, this.tex[k]); gl.uniform1i(P.u['u' + k], i); });
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, this.noise); gl.uniform1i(P.u.uNoise, 4);
    gl.uniform4f(P.u.uBox, 0, 0, W, H); gl.uniform2f(P.u.uRes, W, H);
    gl.uniform2fv(P.u.uOff, new Float32Array(u.off.flat()));
    const m2 = (a, k = 1) => [Math.cos(a) * k, Math.sin(a) * k, -Math.sin(a) * k, Math.cos(a) * k]; // column-major mat2
    gl.uniformMatrix2fv(P.u.uMR, false, new Float32Array(u.rot.flatMap((a) => m2(a))));
    const cell = u.cell ?? 8.5;
    gl.uniformMatrix2fv(P.u.uMS, false, new Float32Array([0.2618, 1.309, 0.7854].flatMap((a) => m2(a, 1 / cell))));
    gl.uniform3fv(P.u.uInk, new Float32Array([...INK.blue, ...INK.pink, ...INK.sun].map((v) => v / 255)));
    gl.uniform3f(P.u.uPaper, PAPER[0] / 255, PAPER[1] / 255, PAPER[2] / 255);
    gl.uniform1i(P.u.uMode, u.mode || 0);
    gl.uniform3f(P.u.uWipe, ...(u.wipe || [-1e4, -1e4, -1e4]));
    gl.uniform2f(P.u.uSlide, ...(u.slide || [0, 0]));
    gl.uniform2f(P.u.uShake, ...(u.shake || [0, 0]));
    gl.uniform4f(P.u.uSeed, ...(u.seed || [0, 0, 0, 0]));
    gl.uniform1f(P.u.uGrain, u.grain ?? 0.05);
    gl.uniform1f(P.u.uWob, u.wob ?? 1.4);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// seeded, tileable noise: R paper fibre, G white grain, B ink mottling, A edge wobble
function makeNoise(N = 512, seed = 20261020) {
  const rnd = mulberry32(seed);
  const lat = (P) => { const g = new Float32Array(P * P); for (let i = 0; i < P * P; i++) g[i] = rnd(); return { P, g }; };
  const vn = (L, x, y) => {
    const P = L.P, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const i0 = ((xi % P) + P) % P, j0 = ((yi % P) + P) % P, i1 = (i0 + 1) % P, j1 = (j0 + 1) % P, g = L.g;
    return lerp(lerp(g[j0 * P + i0], g[j0 * P + i1], sx), lerp(g[j1 * P + i0], g[j1 * P + i1], sx), sy);
  };
  const fib = [lat(8), lat(32), lat(64), lat(128)], mot = [lat(4), lat(8), lat(16)], wobA = [lat(16), lat(32)], wobB = [lat(16), lat(32)];
  const fbm = (Ls, u, v, amps) => { let s = 0, a = 0; Ls.forEach((L, k) => { s += amps[k] * vn(L, u * L.P, v * L.P); a += amps[k]; }); return s / a; };
  const c = mkCanvas(N, N), x = c.getContext('2d'), d = x.createImageData(N, N), a = d.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N, k = (j * N + i) * 4;
    a[k] = 255 * clamp(fbm(fib, u, v, [0.35, 0.25, 0.25, 0.15]));
    a[k + 1] = 255 * rnd();
    a[k + 2] = 255 * clamp((fbm(mot, u, v, [0.5, 0.3, 0.2]) - 0.5) * 1.8 + 0.5);
    a[k + 3] = 255 * clamp((fbm(wobA, u, v, [0.6, 0.4]) - 0.5) * 2.2 + 0.5);
    // keep alpha from premultiplying away colour: store wobble B in alpha, wobble A in blue is mottling... (A wobble used with B)
  }
  // ensure no premultiplication: alpha is data. Put into ImageData then upload as-is.
  x.putImageData(d, 0, 0);
  return d; // ImageData uploads without premultiplication
}
