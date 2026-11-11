// render_fast.mjs: frame-exact renderer that streams frames straight into ffmpeg (no PNG folder on disk).
// usage: node lab/ultra/render_fast.mjs <file.html> <seconds> <fps> <out.mp4> [--webgl] [--png] [--from=N --to=M]
//   --webgl   launch Chromium with SwiftShader WebGL (for three.js / canvas WebGL pages)
//   --png     lossless PNG frames into the pipe (slower; default is JPEG quality 95)
// The page must expose window.renderAt(t) (pure function of t). If it defines window.__ready (a promise), it is awaited.
//   --workers=K  split the frames across K parallel browser processes, then join the parts (default 1)
// Also writes <out>.contact.png (every 30th frame, 6 across).
import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const [file, secs, fpsArg, out] = args.filter((a) => !a.startsWith('--'));
if (!out) { console.error('usage: node render_fast.mjs file.html seconds fps out.mp4 [--webgl] [--png] [--from=N --to=M]'); process.exit(1); }
const FPS = Number(fpsArg), N = Math.round(Number(secs) * FPS);
const from = Number(opt('from') ?? 0), to = Number(opt('to') ?? N);
const usePng = flags.has('--png');
const workers = Number(opt('workers') ?? 1);
if (workers > 1 && !opt('from')) {
  // parent: run K children on contiguous chunks, then concatenate the parts losslessly
  const { writeFileSync, rmSync } = await import('node:fs');
  const self = new URL(import.meta.url).pathname;
  const pass = args.filter((a) => a.startsWith('--') && !a.startsWith('--workers'));
  const size = Math.ceil(N / workers), parts = [];
  const t0 = Date.now();
  await Promise.all([...Array(workers).keys()].map((k) => {
    const a = k * size, b = Math.min(N, a + size); if (a >= b) return null;
    const part = out.replace(/\.mp4$/, '') + `.part${k}.mp4`; parts.push(part);
    return new Promise((res, rej) => spawn('node', [self, file, secs, fpsArg, part, ...pass, `--from=${a}`, `--to=${b}`, '--nocontact'], { stdio: 'inherit' })
      .on('close', (c) => (c === 0 ? res() : rej(new Error('worker ' + k + ' failed')))));
  }));
  const list = out + '.parts.txt';
  writeFileSync(list, parts.sort().map((p) => `file '${path.resolve(p)}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  parts.forEach((p) => rmSync(p)); rmSync(list);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', `select='not(mod(n\\,${FPS}))',scale=180:-1,tile=6x6`, '-frames:v', '1', out.replace(/\.mp4$/, '') + '.contact.png']);
  console.log(`wrote ${out} (${N} frames, ${workers} workers, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  process.exit(0);
}

const launchArgs = flags.has('--webgl')
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']
  : [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: launchArgs });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.goto(pathToFileURL(path.resolve(file)).href + '?t=0', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; if (window.__ready) await window.__ready; });

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS),
  '-c:v', usePng ? 'png' : 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium',
  '-r', String(FPS), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));

const t0 = Date.now();
for (let i = from; i < to; i++) {
  await page.evaluate(async (t) => {
    if (window.renderAt) { const r = window.renderAt(t); if (r && r.then) await r; }
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; });
  }, i / FPS);
  const buf = await page.screenshot(usePng ? { type: 'png' } : { type: 'jpeg', quality: 95 });
  await write(buf);
  if ((i - from) % 150 === 0) console.log(`frame ${i}/${to} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
ff.stdin.end();
await new Promise((res) => ff.on('close', res));
await browser.close();
if (!flags.has('--nocontact')) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', `select='not(mod(n\\,${FPS}))',scale=180:-1,tile=6x6`,
  '-frames:v', '1', out.replace(/\.mp4$/, '') + '.contact.png']);
console.log(`wrote ${out} (${to - from} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
