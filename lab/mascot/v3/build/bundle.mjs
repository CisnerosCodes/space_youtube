// bundle.mjs (v3): bundles rig/core.mjs, rig/catA.mjs and rig/actor.mjs into one plain script
// (nested scopes M_core, M_cat, M_actor) for pages that run from file:// without a module loader.
//   import { bundle } from '../../mascot/v3/build/bundle.mjs';
//   const { js, info } = bundle();   // js: paste into a <script>; info: file names + md5 prefixes
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const md5 = (s) => createHash('md5').update(s).digest('hex').slice(0, 10);
const MODS = [['core', 'rig/core.mjs'], ['cat', 'rig/catA.mjs'], ['actor', 'rig/actor.mjs']];
const FILE2MOD = { 'core.mjs': 'core', 'catA.mjs': 'cat', 'actor.mjs': 'actor' };
export function bundle() {
  let out = '', info = [];
  for (const [name, f] of MODS) {
    const src = readFileSync(path.join(ROOT, f), 'utf8');
    const imps = [...src.matchAll(/^import\s*\{([\s\S]*?)\}\s*from\s*'\.\/([\w.]+)';?/gm)];
    const pre = imps.map((m) => `const { ${m[1].replace(/\s+/g, ' ').trim()} } = M_${FILE2MOD[m[2]]};`).join('\n');
    const exps = [...src.matchAll(/^export\s+(?:const|function|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
    const body = src.replace(/^import\s*\{[\s\S]*?\}\s*from\s*'[^']+';?/gm, '').replace(/^export\s+/gm, '');
    out += `const M_${name} = (() => {\n${pre}\n${body}\nreturn { ${exps.join(', ')} };\n})();\n`;
    info.push(`${path.basename(f)} ${md5(src)}`);
  }
  return { js: out, info: info.join(', ') };
}

