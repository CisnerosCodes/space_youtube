// build.mjs (v3): writes demo.html (live rig + actor, renderAt(t)), sheet.html and moves.html into
// lab/mascot/v3. The rig modules are bundled as nested scopes (M_core, M_cat, M_actor) so the
// pages work from file:// without a module loader.  Usage: node build/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PAL, EXPR, EXPR_ORDER, EXPR_LABEL, EXPR_NOTE } from '../rig/core.mjs';
import { META, drawCat } from '../rig/catA.mjs';
import { drawCat as drawCatV2 } from '../../v2/rig/catA.mjs';
import { Actor } from '../rig/actor.mjs';
import { bundle } from './bundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@500&display=block';
const md5 = (s) => createHash('md5').update(s).digest('hex').slice(0, 10);

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

// ---------------------------------------------------------------- demo (1080 x 1920)
function demo(B) {
  const scene = readFileSync(path.join(ROOT, 'src/demo.scene.js'), 'utf8');
  return head('Cat Acting Demo v3', 1080, 'body{width:1080px;height:1920px;overflow:hidden}') + `<body>
<svg id="stage" xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"></svg>
<script>
// rig: ${B.info}
${B.js}
${scene}
</script>
</body></html>`;
}

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
  const neckV = [-250, -330, 500, 520];
  const nk = (fn, lab) => `<div class="sz">${fn({ expression: 'neutral' }, { viewBox: neckV, width: 120, height: 125 })}<div class="mono szl">${lab}</div></div>`;
  return head('Mascot A Night Shift v3', 2400, `
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
  <div class="kick mono">${ECHO(22)}SIGNAL DELAY · MASCOT DIRECTION A · V3</div>
  <div class="name disp">A · NIGHT <b>SHIFT</b></div>
  <div class="desc mono">${META.line} V3: a sturdy neck in a stand-up collar.</div>
  <div class="hero">${drawCat({ expression: 'neutral' }, { viewBox: [-360, -600, 720, 1170], height: 900, width: Math.round(900 * 720 / 1170) })}</div>
  <div class="heroLab mono">00 FRONT · NEUTRAL</div>
  <div class="sizes">
    <div class="sizesLab mono">SIZE TEST</div>
    <div class="row">${sz('angry', 120)}${sz('angry', 64)}${sz('angry', 36)}</div>
    <div class="row">${sz('excited', 120)}${sz('excited', 64)}${sz('excited', 36)}</div>
    <div class="row">${sz('shocked', 120, PAL.paper)}${sz('shocked', 64, PAL.paper)}</div>
    <div class="sizesLab mono" style="margin-top:10px">NECK</div>
    <div class="row">${nk(drawCatV2, 'V2 · 46')}${nk(drawCat, 'V3 · 112 + COLLAR')}</div>
  </div>
</div>
<div class="grid">${cells}</div>
</body></html>`;
}

// ---------------------------------------------------------------- moves gallery (2400 x 1800)
// Each cell is a 600 x 560 world window with one short timeline frozen mid-move.
function moves() {
  const k = 0.3, gx = 300, gy = 470;  // ground point inside each cell
  const box = [60, gy, 300, 80];
  const cells = [
    ['SKID IN', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [gx, gy] }], 0.42, { cell: [-60, 0] }],
    ['DROP ON A TETHER', [{ t: 0, do: 'enter', how: 'drop', to: [gx, gy] }], 0.62],
    ['ZERO-G FLOAT IN', [{ t: 0, do: 'enter', how: 'float', from: 'left', to: [gx, gy] }], 0.9],
    ['POP UP FROM BEHIND', [{ t: 0, do: 'enter', how: 'pop', box: [140, gy, 320, 90], at: 0.5 }], 0.75, { boxes: [[140, gy, 320, 90]] }],
    ['ZIP OUT', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [180, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'exit', how: 'zip', to: 'right' }], 0.4],
    ['HOP · APEX TUCK', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [130, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'hop', to: [470, gy] }], 0.55],
    ['HOP · LANDING SQUASH', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [130, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'hop', to: [400, gy] }], 0.86],
    ['WALK CYCLE', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [140, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'walk', to: [460, gy] }], 0.62],
    ['DOT SCOOTER + ECHO', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [130, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'scoot', to: [470, gy] }], 0.95],
    ['SWING ON A LINE', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [110, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'swing', to: [480, gy], anchorY: -40 }], 0.85],
    ['JET PACK ARC', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [110, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'fly', to: [480, gy] }], 0.95],
    ['POINT', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [gx, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'point', at: [560, 80] }], 0.9, { target: [560, 80] }],
    ['WHAT', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [gx, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'what' }], 0.6],
    ['FACEPALM', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [gx, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'facepalm' }], 0.75],
    ['SHRUG', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [gx, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'shrug' }], 0.6],
    ['THUMBS UP', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [gx, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'thumbs' }], 0.7],
    ['SIGN', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [240, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'sign', text: '1:47', sub: 'A.M. LIFTOFF' }], 0.9],
    ['EXCITED BOUNCE', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [gx, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'bounce' }], 0.3],
    ['GASP', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [gx, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'gasp', at: [560, 300] }], 0.55],
    ['LISTEN · TILT', [{ t: 0, do: 'enter', how: 'skid', from: 'left', to: [gx, gy], slide: 0.01, dur: 0.02 }, { t: 0.1, do: 'listen' }], 0.9],
  ];
  const html = cells.map(([lab, tl, t, o = {}], i) => {
    // a zero-length skid only marks the start spot
    const st = tl[0].slide === 0.01 ? tl[0].to : [-300, gy];
    const cat = new Actor({ scale: k, seed: 3 + i, start: st });
    cat.timeline(tl[0].slide === 0.01 ? tl.slice(1) : tl);
    let inner = `<rect x="0" y="0" width="600" height="560" fill="${PAL.ink}"/>`;
    inner += `<line x1="0" y1="${gy + 1}" x2="600" y2="${gy + 1}" stroke="${PAL.muted}" stroke-width="2" stroke-dasharray="6 10"/>`;
    for (const b of o.boxes ?? []) inner += `<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" fill="${'#1A1A1B'}"/>`;
    const cat_ = cat.render(t);
    inner += cat_;
    if (o.target) inner += `<circle cx="${o.target[0]}" cy="${o.target[1]}" r="12" fill="${PAL.amber}"/>`;
    return `<div class="c"><svg viewBox="0 0 600 560" width="480" height="448">${inner}</svg><div class="l mono"><span>${String(i + 1).padStart(2, '0')}</span> ${lab}</div></div>`;
  }).join('');
  return head('Cat Move Library v3', 2400, `body{width:2400px;height:1792px;overflow:hidden;display:grid;grid-template-columns:repeat(5,480px)}
.c{position:relative;width:480px;height:448px;border-right:1px solid #222;border-bottom:1px solid #222;overflow:hidden}
.l{position:absolute;left:8px;top:6px;font-size:18px;background:var(--ink);padding:2px 6px}.l span{color:var(--amber)}`) + `<body>${html}</body></html>`;
}

const B = bundle();
writeFileSync(path.join(ROOT, 'demo.html'), demo(B));
writeFileSync(path.join(ROOT, 'sheet.html'), sheet());
writeFileSync(path.join(ROOT, 'moves.html'), moves());
console.log('built demo.html sheet.html moves.html; rig', B.info);
