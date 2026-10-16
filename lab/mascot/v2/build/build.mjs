// build.mjs (v2): writes sheet.html, poses.html, thumb.html and talk.html into lab/mascot/v2
// with the rig output baked in (sheet, poses, thumb) or inlined as live code (talk).
// Usage: node build/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAL, EXPR, EXPR_ORDER, EXPR_LABEL, EXPR_NOTE } from '../rig/core.mjs';
import { META, drawCat, VIEW } from '../rig/catA.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@500&display=block';
const PHOTO = '../../assets/nasa/NHQ202211160003.jpg';
const CREDIT = 'NASA/Joel Kowsky';

const BASE_CSS = `
:root{--ink:${PAL.ink};--paper:${PAL.paper};--amber:${PAL.amber};--muted:${PAL.muted};}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--ink);color:var(--paper)}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-weight:500;letter-spacing:.05em;text-transform:uppercase}
.disp{font-family:"Archivo",system-ui,sans-serif;font-weight:800;font-stretch:112%;text-transform:uppercase}
svg{display:block}
`;
const head = (title, w, extra = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${w}">
<title>${title}</title><link rel="stylesheet" href="${FONTS}"><style>${BASE_CSS}${extra}</style></head>`;
const ECHO = (h) => `<svg width="${h * 104 / 44}" height="${h}" viewBox="0 0 104 44"><circle cx="22" cy="22" r="22" fill="${PAL.amber}"/><circle cx="82" cy="22" r="19" fill="none" stroke="${PAL.amber}" stroke-width="6"/></svg>`;

// ---------------------------------------------------------------- sheet (2400 x 1350)
function sheet() {
  const bust = [-350, -690, 700, 900];
  const cells = EXPR_ORDER.map((k, i) => `
    <div class="cell">
      <div class="lab mono"><span class="num">0${i + 1}</span> ${EXPR_LABEL[k]}</div>
      <div class="art">${drawCat({ expression: k }, { viewBox: [bust[0], bust[1] + (EXPR[k].bodyDy + EXPR[k].headDy) * 0.8, bust[2], bust[3]], width: 470, height: 604 })}</div>
      <div class="note mono">${EXPR_NOTE[k]}</div>
    </div>`).join('');
  const face = [-300, -580, 600, 540];
  const sz = (k, h, bg) => `<div class="sz">${drawCat({ expression: k }, { viewBox: face, height: h, width: Math.round(h * face[2] / face[3]), bg })}<div class="mono szl">${h} PX</div></div>`;
  return head('Mascot A Night Shift v2', 2400, `
body{width:2400px;height:1350px;overflow:hidden;position:relative}
.left{position:absolute;left:64px;top:56px;width:820px;height:1250px}
.kick{font-size:26px;line-height:34px;display:flex;align-items:center;gap:12px}
.name{font-size:96px;line-height:92px;margin-top:22px}
.name b{color:var(--amber);font-weight:800}
.desc{font-size:22px;line-height:30px;color:var(--muted);margin-top:18px;width:790px;text-transform:none;letter-spacing:.02em}
.hero{position:absolute;left:-10px;bottom:0}
.heroLab{position:absolute;left:0;bottom:8px;font-size:20px;color:var(--muted)}
.sizes{position:absolute;left:560px;top:420px;display:flex;flex-direction:column;gap:18px;align-items:flex-start}
.sizes .row{display:flex;gap:10px;align-items:flex-end}
.szl{font-size:15px;color:var(--muted);margin-top:6px;white-space:nowrap}
.sizesLab{font-size:16px;color:var(--muted)}
.grid{position:absolute;left:930px;top:56px;display:grid;grid-template-columns:repeat(3,470px);grid-template-rows:repeat(2,604px);gap:26px 20px}
.cell{position:relative;background:rgba(242,239,232,.045);overflow:hidden}
.lab{position:absolute;left:12px;top:10px;font-size:22px;line-height:30px;z-index:2;background:var(--ink);padding:2px 8px}
.num{color:var(--amber)}
.art{position:absolute;left:0;top:0}
.note{position:absolute;left:12px;bottom:10px;font-size:16px;line-height:22px;color:var(--muted);z-index:2;background:var(--ink);padding:2px 8px}
`) + `<body>
<div class="left">
  <div class="kick mono">${ECHO(22)}SIGNAL DELAY · MASCOT DIRECTION A · V2</div>
  <div class="name disp">A · NIGHT <b>SHIFT</b></div>
  <div class="desc mono">${META.line} Every face and pose below is a set of numbers in the rig.</div>
  <div class="hero">${drawCat({ expression: 'neutral' }, { viewBox: [-360, -600, 720, 1170], height: 900, width: Math.round(900 * 720 / 1170) })}</div>
  <div class="heroLab mono">00 FRONT · NEUTRAL</div>
  <div class="sizes">
    <div class="sizesLab mono">SIZE TEST</div>
    <div class="row">${sz('angry', 120)}${sz('angry', 64)}${sz('angry', 36)}</div>
    <div class="row">${sz('excited', 120)}${sz('excited', 64)}${sz('excited', 36)}</div>
    <div class="row">${sz('shocked', 120, PAL.paper)}${sz('shocked', 64, PAL.paper)}</div>
  </div>
</div>
<div class="grid">${cells}</div>
</body></html>`;
}

// ---------------------------------------------------------------- Short frame helpers (1080 x 1920)
const FRAME_CSS = `
.frame{position:relative;width:1080px;height:1920px;overflow:hidden;background:var(--ink)}
.frame .photo{position:absolute;inset:0;background:url(${PHOTO}) 50% 0/cover no-repeat}
.frame .cat{position:absolute;left:0;top:0}
.kicker{position:absolute;left:80px;top:246px;display:flex;align-items:center;gap:12px;background:var(--ink);padding:4px 12px 4px 10px;font-size:28px;line-height:36px}
.ticks{position:absolute;left:80px;top:220px;width:920px;display:flex;gap:8px}
.ticks i{flex:1;height:6px;background:rgba(242,239,232,.3)}
.ticks i.on{background:var(--amber)}
.cap{position:absolute;left:80px;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.cap span{display:block;background:rgba(11,11,12,.88);font-family:Archivo,system-ui,sans-serif;font-weight:700;font-size:90px;line-height:96px;padding:2px 20px 6px 18px}
.cap b{color:var(--amber);font-weight:700}
.credit{position:absolute;left:80px;top:1458px;background:var(--ink);font-size:24px;line-height:28px;padding:4px 10px;text-transform:none}
`;
const MARK_LAUNCH = `<svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 3 L26 25 L2 25 Z" fill="${PAL.amber}"/></svg>`;
const ticks = (k, on) => `<div class="ticks">${Array.from({ length: k }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div>`;

// Place a cat in frame pixels: rig point (0,0) lands at (x,y), `scale` px per rig unit.
function catAt(params, x, y, scale) {
  const vb = [-x / scale, -y / scale, 1080 / scale, 1920 / scale];
  return `<div class="cat">${drawCat(params, { viewBox: vb, width: 1080, height: 1920 })}</div>`;
}

// ---------------------------------------------------------------- poses (2400 x 1350, two frames at 0.62)
function poses() {
  // PEEK: the cat peeks over the top edge of the caption block; the edge is a real box edge.
  // Caption box top at y 1168; rig edgeY -40 maps there.
  const pkScale = 0.62, pkX = 450, capTop = 1168;
  const peekFrame = `<div class="frame">
    <div class="photo"></div>
    ${ticks(6, 2)}<div class="kicker mono">${MARK_LAUNCH}LAUNCH DAY</div>
    <div class="cap" style="top:${capTop}px"><span>Liftoff at <b>1:47</b></span><span>in the morning.</span></div>
    ${catAt({ expression: 'neutral', pose: 'peek', edgeY: -40, lookX: 0.45, lookY: -0.6, tail: 'up', state: { tilt: 6, earL: -8, earR: -14, browL: { dy: -22, a: -4 }, browR: { dy: -22, a: -4 }, mouth: { w: 34, sm: 0.9, op: 0.35, fang: 1 } } }, pkX, capTop + 40 * pkScale, pkScale)}
    <div class="credit mono">${CREDIT}</div>
  </div>`;
  // POINT: small presenter standing on the caption box, pointing up-right at the rocket.
  const ptScale = 0.5, ptX = 300;
  const pointFrame = `<div class="frame">
    <div class="photo"></div>
    ${ticks(6, 3)}<div class="kicker mono">${MARK_LAUNCH}LAUNCH DAY</div>
    <div class="cap" style="top:1168px"><span>This rocket</span><span>is <b>SLS</b>.</span></div>
    ${catAt({ expression: 'excited', pose: 'point', pointAngle: -42, lookX: 0.7, lookY: -0.5, state: { tilt: 8, lowL: 0, lowR: 0, pupil: 'round', pw: 1, browL: { dy: -30 }, browR: { dy: -30 }, fx: null, mouth: { w: 40, sm: 0.9, op: 0.5, fang: 1 } } }, ptX, 1168 - 542 * ptScale, ptScale)}
    <div class="credit mono">${CREDIT}</div>
  </div>`;
  const S = 0.62;
  return head('Mascot A Poses v2', 2400, FRAME_CSS + `
body{width:2400px;height:1350px;overflow:hidden;position:relative}
.wrap{position:absolute;top:96px;width:${1080 * S}px;height:${1920 * S}px;overflow:hidden}
.wrap .frame{transform:scale(${S});transform-origin:0 0}
.lab2{position:absolute;top:44px;font-size:24px;line-height:32px}
.lab2 .num{color:var(--amber)}
.side{position:absolute;left:1560px;top:96px;width:780px}
.side h1{font-size:76px;line-height:74px}
.side p{font-size:22px;line-height:32px;color:var(--muted);margin-top:22px;text-transform:none;letter-spacing:.02em}
.side code{color:var(--paper)}
`) + `<body>
<div class="lab2 mono" style="left:64px"><span class="num">01</span> PEEK · OVER ANY EDGE</div>
<div class="wrap" style="left:64px">${peekFrame}</div>
<div class="lab2 mono" style="left:${64 + 1080 * S + 48}px"><span class="num">02</span> POINT · ANY ANGLE</div>
<div class="wrap" style="left:${64 + 1080 * S + 48}px">${pointFrame}</div>
<div class="side">
  <div class="kick mono" style="display:flex;gap:12px;align-items:center;font-size:24px">${ECHO(20)}SIGNAL DELAY · PRESENTER POSES</div>
  <h1 class="disp" style="margin-top:24px">Small host,<br>big frame</h1>
  <p class="mono">Both frames are 1080 x 1920 Shorts at 62 percent, on the real photo with its credit, captions and kicker in their fixed slots.</p>
  <p class="mono"><code>pose: 'peek', edgeY</code> clips the body at any edge line and lays both paws over it. Here he leans on the top of the caption box, paws resting on it, so he never sits under the YouTube controls and never covers a word.</p>
  <p class="mono"><code>pose: 'point', pointAngle</code> aims the arm on that side; the cat is never mirrored, so the disc stays viewer-left and the ring viewer-right.</p>
</div>
</body></html>`;
}

// ---------------------------------------------------------------- thumb (1280 x 720)
function thumb() {
  const scale = 1.08, ox = 318, oy = 700;
  const vb = [-ox / scale, -oy / scale, 1280 / scale, 720 / scale];
  return head('Thumb A v2 liftoff', 1280, `
body{width:1280px;height:720px;overflow:hidden;position:relative}
.photo{position:absolute;top:0;bottom:0;left:600px;right:0;background:url(${PHOTO}) 50% 30%/100% auto no-repeat}
.cat{position:absolute;left:0;top:0}
.title{position:absolute;left:640px;top:396px;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.title span{display:block;background:rgba(11,11,12,.88);font-size:108px;line-height:104px;padding:6px 18px 2px 16px}
.title span.a{color:var(--amber)}
.credit{text-transform:none;position:absolute;left:624px;top:24px;background:var(--ink);font-size:20px;line-height:26px;padding:4px 10px}
`) + `<body>
<div class="photo"></div>
<div class="cat">${drawCat({ expression: 'shocked', lookX: 0.15, lookY: -0.1 }, { viewBox: vb, width: 1280, height: 720 })}</div>
<div class="title disp"><span class="a">1:47 A.M.</span><span>LIFTOFF</span></div>
<div class="credit mono">${CREDIT}</div>
</body></html>`;
}

// ---------------------------------------------------------------- talk (1080 x 1920, live rig, renderAt)
function talk() {
  const core = readFileSync(path.join(ROOT, 'rig/core.mjs'), 'utf8').replace(/^export /gm, '');
  const cat = readFileSync(path.join(ROOT, 'rig/catA.mjs'), 'utf8')
    .replace(/^import[\s\S]*?from '\.\/core\.mjs';\n/m, '').replace(/^export /gm, '');
  return head('Talk Test A v2', 1080, FRAME_CSS + `
body{width:1080px;height:1920px;overflow:hidden}
#stage .cat svg{display:block}
`) + `<body>
<div class="frame" id="stage">
  <div class="photo"></div>
  ${ticks(6, 1)}<div class="kicker mono">${MARK_LAUNCH}LAUNCH DAY</div>
  <div class="cat" id="cat"></div>
  <div class="cap" style="top:1168px"><span>Liftoff at <b>1:47</b></span><span>in the morning.</span></div>
  <div class="credit mono">${CREDIT}</div>
</div>
<script>
${core}
${cat}
// ---- talk test: 3 s at 30 fps. Everything is a pure function of t.
const SCALE = 0.85, X = 400, EDGE = 1168;
const vb = [-X / SCALE, -(EDGE + 40 * SCALE) / SCALE, 1080 / SCALE, 1920 / SCALE];
// syllable pattern: open/close pulses at about 5 per second, with two short pauses between words
function mouthAt(t) {
  const pauses = [[0.0, 0.18], [1.12, 1.4], [2.3, 2.52], [2.86, 3.1]];
  for (const [a, b] of pauses) if (t >= a && t < b) return 0;
  const syl = Math.max(0, Math.sin(t * Math.PI * 2 * 4.6));
  const accent = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.1 + 0.6));
  return Math.min(1, Math.pow(syl, 0.7) * accent);
}
// one blink: closes over 3 frames from t = 1.0, holds 1 frame, opens over 4
function blinkAt(t) {
  const f = t * 30 - 30;
  if (f < 0 || f > 8) return 0;
  return f < 3 ? f / 3 : f < 4 ? 1 : 1 - (f - 4) / 4;
}
// one ear twitch at t = 2.0: snaps out in 2 frames, settles back over 6 with a small overshoot
function twitchAt(t) {
  const f = t * 30 - 60;
  if (f < 0 || f > 9) return 0;
  if (f < 2) return f / 2;
  const u = (f - 2) / 7;
  return Math.cos(u * Math.PI * 1.5) * (1 - u);
}
function renderAt(t) {
  const m = mouthAt(t);
  const html = drawCat({
    expression: 'curious', pose: 'peek', edgeY: -40,
    lookX: -0.35 + 0.1 * Math.sin(t * 1.3), lookY: -0.35,
    blink: blinkAt(t), mouthOpen: m, earTwitch: twitchAt(t),
    tail: Math.sin(t * 2.4),
    state: { tilt: -6 + 2.5 * Math.sin(t * 2.2), headDy: -4 * m, lidL: 0, lidR: 0,
             browL: { dy: -20 - 6 * m, a: -6 }, browR: { dy: -14 - 6 * m, a: 4 },
             mouth: { w: 30, sm: 0.4, op: 0, rnd: 0 }, earR: 10, earL: -6 },
  }, { viewBox: vb, width: 1080, height: 1920 });
  document.getElementById('cat').innerHTML = html;
}
window.renderAt = renderAt;
window.__ready = (async () => {
  await document.fonts.ready;
  const img = new Image(); img.src = '${PHOTO}'; await img.decode().catch(() => null);
  const q = new URLSearchParams(location.search);
  renderAt(q.has('t') ? parseFloat(q.get('t')) || 0 : 0);
})();
</script>
</body></html>`;
}

writeFileSync(path.join(ROOT, 'sheet.html'), sheet());
writeFileSync(path.join(ROOT, 'poses.html'), poses());
writeFileSync(path.join(ROOT, 'thumb.html'), thumb());
writeFileSync(path.join(ROOT, 'talk.html'), talk());
console.log('built sheet.html poses.html thumb.html talk.html');
