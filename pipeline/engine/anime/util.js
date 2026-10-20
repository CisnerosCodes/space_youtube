// util.js: timeline helpers (anchors, keyframes, twos, smears, lip sync, blinks) and the per-frame
// registries the build checks read: text boxes (safe zone at rest), drawn photos and drawn illustrations
// (credit audit), caption word boxes (caption sync and bounds).
'use strict';
const sec = (f) => f / FPS;
const on2 = (f) => Math.floor(f / 2) * 2;     // character animation on twos
// keyframes on frames: kf(f, [[f0, v0], [f1, v1], ...], ease); values may be numbers or arrays
function kf(f, keys, ease = E.io) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const k = ease((f - a) / Math.max(1e-6, b - a)); return Array.isArray(va) ? va.map((x, j) => lerp(x, vb[j], k)) : lerp(va, vb, k); }
  }
  return keys[keys.length - 1][1];
}
// ghosting smear: draws fn(k) at n sub-steps behind, fading
function smear(fn, n, alpha0 = 0.35) { for (let i = n; i >= 1; i--) { ctx.save(); ctx.globalAlpha *= alpha0 * (1 - i / (n + 1)); fn(i / n); ctx.restore(); } fn(0); }

// ---------------------------------------------------------------- words and anchors
const WF = WORDS.map((w, i) => ({ ...w, i, f: Math.round(w.start * FPS), fe: Math.round(w.end * FPS), key: String(w.text).toLowerCase().replace(/[^a-z0-9]/g, '') }));
const AF = PLAN.anchors || {};
function A(s) {
  if (typeof s === 'number') return s;
  if (!(s in AF)) throw new Error('anime engine: anchor not resolved by the builder: ' + s);
  return AF[s];
}
const Ao = (s, d) => (s == null ? d : A(s));
const LASTW = WF[WF.length - 1];
const WM = LASTW.fe + 2;                                   // wordmark echo cue (sonic logo) just after the last word
const NF = Math.max(Math.ceil((PLAN.duration || 0) * FPS - 1e-6), LASTW.fe + 3 + 48);
const LAST = NF - 1;
const wf = (i) => WF[i].f;

// speech: mouth openness while a narration word is spoken (on twos)
function speak(f) {
  const t = sec(on2(f));
  for (const w of WF) if (t >= w.start && t < w.end) { const d = w.end - w.start, syl = Math.max(1, Math.round(d / 0.16)); return 0.25 + 0.55 * Math.abs(Math.sin(Math.PI * syl * (t - w.start) / d)); }
  return 0;
}
// blinks: seeded schedule, 4 frames
function blinkAt(f, seed = 3) {
  let s = 0, i = 0;
  while (s < f + 10) { s += 50 + Math.floor(hash(i, seed, 9) * 70); const d = f - s; if (d >= 0 && d < 4) return [0.6, 1, 1, 0.5][d]; i++; }
  return 0;
}

// ---------------------------------------------------------------- registries (read by the build checks)
// R.text: every text item drawn this frame, as a screen box, with moving = drawn during an entrance,
// an exit or a transition (only text at rest must sit inside x 80 to 900, y 260 to 1500).
// R.photos: asset names drawn on screen this frame. R.illus: sources of drawn illustrations on screen.
const R = { text: [], photos: new Set(), illus: new Set(), caps: [], moving: 0, source: null, cut: 0 };
function resetRegistry() { R.text = []; R.photos = new Set(); R.illus = new Set(); R.caps = []; R.moving = 0; }
function screenBox(x, y, w, h) {
  const m = ctx.getTransform();
  const p = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
const onScreen = (b) => b[2] > 0 && b[0] < W && b[3] > 0 && b[1] < H;
// register a text box in local coordinates; moving = it is still animating
function regText(x, y, w, h, kind, text, moving = false) {
  const b = screenBox(x, y, w, h);
  if (!onScreen(b) || ctx.globalAlpha < 0.05) return;
  R.text.push({ kind, text: String(text).slice(0, 40), x0: b[0], y0: b[1], x1: b[2], y1: b[3], moving: moving || R.moving > 0 || (G.shake || 0) > 1.5 });
}
// a real photo was drawn with this local box: it needs its credit on this frame
function regPhoto(name, x, y, w, h) { if (ctx.globalAlpha < 0.02) return; const b = screenBox(x, y, w, h); if (onScreen(b) && b[2] - b[0] > 4) R.photos.add(name); }
// a drawn illustration (spacecraft, rocket, rover, capsule, planet, diagram) is on screen
function regIllus(x, y, w, h) { if (ctx.globalAlpha < 0.02) return; const b = screenBox(x, y, w, h); if (onScreen(b)) R.illus.add(R.source || 'NASA'); }
