// ---------- 80_timeline.js: shots, camera, the cat's performance and every prop, as a pure function of t ----------
const TL = (() => {
  const W = WORLD.W;
  const ws = (i) => WORDS[i].start;
  const V = (a) => new THREE.Vector3(...a);
  const E = U.ease, seg = U.seg;

  // ===================== CAMERA (smooth, 30 fps) =====================
  // [scene, t, pos, look, fov, opts{e: ease into this key, ap: aperture px, f: focus distance}]
  const CAM = [
    // A: hook, Phobos on its brass pin with the cat below, then pull back to the orrery
    ['T', 0.00, [14.4, 8.9, 41.0], [9.2, 6.1, 11.5], 30, { ap: 16 }],
    ['T', 1.70, [14.0, 9.0, 39.5], [9.1, 6.2, 11.5], 30, { e: 'sine', ap: 16 }],
    ['T', 2.80, [17.0, 25.0, 64.0], [3.0, 2.0, 7.0], 32, { e: 'io', ap: 13 }],
    ['T', 3.30, [16.6, 24.6, 62.8], [3.0, 2.0, 7.0], 32, { e: 'out', ap: 13 }],
    // whip left to the pad
    ['T', 3.60, [-27.0, 9.0, 64.0], [-37.0, 6.0, 18.0], 30, { e: 'io', ap: 11 }],
    ['T', 4.75, [-27.3, 9.2, 62.5], [-37.0, 6.6, 18.0], 30, { e: 'sine', ap: 11 }],
    ['T', 5.70, [-28.0, 8.6, 57.0], [-35.4, 6.4, 19.0], 30, { e: 'io', ap: 12 }],
    ['T', 7.18, [-28.2, 9.0, 55.5], [-35.4, 7.2, 19.0], 30, { e: 'sine', ap: 12 }],
    // whip into the run (step one)
    ['T', 7.45, [-16.0, 9.0, 63.0], [-20.0, 6.4, 26.0], 30, { e: 'io', ap: 10 }],
    ['T', 8.85, [-8.8, 9.0, 56.0], [-8.6, 6.4, 18.0], 30, { e: 'sine', ap: 10 }],
    ['T', 10.28, [-9.0, 9.4, 53.0], [-9.0, 6.8, 14.0], 30, { e: 'out', ap: 10 }],
    ['T', 10.52, [-4.5, 11.5, 47.0], [-3.0, 60.0, 10.0], 30, { e: 'in', ap: 10 }],
    // G: Phobos ground. whip down from the sky to MMX with the rover, follow the drop to the scale
    ['G', 10.52, [-1.5, 9.0, 46.0], [0.0, 70.0, -20.0], 30, { ap: 9 }],
    ['G', 10.90, [-1.5, 9.5, 46.0], [-0.5, 12.0, 2.0], 30, { e: 'out', ap: 9 }],
    ['G', 11.70, [-1.5, 9.5, 45.5], [-0.5, 11.6, 2.0], 30, { e: 'sine', ap: 9 }],
    ['G', 12.75, [-0.6, 8.2, 47.0], [-0.8, 3.0, 4.0], 30, { e: 'io', ap: 10 }],
    ['G', 16.40, [-0.6, 8.0, 45.0], [-0.8, 3.0, 4.5], 30, { e: 'sine', ap: 11 }],
    ['G', 16.85, [-0.6, 7.8, 41.0], [-0.8, 3.2, 4.5], 30, { e: 'out', ap: 12 }],
    ['G', 18.10, [-0.6, 7.8, 40.0], [-0.8, 3.4, 4.5], 30, { e: 'sine', ap: 12 }],
    // pull back for the landing
    ['G', 19.00, [1.0, 12.0, 64.0], [1.0, 7.0, -2.0], 32, { e: 'io', ap: 9 }],
    ['G', 19.90, [0.6, 11.0, 61.0], [0.5, 6.4, -1.0], 32, { e: 'out', ap: 9 }],
    ['G', 20.75, [-3.5, 8.5, 42.0], [-4.0, 5.0, 4.0], 30, { e: 'io', ap: 11 }],
    ['G', 20.98, [-3.6, 8.4, 40.5], [-4.0, 5.0, 4.0], 30, { e: 'sine', ap: 11 }],
    ['G', 20.99, [-11.0, 5.6, 19.0], [-3.2, 0.5, -5.5], 30, { cut: true, ap: 12 }],
    ['G', 21.82, [-10.4, 5.3, 17.6], [-3.2, 0.4, -5.5], 30, { e: 'sine', ap: 12 }],
    ['G', 21.83, [-2.0, 8.8, 47.0], [-2.4, 3.8, 1.0], 31, { cut: true, ap: 10 }],
    ['G', 22.86, [-2.3, 8.6, 44.5], [-2.6, 3.9, 1.0], 31, { e: 'sine', ap: 10 }],
    // target: macro on the jar
    ['G', 22.90, [-1.4, 3.4, 23.5], [-2.2, 1.2, 10.5], 26, { ap: 16 }],
    ['G', 24.70, [-1.6, 3.2, 22.0], [-2.2, 1.2, 10.5], 26, { e: 'sine', ap: 16 }],
    ['G', 25.02, [-1.6, 3.7, 21.6], [-1.8, 60.0, -10.0], 26, { e: 'in', ap: 16 }],
    // back on the table: MMX by Phobos, the burn, whip to Earth
    ['T', 25.02, [21.4, 15.0, 25.0], [14.0, -30.0, 0.0], 30, { ap: 12 }],
    ['T', 25.40, [21.4, 13.6, 24.6], [13.8, 10.9, 3.6], 30, { e: 'out', ap: 12 }],
    ['T', 26.75, [21.0, 13.4, 23.8], [13.9, 11.0, 3.6], 30, { e: 'sine', ap: 12 }],
    ['T', 27.35, [33.0, 14.0, 32.0], [30.0, 13.0, 4.0], 30, { e: 'in2', ap: 11 }],
    ['T', 27.95, [45.0, 11.0, 35.0], [44.6, 7.6, 0.0], 30, { e: 'out', ap: 11 }],
    ['T', 30.40, [45.4, 9.8, 33.5], [45.0, 6.8, 0.0], 30, { e: 'sine', ap: 11 }],
    // the loot: cat + easel with the real photo
    ['T', 30.85, [48.6, 8.8, 47.5], [48.4, 6.8, 10.0], 30, { e: 'io', ap: 12 }],
    ['T', 34.40, [48.8, 8.6, 46.0], [48.5, 6.9, 10.0], 30, { e: 'sine', ap: 12 }],
    // NEXT: pan right to Electron
    ['T', 35.30, [69.0, 10.0, 56.0], [69.6, 7.2, 15.0], 30, { e: 'io', ap: 10 }],
    ['T', 38.70, [69.1, 9.8, 53.5], [69.6, 7.4, 15.0], 30, { e: 'sine', ap: 10 }],
    // end card
    ['C', 38.73, [0.0, 34.5, 74.0], [0.0, 34.5, 0.0], 30, { ap: 4 }],
    ['C', 42.10, [0.0, 34.5, 71.5], [0.0, 34.5, 0.0], 30, { e: 'sine', ap: 4 }],
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

  // ===================== THE CAT (poses on twos) =====================
  const NEUT = { eyeS: 1, squint: 0, sly: 0, browL: 0, browR: 0, browAL: 0, browAR: 0, smile: 0.3, mouthO: 0, mouth: 0, earL: 0, earR: 0, headS: 1 };
  const ARMS0 = { aLz: 0.18, aLx: 0, aLy: 0, eL: 0.25, aRz: 0.18, aRx: 0, aRy: 0, eR: 0.25, pawL: 1, pawR: 1 };
  const BODY0 = { lean: 0, torsoX: 0, torsoZ: 0, torsoY: 0, headX: 0, headY: 0, headZ: 0, hipY: 0, sq: 0, rise: 0 };
  const K = [];
  const k = (t, o, d = 0.27, e = 'io') => K.push({ t, d, e, ...o });
  const at = (t, x, y, z, ry, d = 0.01, e = 'lin') => k(t, { x, y, z, ry }, d, e);

  // ---- A: on the crate, looking up at Phobos; gasp at "collision course" ----
  at(-1, 11.2, 0, 13.6, -0.75);
  k(-1, { ...NEUT, ...ARMS0, ...BODY0, headX: -0.55, headY: -0.25, lookY: 0.8, lookX: -0.5, browL: 0.3, browR: 0.2, smile: 0.15, aRz: 0.3, aRx: 1.1, eR: 2.1, earL: -0.3, earR: -0.2, tail: 0.6, talk: 0 });
  k(0.9, { headZ: 0.1, browAL: 0.18, browAR: -0.1 }, 0.4);
  k(1.62, { hipY: -0.25, sq: -0.06, eyeS: 0.9, headX: -0.1 }, 0.14);                           // anticipation
  k(ws(6) - 0.02, { hipY: 0, sq: 0.1, rise: 0.7, eyeS: 1.38, mouth: 0.9, mouthO: 1, browL: 0.75, browR: 0.75, browAL: 0.2, browAR: 0.2,
    earL: 0.85, earR: 0.85, aLz: 0.55, aLx: 1.25, eL: 2.25, aRz: 0.55, aRx: 1.25, eR: 2.25, aRy: 0, headX: -0.18, lookY: 0.2, smile: -0.4, lean: 0.06 }, 0.12, 'outBack');
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
  // ---- C: run with MMX on a stick ----
  at(7.33, -27.0, 0, 30.0, 1.15);
  k(7.33, { ...NEUT, ...ARMS0, ...BODY0, aRz: 2.75, aRx: 0.2, eR: 0.35, aLz: 0.3, smile: 0.9, squint: 0.2, browL: 0.2, browR: 0.3, walk: 1, talk: 0, earL: 0.35, earR: 0.35, tail: 0.6, headY: -0.3 }, 0.01, 'lin');
  at(8.70, -11.0, 0, 21.0, 1.15);
  k(8.70, { walk: 0, ry: 0.55 }, 0.25, 'out');
  k(8.90, { aRz: 3.0, aRx: 0.05, eR: 0.1, aLz: 1.9, eL: 0.4, rise: 0.0, smile: 1, squint: 0.7, headY: 0.35, headX: -0.12, earL: -0.2, earR: -0.2 }, 0.22, 'outBack');
  // ---- D/E: on Phobos by the scale ----
  at(10.5, -4.4, 0, 7.6, 0.45);
  k(10.5, { ...NEUT, ...ARMS0, ...BODY0, walk: 0, headX: -0.35, lookY: 0.8, eyeS: 1.15, browL: 0.35, browR: 0.35, smile: 0.1, aLz: 0.25, aRz: 0.25, earL: -0.3, earR: -0.3, tail: 0.4 }, 0.01, 'lin');
  k(ws(28), { headX: -0.15, lookY: 0.3, lookX: 0.4, headY: 0.25 }, 0.4);
  k(ws(30) - 0.05, { aRz: 1.75, aRx: 0.9, eR: 2.1, headY: 0.5, headX: 0.0, squint: 0.55, smile: 0.4, lookX: 0.8, lookY: 0.1, browAL: -0.2, browAR: -0.2, torsoZ: 0.06 }, 0.2, 'outBack');
  k(ws(30) + 0.32, { headY: -0.35, lookX: -0.8 }, 0.2);
  k(ws(31) - 0.05, { ry: 0.15, aRz: 1.15, aRx: 0.55, eR: 0.35, aRy: 0.3, aLz: 0.6, eL: 0.6, headY: 0.35, headX: 0.05, squint: 0.2, smile: 0.9, lookX: 0.5, lookY: -0.2, torsoZ: -0.04, talk: 1, browAL: 0, browAR: 0 }, 0.22, 'outBack');
  k(ws(32) - 0.02, { sq: -0.05, hipY: -0.1, aRz: 1.3 }, 0.1, 'outBack');
  k(ws(32) + 0.25, { sq: 0, hipY: 0 }, 0.2);
  // E: tap the dial, point down, lean in, the big reveal
  k(ws(35) - 0.05, { ry: 0.55, aRz: 0.55, aRx: 1.35, eR: 0.4, aLz: 0.3, aLx: 0, eL: 0.4, headY: 0.4, headX: 0.15, lookX: 0.6, lookY: -0.5, smile: 0.5, squint: 0 }, 0.2, 'outBack');
  k(ws(36), { ry: 0.25, aRz: 0.35, aRx: 0.55, eR: 0.15, headY: 0.1, headX: 0.35, lookY: -0.9, lookX: 0, browL: 0.3, browR: 0.3 }, 0.2, 'outBack');
  k(ws(38) - 0.1, { ry: 0.6, torsoX: 0.32, hipY: -0.3, aRz: 0.3, aRx: 0.3, eR: 0.6, aLz: 0.3, aLx: 0.6, eL: 1.6, headX: 0.25, headY: 0.35, squint: 0.65, sly: 0.3, lookX: 0.6, lookY: -0.3, smile: 0.0, mouth: 0, browAL: -0.25, browAR: -0.25 }, 0.3, 'io');
  k(ws(39) - 0.03, { ry: 0.25, torsoX: -0.12, hipY: 0, rise: 0.9, sq: 0.12, eyeS: 1.4, squint: 0, sly: 0, mouth: 1, mouthO: 1, browL: 0.8, browR: 0.8, browAL: 0.2, browAR: 0.2,
    earL: -0.55, earR: -0.55, aLz: 2.2, aLx: 0.4, eL: 0.5, aRz: 2.2, aRx: 0.4, eR: 0.5, headX: -0.2, headY: 0.15, lookX: 0.4, lookY: 0.4, smile: 0.2, tail: 1.2 }, 0.12, 'outBack');
  k(ws(39) + 0.22, { rise: 0, sq: -0.1 }, 0.12, 'in2');
  k(ws(39) + 0.4, { sq: 0 }, 0.12);
  k(ws(40) - 0.02, { aRz: 1.25, aRx: 1.15, eR: 0.1, aLz: 0.5, aLx: 0.3, eL: 1.0, mouth: 0.4, eyeS: 1.25, headX: -0.25, headY: 0.4, lookX: 0.7, lookY: 0.6, torsoX: 0.1 }, 0.2, 'outBack');
  // F: landing, the grab, coring, nitrogen blast
  k(18.2, { ry: 0.45, aRz: 0.3, aRx: 0, eR: 0.3, aLz: 0.3, aLx: 0, eL: 0.3, eyeS: 1.15, mouth: 0, mouthO: 0, browL: 0.3, browR: 0.3, headX: -0.3, headY: 0.3, lookX: 0.5, lookY: 0.8, torsoX: 0, talk: 0, smile: 0.2 }, 0.35);
  at(18.6, -4.8, 0, 8.4, 0.45, 0.4, 'io');
  k(19.55, { sq: -0.08, hipY: -0.2, eyeS: 1.3, earL: 0.5, earR: 0.5 }, 0.1);
  k(19.8, { sq: 0, hipY: 0, eyeS: 1.15, earL: 0, earR: 0 }, 0.2);
  k(ws(43) - 0.15, { ry: 0.05, aLz: 2.3, aLx: 0.6, eL: 0.4, aRz: 2.3, aRx: 0.6, eR: 0.4, headY: 0, headX: 0.05, lookX: 0, lookY: 0, sly: 0.5, smile: 1, browAL: -0.3, browAR: 0.3, eyeS: 1, hipY: -0.25, talk: 1 }, 0.2, 'outBack');
  k(ws(44) + 0.05, { aLz: 0.4, aLx: 1.5, eL: 1.2, aRz: 0.4, aRx: 1.5, eR: 1.2, pawL: 0.85, pawR: 0.85, hipY: 0, torsoX: 0.2, sly: 0.7, headX: 0.15 }, 0.12, 'outBack');
  k(ws(45) - 0.1, { ry: 0.6, aLz: 0.3, aLx: 0.2, eL: 0.5, aRz: 0.4, aRx: 0.3, eR: 0.6, pawL: 1, pawR: 1, torsoX: 0, sly: 0, smile: 0.5, headY: 0.4, headX: -0.05, lookX: 0.7, lookY: 0.2, eyeS: 1.15, talk: 0 }, 0.25);
  k(ws(47) + 0.22, { lean: -0.16, torsoX: -0.2, squint: 1, smile: -0.6, mouth: 0.6, earL: 1.0, earR: 1.0, aLz: 0.7, aLx: 1.5, eL: 2.2, aRz: 0.5, aRx: 1.3, eR: 2.0, headY: 0.1, headX: 0.2, tailWag: 1.5, rise: 0.15 }, 0.1, 'outBack');
  k(ws(48) + 0.25, { lean: -0.08, rise: 0 }, 0.2);
  k(22.55, { lean: 0, torsoX: 0.05, squint: 0.2, smile: 0.2, mouth: 0, earL: 0.2, earR: 0.2, headZ: 0.2, aLz: 0.3, aLx: 0.2, eL: 0.4, aRz: 0.5, aRx: 0.6, eR: 1.4, tailWag: 0 }, 0.25);
  // G: the jar close-up (the cat's paw comes in at the end)
  at(22.9, -14.0, 0, 8.0, 0.6);
  // H: wait in front of Earth
  at(25.0, 47.4, 0, 9.4, -2.55);
  k(25.0, { ...NEUT, ...ARMS0, ...BODY0, headX: -0.3, lookY: 0.6, smile: 0.4, browL: 0.2, browR: 0.2, talk: 0, tail: 0.5, walk: 0 }, 0.01, 'lin');
  k(28.6, { aLz: 2.1, aLx: 0.6, eL: 0.6, aRz: 2.1, aRx: 0.6, eR: 0.6, eyeS: 1.2, headX: -0.4 }, 0.3, 'outBack');
  k(ws(65) - 0.06, { ry: -0.6, aLz: 0.4, aLx: 1.2, eL: 2.0, aRz: 2.7, aRx: 0.3, eR: 1.4, pawR: 0.9, squint: 1, smile: 1, rise: 0.6, sq: 0.08, headX: 0.0, talk: 0, lookY: 0 }, 0.12, 'outBack');
  k(ws(65) + 0.2, { rise: 0, sq: -0.06 }, 0.12, 'in2');
  k(ws(65) + 0.36, { sq: 0 }, 0.12);
  // I: the loot
  at(30.5, 46.3, 0, 12.6, 0.2, 0.3, 'io');
  k(30.55, { ...NEUT, ...BODY0, aLz: 0.4, aLx: 0.9, eL: 1.9, aRz: 0.45, aRx: 1.35, eR: 0.7, pawL: 1, pawR: 1, sly: 0.55, smile: 1, browAL: -0.3, browAR: 0.3, headX: 0.25, headY: 0.1, lookX: 0, lookY: -0.6, talk: 1, tail: 0.8 }, 0.25, 'outBack');
  k(ws(68) - 0.05, { aLz: 0.6, aLx: 1.1, eL: 2.1, pawL: 0.85, aRz: 2.35, aRx: 0.45, eR: 0.25, sly: 0, squint: 1, smile: 1, headX: -0.25, headY: 0, rise: 0.5, sq: 0.1, lookY: 0.6, earL: -0.3, earR: -0.3 }, 0.14, 'outBack');
  k(ws(68) + 0.24, { rise: 0, sq: -0.05 }, 0.14, 'in2');
  k(ws(70), { sq: 0, aLz: 0.5, aLx: 1.2, eL: 1.8, pawL: 1, aRz: 0.5, aRx: 1.25, eR: 1.5, squint: 0.7, headZ: -0.2, headY: 0.35, headX: 0.15, lookX: 0.6, lookY: -0.2 }, 0.25);
  k(ws(73), { headZ: 0.15, headY: 0.0, lookX: 0, lookY: 0, squint: 1 }, 0.25);
  // J: NEXT. walk right to the Electron pad, count the satellites
  k(34.45, { walk: 1, squint: 0, smile: 0.8, talk: 1, headY: 0.2, aLz: 0.3, aLx: 0.2, eL: 0.4, aRz: 0.5, aRx: 1.2, eR: 1.4 }, 0.2);
  at(34.45, 46.3, 0, 12.6, 0.9);
  k(35.55, { x: 66.4, z: 18.8, ry: 0.5 }, 1.1, 'io');
  k(35.55, { walk: 0 }, 0.2);
  k(ws(81) - 0.1, { ry: 0.85, aRz: 0.9, aRx: 1.1, eR: 0.2, headY: 0.55, headX: 0.15, lookX: 0.6, lookY: -0.4 }, 0.15, 'outBack');
  k(ws(81) + 0.17, { aRz: 0.8, aRy: 0.2, ry: 0.95 }, 0.1);
  k(ws(82), { aRz: 0.7, aRy: 0.35, ry: 1.05 }, 0.1);
  k(ws(84), { ry: 0.35, aRz: 0.4, aRx: 0.2, eR: 0.5, headY: 0.1, headX: 0, lookX: 0, lookY: 0, smile: 0.9 }, 0.25);
  k(ws(85) - 0.05, { ry: 0.6, aRz: 1.5, aRx: 0.9, eR: 0.2, aRy: 0.1, headY: 0.45, lookX: 0.7, lookY: -0.2, squint: 0.5 }, 0.18, 'outBack');
  // K: end card. pop up from below the slab edge and wave
  at(38.73, 0.3, 14.0, 1.8, -0.08);
  k(38.73, { ...NEUT, ...ARMS0, ...BODY0, walk: 0, talk: 1, smile: 0.8, aLz: 0.4, aRz: 0.4, tail: 0.5 }, 0.01, 'lin');
  k(39.05, { y: 29.4 }, 0.3, 'outBack');
  k(39.0, { hipY: -0.3, sq: -0.08 }, 0.1);
  k(39.25, { hipY: 0, sq: 0.06 }, 0.12, 'outBack');
  k(39.45, { sq: 0, aRz: 2.6, aRx: 0.3, eR: 0.9, headZ: 0.12, smile: 1, squint: 0.3 }, 0.2, 'outBack');
  k(40.35, { squint: 0, eyeS: 1.15 }, 0.12);
  k(40.75, { eyeS: 1, squint: 0.6, smile: 1 }, 0.2);

  // waving and paw-rubbing loops
  function extra(tp, P) {
    if (tp > 39.45 && tp < 41.6) { const w = Math.sin((tp - 39.45) * Math.PI * 2 * 2.2); P.eR += w * 0.45; P.aRy += w * 0.15; }
    if (tp > ws(14) && tp < ws(16) - 0.1) { const w = Math.sin((tp - ws(14)) * Math.PI * 2 * 3); P.aLz += w * 0.12; P.aRz -= w * 0.12; P.eL += w * 0.15; P.eR -= w * 0.15; }
    if (tp > 32.0 && tp < 34.4) { const w = Math.sin((tp - 32.0) * Math.PI * 2 * 1.6); P.torsoZ += w * 0.08; P.rise += Math.max(0, w) * 0.25; P.headZ += w * 0.06; }
    if (tp > 22.0 && tp < 22.55) { const w = Math.sin((tp - 22.0) * Math.PI * 2 * 5); P.headX += w * 0.08; P.torsoX += w * 0.04; }
    // run: lean and bounce
    if (P.walk > 0.5) { P.torsoX += 0.1; }
  }
  let cat;
  function catWords() {
    return WORDS.map((w, i) => ({ ...w, stress: CAPS.EMPH.has(i) }));
  }
  function catScene(t) { return t < 10.5 ? 'T' : t < 25.0 ? 'G' : t < 38.73 ? 'T' : 'C'; }
  // the run path for step one (positions on twos)
  function runPos(tp) {
    const u = E.out(seg(tp, 7.45, 8.7));
    return [U.lerp(-27, -11, u), U.lerp(30, 21, u)];
  }

  // ===================== CREDIT SLOT =====================
  const PHOTO = 'NASA/JPL-Caltech/University of Arizona';
  const CRED = [
    [0, 'Illustration · facts: NASA'], [3.43, 'Illustration · facts: JAXA'], [7.33, 'Illustration · facts: NASA, JAXA'],
    [10.5, 'Illustration · facts: DLR, ESA'], [14.86, 'Illustration · facts: ESA'], [18.6, 'Illustration · facts: JAXA, NASA'],
    [22.9, 'Illustration · facts: JAXA, ESA'], [25.0, 'Illustration · facts: JAXA, NASA, ESA'], [30.6, 'Illustration · facts: JAXA'],
    [34.6, 'Illustration · facts: Launch Library 2'], [38.73, ''],
  ];

  // ===================== PER FRAME =====================
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  function init(scenes) {
    cat = new CAT.Actor(scenes.T, { seed: 5, words: catWords(), keys: K, extra });
    TL.cat = cat;
  }
  function update(t, scenes, camera) {
    const tp = U.twos(t), pi = U.poseIndex(t);
    const c = camAt(t);
    const scene = c.scene === 'T' ? scenes.T : c.scene === 'G' ? scenes.G : scenes.C;
    // ---- cat ----
    const cs = catScene(t), cScene = cs === 'T' ? scenes.T : cs === 'G' ? scenes.G : scenes.C;
    if (cat.R.root.parent !== cScene) cScene.add(cat.R.root);
    const P = cat.apply(t);
    cat.R.root.scale.setScalar(cs === 'C' ? 1.55 : 1);
    if (tp >= 7.33 && tp < 8.7) { const [x, z] = runPos(tp); cat.R.root.position.x = x; cat.R.root.position.z = z; }
    if (P.walk > 0.01) {
      // walk phase from distance travelled (feet do not slide)
      const dist = tp < 30 ? Math.abs(runPos(tp)[0] + 27) : Math.abs(cat.R.root.position.x - 46.3) + Math.abs(cat.R.root.position.z - 12.6);
      const ph = dist / 2.6;
      const R = cat.R;
      // re-apply the legs with the phase (quick override of the walk cycle)
      const a = P.walk, s = Math.sin(ph * Math.PI * 2);
      R.hipL.rotation.x = -(s * 0.6 * a); R.hipR.rotation.x = (s * 0.6 * a);
      R.kneeL.rotation.x = Math.max(0, -Math.cos(ph * Math.PI * 2)) * 0.8 * a; R.kneeR.rotation.x = Math.max(0, Math.cos(ph * Math.PI * 2)) * 0.8 * a;
      R.ankleL.rotation.x = -R.hipL.rotation.x - R.kneeL.rotation.x; R.ankleR.rotation.x = -R.hipR.rotation.x - R.kneeR.rotation.x;
      const bob = Math.abs(Math.cos(ph * Math.PI * 2)) * 0.22 * a;
      R.hips.position.y += bob; R.hipL.position.y += bob; R.hipR.position.y += bob;
      R.shL.rotation.x += s * 0.5 * a; if (tp > 34) R.shR.rotation.x -= s * 0.3 * a;
    }
    cat.R.root.updateMatrixWorld(true);

    // ---- TABLE stage ----
    if (c.scene === 'T' || cs === 'T') {
      const th = 0.62 + 0.03 * tp;
      W.arm.rotation.y = th;
      W.phobosT.rotation.set(0.3 + tp * 0.05, -0.6 + tp * 0.08, 0.15);
      // the collision-course spiral: an amber clay snake that rolls itself out (on twos)
      const t0 = ws(6) - 0.04, grow = E.sine(seg(tp, t0, t0 + 1.35));
      W.spiralG.visible = tp >= t0 && tp < 4.2;
      W.spiralG.rotation.y = th - 0.15;
      const nI = Math.max(3, Math.floor(grow * W.spiralIdx / 3) * 3);
      W.spiral.geometry.setDrawRange(0, nI);
      { const u = grow, ang = -u * Math.PI * 2 * 1.55, r = 13 - (13 - 9.7) * Math.pow(u, 0.8); W.spiralTip.position.set(Math.sin(ang) * r, 10, Math.cos(ang) * r); }
      W.flagSpiral.position.set(0.5, 0, 21.0); W.flagSpiral.rotation.y = 0.32;
      W.flagSpiral.scale.setScalar(SET.life(tp, ws(7), 3.32));
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
      const hold = tp >= 7.33 && tp < 10.5;
      W.stickMMX.visible = hold;
      if (hold) {
        cat.R.pawR.getWorldPosition(tmpV);
        W.stickMMX.position.set(tmpV.x + 0.1, tmpV.y - 1.4, tmpV.z);
        W.stickMMX.rotation.set(0, 0.6, (P.walk > 0.5 ? 0.06 * Math.sin(tp * 18) : 0) - 0.05);
        W.mmxS.rotation.set(0.1, 0.4 + tp * 0.4, 0.15 * Math.sin(tp * 4));
      }
      W.flagCruise.position.set(-6.6, 0, 13.6); W.flagCruise.rotation.y = 0.12;
      W.flagCruise.scale.setScalar(0);
      // MMX burn: from near Phobos to Earth
      const burnT = ws(57) - 0.03;
      const mb = W.mmxBurn;
      mb.visible = tp > 24.9 && tp < 28.6;
      if (mb.visible) {
        const ph = V([Math.sin(th) * 13, 10, Math.cos(th) * 13]);
        const p0 = ph.clone().add(V([1.6, 1.4, 1.6]));
        const path = [p0.toArray(), [20, 15, 12], [33, 15, 6], [41, 15, 1], [52, 18, -6]];
        const u = tp < burnT ? 0 : E.in2(seg(tp, burnT, burnT + 1.6));
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
        bp.spec.push({ t0: burnT + i * 0.03, p: ph, v: [-2 - U.hashU(i) * 3, U.hashS(i, 2) * 2, -1 + U.hashS(i, 3) * 3], s0: 0.3, s1: 0.9 + U.hashU(i * 9) * 0.6, k: 1.4 });
      }
      CRAFT.updatePuffs(W.burnPuffs, t);
      if (tp > 31) W.burnPuffs.visible = false; else W.burnPuffs.visible = true;
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
        // the hatch pops off for the loot
        const hatch = cap.userData.cap.children[2];
        if (tp > 30.75) { const a = tp - 30.75; hatch.position.set(-a * 3, 0.86 + a * 4 - a * a * 6, a * 1.5); hatch.rotation.z = a * 4; hatch.visible = a < 0.8; } else { hatch.position.set(0, 0.86, 0); hatch.rotation.z = 0; hatch.visible = true; }
      }
      W.flagCap.position.set(41.4, 0, 11.0); W.flagCap.rotation.y = 0.05;
      W.flagCap.scale.setScalar(0);
      // the jar: pulled from the capsule, held up, carried
      const jt = W.jarT;
      jt.visible = tp > 30.75 && tp < 38.8;
      if (jt.visible) {
        cat.R.pawR.getWorldPosition(tmpV2);
        const u = E.out(seg(tp, 30.75, 31.05));
        const from = ausP.clone().addScaledVector(ausN, 0.6);
        jt.position.copy(from.lerp(tmpV2.add(V([0, -0.15, 0.45])), u));
        jt.rotation.set(0, cat.R.root.rotation.y, 0);
      }
      // easel photo
      const ph = SET.popScale(tp, ws(68) - 0.25);
      W.photoG.scale.setScalar(ph * (tp < 38.7 ? 1 : 0));
      // NEXT
      W.flagNext.scale.setScalar(SET.popScale(tp, ws(76) - 0.05));
      W.flagNext.rotation.y = 0.0;
      W.sats.forEach((s, i) => { const ts = ws(81) + i * 0.17; const b = tp >= ts ? U.bump(tp, ts, ts + 0.27) : 0; s.position.y = 1.1 + b * 1.4; s.rotation.y = 0.3 + (tp > ts ? 0.4 : 0); });
      W.flagWed.scale.setScalar(SET.popScale(tp, ws(85) - 0.05)); W.flagWed.rotation.y = 0.0;
    }

    // ---- GROUND stage ----
    if (c.scene === 'G' || cs === 'G') {
      const m = W.mmxG, land = 19.55;
      // hover, then land
      let my = 15.5 + 0.3 * Math.sin(tp * 2.1);
      const lu = E.io(seg(tp, 18.25, land));
      if (tp > 18.25) my = U.lerp(15.5, 5.65, E.out(seg(tp, 18.25, land)));
      if (tp >= land) my = 5.65 - 0.35 * U.bump(tp, land, land + 0.27);
      m.position.set(U.lerp(0.9, -2.0, lu), my, U.lerp(3.0, -9.0, lu));
      m.rotation.set(0, U.lerp(0.45, 0.2, lu), tp < land ? 0.03 * Math.sin(tp * 1.7) : 0);
      const ud = m.userData;
      // wings flap gently, the arm unfolds for coring
      const armT = ws(45) - 0.05, armDown = ws(45) + 0.3, armUp = ws(46) + 0.35;
      const reach = E.outBack(seg(tp, armT, armDown)) * (1 - E.io(seg(tp, armUp, armUp + 0.4)) * 0.6);
      ud.a1.rotation.set(U.lerp(0.35, -0.65, reach), 0, -0.2 + reach * 0.15);
      ud.a2.rotation.set(U.lerp(-2.35, 0.25, reach), 0, 0);
      ud.corer.position.y = -1.1 - (tp > armDown && tp < armUp ? 0.25 * U.bump(tp, armDown, armUp) : 0);
      CRAFT.flameWobble(ud.flame, t, 0, 1);
      // rover: under MMX, drop at "drop", land on the scale, float at "15"
      const r = W.rover, dropT = ws(28) + 0.04, platY = 2.13 * 1.5 + 0.02;
      const hang = V([0.9, my - 4.0, 3.0]);
      const sp = V([0.9, platY, 5.0]);
      const fall = seg(tp, dropT, dropT + 0.95);
      let rp;
      if (tp < dropT) rp = hang;
      else if (tp < dropT + 0.95) { const u = fall; rp = hang.clone().lerp(sp, u); rp.y = U.lerp(hang.y, sp.y, u * u); }
      else rp = sp.clone();
      const landT = dropT + 0.95;
      if (tp > landT && tp < ws(39)) rp.y += 0.9 * Math.abs(Math.sin(seg(tp, landT, landT + 0.7) * Math.PI)) * (1 - seg(tp, landT, landT + 0.7));
      const floatT = ws(39) + 0.06;
      if (tp >= floatT) {
        const a = tp - floatT;
        rp.y += 2.6 * (1 - Math.exp(-a * 1.4)) + 0.25 * Math.sin(a * 2.4);
        const poke = ws(40) + 0.15;
        if (tp > poke) { const b = tp - poke; rp.x += b * 2.2; rp.y += b * 1.4; rp.z -= b * 0.6; }
      }
      r.position.copy(rp);
      r.rotation.set(tp > floatT ? (tp - floatT) * 0.25 : 0, -0.5 + (tp > floatT ? (tp - floatT) * 0.4 : 0), tp > floatT ? Math.sin(tp - floatT) * 0.2 : 0);
      r.visible = tp < 22.95;
      const camYaw = tp > landT ? Math.sin(seg(tp, landT + 0.1, landT + 1.2) * Math.PI * 2) * 0.9 : 0;
      r.userData.cam.rotation.y = camYaw;
      // land squash
      if (tp > landT && tp < landT + 0.2) r.scale.set(1.55 * 1.08, 1.55 * 0.88, 1.55 * 1.08); else r.scale.setScalar(1.55);
      // scale: needle and faces
      const sc = W.scale.userData;
      let needle = 0;
      if (tp > landT) needle = 1.25 * U.spring(tp - landT, 0.3, 2.4);
      if (tp > ws(32) - 0.03) needle += 1.05 * U.spring(tp - ws(32) + 0.03, 0.22, 3.2);
      if (tp > ws(38)) needle += 0.12 * Math.sin((tp - ws(38)) * 22) * (1 - seg(tp, ws(38), ws(39)));
      if (tp >= floatT) needle = 2.3 * (1 - U.spring(tp - floatT, 0.35, 2.0)) * 1.0 + 0.0;
      sc.needle.rotation.z = -needle + 1.15;
      const flip = tp >= ws(39) - 0.02;
      sc.fA.visible = !flip; sc.fB.visible = flip;
      sc.fB.scale.setScalar(flip ? SET.popScale(tp, ws(39) - 0.02) : 1);
      W.scale.visible = tp < 22.88;
      // puffs: rover landing dust, MMX landing, nitrogen blast
      const dp = W.dropPuffs.userData; dp.spec = [];
      for (let i = 0; i < dp.list.length; i++) { const a = i / dp.list.length * 6.28; dp.spec.push({ t0: landT, p: [0.9 + Math.cos(a) * 1.9, platY + 0.2, 5.0 + Math.sin(a) * 1.9], v: [Math.cos(a) * 2, 0.6, Math.sin(a) * 2], s0: 0.2, s1: 0.5, k: 2 }); }
      CRAFT.updatePuffs(W.dropPuffs, t);
      W.dropPuffs.visible = tp < 15.5;
      const lp = W.landPuffs.userData; lp.spec = [];
      for (let i = 0; i < lp.list.length; i++) {
        const leg = i % 4, a = U.hashU(i * 17) * 6.28;
        const lx = [-1, 1, -1, 1][leg] * 4.4, lz = [-1, -1, 1, 1][leg] * 3.6;
        const c2 = Math.cos(0.2), s2 = Math.sin(0.2);
        const wx = -2.0 + lx * c2 + lz * s2, wz = -9.0 - lx * s2 + lz * c2;
        lp.spec.push({ t0: land - 0.05, p: [wx, 0.3, wz], v: [Math.cos(a) * 3, 0.4 + U.hashU(i) * 0.8, Math.sin(a) * 3], s0: 0.3, s1: 0.55 + U.hashU(i * 3) * 0.4, k: 1.6 });
      }
      CRAFT.updatePuffs(W.landPuffs, t);
      W.landPuffs.visible = tp < 20.95;
      const blastT = ws(47) + 0.06;
      const gp = W.gasPuffs.userData; gp.spec = [];
      const noz = V([1.1, 1.0, -7.4]);
      for (let i = 0; i < gp.list.length; i++) {
        const sp2 = 11 + U.hashU(i * 5) * 9, sx = U.hashS(i, 4) * 0.35, sz = U.hashS(i, 6) * 0.3;
        gp.spec.push({ t0: blastT + U.hashU(i * 7) * 0.12, p: noz.toArray(), v: [(-0.34 + sx) * sp2, 0.4 + U.hashU(i * 9) * 3.0, (0.94 + sz) * sp2], s0: 0.35, s1: 0.8 + U.hashU(i * 2) * 0.8, k: 2.0 });
      }
      CRAFT.updatePuffs(W.gasPuffs, t);
      W.gasPuffs.visible = tp < 22.95;
      // crumbs lofted by the gas, into the sampler
      W.crumbs.forEach((cm, i) => {
        const t0 = blastT + i * 0.02, a = tp - t0;
        cm.visible = a > 0 && a < 0.7 && tp < 22.95;
        if (!cm.visible) return;
        const rr = cm.userData.r;
        cm.position.set(noz.x + (rr[0] - 0.5) * 2 - a * 1.0, 0.3 + a * (5 + rr[1] * 4) - a * a * 3, noz.z + (rr[2] - 0.5) * 2 + a * 1.5);
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
      W.flagDrop.position.set(-0.5, 0, -4.0); W.flagDrop.rotation.y = 0.05;
      W.flagDrop.scale.setScalar(SET.life(tp, 11.0, ws(31) - 0.15));
      W.flagHours.position.set(0.4, 0, 7.0); W.flagHours.rotation.y = -0.05;
      W.flagHours.scale.setScalar(SET.life(tp, land + 0.1, ws(45) - 0.25));
      W.flagCore.position.set(-3.0, 0, -0.8); W.flagCore.rotation.y = 0.3;
      W.flagCore.scale.setScalar(SET.life(tp, ws(45) + 0.05, 22.85));
      W.flagJar.position.set(-3.5, 0, 11.6); W.flagJar.rotation.y = 0.15;
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
      if (sa >= 0 && sa < 0.4) { const k = [1.28, 0.9, 1.08, 0.98, 1.02, 1][Math.min(5, Math.floor(sa * 15))]; W.echoDot.scale.setScalar(k); }
      const pa = tp - pingT;
      W.echoPing.visible = pa > 0 && pa < 0.75;
      if (W.echoPing.visible) { const s = 1 + Math.floor(pa * 15) / 15 * 2.6; W.echoPing.scale.set(s, s, Math.max(0.05, 1 - pa * 1.2)); }
      W.word.position.x = -W.wordW / 2 - 0.2;
    }

    // ---- lights follow the action ----
    const look = V(c.look), camP = V(c.pos);
    const L = c.scene === 'T' ? W.lT : c.scene === 'G' ? W.lG : W.lC;
    const keyOff = c.scene === 'G' ? V([-34, 42, 26]) : V([-30, 40, 34]);
    L.key.position.copy(look).add(keyOff);
    L.key.target.position.copy(look);
    L.key.target.updateMatrixWorld();
    L.key.angle = c.scene === 'G' ? 0.62 : 0.55;
    // ---- camera ----
    camera.position.copy(camP); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(look);
    camera.updateMatrixWorld();
    // whip blur from the camera's screen-space motion
    const prev = camAt(Math.max(0, t - 1 / 30)), nxt = camAt(t + 1 / 30);
    const cutIn = (t0, t1) => CAM.some((k) => k[5].cut && k[1] > t0 && k[1] <= t1);
    const prevOk = prev.scene === c.scene && !cutIn(t - 1 / 30, t);
    const ref = prevOk ? prev : nxt;
    const sgn = prevOk ? 1 : -1;
    const noBlur = !prevOk && (nxt.scene !== c.scene || cutIn(t, t + 1 / 30));
    const dir = V(ref.look).sub(V(ref.pos)).normalize();
    const far = V(ref.pos).addScaledVector(dir, 60).project(camera);
    let wx = far.x * 540 * sgn, wy = far.y * 960 * sgn;
    const wl = Math.hypot(wx, wy);
    const shutter = 0.6;
    const whip = wl > 30 && !noBlur ? [wx * shutter, wy * shutter] : [0, 0];
    const focus = c.focus ?? camP.distanceTo(look);
    // caption placement per stage
    let capY = 1290;
    if (c.scene === 'C') capY = 1320;
    if (t >= ws(31) - 0.01 && t < 18.5) capY = 440;
    // credit
    let credit = ''; for (const [t0, s] of CRED) if (t >= t0) credit = s;
    // photo on screen? (any corner inside the frame while it is shown)
    let photoOn = false;
    if (c.scene === 'T' && W.photoG.scale.x > 0.05) {
      W.photoG.updateMatrixWorld(true);
      for (const [x, y] of [[-3.6, -3.8], [3.6, -3.8], [-3.6, 3.8], [3.6, 3.8], [0, 0]]) {
        const v = V([x, y, 0.1]).applyMatrix4(W.photoG.matrixWorld).project(camera);
        if (v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05) photoOn = true;
      }
    }
    return { scene, focus, ap: c.ap, whip, capY, credit, photo: photoOn ? PHOTO : '' };
  }
  return { init, update, camAt, CAM, K };
})();
