// build.mjs: inlines the caption schedule and the JS sources into one self-contained page.html
// usage: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const caps = JSON.parse(readFileSync(path.join(here, '../kit/captions.json'), 'utf8'));
const words = caps.words.map((w) => ({ text: w.text, start: w.start, end: w.end }));
const shell = readFileSync(path.join(here, 'src/shell.html'), 'utf8');
const js = ['core.js', 'illus.js', 'scenes.js'].map((f) => `// ---- ${f}\n` + readFileSync(path.join(here, 'src', f), 'utf8')).join('\n');
const out = shell
  .replace('/*WORDS*/', `const WORDS = ${JSON.stringify(words)};`)
  .replace('/*JS*/', () => js);
writeFileSync(path.join(here, 'page.html'), out);
console.log(`page.html: ${words.length} words, ${(out.length / 1024).toFixed(0)} KB`);
