import { chromium } from '/home/user/space_youtube/lab/motion-ab-test/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 600 } });
await page.goto('file:///home/user/space_youtube/lab/ultra/kinetic/index_probe.html');
const r = await page.evaluate(async () => {
  const buf = 'url(fonts/archivo-vf.woff2)';
  const out = {};
  for (const w of [62, 80, 100, 125]) {
    const ff = new FontFace('AW' + w, buf, { stretch: w + '%', weight: '100 900' });
    await ff.load(); document.fonts.add(ff);
  }
  const ff2 = new FontFace('AV', buf, { stretch: '62% 125%', weight: '100 900' }); await ff2.load(); document.fonts.add(ff2);
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  for (const w of [62, 80, 100, 125]) { ctx.font = `800 100px AW${w}`; out['AW' + w] = ctx.measureText('slow-motion').width; }
  for (const wt of [100, 300, 350, 400, 800, 900]) { ctx.font = `${wt} 100px AW100`; out['wt' + wt] = ctx.measureText('slow-motion').width; }
  for (const k of ['condensed', 'normal', 'expanded', 'ultra-expanded']) { ctx.font = `800 100px AV`; ctx.fontStretch = k; out['AV-' + k] = ctx.measureText('slow-motion').width; }
  ctx.fontStretch = 'normal'; ctx.letterSpacing = '10px'; ctx.font = `800 100px AW100`; out.ls = ctx.measureText('slow-motion').width;
  return out;
});
console.log(r);
await browser.close();
