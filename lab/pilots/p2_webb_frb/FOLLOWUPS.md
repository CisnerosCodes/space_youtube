# Pilot 2: JUST DISCOVERED, Webb and the farthest fast radio burst

Script `script.md`, voice `voice.mp3` (Gemini Puck, 30.288 s), timing `voice.words.json`. Render: 947 frames at 30 fps (31.567 s): the narration rounded up to 909 frames plus a 38-frame hold in which the wordmark dot and ring land with the sonic logo and the logo rings out. The hold is rendered live (the cat keeps breathing and waving), not a frozen `tpad`.

## Files

| File | What it is |
|---|---|
| `src/anim.template.html` | The animation source. Edit this, then `node build.mjs`. |
| `build.mjs` | Inlines `captions.json`, `img/field.webp` and the v3 mascot (`lab/mascot/v3/build/bundle.mjs`) into `anim.html`. |
| `align_captions.mjs` | Copied from `lab/design/v2`; adds one mapping (the transcript token ",000" = "thousand"). |
| `img/field.webp` | The NASA/STScI NIRCam image, full size, WebP quality 90, not cropped or altered. Originals and credits: `lab/assets/webb/` (`credits.txt`). |
| `tools/` | `inspect.mjs`, `check_sync.mjs`, `export_cues.mjs`, `sheet.py` (from v2) and `lint_cat.mjs` (new: runs `SD.lintCat()` in the page). |
| `out/final.mp4` | The finished Short (picture, narration, bed, cues, sonic logo). `out/video.mp4` is the silent render. |
| `out/contact_full.png`, `out/motion_proof.png` | Every 30th frame plus the last; four mid-motion frames (168, 413, 505, 548). |
| `out/cues.json`, `out/cues_mix.json` | The curated cue list (16 cues) with notes; the plain list fed to `mix.py`. |
| `out/caption_sync.json`, `out/cat_lint.json`, `out/mix.report.json` | The checks below. |
| `out/qa/` | QA sheets r1 to r5 (frame numbers on each tile). |

## Beats (frames come from the word timings)

| Frames | Narration | Picture | Credit slot |
|---|---|---|---|
| 0 to 79 | A flash lasting one thousandth of a second | Frame 0: the burst as an amber dot with radio pulse rings, above a line labelled 1 SECOND. On "flash" a hairline spike rises from the line (one thousandth of the line is 0.8 px; it is drawn at the 4 px minimum stroke). "1/1000" slams on "thousandth" with OF A SECOND. Cat floats in onto the line (10), points at the spike (44), zips up after it (72). | Source: NASA |
| 80 to 167 | left when the universe was only three billion years old. | The line drops away, the dot recedes to the far source; the chip cuts in (84) and its echo ring lands one beat later (99). A dashed line runs down to EARTH; the pulse wavefront travels down it, widening as it nears, and lands with a ring (156). "3" counts up on "three" with BILLION YEARS AFTER THE BIG BANG (NASA wording). | Source: NASA, Live Science |
| 168 to 398 | Astronomers just confirmed the farthest fast radio burst ever seen. Nobody knows what makes these bursts. So what was out there? | An iris opens from the source dot onto the Webb field, the dot landing on the white cross and opening into a ring around the cross and the galaxy. Label FRB 20240304B (227 to 302). Slow push with parallax (the bright foreground stars are soft-masked near layers), a drift left across the field on "Nobody knows", a push back in on "So what was out there?". Cat skids in (299), shrugs (318), WHAT (364). | Image: NASA, ESA, CSA, STScI, Themiya Nanayakkara (USYD); / Image Processing: Joseph DePasquale (STScI) |
| 399 to 488 | Ground telescopes saw nothing at that spot. | The photo closes into the ring and the inside empties onto ink: an empty ring (NO GALAXY SEEN) and an observatory dome whose telescope looks at it along a dashed line. Cat hops onto the dome (405), gasps on "nothing" (439), points at the spot (474). | Source: NASA (the Webb credit stays until the photo has gone, frame 414) |
| 489 to 539 | Webb found a galaxy. | On "Webb" the ring fills with the Webb image and the camera zooms through the field into the inset, to the white cross (motion-blurred). On "galaxy" a ring marks the cross and the host galaxy. Cat zips off left (493). | Webb credit |
| 540 to 649 | A dwarf, one thousand times less massive than expected. | The photo leaves upward; the ring stays and shrinks into a small lumpy outline (THIS ONE); a big spiral outline draws in (MOST FRB GALAXIES). "1,000x" counts up on "one". The big outline leaves left before the sign. Cat pops up from behind the caption box (595) and holds up "1,000x / LIGHTER" (630). | Source: NASA |
| 650 to 767 | That makes a neutron star merger very unlikely, the team says. | The camera dives into the dwarf outline: two neutron stars spiral in (NEUTRON STAR MERGER). On "unlikely" the drawing turns muted and dashed and the label adds VERY UNLIKELY. Cat listens (699), nods (734), zips up (748). | Source: NASA |
| 768 to 946 | MeerKAT may find several more every year. Follow Signal Delay for the next one. | Hard cut on "MeerKAT" to the NEXT card: NEXT ON JUST DISCOVERED, "More distant bursts are coming", "MeerKAT: several a year" (no date), a radio dish drawing that catches three bursts. Cat skids in (830) and stands on the pointer box, which appears on "Follow" (846); thumbs up (848), points at the dish (877), waves (902). SIGNAL appears on "Signal" (858), DELAY on "Delay" (867); the echo-mark dot lands at 898 with the sonic logo and the ring at 910 with its echo. The last frame is the finished wordmark. | Source: NASA |

## QA rounds (stills read at every beat boundary and cat move)

Round 1 (49 stills, 0 to 946):
1. 0 to 30: the hook was a dot and rings in an empty frame. The one-second line is now on frame 0 and the spike fires on "flash".
2. 99 to 168: the data line under "3" never showed (an undefined anchor, `F.billion`). Fixed. The journey was a ring that left the frame; it is now a wavefront travelling down a dashed line to a labelled Earth.
3. 525 to 540: the inset's bottom border showed at y 1590 on the zoomed shot. Zoom end changed to scale 2.15 with the cross at (550, 505), so the inset fills the frame.
4. 600 to 620: during the pop, the cat's body showed below the first caption line, over "times" and "massive". The pop now clips behind the whole caption block.
5. 768: the cat's tether exit carried across the hard cut onto the NEXT card. The exit now finishes before "MeerKAT".
6. 770 to 800: the dish rose in with a heavy blur and read as a stray arc; it now draws in place. The dish was too small and unclear; redrawn as a parabola with feed, neck and pedestal.

Round 2 (42 stills):
7. 330 to 360: the drift pushed the ring past x 900. Drift reduced (cross to x 800).
8. 530: the galaxy ring cut through the bright part of the galaxy. The ring now encloses both the cross and the galaxy (image point 3478, 1850, radius 196 px), the same ring as on the wide shot.
9. 560 to 632: the bottom of the frame was empty. The big outline is larger and lower.
10. 758: the cat's exit to the left crossed the caption words. Exits now go up.

Round 3 (r3, r4, r5, 66 stills):
11. 418: the hop to the dome passed through the empty ring. The dome moved to the left, the ring to the right (640, 600), so the hop is a short climb and never crosses the ring.
12. 433: the landing squash reached x 912 (lint). Landing spot moved 24 px left.
13. Cat share was 67%; entrances and exits tightened to 59.5%.
14. After the full render: 164 to 167, 407 to 414, 489 to 492 and 548 to 553 showed part of the Webb image (inside an iris, fading, or leaving) under "Source: NASA". The image credit now stays on every frame where any of the image shows. Those 44 frames were re-rendered and the video re-encoded.

## Checks

- Caption sync (`tools/check_sync.mjs`): 84 words, largest difference 0.5 frames, none outside 2 frames. "MeerKAT" (transcribed as "Miracat") was interpolated inside a 0.62 s gap; shown at frame 768, spoken at about 770. No gap over 1 s had missing words, so no re-transcription was needed. "one thousand" is timed from the transcript's "1" and ",000". Caption words come from the script, not the transcript.
- Cat lint (`tools/lint_cat.mjs`, `out/cat_lint.json`): 0 frames over caption words (line boxes minus padding), 0 frames over the photo subject (the ring around the cross and the galaxy), 0 frames outside x 80 to 900, y 200 to 1500 outside entrances and exits. On screen 563 of 947 frames (59.5%). 14 distinct moves: enter float, enter skid, enter pop, point, shrug, what, hop, gasp, sign, listen, nod, thumbs, wave, exit zip; he talks (mouth on the word timings) on every line he is on screen, and idles between moves. Never mirrored (the rig has no mirroring).
- Mix (`out/mix.report.json`): bed `bedD_tense`, `--bed-under 18`. Final file: -14.0 LUFS integrated, -2.0 dBTP true peak (target -14, at or below -1.5). Bed 18.0 LU under the voice while talking. bedD does not fight the voice: in the stems it sits 25 to 29 dB under the narration from 150 Hz to 8 kHz (it is almost all sub-bass), so bedA_pluck was not needed. 16 cues, no cue-spacing warnings.
- Frames: `out/final.mp4` has all 947 frames; the logo starts at 29.95 s and ends at 31.40 s, inside the 31.567 s video.
- `out/frames/`, `out/stills/` and `out/stems/` were deleted after encoding.

## Deviations from the design system

1. Chip echo ring lands 15 frames (one beat at 120 BPM) after the chip, not "about 24 frames": the lead asked for the ring "a few frames after the dot, with an obvious beat". The real delay (more than 10 billion years) cannot be waited out.
2. Chip value comes from Live Science ("more than 10 billion" years of travel); NASA's own wording ("just 3 billion years after the big bang") is the giant number's data line. The credit slot reads "Source: NASA, Live Science" while the chip is on line art; on the photo beat the slot holds the image credit.
3. Webb credit: two lines at 24 px (`Image: NASA, ESA, CSA, STScI, Themiya Nanayakkara (USYD);` / `Image Processing: Joseph DePasquale (STScI)`), text unaltered, the box grows upward from the fixed bottom edge y 1498, so it stays inside x 80 to 900 and y 1500. Its top sits 6 px under a two-line caption.
4. NEXT card has no date (none exists): "MeerKAT: several a year" sits in the date slot in amber, 44 px instead of 64 px so it fits. Wordmark at y 1064 (as pilot 1), not y 1404, because captions run to the end.
5. Motion blur and continuous transitions instead of hard cuts (the owner's request, as in v2). There is one hard cut, on "MeerKAT" to the NEXT card. Two cues use the mixer's `hard_cut` type only to get its short whoosh (the photo closing into the ring at 399 and leaving upward at 540); neither is a cut in the picture.
6. The hook has no photo: the burst is invisible, so frame 0 is line art (dot, pulse rings, the one-second line).
7. The cat's 'sign' says "1,000x / LIGHTER" (the lead's wording); the narration says "less massive". It is the same claim in plain words, and it repeats the giant number rather than adding a fact.

## Unresolved

- "More distant bursts are coming" (the lead's line) can be read as "even farther bursts". NASA says MeerKAT may find several FRBs per year at redshift greater than 1.0, which is closer than this one (2.148), and the research notes say not to imply more record breakers. Safer alternatives: "More far-off bursts are coming" or "Expect more bursts from far away". It is one string (`#nHead`) in `src/anim.template.html`.
- The radio dish on the NEXT card is a simplified dish, not a drawing of a MeerKAT antenna (MeerKAT dishes are offset Gregorian). The observatory dome and the neutron star pair are schematic too.
- The galaxy outlines compare a typical FRB host with this dwarf by drawn size; the 1,000 is a mass ratio and the outlines are not to scale (no "not to scale" label, per the owner's v1 note).
- The cat did not hold a radio dish (the rig has no dish prop, and a hand-attached prop was left out to keep the rig untouched). He rides no amber dot in this Short; the scooter is still unused here.
- The compass version of the image (Manisha Caleb credit) was downloaded and reviewed but not shown; its header text and compass would have competed with the kicker.
- The spectrum graphic was not used.
- `metadata.json` lists Live Science in Sources because the chip value comes from it; `script.md` lists only NASA, the paper and ESA/Webb.
- Not yet checked under the real YouTube Shorts overlay. Text and the cat stay inside x 80 to 900, y 246 to 1498; the field photo and the zoom extend to the frame edges by design.
- `anim.html` and `out/cues.json` were rebuilt after the full render only to move two cue frames (cat entrances) and to extend the credit coverage (the 44 re-rendered frames above); the rest of the render matches the current `anim.html`.
