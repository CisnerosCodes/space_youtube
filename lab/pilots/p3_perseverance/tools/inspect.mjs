// inspect.mjs: load anim.html headless, report errors, anchors, caption chunks, cues and the cat lint.
// usage: node tools/inspect.mjs [anim.html] [--lint]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.argv.find((a) => a.endsWith('.html')) ?? 'anim.html');
const doLint = process.argv.includes('--lint');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text()); });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(pathToFileURL(file).href + '?t=0', { waitUntil: 'networkidle' });
const info = await page.evaluate(async (doLint) => {
  await window.__ready;
  return {
    fonts: [document.fonts.check("800 40px 'Archivo'"), document.fonts.check("500 20px 'IBM Plex Mono'")],
    F: window.SD.F, NF: window.SD.NF,
    chunks: window.SD.CHUNKS.map((c) => `${c.f0}-${c.f1}: ` + c.lines.map((l) => l.map((w) => w.text).join(' ')).join(' / ') + '  ' + JSON.stringify(c.rects.map((r) => r[2]))),
    cues: window.CUES.length,
    lint: doLint ? window.SD.lintCat() : null,
  };
}, doLint);
const { lint, ...rest } = info;
console.log(JSON.stringify(rest, null, 1));
if (lint) {
  mkdirSync('out', { recursive: true });
  writeFileSync('out/cat_lint.json', JSON.stringify(lint, null, 1));
  console.log('cat windows', JSON.stringify(lint.windows), 'frames on', lint.framesOn, 'share', lint.share, 'hits', lint.hits.length);
  const byKind = {}; for (const h of lint.hits) (byKind[h.kind] ??= []).push(h.frame);
  for (const [kk, v] of Object.entries(byKind)) console.log(kk, v.length, 'frames:', v.slice(0, 40).join(','));
}
await browser.close();
