// ---------- main: schedule, overlays, renderAt ----------
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

CREDIT_SCHED = [
  [0, 3.3, 'Illustration · facts: NASA', 0],
  [3.3, 4.79, 'Illustration · facts: JAXA', 0],
  [4.79, 5.25, 'Illustration · facts: JAXA', 1],
  [4.79, 7.47, PHOTO_CREDIT, 0],
  [7.47, 10.7, 'Illustration, not to scale · facts: NASA, ESA', 0],
  [10.7, 18.99, 'Illustration, not to scale · facts: DLR, ESA', 0],
  [18.99, 27.77, 'Illustration, not to scale · facts: JAXA, NASA', 0],
  [27.77, 30.8, 'Illustration, not to scale · facts: JAXA, ESA', 0],
  [30.8, 34.85, 'Illustration · facts: JAXA', 0],
  [34.85, 39.12, 'Illustration · facts: Launch Library 2', 0],
];

// paper dashes: the slow-motion collision course from Pho down to Mars
function drawCourse(ctx, t) {
  if (t < 1.79 || t > 3.3) return;
  const cam = spaceCam(t);
  const M = camM(cam, 1.25);
  const pts = quadLine([780, 1000], [990, 1240], [820, 1580], 26);
  const n = Math.floor(clamp(inv(1.79, 2.59, q2(t))) * pts.length);
  const fade = 1 - inv(3.2, 3.3, t);
  for (let i = 1; i < n; i += 2) {
    const a = pts[i - 1], b = pts[i];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    drawP(ctx, PC.dash, mPlace(M, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, ang), { lift: 10, alpha: fade });
  }
  if (n >= pts.length - 1) { const a = pts[pts.length - 2], b = pts[pts.length - 1]; drawP(ctx, PC.arrowHead, mPlace(M, b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0])), { lift: 12, alpha: fade }); }
}

function overlays(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // lamp falloff: the diorama is lit from above; edges fall into shadow
  const g = ctx.createRadialGradient(560, 820, 380, 540, 960, 1240);
  g.addColorStop(0, 'rgba(12,8,16,0)'); g.addColorStop(1, 'rgba(12,8,16,0.42)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // torn black mat around the box opening (nearest layer, its own slight parallax)
  G.light = { mode: 'dir', dx: 0.45, dy: 0.75, k: 1, a: 0.55 };
  const px = Math.sin(t * 0.37) * 3, py = Math.cos(t * 0.29) * 3;
  for (const P of PC.border) drawP(ctx, P, mT(px, py), { lift: 22 });
}

// impact frames: on the narrator's hardest hits the whole set flashes for one stop-motion step (2 frames) as a
// two-tone print, first amber paper with ink silhouettes, then the reverse. Captions, credits and the mat stay normal.
const HITS = [1.79, 4.35, 4.91, 20.14, 21.78, 29.54, 31.28];
// 'launched' sits 0.56 s before 'heist': it gets the dark print only (no amber inversion), so the launch second stays well under 3 flashes
const SOFT_HITS = new Set([4.35]);
const IMPACT = {};
function impactFrame(ctx, phase) {
  if (!IMPACT.c) { IMPACT.c = document.createElement('canvas'); IMPACT.c.width = W; IMPACT.c.height = H; IMPACT.g = IMPACT.c.getContext('2d'); }
  const g = IMPACT.g;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.filter = 'grayscale(1) brightness(1.3) contrast(9)'; g.drawImage(ctx.canvas, 0, 0); g.filter = 'none';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'copy'; ctx.drawImage(IMPACT.c, 0, 0);
  if (phase === 0) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = pat(ctx, 'amber', 77 + phase); ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = pat(ctx, 'ink', 78 + phase); ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function renderFrame(t) {
  G.t = t; G.F = frameOf(t); G.step = Math.floor(G.F / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0f1018'; ctx.fillRect(0, 0, W, H);
  if (t < 27.77 && !(t >= 3.56 && t < 4.72)) { shotSpace(ctx, t); drawCourse(ctx, t); if (t > 2.05 && t < 3.5) drawFate(ctx, t); }
  if (t >= 3.25 && t < 5.12) shotLaunch(ctx, t);
  if (t >= 27.77 && t < 31.0) shotEarth(ctx, t);
  if (t >= 30.7 && t < 35.1) shotLoot(ctx, t);
  if (t >= 38.7) shotEnd(ctx, t);
  if (t >= 34.5 && t < 39.25) shotNext(ctx, t);
  drawWipe(ctx, inv(27.52, 28.02, t));
  for (const h of HITS) { const d = G.F - Math.round(h * FPS); if (d === 0 || d === 1) impactFrame(ctx, SOFT_HITS.has(h) ? 1 : d); }
  overlays(ctx, t);
  drawUI(ctx, t);
  drawCaptions(ctx, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
}

async function loadAll() {
  const fams = ['800 80px Archivo', '600 28px "IBM Plex Mono"', '500 24px "IBM Plex Mono"', '400 30px "Special Elite"', '400 80px "Abril Fatface"', '400 30px "Patrick Hand"', '400 80px "Archivo Black"', '400 80px Bungee', '700 26px "IBM Plex Mono"'];
  await Promise.all(fams.map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  IMG.phobos = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = PHOTO_SRC; });
  buildBackdrop(); buildProps(); buildPho(); buildCat(); buildUI(); buildCaptions(); buildShots();
  PC.dash = new Piece({ shape: () => rectPts(-17, -7, 34, 14), paper: 'amber', edge: 'cut', res: 2, blur: 3, variants: 2 });
  PC.arrowHead = new Piece({ shape: () => [[24, 0], [-20, -24], [-11, 0], [-20, 24]], paper: 'amber', edge: 'cut', res: 2, blur: 3, variants: 2 });
}
const IMG = {};
window.__ready = loadAll();
window.renderAt = async function (t) { await window.__ready; renderFrame(t); };
// QA only: lay out the captions for time t and return their screen bounding box (no other drawing)
window.__capOnly = async function (t) { await window.__ready; G.t = t; G.F = frameOf(t); G.step = Math.floor(G.F / 2); drawCaptions(ctx, t); return window.__capBox; };
