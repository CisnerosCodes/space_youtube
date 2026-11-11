// validate_anime.mjs: checks an anime shot list (style "anime") against the narration, with specific errors
// ("beats[3] (id 'blocks').shot.image: asset "x" is not in assets"), and resolves every word anchor to a frame.
// The truth checks that do not need a browser live here: anchors, beat order, transitions (hard cuts only on
// a hit or an impact), sources for drawn beats, photo credits and focus boxes, filler labels, numbers on
// screen that are not in the narration or the fact table, impact frames (at most 3 in any second), dates.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SERIES } from './validate.mjs';

export const A_SHOT_TYPES = ['hook', 'photo', 'number', 'craft', 'compare', 'diagram', 'react', 'band', 'next', 'end'];
export const A_TRANSITIONS = ['cut', 'whip', 'smash', 'iris'];
export const A_DIRS = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
export const PHOTO_FRAMES = ['full', 'panel', 'circle', 'cutout', 'monitor'];
export const CRAFTS = ['capsule', 'crew-capsule', 'rocket', 'rocket-slim', 'probe', 'rover', 'satellite'];
export const BACKDROPS = ['space', 'limb', 'sky', 'sea', 'pad', 'earth', 'mars', 'moon', 'phobos', 'plasma', 'focus', 'red', 'cyan', 'speed', 'rays', 'night', 'hq', 'ink'];
export const NS_MOVES = ['enter', 'exit', 'move', 'point', 'pump', 'fist', 'salute', 'wave', 'shrug', 'think', 'gasp', 'nod', 'lean', 'hold', 'wink', 'expr', 'look'];
export const NS_EXPRS = ['neutral', 'smirk', 'grin', 'happy', 'proud', 'shock', 'grit', 'wink', 'curious', 'worried', 'focus', 'meh'];
export const NS_PLACES = ['left', 'right', 'center', 'low-left', 'low-right', 'peek-right', 'peek-left', 'peek-right-low', 'peek-left-low', 'back'];
export const PHO_MOVES = ['enter', 'exit', 'move', 'expr', 'look', 'shake', 'sweat', 'piece'];
export const PHO_EXPRS = ['grumpy', 'alarm', 'furious', 'flinch'];
export const PHO_PLACES = ['top-right', 'top-left', 'right', 'left', 'center', 'inset-right', 'inset-left'];
const ANCHOR_KEYS = new Set(['start', 'at', 'until', 'value_at', 'downlink', 'cat', 'chip_at', 'close_at', 'piece_at', 'lean_at', 'impact']);
const ANCHOR_ARRAYS = new Set(['punch', 'impacts', 'words']);
const BANNED_TEXT = [/not\s+to\s+scale/i, /^\s*diagram\b/i, /\bprogress\b/i, /\bloading\b/i, /\btelemetry\b/i];
const FPS = 30;
const wordKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
// number tokens of a text: "4,000°F" -> ["4000"], "MID-70s" -> ["70"], "FRI 23 OCT" -> ["23"]
const numbers = (s) => (String(s).replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).map((x) => x.replace(/^0+(?=\d)/, ''));

export function validateAnime(S, captions, shortDir, { bedsJson } = {}) {
  const errors = [], warnings = [];
  const err = (p, m) => errors.push(`${p}: ${m}`);
  const warn = (p, m) => warnings.push(`${p}: ${m}`);
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
  const isStr = (x) => typeof x === 'string' && x.length > 0;
  const beatName = (i) => `beats[${i}]${S.beats?.[i]?.id ? ` (id '${S.beats[i].id}')` : ''}`;

  // ---------------------------------------------------------------- words and anchors
  const W = captions.words.map((w, i) => ({ i, text: w.text, key: wordKey(w.text), f: Math.round(w.start * FPS), fe: Math.round(w.end * FPS) }));
  const anchors = {};
  function resolveAnchor(p, a) {
    if (typeof a === 'number') { if (!Number.isInteger(a) || a < 0) err(p, `a frame number must be a whole number of at least 0 (got ${a})`); return a; }
    if (!isStr(a)) { err(p, `must be a word from the narration (got ${JSON.stringify(a)})`); return null; }
    if (a in anchors) return anchors[a];
    const m = /^(.+?)(?:#(\d+))?(@end)?(?:([+-]\d+)f)?$/.exec(a.trim());
    if (!m) { err(p, `cannot read anchor "${a}" (write "word", "word#2", "word@end" or "word+4f")`); return null; }
    const [, word, nth, atEnd, off] = m;
    const key = wordKey(word);
    if (!key) { err(p, `anchor "${a}" has no letters or digits`); return null; }
    const occ = W.filter((w) => w.key === key);
    if (!occ.length) {
      const near = W.filter((w) => w.key.startsWith(key.slice(0, 3)) || key.startsWith(w.key.slice(0, 3))).slice(0, 4).map((w) => `"${w.text}" (word ${w.i})`);
      err(p, `"${word}" is not a word of the narration${near.length ? `; close: ${near.join(', ')}` : ''}`); return null;
    }
    let w;
    if (nth) { w = occ[Number(nth) - 1]; if (!w) { err(p, `"${word}" occurs ${occ.length} time(s); "#${nth}" does not exist`); return null; } }
    else { if (occ.length > 1) { err(p, `"${word}" occurs ${occ.length} times (words ${occ.map((o) => o.i).join(', ')}); write "${word}#1" to "${word}#${occ.length}"`); return null; } w = occ[0]; }
    anchors[a] = Math.max(0, (atEnd ? w.fe : w.f) + (off ? Number(off) : 0));
    return anchors[a];
  }
  function walkAnchors(node, p) {
    if (Array.isArray(node)) { node.forEach((x, i) => walkAnchors(x, `${p}[${i}]`)); return; }
    if (!isObj(node)) return;
    for (const [k, v] of Object.entries(node)) {
      const q = `${p}.${k}`;
      if (ANCHOR_KEYS.has(k) && (typeof v === 'string' || typeof v === 'number')) resolveAnchor(q, v);
      else if (ANCHOR_ARRAYS.has(k) && Array.isArray(v)) v.forEach((x, i) => (x == null ? null : resolveAnchor(`${q}[${i}]`, x)));
      else walkAnchors(v, q);
    }
  }
  const fr = (a) => (a == null ? null : typeof a === 'number' ? a : anchors[a]);

  // ---------------------------------------------------------------- facts for the numbers check
  const factText = [captions.words.map((w) => w.text).join(' ')];
  for (const fpath of [].concat(S.facts || [])) {
    const p = path.resolve(shortDir, fpath);
    if (!existsSync(p)) err('facts', `file not found: ${p}`); else factText.push(readFileSync(p, 'utf8'));
  }
  if (!S.facts) warn('facts', 'no fact table given ("facts": "factcheck.md"); numbers on screen are checked against the narration only');
  const knownNums = new Set(numbers(factText.join(' ')));
  const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, twenty: 20, hundred: 100 };
  for (const m of factText.join(' ').toLowerCase().matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|hundred)\b/g)) knownNums.add(String(NUMW[m[1]]));
  const textCheck = (p, t) => {
    if (t == null) return;
    const s = typeof t === 'string' ? t : t.t;
    if (!isStr(s)) { err(p, 'must be text'); return; }
    if (BANNED_TEXT.some((re) => re.test(s))) err(p, `"${s}" is a filler label; on-screen text carries facts only`);
    for (const n of numbers(s)) if (!knownNums.has(n)) err(p, `the number ${n} in "${s}" is not in the narration or the fact table; every number on screen needs a source`);
  };

  // ---------------------------------------------------------------- top level
  if (S.version !== 1) err('version', 'must be 1');
  if (S.style !== 'anime') err('style', 'must be "anime" here');
  if (!SERIES.includes(S.series)) err('series', `must be one of ${SERIES.map((s) => `"${s}"`).join(', ')}`);
  if (!isStr(S.title)) err('title', 'a short page title (2 to 4 words) is required');
  if (!isStr(S.bed)) err('bed', 'the music bed name is required');
  else if (bedsJson) {
    const beds = JSON.parse(readFileSync(bedsJson, 'utf8')); const names = (beds.beds || []).map((b) => b.id);
    if (!names.includes(S.bed)) err('bed', `"${S.bed}" is not in lab/sound/beds/beds.json (have: ${names.join(', ')})`);
  }
  for (const [i, s] of (S.stress ?? []).entries()) if (!W.some((w) => w.key === wordKey(s))) err(`stress[${i}]`, `"${s}" is not a word of the narration`);

  // ---------------------------------------------------------------- assets
  const assets = S.assets ?? {};
  for (const [name, a] of Object.entries(assets)) {
    const p = `assets.${name}`;
    if (!isObj(a)) { err(p, 'must be { file, credit, focus }'); continue; }
    if (!isStr(a.file)) err(`${p}.file`, 'is required'); else if (!existsSync(path.resolve(shortDir, a.file))) err(`${p}.file`, `file not found: ${path.resolve(shortDir, a.file)}`);
    if (!isStr(a.credit)) err(`${p}.credit`, 'is required: the credit exactly as the source gives it');
    if (a.credit && /^illustration/i.test(a.credit)) err(`${p}.credit`, 'a real photo credit, not "Illustration"');
    if (!Array.isArray(a.focus) || a.focus.length !== 4 || !a.focus.every(isNum) || a.focus.some((v) => v < 0 || v > 1) || a.focus[0] + a.focus[2] > 1.001 || a.focus[1] + a.focus[3] > 1.001) err(`${p}.focus`, 'is required: [x, y, w, h] of the subject as fractions 0..1 of the image');
  }
  const assetRef = (p, n) => { if (!isStr(n)) err(p, 'must name an asset'); else if (!assets[n]) err(p, `asset "${n}" is not in assets (have: ${Object.keys(assets).join(', ') || 'none'})`); };

  // ---------------------------------------------------------------- beats
  const beats = S.beats ?? [];
  if (!Array.isArray(beats) || beats.length < 4) err('beats', 'at least four beats: a hook, a story beat, the NEXT beat and the end card');
  const ids = new Set();
  beats.forEach((b, i) => {
    const p = beatName(i);
    if (!isObj(b)) { err(p, 'must be an object'); return; }
    if (!isStr(b.id)) err(`${p}.id`, 'is required'); else { if (ids.has(b.id)) err(`${p}.id`, `"${b.id}" is used twice`); ids.add(b.id); }
    if (b.start == null) err(`${p}.start`, 'is required: the narration word the beat lands on');
    const sh = b.shot;
    if (!isObj(sh)) { err(`${p}.shot`, 'is required'); return; }
    if (!A_SHOT_TYPES.includes(sh.type)) { err(`${p}.shot.type`, `must be one of ${A_SHOT_TYPES.join(', ')} (got ${JSON.stringify(sh.type)})`); return; }
    if (i === 0 && sh.type !== 'hook') err(`${p}.shot.type`, 'the first beat must be a "hook" (on a real photo)');
    if (i > 0 && sh.type === 'hook') err(`${p}.shot.type`, 'only the first beat is the hook (use "photo")');
    if (i === beats.length - 1 && sh.type !== 'end') err(`${p}.shot.type`, 'the last beat must be the end card ("end")');
    if (i < beats.length - 1 && sh.type === 'end') err(`${p}.shot.type`, 'the end card must be the last beat');
    const q = `${p}.shot`;
    // transitions
    const t = b.transition;
    if (i === 0 && t != null) err(`${p}.transition`, 'the hook has no transition');
    if (sh.type === 'band' && t != null) err(`${p}.transition`, 'a band is its own transition (it wipes in and out); remove "transition"');
    if (i > 0 && beats[i - 1]?.shot?.type === 'band' && t != null) err(`${p}.transition`, 'the band before this beat reveals it; remove "transition"');
    if (t != null) {
      if (!isObj(t) || !A_TRANSITIONS.includes(t.type)) err(`${p}.transition.type`, `must be one of ${A_TRANSITIONS.join(', ')}`);
      if (t.type === 'whip' && t.dir != null && !A_DIRS.includes(t.dir)) err(`${p}.transition.dir`, `must be one of ${A_DIRS.join(', ')}`);
      if (t.frames != null && (!Number.isInteger(t.frames) || t.frames < 6 || t.frames > 16)) err(`${p}.transition.frames`, '6 to 16 frames');
    }
    // sources and credits
    const drawn = ['craft', 'diagram', 'next', 'band'].includes(sh.type) || (sh.type === 'number' && (!sh.image || sh.art)) || (sh.type === 'compare' && (sh.items || []).some((x) => x.craft)) || (sh.type === 'react' && sh.who === 'pho');
    if (drawn && sh.type !== 'band' && !isStr(b.source) && !(sh.type === 'next' && sh.image)) err(`${p}.source`, `a ${sh.type} beat draws an illustration: name the source of its facts (it shows as "Illustration · facts: NASA")`);
    if (['hook', 'photo'].includes(sh.type)) {
      assetRef(`${q}.image`, sh.image);
      if (sh.frame != null && !PHOTO_FRAMES.includes(sh.frame)) err(`${q}.frame`, `must be one of ${PHOTO_FRAMES.join(', ')}`);
      if (sh.push != null && (!isNum(sh.push) || sh.push < 0 || sh.push > 0.15)) err(`${q}.push`, '0 to 0.15');
      (sh.marks || []).forEach((m, j) => { if (!(Array.isArray(m.point) && m.point.length === 2)) err(`${q}.marks[${j}].point`, 'must be [x, y] as fractions of the image'); if (m.at == null) err(`${q}.marks[${j}].at`, 'is required'); });
      if (sh.bg != null && !BACKDROPS.includes(sh.bg)) err(`${q}.bg`, `must be one of ${BACKDROPS.join(', ')}`);
    }
    if (sh.type === 'number') {
      if (!isStr(sh.text)) err(`${q}.text`, 'the number as it shows (for example "4,000°F")'); else textCheck(`${q}.text`, sh.text);
      if (sh.text && sh.text.length > 9) warn(`${q}.text`, 'long slam text; keep it to the number and its unit');
      if (sh.image) assetRef(`${q}.image`, sh.image);
      if (sh.art && !CRAFTS.includes(sh.art.craft)) err(`${q}.art.craft`, `must be one of ${CRAFTS.join(', ')}`);
    }
    if (sh.type === 'craft') {
      if (!CRAFTS.includes(sh.craft)) err(`${q}.craft`, `must be one of ${CRAFTS.join(', ')}`);
      if (sh.bg != null && !BACKDROPS.includes(sh.bg)) err(`${q}.bg`, `must be one of ${BACKDROPS.join(', ')}`);
      (sh.keys || []).forEach((k, j) => { if (k.at == null) err(`${q}.keys[${j}].at`, 'is required'); if (k.pos && !(Array.isArray(k.pos) && k.pos.length === 2)) err(`${q}.keys[${j}].pos`, 'must be [x, y] screen px'); });
    }
    if (sh.type === 'compare') {
      if (!Array.isArray(sh.items) || sh.items.length !== 2) err(`${q}.items`, 'a comparison has exactly two items');
      else sh.items.forEach((it, j) => {
        if (!it.image && !it.craft) err(`${q}.items[${j}]`, 'needs an image (a photo asset) or a craft (drawn)');
        if (it.image) assetRef(`${q}.items[${j}].image`, it.image);
        if (it.craft && !CRAFTS.includes(it.craft)) err(`${q}.items[${j}].craft`, `must be one of ${CRAFTS.join(', ')}`);
        textCheck(`${q}.items[${j}].label`, it.label); if (it.value != null) textCheck(`${q}.items[${j}].value`, String(it.value)); textCheck(`${q}.items[${j}].value_sub`, it.value_sub);
        if (it.at == null) err(`${q}.items[${j}].at`, 'each panel lands on a word');
      });
    }
    if (sh.type === 'diagram') {
      const els = sh.elements || [];
      if (!els.length) err(`${q}.elements`, 'a diagram needs elements');
      const pids = new Set(els.filter((e) => Array.isArray(e.path)).map((e) => e.id));
      els.forEach((e, j) => {
        const r = `${q}.elements[${j}]`;
        const kinds = ['path', 'heat', 'craft', 'label', 'marker', 'ring', 'body', 'zone'].filter((k) => e[k] != null);
        if (!kinds.length) err(r, 'needs one of path, heat, craft, label, marker, ring, body, zone');
        if (e.path && !e.craft && !(Array.isArray(e.path) && e.path.length >= 2)) err(`${r}.path`, 'at least two [x, y] points');
        if (e.heat && !pids.has(e.heat)) err(`${r}.heat`, `no path has id "${e.heat}"`);
        if (e.heat && !(isNum(e.from) && isNum(e.to) && e.from < e.to)) err(r, 'a hot segment needs from < to (0..1 along the path)');
        if (e.craft && !CRAFTS.includes(e.craft)) err(`${r}.craft`, `must be one of ${CRAFTS.join(', ')}`);
        if (e.craft && e.path && !pids.has(e.path)) err(`${r}.path`, `no path has id "${e.path}"`);
        if (e.label != null) { textCheck(`${r}.label`, e.label); if (!(Array.isArray(e.pos) && e.pos.length === 2)) err(`${r}.pos`, 'a label needs pos [x, y] in diagram units'); if (String(e.label).length > 28) warn(`${r}.label`, 'long label; keep it to a few words'); }
        if (e.marker && !['stop', 'x', 'dot'].includes(e.marker)) err(`${r}.marker`, 'must be "stop", "x" or "dot"');
      });
    }
    if (sh.type === 'react') {
      if (sh.who != null && !['ns', 'pho'].includes(sh.who)) err(`${q}.who`, 'must be "ns" (Night Shift) or "pho"');
      const ex = sh.who === 'pho' ? PHO_EXPRS : NS_EXPRS;
      (sh.faces || []).forEach((x, j) => { if (!ex.includes(x.expr)) err(`${q}.faces[${j}].expr`, `must be one of ${ex.join(', ')}`); });
    }
    if (sh.type === 'band') {
      if (sh.style != null && ![1, 2, 3, 4, 'next'].includes(sh.style)) err(`${q}.style`, 'must be 1, 2, 3, 4 or "next"');
      if (!sh.words && !isStr(sh.label)) err(q, 'a band shows narration words ("words": ["Step#1", "one:"]) or a fixed label ("label": "NEXT")');
      if (sh.label && !/^(NEXT|STEP \d|HOW\?|WHY\?)$/i.test(sh.label)) warn(`${q}.label`, 'band labels are series devices ("NEXT", "STEP 1"); narration words belong in "words"');
      if (sh.num != null && !/^\d{0,2}$/.test(String(sh.num))) err(`${q}.num`, 'a one- or two-digit step numeral');
      if (sh.stamp) { if (!/^[A-Z]{3} \d{1,2} [A-Z]{3}$/.test(sh.stamp.text || '')) err(`${q}.stamp.text`, 'a date as "DDD DD MMM" (for example "FRI 23 OCT") from the source; never invent one'); else textCheck(`${q}.stamp.text`, sh.stamp.text); }
    }
    if (sh.type === 'next') {
      if (sh.stamp && !/^[A-Z]{3} \d{1,2} [A-Z]{3}$/.test(sh.stamp.text || '')) err(`${q}.stamp.text`, 'a date as "DDD DD MMM" from the source; never invent one');
      if (sh.stamp) textCheck(`${q}.stamp.text`, sh.stamp.text);
      (sh.chip || []).forEach((l, j) => textCheck(`${q}.chip[${j}]`, l));
      if (sh.image) assetRef(`${q}.image`, sh.image);
    }
    for (const [j, c] of (b.chips || []).entries()) { if (!Array.isArray(c.lines) || !c.lines.length) err(`${p}.chips[${j}].lines`, 'a chip needs lines'); else c.lines.forEach((l, k) => textCheck(`${p}.chips[${j}].lines[${k}]`, l)); if (c.at == null) err(`${p}.chips[${j}].at`, 'is required'); }
    for (const [j, s] of (b.sfx || []).entries()) {
      if (!isStr(s.text) || /[A-Za-z0-9]/.test(s.text)) err(`${p}.sfx[${j}].text`, 'katakana onomatopoeia only (ドン, ゴゴゴ, バシュッ); no Latin letters or numbers, so it never reads as a claim');
      if (s.at == null) err(`${p}.sfx[${j}].at`, 'is required');
    }
    if (b.caption && b.caption.y != null && (b.caption.y < 262 || b.caption.y > 1300)) err(`${p}.caption.y`, 'captions start between y 262 and 1300');
  });
  beats.forEach((b, i) => walkAnchors(b, beatName(i)));
  (S.impacts || []).forEach((a, i) => resolveAnchor(`impacts[${i}]`, a));
  (S.hits || []).forEach((h, i) => resolveAnchor(`hits[${i}].at`, h.at));
  if (!beats.some((b) => b?.shot?.type === 'next' || (b?.shot?.type === 'band' && b.shot.style === 'next'))) err('beats', 'a NEXT beat is required before the end card (a "band" with style "next" and a "next" scene)');

  // order, lengths, band words, hard cuts
  const impactsF = [...(S.impacts || []).map(fr), ...beats.map((b) => fr(b?.impact))].filter((x) => x != null).sort((a, b) => a - b);
  const starts = beats.map((b) => fr(b?.start));
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] == null || starts[i - 1] == null) continue;
    const minLen = beats[i - 1].shot?.type === 'band' ? 16 : 24;
    if (starts[i] <= starts[i - 1]) err(`${beatName(i)}.start`, `frame ${starts[i]} is not after ${beatName(i - 1)} (frame ${starts[i - 1]})`);
    else if (starts[i] - starts[i - 1] < minLen) err(`${beatName(i)}.start`, `only ${starts[i] - starts[i - 1]} frames after the previous beat; a beat needs ${minLen} frames to read`);
    else if (starts[i] - starts[i - 1] > 150) warn(beatName(i - 1), `holds ${((starts[i] - starts[i - 1]) / FPS).toFixed(1)} s; give it inner moves (camera keys, a craft travelling, Night Shift acting) so the picture changes at least every 1.5 s`);
    const tt = beats[i].transition?.type;
    if ((tt === 'cut' || (tt == null && beats[i - 1].shot?.type !== 'band' && beats[i].shot?.type !== 'band')) && beats[i].hit !== true && !impactsF.some((x) => Math.abs(x - starts[i]) <= 2))
      err(`${beatName(i)}.transition`, 'a hard cut is only allowed on a hit word ("hit": true) or an impact frame; otherwise use "whip", "smash", "iris" or a band');
  }
  beats.forEach((b, i) => {
    if (b?.shot?.type !== 'band' || !b.shot.words) return;
    const [a, z] = [fr(b.shot.words[0]), fr(b.shot.words[1] ?? b.shot.words[0])];
    const nx = starts[i + 1];
    if (a != null && starts[i] != null && a < starts[i]) err(`${beatName(i)}.shot.words`, 'the band words start before the band');
    if (z != null && nx != null && z > nx - 10) err(`${beatName(i)}.shot.words`, `the last band word (frame ${z}) must be spoken at least 10 frames before the next beat (frame ${nx}) so it reads before the band wipes out`);
  });
  if (beats[0] && starts[0] != null && starts[0] > 12) warn(`${beatName(0)}.start`, 'the hook should start on the first word');
  // impacts: one-frame flashes, at most 3 in any second, and not too close
  for (let i = 0; i < impactsF.length; i++) {
    const inSec = impactsF.filter((x) => x >= impactsF[i] && x < impactsF[i] + FPS).length;
    if (inSec > 3) err('impacts', `${inSec} impact frames within one second from frame ${impactsF[i]}; at most 3 flashes per second`);
    if (i && impactsF[i] - impactsF[i - 1] < 10) err('impacts', `impact frames ${impactsF[i - 1]} and ${impactsF[i]} are ${impactsF[i] - impactsF[i - 1]} frames apart; keep them at least 10 apart`);
    else if (i && impactsF[i] - impactsF[i - 1] < 45) warn('impacts', `impact frames ${impactsF[i - 1]} and ${impactsF[i]} are under 1.5 s apart; the house reference keeps them about 2 s apart`);
  }
  if (impactsF.length > Math.ceil((W[W.length - 1].fe / FPS) / 4)) warn('impacts', `${impactsF.length} impact frames; keep them for the 5 to 8 biggest hits (one every 4 to 6 s)`);

  // ---------------------------------------------------------------- the cast
  const castCheck = (who, spec, MOVES, EXPRS, PLACES) => {
    const p = `cast.${who}`;
    if (!isObj(spec) || !Array.isArray(spec.moves)) { err(p, 'must be { moves: [...] }'); return; }
    spec.moves.forEach((m, i) => {
      const q = `${p}.moves[${i}]`;
      if (m.at == null) err(`${q}.at`, 'is required: the word the move starts on');
      if (!MOVES.includes(m.do)) { err(`${q}.do`, `"${m.do}" is not a move; use one of ${MOVES.join(', ')}`); return; }
      if (m.do === 'expr' && !EXPRS.includes(m.expr)) err(`${q}.expr`, `must be one of ${EXPRS.join(', ')}`);
      for (const k of ['place', 'to']) if ((m.do === 'enter' && k === 'place') || (m.do === 'move' && k === 'to')) { const v = m[k]; if (!(Array.isArray(v) && v.length >= 2) && !PLACES.includes(v)) err(`${q}.${k}`, `must be one of ${PLACES.join(', ')} or [x, y, size]`); }
      for (const k of ['target']) { const v = m[k]; if (v != null && !Array.isArray(v) && !/^(camera|caption|el:[\w-]+)$/.test(v)) err(`${q}.target`, 'must be "el:subject", "el:<name>", "camera", "caption" or [x, y]'); }
      if (m.do === 'point' && m.target == null) err(`${q}.target`, 'a point needs a target');
      if (m.do === 'hold' && m.text != null) textCheck(`${q}.text`, m.text);
      if (m.do === 'enter' && m.how != null && !['pop', 'slide', 'drop', 'smear'].includes(m.how)) err(`${q}.how`, 'an entrance is pop, slide, drop or smear');
      if (m.do === 'exit' && m.how != null && !['down', 'slide', 'zip'].includes(m.how)) err(`${q}.how`, 'an exit is down, slide or zip');
    });
    walkAnchors(spec.moves, `${p}.moves`);
    const ee = spec.moves.filter((m) => m.do === 'enter' || m.do === 'exit').map((m) => ({ m, f: fr(m.at) })).sort((a, b) => a.f - b.f);
    ee.forEach((x, i) => { if (i && x.m.do === ee[i - 1].m.do) err(`${p}.moves`, `two ${x.m.do === 'enter' ? 'entrances' : 'exits'} in a row (at "${ee[i - 1].m.at}" and "${x.m.at}")`); });
    if (ee.length && ee[0].m.do !== 'enter') err(`${p}.moves`, 'the first entrance/exit must be an entrance');
    // gestures only while he is on screen
    spec.moves.forEach((m, i) => { if (['enter', 'exit'].includes(m.do)) return; const f = fr(m.at); const on = ee.some((x, j) => x.m.do === 'enter' && x.f <= f && (!ee[j + 1] || ee[j + 1].f > f)); if (f != null && !on) err(`${p}.moves[${i}]`, `"${m.do}" at "${m.at}" while ${who === 'ns' ? 'Night Shift' : 'Pho'} is off screen`); });
  };
  if (S.cast?.ns) castCheck('ns', S.cast.ns, NS_MOVES, NS_EXPRS, NS_PLACES);
  else warn('cast.ns', 'no Night Shift overlay moves; he appears only where shots draw him (reactions, bands, the end card)');
  if (S.cast?.pho) castCheck('pho', S.cast.pho, PHO_MOVES, PHO_EXPRS, PHO_PLACES);
  for (const k of Object.keys(S.cast || {})) if (!['ns', 'pho'].includes(k)) err(`cast.${k}`, 'the cast is "ns" (Night Shift) and optionally "pho"');

  return { errors, warnings, anchors, words: W };
}
