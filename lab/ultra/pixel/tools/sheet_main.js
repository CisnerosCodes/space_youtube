// sprite + font sheet for QA
initImages();
window.renderAt = function (t) {
  const f = Math.round(t * 30);
  clearFB(C.K1);
  drawStars(f, 0, 0);
  // fonts
  drawText(FONT_M, 'This moon is on a slow-motion', 6, 4, C.P0, { shadow: C.K0 });
  drawText(FONT_M, 'collision course with Mars.', 6, 17, C.A0, { shadow: C.K0 });
  drawText(FONT_M, 'weighs... 15 grams. 2027 2031', 6, 30, C.P0, { shadow: C.K0 });
  drawText(FONT_M, 'HawkEye 360 Wednesday? loot', 6, 43, C.P0, { shadow: C.K0 });
  drawText(FONT_S, 'NASA/JPL-Caltech/University of Arizona', 6, 58, C.P1);
  drawText(FONT_S, 'Illustration · facts: JAXA  0123456789', 6, 68, C.P1);
  drawText(FONT_S, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz', 6, 78, C.P1);
  blit(titleSpr('STAGE 1', 2, ['A1', 'A0', 'A0', 'A2'], 'K0', 'A4'), 6, 90);
  blit(titleSpr('2027', 3, ['P0', 'P0', 'P1', 'P2'], 'K0', 'K3'), 120, 86);
  // cats
  const poses = [
    { pose: 'stand', expr: 'neutral' },
    { pose: 'stand', expr: 'happy', hL: [-9, -22], hR: [9, -22] },
    { pose: 'sit', expr: 'sly', prop: 'pad', hL: [-4, -7], hR: [4, -7] },
    { pose: 'stand', expr: 'shock', mouth: 2, hL: [-10, -14], hR: [10, -14] },
    { pose: 'stand', expr: 'wink', hR: [9, -24] },
    { pose: 'stand', expr: 'happy', prop: 'rock', hL: [-4, -36], hR: [4, -36] },
  ];
  poses.forEach((o, i) => drawCat(24 + i * 42, 175, Object.assign({ tail: f * 0.2 }, o)));
  // portraits
  ['neutral', 'shock', 'sly', 'happy', 'wink', 'focus'].forEach((e, i) => {
    rect(4 + i * 44, 185, 36, 36, C.T0);
    blit(portraitSpr({ expr: e, mouth: i % 3 }), 6 + i * 44, 187);
  });
  // machines
  blit(mmxSpr({}), 4, 228);
  blit(h3Spr(), 80, 226);
  blit(roverSpr({}), 110, 240);
  blit(capsuleSpr({}), 110, 256);
  blit(capsuleSpr({ open: 3, hot: true }), 128, 256);
  blit(electronSpr(), 150, 230);
  blit(satSpr(), 165, 240);
  // photos
  drawPhoto('phobos', 215, 260, 100);
  drawPhoto('mars', 60, 360, 110, { pal: PAL.mars });
  const e = earthSpr(48, 134, -25);
  blit(e, 170 - e.c0, 370 - e.c0);
  mode7({ horizon: 420, camX: f * 2, camZ: f * 3, camH: 30, focal: 150, yEnd: 480 });
  present();
};
