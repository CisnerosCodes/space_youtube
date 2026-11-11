// build.mjs: writes A.html, B.html, C.html (2400x1350 concept sheets) and thumb_*.html (1280x720)
// with the rig output baked in as static inline SVG. Usage: node build/build.mjs [A B C]
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAL, EXPR, EXPR_LABEL, EXPR_NOTE } from '../rig/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@500&display=block';

const BASE_CSS = `
:root{--ink:${PAL.ink};--paper:${PAL.paper};--amber:${PAL.amber};--muted:${PAL.muted};}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--ink);color:var(--paper)}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-weight:500;letter-spacing:.05em;text-transform:uppercase}
.disp{font-family:"Archivo",system-ui,sans-serif;font-weight:800;font-stretch:112%;text-transform:uppercase}
svg{display:block}
`;

const svg = (vb, inner, w, h, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${w}" height="${h}" ${extra}>${inner}</svg>`;

function sheet(rig, opts) {
  const { META, draw } = rig;
  const heroVB = opts.heroVB ?? [-340, -500, 680, 1060];
  const bustVB = opts.bustVB ?? [-310, -500, 620, 760];
  const faceVB = opts.faceVB ?? [-250, -460, 500, 440];
  const order = ['curious', 'excited', 'shocked', 'sad', 'skeptical'];
  const cells = order.map((k, i) => `
    <div class="cell">
      <div class="lab mono"><span class="num">0${i + 1}</span> ${EXPR_LABEL[k]}</div>
      <div class="art">${svg(bustVB, (opts.cellBg ? opts.cellBg(bustVB) : '') + draw(EXPR[k]), 470, 576)}</div>
      <div class="note mono">${EXPR_NOTE[k]}</div>
    </div>`).join('');
  const sizes = [[200, ''], [100, ''], [50, '']];
  const sizeCell = `
    <div class="cell size">
      <div class="lab mono"><span class="num">06</span> SIZE TEST</div>
      <div class="sizes">${sizes.map(([h, l]) => `<div class="sz"><div class="szart">${svg(faceVB, (opts.faceBg ? opts.faceBg(faceVB) : '') + draw(EXPR.shocked, { small: h < 80 }), Math.round(h * faceVB[2] / faceVB[3]), h)}</div><div class="mono szl">${h} PX</div></div>`).join('')}</div>
      <div class="sizes paperrow">${sizes.slice(1).map(([h]) => `<div class="sz"><div class="szart">${svg(faceVB, (opts.faceBg ? opts.faceBg(faceVB) : '') + draw(EXPR.curious, { small: h < 80 }), Math.round(h * faceVB[2] / faceVB[3]), h)}</div></div>`).join('')}</div>
      <div class="note mono">SAME RIG AT 200 / 100 / 50 PX</div>
    </div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=2400">
<title>Mascot ${META.id} ${META.name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())}</title>
<link rel="stylesheet" href="${FONTS}">
<style>${BASE_CSS}
body{width:2400px;height:1350px;overflow:hidden;position:relative}
.left{position:absolute;left:64px;top:56px;width:820px;height:1250px}
.kick{font-size:26px;line-height:34px;display:flex;align-items:center;gap:12px;color:var(--paper)}
.kick svg{flex:none}
.name{font-size:96px;line-height:92px;margin-top:22px;color:var(--paper)}
.name b{color:var(--amber);font-weight:800}
.desc{font-size:22px;line-height:30px;color:var(--muted);margin-top:18px;width:780px;text-transform:none;letter-spacing:.02em}
.hero{position:absolute;left:40px;bottom:0}
.heroLab{position:absolute;left:0;bottom:8px;font-size:20px;color:var(--muted)}
.grid{position:absolute;left:930px;top:56px;display:grid;grid-template-columns:repeat(3,470px);grid-template-rows:repeat(2,604px);gap:26px 20px}
.cell{position:relative;background:rgba(242,239,232,.045);overflow:hidden}
.lab{position:absolute;left:12px;top:10px;font-size:22px;line-height:30px;z-index:2;background:var(--ink);padding:2px 8px}
.num{color:var(--amber)}
.art{position:absolute;left:0;top:28px}
.note{position:absolute;left:12px;bottom:10px;font-size:16px;line-height:22px;color:var(--muted);z-index:2;background:var(--ink);padding:2px 8px}
.sizes{position:absolute;left:20px;top:84px;display:flex;align-items:flex-end;gap:22px}
.paperrow{top:380px;background:var(--paper);padding:16px 18px;left:20px;right:20px}
.szl{font-size:16px;color:var(--muted);margin-top:8px}
</style></head><body>
<div class="left">
  <div class="kick mono"><svg width="52" height="22" viewBox="0 0 104 44"><circle cx="22" cy="22" r="22" fill="${PAL.amber}"/><circle cx="82" cy="22" r="19" fill="none" stroke="${PAL.amber}" stroke-width="6"/></svg>SIGNAL DELAY · MASCOT DIRECTION ${META.id}</div>
  <div class="name disp">${META.id} · ${META.name}</div>
  <div class="desc mono">${META.line}</div>
  <div class="hero">${svg(heroVB, (opts.heroBg ? opts.heroBg(heroVB) : '') + draw(EXPR.neutral), Math.round(880 * heroVB[2] / heroVB[3]), 880)}</div>
  <div class="heroLab mono">00 FRONT · NEUTRAL</div>
</div>
<div class="grid">${cells}${sizeCell}</div>
</body></html>`;
}

function thumb(rig, t) {
  const { META, draw } = rig;
  const words = t.title;
  const vb = [-t.ox / t.scale, -t.oy / t.scale, 1280 / t.scale, 720 / t.scale];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1280">
<title>Thumb ${META.id} ${t.title.join(' ').toLowerCase()}</title>
<link rel="stylesheet" href="${FONTS}">
<style>${BASE_CSS}
body{width:1280px;height:720px;overflow:hidden;position:relative}
.photo{position:absolute;top:0;bottom:0;left:${t.photoX}px;right:0;background:url(${t.photo}) ${t.photoPos}/${t.photoSize ?? 'cover'} no-repeat}
.cat{position:absolute;left:0;top:0}
.title{position:absolute;left:${t.titleX}px;top:${t.titleY ?? 48}px;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.title span{display:block;background:rgba(11,11,12,.88);font-size:${t.size ?? 104}px;line-height:${Math.round((t.size ?? 104) * 0.98)}px;padding:6px 18px 2px 16px;color:var(--paper)}
.title span.a{color:var(--amber)}
.credit{text-transform:none;position:absolute;left:${t.creditX ?? t.photoX + 24}px;${t.creditTop ? 'top:24px' : 'bottom:24px'};background:var(--ink);font-size:20px;line-height:26px;padding:4px 10px}
</style></head><body>
<div class="photo"></div>
<div class="cat">${svg(vb, (t.catBg ? t.catBg(t.vb) : '') + draw(t.expr ? EXPR[t.expr] : EXPR.shocked, { thumb: true }), 1280, 720)}</div>
<div class="title disp">${words.map((w, i) => `<span${i === (t.amberIdx ?? -1) ? ' class="a"' : ''}>${w}</span>`).join('')}</div>
<div class="credit mono">${t.credit}</div>
</body></html>`;
}

export const CONF = {
  A: {
    sheet: {},
    thumb: {
      photo: '../assets/nasa/NHQ202211160014.jpg', photoPos: '51% 18%', photoX: 560, credit: 'NASA/Bill Ingalls',
      title: ['ARTEMIS', 'LIFTS OFF'], titleX: 600, titleY: 440, size: 98, creditTop: true,
      photoSize: 'auto 150%', ox: 300, oy: 660, scale: 1.18,
    },
  },
};

CONF.B = {
  sheet: {},
  thumb: {
    photo: '../assets/nasa/art001e002083.jpg', photoPos: '100% 55%', photoSize: 'auto 130%', photoX: 560, credit: 'NASA',
    title: ['EARTH', 'BEHIND MOON'], titleX: 600, titleY: 40, size: 100,
    ox: 290, oy: 700, scale: 1.1,
  },
};

CONF.C = {
  sheet: { heroVB: [-340, -490, 680, 1080] },
  thumb: {
    photo: '../assets/nasa/NHQ202211160014.jpg', photoPos: '50% 14%', photoSize: 'auto 165%', photoX: 560, credit: 'NASA/Bill Ingalls',
    title: ['1:47 A.M.', 'LIFTOFF'], amberIdx: 0, titleX: 600, titleY: 440, size: 104, creditTop: true,
    ox: 290, oy: 680, scale: 1.2,
  },
};

const which = process.argv.slice(2).length ? process.argv.slice(2) : ['A', 'B', 'C'];
for (const id of which) {
  const rig = await import(`../rig/cat${id}.mjs`);
  const conf = (rig.BUILD ?? CONF[id]);
  writeFileSync(path.join(ROOT, `${id}.html`), sheet(rig, conf.sheet ?? {}));
  writeFileSync(path.join(ROOT, `thumb_${id}.html`), thumb(rig, conf.thumb));
  console.log('built', id);
}
