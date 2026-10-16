// build.mjs: writes anim.html, one self-contained file (images, caption schedule and mascot rig inlined).
// usage: node build.mjs [captions.json]      (default ./captions.json, made by align_captions.mjs)
// Fonts still load from Google Fonts, as the design system specifies.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RIG = path.resolve(HERE, '../../mascot/v2/rig');
const capPath = path.resolve(process.argv[2] ?? path.join(HERE, 'captions.json'));

const captions = JSON.parse(readFileSync(capPath, 'utf8'));
const images = {};
for (const f of readdirSync(path.join(HERE, 'img')).filter((f) => f.endsWith('.webp'))) {
  images[f.replace(/\.webp$/, '')] = 'data:image/webp;base64,' + readFileSync(path.join(HERE, 'img', f)).toString('base64');
}

// Bundle the rig: core.mjs and catA.mjs as two nested function scopes, no module loader needed.
const coreSrc = readFileSync(path.join(RIG, 'core.mjs'), 'utf8');
const catSrc = readFileSync(path.join(RIG, 'catA.mjs'), 'utf8');
const exportsOf = (src) => [...src.matchAll(/^export\s+(?:const|function|let)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
const importM = catSrc.match(/^import\s*\{([\s\S]*?)\}\s*from\s*'\.\/core\.mjs';?/m);
const imported = importM ? importM[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
const strip = (src) => src.replace(/^import\s*\{[\s\S]*?\}\s*from\s*'[^']+';?/m, '').replace(/^export\s+/gm, '');
const coreNames = exportsOf(coreSrc);
const rigBundle = `const CatRig = (() => {
const Core = (() => {
${strip(coreSrc)}
return { ${coreNames.join(', ')} };
})();
const { ${imported.join(', ')} } = Core;
${strip(catSrc)}
return { draw, drawCat, resolve, VIEW, EXPR: Core.EXPR, PAL: Core.PAL };
})();`;
const md5 = (s) => createHash('md5').update(s).digest('hex').slice(0, 10);

let html = readFileSync(path.join(HERE, 'src/anim.template.html'), 'utf8');
const put = (key, val) => {
  if (!html.includes(key)) throw new Error('placeholder missing: ' + key);
  html = html.replace(key, () => val);
};
put('/*__CAPTIONS__*/null', JSON.stringify(captions));
put('/*__IMAGES__*/null', JSON.stringify(images));
put('/*__RIG__*/', rigBundle);
put('__BUILDINFO__', `captions ${path.relative(HERE, capPath)} (${captions.audio}, ${captions.duration} s); rig core.mjs ${md5(coreSrc)} catA.mjs ${md5(catSrc)}`);
writeFileSync(path.join(HERE, 'anim.html'), html);
const frames = Math.ceil(captions.duration * 30 - 1e-6);
console.log(`wrote anim.html (${(html.length / 1e6).toFixed(2)} MB): ${frames} frames = ${(frames / 30).toFixed(4)} s; `
  + `rig core ${md5(coreSrc)} catA ${md5(catSrc)}; images ${Object.keys(images).join(', ')}`);
