// boot.js: waits for fonts and images, lays out every beat, builds the cat, exposes renderAt(t).
(() => {
  window.__ready = (async () => {
    await Promise.all([
      document.fonts.load("800 100px 'Archivo'"), document.fonts.load("semi-expanded 800 100px 'Archivo'"), document.fonts.load("expanded 800 64px 'Archivo'"),
      document.fonts.load("700 90px 'Archivo'"), document.fonts.load("500 28px 'IBM Plex Mono'"),
    ]);
    await document.fonts.ready;
    await Promise.all(E.imgPromises);
    E.measureFonts();
    E.buildChunks();
    E.setupBeats();
    E.setupChrome();
    E.buildCat();
    window.CUES = E.cues();
  })();
  window.renderAt = (t) => E.renderAt(t);
  window.SD = {
    get F() { return Object.fromEntries(E.BEATS.map((b) => [b.id, b.w])); },
    get NF() { return E.NF; }, get LAST() { return E.LAST; }, FPS: E.FPS, W: E.W,
    get CHUNKS() { return E.CHUNKS; }, get BEATS() { return E.BEATS.map((b) => ({ i: b.i, id: b.id, type: b.spec.shot.type, word: b.w, T0: b.T0, T1: b.T1, end: b.end, transition: b.tr })); },
    captionsAt: (f) => E.captionsAt(f), lintCat: () => E.lintCat(), checkLayout: () => E.checkLayout(), checkFill: () => E.checkFill(),
    lastSamples: () => E.lastSamples(), get cat() { return E.CAT.actor; }, get catMoves() { return E.CAT.moves; },
  };
  const params = new URLSearchParams(location.search);
  window.__ready.then(() => {
    if (params.has('t')) E.renderAt(Number(params.get('t')) || 0);
    else {
      let t0 = null;
      const loop = (ts) => { if (t0 === null) t0 = ts; E.renderAt(((ts - t0) / 1000) % (E.NF / E.FPS)); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }).catch((e) => { console.error('engine boot failed:', e && e.stack || e); window.__bootError = String(e && e.message || e); });
})();
