// main.js: load assets, expose renderAt(t)
const cv = document.getElementById('cv');
useCtx(cv.getContext('2d'));
window.__ready = (async () => {
  await Promise.all([
    loadImg('phobos', 'assets/phobos_a.png'),
    loadImg('phobosB', 'assets/phobos_b.png'),
    loadImg('mars', 'assets/mars.png'),
    loadImg('earthset', 'assets/earth_setting.jpg'),
  ]);
  await document.fonts.ready;
  await Promise.all(['800 40px Archivo', 'italic 900 40px Archivo', '600 40px "Plex Mono"', '500 40px "Plex Mono"', '40px "Dela Gothic One"'].map((f) => document.fonts.load(f, 'Aa1ゴ')));
})();
const MODE = (location.hash || '').slice(1);
window.renderAt = function (t) {
  setFrame(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  renderFrame(t);
};
