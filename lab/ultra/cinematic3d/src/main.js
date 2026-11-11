// Downlink Cat, ultra experiment, entry "cinematic3d": MMX heist as a physically lit three.js short.
// Pure function of t: window.renderAt(t) sets every object, camera, post value and overlay from t alone.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const W = 1080, H = 1920, FPS = 30;
const WORDS = /*CAPTIONS*/[];

// ---------------------------------------------------------------- math
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const ss = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
const eIO = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eIO2 = (t) => { t = clamp(t); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const eIn = (t) => Math.pow(clamp(t), 3);
function bez(x1, y1, x2, y2) {
  return (x) => {
    x = clamp(x); let t = x;
    for (let i = 0; i < 10; i++) {
      const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x;
      const dx = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
      if (Math.abs(dx) < 1e-6) break; t = clamp(t - cx / dx);
    }
    return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  };
}
const ENTER = bez(0.16, 1, 0.3, 1), MOVE = bez(0.76, 0, 0.24, 1), EXIT = bez(0.7, 0, 0.84, 0);
function spring(t, zeta = 0.7, f = 4) {
  if (t <= 0) return 0; const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UPY = V(0, 1, 0);
const wob = (x, s = 0) => Math.sin(x * 1.13 + s) * 0.5 + Math.sin(x * 2.71 + s * 1.7) * 0.3 + Math.sin(x * 5.37 + s * 0.3) * 0.2;
const logLerp = (a, b, t) => Math.exp(lerp(Math.log(a), Math.log(b), t));

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.autoClear = false;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(40, W / H, 1, 1e6);
const camB = new THREE.PerspectiveCamera(40, W / H, 0.01, 1000);
const camC = new THREE.PerspectiveCamera(40, W / H, 0.01, 1000);

const sun = new THREE.DirectionalLight(0xfff3e6, 3.2);
const fill = new THREE.DirectionalLight(0xff7a45, 0.0);
const amb = new THREE.AmbientLight(0xffffff, 0.0);
const pt = new THREE.PointLight(0xffa860, 0, 0, 2);
scene.add(sun, sun.target, fill, fill.target, amb, pt);
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.1; sun.shadow.camera.far = 200;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
let SUN = V(1, 0, 0);
function setSun(dir, I = 3.2, center = V(), box = 18, depth = 120) {
  SUN = dir.clone().normalize();
  sun.intensity = I;
  sun.target.position.copy(center);
  sun.position.copy(center).addScaledVector(SUN, depth * 0.5);
  const sc = sun.shadow.camera; sc.left = -box; sc.right = box; sc.top = box; sc.bottom = -box; sc.near = 0.01; sc.far = depth; sc.updateProjectionMatrix();
  sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
}
function setFill(dir, I) { fill.intensity = I; fill.target.position.set(0, 0, 0); fill.position.copy(dir).normalize().multiplyScalar(10); fill.target.updateMatrixWorld(); fill.updateMatrixWorld(); }

// ---------------------------------------------------------------- render targets and post
const HF = THREE.HalfFloatType;
function mkRT(w, h, o = {}) {
  const r = new THREE.WebGLRenderTarget(w, h, { type: HF, depthBuffer: !!o.depth, samples: o.samples || 0 });
  r.texture.minFilter = r.texture.magFilter = THREE.LinearFilter; r.texture.generateMipmaps = false; return r;
}
const LRT = [mkRT(W, H, { depth: true, samples: 4 }), mkRT(W, H, { depth: true, samples: 4 }), mkRT(W, H, { depth: true, samples: 4 })];
const COMP = mkRT(W, H);
const HB = [mkRT(W / 2, H / 2), mkRT(W / 2, H / 2)];
const QB = [mkRT(W / 4, H / 4), mkRT(W / 4, H / 4)];
const LBH = [mkRT(W / 2, H / 2), mkRT(W / 2, H / 2), mkRT(W / 2, H / 2)];
const LBQ = [mkRT(W / 4, H / 4), mkRT(W / 4, H / 4), mkRT(W / 4, H / 4)];
const B1 = [mkRT(W / 4, H / 4), mkRT(W / 4, H / 4)];
const B2 = [mkRT(W / 8, H / 8), mkRT(W / 8, H / 8)];
const B3 = [mkRT(W / 16, H / 16), mkRT(W / 16, H / 16)];
const ST = [mkRT(W / 8, H / 8), mkRT(W / 8, H / 8)];
const fsq = new FullScreenQuad(null);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const sm = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
const matDown = sm(`uniform sampler2D src; uniform vec2 tx; uniform float th, knee; uniform int bright; varying vec2 vUv;
void main(){ vec4 c = texture2D(src, vUv + tx*vec2(-.5,-.5)) + texture2D(src, vUv + tx*vec2(.5,-.5)) + texture2D(src, vUv + tx*vec2(-.5,.5)) + texture2D(src, vUv + tx*vec2(.5,.5)); c *= .25;
 if (bright == 1) { float br = max(c.r, max(c.g, c.b)); float s = clamp(br - th + knee, 0., 2.*knee); s = s*s/(4.*knee + 1e-4); float w = max(s, br - th)/max(br, 1e-4); c.rgb *= w; c.a = 0.; }
 gl_FragColor = c; }`, { src: { value: null }, tx: { value: new THREE.Vector2() }, th: { value: 1 }, knee: { value: 0.5 }, bright: { value: 0 } });
const matBlur = sm(`uniform sampler2D src; uniform vec2 dir; varying vec2 vUv;
void main(){ vec4 s = vec4(0.); float ws = 0.; for (int i = -6; i <= 6; i++) { float x = float(i); float w = exp(-x*x/8.); s += texture2D(src, vUv + dir*x)*w; ws += w; } gl_FragColor = s/ws; }`, { src: { value: null }, dir: { value: new THREE.Vector2() } });
const matComp = sm(`uniform sampler2D s0, b0, s1, b1, s2, b2; uniform float m0, m1, m2, u1, u2; varying vec2 vUv;
vec4 L(sampler2D s, sampler2D b, float m){ vec4 a = texture2D(s, vUv); if (m <= 0.) return a; return mix(a, texture2D(b, vUv), m); }
void main(){ vec3 c = L(s0, b0, m0).rgb; if (u1 > .5) { vec4 x = L(s1, b1, m1); c = x.rgb + c*(1. - clamp(x.a, 0., 1.)); }
 if (u2 > .5) { vec4 x = L(s2, b2, m2); c = x.rgb + c*(1. - clamp(x.a, 0., 1.)); } gl_FragColor = vec4(c, 1.); }`,
  { s0: { value: null }, b0: { value: null }, s1: { value: null }, b1: { value: null }, s2: { value: null }, b2: { value: null }, m0: { value: 0 }, m1: { value: 0 }, m2: { value: 0 }, u1: { value: 0 }, u2: { value: 0 } });
const matFinal = sm(`uniform sampler2D comp, b1, b2, b3, st; uniform float exposure, bloomK, streakK, vign, grain, ca, frame, sat, fadeK; uniform vec2 mb; uniform vec3 tint, lift, streakTint; varying vec2 vUv;
vec3 RRT(vec3 v){ vec3 a = v*(v + 0.0245786) - 0.000090537; vec3 b = v*(0.983729*v + 0.4329510) + 0.238081; return a/b; }
vec3 aces(vec3 c){ const mat3 I = mat3(vec3(0.59719,0.07600,0.02840), vec3(0.35458,0.90834,0.13383), vec3(0.04823,0.01566,0.83777));
 const mat3 O = mat3(vec3(1.60475,-0.10208,-0.00327), vec3(-0.53108,1.10813,-0.07276), vec3(-0.07367,-0.00605,1.07602)); c = I*(c/0.6); c = RRT(c); return clamp(O*c, 0., 1.); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
vec3 srgb(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - .055, step(.0031308, c)); }
void main(){ vec2 uv = vUv; vec3 c;
 if (length(mb) > 0.0004) { c = vec3(0.); for (int i = 0; i < 16; i++) { float k = float(i)/15. - .5; c += texture2D(comp, uv + mb*k).rgb; } c /= 16.; }
 else { vec2 d = (uv - .5)*ca; c = vec3(texture2D(comp, uv - d).r, texture2D(comp, uv).g, texture2D(comp, uv + d).b); }
 vec3 bl = texture2D(b1, uv).rgb*.55 + texture2D(b2, uv).rgb*.4 + texture2D(b3, uv).rgb*.35;
 c += bl*bloomK + texture2D(st, uv).rgb*streakK*streakTint;
 c *= exposure*tint;
 c = aces(c);
 float l = dot(c, vec3(.2126,.7152,.0722)); c = mix(vec3(l), c, sat);
 c = c + lift*(1. - c);
 vec2 q = uv - .5; q.x *= 1.0; float v = 1. - vign*smoothstep(.35, .95, length(q*vec2(1.25, .9))); c *= v;
 c = srgb(c);
 float g = h12(uv*vec2(1080., 1920.) + frame*17.13) + h12(uv*vec2(1080.,1920.)*1.37 + frame*3.7) - 1.;
 c += g*grain*(0.6 + 0.4*(1. - l));
 c *= 1. - fadeK;
 gl_FragColor = vec4(c, 1.); }`,
  { comp: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, st: { value: null }, exposure: { value: 1 }, bloomK: { value: 0.6 }, streakK: { value: 0.0 },
    vign: { value: 0.35 }, grain: { value: 0.03 }, ca: { value: 0.0015 }, frame: { value: 0 }, sat: { value: 1 }, fadeK: { value: 0 }, mb: { value: new THREE.Vector2() },
    tint: { value: new THREE.Vector3(1, 1, 1) }, lift: { value: new THREE.Vector3(0, 0, 0) }, streakTint: { value: new THREE.Vector3(1, 0.85, 0.7) } });
function pass(mat, target) { fsq.material = mat; renderer.setRenderTarget(target); fsq.render(renderer); }
function down(src, dst, bright = 0, th = 1, knee = 0.5) {
  matDown.uniforms.src.value = src.texture; matDown.uniforms.tx.value.set(1 / src.width, 1 / src.height);
  matDown.uniforms.bright.value = bright; matDown.uniforms.th.value = th; matDown.uniforms.knee.value = knee; pass(matDown, dst);
}
function blur2(rtA, rtB, out, sigmaPx) { // separable gaussian, sigma in pixels of rtA's resolution
  const st = Math.max(0.35, sigmaPx / 2);
  matBlur.uniforms.src.value = rtA.texture; matBlur.uniforms.dir.value.set(st / rtA.width, 0); pass(matBlur, rtB);
  matBlur.uniforms.src.value = rtB.texture; matBlur.uniforms.dir.value.set(0, st / rtA.height); pass(matBlur, out);
}
function layerBlur(i, r) { // r: blur radius in full-res pixels; returns texture
  if (r <= 6) { down(LRT[i], HB[0]); blur2(HB[0], HB[1], LBH[i], r / 2); return LBH[i].texture; }
  down(LRT[i], HB[0]); down(HB[0], QB[0]); blur2(QB[0], QB[1], LBQ[i], r / 4); return LBQ[i].texture;
}

// ---------------------------------------------------------------- assets
function bytes(id) { const s = document.getElementById(id).textContent.trim(); const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
async function texFrom(id, type) {
  const bmp = await createImageBitmap(new Blob([bytes(id)], { type }), { imageOrientation: 'flipY' });
  const t = new THREE.Texture(bmp); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}

// ---------------------------------------------------------------- materials and builders
const REG = [];
const reg = (o) => { REG.push(o); scene.add(o); return o; };
const gradMap = (() => { const d = new Uint8Array([58, 58, 58, 255, 150, 150, 150, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: gradMap, ...o });
const INK = 0x1a1510, AMB = 0xf5b83d;
const MT = { white: toon(0xe6e0d4), grey: toon(0x8f897f), dark: toon(0x1c2230), amber: toon(0xf5b83d), black: toon(0x2b2723), shield: toon(0x5a4030) };
const edgeMats = new Map();
function ink(mesh, col = INK, ang = 30) { if (!edgeMats.has(col)) edgeMats.set(col, new THREE.LineBasicMaterial({ color: col })); mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, ang), edgeMats.get(col))); return mesh; }
function M(geo, mat, pos, rot, edge = INK) { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (edge !== null) ink(m, edge); m.castShadow = true; m.receiveShadow = false; return m; }
function strut(a, b, r, mat) { const d = b.clone().sub(a); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), mat); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UPY, d.normalize()); m.castShadow = true; ink(m); return m; }

function buildMMX() {
  const g = new THREE.Group();
  g.add(M(new THREE.BoxGeometry(1.2, 0.8, 1.2), MT.white, [0, 0, 0]));
  g.add(M(new THREE.CylinderGeometry(0.66, 0.66, 0.46, 8), MT.white, [0, -0.63, 0], [0, Math.PI / 8, 0]));
  g.add(M(new THREE.BoxGeometry(0.92, 0.5, 0.92), MT.white, [0, 0.65, 0]));
  g.add(M(new THREE.BoxGeometry(1.225, 0.07, 1.225), MT.amber, [0, 0.33, 0], null, null));
  const capProf = [V(0, 0), V(0.3, 0.0), V(0.31, 0.05), V(0.2, 0.17), V(0.08, 0.23), V(0, 0.24)].map((p) => new THREE.Vector2(p.x, p.y));
  const capsule = M(new THREE.LatheGeometry(capProf, 28), MT.grey, [0, 0.9, 0]); g.add(capsule);
  // high gain antenna on a short mast
  const dishProf = []; for (let i = 0; i <= 10; i++) { const r = 0.42 * i / 10; dishProf.push(new THREE.Vector2(r, r * r * 0.9)); }
  const hga = new THREE.Group(); hga.position.set(-0.35, 0.95, -0.35);
  hga.add(strut(V(0, -0.1, 0), V(0, 0.25, 0), 0.03, MT.grey));
  const dish = M(new THREE.LatheGeometry(dishProf, 32), new THREE.MeshToonMaterial({ color: 0xece6da, gradientMap: gradMap, side: THREE.DoubleSide }), [0, 0.25, 0], [-0.5, 0, 0.35]);
  hga.add(dish); g.add(hga);
  // solar wings (shown as drawn, no deployment move)
  for (const s of [-1, 1]) {
    g.add(strut(V(s * 0.6, 0.05, 0), V(s * 0.95, 0.05, 0), 0.03, MT.grey));
    for (let k = 0; k < 2; k++) {
      const x = s * (0.95 + 0.52 + k * 1.06);
      const p = M(new THREE.BoxGeometry(1.0, 0.035, 0.82), MT.dark, [x, 0.05, 0], null, AMB);
      g.add(p);
      for (let j = 1; j < 4; j++) g.add(M(new THREE.BoxGeometry(0.006, 0.037, 0.8), MT.amber, [x - 0.5 + j * 0.25, 0.05, 0], null, null));
    }
  }
  // landing legs
  const feet = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const top = V(sx * 0.55, -0.42, sz * 0.55), foot = V(sx * 1.02, -1.28, sz * 1.02);
    g.add(strut(top, foot, 0.045, MT.grey));
    g.add(strut(V(sx * 0.62, -0.82, sz * 0.62), V(sx * 0.9, -1.1, sz * 0.9), 0.03, MT.grey));
    g.add(M(new THREE.CylinderGeometry(0.15, 0.17, 0.05, 20), MT.grey, [foot.x, foot.y - 0.02, foot.z]));
    feet.push(V(foot.x, foot.y - 0.045, foot.z));
  }
  // gas sampler box on one foot (leg 0)
  const pS = M(new THREE.BoxGeometry(0.16, 0.16, 0.16), MT.amber, [feet[0].x - 0.12, feet[0].y + 0.14, feet[0].z - 0.12]);
  g.add(pS);
  // engine nozzle
  g.add(M(new THREE.CylinderGeometry(0.11, 0.26, 0.36, 24, 1, true), new THREE.MeshToonMaterial({ color: 0x3b3631, gradientMap: gradMap, side: THREE.DoubleSide }), [0, -1.04, 0]));
  // coring arm: shoulder at the front face
  const arm = new THREE.Group(); arm.position.set(0.25, -0.3, 0.62);
  const l1 = 0.75, l2 = 0.62;
  arm.add(M(new THREE.SphereGeometry(0.07, 12, 8), MT.grey, [0, 0, 0]));
  arm.add(M(new THREE.CylinderGeometry(0.04, 0.04, l1, 10), MT.white, [0, -l1 / 2, 0]));
  const elbow = new THREE.Group(); elbow.position.set(0, -l1, 0); arm.add(elbow);
  elbow.add(M(new THREE.SphereGeometry(0.06, 12, 8), MT.grey, [0, 0, 0]));
  elbow.add(M(new THREE.CylinderGeometry(0.035, 0.035, l2, 10), MT.white, [0, -l2 / 2, 0]));
  const corer = new THREE.Group(); corer.position.set(0, -l2, 0); elbow.add(corer);
  corer.add(M(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 16), MT.amber, [0, -0.08, 0]));
  corer.add(M(new THREE.CylinderGeometry(0.05, 0.035, 0.14, 16), MT.grey, [0, -0.25, 0]));
  g.add(arm);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, arm, elbow, corer, l1, l2, feet, capsule, pS, nozzleY: -1.22 };
}
function solveArm(mm, target) { // 2-bone IK in the arm's YZ plane, target in MMX local coords
  const S = mm.arm.position; const dy = target.y - S.y, dz = target.z - S.z;
  let dist = Math.hypot(dy, dz); dist = clamp(dist, 0.2, mm.l1 + mm.l2 - 0.001);
  const phi = Math.atan2(-dz, -dy);
  const a = Math.acos(clamp((mm.l1 * mm.l1 + dist * dist - mm.l2 * mm.l2) / (2 * mm.l1 * dist), -1, 1));
  const b = Math.acos(clamp((mm.l1 * mm.l1 + mm.l2 * mm.l2 - dist * dist) / (2 * mm.l1 * mm.l2), -1, 1));
  return [phi + a, -(Math.PI - b)];
}
function buildIdefix() {
  const g = new THREE.Group();
  g.add(M(new THREE.BoxGeometry(1.0, 0.4, 0.74), MT.white, [0, 0.42, 0]));
  g.add(M(new THREE.BoxGeometry(1.06, 0.045, 0.8), MT.dark, [0, 0.64, 0], null, AMB));
  g.add(M(new THREE.BoxGeometry(1.01, 0.06, 0.75), MT.amber, [0, 0.27, 0], null, null));
  for (const [x, z] of [[0.4, 0.42], [-0.4, 0.42], [0.4, -0.42], [-0.4, -0.42]]) {
    g.add(M(new THREE.CylinderGeometry(0.17, 0.17, 0.11, 20), MT.black, [x, 0.17, z], [Math.PI / 2, 0, 0]));
    g.add(strut(V(x * 0.85, 0.35, z * 0.75), V(x, 0.17, z), 0.025, MT.grey));
  }
  g.add(strut(V(0.32, 0.66, 0.2), V(0.32, 0.92, 0.2), 0.025, MT.grey));
  g.add(M(new THREE.BoxGeometry(0.18, 0.08, 0.1), MT.grey, [0.32, 0.95, 0.24]));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function buildH3() {
  const g = new THREE.Group();
  g.add(M(new THREE.CylinderGeometry(0.26, 0.26, 4.2, 32), MT.white, [0, 2.45, 0]));
  g.add(M(new THREE.CylinderGeometry(0.265, 0.265, 0.12, 32), MT.amber, [0, 4.5, 0], null, null));
  g.add(M(new THREE.CylinderGeometry(0.26, 0.26, 0.9, 32), MT.white, [0, 5.0, 0]));
  const ogive = []; for (let i = 0; i <= 14; i++) { const u = i / 14; ogive.push(new THREE.Vector2(0.31 * Math.sqrt(1 - u * u * 0.98), u * 1.7)); }
  g.add(M(new THREE.CylinderGeometry(0.31, 0.26, 0.12, 32), MT.white, [0, 5.51, 0]));
  g.add(M(new THREE.LatheGeometry(ogive, 32), MT.white, [0, 5.57, 0]));
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 0.4, z = Math.sin(a) * 0.4;
    g.add(M(new THREE.CylinderGeometry(0.12, 0.12, 1.7, 20), MT.white, [x, 1.2, z]));
    g.add(M(new THREE.ConeGeometry(0.12, 0.36, 20), MT.white, [x, 2.23, z]));
    g.add(M(new THREE.CylinderGeometry(0.09, 0.13, 0.2, 16, 1, true), MT.black, [x, 0.27, z]));
  }
  for (const x of [-0.11, 0.11]) g.add(M(new THREE.CylinderGeometry(0.07, 0.13, 0.25, 16, 1, true), MT.black, [x, 0.25, 0]));
  return g;
}
function buildCapsule() {
  const prof = [[0, 0], [0.22, 0.015], [0.42, 0.06], [0.5, 0.12], [0.47, 0.16], [0.3, 0.38], [0.14, 0.46], [0, 0.47]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.Group();
  g.add(M(new THREE.LatheGeometry(prof, 32), MT.grey, [0, 0, 0]));
  g.add(M(new THREE.CylinderGeometry(0.43, 0.5, 0.06, 32), MT.shield, [0, 0.05, 0], null, null));
  return g;
}
function buildSat() {
  const g = new THREE.Group();
  g.add(M(new THREE.BoxGeometry(0.5, 0.5, 0.7), MT.white, [0, 0, 0]));
  for (const s of [-1, 1]) g.add(M(new THREE.BoxGeometry(0.9, 0.03, 0.5), MT.dark, [s * 0.72, 0, 0], null, AMB));
  return g;
}

// atmosphere shell (Mars haze, Earth illustration rim)
function atmoMat(colDay, colTerm, I, thick) {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: { value: V(1, 0, 0) }, uCam: { value: V() }, uC: { value: V() }, uR: { value: 1 }, uRs: { value: 1 }, uI: { value: I }, cD: { value: new THREE.Color(colDay) }, cT: { value: new THREE.Color(colTerm) }, thick: { value: thick } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 uSun, uCam, uC, cD, cT; uniform float uR, uRs, uI, thick; varying vec3 vW;
    void main(){ vec3 d = normalize(vW - uCam); vec3 oc = uCam - uC; float tca = -dot(oc, d); float b = sqrt(max(dot(oc,oc) - tca*tca, 0.));
      float h = (b - uR)/(uRs - uR); float g = h > 0. ? pow(max(1. - h, 0.), 4.) : exp(h*(uRs - uR)/(uR*thick))*0.75;
      vec3 n = normalize(uCam + d*tca - uC); float mu = dot(n, uSun); float lit = smoothstep(-0.28, 0.35, mu);
      vec3 col = mix(cT, cD, smoothstep(-0.05, 0.55, mu));
      gl_FragColor = vec4(col*g*lit*uI, 0.); }`,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
}
const addBlend = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };
const preBlend = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };

// particle system: positions written per frame from pure functions of t
class PSys {
  constructor(n, additive = false) {
    this.n = n; const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n); this.seed = new Float32Array(n);
    for (let i = 0; i < n; i++) this.seed[i] = (i * 0.618034) % 1;
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1)); g.setAttribute('seed', new THREE.BufferAttribute(this.seed, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { soft: { value: 1.0 } },
      vertexShader: `attribute vec3 color; attribute float size, alpha, seed; varying vec3 vC; varying float vA, vS;
        void main(){ vec4 mv = modelViewMatrix*vec4(position, 1.); gl_Position = projectionMatrix*mv; gl_PointSize = clamp(size*projectionMatrix[1][1]*960./max(-mv.z, 1e-4), 1., 1000.); vC = color; vA = alpha; vS = seed; }`,
      fragmentShader: `uniform float soft; varying vec3 vC; varying float vA, vS; void main(){ vec2 p = gl_PointCoord*2. - 1.; float an = atan(p.y, p.x);
        float r = length(p)*(1. + soft*0.14*(sin(an*3. + vS*40.) + 0.6*sin(an*5. - vS*23.)));
        float a = 1. - smoothstep(0.15, 1., r); a *= vA; if (a < 0.003) discard; gl_FragColor = vec4(vC*a, ${additive ? '0.' : 'a'}); }`,
      ...(additive ? addBlend : preBlend),
    });
    this.mesh = new THREE.Points(g, mat); this.mesh.frustumCulled = false; this.k = 0;
  }
  begin() { this.k = 0; }
  add(x, y, z, r, g, b, s, a) { if (this.k >= this.n) return; const i = this.k++; this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b; this.size[i] = s; this.alpha[i] = a; }
  end() { const g = this.mesh.geometry; g.setDrawRange(0, this.k); for (const k of ['position', 'color', 'size', 'alpha']) g.attributes[k].needsUpdate = true; }
}

// fat line helper (orbits)
function fatLine(pts, color, width, I = 2.2) {
  const g = new LineGeometry(); const arr = []; for (const p of pts) arr.push(p.x, p.y, p.z); g.setPositions(arr);
  const m = new LineMaterial({ color: new THREE.Color(color).multiplyScalar(I), linewidth: width, worldUnits: false, transparent: true, depthWrite: false, opacity: 1 });
  m.resolution.set(W, H);
  const l = new Line2(g, m); l.computeLineDistances(); l.frustumCulled = false; l.userData.nseg = pts.length - 1; return l;
}
function drawOn(line, f) { line.geometry.instanceCount = Math.max(0, Math.floor(line.userData.nseg * clamp(f))); }

// ---------------------------------------------------------------- world
const RM = 3389.5, RP_ORB = 9376, RE = 6371;
const PHI_P = -0.33;
const PPOS = V(Math.sin(PHI_P) * RP_ORB, 0, Math.cos(PHI_P) * RP_ORB);
const POUT = PPOS.clone().normalize();
const PRIGHT = V().crossVectors(UPY, POUT).normalize();
const DPOS = V(Math.sin(0.55) * 23460, 900, Math.cos(0.55) * 23460);
let mars, marsAtmo, phobos, phobosMesh, deimos, stars, sunDisc, mmx, idefix, h3, capsule, earth, earthAtmo, sats = [], qso, hookOrbit, dust, smoke, plume, mmxPlume, capFire, capTrail, ground, tower, skyDome, gasJet, satOrbit, mmxB, satsGroup;

function buildStars() {
  const rnd = mulberry32(11); const N = 3200; const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos[i * 3] = r * Math.cos(th); pos[i * 3 + 1] = u; pos[i * 3 + 2] = r * Math.sin(th);
    const m = Math.pow(rnd(), 7); const b = 0.05 + m * 2.6; const tp = rnd();
    const c = tp < 0.18 ? [0.72, 0.84, 1.0] : tp > 0.86 ? [1.0, 0.82, 0.62] : [1, 0.96, 0.9];
    col[i * 3] = c[0] * b; col[i * 3 + 1] = c[1] * b; col[i * 3 + 2] = c[2] * b; size[i] = 1.5 + m * 3.2;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uB: { value: 1 } },
    vertexShader: 'attribute vec3 color; attribute float size; uniform float uB; varying vec3 vC; void main(){ vec3 d = mat3(viewMatrix)*position; vec4 c = projectionMatrix*vec4(d, 0.); c.z = c.w*0.99999; gl_Position = c; gl_PointSize = size; vC = color*uB; }',
    fragmentShader: 'varying vec3 vC; void main(){ float r = length(gl_PointCoord*2. - 1.); float a = exp(-r*r*5.); gl_FragColor = vec4(vC*a, 0.); }',
    ...addBlend, depthTest: true,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -10; return p;
}
function buildSunDisc() {
  const m = new THREE.ShaderMaterial({
    uniforms: { uI: { value: 40 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uI; varying vec2 vUv; void main(){ float r = length(vUv - .5)*2.; float core = 1. - smoothstep(0.09, 0.11, r); float halo = exp(-r*9.)*0.25 + exp(-r*30.)*1.2; gl_FragColor = vec4(vec3(1., .95, .88)*(core + halo)*uI, 0.); }',
    ...addBlend, depthTest: true,
  });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); s.frustumCulled = false; s.renderOrder = -5; return s;
}
function placeSun(c, I = 40, angDeg = 0.9) {
  const D = c.far * 0.8; sunDisc.position.copy(c.position).addScaledVector(SUN, D);
  const s = 2 * D * Math.tan(angDeg * Math.PI / 180) * 10; sunDisc.scale.set(s, s, 1); sunDisc.quaternion.copy(c.quaternion); sunDisc.material.uniforms.uI.value = I; sunDisc.updateMatrixWorld();
}
function earthMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: { value: V(1, 0, 0) }, uGrid: { value: 1 } },
    vertexShader: 'varying vec3 vN, vO; void main(){ vO = normalize(position); vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 uSun; uniform float uGrid; varying vec3 vN, vO; void main(){ vec3 n = normalize(vN); float d = dot(n, uSun); float day = smoothstep(-0.12, 0.3, d);
      vec3 base = mix(vec3(0.002, 0.004, 0.009), vec3(0.018, 0.05, 0.11), day);
      float lat = asin(clamp(vO.y, -1., 1.)), lon = atan(vO.z, vO.x); float st = 3.14159265/12.;
      float a = abs(fract(lat/st + .5) - .5)*st, b = abs(fract(lon/st + .5) - .5)*st*cos(lat);
      float wa = fwidth(lat/st)*st, wb = fwidth(lon/st)*st*cos(lat);
      float gl = max(1. - smoothstep(0., wa*1.2, a), 1. - smoothstep(0., max(wb, 1e-5)*1.2, b));
      base += vec3(0.96, 0.62, 0.12)*gl*(0.012 + 0.05*day)*uGrid;
      gl_FragColor = vec4(base, 1.); }`,
  });
}

// ---------------------------------------------------------------- load
window.__ready = (async () => {
  await document.fonts.ready;
  await Promise.all(['300 expanded 100px Archivo', '700 66px Archivo', '800 expanded 100px Archivo', '500 20px "IBM Plex Mono"'].map((f) => document.fonts.load(f)));
  const t0 = performance.now();
  const loader = new GLTFLoader();
  const gp = await loader.parseAsync(bytes('a_phobos').buffer, '');
  phobos = new THREE.Group(); phobos.add(gp.scene);
  gp.scene.traverse((o) => { if (o.isMesh) { phobosMesh = o; o.material = new THREE.MeshStandardMaterial({ map: o.material.map, roughness: 1, metalness: 0, color: new THREE.Color(1.0, 0.88, 0.78) }); o.castShadow = true; o.receiveShadow = true; } });
  reg(phobos);
  const gd = await loader.parseAsync(bytes('a_deimos').buffer, '');
  deimos = new THREE.Group(); deimos.add(gd.scene);
  gd.scene.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ map: o.material.map, roughness: 1, metalness: 0, color: new THREE.Color(1.0, 0.9, 0.8) }); });
  reg(deimos); deimos.position.copy(DPOS);
  const mtex = await texFrom('a_mars', 'image/jpeg');
  mars = reg(new THREE.Mesh(new THREE.SphereGeometry(RM, 256, 128), new THREE.MeshStandardMaterial({ map: mtex, roughness: 1, metalness: 0, color: new THREE.Color(1.35, 1.3, 1.25) })));
  marsAtmo = reg(new THREE.Mesh(new THREE.SphereGeometry(RM * 1.035, 128, 64), atmoMat(0xffc79a, 0x6f8fd0, 0.55, 0.012)));
  marsAtmo.renderOrder = 2;
  stars = reg(buildStars());
  sunDisc = reg(buildSunDisc());
  const mm = buildMMX(); mmx = mm; reg(mm.g);
  const mm2 = buildMMX(); mmxB = mm2; reg(mm2.g);
  idefix = reg(buildIdefix());
  h3 = reg(buildH3());
  capsule = reg(buildCapsule());
  earth = reg(new THREE.Mesh(new THREE.SphereGeometry(RE, 192, 96), earthMat()));
  earthAtmo = reg(new THREE.Mesh(new THREE.SphereGeometry(RE * 1.025, 128, 64), atmoMat(0x8fc4ff, 0x3050c0, 1.4, 0.01)));
  earthAtmo.renderOrder = 2;
  satsGroup = new THREE.Group(); for (let i = 0; i < 3; i++) { const s = buildSat(); sats.push(s); satsGroup.add(s); } reg(satsGroup);
  // QSO loop around Phobos (drawn in Phobos's orbital plane, retrograde ellipse 2:1)
  { const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(V(Math.sin(a) * 64, 0, Math.cos(a) * 32)); } qso = reg(fatLine(pts, AMB, 3.2, 2.4)); }
  // hook: Phobos orbit, a slow inward spiral that fades long before Mars
  { const pts = []; const N = 420; for (let i = 0; i <= N; i++) { const u = i / N; const a = PHI_P - u * Math.PI * 2.6; const r = RP_ORB * (1 - 0.3 * u); pts.push(V(Math.sin(a) * r, 0, Math.cos(a) * r)); } hookOrbit = reg(fatLine(pts, AMB, 2.6, 2.6)); }
  { const pts = []; for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 2; pts.push(V(Math.cos(a) * (RE + 600), 0, Math.sin(a) * (RE + 600))); } satOrbit = reg(fatLine(pts, AMB, 2.4, 2.0)); }
  dust = new PSys(2600, false); reg(dust.mesh);
  smoke = new PSys(700, false); reg(smoke.mesh);
  gasJet = new PSys(500, true); reg(gasJet.mesh);
  capTrail = new PSys(1400, true); reg(capTrail.mesh);
  // plumes: additive cones
  const plumeMat = (cIn, cOut) => new THREE.ShaderMaterial({
    uniforms: { uI: { value: 1 }, uT: { value: 0 }, cA: { value: new THREE.Color(cIn) }, cB: { value: new THREE.Color(cOut) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform float uI, uT; uniform vec3 cA, cB; varying vec2 vUv; varying vec3 vN, vV; void main(){ float y = 1. - vUv.y; float f = abs(dot(normalize(vN), normalize(vV)));
      float core = pow(f, 2.2); float fl = 0.86 + 0.14*sin(uT*71. + y*23.) * sin(uT*37. - y*11.);
      float along = pow(1. - y, 1.6)*smoothstep(0., 0.06, y);
      vec3 c = mix(cB, cA, pow(1. - y, 3.)*core); gl_FragColor = vec4(c*core*along*uI*fl, 0.); }`,
    ...addBlend, side: THREE.DoubleSide,
  });
  plume = reg(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.85, 7, 32, 24, true), plumeMat(0xfff4d8, 0xff8a2a)));
  plume.geometry.translate(0, -3.5, 0);
  mmxPlume = reg(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.55, 3.2, 32, 16, true), plumeMat(0xeaf2ff, 0x6fa0ff)));
  mmxPlume.geometry.translate(0, -1.6, 0);
  capFire = reg(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({
    uniforms: { uI: { value: 1 }, uT: { value: 0 } },
    vertexShader: 'varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float uI, uT; varying vec3 vN, vV; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float g = pow(1. - f, 1.6)*0.9 + 0.12; vec3 c = mix(vec3(1., .4, .1), vec3(1., .85, .6), 1. - f); gl_FragColor = vec4(c*g*uI*(0.9 + 0.1*sin(uT*53.)), 0.); }',
    ...addBlend,
  })));
  // launch site: ground, a simple tower, sky dome
  ground = reg(new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 1, metalness: 0 })));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = false;
  tower = new THREE.Group();
  tower.add(M(new THREE.BoxGeometry(0.9, 8.5, 0.9), MT.black, [0, 4.25, 0], null, 0x4a4036));
  for (let k = 0; k < 6; k++) tower.add(M(new THREE.BoxGeometry(1.4, 0.08, 0.3), MT.black, [0.55, 1.2 + k * 1.3, 0], null, 0x4a4036));
  reg(tower);
  skyDome = reg(new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
    uniforms: {}, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = clamp(vP.y, -1., 1.); vec3 hor = vec3(0.018, 0.03, 0.06); vec3 top = vec3(0.0015, 0.002, 0.005); vec3 c = mix(hor, top, smoothstep(0.0, 0.5, h)); c += vec3(0.05, 0.03, 0.02)*exp(-abs(h)*14.); gl_FragColor = vec4(c, 1.); }',
  })));
  // surface site on Phobos (computed once in Phobos's local frame)
  phobosBase(); phobos.updateMatrixWorld(true);
  SITE = findSite(V(0.96, -0.05, 0.2));
  if (location.search.includes('dbg')) { for (const d of [[0.93,0.16,0.34],[0.95,0.0,0.25],[0.97,-0.1,0.15],[0.9,0.3,0.2],[0.98,0.05,0.1],[-0.95,0.05,0.25],[-0.9,-0.2,0.3],[0.7,0.0,0.6]]) { const S = findSite(V(...d)); const el = Math.asin(S.toMars.dot(S.up))*180/Math.PI; let mn=1e9,mx=-1e9; for (let x=-1.5;x<=1.5;x+=0.5) for (let z=-1.5;z<=1.5;z+=0.5){const h=S.hAtCache(x,z); mn=Math.min(mn,h); mx=Math.max(mx,h);} console.log('site', JSON.stringify(d), 'marsElev', el.toFixed(1), 'relief', mn.toFixed(3), mx.toFixed(3)); } }
  console.log('site ready', ((performance.now() - t0) / 1000).toFixed(1), 's');
  buildCaptions(); buildTitles();
  for (const o of REG) o.visible = false;
})();

// ---------------------------------------------------------------- Phobos orientation and surface site
const QBASE = new THREE.Quaternion();
function phobosBase(extraYaw = 0, extraPitch = 0) {
  phobos.position.copy(PPOS); phobos.quaternion.identity(); phobos.lookAt(0, 0, 0);
  QBASE.copy(phobos.quaternion);
  if (extraYaw || extraPitch) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(extraPitch, extraYaw, 0, 'YXZ')); phobos.quaternion.multiply(q); }
  phobos.updateMatrixWorld(true);
}
let SITE = null;
function findSite(localDir) {
  const ray = new THREE.Raycaster(); const ld = localDir.clone().normalize();
  const o = ld.clone().multiplyScalar(40).applyMatrix4(phobos.matrixWorld); const target = V().applyMatrix4(phobos.matrixWorld);
  ray.set(o, target.clone().sub(o).normalize()); const hit = ray.intersectObject(phobosMesh, false)[0];
  const p = hit.point.clone(); const nWorld = hit.face.normal.clone().transformDirection(phobosMesh.matrixWorld);
  const radial = p.clone().sub(target).normalize(); const up = nWorld.clone().add(radial).normalize();
  const toMars = V(0, 0, 0).sub(p).normalize(); const fwd = toMars.clone().addScaledVector(up, -toMars.dot(up)).normalize(); const right = V().crossVectors(fwd, up).normalize();
  // ground height sampler around the site (for feet and dust), in the site frame
  const hAt = (x, z) => { const q = p.clone().addScaledVector(right, x).addScaledVector(fwd, z).addScaledVector(up, 3); ray.set(q, up.clone().negate()); const h = ray.intersectObject(phobosMesh, false)[0]; return h ? h.point.clone().sub(p).dot(up) : 0; };
  const N = 33, HALF = 1.6, step = 2 * HALF / (N - 1); const grid = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) grid[j * N + i] = hAt(-HALF + i * step, -HALF + j * step);
  const hAtCache = (x, z) => { const fx = clamp((x + HALF) / step, 0, N - 1.001), fz = clamp((z + HALF) / step, 0, N - 1.001); const i = Math.floor(fx), j = Math.floor(fz); const u = fx - i, v = fz - j;
    return lerp(lerp(grid[j * N + i], grid[j * N + i + 1], u), lerp(grid[(j + 1) * N + i], grid[(j + 1) * N + i + 1], u), v); };
  return { p, up, fwd, right, hAt, hAtCache, toMars };
}
function siteXf(x, y, z) { return SITE.p.clone().addScaledVector(SITE.right, x).addScaledVector(SITE.up, y).addScaledVector(SITE.fwd, z); }
function orientSite(obj, yaw = 0) { const m = new THREE.Matrix4().makeBasis(SITE.right, SITE.up, SITE.fwd.clone().negate()); obj.quaternion.setFromRotationMatrix(m); if (yaw) obj.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UPY, yaw)); }
function look(c, pos, tgt, up = UPY, fov) { c.position.copy(pos); c.up.copy(up); c.lookAt(tgt); if (fov) c.fov = fov; c.updateProjectionMatrix(); c.updateMatrixWorld(); }

// ---------------------------------------------------------------- overlay: captions, titles, credits, callouts
const CHUNKS = [
  [[0, 1, 2, 3, 4], [5]], [[6, 7], [8, 9]], [[10, 11, 12], [13, 14]], [[15, 16, 17], [18, 19, 20]], [[21, 22], [23, 24, 25]],
  [[26, 27], [28, 29, 30]], [[31, 32, 33, 34]], [[35, 36], [37, 38]], [[39, 40]], [[41, 42], [43, 44]], [[45, 46], [47, 48]],
  [[49], [50, 51, 52, 53]], [[54, 55, 56, 57], [58, 59, 60]], [[61, 62, 63], [64, 65]], [[66, 67]], [[68, 69, 70, 71], [72, 73, 74]],
  [[75, 76, 77], [78, 79, 80]], [[81, 82, 83], [84, 85]], [[86, 87, 88]],
];
const capEls = []; const wordEls = [];
const CAP_BOTTOM = 1398;
function buildCaptions() {
  const root = document.getElementById('caps');
  CHUNKS.forEach((lines, k) => {
    const d = document.createElement('div'); d.className = 'chunk';
    lines.forEach((ws) => { const ln = document.createElement('span'); ln.className = 'line'; ws.forEach((wi, j) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = WORDS[wi].text; wordEls[wi] = s; ln.appendChild(s); if (j < ws.length - 1) ln.appendChild(document.createTextNode(' ')); }); d.appendChild(ln); });
    root.appendChild(d);
    let fs = 66; d.style.fontSize = fs + 'px';
    const maxW = Math.max(...[...d.querySelectorAll('.line')].map((l) => l.getBoundingClientRect().width));
    if (maxW > 816) { fs = Math.floor(fs * 816 / maxW); d.style.fontSize = fs + 'px'; }
    const h = lines.length * fs * 1.14;
    d.style.top = (CAP_BOTTOM - h) + 'px';
    const first = lines[0][0]; const last = lines[lines.length - 1][lines[lines.length - 1].length - 1];
    capEls.push({ el: d, first, last, t0: WORDS[first].start, t1: k + 1 < CHUNKS.length ? WORDS[CHUNKS[k + 1][0][0]].start : 99 });
  });
}
const EPS = 0.5 / FPS;
function updateCaptions(t) {
  let newest = -1; for (let i = 0; i < WORDS.length; i++) if (t >= WORDS[i].start - EPS) newest = i;
  for (const c of capEls) {
    const on = t >= c.t0 - EPS && t < c.t1 - EPS;
    c.el.style.display = on ? 'block' : 'none'; if (!on) continue;
    for (let i = c.first; i <= c.last; i++) {
      const w = wordEls[i]; const lt = t - WORDS[i].start;
      if (lt < -EPS) { w.style.opacity = 0; continue; }
      const a = ENTER(clamp((lt + EPS) / 0.22));
      w.style.opacity = 1; w.style.transform = `translateY(${((1 - a) * 10).toFixed(2)}px)`; w.style.filter = a < 0.98 ? `blur(${((1 - a) * 3).toFixed(2)}px)` : 'none';
      w.classList.toggle('new', i === newest);
    }
  }
}

// titles: cards of elements, each element in at its own time; the card leaves at tOut
const TT = (i) => WORDS[i].start;
const CARDS = [
  { tOut: 3.08, els: [
    { k: 'big', text: 'PHOBOS', at: 0.12, y: 26, size: 150 },
    { k: 'sub', text: '1.8 m (6 ft) closer to Mars', at: TT(6), y: 214 },
    { k: 'sub', text: 'every 100 years', at: TT(6) + 0.12, y: 260 },
    { k: 'src', text: 'Source: NASA', at: TT(7), y: 324 } ] },
  { tOut: 5.0, els: [
    { k: 'kicker', text: 'H3 · Flight No.10', at: TT(10) + 0.05, y: 0 },
    { k: 'big', text: 'LIFTOFF', at: TT(10) + 0.2, y: 50, size: 120 },
    { k: 'sub', text: '04:41:03 JST · Oct 20, 2026', at: TT(12), y: 200 },
    { k: 'src', text: 'Source: JAXA', at: TT(12) + 0.15, y: 262 } ] },
  { tOut: 6.95, els: [
    { k: 'kicker', text: 'The thief', at: 5.42, y: 0 },
    { k: 'big', text: 'MMX', at: 5.47, y: 50, size: 190 },
    { k: 'sub', text: 'Martian Moons eXploration', at: TT(16), y: 250 },
    { k: 'src', text: 'Source: JAXA', at: TT(16) + 0.15, y: 312 } ] },
  { tOut: 10.35, els: [
    { k: 'kicker', text: 'Step 01', at: TT(21), y: 0 },
    { k: 'big', text: 'MARS', at: TT(23), y: 50, size: 170 },
    { k: 'sub', text: 'Arrival: August 2027', at: TT(24), y: 232 },
    { k: 'src', text: 'Source: NASA', at: TT(25), y: 294 } ] },
  { tOut: 14.5, els: [
    { k: 'kicker', text: 'Step 02', at: TT(26), y: 0 },
    { k: 'big', text: 'LOOKOUT', at: TT(30), y: 50, size: 130 },
    { k: 'sub', text: 'IDEFIX rover, by CNES and DLR', at: TT(30) + 0.15, y: 196 },
    { k: 'num', value: 25, unit: 'KG', at: TT(32), y: 262, size: 210 },
    { k: 'src', text: 'Sources: JAXA, DLR', at: TT(33), y: 470 } ] },
  { tOut: 18.6, els: [
    { k: 'kicker', text: 'Weight on Phobos', at: TT(35), y: 0 },
    { k: 'num', value: 15, unit: 'GRAMS', at: TT(39), y: 50, size: 250 },
    { k: 'sub', text: 'Same 25 kg rover', at: TT(39) + 0.3, y: 290 },
    { k: 'src', text: 'Source: ESA', at: TT(39) + 0.45, y: 352 } ] },
  { tOut: 22.55, els: [
    { k: 'kicker', text: 'Step 03', at: TT(41), y: 0 },
    { k: 'big', text: 'THE GRAB', at: TT(44), y: 50, size: 130 } ] },
  { tOut: 25.2, els: [
    { k: 'kicker', text: 'Target', at: TT(49), y: 0 },
    { k: 'sub', text: 'at least', at: TT(50), y: 54 },
    { k: 'num', value: 10, unit: 'GRAMS', at: TT(52), y: 110, size: 250 },
    { k: 'src', text: 'Sources: JAXA, ESA', at: TT(53), y: 350 } ] },
  { tOut: 27.8, els: [
    { k: 'kicker', text: 'Step 04', at: TT(54), y: 0 },
    { k: 'big', text: 'ONE BURN', at: TT(57), y: 50, size: 130 },
    { k: 'sub', text: 'A single main-engine manoeuvre', at: TT(58), y: 196 },
    { k: 'src', text: 'Source: JAXA', at: TT(60), y: 258 } ] },
  { tOut: 30.6, els: [
    { k: 'kicker', text: 'Sample capsule · about 60 cm across', at: TT(61), y: 0 },
    { k: 'big', text: 'AUSTRALIA', at: TT(64), y: 50, size: 110 },
    { k: 'num', value: 2031, unit: '', at: TT(65), y: 180, size: 230, year: true },
    { k: 'src', text: 'Sources: JAXA, NASA, ESA', at: TT(65) + 0.2, y: 400 } ] },
  { tOut: 34.5, els: [
    { k: 'kicker', text: 'The loot', at: TT(67), y: 0 },
    { k: 'big', text: 'FIRST', at: TT(68), y: 50, size: 170 },
    { k: 'sub', text: 'First mission to return material', at: TT(69), y: 236 },
    { k: 'sub', text: 'from the Mars system', at: TT(69) + 0.12, y: 282 },
    { k: 'src', text: 'Source: JAXA', at: TT(71), y: 346 } ] },
  { tOut: 38.5, els: [
    { k: 'kicker', text: 'Next on Launch Day', at: TT(75), y: 0 },
    { k: 'big', text: 'ELECTRON', at: TT(76), y: 50, size: 120 },
    { k: 'sub', text: 'Rocket Lab · 3 HawkEye 360 satellites', at: TT(81), y: 190 },
    { k: 'num', value: 21, unit: 'OCT', pre: 'WED ', at: TT(85), y: 256, size: 170, date: true },
    { k: 'src', text: 'Source: Launch Library 2', at: TT(85) + 0.2, y: 432 } ] },
];
const titleEls = [];
function buildTitles() {
  const root = document.getElementById('titles');
  CARDS.forEach((c) => {
    const card = document.createElement('div'); card.className = 'card'; root.appendChild(card); c.el = card;
    c.els.forEach((e) => {
      const d = document.createElement('div'); d.className = 'el ' + e.k; d.style.top = e.y + 'px'; card.appendChild(d); e.el = d;
      if (e.k === 'big') {
        d.style.fontSize = e.size + 'px';
        e.letters = [...e.text].map((ch) => { const s = document.createElement('span'); s.className = 'ltr'; s.textContent = ch === ' ' ? ' ' : ch; d.appendChild(s); return s; });
        const wv = d.getBoundingClientRect().width; if (wv > 820) { e.size = Math.floor(e.size * 820 / wv); d.style.fontSize = e.size + 'px'; }
      } else if (e.k === 'num') {
        d.style.fontSize = e.size + 'px';
        d.innerHTML = (e.pre ? `<span class="u p">${e.pre}</span>` : '') + `<span class="n"></span>` + (e.unit ? `<span class="u" style="font-size:${Math.round(e.size * 0.36)}px;margin-left:${Math.round(e.size * 0.08)}px">${e.unit}</span>` : '');
        if (e.pre) d.querySelector('.p').style.fontSize = Math.round(e.size * 0.36) + 'px';
        e.n = d.querySelector('.n');
        e.n.textContent = String(e.value); const wv = d.getBoundingClientRect().width; if (wv > 820) { e.size = Math.floor(e.size * 820 / wv); d.style.fontSize = e.size + 'px'; }
      } else d.textContent = e.text;
    });
  });
}
function updateTitles(t) {
  for (const c of CARDS) {
    const first = Math.min(...c.els.map((e) => e.at));
    const on = t >= first - EPS && t < c.tOut + 0.4;
    c.el.style.display = on ? 'block' : 'none'; if (!on) continue;
    const ex = EXIT(clamp((t - c.tOut) / 0.35));
    for (const e of c.els) {
      const lt = t - e.at; const d = e.el;
      if (lt < -EPS) { d.style.opacity = 0; continue; }
      const op = (1 - ex);
      if (e.k === 'big') {
        const tr = ENTER(clamp(lt / 1.6));
        d.style.letterSpacing = (0.42 - 0.28 * tr).toFixed(3) + 'em';
        e.letters.forEach((s, i) => { const l2 = lt - i * 0.035; const a = clamp(l2 / 0.3); const b = ENTER(clamp(l2 / 0.55)); s.style.opacity = (a * op).toFixed(3); s.style.filter = b < 0.99 ? `blur(${((1 - b) * 14).toFixed(1)}px)` : 'none'; });
        d.style.opacity = 1; d.style.transform = `translateY(${(-ex * 18).toFixed(1)}px)`; d.style.filter = ex > 0 ? `blur(${(ex * 10).toFixed(1)}px)` : 'none';
      } else if (e.k === 'num') {
        const k = ENTER(clamp(lt / 0.55));
        let n;
        if (e.year || e.date) n = e.value; else n = clamp(Math.ceil(e.value * eOut(lt / 0.5)), 1, e.value);
        e.n.textContent = String(n);
        const sc = 1.12 - 0.12 * spring(lt, 0.7, 4);
        d.style.opacity = (clamp((lt + EPS) / 0.06) * op).toFixed(3); d.style.transformOrigin = '0% 50%';
        d.style.transform = `scale(${sc.toFixed(4)}) translateY(${(-ex * 18).toFixed(1)}px)`; d.style.filter = (k < 0.98 || ex > 0) ? `blur(${((1 - k) * 8 + ex * 10).toFixed(1)}px)` : 'none';
      } else {
        const k = ENTER(clamp(lt / 0.5));
        d.style.opacity = (clamp(lt / 0.25) * op).toFixed(3);
        d.style.transform = `translateX(${((1 - k) * -24).toFixed(1)}px) translateY(${(-ex * 14).toFixed(1)}px)`;
        d.style.filter = (k < 0.98 || ex > 0) ? `blur(${((1 - k) * 6 + ex * 8).toFixed(1)}px)` : 'none';
      }
    }
  }
}
const CR = {
  phobos: 'Phobos 3D model: NASA/JPL-Caltech',
  deimos: 'Deimos 3D model: NASA/JPL-Caltech',
  pd: 'Phobos, Deimos 3D models: NASA/JPL-Caltech',
  mars: 'Mars: USGS Astrogeology Science Center/NASA Ames (Viking Orbiter)',
};
let lastCredits = '';
function setCredits(lines) {
  const html = lines.map((l) => (l.startsWith('!') ? `<div class="ill">${l.slice(1)}</div>` : `<div>${l}</div>`)).join('');
  if (html !== lastCredits) { document.getElementById('credits').innerHTML = html; lastCredits = html; }
}
// callouts: 3D anchored labels
const coRoot = document.getElementById('callouts'); const coSvg = document.getElementById('cosvg'); const coEls = {};
function callout(id, on, world, c, dx, dy, head, body, a, abs) {
  let e = coEls[id];
  if (!e) { const d = document.createElement('div'); d.className = 'co'; coRoot.appendChild(d); const ln = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); ln.setAttribute('fill', 'none'); ln.setAttribute('stroke', '#f5b83d'); ln.setAttribute('stroke-width', '2.5'); const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', '7'); dot.setAttribute('fill', '#f5b83d'); coSvg.appendChild(ln); coSvg.appendChild(dot); e = coEls[id] = { d, ln, dot }; }
  if (!on || a <= 0.001) { e.d.style.display = 'none'; e.ln.style.display = 'none'; e.dot.style.display = 'none'; return; }
  const p = world.clone().project(c); const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
  const lx = abs ? abs[0] : clamp(x + dx, 90, 640), ly = abs ? abs[1] : clamp(y + dy, 300, 1150);
  const k = ENTER(clamp(a));
  e.d.style.display = 'block'; e.d.style.left = lx + 'px'; e.d.style.top = (ly - 52) + 'px'; e.d.style.opacity = clamp(a * 1.5); e.d.innerHTML = `<b>${head}</b>${body}`;
  e.d.style.transform = `translateX(${((1 - k) * 16).toFixed(1)}px)`;
  const mx = x + (lx - x) * 0.55, kx = x + (lx - 8 - x) * k, ky = y + (ly - y) * k;
  e.ln.style.display = 'block'; e.ln.setAttribute('points', `${x.toFixed(1)},${y.toFixed(1)} ${lerp(x, mx, k).toFixed(1)},${ky.toFixed(1)} ${kx.toFixed(1)},${ky.toFixed(1)}`); e.ln.style.opacity = clamp(a * 1.5);
  e.dot.style.display = 'block'; e.dot.setAttribute('cx', x.toFixed(1)); e.dot.setAttribute('cy', y.toFixed(1)); e.dot.setAttribute('r', (7 * k).toFixed(2));
}

// hook diagram: a thin dashed arc from Phobos down toward Mars (direction only; the label gives the rate)
const arcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); arcPath.setAttribute('fill', 'none'); arcPath.setAttribute('stroke', '#f5b83d'); arcPath.setAttribute('stroke-width', '3'); arcPath.setAttribute('stroke-dasharray', '2 12'); arcPath.setAttribute('stroke-linecap', 'round');
const arcHead = document.createElementNS('http://www.w3.org/2000/svg', 'path'); arcHead.setAttribute('fill', 'none'); arcHead.setAttribute('stroke', '#f5b83d'); arcHead.setAttribute('stroke-width', '3'); arcHead.setAttribute('stroke-linecap', 'round');
document.getElementById('cosvg').append(arcPath, arcHead);
function hookArc(t) {
  const on = t < 3.43 && t > TT(6) - 0.05;
  if (!on) { arcPath.style.display = 'none'; arcHead.style.display = 'none'; return; }
  const k = ENTER(clamp((t - TT(6)) / 0.9)); const fade = 1 - ss(3.1, 3.4, t);
  const x0 = 900, y0 = 860, x1 = 930, y1 = 1260;
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40 * k; const x = x0 + Math.sin(u * Math.PI) * 70 + (x1 - x0) * u, y = y0 + (y1 - y0) * u; pts.push([x, y]); }
  arcPath.style.display = 'block'; arcPath.setAttribute('d', 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L')); arcPath.style.opacity = fade;
  const [xa, ya] = pts[pts.length - 1], [xb, yb] = pts[pts.length - 3]; const an = Math.atan2(ya - yb, xa - xb);
  const h = (a) => [xa - Math.cos(an + a) * 18, ya - Math.sin(an + a) * 18];
  const [hx1, hy1] = h(0.5), [hx2, hy2] = h(-0.5);
  arcHead.style.display = k > 0.15 ? 'block' : 'none'; arcHead.setAttribute('d', `M${hx1.toFixed(1)},${hy1.toFixed(1)} L${xa.toFixed(1)},${ya.toFixed(1)} L${hx2.toFixed(1)},${hy2.toFixed(1)}`); arcHead.style.opacity = fade;
}

// ---------------------------------------------------------------- per-frame state
function hideAll() { for (const o of REG) o.visible = false; }
const POST = {};
function resetPost() {
  Object.assign(POST, { exposure: 1, bloomK: 0.55, bloomTh: 1.4, streakK: 0.0, vign: 0.42, grain: 0.028, ca: 0.0012, mb: [0, 0], sat: 1.0, tint: [1, 1, 1], lift: [0, 0, 0], flash: 0, fade: 0, starB: 1 });
}
function camShake(c, amp, t, seed = 0) {
  if (amp <= 0) return; const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(wob(t * 23, seed) * amp, wob(t * 19, seed + 3) * amp, wob(t * 17, seed + 7) * amp * 0.5));
  c.quaternion.multiply(q); c.updateMatrixWorld();
}

// state bag: layers = [{objs, cam, near, far, blur, shadow}]
function frameState(t) {
  resetPost();
  setFill(V(0, 0, 0).sub(PPOS), 0.0); amb.intensity = 0.0; pt.intensity = 0; sun.castShadow = false;
  mars.rotation.set(0, -0.35 + t * 0.006, 0);
  marsAtmo.position.copy(mars.position);
  for (const s of SHOTS) if (t >= s.t0 && t < s.t1) return s.fn(t, t - s.t0, s.t1 - s.t0);
  return SHOTS[SHOTS.length - 1].fn(t, t - SHOTS[SHOTS.length - 1].t0, 1);
}
function marsUniforms(c) { const u = marsAtmo.material.uniforms; u.uSun.value.copy(SUN); u.uCam.value.copy(c.position); u.uC.value.copy(mars.position); u.uR.value = RM; u.uRs.value = RM * 1.035; }
function earthUniforms(c) { const u = earthAtmo.material.uniforms; u.uSun.value.copy(SUN); u.uCam.value.copy(c.position); u.uC.value.copy(earth.position); u.uR.value = RE; u.uRs.value = RE * 1.025; earth.material.uniforms.uSun.value.copy(SUN); }

// --- shot helpers
function mmxPose(mm, pos, quat, scale) { mm.g.position.copy(pos); mm.g.quaternion.copy(quat); mm.g.scale.setScalar(scale); mm.g.updateMatrixWorld(true); }
function setArm(mm, f, drill = 0) { // f: 0 stowed .. 1 at the ground
  const stow = [2.55, -2.7], [a1, a2] = solveArm(mm, V(0.25, -1.3 + 0.02, 1.25));
  mm.arm.rotation.x = lerp(stow[0], a1, f); mm.elbow.rotation.x = lerp(stow[1], a2, f); mm.corer.rotation.x = 0; mm.corer.rotation.y = drill; mm.g.updateMatrixWorld(true);
}
function surfaceDust(ps, t, events) {
  ps.begin();
  for (const ev of events) {
    const rnd = mulberry32(ev.seed); const age0 = t - ev.t; if (age0 < 0) continue;
    for (let i = 0; i < ev.n; i++) {
      const delay = rnd() * (ev.spread || 0.15); const age = age0 - delay; const a = rnd() * Math.PI * 2; const sp = ev.v * (0.35 + rnd() * 0.65); const up = ev.vu * (0.3 + rnd() * 0.7);
      const life = ev.life * (0.6 + rnd() * 0.4); const sz = ev.size * (0.5 + rnd());
      if (age < 0 || age > life) continue;
      const k = age; const x = ev.x + Math.cos(a) * (ev.r0 || 0) + Math.cos(a) * sp * k, z = ev.z + Math.sin(a) * (ev.r0 || 0) + Math.sin(a) * sp * k;
      const y = Math.max(0, (ev.y || 0) + up * k - 0.5 * ev.g * k * k);
      const p = siteXf(x, y + SITE.hAtCache(x, z), z);
      const fade = (1 - age / life) * clamp(age / 0.08);
      const b = ev.b * (0.55 + rnd() * 0.5);
      ps.add(p.x, p.y, p.z, 0.78 * b, 0.68 * b, 0.58 * b, sz * 0.55 * (1 + age * 0.35 * (ev.grow || 0.6)), fade * ev.a * 0.6);
    }
  }
  ps.end();
}

// ---------------------------------------------------------------- SHOTS
const MAT_INVIS = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const MAT_DEPTH = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
function swapMat(root, mat, linesVisible = true) {
  root.traverse((o) => { if (o.isMesh) { if (mat) { if (!o.userData.m0) o.userData.m0 = o.material; o.material = mat; } else if (o.userData.m0) { o.material = o.userData.m0; } } else if (o.isLineSegments) o.visible = linesVisible; });
}
const SH = {};
// S1 hook: Phobos big and side-lit, Mars a huge lit limb below, the orbit spiral draws on
SH.hook = (t, lt) => {
  const e = lt / 3.43;
  phobosBase(0.55 - e * 0.22, -0.32);
  setSun(V().addScaledVector(PRIGHT, -0.72).addScaledVector(UPY, 0.42).addScaledVector(POUT, 0.33), 3.6, PPOS, 18, 120);
  sun.castShadow = true;
  setFill(V(0, 0, 0).sub(PPOS), 0.16);
  const D = lerp(56, 48, eIO2(e)), yaw = lerp(-0.1, 0.07, eIO2(e));
  const dir = V().addScaledVector(POUT, Math.cos(yaw)).addScaledVector(PRIGHT, Math.sin(yaw)).multiplyScalar(0.85).addScaledVector(UPY, -0.52).normalize();
  const pos = PPOS.clone().addScaledVector(dir, D);
  look(cam, pos, PPOS, UPY, 56);
  cam.rotateX(-0.035); cam.rotateZ(lerp(0.05, -0.02, e)); cam.updateMatrixWorld();
  hookArc(t);
  marsUniforms(cam);
  POST.streakK = 0.35; POST.bloomK = 0.6; POST.exposure = 1.15;
  setCredits([CR.phobos, CR.mars]);
  return { layers: [
    { objs: [stars, sunDisc, mars, marsAtmo], near: 15, far: 2e5, blur: 1.6 },
    { objs: [phobos], near: 1, far: 400, blur: 0, shadow: true },
  ] };
};
// S2 launch: tracking the H3 illustration off the pad at night
SH.launch = (t, lt, d) => {
  const tl = t - 2.75;
  const hy = 3.2 * tl * tl;
  h3.position.set(0, hy, 0); h3.rotation.set(0, 0.6, 0); h3.updateMatrixWorld(true);
  plume.position.set(0, hy + 0.15, 0); plume.scale.set(1, 1 + tl * 0.35, 1); plume.material.uniforms.uI.value = 6.0; plume.material.uniforms.uT.value = t;
  tower.position.set(-5.5, 0, -6.5); tower.scale.set(0.8, 1.15, 0.8);
  setSun(V(-0.5, 0.45, 0.75), 0.55);
  pt.position.set(0, Math.max(hy - 2.4, 0.5), 0.6); pt.intensity = 70 + 12 * wob(t * 30); pt.distance = 0; pt.color.setHex(0xffa860);
  amb.intensity = 0.03;
  smoke.begin(); const rnd = mulberry32(5);
  for (let i = 0; i < 560; i++) {
    const birth = -1.0 + rnd() * (tl + 1.0); const age = tl - birth; if (age < 0) continue;
    const a = rnd() * Math.PI * 2; const sp = 2.5 + rnd() * 6; const k = 1 - Math.exp(-age * 1.1);
    const x = Math.cos(a) * sp * k * 1.6, z = Math.sin(a) * sp * k * 0.9 - 0.5; const y = 0.4 + rnd() * 1.2 + age * (0.35 + rnd() * 0.5);
    const dd = Math.hypot(x, y - Math.max(0, hy - 2), z);
    const lit = 0.05 + 3.4 / (1 + dd * dd * 0.09) * (hy < 25 ? 1 : 0.45);
    const sz = 1.6 + age * 1.4 + rnd() * 1.5;
    smoke.add(x, y, z, 0.95 * lit, 0.6 * lit, 0.36 * lit, sz, 0.55 * clamp(age / 0.2));
  }
  smoke.end();
  const e = clamp(lt / d);
  const camY = lerp(3.2, hy * 0.8 + 2.5, ss(0, 1, e));
  const pos = V(lerp(12.5, 10.0, e), camY, lerp(19.5, 16.5, e));
  const tgt = V(0, hy + 2.2 + e * 1.8, 0);
  look(cam, pos, tgt, V(Math.sin(-0.12), Math.cos(0.12), 0), 52);
  camShake(cam, 0.004 + 0.006 * ss(0, 0.4, e), t, 1);
  const whip = ss(d - 0.32, d, lt); if (whip > 0) POST.mb = [0, 0.11 * whip * whip];
  skyDome.position.copy(cam.position);
  POST.exposure = 0.95; POST.bloomK = 0.85; POST.bloomTh = 1.1; POST.streakK = 0.3;
  stars.material.uniforms.uB.value = 0.35;
  setCredits(['!H3 rocket: Illustration · facts: JAXA']);
  return { layers: [
    { objs: [skyDome, stars, ground, tower, smoke.mesh], near: 0.1, far: 2000, blur: 0 },
    { objs: [h3, plume], near: 0.1, far: 2000, blur: 0 },
  ] };
};
// S3-S5: one continuous move: MMX cruising (FG, own camera) -> Mars grows -> swing to Phobos and the QSO loop
const WHIP = [10.12, 10.46];
function cruiseBG(t) {
  // before the whip: push toward Mars; after: Phobos with Mars looming behind it
  const dirA = V(0.42, 0.16, 1).normalize();
  const dMars = logLerp(520000, 12500, eIO(ss(5.37, WHIP[0] + 0.1, t)));
  const posA = dirA.clone().multiplyScalar(dMars);
  const qA = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(posA, V(0, 0, 0), UPY));
  const k = ss(WHIP[1] - 0.05, 11.74, t);
  const posB = PPOS.clone().add(V().addScaledVector(POUT, lerp(150, 120, k)).addScaledVector(UPY, lerp(40, 33, k)).addScaledVector(PRIGHT, lerp(52, 44, k)));
  const tgtB = PPOS.clone().addScaledVector(UPY, -6).addScaledVector(POUT, -20);
  const qB = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(posB, tgtB, UPY));
  const u = inv(WHIP[0], WHIP[1], t), w = eIO(u);
  return { pos: w < 0.5 ? posA : posB, q: qA.clone().slerp(qB, w), whip: Math.sin(Math.PI * u) * (u > 0 && u < 1 ? 1 : 0) };
}
SH.cruise = (t) => {
  const sdir = V(-0.55, 0.32, 0.75).lerp(V(-0.85, 0.35, -0.05), ss(WHIP[0], WHIP[1], t)).normalize();
  setSun(sdir, 3.3, PPOS, 18, 120); sun.castShadow = t > WHIP[0];
  setFill(V(0, 0, 0).sub(PPOS), 0.05);
  const { pos, q, whip } = cruiseBG(t);
  cam.position.copy(pos); cam.quaternion.copy(q); cam.fov = 44; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  if (whip > 0) POST.mb = [-0.16 * whip, 0.03 * whip];
  // early on Mars sits upper right, off the craft; the offset relaxes as we close in
  const off = 1 - ss(6.6, 8.6, t);
  cam.rotateY(0.15 * off); cam.rotateX(-0.25 * off); cam.updateMatrixWorld();
  camShake(cam, 0.0012, t, 4);
  phobosBase(0.4, -0.3);
  marsUniforms(cam);
  const fgOn = t < 8.9;
  const mt = t - 5.37;
  const mq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.32 + mt * 0.04, -0.95 + mt * 0.15, 0.1, 'YXZ'));
  mmxPose(mmx, V(0, 0, 0), mq, 1); setArm(mmx, 0); setArm(mmxB, 0);
  const camDist = lerp(13.5, 11.5, ss(5.37, 7.3, t));
  const fgPush = eIn(ss(7.2, 8.9, t));
  const bp = V(-1.6 + 2.2 * ss(5.37, 7.5, t), 1.9 - 0.5 * ss(5.37, 8, t), camDist).add(V(-4 * fgPush, 5.5 * fgPush, -13 * fgPush));
  look(camB, bp, V(0.2 - 1.5 * fgPush, 0.5 + 6 * fgPush, -6 * fgPush), UPY, 44);
  const qOn = t > 10.3;
  qso.position.copy(PPOS); qso.quaternion.copy(QBASE); qso.updateMatrixWorld();
  drawOn(qso, ss(10.45, 11.45, t)); qso.material.opacity = 1;
  const qa = (t - 10.0) * 0.9 + 0.6; const mp = V(Math.sin(qa) * 64, 0, Math.cos(qa) * 32).applyQuaternion(QBASE).add(PPOS);
  mmxPose(mmxB, mp, QBASE, 1.8);
  POST.streakK = 0.45; POST.bloomK = 0.6;
  const cr = [];
  if (t < WHIP[0] + 0.15) cr.push(CR.mars); else cr.push(CR.phobos, CR.mars);
  if (fgOn) cr.push('!MMX: Illustration · facts: JAXA'); else if (qOn) cr.push('!MMX: Illustration, not to scale · facts: JAXA');
  setCredits(cr);
  const coP = V(Math.sin(2.35) * 64, 0, Math.cos(2.35) * 32).applyQuaternion(QBASE).add(PPOS);
  callout('qso', t > 10.6 && t < 11.74, coP, cam, 40, -260, 'QUASI-SATELLITE ORBIT', 'an orbit that flies close · JAXA', ss(10.6, 10.95, t) * (1 - ss(11.55, 11.74, t)));
  const layers = [
    { objs: [stars, sunDisc, mars, marsAtmo, deimos], near: 100, far: 2e6, blur: lerp(3.0, 0, ss(7.4, 8.6, t)) },
    { objs: [phobos, ...(qOn ? [qso, mmxB.g] : [])], near: 1, far: 6e5, blur: 0, shadow: t > WHIP[0], amb: 0 },
  ];
  if (fgOn) layers.push({ objs: [mmx.g], cam: camB, near: 0.1, far: 100, blur: lerp(0, 18, ss(7.6, 8.9, t)), amb: 0.25 });
  return { layers };
};
// S6-S10: on the surface of Phobos (illustration scale; ground in its own soft-focus layer)
const SC = 0.22; // km per MMX unit (not to scale)
const ISC = 0.065; // km per IDEFIX unit
function idefixPath(t) {
  const relY = 0.705;
  let y, tilt = 0, roll = 0;
  if (t < 12.25) { y = relY; }
  else if (t < 15.6) { const k = (t - 12.25) / 3.35; y = relY * (1 - k * k * (0.55 + 0.45 * k)); tilt = k * 0.5; roll = k * 0.35; }
  else if (t < 17.35) { const k = (t - 15.6) / 1.75; y = 0.11 * 4 * k * (1 - k); tilt = 0.5 + k * 1.1; roll = 0.35 + k * 0.4; }
  else if (t < 17.9) { const k = (t - 17.35) / 0.55; y = 0.02 * 4 * k * (1 - k); tilt = 1.6 - k * 0.3; roll = 0.75 - k * 0.2; }
  else { const k = ENTER(clamp((t - 18.05) / 0.8)); y = 0; tilt = lerp(1.3, 0, k); roll = lerp(0.55, 0, k); }
  const dt = t > 15.6 ? Math.min(t, 17.9) - 15.6 : 0;
  return { x: HOVER_X + 0.12 + dt * 0.035, y, z: 0.0 + dt * 0.05, tilt, roll };
}
const HOVER_X = 0.55;
function mmxHoverX(t) { return t < 18.4 ? HOVER_X : lerp(HOVER_X, 0, eIO2((t - 18.4) / 1.74)); }
function mmxSurfacePose(t) {
  if (t < 18.4) return 0.72 + 0.015 * wob(t * 0.8);
  if (t < 20.14) return lerp(0.72, 0, eIO2((t - 18.4) / 1.74));
  if (t < 25.75) return 0;
  const k = t - 25.75; return 0.09 * k * k + 0.06 * k;
}
function surfaceSetup(t) {
  phobosBase(0, 0);
  const S = SITE.right.clone().multiplyScalar(-0.8).addScaledVector(SITE.up, 0.34).addScaledVector(SITE.fwd, -0.42);
  setSun(S, 3.6, SITE.p, 4.5, 30);
  sun.castShadow = true;
  setFill(SITE.toMars, 0.14);
  const yy = mmxSurfacePose(t);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(SITE.right, SITE.up, SITE.fwd.clone().negate()));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(UPY, 0.55));
  const hx = mmxHoverX(t);
  mmxPose(mmx, siteXf(hx, 1.30 * SC, 0), q, SC);
  let base = -1e9;
  for (const f of mmx.feet) { const w = f.clone().applyMatrix4(mmx.g.matrixWorld).sub(SITE.p); base = Math.max(base, SITE.hAtCache(w.dot(SITE.right), w.dot(SITE.fwd)) - w.dot(SITE.up)); }
  mmxPose(mmx, siteXf(hx, 1.30 * SC + yy + base, 0), q, SC);
  setArm(mmx, 0);
}
function placeIdefix(t) {
  const ip = idefixPath(t);
  orientSite(idefix, 0.9); idefix.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(ip.tilt, 0, ip.roll)));
  idefix.scale.setScalar(ISC);
  const gy = SITE.hAtCache(ip.x, ip.z);
  idefix.position.copy(siteXf(ip.x, ip.y + gy + 0.022 * clamp(ip.y * 40), ip.z)); idefix.updateMatrixWorld(true);
  return ip;
}
function surfaceLayers(subjects, skyBlur, groundBlur, extraSky = []) {
  const casters = subjects.filter((o) => o === mmx.g || o === idefix);
  return [
    { objs: [stars, sunDisc, mars, marsAtmo, ...extraSky], near: 100, far: 2e5, blur: skyBlur },
    { objs: [phobos, ...casters], near: 0.005, far: 80, blur: groundBlur, shadow: true,
      pre: () => casters.forEach((c) => swapMat(c, MAT_INVIS, false)), post: () => casters.forEach((c) => swapMat(c, null, true)) },
    { objs: [phobos, ...subjects], near: 0.005, far: 80, blur: 0, amb: 0.05,
      pre: () => swapMat(phobos, MAT_DEPTH), post: () => swapMat(phobos, null) },
  ];
}
function siteLook(eye, at, fov, roll = 0) { look(cam, siteXf(...eye), siteXf(...at), SITE.up, fov); if (roll) { cam.rotateZ(roll); cam.updateMatrixWorld(); } }
SH.drop = (t, lt) => {
  surfaceSetup(t);
  const ip = placeIdefix(t);
  const e = clamp(lt / 3.12);
  const ey = eIO2(e);
  siteLook([HOVER_X + lerp(0.3, 0.15, e), lerp(0.16, 0.1, e), lerp(-2.35, -2.0, e)], [HOVER_X + 0.08, lerp(0.9, Math.max(ip.y, 0.12) * 0.75 + 0.06, ey), lerp(0, 0.05, e)], 50, lerp(0.03, -0.02, e));
  camShake(cam, 0.0012, t, 9);
  marsUniforms(cam);
  dust.begin(); dust.end();
  POST.bloomK = 0.5; POST.streakK = 0.25;
  setCredits([CR.phobos, CR.mars, '!MMX, IDEFIX: Illustration, not to scale · facts: JAXA, DLR']);
  return { layers: surfaceLayers([mmx.g, idefix], 1.6, 2.2) };
};
SH.grams = (t, lt) => {
  surfaceSetup(t);
  const ip = placeIdefix(t);
  const e = clamp(lt / 4.13);
  const ang = lerp(-0.2, 0.22, eIO2(e));
  const r = lerp(0.46, 0.4, e);
  const ix = ip.x, iz = ip.z;
  siteLook([ix + Math.sin(ang) * r, lerp(0.05, 0.035, e), iz - Math.cos(ang) * r], [ix, 0.045 + ip.y * 0.9, iz + 0.02], 40);
  camShake(cam, 0.0008, t, 2);
  marsUniforms(cam);
  surfaceDust(dust, t, [
    { t: 15.6, seed: 3, n: 160, x: ip.x, z: ip.z, v: 0.05, vu: 0.045, g: 0.004, life: 3.2, size: 0.009, b: 0.62, a: 0.6, spread: 0.1 },
    { t: 17.35, seed: 4, n: 100, x: HOVER_X + 0.12 + 1.75 * 0.035, z: 1.75 * 0.05, v: 0.04, vu: 0.03, g: 0.004, life: 2.6, size: 0.008, b: 0.62, a: 0.55, spread: 0.1 },
  ]);
  POST.bloomK = 0.5;
  setCredits([CR.phobos, CR.mars, '!IDEFIX: Illustration, not to scale · facts: DLR, ESA']);
  return { layers: surfaceLayers([idefix, dust.mesh], 4.5, 3.2) };
};
SH.grab = (t, lt) => {
  surfaceSetup(t);
  const armF = ENTER(clamp((t - 20.85) / 0.6));
  setArm(mmx, armF, (t - 21.3) * 14 * ss(21.3, 21.5, t));
  placeIdefix(t);
  const e = clamp(lt / 3.91);
  const ang = lerp(0.24, 0.1, eIO2(e));
  const r = lerp(2.7, 2.2, eIO2(e));
  siteLook([Math.sin(ang) * r, lerp(0.17, 0.12, e), -Math.cos(ang) * r], [lerp(0.3, 0.12, eIO2(e)), lerp(0.5, 0.3, eIO2(e)), 0.1], 46, lerp(0.025, -0.01, e));
  const land = ss(20.0, 20.14, t) * (1 - ss(20.14, 20.6, t));
  camShake(cam, 0.001 + 0.006 * land, t, 5);
  marsUniforms(cam);
  const feet = mmx.feet.map((f) => f.clone().applyMatrix4(mmx.g.matrixWorld).sub(SITE.p));
  const loc = (v) => ({ x: v.dot(SITE.right), z: v.dot(SITE.fwd) });
  const evs = feet.map((f, i) => ({ t: 20.1, seed: 20 + i, n: 60, ...loc(f), v: 0.16, vu: 0.06, g: 0.006, life: 2.8, size: 0.03, b: 0.85, a: 0.5, spread: 0.08 }));
  evs.push({ t: 20.12, seed: 30, n: 170, x: 0, z: 0, r0: 0.12, v: 0.3, vu: 0.035, g: 0.004, life: 3.0, size: 0.05, b: 0.8, a: 0.42, spread: 0.1, grow: 1.2 });
  const corerTip = V(0, -0.33, 0).applyMatrix4(mmx.corer.matrixWorld).sub(SITE.p);
  evs.push({ t: 21.35, seed: 40, n: 80, ...loc(corerTip), v: 0.05, vu: 0.07, g: 0.006, life: 1.6, size: 0.014, b: 0.95, a: 0.7, spread: 1.2 });
  const ps = mmx.pS.position.clone().applyMatrix4(mmx.g.matrixWorld).sub(SITE.p);
  evs.push({ t: 21.8, seed: 50, n: 240, ...loc(ps), v: 0.09, vu: 0.34, g: 0.01, life: 1.7, size: 0.02, b: 1.0, a: 0.8, spread: 0.12 });
  surfaceDust(dust, t, evs);
  gasJet.begin(); const rr = mulberry32(77); const ja = t - 21.78;
  if (ja > 0 && ja < 0.9) { const p0 = mmx.pS.position.clone().applyMatrix4(mmx.g.matrixWorld); for (let i = 0; i < 240; i++) { const a = rr() * 6.283, s = rr(), age = ja - rr() * 0.25; if (age < 0) continue; const rad = 0.02 + s * 0.1 * age * 6; const p = p0.clone().addScaledVector(SITE.right, Math.cos(a) * rad).addScaledVector(SITE.fwd, Math.sin(a) * rad).addScaledVector(SITE.up, -0.01 + age * 0.06); const k = Math.max(0, 1 - age / 0.6); gasJet.add(p.x, p.y, p.z, 0.5 * k, 0.56 * k, 0.7 * k, 0.025 + age * 0.06, 0.45); } }
  gasJet.end();
  POST.bloomK = 0.55;
  callout('corer', t > 21.0 && t < 22.85, V(0, -0.3, 0).applyMatrix4(mmx.corer.matrixWorld), cam, 0, 0, 'CORING ARM', 'digs down to 2 cm · JAXA', ss(21.0, 21.35, t) * (1 - ss(22.6, 22.85, t)), [96, 1120]);
  callout('gas', t > 21.78 && t < 22.85, mmx.pS.position.clone().applyMatrix4(mmx.g.matrixWorld), cam, 0, 0, 'NITROGEN GAS SAMPLER', 'high-pressure gas · NASA', ss(21.78, 22.1, t) * (1 - ss(22.6, 22.85, t)), [420, 990]);
  setCredits([CR.phobos, CR.mars, '!MMX, IDEFIX: Illustration, not to scale · facts: JAXA, NASA']);
  return { layers: surfaceLayers([mmx.g, idefix, dust.mesh, gasJet.mesh], 2.6, 1.8) };
};
SH.target = (t, lt) => {
  surfaceSetup(t);
  setArm(mmx, 1 - ENTER(clamp((t - 23.1) / 0.9)), 0);
  placeIdefix(t);
  const e = clamp(lt / 2.69);
  const ang = lerp(-0.35, -0.24, e), r = lerp(2.15, 1.9, eIO2(e));
  siteLook([Math.sin(ang) * r, lerp(0.05, 0.07, e), -Math.cos(ang) * r], [0, lerp(0.5, 0.46, e), 0], 42, lerp(0.05, 0.0, e));
  marsUniforms(cam);
  surfaceDust(dust, t, [{ t: 20.12, seed: 30, n: 170, x: 0, z: 0, r0: 0.12, v: 0.3, vu: 0.035, g: 0.004, life: 3.0, size: 0.05, b: 0.8, a: 0.42, spread: 0.1, grow: 1.2 }]);
  POST.bloomK = 0.5;
  setCredits([CR.phobos, CR.mars, '!MMX, IDEFIX: Illustration, not to scale · facts: JAXA, ESA']);
  return { layers: surfaceLayers([mmx.g, idefix, dust.mesh], 3.0, 2.6) };
};
SH.liftoff = (t, lt) => {
  surfaceSetup(t);
  placeIdefix(t);
  const e = clamp(lt / 1.14);
  const up = mmxSurfacePose(t);
  siteLook([lerp(0.55, 0.45, e), 0.14, lerp(-2.6, -2.45, e)], [0.05, 0.32 + up * 0.8, 0.1], 48);
  camShake(cam, 0.0015 + 0.003 * ss(25.7, 25.9, t) * (1 - ss(26.0, 26.6, t)), t, 6);
  marsUniforms(cam);
  // thruster puffs kick up dust as it leaves
  surfaceDust(dust, t, [{ t: 25.7, seed: 61, n: 240, x: 0, z: 0, r0: 0.08, v: 0.34, vu: 0.06, g: 0.004, life: 2.5, size: 0.045, b: 0.9, a: 0.5, spread: 0.25, grow: 1.0 }]);
  gasJet.begin(); const rr = mulberry32(81); const p0 = V(0, mmx.nozzleY, 0).applyMatrix4(mmx.g.matrixWorld);
  if (t > 25.7) for (let i = 0; i < 160; i++) { const age = ((t - 25.7) + rr() * 0.4) % 0.4; const a = rr() * 6.283; const p = p0.clone().addScaledVector(SITE.up, -age * 0.5).addScaledVector(SITE.right, Math.cos(a) * age * 0.12).addScaledVector(SITE.fwd, Math.sin(a) * age * 0.12); const k = (1 - age / 0.4); gasJet.add(p.x, p.y, p.z, 0.6 * k, 0.7 * k, 0.9 * k, 0.03 + age * 0.08, 0.5); }
  gasJet.end();
  POST.bloomK = 0.55;
  setCredits([CR.phobos, CR.mars, '!MMX: Illustration, not to scale · facts: JAXA']);
  return { layers: surfaceLayers([mmx.g, idefix, dust.mesh, gasJet.mesh], 2.2, 1.8) };
};
// one burn: in space, MMX races away from Mars, plume pointing back at it
SH.burn = (t, lt, d) => {
  const e = clamp(lt / d);
  const S = V(-0.7, 0.45, 0.55).normalize(); setSun(S, 3.3, V(), 18, 120);
  const dist = logLerp(13000, 34000, eIO2(e));
  const pos = V(0.25, 0.32, 1).normalize().multiplyScalar(dist);
  look(cam, pos, V(0, 0, 0), UPY, 46);
  cam.rotateX(0.24); cam.rotateY(0.1); cam.updateMatrixWorld();
  marsUniforms(cam);
  phobosBase(0.3, -0.3);
  const nd = V(0.62, -0.55, -0.56).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), nd);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(UPY, 0.6 + e * 0.25));
  const drift = nd.clone().multiplyScalar(-(lt * 1.2 + lt * lt * 1.4));
  mmxPose(mmx, drift, q, 1); setArm(mmx, 0);
  mmxPlume.position.copy(V(0, mmx.nozzleY, 0).applyMatrix4(mmx.g.matrixWorld)); mmxPlume.quaternion.copy(mmx.g.quaternion);
  const ign = ss(0, 0.1, lt);
  mmxPlume.scale.set(1.1 + 0.3 * ign, 0.6 + 2.2 * ign, 1.1 + 0.3 * ign); mmxPlume.material.uniforms.uI.value = 10 * ign; mmxPlume.material.uniforms.uT.value = t; mmxPlume.updateMatrixWorld();
  const cd = lerp(15.5, 13, eIO2(e));
  look(camB, drift.clone().add(V(-0.5, 0.6, cd)), drift.clone().add(V(0.8, -0.9, 0)), UPY, 46);
  camShake(camB, 0.005 * (1 - ss(0.2, 1.2, lt)) + 0.0012, t, 12);
  POST.bloomK = 0.85; POST.bloomTh = 1.1; POST.streakK = 0.6 * ign;
  POST.flash = 0.5 * Math.exp(-lt * 8);
  setCredits([CR.phobos, CR.mars, '!MMX: Illustration · facts: JAXA']);
  return { layers: [
    { objs: [stars, sunDisc, mars, marsAtmo], near: 100, far: 2e6, blur: 2.0 },
    { objs: [phobos], near: 1, far: 6e5, blur: 1.2 },
    { objs: [mmx.g, mmxPlume], cam: camB, near: 0.1, far: 200, blur: 0, amb: 0.22 },
  ] };
};
// S11 capsule into Earth's atmosphere (illustration): close on the glowing shield, pull back to the long streak
SH.capsule = (t, lt, d) => {
  earth.position.set(0, -RE, 0); earth.rotation.set(0, 0, 0); earthAtmo.position.copy(earth.position);
  earth.material.uniforms.uGrid.value = 0.0;
  setSun(V(0.25, -0.12, -0.96), 3.0);
  const F = V(1, -0.1, 0).normalize(), U = V(0, 1, 0), S = V().crossVectors(F, U).normalize();
  const cp = V(-20, 95, 0).addScaledVector(F, lt * 8);
  capsule.position.copy(cp); capsule.scale.setScalar(1.0);
  capsule.quaternion.setFromUnitVectors(UPY.clone().negate(), F); capsule.updateMatrixWorld(true);
  capFire.position.copy(cp).addScaledVector(F, 0.04); capFire.quaternion.copy(capsule.quaternion); capFire.scale.set(0.64, 0.32, 0.64); capFire.material.uniforms.uI.value = 2.6; capFire.material.uniforms.uT.value = t; capFire.updateMatrixWorld();
  pt.position.copy(cp).addScaledVector(F, 0.9).addScaledVector(S, 0.3); pt.intensity = 3.5; pt.color.setHex(0xff9a50); pt.distance = 0;
  capTrail.begin(); const rr = mulberry32(9);
  const len = 10 + lt * 28;
  for (let i = 0; i < 1400; i++) { const u = Math.pow(rr(), 1.7); const back = u * len; const ang = rr() * 6.283, rad = Math.sqrt(rr()); const wid = 0.36 + back * 0.028;
    const p = cp.clone().addScaledVector(F, -back - 0.12).addScaledVector(U, Math.cos(ang) * rad * wid).addScaledVector(S, Math.sin(ang) * rad * wid);
    const k = Math.exp(-u * 3.0); const flick = 0.8 + 0.2 * Math.sin(t * 47 + i * 1.7); const hot = Math.exp(-back * 0.5);
    capTrail.add(p.x, p.y, p.z, (1.0 * k + 1.3 * hot) * flick, (0.34 * k + 0.9 * hot) * flick, (0.08 * k + 0.55 * hot) * flick, 0.24 + back * 0.06, 0.5); }
  capTrail.end();
  const pull = eIO2(ss(0.05, 2.4, lt));
  const D = logLerp(5.5, 75, pull);
  const camPos = cp.clone().addScaledVector(S, D * 0.95).addScaledVector(U, D * lerp(0.16, 0.3, pull)).addScaledVector(F, D * lerp(0.12, 0.05, pull));
  const tgt = cp.clone().addScaledVector(F, -D * lerp(0.05, 0.22, pull)).addScaledVector(U, D * lerp(0.02, 0.1, pull));
  look(cam, camPos, tgt, UPY, 40);
  cam.rotateZ(lerp(-0.25, -0.33, pull)); cam.updateMatrixWorld();
  camShake(cam, 0.004 * (1 - pull) + 0.0012, t, 8);
  earthUniforms(cam);
  POST.bloomK = 0.9; POST.bloomTh = 1.0; POST.streakK = 0.3; POST.exposure = 1.0;
  POST.flash = Math.max(0, 1 - lt / 0.2) * 0.5;
  stars.material.uniforms.uB.value = 0.6;
  setCredits(['!Earth, capsule: Illustration · facts: JAXA, NASA, ESA']);
  return { layers: [
    { objs: [stars, earth, earthAtmo], near: 1, far: 1e5, blur: lerp(2.5, 0.8, pull) },
    { objs: [capsule, capFire, capTrail.mesh], near: 0.05, far: 1e4, blur: 0, amb: 0.12 },
  ] };
};
// S12 the loot: Phobos turns, Stickney rolls into the light; poles kept away from camera
SH.loot = (t, lt, d) => {
  const e = clamp(lt / d);
  phobosBase(lerp(-0.85, -1.75, eIO2(e)), -0.38);
  setSun(V().addScaledVector(PRIGHT, -0.8).addScaledVector(UPY, 0.28).addScaledVector(POUT, 0.5), 3.5, PPOS, 18, 120);
  sun.castShadow = true;
  setFill(V(0, 0, 0).sub(PPOS), 0.08);
  const dist = lerp(90, 74, eIO2(e));
  const pos = PPOS.clone().addScaledVector(POUT, dist).addScaledVector(UPY, lerp(4, -2, e)).addScaledVector(PRIGHT, lerp(5, -3, e));
  look(cam, pos, PPOS, UPY, 42);
  cam.rotateX(0.07); cam.updateMatrixWorld();
  marsUniforms(cam);
  POST.flash = Math.max(0, 1 - lt / 0.16) * 0.4; POST.bloomK = 0.55; POST.streakK = 0.2;
  setCredits([CR.phobos, CR.mars]);
  return { layers: [
    { objs: [stars, sunDisc, mars, marsAtmo], near: 100, far: 2e5, blur: lerp(6, 3, e) },
    { objs: [phobos], near: 1, far: 400, blur: 0, shadow: true },
  ] };
};
// S13 NEXT: three satellites in a line over the drawn Earth's limb
SH.next = (t, lt, d) => {
  const e = clamp(lt / d);
  earth.position.set(0, 0, 0); earth.rotation.set(0.0, 0.3 + t * 0.004, 0); earthAtmo.position.copy(earth.position);
  earth.material.uniforms.uGrid.value = 1.0;
  setSun(V(0.35, 0.8, 0.5), 3.0);
  satOrbit.rotation.set(0, 0, 0); satOrbit.updateMatrixWorld(); drawOn(satOrbit, 1);
  satOrbit.material.opacity = ss(TT(80), TT(82), t);
  const R = RE + 600; const ob = (a) => V(Math.cos(a) * R, 0, Math.sin(a) * R);
  const a0 = Math.PI / 2 + 0.02 - lt * 0.0045;
  sats.forEach((s, i) => { const p = ob(a0 + (i - 1) * 0.0068); s.position.copy(p); s.scale.setScalar(17); s.lookAt(ob(a0 + (i - 1) * 0.0068 - 0.01)); s.rotateY(Math.PI / 2); s.rotateX(-0.35 + 0.08 * Math.sin(t * 0.9 + i)); });
  satsGroup.updateMatrixWorld(true);
  const O = V(0, 0, 1), N = V(0, 1, 0);
  const pos = V(0, 0, R).addScaledVector(O, lerp(520, 470, e)).addScaledVector(N, lerp(-940, -880, e)).add(V(lerp(30, -30, e), 0, 0));
  const pitch = 0.47;
  const dir = N.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(O, -Math.sin(pitch));
  look(cam, pos, pos.clone().add(dir), O, 40);
  earthUniforms(cam);
  stars.material.uniforms.uB.value = 1.0;
  POST.bloomK = 0.6; POST.flash = Math.max(0, 1 - lt / 0.2) * 0.25;
  setCredits(['!Earth, satellites: Illustration · facts: Launch Library 2']);
  return { layers: [
    { objs: [stars, earth, earthAtmo], near: 10, far: 1e5, blur: 0.8 },
    { objs: [satsGroup, satOrbit], near: 10, far: 1e5, blur: 0, amb: 0.25 },
  ] };
};
// S14 end card: dim Mars limb, Phobos small, behind the wordmark
SH.end = (t, lt) => {
  phobosBase(0.2, -0.3);
  setSun(V(-0.5, 0.35, 0.8), 3.0, PPOS, 18, 120);
  const e = clamp(lt / 3.6);
  const pos = V(0.2, -0.25, 1).normalize().multiplyScalar(lerp(11500, 12600, e));
  look(cam, pos, V(0, 2600, 0), UPY, 44);
  marsUniforms(cam);
  POST.exposure = 0.5; POST.bloomK = 0.4;
  setCredits([CR.mars]);
  return { layers: [
    { objs: [stars, mars, marsAtmo], near: 100, far: 2e5, blur: 5 },
  ] };
};
const SHOTS = [
  { t0: 0, t1: 3.43, fn: SH.hook },
  { t0: 3.43, t1: 5.37, fn: SH.launch },
  { t0: 5.37, t1: 11.74, fn: SH.cruise },
  { t0: 11.74, t1: 14.86, fn: SH.drop },
  { t0: 14.86, t1: 18.99, fn: SH.grams },
  { t0: 18.99, t1: 22.90, fn: SH.grab },
  { t0: 22.90, t1: 25.59, fn: SH.target },
  { t0: 25.59, t1: 26.73, fn: SH.liftoff },
  { t0: 26.73, t1: 28.20, fn: SH.burn },
  { t0: 28.20, t1: 30.92, fn: SH.capsule },
  { t0: 30.92, t1: 34.89, fn: SH.loot },
  { t0: 34.89, t1: 38.85, fn: SH.next },
  { t0: 38.85, t1: 99, fn: SH.end },
];

// ---------------------------------------------------------------- end card: echo-mark eyes cameo, then the wordmark
const eyesSvg = document.getElementById('eyes');
eyesSvg.innerHTML = '<g id="eg"><circle id="eD" cx="0" cy="0" r="22" fill="#f5b83d"/><circle id="eR" cx="60" cy="0" r="19" fill="none" stroke="#f5b83d" stroke-width="6"/><circle id="eP" cx="60" cy="0" r="19" fill="none" stroke="#f5b83d" stroke-width="3" opacity="0"/></g>';
let WM = null;
function wmLayout() {
  if (WM) return WM; const el = document.getElementById('wmtext'); el.style.fontSize = '100px';
  const w = el.getBoundingClientRect().width;
  const f = Math.floor(820 / (1.418 + 0.36 + w / 100)); el.style.fontSize = f + 'px';
  const R = 0.3 * f; WM = { f, R, dotX: 80 + R, cy: 640, textX: 80 + 4.727 * R + 0.36 * f }; return WM;
}
function updateEnd(t) {
  const end = document.getElementById('end'); const on = t >= 38.85;
  end.style.opacity = on ? 1 : 0; if (!on) return;
  const lt = t - 38.85;
  const eg = document.getElementById('eg'); const eD = document.getElementById('eD'); const eR = document.getElementById('eR'); const eP = document.getElementById('eP');
  // eyes: big (r 44) at frame center, open, blink once, glance, then fly to the wordmark (r 30) and become the echo mark
  const fly = MOVE(clamp((t - TT(87) + 0.18) / 0.5));
  const L = wmLayout();
  const R = lerp(46, L.R, fly);
  const cx = lerp(470, L.dotX, fly), cy = lerp(620, L.cy, fly);
  const open = ENTER(clamp(lt / 0.25));
  const blinkT = t - 39.25; const blink = blinkT > 0 && blinkT < 0.2 ? 1 - Math.sin(blinkT / 0.2 * Math.PI) * 0.92 : 1;
  const sy = open * blink;
  const glance = Math.sin(clamp((t - 38.95) / 0.5) * Math.PI) * 10 * (1 - fly);
  eg.setAttribute('transform', `translate(${(cx + glance).toFixed(1)},${cy.toFixed(1)}) scale(1,${sy.toFixed(3)})`);
  eD.setAttribute('r', R.toFixed(2)); eR.setAttribute('cx', (R * 60 / 22).toFixed(2)); eR.setAttribute('r', (R * (1 - 3 / 22)).toFixed(2)); eR.setAttribute('stroke-width', (R * 6 / 22).toFixed(2));
  // logo ping: dot pulses with the note, ring with the echo 12 frames later
  const LOGO = 1213 / 30, ECHO = LOGO + 0.4;
  const pd = t - LOGO; const pr = t - ECHO;
  eD.setAttribute('r', (R * (1 + (pd > 0 ? 0.18 * Math.exp(-pd * 9) * Math.sin(Math.min(pd * 30, Math.PI)) : 0))).toFixed(2));
  if (pr > 0 && pr < 0.9) { eP.setAttribute('opacity', (0.9 * (1 - pr / 0.9)).toFixed(3)); eP.setAttribute('cx', (R * 60 / 22).toFixed(2)); eP.setAttribute('r', (R * (1 + pr * 1.6)).toFixed(2)); } else eP.setAttribute('opacity', 0);
  // wordmark text
  const wm = document.getElementById('wmtext'); const d = wm.querySelector('.d'), c = wm.querySelector('.c');
  const a1 = clamp((t - TT(87) - 0.12) / 0.25), a2 = clamp((t - TT(88) + EPS) / 0.12);
  const wmEl = document.getElementById('wm'); wmEl.style.left = L.textX.toFixed(1) + 'px'; wmEl.style.top = (L.cy - 0.56 * L.f).toFixed(1) + 'px';
  d.style.opacity = a1; d.style.filter = a1 < 1 ? `blur(${((1 - a1) * 10).toFixed(1)}px)` : 'none'; d.style.letterSpacing = (0.12 * (1 - ENTER(a1))).toFixed(3) + 'em';
  c.style.opacity = a2; c.style.display = 'inline-block'; c.style.transform = `scale(${(1.12 - 0.12 * spring(t - TT(88), 0.7, 4)).toFixed(4)})`; c.style.transformOrigin = '0% 60%';
}

// ---------------------------------------------------------------- render
function renderFrame(t) {
  const st = frameState(t);
  const baseAmb = amb.intensity;
  const used = [false, false, false];
  st.layers.forEach((L, i) => {
    hideAll(); for (const o of L.objs) o.visible = true;
    if (L.pre) L.pre();
    amb.intensity = L.amb !== undefined ? L.amb : baseAmb;
    const c = L.cam || cam; c.near = L.near; c.far = L.far; c.updateProjectionMatrix();
    if (c === cam) { if (sunDisc.visible) placeSun(cam, sunDisc.material.uniforms.uI.value); }
    renderer.setRenderTarget(LRT[i]); renderer.setClearColor(0x000000, i === 0 ? 1 : 0); renderer.clear(true, true, true);
    renderer.shadowMap.needsUpdate = !!L.shadow && sun.castShadow;
    renderer.render(scene, c); used[i] = true;
    if (L.post) L.post();
  });
  amb.intensity = baseAmb;
  hideAll();
  const u = matComp.uniforms; const keys = [['s0', 'b0', 'm0'], ['s1', 'b1', 'm1'], ['s2', 'b2', 'm2']];
  st.layers.forEach((L, i) => {
    u[keys[i][0]].value = LRT[i].texture; const r = L.blur || 0;
    if (r > 0.3) { u[keys[i][1]].value = layerBlur(i, r); u[keys[i][2]].value = ss(0.3, 2.5, r); } else { u[keys[i][1]].value = LRT[i].texture; u[keys[i][2]].value = 0; }
  });
  u.u1.value = st.layers.length > 1 ? 1 : 0; u.u2.value = st.layers.length > 2 ? 1 : 0;
  if (!u.s1.value) u.s1.value = LRT[1].texture; if (!u.b1.value) u.b1.value = LRT[1].texture; if (!u.s2.value) u.s2.value = LRT[2].texture; if (!u.b2.value) u.b2.value = LRT[2].texture;
  pass(matComp, COMP);
  // bloom chain
  down(COMP, HB[0]); down(HB[0], B1[0], 1, POST.bloomTh, 0.6); blur2(B1[0], B1[1], B1[0], 2.0);
  down(B1[0], B2[0]); blur2(B2[0], B2[1], B2[0], 2.5);
  down(B2[0], B3[0]); blur2(B3[0], B3[1], B3[0], 3.0);
  if (POST.streakK > 0) { // anamorphic streak: wide horizontal blur of the brightest bits
    matBlur.uniforms.src.value = B2[0].texture; matBlur.uniforms.dir.value.set(6 / B2[0].width, 0); pass(matBlur, ST[0]);
    matBlur.uniforms.src.value = ST[0].texture; matBlur.uniforms.dir.value.set(16 / B2[0].width, 0); pass(matBlur, ST[1]);
  }
  const f = matFinal.uniforms;
  f.comp.value = COMP.texture; f.b1.value = B1[0].texture; f.b2.value = B2[0].texture; f.b3.value = B3[0].texture; f.st.value = ST[1].texture;
  f.exposure.value = POST.exposure; f.bloomK.value = POST.bloomK; f.streakK.value = POST.streakK; f.vign.value = POST.vign; f.grain.value = POST.grain; f.ca.value = POST.ca;
  f.frame.value = Math.round(t * FPS) % 997; f.sat.value = POST.sat; f.mb.value.set(POST.mb[0], POST.mb[1]); f.fadeK.value = POST.fade;
  f.tint.value.set(...POST.tint); f.lift.value.set(...POST.lift);
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
  pass(matFinal, null);
  document.getElementById('flash').style.opacity = clamp(POST.flash).toFixed(3);
}
window.renderAt = async (t) => {
  await window.__ready;
  stars.material.uniforms.uB.value = 1;
  renderFrame(t);
  updateCaptions(t); updateTitles(t); updateEnd(t); if (t >= 3.43 || t < TT(6) - 0.05) hookArc(t);
  if (!(t > 10.6 && t < 11.74)) callout('qso', false); if (!(t > 21.0 && t < 22.85)) { callout('corer', false); callout('gas', false); }
  document.getElementById('series').style.opacity = (t < 38.85 ? 0.8 : 0.8 * (1 - clamp((t - 38.85) / 0.3))).toFixed(3);
};
