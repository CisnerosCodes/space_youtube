// runtime.js: beats and transitions, camera shake, impact frames, actors, the UI layer (captions, kicker,
// chips, SFX lettering, credits), sound cues and the QA hooks the builder reads. renderAt(t) is a pure
// function of t (frame = round(t * 30)).
'use strict';
const BEATS = [];
const TR_LEAD = { whip: 0.5, iris: 0.5, cut: 0, smash: 0, none: 0 };
function setupBeats() {
  PLAN.beats.forEach((spec, i) => {
    const t = spec.transition || { type: i === 0 ? 'none' : 'cut' };
    const type = spec.shot.type === 'band' ? 'none' : t.type || 'cut';
    const N = type === 'whip' ? clamp(t.frames ?? 10, 6, 16) : type === 'iris' ? clamp(t.frames ?? 10, 6, 16) : 0;
    const w = A(spec.start);
    let T0 = i === 0 ? 0 : Math.max(0, w - Math.round(N * (TR_LEAD[type] ?? 0)));
    if (spec.shot.type === 'band') T0 = Math.max(0, w - (spec.shot.lead ?? (BAND_ST[spec.shot.style ?? 1]?.enter || 8)));
    BEATS.push({ i, id: spec.id || 'beat' + i, spec, tr: { ...t, type, N }, w, T0, wIdx: WF.findIndex((x) => x.f === w) });
  });
  BEATS.forEach((b, i) => {
    const nx = BEATS[i + 1];
    b.next = nx || null; b.prev = BEATS[i - 1] || null;
    b.T1 = nx ? nx.T0 : NF;
    // last frame drawn + 1: through the next beat's transition, never while a band draws it itself
    b.end = !nx ? NF : nx.spec.shot.type === 'band' ? nx.T0 : nx.T0 + nx.tr.N;
  });
  // a band reveals the next beat itself: that beat has no transition of its own
  BEATS.forEach((b) => { if (b.prev && b.prev.spec.shot.type === 'band') { b.tr = { type: 'none', N: 0 }; } });
  for (const b of BEATS) {
    const make = SHOTS[b.spec.shot.type];
    if (!make) throw new Error(`anime engine: beat ${b.i} (${b.id}): unknown shot type "${b.spec.shot.type}"`);
    b.shot = make(b.spec.shot, b);
  }
}
const beatAt = (f) => BEATS.slice().reverse().find((b) => f >= b.T0) || BEATS[0];
// a beat's own picture plus its chips and SFX lettering (all in shot space, so they travel with transitions)
function drawBeat(b, f, nested = false) {
  const prevSrc = R.source; R.source = b.spec.source || null;
  ctx.save();
  b.shot.draw(f);
  ctx.restore();
  ctx.save(); drawBeatDecor(b, f); ctx.restore();
  R.source = prevSrc;
}
function drawBeatDecor(b, f) {
  let y = 330;
  for (const c of b.spec.chips || []) {
    const a = A(c.at), u = c.until != null ? A(c.until) : NF + 100;
    const k = inv(a, a + 8, f) * (1 - inv(u, u + 6, f));
    if (k <= 0) continue;
    const yy = c.y ?? y;
    const r = drawChip(c.lines, c.x ?? 80, yy, k, { size: c.size ?? 31, accent: col(c.accent, C.amber) });
    if (r && c.y == null) y = yy + r[3] + 14;
  }
  for (const s of b.spec.sfx || []) {
    const a = A(s.at), d = s.for ?? 18;
    if (f < a || f >= a + d) continue;
    const pop = E.back(inv(a, a + 4, f), 2.4);
    const sz = s.size ?? 100, rot = s.rot ?? -0.1;
    const [x, y] = sfxFit(s.text, s.pos?.[0] ?? 600, s.pos?.[1] ?? 420, sz, rot);
    R.moving += pop < 0.999 || pop > 1.001 ? 1 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(lerp(1.5, 1, pop), lerp(1.5, 1, pop));
    sfxText(s.text, 0, 0, sz, { rot, fill: col(s.color, C.amber), alpha: 1 - inv(a + d - 4, a + d, f) });
    ctx.restore();
    R.moving -= pop < 0.999 || pop > 1.001 ? 1 : 0;
  }
}

// ---------------------------------------------------------------- hits: camera shake and impact frames
let IMPACTS = [], HITS = [];
function setupHits() {
  const imp = new Set();
  for (const a of PLAN.impacts || []) imp.add(A(a));
  for (const b of BEATS) if (b.spec.impact != null) imp.add(A(b.spec.impact));
  IMPACTS = [...imp].sort((a, b) => a - b);
  HITS = IMPACTS.map((f) => [f, 1]);
  for (const b of BEATS) {
    if (b.tr.type === 'smash') HITS.push([b.w, 0.8]);
    for (const h of b.shot.hits?.() || []) HITS.push(h);
  }
  for (const h of PLAN.hits || []) HITS.push([A(h.at), h.amp ?? 0.6]);
  for (const a of ['ns', 'pho']) for (const m of ACT[a]?.moves || []) if (['pump', 'gasp'].includes(m.do)) HITS.push([m.f, 0.3]);
}
function shakeF(f, scale = 1) { return shakeAt(sec(f), HITS.map(([h, a]) => [sec(h), a]), 30 * scale, 0.55); }
function impactPost(f) {
  if (!IMPACTS.includes(f)) return;
  if (!G.tmp) { G.tmp = document.createElement('canvas'); G.tmp.width = W; G.tmp.height = H; }
  const tc = G.tmp.getContext('2d'); tc.setTransform(1, 0, 0, 1, 0, 0); tc.filter = 'none'; tc.drawImage(ctx.canvas, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'grayscale(1) contrast(7) brightness(1.15)'; ctx.drawImage(G.tmp, 0, 0); ctx.filter = 'none';
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#ff3b2f'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------- the picture
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], 'up-left': [-0.62, -0.78], 'up-right': [0.62, -0.78], 'down-left': [-0.62, 0.78], 'down-right': [0.62, 0.78] };
function paintPicture(f, sub = 0) {
  fillBg(C.ink);
  const vis = BEATS.filter((b) => f >= b.T0 && f < b.end);
  const inc = vis.find((b) => b.tr.N && f < b.T0 + b.tr.N && b.prev && vis.includes(b.prev));
  if (inc && inc.tr.type === 'whip') {
    const a = inc.prev, bb = inc;
    const u = E.io(clamp((f + sub - bb.T0) / bb.tr.N));
    const v = DIRS[bb.tr.dir || 'up'] || DIRS.up, D = Math.abs(v[1]) > 0.9 ? H : 1700;
    R.moving++;
    ctx.save(); ctx.translate(v[0] * u * D, v[1] * u * D); ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); ctx.clip(); drawBeat(a, f); ctx.restore();
    ctx.save(); ctx.translate(-v[0] * (1 - u) * D, -v[1] * (1 - u) * D); ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); ctx.clip(); drawBeat(bb, f); ctx.restore();
    R.moving--;
    speedLines(Math.atan2(v[1], v[0]) * 180 / Math.PI, { n: 50, alpha: 0.85 * Math.sin(Math.PI * u), speed: 7000, seed: 8, color: C.paper });
    return;
  }
  if (inc && inc.tr.type === 'iris') {
    const p = clamp((f + sub - inc.T0) / inc.tr.N), c = inc.tr.at || [540, 760];
    drawBeat(inc.prev, f);
    const r = E.out5(p) * 2300;
    R.moving++;
    ctx.save(); ctx.beginPath(); ctx.arc(c[0], c[1], Math.max(1, r), 0, Math.PI * 2); ctx.clip(); drawBeat(inc, f); ctx.restore();
    R.moving--;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 30; ctx.beginPath(); ctx.arc(c[0], c[1], r + 10, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.amber; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(c[0], c[1], r + 10, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  const b = vis[vis.length - 1] || beatAt(f);
  if (b.tr.type === 'smash' && f < b.w + 6) {
    const z = lerp(1.22, 1, E.out5(inv(b.w, b.w + 6, f)));
    ctx.save(); ctx.translate(540, 900); ctx.scale(z, z); ctx.translate(-540, -900); R.moving++; drawBeat(b, f); R.moving--; ctx.restore();
    return;
  }
  drawBeat(b, f);
}
// whip pans get motion blur: the frame is drawn once, then smeared along the pan direction by the distance
// the picture travels in 0.6 of a frame (K shifted copies, averaged), so text streaks instead of doubling
let ACC = null, TMP = null;
function whipAt(f) { return BEATS.find((b) => b.tr.type === 'whip' && f >= b.T0 && f < b.T0 + b.tr.N) || null; }
function renderPicture(f, sx, sy, sr) {
  ctx.save();
  ctx.translate(540 + sx, 960 + sy); ctx.rotate(sr); ctx.translate(-540, -960);
  paintPicture(f, 0);
  ctx.restore();
  const inc = whipAt(f);
  if (!inc || window.__QA_FAST) return 1;
  const v = DIRS[inc.tr.dir || 'up'] || DIRS.up, D = Math.abs(v[1]) > 0.9 ? H : 1700;
  const u0 = E.io(clamp((f - 0.3 - inc.T0) / inc.tr.N)), u1 = E.io(clamp((f + 0.3 - inc.T0) / inc.tr.N));
  const L = Math.min(420, Math.abs(u1 - u0) * D);
  if (L < 3) return 1;
  if (!ACC) { ACC = document.createElement('canvas'); ACC.width = W; ACC.height = H; TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H; }
  const tc = TMP.getContext('2d'); tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalAlpha = 1; tc.drawImage(ctx.canvas, 0, 0);
  const ac = ACC.getContext('2d'); ac.setTransform(1, 0, 0, 1, 0, 0); ac.globalAlpha = 1; ac.fillStyle = C.ink; ac.fillRect(0, 0, W, H);
  const K = Math.max(4, Math.min(24, Math.ceil(L / 8)));
  for (let i = 0; i < K; i++) { const d = (i / (K - 1) - 0.5) * L; ac.globalAlpha = 1 / (i + 1); ac.drawImage(TMP, v[0] * d, v[1] * d); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(ACC, 0, 0); ctx.restore();
  return K;
}

// ---------------------------------------------------------------- actors
const ACT = { ns: null, pho: null };
function setupActors() { ACT.ns = makeActor(PLAN.cast?.ns, 'ns'); ACT.pho = makeActor(PLAN.cast?.pho, 'pho'); }

// ---------------------------------------------------------------- kicker pips (numbered steps from the bands)
function pipsAt(f) {
  const bands = BEATS.filter((b) => b.spec.shot.type === 'band' && b.spec.shot.step);
  if (!bands.length) return null;
  const n = bands[0].spec.shot.steps || bands.length;
  if (bands.some((b) => f >= b.T0 && f < b.T1)) return null;
  const done = bands.filter((b) => f >= b.T0);
  if (!done.length) return null;
  const nb = BEATS.find((b) => b.spec.shot.type === 'next' || (b.spec.shot.type === 'band' && b.spec.shot.style === 'next'));
  if (nb && f >= nb.T0) return null;
  return { n, on: done[done.length - 1].spec.shot.step };
}

// ---------------------------------------------------------------- frame
const QA = { frame: null };
function renderFrame(f) {
  resetRegistry(); R.ns = false;
  const [sx, sy, sr] = shakeF(f);
  G.shake = Math.hypot(sx, sy) + Math.abs(sr) * 800;
  renderPicture(f, sx, sy, sr);
  // actors in screen space (they shake with the picture)
  const st = { ns: ACT.ns ? ACT.ns.state(f) : null, pho: ACT.pho ? ACT.pho.state(f) : null };
  ctx.save(); ctx.translate(sx, sy);
  const wp = whipAt(f);
  const whipShift = (vis) => {
    if (!wp || !vis) return [0, 0];
    const v = DIRS[wp.tr.dir || 'up'] || DIRS.up, D = Math.abs(v[1]) > 0.9 ? H : 1700, u = E.io(clamp((f - wp.T0) / wp.tr.N));
    return vis[0] < wp.T0 ? [v[0] * u * D, v[1] * u * D] : [-v[0] * (1 - u) * D, -v[1] * (1 - u) * D];
  };
  for (const k of ['ns', 'pho']) if (st[k]) { const vv = ACT[k].visits.find((q) => f >= q.f0 && f < q.f1); const [dx, dy] = whipShift(vv ? [vv.f0] : null); st[k].x += dx; st[k].y += dy; st[k].baseY += dy; if (dx || dy) st[k].moving = true; }
  if (st.pho) { R.moving += st.pho.moving ? 1 : 0; drawActor(st.pho); R.moving -= st.pho.moving ? 1 : 0; }
  if (st.ns) { R.moving += st.ns.moving ? 1 : 0; drawActor(st.ns); R.moving -= st.ns.moving ? 1 : 0; R.ns = true; }
  ctx.restore();
  // UI layer: captions shake a little with the hits (clamped to the safe area); kicker and credit do not
  const endB = BEATS.find((b) => b.shot.end);
  const onEnd = endB && f >= endB.T0;
  const nb = BEATS.find((b) => b.spec.shot.type === 'next' || (b.spec.shot.type === 'band' && b.spec.shot.style === 'next'));
  drawCaptions(f, [sx * 0.35, sy * 0.35]);
  if (!onEnd) drawKicker(nb && f >= nb.T0 ? `NEXT ON ${PLAN.series}` : PLAN.series, 0.95, pipsAt(f));
  const lines = creditLines();
  drawCredit(lines);
  impactPost(f);
  QA.frame = { f, lines, st };
}
function renderAt(t) {
  const f = Math.min(LAST, Math.max(0, Math.round(t * FPS)));
  setFrame(f / FPS);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  renderFrame(f);
}

// ---------------------------------------------------------------- sound cues (curated, for lab/sound/mix.py)
function cues() {
  const raw = [];
  const c = (frame, type, note, pri, extra = {}) => raw.push({ frame: Math.round(frame), fps: FPS, type, note, pri, ...extra });
  for (const f of IMPACTS) c(f, 'number_slam', 'impact frame', 85);
  for (const b of BEATS) {
    if (!b.i) continue;
    if (b.spec.shot.type === 'band') c(b.T0 + 2, b.spec.shot.style === 'next' ? 'next_card_in' : 'hard_cut', `${b.id} band wipes in`, 75);
    else if (b.tr.type === 'whip') c(b.T0 + Math.round(b.tr.N / 2), 'scene_move', `whip into ${b.id}`, 50);
    else if (b.tr.type === 'smash') c(b.w, 'impact', `smash cut into ${b.id}`, 60);
    else if (b.tr.type === 'iris') c(b.T0 + 2, 'reveal', `iris into ${b.id}`, 55);
    else if (b.tr.type === 'cut' && b.spec.hit) c(b.w, 'hard_cut', `cut into ${b.id}`, 45);
    if (b.spec.shot.type === 'craft' && b.spec.shot.liftoff) c(A(b.spec.shot.liftoff.at), 'impact', 'liftoff', 58, { sfx: 'impact_big', gain_db: -3 });
    if (b.spec.shot.type === 'craft' && b.spec.shot.splash) c(A(b.spec.shot.splash.at), 'impact', 'splashdown', 58);
  }
  const chirp = (ACT.ns?.moves || []).find((m) => ['pump', 'wink', 'hold'].includes(m.do));
  if (chirp) c(chirp.f + 3, 'cat_chirp', 'Night Shift reacts (' + chirp.do + ')', 40);
  const ent = (ACT.ns?.moves || []).find((m) => m.do === 'enter');
  if (ent) c(ent.f + 4, 'cat_in', 'Night Shift enters', 30);
  c(WM, 'wordmark_echo', 'wordmark echo mark, sonic logo', 100);
  const maxN = Math.min(20, Math.max(8, Math.floor((18 * NF) / (35 * FPS)))), minGap = 9;
  const keep = [];
  for (const q of raw.sort((a, b) => b.pri - a.pri || a.frame - b.frame)) {
    if (keep.length >= maxN) break;
    if (keep.some((x) => Math.abs(x.frame - q.frame) < minGap)) continue;
    keep.push(q);
  }
  return keep.sort((a, b) => a.frame - b.frame).map(({ pri, ...q }) => q);
}

// ---------------------------------------------------------------- QA: per-frame records for the builder
// settled(f): no transition and no band on screen, and at least 6 frames after a beat start
function settled(f) {
  const b = beatAt(f);
  if (b.spec.shot.type === 'band') return false;
  if (b.tr.N && f < b.T0 + b.tr.N + 6) return false;
  if (f < b.w + 6) return false;
  const nx = b.next; if (nx && f >= nx.T0 - 1) return false;
  return true;
}
function qaFrame(f) {
  window.__QA_FAST = true;
  renderAt(f / FPS);
  window.__QA_FAST = false;
  const b = beatAt(f);
  const st = QA.frame.st;
  return {
    f, beat: b.id, type: b.spec.shot.type, settled: settled(f), impact: IMPACTS.includes(f),
    caps: R.caps.map((c) => ({ i: c.i, x0: Math.round(c.x0), y0: Math.round(c.y0), x1: Math.round(c.x1), y1: Math.round(c.y1), band: !!c.band, moving: !!c.moving })),
    text: R.text.filter((t) => !t.moving).map((t) => ({ kind: t.kind, text: t.text, x0: Math.round(t.x0), y0: Math.round(t.y0), x1: Math.round(t.x1), y1: Math.round(t.y1) })),
    photos: [...R.photos].map((n) => ({ name: n, credit: IMAGES[n].credit })), illus: [...R.illus], lines: QA.frame.lines,
    ns: !!R.ns, nsBox: st.ns ? actorBox(st.ns) : null, phoBox: st.pho ? actorBox(st.pho) : null, actorsMoving: !!((st.ns && st.ns.moving) || (st.pho && st.pho.moving)),
    subjects: (b.shot.subjects?.(f) || []).map((r) => r.map(Math.round)),
  };
}
