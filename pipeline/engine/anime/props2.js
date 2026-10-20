// props2.js: props shared from the hand-built anime entry (number tag, canister, big paw, Night Shift from behind).
'use strict';
function bigPaw(close) {
  const c = clamp(close);
  cel(() => { ctx.beginPath(); ctx.ellipse(0, 0.82, 0.7, 0.36, 0, 0, Math.PI * 2); }, { fill: C.paper2, shade: C.paper3, shadeFn: () => ctx.rect(-1, 0.86, 2, 1), line: C.ink, lw: 0.035 });
  if (c < 0.5) {
    const palm = ellPts(0, 0.15, 0.62, 0.58, 14);
    cel(() => shapePath(palm, 1300), { fill: C.fur, keyline: C.paper, keyW: 0.05, shade: C.fur2, shadeFn: () => ctx.ellipse(-0.4, 0.4, 0.5, 0.5, 0, 0, Math.PI * 2) });
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.48 * (1 - c * 0.6);
      const d = lerp(0.84, 0.62, c * 2);
      const x = Math.cos(a) * d, y = 0.12 + Math.sin(a) * d;
      cel(() => shapePath(ellPts(x, y, 0.21, 0.25, 10, a + Math.PI / 2), 1310 + i), { fill: C.fur, keyline: C.paper, keyW: 0.04 });
      ctx.fillStyle = '#b5677a'; ctx.beginPath(); ctx.ellipse(x * 0.95, y + 0.02, 0.09, 0.11, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#b5677a'; shapePath([[-0.28, 0.32], [0, 0.12], [0.28, 0.32], [0.18, 0.5], [-0.18, 0.5]], 1320); ctx.fill();
  } else {
    // fist: knuckles toward the camera, fingers curled, thumb across
    cel(() => shapePath([[-0.62, -0.2], [-0.5, -0.42], [0.5, -0.42], [0.64, -0.2], [0.6, 0.45], [0.3, 0.62], [-0.35, 0.62], [-0.62, 0.42]], 1330), { fill: C.fur, keyline: C.paper, keyW: 0.06, shade: C.fur2, shadeFn: () => ctx.rect(-0.7, 0.2, 1.4, 0.5) });
    for (let i = 0; i < 4; i++) {
      const x = -0.42 + i * 0.28;
      cel(() => shapePath(ellPts(x, -0.3, 0.15, 0.13, 10), 1340 + i), { fill: C.fur3, line: C.paper, lw: 0.025 });
      inkLine([[x, -0.12], [x + 0.01, 0.12]], 1350 + i, { color: C.furLine, lw: 0.03 });
    }
    cel(() => shapePath([[-0.62, 0.22], [-0.1, 0.18], [0.18, 0.28], [0.1, 0.42], [-0.6, 0.45]], 1360), { fill: C.fur, line: C.paper, lw: 0.03 });
  }
}

function drawTag(x, y, txt, a, { size = 40, len = 70 } = {}) {
  // len < 0: the tag floats UP on its string (low gravity); the hole is always at the string end
  const upward = len < 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = C.paper; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
  ctx.font = `400 ${size}px "Dela Gothic One"`;
  const w = ctx.measureText(txt).width + 50, h = size * (upward ? 2.3 : 2.0);
  ctx.translate(0, upward ? len - h + 6 : len - 6);
  if (upward) { ctx.translate(0, h); ctx.scale(1, -1); }
  const shape = (o) => { ctx.beginPath(); ctx.moveTo(-w / 2 - o, 18); ctx.lineTo(-w / 2 + 20 - o, -o); ctx.lineTo(w / 2 - 20 + o, -o); ctx.lineTo(w / 2 + o, 18); ctx.lineTo(w / 2 + o, h + o); ctx.lineTo(-w / 2 - o, h + o); ctx.closePath(); };
  shape(6); ctx.fillStyle = C.ink; ctx.fill();
  shape(0); ctx.fillStyle = C.paper; ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 12, 6, 0, Math.PI * 2); ctx.fill();
  if (upward) { ctx.translate(0, h); ctx.scale(1, -1); }
  ctx.fillStyle = C.ink; ctx.fillText(txt, -w / 2 + 25, upward ? h * 0.52 : h * 0.8);
  regText(-w / 2 - 6, -6, w + 12, h + 12, 'tag', txt);
  ctx.restore();
}

function drawCanister(x, y, s, { tag = 1, rot = 0, text = '' } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); G.S = s;
  const lw = 4 / s;
  cel(() => { ctx.beginPath(); ctx.roundRect(-0.42, -0.55, 0.84, 1.15, 0.12); }, { fill: '#cfe3f0', shade: '#8fb0c4', shadeFn: () => ctx.rect(0.12, -0.6, 0.4, 1.3), line: C.ink, lw });
  // grains inside
  ctx.save(); ctx.beginPath(); ctx.roundRect(-0.42, -0.55, 0.84, 1.15, 0.12); ctx.clip();
  ctx.fillStyle = C.pho2; ctx.fillRect(-0.5, 0.2, 1, 0.5);
  for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? C.pho : C.pho4; ctx.beginPath(); ctx.arc(-0.36 + hash(i, 951, 1) * 0.72, 0.16 + hash(i, 952, 1) * 0.12, 0.05 + hash(i, 953, 1) * 0.04, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(-0.3, -0.45, 0.08, 0.9);
  ctx.restore();
  cel(() => { ctx.beginPath(); ctx.roundRect(-0.5, -0.78, 1.0, 0.28, 0.08); }, { fill: C.amber, shade: C.amber2, shadeFn: () => ctx.rect(-0.6, -0.62, 1.2, 0.2), line: C.ink, lw });
  ctx.restore();
  if (tag > 0 && text) {
    ctx.save(); ctx.globalAlpha *= clamp(tag);
    drawTag(x + s * 0.3 + 34, y + s * 0.5, text, 0.12 + Math.sin(G.t * 3.2) * 0.06, { size: 34, len: 46 });
    ctx.restore();
  }
}

function drawNSBack(x, y, size, { tilt = 0, earL = 0, earR = 0, rim = C.cyan } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(size, size); G.S = size;
  const seed = 1600;
  // shoulders (jacket back + stand-up collar)
  const jk = [[-0.55, 0.7], [-1.3, 1.05], [-1.75, 1.6], [-1.85, 3.2], [1.85, 3.2], [1.75, 1.6], [1.3, 1.05], [0.55, 0.7]];
  cel(() => shapePath(jk, seed), { fill: C.paper3, keyline: C.ink, keyW: 0.08, shade: '#8f887b', shadeFn: () => ctx.ellipse(-0.6, 2.3, 1.4, 1.5, 0, 0, Math.PI * 2) });
  ctx.save(); shapePath(jk, seed); ctx.clip(); ctx.strokeStyle = rim; ctx.lineWidth = 0.14; shapePath(jk.map(([a, b]) => [a + 0.05, b + 0.04]), seed); ctx.stroke(); ctx.restore();
  cel(() => shapePath([[-0.62, 0.62], [0.62, 0.62], [0.7, 1.05], [-0.7, 1.05]], seed + 1, { smooth: false }), { fill: C.paper2, line: C.ink, lw: 0.04 });
  // ears (backs: fur only)
  for (const [s, a] of [[-1, earL], [1, earR]]) {
    ctx.save(); ctx.translate(s * 0.6, -0.66); ctx.rotate(s * a);
    cel(() => shapePath([[s * -0.34, -0.12], [s * 0.05, -0.62], [s * 0.4, -0.86], [s * 0.36, -0.2], [s * 0.3, 0.14]], seed + 5 + s, { smooth: false }), { fill: C.fur, keyline: C.paper, keyW: 0.06 });
    ctx.restore();
  }
  const hp = () => shapePath(headPts(0), seed + 10);
  cel(hp, { fill: C.fur, keyline: C.paper, keyW: 0.1, shade: C.fur2, shadeFn: () => ctx.ellipse(-0.5, 0.5, 1.2, 1.1, 0, 0, Math.PI * 2) });
  ctx.save(); hp(); ctx.clip(); ctx.strokeStyle = rim; ctx.lineWidth = 0.2; ctx.translate(0.06, 0.06); hp(); ctx.stroke(); ctx.restore();
  // tuft from behind
  cel(() => shapePath([[-0.42, -0.6], [-0.5, -1.12], [-0.16, -0.96], [-0.08, -1.42], [0.16, -1.0], [0.5, -1.24], [0.36, -0.9], [0.46, -0.6]], seed + 20, { smooth: false }), { fill: C.fur, keyline: C.paper, keyW: 0.08 });
  // headset band over the crown and the cups
  const band = [[-1.02, -0.12], [-0.9, -0.55], [-0.5, -0.86], [0.5, -0.86], [0.9, -0.55], [1.02, -0.12]];
  inkLine(band, seed + 30, { color: C.ink, lw: 0.13 }); inkLine(band, seed + 30, { color: C.paper, lw: 0.08 });
  for (const s of [-1, 1]) cel(() => { ctx.beginPath(); ctx.roundRect(s * 1.04 - 0.12, -0.28, 0.24, 0.44, 0.09); }, { fill: C.paper, shade: C.paper3, shadeFn: () => ctx.rect(s * 1.04 - 0.12, -0.02, 0.24, 0.3), line: C.ink, lw: 0.035 });
  ctx.restore();
}

function phoPt(x, y, size, rot, px, py) { const c = Math.cos(rot), s = Math.sin(rot); return [x + (c * px - s * py) * size, y + (s * px + c * py) * size]; }
// manga insert panel: a diagonal strip with Night Shift's eyes in extreme close-up
function eyeStrip(f, f0, f1, { cy = 975, hh = 105, ang = -0.07, look = [0.5, 0.25] } = {}) {
  const k = E.out5(inv(f0, f0 + 5, f));
  if (k <= 0 || f >= f1) return;
  const ff = on2(f);
  ctx.save(); ctx.translate(540 + lerp(-1300, 0, k), cy); ctx.rotate(ang);
  ctx.fillStyle = C.ink; ctx.fillRect(-760, -hh - 18, 1520, 2 * hh + 36);
  ctx.fillStyle = C.paper; ctx.fillRect(-760, -hh - 9, 1520, 2 * hh + 18);
  ctx.beginPath(); ctx.rect(-760, -hh, 1520, 2 * hh); ctx.clip();
  const g = ctx.createLinearGradient(0, -hh, 0, hh); g.addColorStop(0, '#4a1014'); g.addColorStop(1, '#14060a'); ctx.fillStyle = g; ctx.fillRect(-760, -hh, 1520, 2 * hh);
  focusLines(-60, 20, 200, { n: 80, color: C.red, alpha: 0.55, seed: 611, wMax: 10, rate: 4, reach: 900 });
  const lid = lerp(0.1, 0.36, inv(f0 + 4, f0 + 12, ff));
  drawNSHead(-60 + (f - f0) * 1.6, 22, 470, { slant: 0.8, lidL: lid, lidR: lid, mouth: 'smirk', rim: C.red, glint: kf(ff, [[f0 + 6, 0], [f0 + 10, 0.75], [f1, 0.35]], E.out), look, brow: -0.1 });
  ctx.restore();
}

