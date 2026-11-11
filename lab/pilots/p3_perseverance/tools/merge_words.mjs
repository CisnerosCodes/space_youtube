// merge_words.mjs: writes voice.words.merged.json from voice.words.json (left untouched).
// 1. Joins number tokens the transcript split ("28" ".10" -> "28.10", "600" ",000." -> "600,000.").
// 2. Fills the 27.42 to 30.06 s gap, where the transcript dropped "Next stop, Idubi, to look for ancient".
//    The words come from a re-transcription of the clipped gap (lab/voice/align.py on work/gap_27.2.mp3,
//    27.2 to 30.9 s: "Next stop, Idubi, to look for ancient hot water systems."). Whisper's word times
//    inside that clip drift (it puts "hot" at 29.74 s; the full transcript and the waveform put it at
//    30.06 s), so each start below is the speech onset measured on the waveform (20 ms RMS, -35 dB),
//    taken in the re-transcription's word order.
import { readFileSync, writeFileSync } from 'node:fs';
const src = JSON.parse(readFileSync('voice.words.json', 'utf8'));
const out = [];
for (let i = 0; i < src.words.length; i++) {
  const w = src.words[i], nx = src.words[i + 1];
  if (nx && /^\d+$/.test(w.w) && /^[.,]\d/.test(nx.w)) { out.push({ w: w.w + nx.w, start: w.start, end: nx.end, joined: [w.w, nx.w] }); i++; continue; }
  out.push({ ...w });
}
const GAP = [
  ['Next', 27.86, 28.06], ['stop,', 28.10, 28.38], ['Idubi,', 28.44, 28.9], ['to', 29.08, 29.18],
  ['look', 29.18, 29.3], ['for', 29.34, 29.48], ['ancient', 29.56, 30.04],
].map(([w, start, end]) => ({ w, start, end, from: 'gap re-transcription (work/gap_27.2.words.json) + waveform onsets' }));
const k = out.findIndex((w) => w.w === 'hot');
out.splice(k, 0, ...GAP);
writeFileSync('voice.words.merged.json', JSON.stringify({ ...src, text: out.map((w) => w.w).join(' '), words: out, merged_from: 'voice.words.json via tools/merge_words.mjs' }, null, 1));
console.log(out.length, 'words; gap filled with', GAP.map((g) => g.w).join(' '));
