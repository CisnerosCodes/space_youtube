// export_cues.mjs: writes out/cues.json, the frame and type of every motion event that could take a sound.
// The list is computed inside anim.html from the same timeline that drives the picture (window.CUES).
// usage: node tools/export_cues.mjs [anim.html]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.argv[2] ?? 'anim.html');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(file).href + '?t=0', { waitUntil: 'networkidle' });
const res = await page.evaluate(async () => { await window.__ready; return { cues: window.CUES, frames: window.SD.NF, fps: window.SD.FPS }; });
await browser.close();
const cap = JSON.parse(readFileSync('captions.json', 'utf8'));
const out = {
  video: 'out/short_v2.mp4', fps: res.fps, frames: res.frames, duration: +(res.frames / res.fps).toFixed(4), narration: cap.audioPath,
  types: {
    hard_cut: 'a hard cut', slam: 'a giant number or word slams in', cat_in: 'mascot appears', cat_out: 'mascot leaves',
    chip_in: 'signal delay chip appears', echo_ring: 'the chip echo ring lands', next_card_in: 'NEXT card starts',
    wordmark_echo: 'wordmark dot, then its echo ring', whoosh: 'fast motion-blurred move or transition (optional sound)',
    impact: 'line-art impact', shatter: 'line-art break-up', ring_pulse: 'a small ring pulse', touchdown: 'line-art landing', punch_in: 'small punch-in',
  },
  cues: res.cues,
};
mkdirSync('out', { recursive: true });
writeFileSync('out/cues.json', JSON.stringify(out, null, 1));
console.log(`wrote out/cues.json: ${res.cues.length} cues`);
for (const c of res.cues) console.log(String(c.frame).padStart(5), c.t.toFixed(3).padStart(7), c.type.padEnd(14), c.note);
