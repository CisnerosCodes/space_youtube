// export_cues.mjs: writes out/cues.json, the curated sound cue list (12 to 18 cues) in the format
// lab/sound/mix.py reads: [{frame, fps, type, sfx?, gain_db?, note}]. The list is computed inside
// anim.html from the same timeline that drives the picture (window.CUES).
// usage: node tools/export_cues.mjs [anim.html]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.argv[2] ?? 'anim.html');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(file).href + '?t=0', { waitUntil: 'networkidle' });
const cues = await page.evaluate(async () => { await window.__ready; return window.CUES; });
await browser.close();
mkdirSync('out', { recursive: true });
writeFileSync('out/cues.json', '[\n' + cues.map((c) => ' ' + JSON.stringify(c)).join(',\n') + '\n]\n');
console.log(`wrote out/cues.json: ${cues.length} cues`);
for (const c of cues) console.log(String(c.frame).padStart(5), (c.frame / 30).toFixed(2).padStart(6), c.type.padEnd(14), c.sfx ?? '', c.note);
