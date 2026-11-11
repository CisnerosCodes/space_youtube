// stills.mjs: render chosen frames of page.html to JPEG/PNG for QA (one browser, SwiftShader WebGL).
// node tools/stills.mjs <page.html> <outdir> <frame,frame,...> [--half] [--png] [--crop=x,y,w,h]
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const [file, outdir, list] = args.filter((a) => !a.startsWith('--'));
const half = args.includes('--half');
const png = args.includes('--png');
const cropArg = args.find((a) => a.startsWith('--crop='));
const frames = list.split(',').map(Number);
mkdirSync(outdir, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: half ? 0.5 : 1 });
p.on('pageerror', (e) => console.log('pageerror', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
await p.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'load' });
await p.evaluate(async () => { await window.__ready; });
for (const f of frames) {
  const t0 = Date.now();
  await p.evaluate(async (t) => { await window.renderAt(t); }, f / 30);
  const opt = { type: png ? 'png' : 'jpeg', ...(png ? {} : { quality: 88 }) };
  if (cropArg) { const [x, y, w, h] = cropArg.split('=')[1].split(',').map(Number); opt.clip = { x, y, width: w, height: h }; }
  const out = path.join(outdir, `f${String(f).padStart(4, '0')}.${png ? 'png' : 'jpg'}`);
  await p.screenshot({ ...opt, path: out });
  console.log(out, Date.now() - t0, 'ms');
}
await b.close();
