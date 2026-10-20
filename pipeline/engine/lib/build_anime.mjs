// build_anime.mjs: the anime style of the engine (style "anime", the house default). Validates the shot list
// (lib/validate_anime.mjs), prepares the images (WebP, at most 2400 px, inlined; PNG alpha kept for
// cutouts), inlines the fonts and the anime runtime (pipeline/engine/anime/*.js) into one self-contained
// anim.html, then opens it in headless Chromium and checks EVERY frame:
//   - caption sync: every narration word is drawn within 2 frames of its spoken start (banded words too)
//   - caption bounds: every caption word's ink, pop included, inside x 80 to 900, y 260 to 1500
//   - text at rest: chips, labels, slams, tags, stamps, band words, SFX lettering, wordmark, credits inside
//     x 80 to 900, y 260 to 1500 on settled frames
//   - credit audit: on every frame where a real photo is drawn, its exact credit is in the credit slot;
//     on every frame where a drawn spacecraft, planet or diagram is on screen, an "Illustration" credit is
//   - flash limit: at most 3 impact frames in any second
// and notes Night Shift's share of the runtime and frames where an overlay character covers a photo subject.
// Writes anim.html, out/cues.json, out/build_report.json; exit 1 when a check fails (the page is still written).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validateAnime } from './validate_anime.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.resolve(HERE, '..');
const ROOT = path.resolve(ENGINE, '../..');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ORDER = ['core.js', 'util.js', 'props.js', 'props2.js', 'props3.js', 'chars.js', 'actor.js', 'text.js', 'shots.js', 'shots2.js', 'runtime.js', 'boot.js'];

function fail(title, list) {
  console.error(`build FAILED: ${title}`);
  for (const e of list) console.error('  - ' + e);
  process.exit(1);
}
const ranges = (fs) => { const out = []; for (const f of [...new Set(fs)].sort((a, b) => a - b)) { const r = out[out.length - 1]; if (r && f <= r[1] + 1) r[1] = f; else out.push([f, f]); } return out.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', '); };

export async function buildAnime(shortDir, shotlist, { noCheck = false, slPath } = {}) {
  const t0 = Date.now();
  const capPath = path.resolve(shortDir, shotlist.captions ?? 'captions.json');
  if (!existsSync(capPath)) fail('no captions', [`${capPath} does not exist; run pipeline/engine/align_captions.mjs first`]);
  const captions = JSON.parse(readFileSync(capPath, 'utf8'));
  const { errors, warnings, anchors } = validateAnime(shotlist, captions, shortDir, { bedsJson: path.join(ROOT, 'lab/sound/beds/beds.json') });
  for (const w of warnings) console.warn('warning: ' + w);
  if (errors.length) fail(`${errors.length} problem${errors.length > 1 ? 's' : ''} in ${path.relative(process.cwd(), slPath)}`, errors);

  // ---------------------------------------------------------------- images
  const outDir = path.join(shortDir, 'out'), cacheDir = path.join(outDir, 'build');
  mkdirSync(cacheDir, { recursive: true });
  const used = new Set();
  (function collect(node) {
    if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) { if (k === 'image' && typeof v === 'string') used.add(v); else collect(v); }
  })(shotlist.beats);
  const IMAGES = {};
  for (const name of used) {
    const a = shotlist.assets[name];
    const src = path.resolve(shortDir, a.file);
    const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', src]).toString().trim().split('x').map(Number);
    const MAX = 2400, sc = Math.min(1, MAX / Math.max(w, h));
    const key = createHash('md5').update(src + statSync(src).mtimeMs + MAX).digest('hex').slice(0, 10);
    const file = path.join(cacheDir, `${name}_${key}.webp`);
    if (!existsSync(file)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', `scale=${Math.round(w * sc)}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '90', file]);
    IMAGES[name] = { src: 'data:image/webp;base64,' + readFileSync(file).toString('base64'), credit: a.credit, focus: a.focus, fill: a.fill ?? null };
  }

  // ---------------------------------------------------------------- page
  const font = (f) => `url(data:font/woff2;base64,${readFileSync(path.join(ENGINE, 'anime/fonts', f)).toString('base64')}) format('woff2')`;
  const fonts = [
    `@font-face{font-family:'Archivo';src:${font('archivo.woff2')};font-weight:100 900;font-stretch:62% 125%;font-style:normal;font-display:block}`,
    `@font-face{font-family:'Archivo';src:${font('archivo-italic.woff2')};font-weight:100 900;font-stretch:62% 125%;font-style:italic;font-display:block}`,
    `@font-face{font-family:'Plex Mono';src:${font('plexmono-500.woff2')};font-weight:500;font-display:block}`,
    `@font-face{font-family:'Plex Mono';src:${font('plexmono-600.woff2')};font-weight:600;font-display:block}`,
    `@font-face{font-family:'Dela Gothic One';src:${font('delagothic-latin.woff2')};font-display:block;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`,
    `@font-face{font-family:'Dela Gothic One';src:${font('delagothic-kana.woff2')};font-display:block;unicode-range:U+3001-3002,U+3041-30FF,U+FF0C,U+FF0E}`,
    `@font-face{font-family:'Dela Gothic One';src:${font('delagothic-fw.woff2')};font-display:block;unicode-range:U+3000,U+300C-300D,U+FF01,U+FF08-FF09}`,
  ].join('\n');
  const js = ORDER.map((f) => `// ===== anime/${f} =====\n` + readFileSync(path.join(ENGINE, 'anime', f), 'utf8')).join('\n');
  const words = captions.words.map((w) => ({ text: w.text, start: w.start, end: w.end }));
  const PLAN = { ...shotlist, anchors, duration: captions.duration };
  let html = readFileSync(path.join(ENGINE, 'anime/page.html'), 'utf8');
  const put = (k, v) => { if (!html.includes(k)) throw new Error('placeholder missing: ' + k); html = html.replace(k, () => v); };
  put('__TITLE__', String(shotlist.title).replace(/[<&]/g, ''));
  put('__BUILDINFO__', `shotlist ${path.basename(slPath)}, captions ${path.basename(capPath)} (${captions.duration} s), ${new Date().toISOString().slice(0, 10)}`);
  put('/*__FONTS__*/', fonts);
  put('/*__PLAN__*/null', JSON.stringify(PLAN));
  put('/*__WORDS__*/null', JSON.stringify(words));
  put('/*__IMAGES__*/null', JSON.stringify(IMAGES));
  put('/*__RUNTIME__*/', js);
  const htmlPath = path.join(shortDir, 'anim.html');
  writeFileSync(htmlPath, html);
  console.log(`wrote ${path.relative(process.cwd(), htmlPath)} (${(html.length / 1e6).toFixed(2)} MB; style anime; ${shotlist.beats.length} beats, ${Object.keys(IMAGES).length} images)`);
  if (noCheck) return 0;

  // ---------------------------------------------------------------- every-frame checks in headless Chromium
  const { chromium } = await import(pathToFileURL(path.join(ROOT, 'lab/motion-ab-test/node_modules/playwright/index.mjs')).href);
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto(pathToFileURL(htmlPath).href + '?still=1', { waitUntil: 'networkidle' });
  const boot = await page.evaluate(async () => { try { await window.__ready; } catch (e) { return String(e && e.stack || e); } return window.__bootError || null; });
  if (boot || consoleErrors.length) { await browser.close(); fail('the page did not start', [boot, ...consoleErrors].filter(Boolean)); }
  const meta = await page.evaluate(() => ({ NF: AQ.NF, WM: AQ.WM, beats: AQ.beats(), chunks: AQ.chunks(), impacts: AQ.impacts(), actors: AQ.actors(), words: AQ.words(), cues: AQ.cues() }));
  const recs = [];
  for (let a = 0; a < meta.NF; a += 120) recs.push(...(await page.evaluate(([x, y]) => AQ.range(x, y), [a, Math.min(meta.NF, a + 120)])));
  await browser.close();
  if (consoleErrors.length) fail('the page threw while rendering', consoleErrors.slice(0, 5));

  const problems = [], notes = [];
  const S = { x0: 80, x1: 900, y0: 260, y1: 1500 }, tol = 2;
  const inside = (b) => b.x0 >= S.x0 - tol && b.x1 <= S.x1 + tol && b.y0 >= S.y0 - tol && b.y1 <= S.y1 + tol;
  // caption sync and bounds
  const first = {}, oob = [];
  for (const r of recs) for (const c of r.caps) { if (first[c.i] == null) first[c.i] = r.f; if (!inside(c) && !c.moving) oob.push({ f: r.f, i: c.i }); }
  const sync = meta.words.map((w) => ({ i: w.i, text: w.text, spoken: w.f, shown: first[w.i] ?? null, delta: first[w.i] == null ? null : first[w.i] - w.f }));
  const late = sync.filter((s) => s.delta == null || Math.abs(s.delta) > 2);
  if (late.length) problems.push(`caption sync: ${late.length} word(s) not drawn within 2 frames of their spoken start: ${late.slice(0, 6).map((s) => `"${s.text}" (spoken ${s.spoken}, shown ${s.shown})`).join(', ')}`);
  if (oob.length) problems.push(`caption bounds: ${oob.length} word-frames outside x 80 to 900, y 260 to 1500 (pop included), frames ${ranges(oob.map((o) => o.f)).slice(0, 200)}`);
  // text at rest
  const tb = {};
  for (const r of recs) { if (!r.settled) continue; for (const t of r.text) if (!inside(t)) (tb[`${r.beat} ${t.kind} "${t.text}"`] ??= []).push({ f: r.f, box: [t.x0, t.y0, t.x1, t.y1] }); }
  for (const [k, v] of Object.entries(tb)) problems.push(`text at rest outside x 80 to 900, y 260 to 1500: beat ${k}, frames ${ranges(v.map((x) => x.f))}, e.g. ${JSON.stringify(v[0].box)}`);
  // credit audit, every frame
  const missPhoto = [], missIllus = [];
  for (const r of recs) {
    const txt = r.lines.join('\n');
    for (const p of r.photos) if (!r.lines.some((l) => l.split(' · ').includes(p.credit))) missPhoto.push({ f: r.f, credit: p.credit });
    if (r.illus.length && !r.lines.some((l) => l.startsWith('Illustration'))) missIllus.push(r.f);
    void txt;
  }
  if (missPhoto.length) problems.push(`credit audit: a real photo is on screen without its credit on ${missPhoto.length} frames: ${ranges(missPhoto.map((m) => m.f))} (${[...new Set(missPhoto.map((m) => m.credit))].join(', ')})`);
  if (missIllus.length) problems.push(`credit audit: a drawn illustration is on screen without an "Illustration" credit on ${missIllus.length} frames: ${ranges(missIllus)}`);
  const longCred = recs.filter((r) => r.lines.length > 2).map((r) => r.f);
  if (longCred.length) notes.push(`the credit slot has 3 or more lines on frames ${ranges(longCred)}; captions are kept above 2 lines`);
  // flash limit
  let maxSec = 0; for (let f = 0; f < meta.NF; f++) maxSec = Math.max(maxSec, meta.impacts.filter((x) => x >= f && x < f + 30).length);
  if (maxSec > 3) problems.push(`flash limit: ${maxSec} impact frames in one second (at most 3)`);
  // Night Shift share and overlay lint
  const nsFrames = recs.filter((r) => r.ns).length;
  const share = nsFrames / meta.NF;
  if (share < 0.3) notes.push(`Night Shift is on screen ${(share * 100).toFixed(0)}% of the runtime; the house reference has him on about half (add a visit, a reaction or a band face)`);
  const cover = [];
  const area = (r) => Math.max(0, r[2]) * Math.max(0, r[3]);
  const inter = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])];
  for (const r of recs) {
    if (!r.settled || r.actorsMoving || !['hook', 'photo', 'compare'].includes(r.type)) continue;
    for (const box of [r.nsBox, r.phoBox].filter(Boolean)) for (const s of r.subjects) if (area(inter(box, s)) > 0.25 * area(s)) cover.push(r.f);
  }
  if (cover.length) notes.push(`an overlay character covers more than a quarter of a photo subject on ${cover.length} settled frames: ${ranges(cover)}; look at those stills`);
  const nsDistinct = meta.actors.ns?.distinct || [];
  if (meta.actors.ns && nsDistinct.length < 6) notes.push(`Night Shift uses ${nsDistinct.length} different overlay moves (${nsDistinct.join(', ')}); 6 or more reads as acting`);

  // ---------------------------------------------------------------- outputs
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'cues.json'), JSON.stringify(meta.cues, null, 1));
  // QA frames: beat boundaries and every narration line boundary (sentence starts) with the frame before
  const lineStarts = meta.words.filter((w, i) => i === 0 || /[.?!:]$/.test(meta.words[i - 1].text)).map((w) => w.f);
  const qa = new Set();
  for (const b of meta.beats) { qa.add(b.T0); qa.add(b.word); qa.add(b.T0 + b.N); qa.add(Math.round((b.word + b.T1) / 2)); qa.add(b.T1 - 1); }
  for (const f of lineStarts) { qa.add(f); qa.add(f - 1); qa.add(f + 6); }
  qa.add(meta.NF - 1);
  const report = {
    built: new Date().toISOString(), style: 'anime', shortDir: path.relative(ROOT, shortDir), frames: meta.NF, seconds: +(meta.NF / 30).toFixed(3), buildSeconds: +((Date.now() - t0) / 1000).toFixed(1),
    beats: meta.beats, chunks: meta.chunks, impacts: meta.impacts, cues: meta.cues.length,
    nightShift: { share: +share.toFixed(3), frames: nsFrames, overlay: meta.actors.ns, pho: meta.actors.pho },
    captionSync: { maxAbsDelta: Math.max(...sync.filter((s) => s.delta != null).map((s) => Math.abs(s.delta))), late: late.length, oobWordFrames: oob.length },
    creditAudit: { photoMisses: missPhoto.length, illustrationMisses: missIllus.length, framesWithPhoto: recs.filter((r) => r.photos.length).length, framesWithIllustration: recs.filter((r) => r.illus.length).length },
    maxImpactsPerSecond: maxSec, lineStarts,
    problems, notes, warnings,
    qaFrames: [...qa].filter((f) => f >= 0 && f < meta.NF).sort((a, b) => a - b),
  };
  writeFileSync(path.join(outDir, 'build_report.json'), JSON.stringify(report, null, 1));
  writeFileSync(path.join(outDir, 'caption_sync.json'), JSON.stringify({ maxAbsDiffFrames: report.captionSync.maxAbsDelta, outsideTwoFrames: late, rows: sync }, null, 1));
  console.log(`${meta.NF} frames (${(meta.NF / 30).toFixed(2)} s); ${meta.beats.length} beats; ${meta.impacts.length} impact frames (max ${maxSec}/s); ${meta.cues.length} cues -> out/cues.json`);
  console.log(`captions: max |shown - spoken| ${report.captionSync.maxAbsDelta} frames, ${oob.length} word-frames out of bounds; credits: ${report.creditAudit.framesWithPhoto} photo frames, ${report.creditAudit.framesWithIllustration} illustration frames, ${missPhoto.length + missIllus.length} misses`);
  console.log(`Night Shift: ${(share * 100).toFixed(0)}% of frames; overlay moves: ${nsDistinct.join(', ') || 'none'}`);
  for (const n of notes) console.log('note: ' + n);
  console.log('QA frames (beat and line boundaries): ' + report.qaFrames.join(','));
  if (problems.length) fail(`${problems.length} check${problems.length > 1 ? 's' : ''} failed (anim.html was written; see out/build_report.json)`, problems);
  console.log(`build OK in ${report.buildSeconds} s`);
  return 0;
}
