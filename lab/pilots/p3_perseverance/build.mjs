// build.mjs (pilot 3): writes anim.html, one self-contained file (images, caption schedule, image
// metadata and the v3 mascot bundle inlined). Fonts load from Google Fonts, as the design system specifies.
// usage: node build.mjs [captions.json]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '../../mascot/v3/build/bundle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const capPath = path.resolve(process.argv[2] ?? path.join(HERE, 'captions.json'));
const captions = JSON.parse(readFileSync(capPath, 'utf8'));
const meta = JSON.parse(readFileSync(path.join(HERE, 'img/meta.json'), 'utf8'));
const images = {};
for (const f of readdirSync(path.join(HERE, 'img')).filter((f) => f.endsWith('.webp'))) {
  images[f.replace(/\.webp$/, '')] = 'data:image/webp;base64,' + readFileSync(path.join(HERE, 'img', f)).toString('base64');
}
const { js, info } = bundle();
let html = readFileSync(path.join(HERE, 'src/anim.template.html'), 'utf8');
const put = (key, val) => { if (!html.includes(key)) throw new Error('placeholder missing: ' + key); html = html.replace(key, () => val); };
put('/*__CAPTIONS__*/null', JSON.stringify(captions));
put('/*__IMAGES__*/null', JSON.stringify(images));
put('/*__META__*/null', JSON.stringify(meta));
put('/*__RIG__*/', js);
put('__BUILDINFO__', `captions ${path.relative(HERE, capPath)} (${captions.audio}, ${captions.duration} s); mascot v3 ${info}`);
writeFileSync(path.join(HERE, 'anim.html'), html);
console.log(`wrote anim.html (${(html.length / 1e6).toFixed(2)} MB); mascot ${info}; images ${Object.keys(images).join(', ')}`);
