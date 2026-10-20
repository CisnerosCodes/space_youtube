# Signal Delay motion v2: review log and follow-ups

Short: MMX (Launch Day), script `lab/voice/script_mmx_v3.md`, voice `lab/voice/out_v3/puck_creator_high.mp3` (Gemini Puck, 37.224 s). Render: 1117 frames at 30 fps (37.2333 s, the mp3 length rounded up to whole frames). Outputs: `out/short_v2.mp4` (with narration), `out/video.mp4` (silent), `out/contact.png` (render.mjs default, frames 0 to 285), `out/contact_full.png` (every 30th frame plus the last), `out/motion_proof.png`, `out/cues.json`, `out/caption_sync.json`, QA sheets in `out/qa/`, QA stills in `out/stills/r1..r3/`.

Mid-task change: the lead switched from script v2 and the Fish voice to script v3 and the Puck voice, asked for caption words from the script (not the transcript) and for a cue list. Everything below is the v3 build.

## Beats (frames come from the narration; nothing is hard-coded to seconds)

| Frames | Narration | Picture | Credit slot |
|---|---|---|---|
| 0 to 116 | Mars has a moon that is falling. Slowly. | Phobos (PIA10368) drifting down and decelerating, 3-layer parallax push; punch-in on "Slowly." Cat peeks over the caption box, excited, 14 to 67. | NASA/JPL-Caltech/University of Arizona |
| 117 to 133 | Phobos | The photo shrinks along a curve into the amber dot on its orbit (the persistent actor). | same, then Source: NASA |
| 133 to 413 | drops about six feet closer to Mars every hundred years. In fifty million years, it either crashes into Mars, or shatters into a ring. | Line art: Mars circle, tilted orbit (the dot passes behind Mars), "6 FT" slam (151), the orbit tightens into a dashed spiral on "closer", "50" counts up on the spring (250), the dot spirals into Mars (impact ring at 315), rewinds on "or" (339), bursts into 64 seeded fragments that spread into a ring (357 to 394). | Source: NASA |
| 414 to 517 | And on Monday, Japan launches a mission to go grab a piece of it. | Camera tilts down: the diagram leaves upward, the H3 rises in; "MON" slam (423). On "go" (470) the dot leaves the fairing, the camera tilts up and Phobos (PIA10369) drops into frame; a ring marks a piece (491). | Source: Launch Library 2, then the photo credit |
| 518 to 645 | It is called MMX. Land on Phobos, scoop up a sample, fly it home. | The ring opens into ink (iris). MMX line art draws itself, staggered 3 to 6 frames; "MMX" slam (541); the surface rises, touchdown with a small dip (581), the arm scoops (597), the capsule (the dot) flies off to the upper right (629). | Source: JAXA |
| 646 to 881 | No mission has ever brought back a sample from Mars or its moons. Why bother? Because nobody knows where these moons came from. | The camera keeps following the capsule: Mars (PIA00407) arrives from the upper right, settles, pulls back on "Mars" (725); the chip cuts in (729), echo ring 753; two dots leave Mars and open into lenses with Phobos and Deimos (740 to 764). Cat, skeptical, 788 to 843. Lenses punch on "these" and "moons". | NASA/JPL/USGS, then NASA/JPL/USGS, NASA/JPL-Caltech/University of Arizona |
| 882 to 974 | That sample could finally tell us. | The Phobos lens opens past the frame into the close-up (PIA10368); a ring marks a sample spot (895), punch-in on "finally" (921), echo pulse on "tell" (939). | NASA/JPL-Caltech/University of Arizona |
| 975 to 1116 | Liftoff is Monday, on Japan's H3 rocket. Follow, and we will show you the launch. | Hard cut on "Liftoff" to the NEXT card: kicker NEXT ON LAUNCH DAY, "MMX LIFTS OFF", date MON 19 OCT (993), "H3 ROCKET · TANEGASHIMA" (1028), H3 line art on the pad; cat points at the date from 1003 to the end; pointer box "Follow for the launch" (1057) just above the wordmark; the H3 lifts off on "we" (1076); wordmark dot 1088, echo ring 1108. The last frame is the finished wordmark. | Source: Launch Library 2 |

## The owner's v1 notes

1. Slideshow feel. One actor carries the whole Short: Phobos becomes the orbit dot, the dot crashes, rewinds and shatters, a new dot leaves the H3 fairing and lands on Phobos as "a piece", becomes the MMX capsule, flies home and leads the camera to Mars, splits into the two moons, and the Phobos lens opens into the close-up. Motion direction carries across every transition (the diagram leaves up as the rocket rises up; the camera tilts up from the rocket to Phobos; the capsule flies to the upper right and Mars arrives from the upper right). Transitions overlap their neighbours by 6 to 16 frames. Every photo has 2 or 3 soft-masked parallax layers on a 3 to 7% push. Fast moves get true motion blur (each frame averages up to 16 sub-frame renders over a 180 degree shutter, chosen from the measured screen velocity); giant type exits with a directional SVG blur. Numbers count up or morph; giant type leaves fast (8 to 12 frames, exit curve) and arrives slow (slam, enter curve, spring). Only one hard cut remains, on the word "Liftoff".
2. Progress tick bar: removed.
3. "DIAGRAM · NOT TO SCALE": removed. On line-art beats the credit slot names the source of the facts (Source: NASA, Source: Launch Library 2, Source: JAXA). Photos keep their own credit.
4. NEXT card pointer: now sits directly above the wordmark (box at y 952, wordmark at y 1064), with open space between the data line and the pointer for the cat. See deviation 5 about its text.
5. Small details: no datelines, no tiny labels. The remaining mono lines are 28 px and stay on screen at least 1.5 s ("1.8 M · EVERY 100 YEARS", "MILLION YEARS", "19 OCT", "PHOBOS", "DEIMOS", "H3 ROCKET · TANEGASHIMA").

## QA rounds

Round 1 (stills 0, 30, 91, 117, 124, 128, 151, 175, 214, 250, 300, 316, 345, 370, 395, 418, 430, 460, 476, 491, 512, 521, 526, 545, 575, 600, 615, 636, 648, 662, 690, 735, 748, 765, 795, 830, 860, 886, 890, 905, 930, 975, 1000, 1040, 1065, 1084, 1095, 1116):
1. 30 to 117: the Stickney parallax layer sat on the limb and pushed a bump out past Phobos's edge. The Mars polar-cap layer had the same risk. All parallax masks now sit inside the body.
2. 0 to 60: hook top-heavy, cat too small. Phobos moved up and right (centre 620, 600 to 644), cat moved to the lower left at 0.5 scale, so it never touches the moon.
3. 418: the rocket was still drawing itself while it rose in (a stray vertical line). It now arrives fully drawn.
4. 430: the H3 fairing tip ran into "MON". Rocket lowered and moved right.
5. 521 to 530: the MMX drawing showed on top of the Phobos photo outside the iris. The photo outside the iris is now drawn over the drawing.
6. 575 to 650: spacecraft too small for the frame. Scale 1.05 to 1.3.
7. 735: Mars's polar cap crowded the chip. Mars now settles lower.
8. 795: the DEIMOS label overlapped Mars's limb, and the Phobos lens sat where the cat peeks. Lenses moved (Phobos upper left, Deimos lower right); labels left-aligned to their lens.
9. 886: the lens photo lagged behind the opening ring. The photo now scales with the ring.
10. 1000 to 1116: the cat pointed at empty space. It now points up-left at the date.

Round 2 (stills 0, 20, 40, 60, 117, 124, 128, 151, 300, 316, 418, 430, 476, 491, 521, 524, 527, 530, 545, 575, 615, 648, 662, 700, 735, 760, 790, 800, 830, 886, 890, 905, 1000, 1040, 1065, 1084, 1095, 1116):
11. 524 to 530: at the edge of the opening iris, motion-blur sub-frames let the spacecraft outline show over the photo. The drawing now starts 5 frames later and the iris uses the move curve.
12. 790: while the cat rose, its ears showed over the caption words (the clip allowed the paw overhang at every moment). The clip now ends 18 px under the box top, inside the box padding, so only the paws can touch the box and never the words.
13. 1040 to 1116: the excited expression's spark lines touched "OCT", and the head crowded the date row. Sparks off on the NEXT card, cat moved down and right.

Round 3 (stills 20, 524, 527, 530, 533, 790, 795, 1040, 1116):
14. 1040: the cat's tail grazed the rocket. Rocket moved 28 px right. No other notes.

## Checks

- Caption sync: `tools/check_sync.mjs` steps the real caption renderer through all 1117 frames and compares the first frame each word is on screen with its spoken start in `words.json`. 105 words, largest difference 0.5 frames, none outside 2 frames. Two words were missing from the transcript ("That sample", spoken in the 29.41 to 30.43 s gap) and were interpolated by `align_captions.mjs`; they appear at frames 882 and 895.
- Caption words come from the script: "H3" (the transcript says "H-3"), "fifty" (transcript "50"), "Slowly." as its own sentence, "Follow," with its comma.
- Loudness: -14.35 LUFS integrated, true peak -1.44 dBTP after AAC encoding (target -14, -1.5). A gentle peak limiter runs before the linear two-pass loudnorm; without it loudnorm stopped at -15.2 LUFS because of the true-peak ceiling.
- Frames: `out/short_v2.mp4` has all 1117 frames; the narration is padded to the video length instead of `-shortest` cutting the last frame (the finished wordmark).
- `anim.html` was rebuilt after the full render only to add a debug hook (`SD.captionsAt`) and a transcript index in `captions.json` for the sync check. No visual change.
- Mascot rig used: `lab/mascot/v2/rig` core.mjs 1be0cd4801, catA.mjs 81758aa6af (md5 prefixes, printed by `build.mjs`).

## Deviations from the design system (owner notes and the lead's update take precedence)

1. No 120 BPM grid. Cuts and hits land on the narration's own words (motivated by the voice), which is what keeps captions, numbers and the cat in sync with a different voice.
2. Motion.md bans blur and anything but hard cuts. The owner asked for flow, overlaps and motion blur, so this Short uses continuous camera moves, iris transitions and motion blur, and keeps one hard cut ("Liftoff").
3. Frame 0 has no giant number. The v3 hook is a sentence ("Mars has a moon that is falling"); the first giant number lands at frame 151 ("6 FT").
4. Chip echo ring lands 24 frames after the chip, not after the real delay. Mars's one-way light time on Oct. 19, 2026 is 12.71 to 12.77 min (JPL Horizons, target 499, centre 500@399, rechecked 2026-10-15), which cannot be waited out in a Short.
5. NEXT card pointer text: "Follow for the launch" (the lead's "Follow" intent) replaces "This week in space · Sunday" on this Short. It is one string in `src/anim.template.html` (`#nPoint`) if the owner wants the weekly pointer back, or both.
6. NEXT card wordmark at y 1064, not y 1404: the narration runs to the last second, so the captions keep the y 1196 to 1440 zone until the end.
7. The design system docs (README.md, Credit, Diagram, NextCard, ProgressTicks, tokens.json) still describe the tick bar and "DIAGRAM · NOT TO SCALE". They need updating if v2 is approved.

## Unresolved and follow-ups

- The MMX spacecraft and the H3-24 are simplified flat drawings from general knowledge (bus, two wings, legs, dish, capsule; core, fairing, four SRB-3 boosters, two LE-9 bells). They were not checked against JAXA drawings. JAXA's image terms were not confirmed, so no JAXA image is used.
- The ring that marks "a piece" (frame 491) and the sample spot (895) are arbitrary spots, not MMX's landing site, which this Short does not name.
- The orbit, the spiral and the ring are schematic (no scale label any more, per note 3). The "6 FT" number sits above the diagram and is the sourced fact; the drawing does not claim a scale.
- The narrator says "H-3" (letter by letter); the caption shows "H3".
- Not yet checked under the real YouTube Shorts overlay (title, buttons). Text stays inside x 80 to 900, y 246 to 1490; the H3 on the NEXT card reaches x 932 at y 560 to 1030, in the right-hand button column's upper edge.
- The cat appears three times (1.8 s, 1.8 s, and the last 3.8 s). Whether it helps is for the A/B test in the research notes.
- If the parallel mascot rig changes, rebuild and re-render (the hashes above identify the version in this render).
- `out/frames/` (532 MB) and `out/stills/` (47 MB) are git-ignored intermediates and can be deleted.
- `lab/assets/nasa/PIA10244.jpg` (Earth and Moon from Mars) was downloaded for the v2 script's "fly it back to Earth" beat and is not used in the v3 cut; `img/earth.webp` was removed from the build.
