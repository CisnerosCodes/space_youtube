// align_captions.mjs: build the caption schedule for anim.html.
// Caption WORDS come from the script; the transcript (words.json from the TTS aligner) gives TIMING only.
//
// usage: node align_captions.mjs <script.md> <words.json> [out.json]
//   script.md   the narration is every line that starts with "> " (Markdown quote), in order
//   words.json  { duration, words: [{ w, start, end }] }  (seconds)
//   out.json    default: ./captions.json next to this file
//
// Matching is in order and ignores case and punctuation; number words match digits
// ("fifty" = "50"), and "H-3" = "H3". Script words the transcript missed get a time
// interpolated inside the gap they fall in (between the neighbouring matched words).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [scriptPath, wordsPath, outPath = path.join(HERE, 'captions.json')] = process.argv.slice(2);
if (!scriptPath || !wordsPath) {
  console.error('usage: node align_captions.mjs <script.md> <words.json> [out.json]');
  process.exit(1);
}

const NUM = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, million: 1000000,
  first: '1st', second: '2nd', third: '3rd', nineteenth: '19th',
};
export function norm(w) {
  let s = String(w).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
  if (s in NUM) s = String(NUM[s]);
  return s;
}
// "million" is a word in "fifty million" and in the transcript; keep it as a word so both sides agree.
// p2: the transcript writes "one thousand" as "1" ",000" (",000" is mapped to "thousand" here, so both words
// are timed from the transcript) and "MeerKAT" as "Miracat" (left unmatched; it gets its time from the gap).
const normTok = (w) => (/^million$/i.test(String(w).replace(/[^a-z]/gi, '')) ? 'million' : /^,000$/.test(String(w)) ? '1000' : norm(w));

// ---------------------------------------------------------------- read inputs
const md = readFileSync(scriptPath, 'utf8');
const narration = md.split('\n').filter((l) => l.startsWith('> ')).map((l) => l.slice(2).trim()).join(' ');
const script = narration.split(/\s+/).filter(Boolean);
const tj = JSON.parse(readFileSync(wordsPath, 'utf8'));
const tr = tj.words;

// ---------------------------------------------------------------- order-preserving alignment (LCS)
const A = script.map(normTok), B = tr.map((x) => normTok(x.w));
const n = A.length, m = B.length;
const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
  L[i][j] = A[i] && A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
}
const match = new Array(n).fill(-1);
for (let i = 0, j = 0; i < n && j < m;) {
  if (A[i] && A[i] === B[j]) { match[i] = j; i++; j++; }
  else if (L[i + 1][j] >= L[i][j + 1]) i++;
  else j++;
}

// ---------------------------------------------------------------- times
const out = script.map((text, i) => ({ i, text, start: null, end: null, matched: match[i] >= 0, t: match[i] }));
for (const o of out) if (o.matched) { o.start = tr[o.t].start; o.end = tr[o.t].end; }
// interpolate runs of unmatched script words inside their gap
for (let i = 0; i < n;) {
  if (out[i].matched) { i++; continue; }
  let k = i; while (k < n && !out[k].matched) k++;
  const prev = out[i - 1], next = out[k];
  const g0 = prev ? prev.end : 0, g1 = next ? next.start : tj.duration;
  // weight each missing word by its letter count, so long words get more of the gap
  const w = out.slice(i, k).map((o) => Math.max(2, norm(o.text).length));
  const tot = w.reduce((a, b) => a + b, 0);
  let t = g0;
  for (let q = i; q < k; q++) {
    const d = ((g1 - g0) * w[q - i]) / tot;
    out[q].start = +t.toFixed(3); out[q].end = +(t + d).toFixed(3); t += d;
  }
  i = k;
}
const unmatchedTranscript = tr.map((x, j) => ({ j, w: x.w })).filter(({ j }) => !match.includes(j));

// the video is as long as the mp3 itself (words.json duration can be a little short)
const audioPath = path.join(path.dirname(path.resolve(wordsPath)), tj.audio || '');
let audioDuration = tj.duration;
if (tj.audio && existsSync(audioPath)) {
  try { audioDuration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioPath]).toString().trim()); }
  catch { console.warn('ffprobe failed; using words.json duration'); }
}

const result = {
  generated: new Date().toISOString().slice(0, 10),
  script: path.relative(HERE, path.resolve(scriptPath)),
  timing: path.relative(HERE, path.resolve(wordsPath)),
  audio: tj.audio,
  audioPath: path.relative(HERE, audioPath),
  duration: Math.max(audioDuration, tj.duration),
  transcriptDuration: tj.duration,
  words: out.map(({ i, text, start, end, matched, t }) => ({ i, text, start, end, matched, src: matched ? t : null })),
  interpolated: out.filter((o) => !o.matched).map((o) => o.text),
  transcriptOnly: unmatchedTranscript.map((x) => x.w),
};
writeFileSync(outPath, JSON.stringify(result, null, 1));
console.log(`wrote ${outPath}: ${out.length} script words, ${out.length - result.interpolated.length} timed from the transcript, `
  + `${result.interpolated.length} interpolated (${result.interpolated.join(' ') || 'none'}); transcript-only words: ${result.transcriptOnly.join(' ') || 'none'}`);
