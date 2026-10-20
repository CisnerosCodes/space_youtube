// ---------- 00_util.js: math, seeded noise, easing, keyframe tracks (all pure) ----------
const U = (() => {
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0), 0, 1);
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const ease = {
    lin: (t) => t,
    io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    out: (t) => 1 - Math.pow(1 - t, 3),
    out5: (t) => 1 - Math.pow(1 - t, 5),
    in: (t) => t * t * t,
    in2: (t) => t * t,
    outBack: (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outBig: (t) => { const c1 = 2.6, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    inBack: (t) => { const c1 = 1.7, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
    outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
    outBounce: (x) => {
      const n1 = 7.5625, d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
      if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
    },
  };
  // damped spring step response 0 -> 1 (overshoots), t in seconds
  const spring = (t, zeta = 0.42, f = 3.2) => {
    if (t <= 0) return 0;
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
  };
  // a bump 0 -> 1 -> 0 over [t0, t1]
  const bump = (t, t0, t1) => { const u = seg(t, t0, t1); return Math.sin(Math.PI * u); };
  // integer hash -> [0,1)
  const hashU = (n) => {
    let x = (n | 0) ^ 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
    x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  };
  const hash2 = (a, b) => hashU(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
  const hashS = (a, b = 0) => hash2(a, b) * 2 - 1; // [-1,1)
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // seeded improved Perlin noise 3D
  const perm = new Uint8Array(512);
  { const r = mulberry32(1337), p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  const noise3 = (x, y, z) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(lerp(lerp(grad(perm[AA] & 15, x, y, z), grad(perm[BA] & 15, x - 1, y, z), u),
      lerp(grad(perm[AB] & 15, x, y - 1, z), grad(perm[BB] & 15, x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1] & 15, x, y, z - 1), grad(perm[BA + 1] & 15, x - 1, y, z - 1), u),
        lerp(grad(perm[AB + 1] & 15, x, y - 1, z - 1), grad(perm[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
  };
  const fbm3 = (x, y, z, oct = 3) => { let a = 0.5, s = 0, f = 1; for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; };
  const n1 = (x, seed = 0) => noise3(x, seed * 7.31, seed * 3.17); // 1D smooth noise ~[-1,1]

  // pose time on twos (15 fps poses at 30 fps)
  const twos = (t) => Math.floor(t * 15 + 1e-6) / 15;
  const poseIndex = (t) => Math.floor(t * 15 + 1e-6);

  // keyframe track: keys [[t, value(number|array), easeName?], ...] sorted by t. Value eases INTO each key.
  const track = (keys) => (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i];
      if (t <= k[0]) {
        const p = keys[i - 1], u = (t - p[0]) / (k[0] - p[0]);
        const e = (ease[k[2] || 'io'])(u);
        if (Array.isArray(k[1])) return k[1].map((v, j) => lerp(p[1][j], v, e));
        return lerp(p[1], k[1], e);
      }
    }
    return keys[keys.length - 1][1];
  };
  // Catmull-Rom through points with a single eased parameter
  const catmull = (pts, u) => {
    const n = pts.length - 1, x = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
    return p1.map((_, j) => {
      const a = p0[j], b = p1[j], c = p2[j], d = p3[j];
      return 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    });
  };
  return { clamp, lerp, seg, smooth, ease, spring, bump, hashU, hash2, hashS, mulberry32, noise3, fbm3, n1, twos, poseIndex, track, catmull };
})();
