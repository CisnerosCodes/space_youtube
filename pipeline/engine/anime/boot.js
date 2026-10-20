// boot.js: loads fonts and images, sets up beats, hits, actors and captions, exposes renderAt(t) and the
// QA hooks (window.AQ) the builder and tools read.
'use strict';
const cv = document.getElementById('cv');
useCtx(cv.getContext('2d'));
window.__ready = (async () => {
  await Promise.all(Object.entries(IMAGES).map(([k, v]) => loadImg(k, v.src)));
  await document.fonts.ready;
  await Promise.all(['800 40px Archivo', 'italic 900 40px Archivo', '600 40px "Plex Mono"', '500 40px "Plex Mono"', '40px "Dela Gothic One"'].map((f) => document.fonts.load(f, 'Aa1ゴドン°')));
  setupBeats();
  setupActors();
  setupHits();
  buildChunks(BEATS);
})();
window.__ready.catch((e) => { console.error('anime engine boot failed:', e && e.stack || e); window.__bootError = String(e && e.message || e); });
window.AQ = {
  get NF() { return NF; }, get LAST() { return LAST; }, WM, FPS,
  frames: (list) => list.map((f) => qaFrame(f)),
  range: (a, b) => { const out = []; for (let f = a; f < b; f++) out.push(qaFrame(f)); return out; },
  cues: () => cues(),
  beats: () => BEATS.map((b) => ({ i: b.i, id: b.id, type: b.spec.shot.type, word: b.w, T0: b.T0, T1: b.T1, transition: b.tr.type, N: b.tr.N })),
  chunks: () => CHUNKS.map((c) => ({ f0: c.f0, f1: c.f1, text: c.words.map((w) => w.text).join(' ') })),
  impacts: () => IMPACTS.slice(),
  actors: () => ({ ns: ACT.ns ? { distinct: ACT.ns.distinct, visits: ACT.ns.visits.map((v) => [v.f0, v.f1]) } : null, pho: ACT.pho ? { distinct: ACT.pho.distinct, visits: ACT.pho.visits.map((v) => [v.f0, v.f1]) } : null }),
  words: () => WF.map((w) => ({ i: w.i, text: w.text, f: w.f, start: w.start })),
};
const params = new URLSearchParams(location.search);
window.__ready.then(() => {
  if (params.has('t')) renderAt(Number(params.get('t')) || 0);
  else if (!params.has('still')) {
    let t0 = null;
    const loop = (ts) => { if (t0 === null) t0 = ts; renderAt(((ts - t0) / 1000) % (NF / FPS)); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
});
