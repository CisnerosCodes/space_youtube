# kinetic: the MMX heist as kinetic typography (60 fps)

Entry "kinetic" in the ultra experiment, built Oct 20, 2026. Same story, voice, captions and facts as the other six entries. The type is the captions. The only character is Night Shift's eyes (the echo mark) watching the words from the dark.

**Deliverables**

| File | What it is |
|---|---|
| `out/final.mp4` | The Short: 1080 x 1920, 60 fps, 42.2 s, H.264 plus AAC 48 kHz, 20 MB |
| `out/video.mp4` | The silent render |
| `out/mix.m4a`, `out/mix.report.json` | The mix: -13.9 LUFS, -2.1 dBTP, bed 18.0 LU under the voice while talking, no warnings |
| `out/contact_full.png` | One labelled frame per second of `final.mp4` |
| `cues.json` | 20 sound cues (60 fps frames), including `wordmark_echo` at frame 2427 (40.45 s) |
| `page.html` | The render page. It is built from `src/` by `node build.mjs`, which inlines `captions.json` so the caption text cannot drift from the kit |
| `qa/caption_sync.json` | Per-word caption check (see QA) |
| `qa/*.png` | Still sheets from the three QA rounds |

Bed: `bedI_darkpulse` (cold sub pulse and ticking hats; it suits eyes in the dark and the heist).

## The idea

A Swiss, editorial poster that typesets itself as the narrator speaks, on a near-black ground with a faint 6-column grid, registration crosses and one accent colour. Every phrase is a typographic event, and each event is built from the meaning of its words:

- **Eyes as type.** At frame 0 two glowing eyes are half open in the dark and snap open. At "moon", an echo of the ring eye expands into a circular lens on the real HiRISE Phobos. On "lookout." the word lands whole, then the eyes drop into its two o's and scan left and right. At the end the eyes fly in and become the echo mark of the wordmark.
- **"slow-motion"** widens in slow motion: the variable-font width axis runs from 62 to 125 (with weight and tracking) over the length of the word.
- **"collision / course"** converge from opposite sides and crash into each other: tight leading, a squash and a shake, a flash line. A dashed trajectory reads "1.8 m (6 ft) closer to Mars every 100 years". Phobos sits at the top, the real Mars rises from the bottom, and the words fall between them.
- **The period of "Mars."** grows into a full amber field. "Japan just launched" is two-tone (ink inside the field, paper outside). The field then collapses into the H3's flame, and the line of type follows the rocket up and out.
- **"heist"** is found by a spotlight cast from the squinting eyes.
- **"a piece of it."**: a jagged piece is masked out of the real Phobos photo (a mask, nothing painted in) and lifted out. That same piece is the loot later on.
- **Step numerals** (1, 2, 3, 4) arrive as giant outlines. Each one fills solid amber and punches on its number word ("one:", "two:", ...), and the eyes squint at the flash.
- **"drop"** falls into place out of a mask and bounces. The rover illustration drops on a dashed 40 m line.
- **"15"** goes from Black (900) to Hairline (130) while it floats up, and the letters of "grams." drift apart in zero g: weightless type. "25" just before it is the heaviest weight.
- **"grab."** clenches: its width snaps from 125 to 66.
- **"nitrogen blaster."** gets a gust: the letters are shoved out of line, then settle.
- **"Target:"**: echo rings lock onto the zero of "10". A to-scale bar chart compares Hayabusa2's 0.1 g aim and 5.4 g haul with MMX's target of at least 10 g.
- **"burn"** heats from amber to paper over flame tongues. Mars shrinks away behind the craft.
- **"2031."**: the camera zooms through the counter of its zero. The giant amber 0 frames the loot, spot-lit, for "The loot?".
- **"home."**: the piece flies into a real HiRISE photo of Earth seen from Mars and lands with a ping.
- **End card**: the caption "Downlink Cat." flips letter by letter into the uppercase wordmark DOWNLINK CAT, led by the eyes as the echo mark. The dot pulses on the sonic logo's note and the ring pulses 0.40 s later on its echo. Then one slow blink.

Transitions are kinetic, never cuts: an echo-ring morph, a period that becomes a field, an amber bar wipe, a vertical whip, a horizontal whip, a slide-up, a zoom through a letter counter, a whip to NEXT, and a lines-out exit.

## Techniques

- **Canvas 2D, a pure function of t.** `renderAt(t)` redraws everything from t alone: no timers, no Date, seeded PRNG (mulberry32) and seeded value noise. `window.__ready` waits for the fonts and images.
- **Continuous variable-font axes in canvas.** Canvas only takes width keywords, so the page registers the Archivo variable font 64 times, once per `stretch` value from 62% to 125%. Weight is continuous in the font string. Width and weight can then be animated per frame (slow-motion, grab, 15).
- **Real motion blur by temporal supersampling.** In listed windows (whips, slams, wipes) each frame is drawn 4 to 16 times across a 1 to 1.6 frame shutter, centred on t, and averaged. This gives true blur on type, photos and illustrations alike.
- **Images inside letterforms.** Text is drawn into a scratch canvas, then the photo is composited `source-in`: Mars in "Mars,", Phobos in "Phobos," (twice). Photos with black skies use the `lighten` blend, so space melts into the ground with no box edges.
- **Spring and track system.** Keyed tracks with easing, analytic damped-spring step responses for overshoot (stack reflow, saccades), letter-level layout using prefix widths, so kerning survives letter animation.
- **The eyes rig** (`drawEyes`): echo-mark geometry from the mascot rig (disc left, ring right, ring stroke 6/22 R, centres 60/22 R apart). It has a tall pupil on the disc, top lids in the ground colour with a drawn lid line, happy lower lids, a light pool and shadow glow, ink colouring on the amber field, and squash and stretch from speed. Moves follow hop arcs, the eyes flinch at every slam, and blinks are scheduled. Gaze is a fast spring between the newest caption word's registered box and the previous one, so the eyes dart to each word as it is spoken. Manual looks cover the rocket, the piece, the rover, the floating "15" and the counting of the three satellites.
- **Zone-safe slams.** A slam's scale is capped so a caption never leaves x 80 to 900, y 260 to 1500. When the cap bites, the slam lands vertically instead.
- **Illustrations** (`src/illus.js`): the H3, the MMX cruise and lander forms (coring arm, gas sampler on a leg), IDEFIX as a crate-like machine with wheels, the capsule with its heat shield, and the satellites. All are flat line art with amber 4 px strokes, ink fills and hatch shading, plainly drawings. Whenever one is on screen, the credit slot reads "Illustration · facts: JAXA / DLR / NASA / Launch Library 2".
- **Credits** are collected per frame from whatever is actually drawn, so a credit shows exactly while its asset does.

## Truth

Every on-screen fact comes from `kit/facts.md`, worded as there:

- PHOBOS · 27 x 22 x 18 km
- 1.8 m (6 ft) closer to Mars every 100 years
- H3 F10 · LAUNCH 04:41:03 JST, OCT 20, 2026
- EACH WAY: JUST UNDER ONE YEAR
- DROPPED FROM ABOUT 40 m, IN FREE FALL (DLR)
- ABOUT THE SIZE OF A CRATE OF DRINKS (DLR)
- 25 kg ROVER · THE EQUIVALENT OF 15 g ON PHOBOS (ESA)
- CORER DIGS TO 2 cm
- GAS SAMPLER: 'A FRACTION OF A SECOND'
- the Hayabusa2 bars (credited "Chart · facts: JAXA")
- CAPSULE: ABOUT 60 cm ACROSS, WITH A HEAT SHIELD
- ROCKET LAB ELECTRON · 3 x HAWKEYE 360
- WED 21 OCT

There is no sampling year, no health claim and no impact shown. Real images are `phobos_color_hirise_6800km_PIA10368.jpg`, `mars_global_color_viking_PIA00407.jpg` and `earth_moon_from_mars_hirise_PIA10244.png` (cropped and resized copies in `assets/`), each with its exact credit while on screen. No AI imagery and no agency logos.

## QA (three rounds)

- **Captions:** `tools/qa_words.mjs` renders each of the 89 words at its first 60 fps frame (`ceil(start*60)`), 3 frames earlier, when settled, and at +0.4 s. All 89 words are drawn on their first frame, none appear early, all settled boxes sit inside x 80 to 900 and y 260 to 1500, and all are still up at +0.4 s (`qa/caption_sync.json`: 89 words, 0 failures). "Downlink Cat." stays on one line.
- **Round 1:** stills of every spread. Found 10 words over the right edge (fitted with `fitPx`), "is on a" leaving too soon, the eyes parked on words, the double-width "lookout.", a cut-off wordmark, cluttered callouts and labels under the credits. All fixed.
- **Round 2:** the first full render, checked at every line boundary from the kit table and at the big moments. Added the numeral hits, a brighter "heist", credit leaks from hidden scenes, the slam zone cap, lid lines, the end-card redesign, and frame 0 starting half open.
- **Round 3:** the final render. Removed a doubled rover at 14.6 s, masked "drop", sent the lander in on a diagonal clear of the text, moved the loot off the words, and re-routed the eyes off the text.
- **Sheets:** `qa/boundaries_sheet.png`, `qa/half_a.png`, `qa/half_b.png`, `qa/final_moments.png`, `out/contact_full.png`.

## Render time

- Final: 2532 frames (42.2 s at 60 fps) in 4 min 2 s with `--workers=2`, about 0.19 s per frame per worker including the supersampled windows.
- Mix: a few seconds.
- Build: `node build.mjs`; stills: `node tools/stills.mjs <dir> <t...>`.

## Honest weaknesses

- **The eyes perch more than they travel.** They hop between corners, look, blink, squint, flinch and widen, and twice they become type ("lookout.", the logo). For most of the piece, though, they are a reacting observer in a corner, not a performer, and they are small (R 30 to 40 px) outside the opening and the end.
- **Some spreads are poster build-ups.** "Capsule lands in Australia, 2031." and the NEXT card stack lines down the left column, with less kinetic invention than the hook, the launch or "15 grams".
- **Small type.** The mono chips, the chart labels and the credits are 22 to 26 px, small on a phone. The Hayabusa2 chart is on screen for only about 1.3 s.
- **Motion blur is windowed.** It runs only in listed windows; medium-speed moves elsewhere are drawn sharp at 60 fps.
- **Brief overlaps.** The falling rover grazes the word "a" around 12.25 s, and the lens passes behind "slow-motion" for a few frames at 1.07 s (softened with a text shadow).
- **"lookout." is a liberty.** The word lands whole and readable, but for its last 0.3 s its o's are the eyes. A strict reading of "verbatim" could object.
- **The tagline is not from facts.md.** The end card adds the line "ONE REAL SPACE STORY A DAY". It is the channel's own description from the design system README.
- **Plain illustrations.** The H3, the lander and the rover are simple and generic by design, with no engineering detail.
- **Unused assets.** The kit's Perseverance eclipse and transit videos are not used.
