// build.mjs: turns a director's shot list into one self-contained anim.html (the render contract:
// window.renderAt(t), a pure function of t, 30 fps, 1080 x 1920) and out/cues.json for lab/sound/mix.py.
//
// usage: node pipeline/engine/build.mjs <short_dir> [--no-check] [--allow-lint]
//   "style": "anime" (default, lib/build_anime.mjs and anime/) or "classic" (this file, runtime/ and shots/)
//   reads  <short_dir>/shotlist.json, <short_dir>/captions.json (pipeline/engine/align_captions.mjs output),
//          the image files named in shotlist.assets (paths relative to <short_dir>)
//   writes <short_dir>/anim.html, <short_dir>/out/cues.json, <short_dir>/out/build_report.json
//
// Steps: validate the shot list against the narration (specific errors, nothing written on failure);
// prepare images (WebP, at most 3200 px, inlined); assemble the page from runtime/ and shots/ plus the
// v3 mascot bundle; then open it in headless Chromium to run the checks: boot errors, the cat lint
// (caption words, photo subjects, safe zone), the cat's share of the runtime (40 to 60%) and number of
// different moves (8 or more), text inside x 80 to 900 (giant numbers from x 40), empty bottom halves,
// and the curated cue list. Exit 1 when a check fails (anim.html is still written so stills can be looked at).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validate } from './lib/validate.mjs';
import { bundle } from '../../lab/mascot/v3/build/bundle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const args = process.argv.slice(2);
const shortDir = path.resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const noCheck = args.includes('--no-check'), allowLint = args.includes('--allow-lint');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const t0 = Date.now();

function fail(title, list) {
  console.error(`build FAILED: ${title}`);
  for (const e of list) console.error('  - ' + e);
  process.exit(1);
}

// ---------------------------------------------------------------- read and validate
const slPath = path.join(shortDir, 'shotlist.json');
if (!existsSync(slPath)) fail('no shot list', [`${slPath} does not exist`]);
let shotlist;
try { shotlist = JSON.parse(readFileSync(slPath, 'utf8')); } catch (e) { fail('shotlist.json is not valid JSON', [e.message]); }
// style: "anime" (the house style, the default) or "classic" (the flat v1 look with the v3 cat). A shot list
// written before the style layer (it has "cat" and no "style") is classic.
const style = shotlist.style ?? (shotlist.cat && !shotlist.cast ? 'classic' : 'anime');
if (!['anime', 'classic'].includes(style)) fail('unknown style', [`style: must be "anime" or "classic" (got ${JSON.stringify(shotlist.style)})`]);
if (style === 'anime') {
  const { buildAnime } = await import('./lib/build_anime.mjs');
  process.exit(await buildAnime(shortDir, { ...shotlist, style: 'anime' }, { noCheck, slPath }));
}
if (shotlist.style == null) console.warn('note: no "style" in the shot list; built as "classic" (it has a "cat" timeline). Add "style": "classic" to say so.');
const capPath = path.resolve(shortDir, shotlist.captions ?? 'captions.json');
if (!existsSync(capPath)) fail('no captions', [`${capPath} does not exist; run pipeline/engine/align_captions.mjs first`]);
const captions = JSON.parse(readFileSync(capPath, 'utf8'));
const { errors, warnings, anchors } = validate(shotlist, captions, shortDir, { bedsJson: path.join(ROOT, 'lab/sound/beds/beds.json') });
for (const w of warnings) console.warn('warning: ' + w);
if (errors.length) fail(`${errors.length} problem${errors.length > 1 ? 's' : ''} in ${path.relative(process.cwd(), slPath)}`, errors);

// ---------------------------------------------------------------- images
const outDir = path.join(shortDir, 'out');
const cacheDir = path.join(outDir, 'build');
mkdirSync(cacheDir, { recursive: true });
const used = new Set();
(function collect(node) {
  if (Array.isArray(node)) node.forEach(collect);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) { if (['image', 'icon'].includes(k) && typeof v === 'string') used.add(v); else collect(v); }
})(shotlist.beats);
const IMAGES = {};
for (const name of used) {
  const a = shotlist.assets[name];
  const src = path.resolve(shortDir, a.file);
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', src]).toString().trim();
  const [w, h] = probe.split('x').map(Number);
  const MAX = 3200, sc = Math.min(1, MAX / Math.max(w, h));
  let file = src, mime = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }[path.extname(src).toLowerCase()];
  if (sc < 1 || !mime) {
    const key = createHash('md5').update(src + statSync(src).mtimeMs + MAX).digest('hex').slice(0, 10);
    file = path.join(cacheDir, `${name}_${key}.webp`);
    if (!existsSync(file)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', `scale=${Math.round(w * sc)}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '90', file]);
    mime = 'image/webp';
  }
  IMAGES[name] = {
    src: `data:${mime};base64,` + readFileSync(file).toString('base64'),
    credit: a.credit, focus: a.focus ?? null, kind: a.kind ?? 'photo',
    crop: a.crop ? a.crop.map((v) => v * sc) : null,
  };
}

// ---------------------------------------------------------------- assemble the page
const { js: rig, info: rigInfo } = bundle();
const read = (p) => readFileSync(path.join(HERE, p), 'utf8');
const runtime = [read('runtime/core.js'), read('shots/number.js'), read('shots/photo.js'), read('shots/bars.js'), read('shots/diagram.js'), read('shots/points.js'), read('shots/cards.js'), read('runtime/boot.js')].join('\n');
const PLAN = { ...shotlist, anchors };
let html = read('runtime/page.html');
const put = (key, val) => { if (!html.includes(key)) throw new Error('placeholder missing: ' + key); html = html.replace(key, () => val); };
put('__TITLE__', String(shotlist.title).replace(/[<&]/g, ''));
put('__BUILDINFO__', `shotlist ${path.basename(slPath)}, captions ${path.basename(capPath)} (${captions.duration} s), mascot v3 ${rigInfo}, ${new Date().toISOString().slice(0, 10)}`);
put('/*__PLAN__*/null', JSON.stringify(PLAN));
put('/*__CAPTIONS__*/null', JSON.stringify(captions));
put('/*__IMAGES__*/null', JSON.stringify(IMAGES));
put('/*__RIG__*/', rig);
put('/*__RUNTIME__*/', runtime);
const htmlPath = path.join(shortDir, 'anim.html');
writeFileSync(htmlPath, html);
console.log(`wrote ${path.relative(process.cwd(), htmlPath)} (${(html.length / 1e6).toFixed(2)} MB; ${shotlist.beats.length} beats, ${Object.keys(IMAGES).length} images)`);
if (noCheck) process.exit(0);

// ---------------------------------------------------------------- checks in headless Chromium
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'lab/motion-ab-test/node_modules/playwright/index.mjs')).href);
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(e.message));
await page.goto(pathToFileURL(htmlPath).href + '?t=0', { waitUntil: 'networkidle' });
const res = await page.evaluate(async () => {
  try { await window.__ready; } catch (e) { return { boot: String(e && e.stack || e) }; }
  if (window.__bootError) return { boot: window.__bootError };
  const lint = window.SD.lintCat();
  return {
    NF: window.SD.NF, beats: window.SD.BEATS, cues: window.CUES, lint,
    layout: window.SD.checkLayout(), fill: window.SD.checkFill(),
    chunks: window.SD.CHUNKS.map((c) => ({ f0: c.f0, f1: c.f1, text: c.lines.map((l) => l.map((w) => w.text).join(' ')).join(' / ') })),
  };
});
await browser.close();
if (res.boot || consoleErrors.length) fail('the page did not start', [res.boot, ...consoleErrors].filter(Boolean));

const problems = [], notes = [];
const L = res.lint;
const ranges = (fs) => { const out = []; for (const f of fs) { const r = out[out.length - 1]; if (r && f <= r[1] + 1) r[1] = f; else out.push([f, f]); } return out.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', '); };
const hard = L.hits.filter((h) => !h.exempt && !h.transit && h.kind !== 'safe');
const transitHits = L.hits.filter((h) => !h.exempt && h.transit);
if (transitHits.length) notes.push(`cat crosses a subject mid-travel (hop, walk, skid...) on ${new Set(transitHits.map((h) => h.frame)).size} frames: ${ranges([...new Set(transitHits.map((h) => h.frame))])}; look at these stills`);
const byKind = {};
for (const h of hard) (byKind[h.kind] ??= []).push(h.frame);
for (const [kind, fs] of Object.entries(byKind)) (allowLint ? notes : problems).push(`cat covers a ${kind === 'caption' ? 'caption line' : 'photo subject or number'} on ${fs.length} frames: ${ranges(fs)} (move him with "to", or choose another spot; frames during entrances and exits are exempt)`);
const safeHits = L.hits.filter((h) => !h.exempt && h.kind === 'safe');
if (safeHits.length) notes.push(`cat leaves the safe zone on ${safeHits.length} frames outside entrances and exits: ${ranges(safeHits.map((h) => h.frame))}`);
if (L.share < 0.4 || L.share > 0.6) problems.push(`cat on screen ${(L.share * 100).toFixed(1)}% of the runtime (${L.framesOn} of ${res.NF} frames); the target is 40 to 60%. Windows: ${L.windows.map((w) => w.join('-')).join(', ')}`);
if (L.moves.length < 8) problems.push(`cat uses ${L.moves.length} different moves (${L.moves.join(', ')}); at least 8`);
const lay = res.layout;
if (lay.length) {
  const g = {}; for (const p of lay) (g[`${p.beat} ${p.kind}`] ??= []).push(p);
  for (const [k2, ps] of Object.entries(g)) problems.push(`text outside x 80 to 900 / y 240 to 1160 in beat ${k2.split(' ')[0]} (${k2.split(' ')[1]}): frames ${ranges(ps.map((p) => p.frame))}, e.g. ${JSON.stringify(ps[0].rect)}`);
}
const emptyB = {};
for (const x of res.fill) if (x.emptyShare > 0.4) (emptyB[x.beat] ??= []).push(x.frame);
for (const [b, fs] of Object.entries(emptyB)) notes.push(`beat ${b}: more than 40% of the band y 640 to 1150 is empty (no picture, no line art, no cat) on frames ${ranges(fs)} (fill the frame: a larger lens, a lower diagram, the cat)`);
const cueMin = Math.round((12 * res.NF) / (35 * 30)), cueMax = Math.round((18 * res.NF) / (35 * 30));
if (res.cues.length < cueMin || res.cues.length > cueMax) notes.push(`${res.cues.length} cues; ${cueMin} to ${cueMax} expected for ${(res.NF / 30).toFixed(1)} s`);

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'cues.json'), JSON.stringify(res.cues, null, 1));
const report = {
  built: new Date().toISOString(), shortDir: path.relative(ROOT, shortDir), frames: res.NF, seconds: +(res.NF / 30).toFixed(3), buildSeconds: +((Date.now() - t0) / 1000).toFixed(1),
  beats: res.beats, chunks: res.chunks, cues: res.cues.length,
  cat: { share: L.share, framesOn: L.framesOn, windows: L.windows, moves: L.moves, hits: L.hits.length, hardHits: hard.length, exemptHits: L.hits.filter((h) => h.exempt).length },
  problems, notes, warnings,
  qaFrames: [...new Set(res.beats.flatMap((b) => [b.T0, b.word, Math.min(res.NF - 1, b.T0 + (b.transition.N || 0)), Math.round((b.word + b.T1) / 2), Math.max(0, b.T1 - 1)]))].filter((f) => f >= 0 && f < res.NF).sort((a, b) => a - b),
};
writeFileSync(path.join(outDir, 'build_report.json'), JSON.stringify(report, null, 1));
writeFileSync(path.join(outDir, 'cat_lint.json'), JSON.stringify(L, null, 1));
console.log(`${res.NF} frames (${(res.NF / 30).toFixed(2)} s); ${res.beats.length} beats; ${res.cues.length} cues -> out/cues.json`);
console.log(`cat: ${(L.share * 100).toFixed(1)}% on screen, ${L.moves.length} different moves (${L.moves.join(', ')}); lint ${hard.length} frames, ${L.hits.filter((h) => h.exempt).length} exempt (entrances/exits)`);
for (const n of notes) console.log('note: ' + n);
console.log('QA frames (beat boundaries): ' + report.qaFrames.join(','));
if (problems.length) fail(`${problems.length} check${problems.length > 1 ? 's' : ''} failed (anim.html was written; see out/build_report.json)`, problems);
console.log(`build OK in ${report.buildSeconds} s`);
