// ---------- 90_main.js: renderer + renderAt(t) ----------
const WID = 1080, HEI = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(WID, HEI, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(30, WID / HEI, 0.5, 600);
const creditEl = document.getElementById('credit'), stepEl = document.getElementById('steplbl');
let SCENES = null;

window.__ready = (async () => {
  for (const [k, v] of Object.entries(FONTS)) { const f = new FontFace(k, `url(${v})`); await f.load(); document.fonts.add(f); }
  CLAY.G.uPrintTex.value = CLAY.makePrintTexture();
  CAPS.init(renderer);
  POST.init(renderer, WID, HEI);
  SCENES = { T: WORLD.buildTable(), G: WORLD.buildGround(), C: WORLD.buildCard() };
  // the real photo (PIA10368, HiRISE), shown on the easel with its credit
  const img = new Image(); img.src = IMG.phobos; await img.decode();
  const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
  WORLD.W.photoMat.map = tex; WORLD.W.photoMat.needsUpdate = true;
  TL.init(SCENES);
  for (const s of Object.values(SCENES)) renderer.compile(s, camera);
})();

window.renderAt = (t) => {
  if (!SCENES) return;
  const pi = U.poseIndex(t);
  CLAY.G.uBoilSeed.value = pi % 97;
  const r = TL.update(t, SCENES, camera);
  POST.lens.uFocus.value = r.focus;
  POST.lens.uAperture.value = r.ap;
  POST.B.uWhip.value.set(r.whip[0], r.whip[1]);
  POST.B.uSeed.value = pi; POST.C.uSeed.value = Math.round(t * 30);
  // stop-motion exposure flicker (per pose frame)
  POST.C.uExposure.value = 1 + U.hashS(pi, 991) * 0.018;
  const box = CAPS.update(t, { show: r.capsOn !== false, step: r.step, stepT: r.stepT });
  // soft drop shadow of the plaque onto the set (rounded rect, a little down and right)
  if (box) { POST.C.uScrim.value.set((box.x0 + box.x1) / 2 + 8, HEI - (box.y0 + box.y1) / 2 - 14, (box.x1 - box.x0) / 2, (box.y1 - box.y0) / 2); POST.C.uScrimA.value = 0.6 * Math.min(1, SET.popScale(t, 0.06)); }
  else POST.C.uScrimA.value = 0;
  POST.C.uExposure.value *= 1 + 0.08 * (r.punch || 0);
  POST.render(renderer, r.scene, camera);
  CAPS.render(renderer);
  // credit line (inside the plaque, under the caption) and the STEP label of the heist meter
  const lines = [r.photo, ...(Array.isArray(r.credit) ? r.credit : [r.credit])].filter(Boolean);
  const html = box && SET.popScale(t, 0.06) > 0.9 ? lines.join('<br>') : '';
  if (creditEl.innerHTML !== html) creditEl.innerHTML = html;
  creditEl.style.top = (lines.length > 1 ? 1406 : 1424) + 'px';
  const st = r.step > 0 ? 'STEP' : '';
  if (stepEl.textContent !== st) stepEl.textContent = st;
};
