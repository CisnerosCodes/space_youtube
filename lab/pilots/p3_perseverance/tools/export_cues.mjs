// export_cues.mjs: writes out/cues.json, the curated sound cue list computed inside anim.html from the
// same timeline that drives the picture (window.CUES). It is a plain list in lab/sound/mix.py's format
// ({frame, fps, type, sfx?, gain_db?}); "t" and "note" are for people and are ignored by the mixer.
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
writeFileSync('out/cues.json', JSON.stringify(cues, null, 1));
console.log(`wrote out/cues.json: ${cues.length} cues`);
for (const c of cues) console.log(String(c.frame).padStart(5), c.t.toFixed(3).padStart(7), c.type.padEnd(14), (c.sfx || '').padEnd(14), c.gain_db ?? '', c.note);
