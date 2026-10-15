# Pilot 1 (MMX, Launch Day): build log, QA and follow-ups

Short: "Mars has a moon that is falling" (MMX). Script `script.md`, narration `voice.mp3` (Gemini Puck, 35.76 s by ffprobe). Render: 1094 frames at 30 fps = 36.4667 s (1073 narration frames plus a 21-frame hold on the finished wordmark for the sonic logo). Mascot: v3 actor (`lab/mascot/v3`, core.mjs f439d0f328, catA.mjs 77cdcabfd8, actor.mjs 5521613974). Bed: bedE_arp.

## What changed against pilot 1 v2

1. **The cat moves through the Short.** Four appearances, on screen 621 of 1094 frames (56.8%), 13 different moves (pop up from behind the caption, gasp, shrug, zip out, drop on a tether, WHAT, hop, point, jet out, zero-g float in, skid in, thumbs up, nod), plus talking and idle. He travels between elements: from behind the caption box, onto the top of the Mars drawing, down to the caption as the diagram leaves, up and out after the dot, in from the left onto the caption, onto the NEXT card pointer box. His mouth follows the narration's word times whenever he is on screen (stressed words get a head bob), and the idle loops (breathing, blinks, ear flicks, tail) run on every frame, so he is never frozen. Fast moves are motion-blurred (sub-frame samples added with `plus-lighter` inside an isolated layer).
2. **The frame is filled.** The hook puts Phobos large at the upper right and the limb of Mars across the whole bottom of the frame (Mars and the moon that is falling toward it). The orbit diagram is about 30% larger. "MMX" stays on screen while the spacecraft lands and scoops. Mars stays large on the two-moons beat, with the cat in the lower left and the Deimos lens in the upper right. The NEXT card stacks headline, date, data line, the cat on the pointer box, the H3 at right and the wordmark.
3. **Everything inside x 80 to 900.** The H3 on the NEXT card now spans x 722 to 858 (pilot 1 v2 reached x 932). Line art and photos may bleed past the edges; no text, label or key drawing does.
4. **Retimed** to the new take: every beat is anchored on a spoken word in `captions.json` (see `src/anim.template.html`, "timing from the caption schedule").

## Beats

| Frames | Narration | Picture | Cat | Credit slot |
|---|---|---|---|---|
| 0 to 124 | Mars has a moon that is falling. Slowly. | Phobos (PIA10368) large, drifting down and turning, three-layer parallax, punch-in on "Slowly."; the north limb of Mars (PIA00407) fills the bottom of the frame. On "Phobos" the moon shrinks along a curve into the amber dot and Mars rises and shrinks into the line circle. | Pops up from behind the caption (0 to 52), gasps at Phobos on "falling" (40), shrugs on "Slowly" (77), zips out left as Phobos becomes the dot (104 to 118). | NASA/JPL/USGS, NASA/JPL-Caltech/University of Arizona |
| 125 to 386 | Phobos drops about six feet closer to Mars every hundred years. In fifty million years, it either crashes into Mars, or shatters into a ring. | Orbit diagram: "6 FT" slam (139) with "1.8 M · EVERY 100 YEARS", the orbit tightens into a dashed spiral, "50" counts up (245), the dot spirals into Mars (impact ring 317), rewinds on "or", shatters into 64 fragments that spread into a ring (332 to 372). On "And" the camera tilts down and the diagram leaves upward. | Drops onto the top of the Mars drawing on a tether (229 to 272), talks, looks at the dot, gasps at the impact (317), WHAT on "shatters" (334), hops down to the caption as the diagram leaves (366 to 392). | Source: NASA |
| 371 to 488 | And on Monday, Japan launches a mission to go grab a piece of it. | The H3 on its pad rises in at the right, "MON" slam (393) with "19 OCT"; on "go" the dot leaves the fairing, the camera tilts up and Phobos (PIA10369) fills the frame; a ring marks a piece (463). | Points at the rocket on "Japan launches" (406), jets up and out after the dot (436 to 473). | Source: Launch Library 2, then the photo credit |
| 486 to 625 | It is called MMX. Land on Phobos, scoop up a sample, fly it home. | Iris from the ring into the MMX line drawing; "MMX" slam (503) held through the landing; the surface rises with craters, touchdown (548), the arm scoops (560), the capsule (the dot) flies to the upper right (598). | Off. | Source: JAXA |
| 628 to 853 | No mission has ever brought back a sample from Mars or its moons. Why bother? Because nobody knows where these moons came from. | The camera follows the capsule; Mars (PIA00407) arrives large from the upper right, pulls back on "Mars" (703); the chip cuts in (707), echo ring 731; two dots leave Mars and open into the Phobos and Deimos lenses (711 to 737); lenses punch on "these" and "moons". | Floats in zero-g from the left onto the caption (715 to 761), WHAT on "Why bother?" (758), shrug on "nobody knows" (789), points at the Phobos lens on "these moons" (814), zips out left as the lens opens (845 to 860). | NASA/JPL/USGS, then both credits |
| 854 to 926 | That sample could finally tell us. | The Phobos lens opens past the frame into the close-up (PIA10368); a ring marks a sample spot (867), punch-in on "finally" (882), echo pulse on "tell" (897). | Off. | NASA/JPL-Caltech/University of Arizona |
| 927 to 1093 | Liftoff is Monday, on Japan's H3 rocket. Follow, and we will show you the launch. | Hard cut on "Liftoff" to the NEXT card: NEXT ON LAUNCH DAY, "MMX LIFTS OFF", "MON 19 OCT" (948), "H3 ROCKET · TANEGASHIMA" (976), pointer "Follow for the launch" (960), the H3 lifts off on "we" (1026), wordmark dot 1038, echo ring 1050. Frames 1073 to 1093 hold the finished card. | Skids in onto the pointer box (960 to 1003), points at the rocket on "H3 rocket" (986), thumbs up on "Follow" (1010), watches the launch (1027), nods on "launch" (1050), idles to the end. | Source: Launch Library 2 |

## QA rounds

Round 1 (stills 0, 20, 40, 60, 90, 113, 118, 125, 150, 200, 240, 280, 300, 320, 345, 365, 380, 395, 420, 440, 455, 470, 500, 540, 575, 600, 620, 640, 680, 720, 750, 770, 800, 830, 855, 870, 900, 930, 960, 990, 1020, 1040, 1060, 1093; sheets in `out/qa/r1`):
1. 280 to 365: standing on the Mars drawing, the cat's ear and his WHAT arm touched the "0" of "50". Mars moved 43 px right (centre x 618), orbit narrowed to rx 290 so it still ends near x 900.
2. 540 to 620: the top half was empty once "MMX" left on "Land". "MMX" now stays until "fly" and leaves upward with the capsule.
3. 640: the MMX drawing leaving at 80 px per frame turned into hatching under 16 blur samples. The camera move is 12 frames instead of 16 and the drawing is dropped one frame after it leaves the frame.
4. 1060 to 1093: the launch's dashed climb line crossed the "F" of "MMX LIFTS OFF", and the pad line sat on top of "DELAY" in the wordmark. Rocket moved to x 790, pad shortened; see round 2 for the final position.
5. 680: a dark shape at the right edge turned out to be the next cell (720, the cat floating in), not a stray render. No change.

Round 2 (stills 10, 30, 45, 75, 100, 113, 240, 262, 300, 320, 340, 366, 380, 392, 420, 440, 450, 540, 580, 600, 640, 645, 720, 735, 760, 790, 825, 855, 975, 985, 1000, 1015, 1030, 1056, 1075, 1093; crops of the cat at 45, 75, 300, 420, 790, 1000 for the mouth and faces):
6. 1056: the excited bounce lifted the cat's sparks into the "H3 ROCKET · TANEGASHIMA" line. Replaced with a nod.
7. 1056: the pad line still touched the wordmark top. Rocket raised to y 1000 (pad line at y 1025, 39 px above the wordmark); the climb line now stops at y 600, under the NEXT card text.

Round 3 (stills 113, 114, 855, 1000, 1040, 1056, 1070; crops of both zip exits; then the full contact sheet and motion proof): 8. 117 to 130: the credit slot switched to "Source: NASA" while the Mars photo was still shrinking into the circle; it now keeps both photo credits until frame 131. The three remaining lint hits (frames 113, 114 and 855) are the bounding box of the zip exit's anticipation crouch reaching 14 to 27 px into the caption box's top padding; the crops show the feet on the box top and nothing over the words.

## Checks

- Caption sync (`out/caption_sync.json`): 105 words, largest difference 0.5 frames, none outside 2 frames. One word interpolated: "H3" (the transcript split it into "H" and "-3"); it is placed in its real 32.53 to 32.99 s gap and shows at frame 976. No gap over 1 s with missing script words, so no re-transcription was needed.
- Cat lint (`out/cat_lint.json`): `Actor.lint` against the caption line boxes of the chunk on screen and the photo subjects (Phobos core in the hook, Mars core and the Phobos lens with its label on the two-moons beat), tolerance 10 px, plus the safe zone x 40 to 940, y 200 to 1500. 3 hits, all the zip-crouch bounding box described in round 3. Frames where he is hidden behind the caption box (the pop entrance) or outside the frame are not counted. Never mirrored: the v3 rig has no flip.
- Cues (`out/cues.json`): 16 curated cues in the mixer's format.
- Mix (`out/mix.report.json`): `lab/sound/mix.py --bed-under 18`, bed bedE_arp. -14.0 LUFS integrated, true peak -2.1 dBTP (ffmpeg remeasure of `out/final.mp4`: -14.02 LUFS, -2.12 dBTP). Voice 18.0 LU over the bed while talking. The sonic logo starts at 34.62 s and ends at 36.07 s, inside the 36.47 s video (the 21-frame hold is rendered, so no `tpad`). No mixer warnings. `out/final.mp4`: 1094 video frames, AAC audio.
- Render: one full render with `render.mjs`; after it, a credit fix (frames 117 to 130, the hook credit now stays until the Mars photo has faded) was re-rendered with `render.mjs frames=105..140`, which changed only those 14 frames (the other 22 were byte-identical), copied into `out/frames` and re-encoded with render.mjs's own ffmpeg settings. `out/frames/` was deleted after encoding.

## Deviations from the design system (owner notes and the brief take precedence)

1. No 120 BPM grid for cuts: beats land on the narration's words, as in v2.
2. Continuous camera moves, irises and motion blur instead of hard cuts only (owner request); one hard cut, on "Liftoff".
3. Frame 0 has no giant number: the hook is a sentence. The first giant number is "6 FT" at frame 139.
4. Chip echo ring lands 24 frames after the chip, not the real 12 min 43 s.
5. NEXT card: date at y 446 and wordmark at y 1064 (not y 698 and y 1404), because the narration runs to the last second and the captions keep the y 1196 to 1440 zone; the pointer reads "Follow for the launch".
6. The wordmark echo ring lands 12 frames after the dot (Motion.md), with the sonic logo's echo; v2 used 20.
7. The hook shows two photos at once (Phobos above, the limb of Mars below) on ink, so the credit slot carries both credits.

## Unresolved and follow-ups

- The MMX spacecraft and the H3-24 are simplified flat drawings from general knowledge, not checked against JAXA drawings (JAXA image terms not confirmed, so no JAXA image is used).
- The ring that marks "a piece" (frame 463) and the sample spot (867) are arbitrary spots, not MMX's landing site.
- The orbit, the spiral and the ring are schematic; the drawing does not claim a scale.
- The narrator says "H-3"; the caption shows "H3".
- Not checked under the real YouTube Shorts overlay. Text stays inside x 80 to 900, y 246 to 1490.
- Cat motion blur uses `mix-blend-mode: plus-lighter`; a test showed blurred areas about 5% brighter than an exact average (8-bit compositing). It is only on fast moves and reads as blur.
- The cat appears in the first second (pop-up behind the caption): this Short is the "cat in the first 2 seconds" arm of the research A/B idea.
- `out/qa/` holds the QA stills and sheets (about 50 MB); delete before committing if not wanted.
