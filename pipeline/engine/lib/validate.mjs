// validate.mjs: checks a shot list against the schema and the narration, with specific errors
// ("beats[3] (id 'old_record').shot.number.value: must be a number"), and resolves every word anchor
// to a frame. Used by build.mjs; it never guesses: an anchor that is missing or ambiguous is an error.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const SERIES = ['LAUNCH DAY', 'JUST DISCOVERED', 'HOW DOES THAT WORK', 'BY THE NUMBERS'];
export const SHOT_TYPES = ['hook', 'photo', 'lens', 'count', 'bars', 'diagram', 'points', 'fact', 'next'];
export const TRANSITIONS = ['push', 'iris', 'morph', 'cut'];
export const DIRS = ['up', 'down', 'left', 'right'];
export const CAT_MOVES = ['enter', 'exit', 'hop', 'walk', 'scoot', 'swing', 'fly', 'float', 'skid'];
export const CAT_GESTURES = ['point', 'what', 'facepalm', 'shrug', 'thumbs', 'sign', 'card', 'bounce', 'gasp', 'nod', 'listen', 'tilt', 'wave', 'emote', 'idle'];
export const CAT_TRACKS = ['expr', 'look'];
export const ENTER_HOW = ['skid', 'drop', 'float', 'pop'];
export const EXIT_HOW = ['zip', 'float', 'jet', 'tether'];
export const EXPRESSIONS = ['neutral', 'curious', 'excited', 'shocked', 'sad', 'skeptical', 'angry', 'happy', 'wink', 'keen', 'wow', 'doh', 'meh', 'focus', 'relief', 'dizzy'];
export const GLYPHS = ['dish', 'dome', 'rocket', 'rover', 'spiral', 'blob', 'planet', 'binary'];
const ANCHOR_KEYS = new Set(['start', 'end', 'at', 'land', 'until', 'exit_at', 'mute_at', 'image_at', 'date_at', 'by_at', 'data_at']);
const ANCHOR_ARRAYS = new Set(['punch', 'pulse', 'headline_at']);
const BANNED_TEXT = [/not\s+to\s+scale/i, /^\s*diagram\b/i, /\bprogress\b/i];
const FPS = 30;

export const wordKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

export function validate(shotlist, captions, shortDir, { bedsJson } = {}) {
  const errors = [], warnings = [];
  const err = (p, m) => errors.push(`${p}: ${m}`);
  const warn = (p, m) => warnings.push(`${p}: ${m}`);
  const S = shotlist;
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
      err(p, `"${word}" is not a word of the narration${near.length ? `; close: ${near.join(', ')}` : ''}`);
      return null;
    }
    let w;
    if (nth) {
      w = occ[Number(nth) - 1];
      if (!w) { err(p, `"${word}" occurs ${occ.length} time(s); "#${nth}" does not exist`); return null; }
    } else {
      if (occ.length > 1) { err(p, `"${word}" occurs ${occ.length} times (words ${occ.map((o) => o.i).join(', ')}); write "${word}#1" to "${word}#${occ.length}"`); return null; }
      w = occ[0];
    }
    const fr = (atEnd ? w.fe : w.f) + (off ? Number(off) : 0);
    anchors[a] = Math.max(0, fr);
    return anchors[a];
  }
  function walkAnchors(node, p) {
    if (Array.isArray(node)) { node.forEach((x, i) => walkAnchors(x, `${p}[${i}]`)); return; }
    if (!isObj(node)) return;
    for (const [kk, v] of Object.entries(node)) {
      const q = `${p}.${kk}`;
      if (ANCHOR_KEYS.has(kk) && (typeof v === 'string' || typeof v === 'number')) resolveAnchor(q, v);
      else if (ANCHOR_ARRAYS.has(kk) && Array.isArray(v)) v.forEach((x, i) => (x == null ? null : resolveAnchor(`${q}[${i}]`, x)));
      else walkAnchors(v, q);
    }
  }

  // ---------------------------------------------------------------- top level
  if (S.version !== 1) err('version', 'must be 1');
  if (!SERIES.includes(S.series)) err('series', `must be one of ${SERIES.map((s) => `"${s}"`).join(', ')} (got ${JSON.stringify(S.series)})`);
  if (!isStr(S.title)) err('title', 'a short page title (2 to 4 words) is required');
  if (!isStr(S.bed)) err('bed', 'the music bed name is required (for example "bedF_house")');
  else if (bedsJson) {
    const beds = JSON.parse(readFileSync(bedsJson, 'utf8'));
    const list = Array.isArray(beds) ? beds : beds.beds ?? []; const names = list.map((b) => b.id ?? b.name);
    if (!names.some((n) => n === S.bed || String(n).startsWith(S.bed))) err('bed', `"${S.bed}" is not in lab/sound/beds/beds.json (have: ${names.join(', ')})`);
  }
  if (S.stress != null && !Array.isArray(S.stress)) err('stress', 'must be a list of narration words');
  for (const [i, s] of (S.stress ?? []).entries()) if (!W.some((w) => w.key === wordKey(s))) err(`stress[${i}]`, `"${s}" is not a word of the narration`);

  // ---------------------------------------------------------------- assets
  const assets = S.assets ?? {};
  if (!isObj(assets)) err('assets', 'must be an object of named images');
  for (const [name, a] of Object.entries(assets)) {
    const p = `assets.${name}`;
    if (!isObj(a)) { err(p, 'must be an object { file, credit, focus }'); continue; }
    if (!isStr(a.file)) err(`${p}.file`, 'is required (a path relative to the Short folder)');
    else if (!existsSync(path.resolve(shortDir, a.file))) err(`${p}.file`, `file not found: ${path.resolve(shortDir, a.file)}`);
    if (!isStr(a.credit)) err(`${p}.credit`, 'is required: the credit exactly as the source gives it (for example "NASA/JPL-Caltech")');
    const kind = a.kind ?? 'photo';
    if (!['photo', 'graphic'].includes(kind)) err(`${p}.kind`, 'must be "photo" or "graphic"');
    if (kind === 'photo') {
      if (!Array.isArray(a.focus) || a.focus.length !== 4 || !a.focus.every(isNum)) err(`${p}.focus`, 'is required for a photo: [x, y, w, h] of the subject, as fractions 0..1 of the image');
      else if (a.focus.some((v) => v < 0 || v > 1) || a.focus[0] + a.focus[2] > 1.001 || a.focus[1] + a.focus[3] > 1.001) err(`${p}.focus`, 'must lie inside the image (fractions 0..1)');
    }
    if (a.crop != null && !(Array.isArray(a.crop) && a.crop.length === 4 && a.crop.every(isNum))) err(`${p}.crop`, 'must be [x, y, w, h] in pixels of the file');
  }
  const assetRef = (p, name, { photo = false } = {}) => {
    if (!isStr(name)) { err(p, 'must name an asset'); return; }
    if (!assets[name]) { err(p, `asset "${name}" is not in assets (have: ${Object.keys(assets).join(', ') || 'none'})`); return; }
    if (photo && (assets[name].kind ?? 'photo') !== 'photo') warn(p, `asset "${name}" is a graphic, not a photo`);
  };
  const textCheck = (p, t) => { if (typeof t !== 'string') return; if (BANNED_TEXT.some((re) => re.test(t.replace(/[*_]/g, '')))) err(p, `"${t}" is a filler label; on-screen text carries facts only (no "not to scale", no "DIAGRAM" tags)`); };

  // ---------------------------------------------------------------- number blocks, diagrams
  function checkNumber(p, n) {
    if (!isObj(n)) { err(p, 'must be an object { value, at, data }'); return; }
    if (n.text == null && !isNum(n.value)) err(`${p}.value`, 'must be a number (or give "text" for a non-numeric slam such as "1/1000")');
    if (n.text != null && !isStr(n.text)) err(`${p}.text`, 'must be a string');
    if (n.style != null && !['count', 'slam', 'roll'].includes(n.style)) err(`${p}.style`, 'must be "count", "slam" or "roll"');
    if (n.style === 'roll' && !isNum(n.from)) err(`${p}.from`, 'a roll needs the value it rolls from');
    if (n.style === 'roll' && n.land == null) err(`${p}.land`, 'a roll needs the word it lands on');
    if (isNum(n.value) && n.value <= 0 && n.style !== 'slam') err(`${p}.value`, 'a count-up must be above zero (it never shows zero)');
    if (n.data != null) {
      const ds = typeof n.data === 'string' ? [{ text: n.data }] : n.data;
      if (!Array.isArray(ds)) err(`${p}.data`, 'must be a string or a list of { at, text }');
      else ds.forEach((d, i) => { if (!isStr(d.text)) err(`${p}.data[${i}].text`, 'is required'); textCheck(`${p}.data[${i}].text`, d.text); });
    }
  }
  function checkDiagram(p, d, { requireSome = true } = {}) {
    if (!isObj(d)) { err(p, 'must be an object { elements, dot, camera }'); return; }
    if (d.region != null && !['full', 'left', 'right'].includes(d.region)) err(`${p}.region`, 'must be "full", "left" or "right"');
    if (d.size != null && !(Array.isArray(d.size) && d.size.length === 2 && d.size.every(isNum))) err(`${p}.size`, 'must be [width, height] in diagram units');
    const els = d.elements ?? [];
    if (requireSome && !els.length) err(`${p}.elements`, 'a diagram needs at least one element');
    const ids = new Set();
    els.forEach((e, i) => {
      const q = `${p}.elements[${i}]`;
      const kinds = ['path', 'circle', 'ellipse', 'marker', 'ring', 'craft', 'label', 'glyph', 'hazards', 'fan'].filter((kk) => e[kk] != null);
      if (kinds.length !== 1) { err(q, `must have exactly one of path, circle, ellipse, marker, ring, craft, label, glyph, hazards, fan (has ${kinds.join(', ') || 'none'})`); return; }
      const kd = kinds[0];
      if (e.id) { if (ids.has(e.id)) err(`${q}.id`, `"${e.id}" is used twice`); ids.add(e.id); }
      const pt = (v) => Array.isArray(v) && v.length === 2 && v.every(isNum);
      if (kd === 'path' && !(Array.isArray(e.path) && e.path.length >= 2 && e.path.every(pt))) err(`${q}.path`, 'must be a list of at least two [x, y] points');
      if (kd === 'path' && e.style && !['solid', 'dashed', 'thin', 'route'].includes(e.style)) err(`${q}.style`, 'must be "solid", "dashed", "thin" or "route"');
      if (kd === 'circle' && !(Array.isArray(e.circle) && e.circle.length === 3 && e.circle.every(isNum))) err(`${q}.circle`, 'must be [cx, cy, r]');
      if (kd === 'ellipse' && !(Array.isArray(e.ellipse) && e.ellipse.length >= 4 && e.ellipse.every(isNum))) err(`${q}.ellipse`, 'must be [cx, cy, rx, ry, deg]');
      if ((kd === 'marker' || kd === 'craft') && !pt(e[kd])) err(`${q}.${kd}`, 'must be [x, y]');
      if (kd === 'ring' && !(Array.isArray(e.ring) && e.ring.length === 3 && e.ring.every(isNum))) err(`${q}.ring`, 'must be [x, y, r]');
      if (kd === 'label') { if (!isStr(e.label)) err(`${q}.label`, 'must be text'); if (!pt(e.pos)) err(`${q}.pos`, 'must be [x, y]'); textCheck(`${q}.label`, e.label); if (e.label && e.label.length > 30) warn(`${q}.label`, 'long label; keep diagram labels to a few words'); }
      if (kd === 'glyph') { if (!GLYPHS.includes(e.glyph)) err(`${q}.glyph`, `must be one of ${GLYPHS.join(', ')}`); if (!pt(e.pos)) err(`${q}.pos`, 'must be [x, y]'); }
      if (kd === 'hazards' && !(Array.isArray(e.hazards) && e.hazards.length === 4)) err(`${q}.hazards`, 'must be [x, y, w, h], the area the rocks are scattered in');
      if (kd === 'fan' && !isNum(e.fan)) err(`${q}.fan`, 'must be the range in diagram units');
    });
    if (d.dot) {
      const ks = d.dot.keys;
      if (!Array.isArray(ks) || !ks.length) err(`${p}.dot.keys`, 'must be a list of { at, u } or { at, pos }');
      else {
        if (d.dot.path && !els.some((e) => e.id === d.dot.path && e.path)) err(`${p}.dot.path`, `no path element has id "${d.dot.path}"`);
        ks.forEach((kq, i) => { if (d.dot.path ? !isNum(kq.u) : !(Array.isArray(kq.pos) && kq.pos.length === 2)) err(`${p}.dot.keys[${i}]`, d.dot.path ? 'needs u (0..1 along the path)' : 'needs pos [x, y]'); });
      }
    }
  }

  // ---------------------------------------------------------------- beats
  if (!Array.isArray(S.beats) || S.beats.length < 3) err('beats', 'at least three beats are required (a hook, a story beat, the NEXT card)');
  const beats = S.beats ?? [];
  const ids = new Set();
  beats.forEach((b, i) => {
    const p = beatName(i);
    if (!isObj(b)) { err(p, 'must be an object'); return; }
    if (!isStr(b.id)) err(`${p}.id`, 'is required (a short name)'); else { if (ids.has(b.id)) err(`${p}.id`, `"${b.id}" is used twice`); ids.add(b.id); }
    if (b.start == null) err(`${p}.start`, 'is required: the narration word the beat lands on');
    const sh = b.shot;
    if (!isObj(sh)) { err(`${p}.shot`, 'is required'); return; }
    if (!SHOT_TYPES.includes(sh.type)) { err(`${p}.shot.type`, `must be one of ${SHOT_TYPES.join(', ')} (got ${JSON.stringify(sh.type)})`); return; }
    if (i === 0 && sh.type !== 'hook') err(`${p}.shot.type`, 'the first beat must be a "hook"');
    if (i > 0 && sh.type === 'hook') err(`${p}.shot.type`, 'only the first beat can be a hook');
    if (i === beats.length - 1 && sh.type !== 'next') err(`${p}.shot.type`, 'the last beat must be the NEXT card ("next")');
    if (i < beats.length - 1 && sh.type === 'next') err(`${p}.shot.type`, 'the NEXT card must be the last beat');
    // transition
    const t = b.transition;
    if (i === 0 && t != null) err(`${p}.transition`, 'the hook has no transition (frame 0 is a finished composition)');
    if (i > 0) {
      if (t != null && !isObj(t)) err(`${p}.transition`, 'must be { type, dir, frames }');
      const ty = t?.type ?? 'morph';
      if (!TRANSITIONS.includes(ty)) err(`${p}.transition.type`, `must be one of ${TRANSITIONS.join(', ')}`);
      if (ty === 'push' && t.dir != null && !DIRS.includes(t.dir)) err(`${p}.transition.dir`, `must be one of ${DIRS.join(', ')}`);
      if (t?.frames != null && (!Number.isInteger(t.frames) || t.frames < 6 || t.frames > 16)) err(`${p}.transition.frames`, 'shots overlap by 6 to 16 frames');
      if (ty === 'cut' && b.hit !== true) err(`${p}.transition`, 'a hard cut is only allowed on a hit word: set "hit": true when the start word is one (for example "Liftoff" or "Next")');
    }
    // credits and sources
    const lineArt = ['diagram', 'bars', 'fact', 'next', 'points'].includes(sh.type) || (sh.type === 'count' && !sh.image) || (sh.type === 'hook' && !sh.image);
    if (lineArt && !isStr(b.source)) err(`${p}.source`, `a ${sh.type} beat needs the source of its facts for the credit slot (for example "NASA"); it shows as "Source: NASA"`);
    if (b.source && /^source:/i.test(b.source)) warn(`${p}.source`, 'write only the source name; the engine adds "Source: "');
    // chip
    if (b.chip != null) {
      const c = b.chip;
      if (!isObj(c)) err(`${p}.chip`, 'must be { body, value, source, at, until }');
      else {
        if (!isStr(c.body)) err(`${p}.chip.body`, 'is required (for example "MARS")');
        if (!isStr(c.value)) err(`${p}.chip.value`, 'is required, computed from a real distance for the story date (for example "12 min 59 s")');
        if (!isStr(c.source)) err(`${p}.chip.source`, 'is required: where the light time was computed (for example "JPL Horizons, 2026-10-15")');
      }
    }
    // shot parameters
    const q = `${p}.shot`;
    if ((sh.type === 'photo' || (sh.type === 'hook' && sh.image))) {
      assetRef(`${q}.image`, sh.image, { photo: true });
      if (sh.push != null && (!isNum(sh.push) || sh.push < 0.03 || sh.push > 0.07)) err(`${q}.push`, 'photos push 3 to 7% (0.03 to 0.07)');
      if (sh.frame != null && !['left', 'center', 'right'].includes(sh.frame)) err(`${q}.frame`, 'must be "left", "center" or "right" (where the subject sits)');
      if (sh.y != null && !['top', 'center', 'bottom'].includes(sh.y)) err(`${q}.y`, 'must be "top", "center" or "bottom"');
      (sh.marks ?? []).forEach((m, j) => { if (!(Array.isArray(m.point) && m.point.length === 2)) err(`${q}.marks[${j}].point`, 'must be [x, y] as fractions of the image'); textCheck(`${q}.marks[${j}].label`, m.label); });
      (sh.camera ?? []).forEach((c, j) => { if (c.at == null) err(`${q}.camera[${j}].at`, 'is required'); if (c.focus != null && !(Array.isArray(c.focus) && c.focus.length === 4)) err(`${q}.camera[${j}].focus`, 'must be [x, y, w, h] fractions of the image'); });
    }
    if (sh.type === 'hook') {
      if (!sh.number && !(Array.isArray(sh.headline) && sh.headline.length)) err(q, 'the hook needs a giant number ("number") or a headline ("headline": ["LINE", ...]) on frame 0');
      if (!sh.image && !(sh.elements ?? []).length) err(q, 'the hook needs a photo ("image") or line art ("elements")');
      if (!sh.image) checkDiagram(q, sh);
    }
    if (Array.isArray(sh.headline)) { if (sh.headline.length > (sh.type === 'next' ? 4 : 3)) err(`${q}.headline`, `at most ${sh.type === 'next' ? 4 : 3} lines`); sh.headline.forEach((h, j) => textCheck(`${q}.headline[${j}]`, h)); }
    if (sh.number) checkNumber(`${q}.number`, sh.number);
    if (sh.type === 'lens') { assetRef(`${q}.image`, sh.image, { photo: true }); if (sh.side != null && !['left', 'center', 'right'].includes(sh.side)) err(`${q}.side`, 'must be "left", "center" or "right"'); }
    if (sh.type === 'count') {
      if (!sh.number) err(`${q}.number`, 'a count beat needs its number');
      if (!sh.image && !sh.diagram) err(q, 'a count beat must fill the frame under the number: give "image" (a lens photo) or "diagram" (line art)');
      if (sh.image) assetRef(`${q}.image`, sh.image, { photo: true });
      if (sh.diagram) checkDiagram(`${q}.diagram`, sh.diagram);
    }
    if (sh.type === 'diagram') checkDiagram(q, sh);
    if (sh.type === 'bars') {
      if (!Array.isArray(sh.rows) || sh.rows.length < 2) err(`${q}.rows`, 'a comparison needs at least two rows');
      else sh.rows.forEach((r, j) => {
        if (!isNum(r.value) || r.value <= 0) err(`${q}.rows[${j}].value`, 'must be a number above zero');
        if (r.icon != null) assetRef(`${q}.rows[${j}].icon`, r.icon);
        textCheck(`${q}.rows[${j}].label`, r.label); textCheck(`${q}.rows[${j}].data`, r.data);
        if (!(sh.race ?? sh.rows.length > 4) && r.at == null) err(`${q}.rows[${j}].at`, 'each bar starts on a word');
      });
    }
    if (sh.type === 'points') {
      if (!Array.isArray(sh.stages) || sh.stages.length !== 2) err(`${q}.stages`, 'needs exactly two stages (a small count, then the big one)');
      else sh.stages.forEach((s, j) => {
        if (!isNum(s.value) || s.value < 1) err(`${q}.stages[${j}].value`, 'must be a whole number of at least 1');
        if (s.at == null) err(`${q}.stages[${j}].at`, 'is required');
        if (s.image) assetRef(`${q}.stages[${j}].image`, s.image, { photo: true });
      });
      if (sh.stages?.[0]?.value > 400) err(`${q}.stages[0].value`, 'the first stage draws its points one by one: at most 400');
      if (sh.stages?.[1]?.value > 1000000) err(`${q}.stages[1].value`, 'at most 1,000,000 points are drawn');
    }
    if (sh.type === 'fact') {
      if (!Array.isArray(sh.lines) || !sh.lines.length) err(`${q}.lines`, 'needs at least one { at, text } line');
      else sh.lines.forEach((l, j) => { if (!isStr(l.text)) err(`${q}.lines[${j}].text`, 'is required'); textCheck(`${q}.lines[${j}].text`, l.text); });
      if (sh.art) checkDiagram(`${q}.art`, sh.art);
    }
    if (sh.type === 'next') {
      if (!Array.isArray(sh.headline) || !sh.headline.length) err(`${q}.headline`, 'the NEXT card needs a headline (1 to 4 lines naming the next event)');
      if (sh.date !== null && !(isStr(sh.date) && /^[A-Z]{3} \d{1,2} [A-Z]{3}$/.test(sh.date))) err(`${q}.date`, 'must be "DDD DD MMM" (for example "MON 19 OCT") from Launch Library 2 or the source, or null when no dated event exists; never invent one');
      if (!isObj(sh.pointer) || !isStr(sh.pointer.text)) err(`${q}.pointer.text`, 'is required (for example "*Follow* Downlink Cat" or "This week in space · Sunday")');
      (sh.lines ?? []).forEach((l, j) => textCheck(`${q}.lines[${j}].text`, l.text));
      if (sh.art) checkDiagram(`${q}.art`, sh.art);
    }
  });
  beats.forEach((b, i) => walkAnchors(b, beatName(i)));

  // beat order and lengths
  const starts = beats.map((b) => (b && b.start != null ? anchors[b.start] ?? (typeof b.start === 'number' ? b.start : null) : null));
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] == null || starts[i - 1] == null) continue;
    if (starts[i] <= starts[i - 1]) err(`${beatName(i)}.start`, `starts at frame ${starts[i]}, not after ${beatName(i - 1)} (frame ${starts[i - 1]})`);
    else if (starts[i] - starts[i - 1] < 24) err(`${beatName(i)}.start`, `only ${starts[i] - starts[i - 1]} frames after the previous beat; a beat needs at least 24 frames (0.8 s) to read`);
    else if (starts[i] - starts[i - 1] > 240) warn(`${beatName(i - 1)}`, `runs ${((starts[i] - starts[i - 1]) / FPS).toFixed(1)} s; give it inner moves (camera keys, marks, a count) so the picture changes at least every 1.5 s`);
  }
  if (beats[0] && starts[0] != null && starts[0] > 12) warn(`${beatName(0)}.start`, 'the hook should start on the first word');

  // ---------------------------------------------------------------- the cat
  const cat = S.cat;
  if (!isObj(cat)) err('cat', 'the cat timeline is required ({ scale, moves: [...] })');
  else {
    if (cat.scale != null && (!isNum(cat.scale) || cat.scale < 0.2 || cat.scale > 0.45)) err('cat.scale', 'must be 0.2 to 0.45 (pixels per rig unit; 0.34 is about 375 px tall)');
    if (!Array.isArray(cat.moves) || !cat.moves.length) err('cat.moves', 'must be a list of moves');
    else {
      cat.moves.forEach((m, i) => {
        const p = `cat.moves[${i}]`;
        if (m.at == null) err(`${p}.at`, 'is required: the word the move starts on');
        const all = [...CAT_MOVES, ...CAT_GESTURES, ...CAT_TRACKS];
        if (!all.includes(m.do)) { err(`${p}.do`, `"${m.do}" is not a move; use one of ${all.join(', ')}`); return; }
        if (m.do === 'enter' && !ENTER_HOW.includes(m.how ?? 'skid')) err(`${p}.how`, `an entrance is one of ${ENTER_HOW.join(', ')}`);
        if (m.do === 'exit' && !EXIT_HOW.includes(m.how ?? 'zip')) err(`${p}.how`, `an exit is one of ${EXIT_HOW.join(', ')}`);
        if (['hop', 'walk', 'scoot', 'swing', 'fly', 'float', 'skid'].includes(m.do) && m.to == null && m.around == null) err(`${p}.to`, `"${m.do}" needs a destination ("to": "caption", "left", "right", "el:<name>", "dot" or [x, y])`);
        if (m.do === 'point' && m.target == null) err(`${p}.target`, 'a point needs a target ("el:subject", "dot", [x, y], ...)');
        if (m.do === 'sign' && !isStr(m.text)) err(`${p}.text`, 'a sign needs its text (a number from the narration)');
        if (m.do === 'expr' && !EXPRESSIONS.includes(m.expr)) err(`${p}.expr`, `must be one of ${EXPRESSIONS.join(', ')}`);
        if (m.do === 'exit' && m.how === 'zip' && m.to != null && !['left', 'right', 'up'].includes(m.to)) err(`${p}.to`, 'a zip exit goes "left", "right" or "up"');
        const tg = [m.to, m.target];
        for (const t of tg) if (typeof t === 'string' && !/^(caption(:[0-9.]+)?|left|right|center|up|dot|camera|el:[\w.-]+(:[0-9.]+)?)$/.test(t)) err(p, `target "${t}" is not one of caption, caption:0.3, left, right, center, dot, camera, el:<name>`);
      });
      walkAnchors(cat.moves, 'cat.moves');
      // order: entrances and exits alternate
      const ee = cat.moves.filter((m) => m.do === 'enter' || m.do === 'exit').map((m) => ({ m, f: anchors[m.at] ?? m.at })).sort((a, b) => a.f - b.f);
      ee.forEach((x, i) => { if (i && x.m.do === ee[i - 1].m.do) err('cat.moves', `two ${x.m.do === 'enter' ? 'entrances' : 'exits'} in a row (at "${ee[i - 1].m.at}" and "${x.m.at}"); he must ${x.m.do === 'enter' ? 'exit' : 'enter'} in between`); });
      if (ee.length && ee[0].m.do !== 'enter') err('cat.moves', 'the first entrance/exit must be an entrance');
      const distinct = new Set(cat.moves.filter((m) => ![...CAT_TRACKS].includes(m.do)).map((m) => (m.do === 'enter' || m.do === 'exit' ? `${m.do} ${m.how ?? ''}` : m.do)));
      if (distinct.size < 8) err('cat.moves', `only ${distinct.size} different moves (${[...distinct].join(', ')}); use at least 8 (entrances, travels, reactions)`);
    }
  }
  return { errors, warnings, anchors, words: W };
}
