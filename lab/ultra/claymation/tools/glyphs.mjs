// Extract glyph outlines from a TTF into a compact JSON for three.js ShapePath (clay caption letters).
// usage: node tools/glyphs.mjs fonts/TitanOne-Regular.ttf data/glyphs_titan.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/tmp/claude-0/-home-user-space-youtube/727c5319-2fae-5079-a2c4-4b28200d872a/scratchpad/tools/');
const opentype = require('opentype.js');
const [src, out] = process.argv.slice(2);
const font = opentype.loadSync(src);
const caps = JSON.parse(fs.readFileSync('/home/user/space_youtube/lab/ultra/kit/captions.json', 'utf8'));
let chars = new Set(caps.words.map((w) => w.text).join('') + 'DOWNLINKCAT0123456789STEPgkmabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,:?!-·()%/\'"x ');
const glyphs = {};
for (const ch of chars) {
  const g = font.charToGlyph(ch);
  const p = g.getPath(0, 0, font.unitsPerEm);
  const cmds = p.commands.map((c) => {
    const r = (v) => Math.round(v * 10) / 10;
    if (c.type === 'M' || c.type === 'L') return [c.type, r(c.x), r(-c.y)];
    if (c.type === 'Q') return ['Q', r(c.x1), r(-c.y1), r(c.x), r(-c.y)];
    if (c.type === 'C') return ['C', r(c.x1), r(-c.y1), r(c.x2), r(-c.y2), r(c.x), r(-c.y)];
    return ['Z'];
  });
  glyphs[ch] = { a: g.advanceWidth, c: cmds };
}
const kern = {};
const list = [...chars];
for (const a of list) for (const b of list) {
  const k = font.getKerningValue(font.charToGlyph(a), font.charToGlyph(b));
  if (k) kern[a + b] = k;
}
fs.writeFileSync(out, JSON.stringify({ upem: font.unitsPerEm, asc: font.ascender, desc: font.descender, glyphs, kern }));
console.log('glyphs', Object.keys(glyphs).length, 'kern pairs', Object.keys(kern).length, 'bytes', fs.statSync(out).size);
