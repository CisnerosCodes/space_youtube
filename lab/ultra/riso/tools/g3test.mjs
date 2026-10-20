import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(pathToFileURL(path.resolve('page.html')).href);
await p.evaluate(async () => { await window.__ready; });
const url = await p.evaluate(() => {
  const out = mkCanvas(1080, 1920), x = out.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1080, 1920);
  const items = [];
  [[0, 0], [1.5, 0], [3.1, 0], [4.6, 0]].forEach(([a, b], i) => items.push({ kind: 'phobos', x: 270 + (i % 2) * 540, y: 300 + Math.floor(i / 2) * 520, s: 16, rot: phobosRot(a, -0.3, 0.2), flat: i === 0 ? 1 : 0 }));
  x.drawImage(G3.render(items), 0, 0);
  [[-0.85, 1.15], [-0.85, 1.9], [0.4, 1.15]].forEach(([lat, spin], i) => { x.drawImage(G3.render([{ kind: 'mars', x: 180 + i * 360, y: 1450, r: 170, spin, lat, tilt: 0, light: [0, 0.3, 1] }]), 0, 0); });
  return out.toDataURL('image/png');
});
writeFileSync('qa/g3test.png', Buffer.from(url.split(',')[1], 'base64'));
await b.close();
