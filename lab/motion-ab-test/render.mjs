// render.mjs  usage: node render.mjs <file.html> <seconds> <fps> <outDir> [frames=0,24,48]
// Freezes the page at t = i / fps and saves each frame as a PNG (1080x1920, 9:16).
// Without a frames list it renders frames 0..N-1 and encodes <outDir>/video.mp4.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const [file, secs = '10', fps = '30', outDir = 'out', framesArg] = process.argv.slice(2);
if (!file) { console.error('usage: node render.mjs file.html secs fps outDir [frames=0,24]'); process.exit(1); }
const FPS = Number(fps), N = Math.round(Number(secs) * FPS);
const list = framesArg?.startsWith('frames=')
  ? framesArg.slice(7).split(',').map(Number)
  : [...Array(N).keys()];
const framesDir = path.join(outDir, framesArg ? 'stills' : 'frames');
mkdirSync(framesDir, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.resolve(file)).href + '?t=0', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; if (window.__ready) await window.__ready; });

for (const i of list) {
  await page.evaluate((t) => {
    if (window.renderAt) window.renderAt(t);
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; });
  }, i / FPS);
  await page.screenshot({ path: path.join(framesDir, `${String(i).padStart(4, '0')}.png`) });
}
await browser.close();

if (!framesArg) {
  const mp4 = path.join(outDir, 'video.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, '%04d.png'),
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', mp4]);
  // Contact sheet: every 15th frame, 5 across
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, '%04d.png'),
    '-vf', "select='not(mod(n\\,15))',scale=216:-1,tile=5x4", '-frames:v', '1', path.join(outDir, 'contact.png')]);
  console.log('wrote', mp4);
} else {
  console.log('wrote stills to', framesDir);
}
