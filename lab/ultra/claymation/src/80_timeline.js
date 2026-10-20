// ---------- 80_timeline.js: shots, camera, the cat's performance and every prop, as a pure function of t ----------
// Round 2: whips cut to 4 or 5 frames, a poke-and-boing on "moon", impact punches on the emphasis words,
// the either/or flag, a flip calendar, the slow free fall onto a blank-dial scale, a clean coring shot,
// a NEXT beat that lands on the Electron set, a fuller end card.
const TL = (() => {
  const W = WORLD.W;
  const ws = (i) => WORDS[i].start;
  const V = (a) => new THREE.Vector3(...a);
  const E = U.ease, seg = U.seg;

  // ===================== CAMERA (smooth, 30 fps) =====================
  // [scene, t, pos, look, fov, opts{e: ease into this key, ap: aperture px, cut: hard cut at this key}]
  const CAM = [
    // A: hook. Phobos on its brass pin, the cat with his pointer; push in to the poke on "moon", pull back on "collision"
    ['T', 0.00, [16.2, 9.6, 46.0], [9.5, 7.0, 11.5], 30, { ap: 15 }],
    ['T', 0.33, [15.7, 9.4, 43.6], [9.4, 7.2, 11.5], 30, { e: 'out', ap: 15 }],
    ['T', 1.74, [15.3, 9.7, 42.2], [9.3, 7.3, 11.5], 30, { e: 'sine', ap: 15 }],
    ['T', 2.72, [15.0, 25.5, 71.5], [3.7, 9.3, 8.0], 34, { e: 'io', ap: 13 }],
    ['T', 3.30, [14.8, 25.2, 70.5], [3.7, 9.3, 8.0], 34, { e: 'out', ap: 13 }],
    // whip left to the pad (4 frames)
    ['T', 3.44, [-27.0, 7.6, 62.5], [-36.6, 4.6, 18.0], 30, { e: 'io', ap: 11 }],
    ['T', 4.75, [-27.3, 7.8, 61.0], [-36.6, 5.0, 18.0], 30, { e: 'sine', ap: 11 }],
    ['T', 5.70, [-28.0, 7.4, 56.0], [-35.2, 4.9, 19.0], 30, { e: 'io', ap: 12 }],
    ['T', 7.26, [-28.2, 7.6, 54.8], [-35.2, 5.4, 19.0], 30, { e: 'sine', ap: 12 }],
    // whip into the run (step one), 4 frames
    ['T', 7.40, [-17.0, 9.2, 66.0], [-22.5, 5.0, 28.0], 30, { e: 'io', ap: 10 }],
    ['T', 8.85, [-7.8, 9.5, 62.0], [-7.3, 5.2, 16.0], 32, { e: 'sine', ap: 10 }],
    ['T', 10.56, [-8.2, 9.8, 57.2], [-7.5, 5.5, 15.0], 32, { e: 'sine', ap: 10 }],
    ['T', 10.63, [-6.0, 10.5, 48.0], [-5.0, 60.0, 10.0], 30, { e: 'in', ap: 10 }],
    // G: Phobos ground. land on MMX with the rover, the cat looking up; follow the slow fall down to the scale
    ['G', 10.63, [-7.0, 2.0, 48.0], [-1.0, 70.0, -20.0], 38, { ap: 9 }],
    ['G', 10.73, [-7.0, 2.0, 46.5], [-1.0, 7.3, 3.0], 38, { e: 'out', ap: 9 }],
    ['G', 11.95, [-4.6, 2.5, 44.6], [-0.6, 7.5, 3.0], 38, { e: 'sine', ap: 9 }],
    ['G', 15.60, [-1.0, 10.4, 42.0], [-1.0, 3.1, 5.0], 30, { e: 'sine', ap: 10 }],
    ['G', 16.45, [-1.0, 10.3, 41.3], [-1.0, 3.1, 5.0], 30, { e: 'sine', ap: 11 }],
    ['G', 16.80, [-1.0, 10.0, 38.8], [-1.0, 3.2, 5.0], 30, { e: 'out', ap: 12 }],
    ['G', 18.20, [-1.0, 10.0, 38.2], [-1.0, 3.25, 5.0], 30, { e: 'sine', ap: 12 }],
    // pull back and pan left as MMX crosses the frame and lands
    ['G', 19.00, [-8.0, 10.0, 55.0], [-6.0, 2.4, -2.0], 32, { e: 'io', ap: 9 }],
    ['G', 19.90, [-8.0, 9.8, 53.0], [-6.0, 2.4, -2.0], 32, { e: 'out', ap: 9 }],
    ['G', 20.96, [-7.0, 8.4, 44.0], [-5.6, 2.8, 1.0], 31, { e: 'io', ap: 11 }],
    // coring arm: a clean side shot, outside the legs, nothing in the foreground
    ['G', 20.97, [-28.0, 6.0, 12.0], [-10.3, -0.2, -3.1], 30, { cut: true, ap: 12 }],
    ['G', 21.76, [-26.6, 5.6, 10.8], [-10.3, -0.2, -3.1], 30, { e: 'sine', ap: 12 }],
    // nitrogen blast: wide, the puffs hit the cat
    ['G', 21.77, [-3.0, 6.8, 40.0], [-3.6, 3.2, 0.5], 31, { cut: true, ap: 10 }],
    ['G', 22.86, [-3.2, 6.6, 37.8], [-3.6, 3.3, 0.5], 31, { e: 'sine', ap: 10 }],
    // target: macro on the jar
    ['G', 22.90, [-1.4, 4.2, 24.5], [-2.2, 0.5, 10.5], 26, { cut: true, ap: 16 }],
    ['G', 24.80, [-1.6, 4.0, 22.7], [-2.2, 0.5, 10.5], 26, { e: 'sine', ap: 16 }],
    ['G', 24.87, [-1.6, 4.4, 22.3], [-1.8, 60.0, -10.0], 26, { e: 'in', ap: 16 }],
    // back on the table: MMX beside Phobos with Mars filling the frame behind; the burn; whip to Earth
    ['T', 24.87, [31.4, 13.6, 6.6], [12.6, 70.0, 2.2], 30, { ap: 12 }],
    ['T', 24.97, [31.4, 13.6, 6.6], [12.6, 9.4, 2.2], 30, { e: 'out', ap: 12 }],
    ['T', 26.72, [30.4, 13.4, 6.4], [12.7, 9.5, 2.3], 30, { e: 'sine', ap: 12 }],
    ['T', 27.38, [29.6, 13.6, 7.0], [16.0, 11.5, 4.0], 30, { e: 'sine', ap: 12 }],
    ['T', 27.56, [44.0, 11.0, 36.5], [44.4, 7.0, 0.0], 30, { e: 'io', ap: 11 }],
    ['T', 27.75, [45.0, 10.4, 36.0], [44.6, 6.6, 0.0], 30, { e: 'out', ap: 11 }],
    ['T', 30.40, [45.4, 9.6, 34.5], [45.0, 6.2, 0.0], 30, { e: 'sine', ap: 11 }],
    // the loot: cat + easel with the real photo
    ['T', 30.80, [48.6, 8.6, 47.5], [48.4, 5.4, 10.0], 30, { e: 'io', ap: 12 }],
    ['T', 34.70, [48.8, 8.4, 45.6], [48.5, 5.5, 10.0], 30, { e: 'sine', ap: 12 }],
    // NEXT: whip right to Electron (4 frames)
    ['T', 34.84, [68.4, 9.6, 56.0], [68.4, 5.6, 17.0], 30, { e: 'io', ap: 10 }],
    ['T', 36.60, [67.4, 10.2, 55.5], [68.4, 5.6, 17.0], 30, { e: 'sine', ap: 10 }],
    ['T', 38.70, [69.4, 9.0, 55.0], [68.4, 5.6, 17.0], 30, { e: 'sine', ap: 10 }],
    // end card
    ['C', 38.73, [0.0, 33.2, 60.0], [0.0, 33.2, 0.0], 30, { cut: true, ap: 3 }],
    ['C', 42.20, [0.0, 33.2, 57.6], [0.0, 33.2, 0.0], 30, { e: 'sine', ap: 3 }],
  ];
  function camAt(t) {
    let i = 0; while (i + 1 < CAM.length && CAM[i + 1][1] <= t) i++;
    const a = CAM[i], b = CAM[i + 1];
    let pos = a[2], look = a[3], fov = a[4], ap = a[5].ap ?? 10, scene = a[0];
    if (b && b[0] === a[0] && t > a[1] && !b[5].cut) {
      const u = (E[b[5].e || 'io'])(seg(t, a[1], b[1]));
      pos = a[2].map((v, j) => U.lerp(v, b[2][j], u)); look = a[3].map((v, j) => U.lerp(v, b[3][j], u));
      fov = U.lerp(a[4], b[4], u); ap = U.lerp(a[5].ap ?? 10, b[5].ap ?? 10, u);
    }
    return { scene, pos, look, fov, ap };
  }

  // ===================== PUNCHES: a stop-motion "bump" on the emphasis words (on twos) =====================
  const PUNCH = [
    [ws(1) + 0.03, 0.6], [ws(6), 1.0], [ws(12) + 0.12, 1.0], [ws(14), 0.7], [ws(16), 0.6], [ws(25), 0.7],
    [ws(28) + 0.04, 0.45], [ws(32), 0.75], [ws(39), 1.0], [ws(44), 0.8], [ws(47), 0.8], [ws(52), 0.8],
    [ws(57), 0.9], [ws(65), 0.8], [ws(68), 0.8], [ws(81), 0.4], [ws(85), 0.55],
  ];
  const PSHAPE = [1, 0.55, 0.25, 0.1];
  function punchAt(t) {
    let p = 0;
    for (const [t0, a] of PUNCH) { if (t < t0) continue; const f = Math.floor((t - t0) * 15 + 1e-6); if (f < PSHAPE.length) p = Math.max(p, PSHAPE[f] * a); }
    return p;
  }

  // ===================== THE CAT (poses on twos) =====================
  const NEUT = { eyeS: 1, squint: 0, sly: 0, browL: 0, browR: 0, browAL: 0, browAR: 0, smile: 0.3, mouthO: 0, mouth: 0, earL: 0, earR: 0, headS: 1 };
  const ARMS0 = { aLz: 0.18, aLx: 0, aLy: 0, eL: 0.25, aRz: 0.18, aRx: 0, aRy: 0, eR: 0.25, pawL: 1, pawR: 1 };
  const BODY0 = { lean: 0, torsoX: 0, torsoZ: 0, torsoY: 0, headX: 0, headY: 0, headZ: 0, hipY: 0, sq: 0, rise: 0 };
  const K = [];
  const k = (t, o, d = 0.27, e = 'io') => K.push({ t, d, e, ...o });
  const at = (t, x, y, z, ry, d = 0.01, e = 'lin') => k(t, { x, y, z, ry }, d, e);

  // ---- A: hook. pointer on the shoulder, poke Phobos on "moon", slow-motion turn to camera, gasp at "collision course" ----
  const POKE = ws(1) + 0.02, DROP = ws(6) - 0.02;
  at(-1, 11.2, 2.45, 13.6, -0.45);
  k(-1, { ...NEUT, ...ARMS0, ...BODY0, headX: -0.55, headY: -0.25, lookY: 0.8, lookX: -0.5, browL: 0.3, browR: 0.2, smile: 0.15,
    aRz: 0.3, aRx: 1.1, eR: 2.1, aLz: 0.3, aLx: 0.75, eL: 1.35, earL: -0.3, earR: -0.2, tail: 0.6, talk: 0 });
  k(0.07, { headX: -0.4, aLx: 0.45, eL: 1.7, hipY: -0.14, sq: -0.05, browAL: 0.15, browAR: -0.1 }, 0.13);          // wind-up
  k(POKE - 0.07, { aLz: 0.22, aLx: 2.3, eL: 0.1, pawL: 1.12, hipY: 0, sq: 0.06, rise: 0.3, headX: -0.62, eyeS: 1.16, browL: 0.55, browR: 0.5,
    earL: 0.45, earR: 0.45, lookX: -0.6, lookY: 0.9, smile: 0.5 }, 0.1, 'outBack');                                        // poke!
  k(POKE + 0.2, { rise: 0, sq: 0, aLx: 2.05, eL: 0.3, eyeS: 1.25, mouth: 0.25, mouthO: 0.6 }, 0.14);                  // the moon boings
  k(0.86, { aLx: 0.8, eL: 1.1, aLz: 0.35, headX: -0.2, headY: 0.3, lookX: 0.35, lookY: 0.05, sly: 0.45, smile: 0.75, mouth: 0, mouthO: 0,
    browAL: -0.15, browAR: 0.3, eyeS: 1.0, earL: 0.1, earR: 0.1, torsoY: 0.1 }, 0.75, 'sine');                       // slow-motion turn to camera
  k(1.62, { hipY: -0.25, sq: -0.06, eyeS: 0.9, headX: -0.1, sly: 0.2 }, 0.14);                                              // anticipation
  k(DROP, { hipY: 0, sq: 0.1, rise: 0.7, eyeS: 1.38, mouth: 0.9, mouthO: 1, browL: 0.75, browR: 0.75, browAL: 0.2, browAR: 0.2, sly: 0, smile: -0.4,
    earL: 0.85, earR: 0.85, aLz: 0.55, aLx: 1.25, eL: 2.25, aRz: 0.55, aRx: 1.25, eR: 2.25, aRy: 0, headX: -0.18, headY: 0, lookX: 0, lookY: 0.2, lean: 0.06, torsoY: 0 }, 0.12, 'outBack');
  k(ws(6) + 0.2, { rise: 0, sq: -0.08 }, 0.12, 'in2');
  k(ws(6) + 0.36, { sq: 0 }, 0.14);
  k(ws(8), { aLz: 1.4, aLx: 0.9, eL: 0.2, aRz: 0.5, aRx: 1.2, eR: 2.2, headY: 0.25, headX: -0.05, lookX: -0.7, eyeS: 1.25, mouth: 0.5 }, 0.25, 'outBack');
  // ---- B: by the pad. blast, heist (sly), steal (snatch), point up ----
  at(3.43, -32.5, 0, 26.0, -2.6);
  k(3.43, { ...NEUT, ...ARMS0, ...BODY0, headX: -0.25, lookY: 0.4, earL: -0.2, earR: -0.2, smile: 0.2, browL: 0.2, browR: 0.2, tail: 0.3 }, 0.01, 'lin');
  k(4.30, { lean: -0.12, torsoX: -0.15, aLz: 0.6, aLx: 1.6, eL: 1.9, aRz: 0.6, aRx: 1.6, eR: 1.9, earL: 1.0, earR: 1.0, squint: 0.9, smile: -0.3, hipY: -0.2, headX: 0.15, tailWag: 1.2 }, 0.12, 'outBack');
  k(4.55, { lean: -0.06 }, 0.3);
  k(ws(14) - 0.1, { ry: 0.12, lean: 0, torsoX: 0.12, hipY: -0.15, squint: 0, sly: 0.62, smile: 1.0, browAL: -0.3, browAR: 0.35, browL: -0.15, browR: 0.25,
    earL: -0.2, earR: 0.1, aLz: 0.35, aLx: 1.05, eL: 1.75, aRz: 0.35, aRx: 1.05, eR: 1.75, headX: 0.12, headY: 0.0, headZ: -0.1, lookY: 0, talk: 1, tailWag: 0 }, 0.2, 'outBack');
  k(ws(16) - 0.08, { aRz: 0.3, aRx: 1.75, eR: 0.15, aRy: 0.2, pawR: 1.15, torsoX: 0.25, lean: 0.06, headX: 0.2, sly: 0.75 }, 0.13, 'outBack');
  k(ws(16) + 0.16, { aRx: 1.2, eR: 1.6, pawR: 0.85, torsoX: 0.05, lean: -0.04 }, 0.14, 'outBack');
  k(ws(18) - 0.15, { aLz: 2.45, aLx: 0.35, eL: 0.15, aRz: 0.4, aRx: 0.9, eR: 1.9, pawR: 1, headY: -0.22, headX: -0.1, headZ: 0.12, sly: 0.2, smile: 1, squint: 0.4, torsoZ: -0.06 }, 0.2, 'outBack');
  // ---- C: run with MMX on a stick, then hold it up by Mars as the calendar lands on AUG 2027 ----
  at(7.33, -27.0, 0, 30.0, 1.15);
  k(7.33, { ...NEUT, ...ARMS0, ...BODY0, aRz: 2.75, aRx: 0.2, eR: 0.35, aLz: 0.3, smile: 0.9, squint: 0.2, browL: 0.2, browR: 0.3, walk: 1, talk: 0, earL: 0.35, earR: 0.35, tail: 0.6, headY: -0.3 }, 0.01, 'lin');
  at(8.70, -11.0, 0, 21.0, 1.15);
  k(8.70, { walk: 0, ry: 0.55 }, 0.25, 'out');
  k(8.90, { aRz: 3.0, aRx: 0.05, eR: 0.1, aLz: 1.9, eL: 0.4, rise: 0.0, smile: 1, squint: 0.7, headY: 0.35, headX: -0.12, earL: -0.2, earR: -0.2 }, 0.22, 'outBack');
  k(ws(25) - 0.04, { rise: 0.45, sq: 0.08, headX: -0.25, squint: 1, aLz: 2.2 }, 0.12, 'outBack');
  k(ws(25) + 0.22, { rise: 0, sq: -0.04 }, 0.12, 'in2');
  k(ws(25) + 0.38, { sq: 0 }, 0.12);
  // ---- D: on Phobos. look up at MMX, brace for a crash that never comes, read the tag, lean in to the dial ----
  const DROPT = ws(28) + 0.04, TOUCH = 15.86;
  const LAND = [-9.0, 5.65, -7.0];
  at(10.5, -3.0, 0, 8.8, 0.6);
  k(10.5, { ...NEUT, ...ARMS0, ...BODY0, walk: 0, headX: -0.4, lookY: 0.85, eyeS: 1.15, browL: 0.35, browR: 0.35, smile: 0.2, aLz: 0.25, aRz: 0.25, earL: -0.3, earR: -0.3, tail: 0.4 }, 0.01, 'lin');
  k(ws(27), { aRz: 1.6, aRx: 1.5, eR: 0.15, pawR: 1.1, headX: -0.5, lookY: 0.9, lookX: 0.3, smile: 0.6, browAL: -0.15, browAR: 0.25 }, 0.2, 'outBack'); // points up at the rover
  k(DROPT - 0.02, { aRz: 2.3, aRx: 0.6, eR: 2.2, aLz: 2.3, aLx: 0.6, eL: 2.2, pawR: 1, hipY: -0.35, sq: -0.06, squint: 1, smile: -0.5, mouth: 0.4, earL: 1.0, earR: 1.0,
    headX: 0.05, headY: 0.15, lookX: 0, lookY: 0, browL: 0.4, browR: 0.4, browAL: 0.3, browAR: 0.3, torsoX: 0.12, tail: 1.1 }, 0.14, 'outBack');   // braces, paws over the ears
  k(ws(30) + 0.2, { hipY: -0.28, sq: -0.04 }, 0.4, 'sine');
  k(ws(31) + 0.05, { squint: 0.25, sly: 0.55, headY: 0.4, headX: -0.25, lookX: 0.6, lookY: 0.6, aLz: 1.6, aLx: 0.7, eL: 2.0, aRz: 0.5, aRx: 0.4, eR: 0.6, mouth: 0, smile: 0.0, earL: 0.3, earR: 0.3, hipY: -0.1 }, 0.3);  // peeks
  k(ws(32) - 0.06, { sly: 0, squint: 0, eyeS: 1.3, headY: 0.45, headX: -0.3, lookX: 0.8, lookY: 0.5, aRz: 1.3, aRx: 1.3, eR: 0.2, pawR: 1.12, aLz: 0.4, aLx: 0.2, eL: 0.5, browL: 0.5, browR: 0.5, hipY: 0, smile: 0.5, talk: 1 }, 0.16, 'outBack'); // points at the 25 kg tag
  k(ws(35) - 0.1, { ry: 0.55, torsoX: 0.25, hipY: -0.22, aRz: 0.45, aRx: 1.1, eR: 0.5, aLz: 0.3, aLx: 0.5, eL: 1.4, headX: 0.3, headY: 0.35, lookX: 0.5, lookY: -0.6, squint: 0.35, eyeS: 1.1, smile: 0.2, browAL: -0.25, browAR: -0.25 }, 0.35, 'io'); // leans in to the dial
  k(TOUCH, { aRz: 0.5, aRx: 1.35, eR: 0.3, pawR: 1.1 }, 0.12, 'outBack');                                                           // taps the dial
  k(TOUCH + 0.2, { aRx: 1.0, eR: 0.7, pawR: 1 }, 0.14);
  k(ws(39) - 0.03, { ry: 0.25, torsoX: -0.12, hipY: 0, rise: 0.9, sq: 0.12, eyeS: 1.4, squint: 0, sly: 0, mouth: 1, mouthO: 1, browL: 0.8, browR: 0.8, browAL: 0.2, browAR: 0.2,
    earL: -0.55, earR: -0.55, aLz: 2.2, aLx: 0.4, eL: 0.5, aRz: 2.2, aRx: 0.4, eR: 0.5, headX: -0.2, headY: 0.15, lookX: 0.4, lookY: 0.4, smile: 0.2, tail: 1.2 }, 0.12, 'outBack');
  k(ws(39) + 0.22, { rise: 0, sq: -0.1 }, 0.12, 'in2');
  k(ws(39) + 0.4, { sq: 0 }, 0.12);
  k(ws(40) - 0.02, { aRz: 1.25, aRx: 1.15, eR: 0.1, aLz: 0.5, aLx: 0.3, eL: 1.0, mouth: 0.4, eyeS: 1.25, headX: -0.25, headY: 0.4, lookX: 0.7, lookY: 0.6, torsoX: 0.1 }, 0.2, 'outBack');
  // ---- E: landing, the grab, nitrogen blast ----
  k(18.2, { ry: -0.35, aRz: 0.3, aRx: 0, eR: 0.3, aLz: 0.3, aLx: 0, eL: 0.3, eyeS: 1.15, mouth: 0, mouthO: 0, browL: 0.3, browR: 0.3, headX: -0.3, headY: -0.3, lookX: -0.5, lookY: 0.8, torsoX: 0, talk: 0, smile: 0.2 }, 0.35);
  at(18.6, -3.6, 0, 8.6, -0.35, 0.4, 'io');
  k(19.55, { sq: -0.08, hipY: -0.2, eyeS: 1.3, earL: 0.5, earR: 0.5, headY: -0.45, lookX: -0.8, lookY: 0.2 }, 0.1);
  k(19.8, { sq: 0, hipY: 0, eyeS: 1.15, earL: 0, earR: 0 }, 0.2);
  k(ws(43) - 0.15, { ry: -0.05, aLz: 2.3, aLx: 0.6, eL: 0.4, aRz: 2.3, aRx: 0.6, eR: 0.4, headY: 0, headX: 0.05, lookX: 0, lookY: 0, sly: 0.5, smile: 1, browAL: -0.3, browAR: 0.3, eyeS: 1, hipY: -0.25, talk: 1 }, 0.2, 'outBack');
  k(ws(44) + 0.05, { aLz: 0.4, aLx: 1.5, eL: 1.2, aRz: 0.4, aRx: 1.5, eR: 1.2, pawL: 0.85, pawR: 0.85, hipY: 0, torsoX: 0.2, sly: 0.7, headX: 0.15 }, 0.12, 'outBack');
  k(ws(45) - 0.1, { ry: -0.55, aLz: 0.3, aLx: 0.2, eL: 0.5, aRz: 0.4, aRx: 0.3, eR: 0.6, pawL: 1, pawR: 1, torsoX: 0, sly: 0, smile: 0.5, headY: -0.4, headX: -0.05, lookX: -0.7, lookY: 0.2, eyeS: 1.15, talk: 0 }, 0.25);
  k(ws(47) + 0.22, { lean: 0.16, torsoX: -0.2, squint: 1, smile: -0.6, mouth: 0.6, earL: 1.0, earR: 1.0, aLz: 0.7, aLx: 1.5, eL: 2.2, aRz: 0.5, aRx: 1.3, eR: 2.0, headY: -0.1, headX: 0.2, tailWag: 1.5, rise: 0.15 }, 0.1, 'outBack');
  k(ws(48) + 0.25, { lean: 0.08, rise: 0 }, 0.2);
  k(22.55, { lean: 0, torsoX: 0.05, squint: 0.2, smile: 0.2, mouth: 0, earL: 0.2, earR: 0.2, headZ: 0.2, aLz: 0.3, aLx: 0.2, eL: 0.4, aRz: 0.5, aRx: 0.6, eR: 1.4, tailWag: 0 }, 0.25);
  // jar close-up: the cat is out of shot
  at(22.9, -14.0, 0, 8.0, 0.6);
  // ---- F: wait in front of Earth, cheer on 2031 ----
  at(25.0, 46.9, 0, 6.6, -2.55);
  k(25.0, { ...NEUT, ...ARMS0, ...BODY0, headX: -0.3, lookY: 0.6, smile: 0.4, browL: 0.2, browR: 0.2, talk: 0, tail: 0.5, walk: 0 }, 0.01, 'lin');
  k(28.6, { aLz: 2.1, aLx: 0.6, eL: 0.6, aRz: 2.1, aRx: 0.6, eR: 0.6, eyeS: 1.2, headX: -0.4 }, 0.3, 'outBack');
  k(ws(65) - 0.06, { ry: -0.6, aLz: 0.4, aLx: 1.2, eL: 2.0, aRz: 2.7, aRx: 0.3, eR: 1.4, pawR: 0.9, squint: 1, smile: 1, rise: 0.6, sq: 0.08, headX: 0.0, talk: 0, lookY: 0 }, 0.12, 'outBack');
  k(ws(65) + 0.2, { rise: 0, sq: -0.06 }, 0.12, 'in2');
  k(ws(65) + 0.36, { sq: 0 }, 0.12);
  // ---- G: the loot ----
  at(30.5, 46.3, 0, 12.6, 0.2, 0.3, 'io');
  k(30.55, { ...NEUT, ...BODY0, aLz: 0.4, aLx: 0.9, eL: 1.9, aRz: 0.45, aRx: 1.35, eR: 0.7, pawL: 1, pawR: 1, sly: 0.55, smile: 1, browAL: -0.3, browAR: 0.3, headX: 0.25, headY: 0.1, lookX: 0, lookY: -0.6, talk: 1, tail: 0.8 }, 0.25, 'outBack');
  k(ws(68) - 0.05, { aLz: 0.6, aLx: 1.1, eL: 2.1, pawL: 0.85, aRz: 2.35, aRx: 0.45, eR: 0.25, sly: 0, squint: 1, smile: 1, headX: -0.25, headY: 0, rise: 0.5, sq: 0.1, lookY: 0.6, earL: -0.3, earR: -0.3 }, 0.14, 'outBack');
  k(ws(68) + 0.24, { rise: 0, sq: -0.05 }, 0.14, 'in2');
  k(ws(70), { sq: 0, aLz: 0.5, aLx: 1.2, eL: 1.8, pawL: 1, aRz: 0.5, aRx: 1.25, eR: 1.5, squint: 0.7, headZ: -0.2, headY: 0.35, headX: 0.15, lookX: 0.6, lookY: -0.2 }, 0.25);
  k(ws(73), { headZ: 0.15, headY: 0.0, lookX: 0, lookY: 0, squint: 1 }, 0.25);
  // ---- H: NEXT. the whip lands on a shop counter and he pops up behind it; counts the satellites, points at the date ----
  at(34.70, 67.5, -4.2, 15.8, 0.0);
  k(34.70, { ...NEUT, ...ARMS0, ...BODY0, walk: 0, hipY: -0.3, sq: -0.08, aLz: 0.3, aRz: 0.3, eyeS: 1.2, smile: 0.9, talk: 1, earL: -0.5, earR: -0.5, tail: 0.8, browL: 0.3, browR: 0.3 }, 0.01, 'lin');
  k(34.80, { y: 0.5 }, 0.18, 'outBack');
  k(34.82, { hipY: 0, sq: 0.08, earL: 0.4, earR: 0.4, aLz: 1.0, aLx: 0.6, eL: 0.6, aRz: 1.0, aRx: 0.6, eR: 0.6 }, 0.14, 'outBack');
  k(35.12, { sq: 0, aLz: 0.3, aLx: 0.3, eL: 0.5, aRz: 0.4, aRx: 0.9, eR: 1.5, earL: 0.1, earR: 0.1 }, 0.2);
  k(ws(76) - 0.05, { headZ: 0.12, headY: 0.35, squint: 0.4, smile: 1, aRz: 1.35, aRx: 0.25, eR: 0.9, pawR: 0.9, torsoY: 0.15, lookX: 0.6 }, 0.2, 'outBack');   // thumbs at the Electron: "Rocket Lab"
  k(ws(78), { headY: 0.0, headZ: 0.05, aRz: 0.4, aRx: 0.9, eR: 1.5, pawR: 1, torsoY: 0, lookX: 0, squint: 0.2 }, 0.25);
  k(ws(81) - 0.1, { aLz: 1.45, aLx: 0.35, eL: 0.1, pawL: 1.1, headY: -0.45, headX: 0.15, lookX: -0.7, lookY: -0.3, squint: 0, eyeS: 1.15, torsoY: -0.12 }, 0.15, 'outBack');
  k(ws(81) + 0.17, { aLz: 1.35, aLy: 0.2 }, 0.1);
  k(ws(82), { aLz: 1.25, aLy: 0.35 }, 0.1);
  k(ws(84), { aLz: 0.3, aLx: 0.2, eL: 0.5, aLy: 0, pawL: 1, headY: 0.1, headX: 0, lookX: 0, lookY: 0, smile: 0.9, torsoY: 0 }, 0.25);
  k(ws(85) - 0.05, { aRz: 1.45, aRx: 0.45, eR: 0.15, pawR: 1.1, headY: 0.45, lookX: 0.7, lookY: -0.2, squint: 0.5, torsoY: 0.12 }, 0.18, 'outBack');
  // ---- I: end card. pop up from behind the ledge and wave ----
  at(38.73, -0.84, 9.0, 3.6, -0.06);
  k(38.73, { ...NEUT, ...ARMS0, ...BODY0, walk: 0, talk: 1, smile: 0.8, aLz: 0.4, aRz: 0.4, tail: 0.5 }, 0.01, 'lin');
  k(38.76, { y: 21.6 }, 0.3, 'outBack');
  k(38.74, { hipY: -0.3, sq: -0.08 }, 0.1);
  k(39.0, { hipY: 0, sq: 0.06 }, 0.12, 'outBack');
  k(39.35, { sq: 0, aRz: 2.6, aRx: 0.3, eR: 0.9, headZ: 0.12, smile: 1, squint: 0.3 }, 0.2, 'outBack');
  k(40.35, { squint: 0, eyeS: 1.15 }, 0.12);
  k(40.75, { eyeS: 1, squint: 0.6, smile: 1 }, 0.2);

  // waving and paw-rubbing loops
  function extra(tp, P) {
    if (tp > 39.35 && tp < 42.2) { const w = Math.sin((tp - 39.35) * Math.PI * 2 * 2.2); P.eR += w * 0.45; P.aRy += w * 0.15; }
    if (tp > ws(14) && tp < ws(16) - 0.1) { const w = Math.sin((tp - ws(14)) * Math.PI * 2 * 3); P.aLz += w * 0.12; P.aRz -= w * 0.12; P.eL += w * 0.15; P.eR -= w * 0.15; }
    if (tp > 32.0 && tp < 34.6) { const w = Math.sin((tp - 32.0) * Math.PI * 2 * 1.6); P.torsoZ += w * 0.08; P.rise += Math.max(0, w) * 0.25; P.headZ += w * 0.06; }
    if (tp > 22.0 && tp < 22.55) { const w = Math.sin((tp - 22.0) * Math.PI * 2 * 5); P.headX += w * 0.08; P.torsoX += w * 0.04; }
    // braced: a nervous tremble while the rover drifts down
    if (tp > DROPT + 0.1 && tp < ws(31)) { const w = U.hashS(U.poseIndex(tp), 41); P.torsoZ += w * 0.03; P.headZ += w * 0.03; }
    if (P.walk > 0.5) { P.torsoX += 0.1; }
  }
  let cat;
  function catWords() {
    return WORDS.map((w, i) => ({ ...w, stress: CAPS.EMPH.has(i) }));
  }
  function catScene(t) { return t < 10.63 ? 'T' : t < 24.87 ? 'G' : t < 38.73 ? 'T' : 'C'; }
  function runPos(tp) {
    const u = E.out(seg(tp, 7.40, 8.7));
    return [U.lerp(-27, -11, u), U.lerp(30, 21, u)];
  }

  // ===================== CREDIT SLOT (inside the plaque) =====================
  const PHOTO = 'NASA/JPL-Caltech/University of Arizona';
  const CRED = [
    [0, ['Illustration · facts: NASA']], [3.43, ['Illustration · facts: JAXA']],
    [7.33, ['Illustration, not to scale', 'facts: NASA, JAXA, ESA']],
    [10.6, ['Illustration, not to scale', 'facts: DLR, ESA']], [14.86, ['Illustration, not to scale', 'facts: ESA']],
    [18.6, ['Illustration, not to scale', 'facts: JAXA, NASA']], [22.9, ['Illustration · facts: JAXA, ESA']],
    [24.87, ['Illustration, not to scale', 'facts: JAXA, NASA, ESA']], [30.6, ['Illustration · facts: JAXA']],
    [34.77, ['Illustration · facts: Launch Library 2']], [38.73, ['']],
  ];
  // the heist meter: step k began at ...
  const STEPS = [ws(21), ws(26), ws(41), ws(54)];

  // ===================== PER FRAME =====================
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
  // adversarial-check layout fixes (safe zone x 80..900, y 260..1500 for every on-screen text)
  const SIGN_DROP = 1.0, CAL_X = -5.5, CAL_S = 1.0;
  const dropCam = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.5, 600);
  let ptrDrop = null;
  function phobosPos(tp) { const th = 0.62 + 0.03 * tp; return V([Math.sin(th) * 13, 10, Math.cos(th) * 13]); }
  function placePointer(len, base, dir) {
    W.pointer.position.copy(base);
    W.pointer.quaternion.setFromUnitVectors(V([0, 1, 0]), dir.clone().normalize());
    W.pointer.children[0].scale.y = len; W.pointer.children[0].position.y = len / 2; W.pointerTip.position.y = len;
  }
  function pointerAt(tp) {
    // base in the left paw; aim blends from over the shoulder to Phobos (poke), back down
    cat.R.pawL.getWorldPosition(tmpV);
    const base = tmpV.clone();
    const ph = phobosPos(tp);
    const toPh = ph.clone().sub(base);
    const rest = V([0.35, 1.0, -0.55]);
    const a = U.clamp(U.bump(tp, POKE - 0.17, 0.9) * 1.6, 0, 1);
    const dir = rest.clone().normalize().lerp(toPh.clone().normalize(), a).normalize();
    const reach = toPh.length() - 1.25;
    const len = U.lerp(5.2, Math.max(4, reach), a);
    return { base, dir, len };
  }
  function init(scenes) {
    cat = new CAT.Actor(scenes.T, { seed: 5, words: catWords(), keys: K, extra });
    TL.cat = cat;
    // where the pointer is when he lets go of it (for the fall)
    cat.apply(DROP); cat.R.root.updateMatrixWorld(true);
    const p = pointerAt(U.twos(DROP));
    ptrDrop = p;
  }
  function update(t, scenes, camera) {
    const tp = U.twos(t), pi = U.poseIndex(t);
    const c = camAt(t);
    const scene = c.scene === 'T' ? scenes.T : c.scene === 'G' ? scenes.G : scenes.C;
    // ---- cat ----
    const cs = catScene(t), cScene = cs === 'T' ? scenes.T : cs === 'G' ? scenes.G : scenes.C;
    if (cat.R.root.parent !== cScene) cScene.add(cat.R.root);
    const P = cat.apply(t);
    cat.R.root.scale.setScalar(cs === 'C' ? 2.3 : 1);
    if (t >= 22.9 - 1e-4 && t < 24.87) cat.R.root.visible = false;   // the jar macro: he is out of shot (poses are on twos, the cut is not)
    if (tp >= 7.33 && tp < 8.7) { const [x, z] = runPos(tp); cat.R.root.position.x = x; cat.R.root.position.z = z; }
    if (P.walk > 0.01) {
      const dist = Math.abs(runPos(tp)[0] + 27);
      const ph = dist / 2.6;
      const R = cat.R;
      const a = P.walk, s = Math.sin(ph * Math.PI * 2);
      R.hipL.rotation.x = -(s * 0.6 * a); R.hipR.rotation.x = (s * 0.6 * a);
      R.kneeL.rotation.x = Math.max(0, -Math.cos(ph * Math.PI * 2)) * 0.8 * a; R.kneeR.rotation.x = Math.max(0, Math.cos(ph * Math.PI * 2)) * 0.8 * a;
      R.ankleL.rotation.x = -R.hipL.rotation.x - R.kneeL.rotation.x; R.ankleR.rotation.x = -R.hipR.rotation.x - R.kneeR.rotation.x;
      const bob = Math.abs(Math.cos(ph * Math.PI * 2)) * 0.22 * a;
      R.hips.position.y += bob; R.hipL.position.y += bob; R.hipR.position.y += bob;
      R.shL.rotation.x += s * 0.5 * a;
    }
    cat.R.root.updateMatrixWorld(true);

    // ---- TABLE stage ----
    if (c.scene === 'T' || cs === 'T') {
      const th = 0.62 + 0.03 * tp;
      W.arm.rotation.y = th;
      // Phobos boings on its pin after the poke (spring on twos)
      const bo = tp >= POKE ? tp - POKE : -1;
      const boing = bo >= 0 ? Math.exp(-bo * 3.2) * Math.sin(bo * 21) : 0;
      W.phobosT.position.set(0, 10 + boing * 0.55, 13 + boing * 0.25);
      W.phobosT.rotation.set(0.3 + tp * 0.05 + boing * 0.35, -0.6 + tp * 0.08, 0.15 + boing * 0.2);
      // a toothpick flag planted on top of Phobos (1.8 m per 100 years): it wobbles with the boing
      { const ph = phobosPos(tp), tg = W.tagPhobos;
        const yaw = Math.atan2(c.pos[0] - ph.x, c.pos[2] - ph.z);
        const sx = Math.cos(yaw) * 1.4, sz = -Math.sin(yaw) * 1.4;   // on Phobos's right shoulder (screen right), card to the left
        tg.position.set(ph.x + sx, 10.5 + boing * 0.55, ph.z + sz + 0.25 * boing);
        tg.rotation.set(0, yaw, -0.06 + boing * 0.25, 'YXZ');
        tg.scale.setScalar(Math.min(1.04, SET.life(tp, 0.56, 2.45))); }   // a softer pop: the card grows leftward from its pole
      // the either/or sign drops in on its string as the camera pulls back
      { const sg = W.signFate, td = ws(7) + 0.02, a = tp - td;
        const knot = 21.75 + sg.userData.h / 2 + 9.0 - SIGN_DROP;
        sg.visible = a >= 0 && tp < 3.6;
        const drop = a < 0 ? 14 : 14 * (1 - U.spring(a, 0.38, 2.4));
        sg.position.set(3.5, knot + drop, 14.0); sg.rotation.set(0, 0.197, 0);
        sg.userData.swing.rotation.set(0, 0, a > 0 ? 0.06 * Math.exp(-a * 2) * Math.sin(a * 9) : 0); }
      // the collision-course spiral: an amber clay snake that rolls itself out (on twos)
      const t0 = ws(6) - 0.04, grow = E.sine(seg(tp, t0, t0 + 1.35));
      W.spiralG.visible = tp >= t0 && tp < 4.2;
      W.spiralG.rotation.y = th - 0.15;
      const nI = Math.max(3, Math.floor(grow * W.spiralIdx / 3) * 3);
      W.spiral.geometry.setDrawRange(0, nI);
      { const u = grow, ang = -u * Math.PI * 2 * 1.55, r = 13 - (13 - 9.7) * Math.pow(u, 0.8); W.spiralTip.position.set(Math.sin(ang) * r, 10, Math.cos(ang) * r); }
      W.flagSpiral.scale.setScalar(0);
      W.books.visible = tp < 3.6;
      // the pointer: in his paw, pokes Phobos, falls when he gasps
      W.pointer.visible = tp < 3.4;
      if (W.pointer.visible) {
        if (tp < DROP) { const p = pointerAt(tp); placePointer(p.len, p.base, p.dir); }
        else {
          // he lets go when he gasps: it drops straight down (behind the plaque), tipping a little
          const a = tp - DROP;
          const base = ptrDrop.base.clone(); base.y -= 45 * a * a;
          const dir = ptrDrop.dir.clone().add(V([0.6 * a, 0, 0.3 * a])).normalize();
          placePointer(ptrDrop.len, base, dir);
          W.pointer.visible = base.y > -8;
        }
      }
      // launch
      const ign = ws(12) - 0.06, lift = ws(12) + 0.12;
      const ry = tp < lift ? 0 : 7.0 * Math.pow(tp - lift, 2) + 1.4 * (tp - lift);
      W.h3.position.y = 1.25 + ry;
      W.h3.rotation.z = tp > lift ? 0.012 * U.hashS(pi, 3) : 0;
      CRAFT.flameWobble(W.h3.userData.flame, t, tp >= ign ? U.clamp((tp - ign) / 0.13, 0, 1) : 0, 1.0 + U.clamp((tp - lift) * 0.8, 0, 0.8));
      const pp = W.padPuffs.userData; pp.spec = [];
      for (let i = 0; i < pp.list.length; i++) {
        const a = (i / pp.list.length) * Math.PI * 2 + U.hashU(i * 7) * 0.4, sp = 5 + U.hashU(i * 13) * 6;
        pp.spec.push({ t0: ign + 0.05 + U.hashU(i * 3) * 0.35, p: [W.padP[0] + Math.cos(a) * 1.5, 1.4, W.padP[2] + Math.sin(a) * 1.5], v: [Math.cos(a) * sp, 0.6 + U.hashU(i * 5) * 2.5, Math.sin(a) * sp * 0.8], s0: 0.5, s1: 1.4 + U.hashU(i * 11) * 1.3, k: 1.3 });
      }
      CRAFT.updatePuffs(W.padPuffs, t);
      const tpf = W.trailPuffs.userData; tpf.spec = [];
      for (let i = 0; i < tpf.list.length; i++) {
        const tt = lift + 0.15 + i * 0.09, yy = 1.25 + 7.0 * Math.pow(tt - lift, 2) + 1.4 * (tt - lift) - 0.6;
        tpf.spec.push({ t0: tt, p: [W.padP[0] + U.hashS(i, 1) * 0.3, yy, W.padP[2] + U.hashS(i, 2) * 0.3], v: [U.hashS(i, 3) * 1.5, -0.5, U.hashS(i, 4) * 1.5], s0: 0.5, s1: 1.0 + i * 0.05, k: 1 });
      }
      CRAFT.updatePuffs(W.trailPuffs, t);
      W.flagLaunch.position.set(-37.6, 0, 17.5); W.flagLaunch.scale.setScalar(SET.life(tp, 3.75, 7.1)); W.flagLaunch.rotation.y = -0.2;
      W.jp.rotation.y = 0.5 + 0.05 * Math.sin(tp * 3);
      // MMX on the stick (step one)
      const hold = tp >= 7.33 && tp < 10.6;
      W.stickMMX.visible = hold;
      if (hold) {
        cat.R.pawR.getWorldPosition(tmpV);
        W.stickMMX.position.set(tmpV.x + 0.1, tmpV.y - 1.4, tmpV.z);
        const swoop = tp > ws(25) + 0.3 ? 0.22 * Math.sin((tp - ws(25) - 0.3) * 7.5) * Math.min(1, (tp - ws(25) - 0.3) * 4) : 0;
        W.stickMMX.rotation.set(swoop * 0.4, 0.6, (P.walk > 0.5 ? 0.06 * Math.sin(tp * 18) : 0) - 0.05 + swoop);
        W.mmxS.rotation.set(0.1, 0.4 + tp * 0.4, 0.15 * Math.sin(tp * 4));
      }
      W.flagCruise.scale.setScalar(0);
      // the flip calendar: one page every pose pair from OCT 2026, landing on AUG 2027 on "August"
      { const cal = W.calFlip, n = cal.userData.n, tEnd = ws(24) - 0.02, per = 2 / 15, tS = tEnd - (n - 1) * per;
        cal.position.set(CAL_X, 0, 12.0); cal.rotation.y = 0.12;
        cal.scale.setScalar(SET.life(tp, 7.36, 10.62) * CAL_S);
        let kk = 0, u = 0;
        if (tp >= tS) { const x = (tp - tS) / per; kk = Math.min(n - 1, Math.floor(x)); u = kk >= n - 1 ? 0 : (x - kk); }
        // flip on twos: the page is up (0.5) for one pose frame, gone the next
        const uu = u <= 0 ? 0 : u < 0.5 ? 0.55 : 1;
        cal.userData.set(kk, kk >= n - 1 ? 0 : uu);
        if (tp >= ws(25) - 0.02 && tp < ws(25) + 0.3) cal.scale.multiplyScalar([1.12, 0.94, 1.03, 1][Math.min(3, Math.floor((tp - ws(25) + 0.02) * 15))]);
      }
      // MMX burn: from near Phobos to Earth
      const burnT = ws(57) - 0.03;
      const mb = W.mmxBurn;
      mb.visible = tp > 24.9 && tp < 28.6;
      if (mb.visible) {
        const ph = V([Math.sin(th) * 13, 10, Math.cos(th) * 13]);
        const p0 = ph.clone().add(V([1.6, 1.4, 1.6]));
        const path = [p0.toArray(), [20, 15, 12], [33, 15, 6], [41, 15, 1], [52, 18, -6]];
        const u = tp < burnT ? 0 : E.in2(seg(tp, burnT, burnT + 1.4));
        const pos = U.catmull(path, u);
        mb.position.set(...pos);
        const pos2 = U.catmull(path, Math.min(1, u + 0.02));
        if (u === 0) mb.lookAt(pos[0] + 1, pos[1], pos[2] - 0.3); else mb.lookAt(pos2[0], pos2[1], pos2[2]);
        mb.position.y += tp < burnT ? 0.15 * Math.sin(tp * 3) : 0;
        CRAFT.flameWobble(mb.userData.flame, t, tp >= burnT ? 1 : 0, 1.4);
      }
      const bp = W.burnPuffs.userData; bp.spec = [];
      for (let i = 0; i < bp.list.length; i++) {
        const ph = [Math.sin(th) * 13 + 1.6, 11.4, Math.cos(th) * 13 + 1.6];
        bp.spec.push({ t0: burnT + i * 0.03, p: ph, v: [-2.5 - U.hashU(i) * 3, U.hashS(i, 2) * 1.5, -1.5 + U.hashS(i, 3) * 2], s0: 0.2, s1: 0.45 + U.hashU(i * 9) * 0.35, k: 1.4 });
      }
      CRAFT.updatePuffs(W.burnPuffs, t);
      W.burnPuffs.visible = tp <= 31;
      // capsule under its parachute onto Australia
      const ausN = V([Math.sin(-0.08) * Math.cos(-0.42), Math.sin(-0.42), Math.cos(-0.08) * Math.cos(-0.42)]).normalize();
      const ausP = V(W.earthP).addScaledVector(ausN, 6.5 * 1.02);
      const capT0 = 27.75, capLand = 29.15;
      const cap = W.capsule; cap.visible = tp > capT0 && tp < 34.6;
      if (cap.visible) {
        const u = E.out(seg(tp, capT0, capLand));
        const start = V([40, 19, 6]);
        const pos = start.clone().lerp(ausP, u);
        cap.position.copy(pos);
        cap.quaternion.setFromUnitVectors(V([0, 1, 0]), V([0, 1, 0]).lerp(ausN, u).normalize());
        cap.position.y += tp < capLand ? 0.25 * Math.sin(tp * 5) * (1 - u) : 0;
        const ch = cap.userData.chute;
        const open = U.clamp((tp - (capT0 + 0.15)) / 0.25, 0, 1);
        const coll = U.clamp((tp - capLand - 0.1) / 0.4, 0, 1);
        ch.visible = open > 0 && coll < 1;
        ch.scale.set(open * (1 - coll * 0.5) + 0.001, (open * (1 - coll * 0.9)) + 0.001, open * (1 - coll * 0.5) + 0.001);
        ch.rotation.z = 0.08 * Math.sin(tp * 2.2);
        const hatch = cap.userData.cap.children[2];
        if (tp > 30.75) { const a = tp - 30.75; hatch.position.set(-a * 3, 0.86 + a * 4 - a * a * 6, a * 1.5); hatch.rotation.z = a * 4; hatch.visible = a < 0.8; } else { hatch.position.set(0, 0.86, 0); hatch.rotation.z = 0; hatch.visible = true; }
      }
      W.flagCap.scale.setScalar(0);
      // the jar: pulled from the capsule, held up, carried
      const jt = W.jarT;
      jt.visible = tp > 30.75 && tp < 34.75;
      if (jt.visible) {
        cat.R.pawR.getWorldPosition(tmpV2);
        const u = E.out(seg(tp, 30.75, 31.05));
        const from = ausP.clone().addScaledVector(ausN, 0.6);
        jt.position.copy(from.lerp(tmpV2.add(V([0, -0.15, 0.45])), u));
        jt.rotation.set(0, cat.R.root.rotation.y, 0);
      }
      // the easel springs up for the loot (a stage action), then the print pops onto it
      W.easel.scale.setScalar(Math.max(0.001, SET.popScale(tp, 30.62)));
      const phs = SET.popScale(tp, ws(68) - 0.25);
      W.photoG.scale.setScalar(phs * (tp < 38.7 ? 1 : 0));
      // NEXT: flag on "Next", satellites bounce as he counts, the page-a-day calendar on "Wednesday"
      W.flagNext.scale.setScalar(SET.popScale(tp, ws(75) + 0.02));
      W.flagNext.rotation.y = 0.0;
      W.sats.forEach((s, i) => { const ts = ws(81) + i * 0.17; const b = tp >= ts ? U.bump(tp, ts, ts + 0.27) : 0; s.position.y = 4.4 + b * 1.4; s.rotation.y = 0.3 + (tp > ts ? 0.4 : 0); });
      W.flagWed.scale.setScalar(0);
      W.cal.rotation.y = -0.08;
      W.cal.scale.setScalar(SET.popScale(tp, ws(85) - 0.05) * 0.62);
    }

    // ---- GROUND stage ----
    if (c.scene === 'G' || cs === 'G') {
      const m = W.mmxG, land = 19.55;
      let my = 16.5 + 0.45 * Math.sin(tp * 2.1);
      const lu = E.io(seg(tp, 18.25, land));
      if (tp > 18.25) my = U.lerp(16.5, 5.65, E.out(seg(tp, 18.25, land)));
      if (tp >= land) my = 5.65 - 0.35 * U.bump(tp, land, land + 0.27);
      m.position.set(U.lerp(1.0, LAND[0], lu), my, U.lerp(3.5, LAND[2], lu));
      m.rotation.set(tp < land ? 0.03 * Math.sin(tp * 1.3) : 0, U.lerp(0.45 + 0.07 * Math.sin(tp * 1.1), 0.2, lu), tp < land ? 0.045 * Math.sin(tp * 1.7) : 0);
      const ud = m.userData;
      // the coring arm unfolds and drives the corer into the ground
      const armT = ws(45) - 0.12, armDown = ws(45) + 0.22, armUp = ws(46) + 0.35;
      const reach = E.outBack(seg(tp, armT, armDown)) * (1 - E.io(seg(tp, armUp, armUp + 0.4)) * 0.6);
      ud.a1.rotation.set(U.lerp(0.35, -0.65, reach), 0, -0.2 + reach * 0.15);
      ud.a2.rotation.set(U.lerp(-2.35, 0.25, reach), 0, 0);
      const dig = tp > armDown && tp < armUp ? U.bump(tp, armDown, armUp) : 0;
      ud.corer.position.y = -1.1 - 0.3 * dig;
      ud.corer.rotation.y = tp > armDown && tp < armUp ? (tp - armDown) * 14 : 0;
      CRAFT.flameWobble(ud.flame, t, 0, 1);
      // the rover: hangs under MMX, released on "drop", falls slowly (Phobos gravity) onto the scale
      const r = W.rover, platY = 3.2 + 2.13 * 1.5 + 0.02;
      const hang = V([1.0, my - 6.3, 3.5]);
      const sp = V([1.0, platY, 5.6]);
      let rp;
      if (tp < DROPT) rp = hang;
      else if (tp < TOUCH) { const u = seg(tp, DROPT, TOUCH); rp = hang.clone().lerp(sp, u); rp.y = U.lerp(hang.y, sp.y, u * u); }
      else rp = sp.clone();
      const floatT = ws(40) + 0.12;
      if (tp >= floatT) {
        const a = tp - floatT;
        rp.y += 2.6 * (1 - Math.exp(-a * 1.4)) + 0.25 * Math.sin(a * 2.4);
        rp.x += a * 2.2; rp.z -= a * 0.6;
      }
      r.position.copy(rp);
      const fallU = tp >= DROPT && tp < TOUCH ? seg(tp, DROPT, TOUCH) : 0;
      r.rotation.set(fallU * 0.12 * Math.sin(fallU * 5) + (tp > floatT ? (tp - floatT) * 0.25 : 0), -0.25 + fallU * 0.25 + (tp > floatT ? (tp - floatT) * 0.4 : 0), fallU * 0.08 * Math.cos(fallU * 4) + (tp > floatT ? Math.sin(tp - floatT) * 0.2 : 0));
      if (tp >= TOUCH && tp < floatT) r.rotation.set(0, 0, 0);
      r.visible = tp < 22.95;
      r.userData.cam.rotation.y = tp > TOUCH ? Math.sin(seg(tp, TOUCH + 0.2, TOUCH + 1.4) * Math.PI * 2) * 0.9 : 0;
      r.scale.setScalar(1.55);
      // the luggage tag: pops on "25", flutters as it falls
      { const tg = W.roverTag; tg.scale.setScalar(SET.popScale(tp, ws(32) - 0.03) * 1.0);
        tg.userData.swing.rotation.set(0.15 * Math.sin(tp * 3.1), -r.rotation.y + 0.15 * Math.sin(tp * 1.7), 0.18 * Math.sin(tp * 2.3) + (fallU > 0 ? 0.15 : 0)); }
      // MMX releases the rover: a little clamp puff
      // scale: no number until "15"; the needle barely twitches when the rover touches down
      const sc = W.scale.userData;
      let needle = 0;
      if (tp > TOUCH) needle = 0.16 * U.spring(tp - TOUCH, 0.3, 2.6);
      if (tp > TOUCH && tp < ws(39)) needle += 0.04 * Math.sin((tp - TOUCH) * 30) * Math.exp(-(tp - TOUCH) * 2);
      if (tp >= floatT) needle *= Math.exp(-(tp - floatT) * 5);
      sc.needle.rotation.z = -needle + 1.15;
      const flip = tp >= ws(39) - 0.02 && tp < floatT + 0.5;
      sc.fA.visible = !flip; sc.fB.visible = flip;
      sc.fB.scale.setScalar(flip ? SET.popScale(tp, ws(39) - 0.02) : 1);
      W.scale.visible = t < 22.9 - 1e-4; W.rock.visible = t < 22.9 - 1e-4;
      // puffs: rover touchdown dust, MMX landing, nitrogen blast
      const dp = W.dropPuffs.userData; dp.spec = [];
      for (let i = 0; i < dp.list.length; i++) { const a = i / dp.list.length * 6.28; dp.spec.push({ t0: DROPT, p: [1.0 + Math.cos(a) * 0.9, my - 5.6, 3.5 + Math.sin(a) * 0.9], v: [Math.cos(a) * 1.4, 0.2, Math.sin(a) * 1.4], s0: 0.15, s1: 0.4, k: 2 }); }
      CRAFT.updatePuffs(W.dropPuffs, t);
      W.dropPuffs.visible = tp < DROPT + 1.0;
      const lp = W.landPuffs.userData; lp.spec = [];
      for (let i = 0; i < lp.list.length; i++) {
        const leg = i % 4, a = U.hashU(i * 17) * 6.28;
        const lx = [-1, 1, -1, 1][leg] * 4.4, lz = [-1, -1, 1, 1][leg] * 3.6;
        const c2 = Math.cos(0.2), s2 = Math.sin(0.2);
        const wx = LAND[0] + lx * c2 + lz * s2, wz = LAND[2] - lx * s2 + lz * c2;
        lp.spec.push({ t0: land - 0.05, p: [wx, 0.3, wz], v: [Math.cos(a) * 3, 0.4 + U.hashU(i) * 0.8, Math.sin(a) * 3], s0: 0.3, s1: 0.55 + U.hashU(i * 3) * 0.4, k: 1.6 });
      }
      CRAFT.updatePuffs(W.landPuffs, t);
      W.landPuffs.visible = tp < 20.95;
      // corer chips: little crumbs spat out while it digs
      const blastT = ws(47) + 0.06;
      const gp = W.gasPuffs.userData; gp.spec = [];
      ud.noz.getWorldPosition(tmpV); const noz = tmpV.clone(); noz.y = 1.0;
      const aim = V([cat.R.root.position.x, 1.5, cat.R.root.position.z]).sub(noz).setY(0).normalize();
      for (let i = 0; i < gp.list.length; i++) {
        const sp2 = 11 + U.hashU(i * 5) * 9, sx = U.hashS(i, 4) * 0.3, sz = U.hashS(i, 6) * 0.3;
        // the gas lofts: the cloud arcs up to head height and engulfs the cat
        gp.spec.push({ t0: blastT + U.hashU(i * 7) * 0.12, p: noz.toArray(), v: [(aim.x + sx) * sp2 * 0.7, 3.5 + U.hashU(i * 9) * 4.5, (aim.z + sz) * sp2 * 0.7], s0: 0.4, s1: 1.0 + U.hashU(i * 2) * 1.0, k: 2.2 });
      }
      CRAFT.updatePuffs(W.gasPuffs, t);
      W.gasPuffs.visible = t < 22.9 - 1e-4;
      W.corer = W.corer || null;
      // crumbs: chips from the corer (coring shot), then lofted by the gas into the sampler (blast shot)
      ud.corer.getWorldPosition(tmpV2);
      W.crumbs.forEach((cm, i) => {
        const rr = cm.userData.r;
        if (tp < ws(47)) {
          const t0 = armDown + i * 0.04, a = tp - t0;
          cm.visible = a > 0 && a < 0.5 && tp < armUp;
          if (!cm.visible) return;
          cm.position.set(tmpV2.x + (rr[0] - 0.5) * 0.6 + (rr[0] - 0.5) * a * 6, 0.2 + a * (3 + rr[1] * 3) - a * a * 9, tmpV2.z + (rr[2] - 0.5) * 0.6 + (rr[2] - 0.2) * a * 5);
          cm.rotation.set(a * 6, a * 4, 0);
          return;
        }
        const t0 = blastT + i * 0.02, a = tp - t0;
        cm.visible = a > 0 && a < 0.7 && t < 22.9 - 1e-4;
        if (!cm.visible) return;
        cm.position.set(noz.x + (rr[0] - 0.5) * 2 - a * 1.0, 0.6 + a * (9 + rr[1] * 6) - a * a * 6, noz.z + (rr[2] - 0.5) * 2 + a * 4);
        cm.rotation.set(a * 6, a * 4, 0);
      });
      // the jar (target): crumbs fill in from above, lid pops on
      const jg = W.jarG; jg.position.set(-2.2, 0, 10.5); jg.visible = tp > 22.8 && tp < 25.1;
      const jc = jg.userData.crumbs;
      jc.forEach((cm, i) => {
        const t0 = 22.95 + i * 0.05, a = tp - t0;
        cm.visible = a > 0;
        cm.position.y = cm.userData.y0 + (a < 0.3 ? (0.3 - a) * 14 : 0);
      });
      const lid = jg.children[1];
      lid.visible = tp > ws(53) - 0.02;
      lid.position.y = 2.36 + (lid.visible ? Math.max(0, 1 - (tp - ws(53) + 0.02) * 8) * 2 : 0);
      { m.updateMatrixWorld(true); const an = V([-2.9, 0.15, 1.6]).applyMatrix4(m.matrixWorld), tg = W.tagDrop;
        tg.position.copy(an);
        tg.rotation.set(0, Math.atan2(c.pos[0] - an.x, c.pos[2] - an.z), 0);
        tg.userData.swing.rotation.set(0, 0, 0.05 * Math.sin(tp * 2.6) + (tp > DROPT ? 0.12 * Math.exp(-(tp - DROPT) * 2) * Math.sin((tp - DROPT) * 9) : 0));
        tg.scale.setScalar(SET.life(tp, ws(28) + 0.1, ws(32) + 0.2));
        // adversarial check: as the camera cranes down after the falling rover, MMX rides up out of frame; the tag is
        // let down on its string (a stage action) so the card top stays at or below y 285 px instead of crossing the top edge
        { const sc = Math.max(0.05, tg.scale.x), STR = 0.7;
          dropCam.position.set(...c.pos); dropCam.fov = c.fov; dropCam.updateProjectionMatrix(); dropCam.lookAt(...c.look); dropCam.updateMatrixWorld(true);
          let L = 0;
          for (let it = 0; it < 3; it++) {
            const top = an.clone(); top.y -= (STR + L) * sc;
            const d = top.clone().sub(dropCam.position).dot(V(c.look).sub(V(c.pos)).normalize());
            const ppu = 960 / (Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) * d);
            const y = (1 - top.project(dropCam).y) * 960;
            if (y >= 285) break;
            L += (285 - y) / ppu / sc;
          }
          const sw = tg.userData.swing, str = sw.children[0], card = tg.userData.card;
          str.scale.y = (STR + L) / STR; str.position.y = -(STR + L) / 2; card.position.y = -(STR + L); } }
      W.flagHours.position.set(-11.6, 0, 0.0); W.flagHours.rotation.y = 0.0;
      W.flagHours.scale.setScalar(SET.life(tp, land + 0.1, ws(45) - 0.25));
      W.flagCore.position.set(-9.97, 0, 0.37); W.flagCore.rotation.y = -0.92;
      W.flagCore.scale.setScalar(SET.life(tp, ws(45) + 0.12, 21.8));
      W.flagJar.scale.setScalar(0);
    }

    // ---- CARD stage ----
    if (c.scene === 'C') {
      const t0 = 38.78;
      W.echoDot.scale.setScalar(SET.popScale(tp, t0));
      W.echoRing.scale.setScalar(SET.popScale(tp, t0 + 0.07));
      W.letters.forEach((lm, i) => {
        const s = SET.popScale(tp, t0 + 0.14 + i * 0.067) * W.wsc;
        lm.scale.set(s, s, s);
        lm.rotation.z = U.hashS(i, 77) * 0.04 + U.hashS(pi, i) * 0.01;
      });
      // the sonic logo: signal (the dot pulses) then its echo 0.40 s later (the ring sends a ping)
      const sigT = 40.40, pingT = 40.80;
      const sa = tp - sigT;
      if (sa >= 0 && sa < 0.4) { const kk = [1.28, 0.9, 1.08, 0.98, 1.02, 1][Math.min(5, Math.floor(sa * 15))]; W.echoDot.scale.setScalar(kk); }
      const pa = tp - pingT;
      W.echoPing.visible = pa > 0 && pa < 0.75;
      if (W.echoPing.visible) { const s = 1 + Math.floor(pa * 15) / 15 * 2.6; W.echoPing.scale.set(s, s, Math.max(0.05, 1 - pa * 1.2)); }
      W.word.position.x = -(W.wordL + W.wordW) / 2 * W.word.scale.x - 0.83;
    }

    // ---- lights follow the action ----
    const look = V(c.look), camP = V(c.pos);
    const L = c.scene === 'T' ? W.lT : c.scene === 'G' ? W.lG : W.lC;
    const keyOff = c.scene === 'G' ? V([-34, 42, 26]) : V([-30, 40, 34]);
    L.key.position.copy(look).add(keyOff);
    L.key.target.position.copy(look);
    L.key.target.updateMatrixWorld();
    L.key.angle = c.scene === 'G' ? 0.62 : 0.55;
    // ---- camera (+ the punch: a quick push-in and a nudge, on twos) ----
    const punch = punchAt(t);
    camera.position.copy(camP); camera.fov = c.fov * (1 - 0.05 * punch); camera.updateProjectionMatrix(); camera.lookAt(look);
    if (punch > 0.3) { camera.rotateZ(U.hashS(pi, 5) * 0.006 * punch); }
    camera.updateMatrixWorld();
    // whip blur from the camera's screen-space motion (only for real whips; capped so a frame never turns to mush)
    const prev = camAt(Math.max(0, t - 1 / 30)), nxt = camAt(t + 1 / 30);
    const cutIn = (t0, t1) => CAM.some((kk) => kk[5].cut && kk[1] > t0 && kk[1] <= t1);
    const prevOk = prev.scene === c.scene && !cutIn(t - 1 / 30, t);
    const ref = prevOk ? prev : nxt;
    const sgn = prevOk ? 1 : -1;
    const noBlur = !prevOk && (nxt.scene !== c.scene || cutIn(t, t + 1 / 30));
    const dir = V(ref.look).sub(V(ref.pos)).normalize();
    const far = V(ref.pos).addScaledVector(dir, 60).project(camera);
    let wx = far.x * 540 * sgn, wy = far.y * 960 * sgn;
    const wl = Math.hypot(wx, wy);
    const shutter = 0.5, cap = 230;
    let whip = [0, 0];
    if (wl > 70 && !noBlur) { const k2 = Math.min(1, cap / (wl * shutter)); whip = [wx * shutter * k2, wy * shutter * k2]; }
    const focus = camP.distanceTo(look);
    // credit
    let credit = ['']; for (const [t0, s] of CRED) if (t >= t0) credit = s;
    // photo on screen? (any corner inside the frame while it is shown)
    let photoOn = false;
    if (c.scene === 'T' && W.photoG.scale.x > 0.05) {
      W.photoG.updateMatrixWorld(true);
      for (const [x, y] of [[-3.6, -3.8], [3.6, -3.8], [-3.6, 3.8], [3.6, 3.8], [0, 0]]) {
        const v = V([x, y, 0.1]).applyMatrix4(W.photoG.matrixWorld).project(camera);
        if (v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05) photoOn = true;
      }
    }
    // heist meter
    let step = 0, stepT = 0; STEPS.forEach((s, i) => { if (t >= s - 1e-4) { step = i + 1; stepT = s; } });
    if (t >= ws(66) - 1e-4) step = 0;
    return { scene, focus, ap: c.ap, whip, credit, photo: photoOn ? PHOTO : '', punch, step, stepT };
  }
  return { init, update, camAt, CAM, K, punchAt };
})();
