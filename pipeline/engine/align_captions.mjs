// align_captions.mjs: build the caption schedule (captions.json) for the Downlink Cat engine.
// Caption WORDS come from the fact-checked script; the transcript of the voice (words.json from the
// TTS aligner, lab/voice/align.py) gives TIMING only.
//
// usage:
//   node pipeline/engine/align_captions.mjs <script.md|script.txt> <words.json> [out.json]
//        [--alias said=script]... [--aliases aliases.json] [--name "Two Words"]... [--strict]
//
//   script     the narration is every line that starts with "> " (Markdown quote), in order; a file
//              without such lines is read as plain narration (lines starting with "#" are skipped)
//   words.json { duration, audio?, words: [{ w, start, end }] } in seconds
//   out.json   default: captions.json next to words.json
//   --alias    a transcript spelling that means a script word ("checked=checks", "miracat=meerkat")
//   --aliases  a JSON object of the same pairs
//   --name     a two-word name the captions must never split across lines ("Downlink Cat" is built in;
//              two capitalized words inside a sentence are detected automatically)
//   --strict   also fail on substitutions and interpolations (default: warn)
//
// Matching is in order (a dynamic-programming alignment), ignores case and punctuation, and knows:
//   numbers      "fifteen" = "15", "one thousand" = "1" ",000" = "1,000", "five and a half" = "5.5"
//   split tokens the transcript's "28" ".10" and "600" ",000." are joined; "H" "-3" = "H-3" = "H3"
//   ordinals     "11th" = "11", "first" = "1st" = "1"
//   compounds    "out-drove" = "outdrove" = "out drove"
// It FAILS (exit 1) when script and transcript disagree, listing the words and times:
//   - script words the transcript does not have, in a gap over 1 s or a run over 2 words
//     (re-transcribe that gap with lab/voice/align.py on a clipped segment, then rerun)
//   - words the narrator said that are not in the script (re-voice, or fix the script)
//   - a substitution (the transcript heard a different word) longer than 3 words
// Short substitutions ("MeerKAT" heard as "Miracat") and short gaps are timed and reported as warnings.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const pos = [], ALIAS = {}, NAMES = ['Downlink Cat'];
let strict = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--strict') strict = true;
  else if (a === '--alias') { const [k, v] = String(argv[++i]).split('='); ALIAS[key0(k)] = key0(v); }
  else if (a === '--aliases') { for (const [k, v] of Object.entries(JSON.parse(readFileSync(argv[++i], 'utf8')))) ALIAS[key0(k)] = key0(v); }
  else if (a === '--name') NAMES.push(String(argv[++i]));
  else pos.push(a);
}
const [scriptPath, wordsPath, outArg] = pos;
if (!scriptPath || !wordsPath) {
  console.error('usage: node align_captions.mjs <script.md> <words.json> [out.json] [--alias said=script] [--aliases f.json] [--name "Two Words"] [--strict]');
  process.exit(2);
}
const outPath = path.resolve(outArg ?? path.join(path.dirname(path.resolve(wordsPath)), 'captions.json'));

// ---------------------------------------------------------------- normalization
const NUMW = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALE = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
const ORD = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};
// raw key: lowercase letters and digits only (keeps "." and "," inside numbers for the number parser)
function key0(w) { return String(w).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, ''); }
function key(w) {
  let s = key0(w);
  if (s in ALIAS) s = ALIAS[s];
  if (s in NUMW) return String(NUMW[s]);
  if (s in ORD) return String(ORD[s]);
  s = s.replace(/^(\d+)(st|nd|rd|th)$/, '$1');
  return s;
}
// A phrase's canonical form: its value when it is a number phrase ("one thousand", "1,000", "five and
// a half", "3 billion"), else its letters run together ("out drove" = "outdrove").
function numberValue(tokens) {
  const ts = tokens.map((t) => String(t).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9.,-]/g, '').replace(/[.,]+$/, ''))
    .flatMap((t) => t.split('-')).filter(Boolean);
  if (!ts.length) return null;
  let total = 0, cur = 0, any = false, half = false;
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (/^\d[\d,]*(\.\d+)?$/.test(t)) { cur += Number(t.replace(/,/g, '')); any = true; continue; }
    const tt = t.replace(/(st|nd|rd|th)$/, '');
    if (/^\d+$/.test(tt)) { cur += Number(tt); any = true; continue; }
    if (t in NUMW) { cur += NUMW[t]; any = true; continue; }
    if (t in ORD) { cur += ORD[t]; any = true; continue; }
    if (t in SCALE) {
      if (!any) return null;
      if (t === 'hundred') cur = (cur || 1) * 100;
      else { total += (cur || 1) * SCALE[t]; cur = 0; }
      continue;
    }
    if (t === 'and' && any) continue;
    if (t === 'a' && ts[i + 1] === 'half' && any) continue;
    if (t === 'half' && any) { half = true; continue; }
    return null;
  }
  if (!any) return null;
  return String(total + cur + (half ? 0.5 : 0));
}
const canon = (tokens) => numberValue(tokens) ?? tokens.map(key).join('');

// ---------------------------------------------------------------- read inputs
const md = readFileSync(scriptPath, 'utf8');
let lines = md.split('\n').filter((l) => l.startsWith('> ')).map((l) => l.slice(2).trim());
if (!lines.length) lines = md.split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.trim());
const script = lines.join(' ').split(/\s+/).filter(Boolean);
const tj = JSON.parse(readFileSync(wordsPath, 'utf8'));
// join tokens the transcript split: "28" ".10" -> "28.10", "600" ",000." -> "600,000.", "H" "-3" -> "H-3"
const tr = [];
for (let i = 0; i < tj.words.length; i++) {
  const w = tj.words[i], nx = tj.words[i + 1];
  if (nx && /^\d+$/.test(String(w.w).replace(/[^\d]/g, '')) && /\d$/.test(w.w) && /^[.,]\d/.test(nx.w)) {
    tr.push({ w: w.w + nx.w, start: w.start, end: nx.end, joined: [w.w, nx.w] }); i++; continue;
  }
  if (nx && /^[A-Za-z]{1,3}$/.test(w.w) && /^-\w/.test(nx.w)) { tr.push({ w: w.w + nx.w, start: w.start, end: nx.end, joined: [w.w, nx.w] }); i++; continue; }
  tr.push({ w: w.w, start: w.start, end: w.end });
}

// ---------------------------------------------------------------- alignment (dynamic programming)
const n = script.length, m = tr.length, MAXN = 4;
const SK = script.map(key), TK = tr.map((x) => key(x.w));
const INF = 1e9;
const cost = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF));
const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
cost[0][0] = 0;
for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
  const c = cost[i][j]; if (c >= INF) continue;
  const relax = (ii, jj, cc, op) => { if (ii <= n && jj <= m && cc < cost[ii][jj]) { cost[ii][jj] = cc; back[ii][jj] = { i, j, op }; } };
  if (i < n && j < m && SK[i] && SK[i] === TK[j]) relax(i + 1, j + 1, c, 'match');
  for (let a = 1; a <= MAXN && i + a <= n; a++) for (let b = 1; b <= MAXN && j + b <= m; b++) {
    if (a === 1 && b === 1) continue;
    if (canon(script.slice(i, i + a)) === canon(tr.slice(j, j + b).map((x) => x.w))) relax(i + a, j + b, c + 0.05 * (a + b - 2), 'phrase');
  }
  if (i < n) relax(i + 1, j, c + 1, 'skipS');
  if (j < m) relax(i, j + 1, c + 1, 'skipT');
}
const ops = [];
for (let i = n, j = m; i > 0 || j > 0;) { const b = back[i][j]; ops.unshift({ ...b, i1: i, j1: j }); i = b.i; j = b.j; }

// ---------------------------------------------------------------- times
const out = script.map((text, i) => ({ i, text, start: null, end: null, matched: false, src: null }));
const letters = (s) => Math.max(2, key0(s).length);
function spread(idx, t0, t1) {
  const w = idx.map((i) => letters(script[i])), tot = w.reduce((a, b) => a + b, 0);
  let t = t0;
  idx.forEach((i, q) => { const d = ((t1 - t0) * w[q]) / tot; out[i].start = +t.toFixed(3); out[i].end = +(t + d).toFixed(3); t += d; });
}
const usedT = new Array(m).fill(false);
for (const o of ops) {
  if (o.op === 'match') { const w = out[o.i], t = tr[o.j]; w.start = t.start; w.end = t.end; w.matched = true; w.src = o.j; usedT[o.j] = true; }
  if (o.op === 'phrase') {
    const idx = []; for (let i = o.i; i < o.i1; i++) idx.push(i);
    spread(idx, tr[o.j].start, tr[o.j1 - 1].end);
    for (const i of idx) { out[i].matched = true; out[i].src = o.j; out[i].phrase = tr.slice(o.j, o.j1).map((x) => x.w).join(' '); }
    for (let j = o.j; j < o.j1; j++) usedT[j] = true;
  }
}
// gaps: between two consecutive matched anchors, the unmatched script words and transcript words
const errors = [], warnings = [], substituted = [], interpolated = [];
const fmt = (s) => s.toFixed(2) + ' s';
{
  const anchors = ops.filter((o) => o.op === 'match' || o.op === 'phrase');
  const bounds = [{ i1: 0, j1: 0 }, ...anchors, { i: n, j: m }];
  for (let q = 0; q + 1 < bounds.length; q++) {
    const A = bounds[q], B = bounds[q + 1];
    const Su = [], Tu = [];
    for (let i = A.i1; i < B.i; i++) Su.push(i);
    for (let j = A.j1; j < B.j; j++) Tu.push(j);
    if (!Su.length && !Tu.length) continue;
    const g0 = A.j1 > 0 ? tr[A.j1 - 1].end : 0, g1 = B.j < m ? tr[B.j].start : tj.duration;
    if (Su.length && Tu.length) {
      const said = Tu.map((j) => tr[j].w).join(' '), want = Su.map((i) => script[i]).join(' ');
      if (Su.length <= 3 && Tu.length <= 3) {
        spread(Su, tr[Tu[0]].start, tr[Tu[Tu.length - 1]].end);
        Su.forEach((i) => { out[i].substituted = said; out[i].src = Tu[0]; });
        substituted.push({ script: want, heard: said, at: tr[Tu[0]].start });
        (strict ? errors : warnings).push(`substitution at ${fmt(tr[Tu[0]].start)}: script "${want}" was transcribed as "${said}" (timed from it; pass --alias ${key0(said.split(' ')[0])}=${key0(want.split(' ')[0])} if it is the same word)`);
      } else errors.push(`script and transcript disagree between ${fmt(g0)} and ${fmt(g1)}: script "${want}" / transcript "${said}"`);
    } else if (Su.length) {
      const want = Su.map((i) => script[i]).join(' ');
      if (g1 - g0 > 1.0 || Su.length > 2) errors.push(`the transcript has no words for script "${want}" in the gap ${fmt(g0)} to ${fmt(g1)} (${(g1 - g0).toFixed(2)} s). Re-transcribe that gap with lab/voice/align.py on a clipped segment, merge the words into words.json, then rerun.`);
      else {
        spread(Su, g0, g1); Su.forEach((i) => { out[i].interpolated = true; }); interpolated.push(want);
        (strict ? errors : warnings).push(`interpolated "${want}" inside ${fmt(g0)} to ${fmt(g1)} (the transcript has no word there)`);
      }
    } else {
      const said = Tu.map((j) => `"${tr[j].w}" (${fmt(tr[j].start)})`).join(', ');
      errors.push(`the narrator said words that are not in the script: ${said}. Re-voice the line or put the words in the script.`);
    }
  }
}
// monotonic check (a word may never start before the previous one)
for (let i = 1; i < n; i++) if (out[i].start != null && out[i - 1].start != null && out[i].start < out[i - 1].start - 1e-6) errors.push(`word ${i} "${out[i].text}" starts before word ${i - 1} "${out[i - 1].text}"`);

// ---------------------------------------------------------------- two-word names (never split across caption lines)
const endsSentence = (w) => /[.?!:]["”’)]?$/.test(w);
const isCap = (w) => /^[A-Z][A-Za-z0-9’'-]*/.test(w);
const names = [];
for (let i = 0; i + 1 < n; i++) {
  const a = script[i], b = script[i + 1], pair = `${key0(a)} ${key0(b)}`;
  const listed = NAMES.some((nm) => nm.toLowerCase().split(/\s+/).map(key0).join(' ') === pair);
  const auto = isCap(a) && isCap(b) && i > 0 && !endsSentence(script[i - 1]) && !/[,.;:?!]$/.test(a) && !/^(A|I|The|An)$/.test(a);
  if (listed || auto) { out[i].keep_with_next = true; names.push(`${a} ${b}`.replace(/[,.;:?!]+$/, '')); }
}

// ---------------------------------------------------------------- write
const audioPath = path.join(path.dirname(path.resolve(wordsPath)), tj.audio || '');
let audioDuration = tj.duration;
if (tj.audio && existsSync(audioPath)) {
  try { audioDuration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioPath]).toString().trim()); }
  catch { warnings.push('ffprobe failed; using the words.json duration'); }
}
const rel = (p) => path.relative(path.dirname(outPath), path.resolve(p));
const result = {
  generated: new Date().toISOString().slice(0, 10),
  aligner: 'pipeline/engine/align_captions.mjs',
  script: rel(scriptPath),
  timing: rel(wordsPath),
  audio: tj.audio ?? null,
  audioPath: tj.audio ? rel(audioPath) : null,
  duration: Math.max(audioDuration, tj.duration),
  transcriptDuration: tj.duration,
  words: out.map(({ i, text, start, end, matched, src, phrase, substituted: sb, interpolated: ip, keep_with_next }) => ({
    i, text, start, end, matched, src, ...(phrase ? { phrase } : {}), ...(sb ? { substituted: sb } : {}), ...(ip ? { interpolated: true } : {}), ...(keep_with_next ? { keep_with_next } : {}),
  })),
  names,
  interpolated,
  substituted,
  warnings,
};
for (const w of warnings) console.warn('warning:', w);
if (errors.length) {
  console.error(`align_captions FAILED: script and transcript disagree (${errors.length} problem${errors.length > 1 ? 's' : ''}):`);
  for (const e of errors) console.error('  - ' + e);
  console.error('Nothing was written.');
  process.exit(1);
}
writeFileSync(outPath, JSON.stringify(result, null, 1));
const nm = out.filter((o) => o.matched).length;
console.log(`wrote ${path.relative(process.cwd(), outPath)}: ${n} script words, ${nm} timed from the transcript, ${substituted.length} substituted, ${interpolated.length} interpolated; names kept together: ${names.join(', ') || 'none'}`);
