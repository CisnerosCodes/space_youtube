// profile.mjs <short_dir> [step=10]: times renderAt for every step-th frame and reports the motion-blur
// sample count per frame and the slowest beats (render time per Short comes mostly from these).
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'lab/motion-ab-test/node_modules/playwright/index.mjs')).href);
const [dir, step = '10'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(pathToFileURL(path.resolve(dir, 'anim.html')).href + '?t=0', { waitUntil: 'networkidle' });
const rows = await p.evaluate(async (step) => {
  await window.__ready;
  const out = [];
  for (let f = 0; f < window.SD.NF; f += step) {
    const t0 = performance.now(); window.renderAt(f / 30); const ms = performance.now() - t0;
    out.push({ f, ms: Math.round(ms), n: window.SD.lastSamples(), beat: E.visible(f).map((x) => x.id).join('+') });
  }
  return out;
}, Number(step));
await b.close();
const by = {};
for (const r of rows) { const o = (by[r.beat] ??= { frames: 0, ms: 0, maxN: 0 }); o.frames++; o.ms += r.ms; o.maxN = Math.max(o.maxN, r.n); }
for (const [k, v] of Object.entries(by)) console.log(k.padEnd(28), 'avg', Math.round(v.ms / v.frames), 'ms', 'max samples', v.maxN);
console.log('mean renderAt', Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length), 'ms; slowest', rows.sort((a, b) => b.ms - a.ms).slice(0, 6).map((r) => `${r.f}:${r.ms}ms/n${r.n}`).join(' '));
