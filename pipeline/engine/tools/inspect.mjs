// inspect.mjs <short_dir> <frame,...>: for each frame, the cat's box, the caption rects, the subject
// rects of the shots on screen, and which of them the cat overlaps. For fixing cat lint hits.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'lab/motion-ab-test/node_modules/playwright/index.mjs')).href);
const [dir, frames] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(pathToFileURL(path.resolve(dir, 'anim.html')).href + '?t=0', { waitUntil: 'networkidle' });
const out = await p.evaluate(async (frames) => {
  await window.__ready;
  const r = (a) => a.map((v) => Math.round(v));
  return frames.map((f) => {
    const cat = window.SD.cat, box = cat ? cat.box(f / 30) : null;
    const caps = E.captionRects(f).map(r), subj = [];
    for (const bt of E.visible(f)) for (const s of bt.shot.subjects?.(f) ?? []) subj.push({ beat: bt.id, rect: r(s) });
    const hit = (q) => box && Math.min(box[0] + box[2], q[0] + q[2]) - Math.max(box[0], q[0]) > 8 && Math.min(box[1] + box[3], q[1] + q[3]) - Math.max(box[1], q[1]) > 8;
    return { f, cat: box ? r(box) : null, caps: caps.map((c) => ({ rect: c, hit: hit([c[0] + 16, c[1] + 8, c[2] - 32, c[3] - 16]) })), subj: subj.map((s) => ({ ...s, hit: hit(s.rect) })) };
  });
}, frames.split(',').map(Number));
for (const o of out) console.log(JSON.stringify(o));
await b.close();
