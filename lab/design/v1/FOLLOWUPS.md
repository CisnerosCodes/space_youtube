# Signal Delay v1: motion test review log

Render: `anim.html`, 15 s, 30 fps, 450 frames. Outputs: `out/video.mp4`, `out/contact.png`, `out/stills/`.

Shot list (every cut on a multiple of 15):
- 0 NHQ202211160030 (hook, 30% flat scrim)
- 30 NHQ202211160200
- 60 NHQ202211160022 (cropped below the booster logotype)
- 75 NHQ202211160003
- 105 NHQ202211160012
- 135 NHQ202211160014
- 150 NHQ202211160019
- 180 art001e002083 wide (30% flat scrim)
- 210 art001e002083 tight on Earth
- 240 diagram, Moon framing
- 270 diagram, tight on the burn
- 285 diagram, Earth and Moon
- 315 diagram, Earth framing
- 345 diagram, tight on the splashdown point
- 360 NEXT card

No photo is used for the burn or the splashdown, because no supplied photo shows them.

## Before round 1: a crash in the first test render

The first stills render showed only the ticks and the kicker on every frame. `getTotalLength()` threw on the hidden diagram SVG, which was set to `display: none`, so `renderAt` was never defined. The diagram and the NEXT card now hide with `visibility`. This was a crash, not a design note, so it is not counted as a round.

## Round 1 (stills 0, 30, 75, 120, 180, 240, 300, 345, 390, 420, 449)

What a viewer sees:
- 0: a night liftoff with the rocket on the right. "1:47 / A.M." fills the dark sky on the left under the LAUNCH DAY kicker. One amber tick is lit and the credit sits bottom left.
- 30: the full stack between the lightning towers, with the caption "Launch".
- 75: a tight shot of the orange core stage climbing, with "Artemis I / lifts".
- 120: the launch reflected in the lagoon, with "SLS and Orion" and Orion in amber.
- 180: Earthrise, with a giant "DAY" slamming in.
- 240: an ink frame showing an amber "0:14" (already counting, not 0:00), the burn label, and a Moon circle with a burn marker.
- 300: "3:27" over a small Earth to Moon diagram, with Orion riding the return leg, and "sends Orion / home.".
- 345: "DEC. 11" with a huge Earth circle and the PACIFIC OCEAN marker.
- 390 to 449: the NEXT card. The headline, date and pointer are in, then the Mars orbit diagram, then the wordmark, whose echo ring lands last.

Notes acted on:
1. Frames 188 to 209: the "20" touched the bright lunar limb. Its worst glyph pixel measured 1.9:1. I reframed the wide Earthrise shot (scale 1.5, x 1800, y 100) so the limb sits lower. I also raised "DAY" and "20" by 10 and 20 px. The worst pixel is now 7.4:1 for "20" and 6.4:1 for "DAY", including the slam frames.
2. Frame 240: during the 1.12 slam, "0:14" reached about x 965, past the x 900 safe line. I reduced the burn number from 340 px to 310 px. At the peak of the slam it now ends at about x 880.
3. Frame 240: a stray amber segment of the return path showed at the left edge before it was meant to draw. `vector-effect: non-scaling-stroke` put the dash in screen units while the path length was in user units. I removed it. The stroke width (4 px) and the dash (10 / 12) are now divided by the camera scale on every frame.
4. Frame 345: the Earth circle and the outbound dashed path crossed the giant "DEC. 11". I clipped the diagram to its own zone: y 730 to 1180 under the 3:27 block, and y 540 to 1180 under the date. I also reframed the two splashdown cameras (scale 1.5 and 2.4).
5. Frames 435 to 449: the "MMX" label sat on the dashed probe path. I moved it above the probe marker.

Contrast measured after round 1 (paper glyph pixels against the photo with the type hidden):
- "1:47": worst 9.2:1
- "A.M.": worst 6.3:1
- "DAY": worst 6.4:1
- "20": worst 7.4:1

## Round 2 (stills 0, 19, 30, 45, 60, 75, 120, 135, 150, 180, 188, 210, 223, 240, 241, 255, 270, 285, 300, 315, 323, 330, 345, 360, 375, 390, 405, 420, 435, 444, 449)

What a viewer sees:
- 19: the data line "WED 16 NOV 2022 · EST" cuts in under "A.M." after the punch-in.
- 45: "Launch Pad" with Pad in amber.
- 60: an engine close-up with "Artemis", and no logotype in frame.
- 135: the wide lagoon shot with "SLS and Orion / fly".
- 188: "DAY / 20" stacked over the Moon limb, with the chip below the kicker.
- 223: the chip's echo ring arrives, 39 frames after the dot.
- 241: the counter reads 0:46, and from 255 it holds 3:27.
- 270: a tight cut on the burn marker beside the Moon.
- 285 to 314: the return leg draws from the Moon toward Earth.
- 315 to 345: the splashdown framings show the PACIFIC OCEAN marker, and "DEC. 11" slams in at 323.
- 360 to 449: the NEXT card builds one element per beat.

Notes acted on:
6. Frame 285: the ORION label, placed above its marker, collided with the Moon outline at the start of the return leg. I moved the label below the marker and held it back until frame 292.

Checks with no change needed:
- Every beat from 0 to 444 carries a cut, a punch-in, a word, a slam, a count or a mark.
- No frame shows a zero count. Frame 240 already reads 0:14.
- The count is monotonic and capped at 3:27.

## Round 3 (stills 0, 30, 75, 120, 180, 226, 240, 285, 292, 300, 345, 390, 420, 449)

Notes acted on:
7. Frame 292: the ORION label still grazed the Moon outline while the marker was close to the burn point. The label now appears at frame 300, together with "home.", when the marker is clear of the Moon.
8. Consistency: the chip used an older dot-and-ring proportion. It now uses the same echo mark geometry as the wordmark, the avatar and the artboards (viewBox 104 x 44, dot r 22, ring r 19 with a 6 stroke). I checked frame 226: the ring reads clearly at chip size.

## Full render

`out/video.mp4` is 450 frames, 1080x1920, 30 fps. `out/contact.png` tiles only 20 cells (render.mjs uses a 5x4 grid), so it shows frames 0 to 285. In those tiles, the shot order, the word-by-word captions, the Day 20 stack, the chip, the count from 0:14 to 3:27 and the diagram framings all match the beats. I checked frames 300 to 449 as stills.

## Deviations and interpretations

- NEXT card timing: the card starts at frame 360, not 375. The rule "0.3 s per word + 0.5 s" requires 2.9 s for the 8-word headline ("Japan's MMX launches for the moons of Mars."). Frames 375 to 449 give only 2.5 s, while 360 to 449 gives 3.0 s. Beat 7 (splashdown) therefore runs 315 to 359 (1.5 s). Its three words need 1.4 s. Both starts land on multiples of 15.
- Ticks: there are seven ticks, one for each story beat (0, 30, 60, 105, 180, 240, 315). All seven are amber on the NEXT card.
- The kicker stays on screen for the whole Short, because the series identity has to be visible in any frame. On the NEXT card it reads "NEXT ON LAUNCH DAY" in the same box and position, so the loop from frame 449 to frame 0 reads as the next episode starting.
- Giant type starts at x 40, as HYBRID.md allows. Every other text element sits inside x 80 to 900 and y 260 to 1500.
- The MMX launch date (MON 19 OCT) comes from HYBRID.md as the owner's real example. It was not checked against a source in this pass.
