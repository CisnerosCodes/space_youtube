// ---------- 90_main.js: renderer + renderAt(t) ----------
const WID = 1080, HEI = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(WID, HEI, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(30, WID / HEI, 0.5, 600);
const creditEl = document.getElementById('credit');
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
  const box = CAPS.update(t, { y: r.capY });
  if (box) { POST.C.uScrim.value.set(box[0] + box[2] / 2, HEI - (box[1] + box[3] / 2), box[2] * 0.62, box[3] * 0.95 + 90); POST.C.uScrimA.value = 0.45; }
  else POST.C.uScrimA.value = 0;
  POST.render(renderer, r.scene, camera);
  CAPS.render(renderer);
  const lines = [r.photo, r.credit].filter(Boolean);
  const html = lines.join('<br>');
  if (creditEl.innerHTML !== html) creditEl.innerHTML = html;
  creditEl.style.top = (lines.length > 1 ? 1452 : 1478) + 'px';
};
