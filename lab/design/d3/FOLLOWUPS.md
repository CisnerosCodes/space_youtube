# D3 Full Bleed: motion test review log

Render: `anim.html`, 12 s, 30 fps, 360 frames. Outputs: `out/video.mp4`, `out/contact.png`, `out/stills/`.

Shot list (every cut on a multiple of 15): 0 NHQ202211160030 / 30 NHQ202211160200 / 60 NHQ202211160022 / 75 NHQ202211160003 / 105 NHQ202211160012 / 135 NHQ202211160014 / 150 NHQ202211160019 / 180 art001e002083 (wide) / 210 art001e002083 (tight on Earth) / 240 art001e001712 (Moon above the array) / 270 art001e002083 (Orion edge) / 300 art001e001712 (Earth under the array) / 315 black, no photo / 330 end card on NHQ202211160030, framed 4% wider than frame 0.

## Round 1 (stills 0, 20, 45, 75, 105, 150, 180, 210, 255, 300, 330, 359)

What a viewer sees:
- 0: night liftoff with the plume on the right; "1:47 A.M." fills the dark sky on the left under the LAUNCHING TODAY kicker. One tick lit.
- 20: the same shot, 4% tighter after the frame 15 punch-in.
- 45: the rocket clearing the towers; "LAUNCH PAD" with PAD in green.
- 75: tight vertical of SLS climbing; "ARTEMIS I / LIFTS" with LIFTS green.
- 105: launch reflected in the lagoon; "SLS" green.
- 150: the arcing exhaust trail; "FOR" green.
- 180: Moon limb with Earth as a crescent; giant "DAY" slamming in.
- 210: tighter on the Earth crescent, chip on screen; "BEHIND" green.
- 255: Orion's array with the Moon; "3:27" with the burn caption.
- 300: looked almost the same as 210 (same photo, same limb and crescent).
- 330 / 359: end card "SIGNAL / DELAY" over the hook photo; ring echo at 359.

Notes acted on:
1. Frames 0 to 29 and 330 to 359: measured white-text contrast behind the giant type (photo only, text hidden). The worst pixels behind "1:47" reached 3.8:1 and "A.M." 4.0:1 because the plume glow reaches them. Added a flat 25% black scrim (no gradient) to the hook shot and the end card. The worst pixel is now 6.1:1 or higher. Applied the same scrim to the hook artboard and to the title card on the spec board.
2. Frames 180 to 209: the worst pixel behind "20" was 4.5:1 on the light lavender sky near the camera's real flare. Added the same flat 25% scrim to this shot. The worst pixel is now 7.0:1.
3. Frame 255: the Moon sat behind the progress ticks at y 220. Reframed art001e001712 (scale 1.6, x offset 848) so the Moon sits at x 880, y 304, below the ticks and to the right of "3:27". The array still runs below the number.
4. Frame 300: this shot repeated frame 210. Replaced it with art001e001712 framed on Earth peeking under the solar array, so "HOME." lands on a different picture of Earth.

## Round 2 (same 12 stills plus 15, 17, 60, 135, 165, 188, 223, 226, 241, 243, 252, 270, 285, 315, 322, 334)

What a viewer sees: the punch-in at 15 settles by 21. At 60 the engines fire with "ARTEMIS" in green. At 188 "DAY 20" sits under the Moon 1.3 s chip. The chip's echo ring arrives at 223, 39 frames (1.3 s) after the chip's dot. The counter reads 0:14 at 241, 1:22 at 243 and holds 3:27 from 252. At 270 Orion's lit edge carries over the burn caption. At 315 the frame is black with "SPLASHDOWN:". At 322 "DEC. 11" slams in. At 334 the handle box appears on the end card.

Notes acted on:
5. Re-measured contrast after round 1: every giant word is 6.0:1 or higher at its worst pixel. "3:27" is 14.8:1 and "DEC. 11" is 21:1. No change needed.
6. Checked that no two elements enter on the same frame at a beat. The cut, giant type or the caption word carry each beat. Ticks and the chip enter 4 frames later as secondary moves. No change needed.

## Round 3 (46, 83, 113, 203, 240, 262, 292, 329, 345, 350)

Each chunk ends on its final word in green (39B., OFF., ORION, RISES, BURN, ORION). The end card ring is still entering at 345 and fully on by 350. Frame 240 reads "0:00" for one frame as the counter starts; this is accepted because it is the start of the count-up.

No further changes. Full render done. The contact sheet (every 15th frame, 5x4 tiles, so frames 0 to 285) matches the beats.

## Not met or interpreted
- The direction lets hook numbers bleed off the left edge by up to 40 px. To keep them fully readable, the giant type starts at x 40: 40 px past the x 80 safe line, but not cropped by the frame.
- The contact sheet tool tiles only 20 cells, so it shows frames 0 to 285. Frames 300 to 359 were checked as stills.
- art001e001712 (flight day 14) is used for the burn and "home" beats as illustration. No caption claims it was taken during the burn.
