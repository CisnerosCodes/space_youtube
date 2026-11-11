# Papercut: the Phobos heist as a layered paper diorama

Entry "papercut" for the ultra experiment (Oct 20, 2026). It is the same Short as the other six entries: the kit voice, the 89 caption words, the facts in `kit/facts.md` and the kit assets. The art direction is a multiplane paper-cutout diorama with a co-star, **Pho**, a grumpy potato-shaped Phobos whose mouth is the Stickney crater. Pho is the one being "robbed", so he reacts to every step of the plan. Night Shift is a stick puppet: the narrator in the hook, the heist planner who raises each STEP card, and the cat who holds up the loot jar.

This is the **polish round (round 2)**. The round-1 final is kept as `out/final.round1.mp4`; `out/final.mp4` is the new one. What changed, and which judge note each change answers, is in the next section.

## Adversarial final check (Oct 20, after round 2)

An independent pass looked for anything that would embarrass the channel. It instrumented a copy of the page (every caption slip and every piece of text recorded with its screen box on all 1263 frames), cut stills from `out/final.mp4` at every word start and at the big moments, and measured the audio and every frame. Found and fixed:

| Problem | Fix |
|---|---|
| The launch ticket clipped its own date: it read "Launch: 04:41:03 JST, Oct 20, 20" (the text ran 39 px past the paper, which clips its details). | The ticket is 680 px wide instead of 600; the whole line "Launch: 04:41:03 JST, Oct 20, 2026" shows. |
| The "?" of "loot?" sat on a short punctuation slip, so only its dot showed and the caption read "loot." | "?" now gets a full-height slip. |
| The calendar month (OCT, AUG) was 279 px wide on a 244 px page, so the A and the G were cut. | Month set at 90 px instead of 110 px. A script now checks every text against its paper outline: nothing is clipped. |
| The ticket said "H3 / F10"; `facts.md` words it "H3 flight No.10". | The stub reads "H3 / No.10". |
| Text outside x 80 to 900, y 260 to 1500 while at rest: the kicker (text top y 234, the whole Short), the either/or placard (to x 932 for 1.3 s), BONK! (to x 908), THUNK! (to x 921), the corer tag (to x 906), the end-card wordmark under the final push (D at x 65, C at x 61, K at x 904), the 15 g tag at the top of the hop (y 257), the drop tag (x 79). | Kicker at y 276 (text top 264; the design system's fixed y 246 puts kicker text above y 260), STEP corner card at y 352, calendar 30 px lower, placard x 720, BONK! x 760, THUNK! x 720, corer tag x 655, drop tag x 312, hop 85 instead of 95, wordmark at 100 px from x 123 (echo mark moved with it). Now only entrances and exits cross the edge (at most 6 frames, moving), plus a 2-frame slap overshoot of BONK! (x 909) and THUNK! (x 912). |
| The drawn Electron and satellites stayed on screen for about 0.3 s after the credit slot went empty at 38.72 s. | "Illustration · facts: Launch Library 2" now stays until 39.12 s, after they leave. |
| The photo credit was still mid-flip (squashed to 60 %) on the photo's first two frames. | The credit switches at 4.79 s, so it is fully up when the card appears (frame 150). |
| Launch second: two full-screen two-tone impact frames 0.56 s apart ("launched", "heist") put 45 % of the frame at 3 flashes and 13 % at 4 flashes within one second (per-pixel count, WCAG thresholds). Under the 25 % limit, but with little margin. | "launched" (not an emphasis word) now gets only the dark print, no amber inversion: 17 % of the frame at 3 flashes, 4.7 % at 4. |
| "on" (end of "This moon is on") showed at full size for 3 frames before its line sank. | Hook lines are now "This moon" / "is on a slow-motion" / "collision course" (the last one lands on the impact frame). |
| "AT LEAST" on the jar was 19 to 25 px on screen, smaller than the channel's 24 px credit size, for the hedge that matters. | 23 px font (23 to 30 px on screen); "10 g" raised 2 px so the g no longer touches the label edge. |

Checks on the new `out/final.mp4` (45.3 MB, 1263 frames, 42.1 s): all 89 caption words match `captions.json` (text and order), each first appears at most 0.5 frame after its spoken start, none early; caption glyphs stay inside x 105 to 851, y 1188 to 1417. Loudness -14.01 LUFS integrated, true peak -2.17 dBTP (ffmpeg loudnorm on the final). The sonic logo starts at 40.416 s and decays to silence by 41.8 s, before the file ends (42.09 s). No black or flat frame (lowest mean luma 32 of 255). The photo card is PIA10368 (mean difference 0.13 of 255 against the kit file) and its credit is on screen on every frame it shows. Still open, minor: "Lab" (spoken for 0.16 s) is at full size for 3 frames before "Next: Rocket Lab" sinks; for about 5 frames at 38.95 to 39.1 s the NEXT puppet and the end-card Night Shift are both on screen during the set change.

## Round 2: what changed

### Judge fixes

| Judge note | What I did |
|---|---|
| 10.5 to 25.5 s is one set for 15 s (Pho over the Mars limb, MMX on top) | The middle is now six set-ups. Step two keeps the medium shot (with Night Shift raising the card). On "15" the camera pushes onto the luggage tag, which grows with the push, so "ON PHOBOS (ESA) 15 g" is the biggest thing on screen with Pho's rolled eyes under it. Step three opens wide as MMX lands (THUNK!), then on "grab" an impact frame and a whip push into Pho's eye (extreme close-up, trembling pupil, sweat drop, the lander's legs above his brow). On "Coring" a **low-angle set** arrives as a theatre change: a ground row of Pho's head rises from below and a sky flat with Mars drops from above. MMX towers over the camera on its legs, the corer bites into the ground row (crumb mound, spraying grains), the rover watches from the left, and Pho's eyes peek up over the bottom edge, glaring at the corer, then wide on "nitrogen" as the gas puffs burst (FSSSH!). On "blaster" the ground row drops away and reveals Pho in medium shot, outraged, with a grawlix. "Target" is a new composition: Night Shift holds up the sample jar at the left and Pho glares at it from the right. |
| Night Shift only appears at 0 to 3 s and from 36 s | He is now the heist planner. On each "Step" he rises on his stick holding the STEP card on a dowel, then throws it up to the corner, where it lands with a slap and stays as the step counter. He holds the jar for "Target: at least 10 grams" (the lofted grains arc into it, the label slaps on "10"), ducks, and pops back up with STEP 4. Pho glares at him every time he appears. |
| NEXT opens on an empty paper sunrise before the card drops | The dusk flats now drop during the end of the loot scene, and the NEXT sign and the "ROCKET LAB ELECTRON / 3x HAWKEYE 360 / WED 21 OCT" tag both land on "Next:" (34.89 s). The Electron rises at the same time, and Night Shift follows 0.1 s later. |
| Ransom-note captions mix glyphs and are slow to read | Only one emphasis word per caption line is cut out letter by letter (collision, heist, steal, 2027, lookout, 25, 15, grab, nitrogen, 10, 2031, loot, First). Every letter of a word uses the same face (Archivo Black), in dark ink on light papers only (cream, amber, manila, newsprint, white), at a slightly bigger size than the plain slips. "course" and both "grams" are now plain slips. |
| Leftover glyphs slide in at the frame edge (19 s, 21 s, the "4" chip at 31 s) | The old caption chunk no longer slides off to the left. It sinks back into the stage in place (shrinking about its own slips) in the 2 frames before the next line starts, so nothing ever crosses x 80 and the first frame of every line shows only that line's first word. Every last word still gets at least 3 full frames before it sinks. The step card no longer slides off either: at the end of step four it flips shut in place. |
| "Follow Downlink / Cat." breaks rule 5 | A forced line break keeps "Downlink Cat." together on its own line, under "Follow". |
| The hook is missing the either/or | A placard on a stick rises at the lower right at 2.1 s: "IN 50 MILLION YEARS: [ ] crash into Mars / or / [ ] break up into a ring". The hanging tag reads "1.8 m (6 ft) closer to Mars every 100 years (NASA)". |
| "dropped from about 40 m, in free fall" should name DLR | It now reads "dropped from about 40 m, in free fall (DLR)". The other labels name their source too: "ROVER (DLR) 25 kg", "ON PHOBOS (ESA) 15 g", "corer digs to 2 cm (JAXA)". |
| The loot is a big rock, but the target is "at least 10 g" | The loot is now the same small vellum jar labelled "AT LEAST 10 g" that Night Shift held in step three. It rises out of the capsule into the spotlight. |
| The calendar riffles through NOV 2026 | Only the first page (OCT 2026) and the last page (AUG 2027) carry text. The pages riffled in between are blank, so no other month is ever shown. |
| At 5 s the frame is mostly empty sky during the tilt | The camera now follows the H3 up: the rocket stays in frame while a smoke column of paper puffs is left behind and four near clouds stream down past the lens, then the rocket punches out of the top on "heist" as the photo card drops in. |
| The end card is calm | The set thumps when the amber dot slams down on the sonic logo: the camera shakes, the hanging stars swing, Night Shift hops with both arms up, and Pho jumps with shock lines. On the ring (0.4 s later) Pho flinches again and gulps, then gives in with a tiny, reluctant wave while muttering. |
| Scale cheat (idea from cinematic3d) | The credit slot reads "Illustration, not to scale · facts: ..." whenever MMX, the rover or the capsule share the frame with Pho, Mars or Earth. |

### Ideas borrowed from the other entries

- **Impact frames (anime).** On the seven hardest hits (collision, launched, heist, grab, nitrogen, 2031, loot) the whole set flashes for one stop-motion step (2 frames) as a two-tone print: first amber paper with ink silhouettes, then the reverse. It is made from the rendered frame itself (grayscale, high contrast, then multiplied into amber paper and lightened into ink paper), so it always matches the shot. Captions, credits and the black mat stay normal.
- **Sound words (anime's lettered SFX).** BONK! (the rover lands on Pho), THUNK! (MMX lands) and FSSSH! (the nitrogen burst) are cut-paper bursts that slap on and are yanked away. They are sound effects, not captions.
- **The loot jar carried to the end (claymation).** One labelled jar carries the "at least 10 g" number from step three to the museum.
- **Progress pips (pixel).** Each STEP card has four pips: solid amber dots for the steps done so far and hollow amber rings for the steps to come, which is the echo mark doing the job of a progress meter.
- **Sources in the labels (anime, riso) and "not to scale" (cinematic3d).** See the table above.

## Deliverables

| File | What it is |
|---|---|
| `out/final.mp4` | The Short: 1080 x 1920, 30 fps, 42.1 s, H.264 CRF 19 + AAC 256 kb/s, 45.3 MB |
| `out/final.round1.mp4` | The round-1 final, kept for comparison |
| `out/video.mp4` | Silent master render from `render_fast.mjs` (CRF 16). The final mux uses a CRF 19 re-encode of it to stay under 60 MB. |
| `out/mix.m4a`, `out/mix.report.json`, `out/mix.log` | The mix (numbers in the Sound section) |
| `out/contact_full.png` | One frame per second, labelled (43 frames) |
| `cues.json` | 19 curated SFX cues, including `wordmark_echo` at frame 1212 |
| `papercut.html` | The self-contained page that is rendered. Fonts, the photo and the caption timings are inlined. No external requests, no timers, no `Date`, every random number from a seeded PRNG. `window.renderAt(t)` is a pure function of `t`, and `window.__ready` loads the fonts and the photo. `window.__capOnly(t)` is a QA hook that lays out the captions for `t` and returns their bounding box. |
| `src/*.js` | The source, concatenated by `build.mjs`: `00_core` (math, easing, keyframes, noise, matrices), `01_paper` (paper engine), `02_props` (every set piece), `03_pho` (Pho rig and acting), `04_cat` (Night Shift puppet and paw helpers), `05_ui` (captions, kicker, step cards, credit slot), `06_shots` (the film), `07_main` (credit schedule, impact frames, `renderAt`) |
| `build.mjs`, `shot.mjs`, `qa_sheet.py` | Build the page, render chosen frames to PNG, and tile stills into a sheet |
| `qa/round2/*.jpg`, `qa/round2_sheet.jpg` | Round-2 QA stills taken from `out/final.mp4` at every line boundary and the big moments |
| `qa/final/*.jpg`, `qa/r*_sheet.png`, `qa/strips/` | Round-1 QA material, kept |
| `fonts/` | Archivo (variable), IBM Plex Mono, Special Elite, Abril Fatface, Archivo Black, Bungee, Patrick Hand. All OFL or Apache, from the google/fonts repo. |
| `assets/phobos_card.jpg` | PIA10368 (HiRISE), scaled to 900 px for the printed photo card. Inlined into the page. |

Rebuild and render:

```sh
cd lab/ultra/papercut
node build.mjs
node ../render_fast.mjs papercut.html 42.1 30 out/video.mp4 --workers=2
ffmpeg -i out/video.mp4 -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -movflags +faststart -an out/video_web.mp4
python3 ../../sound/mix.py --voice ../kit/voice.mp3 --bed ../../sound/beds/bedH_caper.wav --cues cues.json \
  --out out/mix.m4a --video out/video_web.mp4 --mux out/final.mp4 --bed-under 18 --report out/mix.report.json
```

## The film, beat by beat (round 2)

| Time | Narration | What happens |
|---|---|---|
| 0.0 to 3.4 s | This moon is on a slow-motion collision course with Mars. | Frame 0 is a close-up of Pho grumbling, with replacement mouths swapping on twos. Night Shift rises on his stick and pokes Pho's cheek with a pointer, and Pho glares at him. On "collision" an impact frame hits, the camera pulls back, Mars rises, amber paper dashes draw the course, and Pho goes from alarmed to panicking. A tag drops in ("1.8 m (6 ft) closer to Mars every 100 years (NASA)") and the either/or placard rises at the lower right. |
| 3.25 to 5.1 s | Japan just launched | Theatre set change: a night-sky flat drops like a curtain, then the waves, the island, the tower and the H3 rise. A paper ticket gives the launch time in JST and UTC. On "launched" an impact frame, the replacement-paper flame lights and becomes a point light, so every shadow swings away from it. The camera follows the rocket up through near clouds while a smoke column is left behind. |
| 4.9 to 7.4 s | a heist to steal a piece of it. | On "heist" an impact frame; the rocket punches out of the top as the sky flat falls away and the one real photo, HiRISE PIA10368, drops in as a printed card ("PHOBOS 27 x 22 x 18 km", credit on the card and in the slot) with a red TARGET tab. Pho slides in, double-takes at his own mugshot and erupts. On "piece of it" an amber "cut here" line with paper scissors appears on his head. |
| 7.3 to 10.7 s | Step one: Mars, August 2027. | Night Shift rises at the lower left holding the STEP 1 card (one solid pip, three rings) and throws it to the corner. The photo card is yanked up, Mars rises, and Pho drops into orbit around it while MMX arrives with the rover slung underneath. A tear-off calendar riffles from OCT 2026 through blank pages and lands on AUG 2027 as "August" is spoken. |
| 10.7 to 14.9 s | Step two: drop a lookout. A 25 kilo rover. | Night Shift raises STEP 2 at the lower right while Pho glares at him. MMX hovers, the rover's thread lets go, a tag reads "dropped from about 40 m, in free fall (DLR)", and Pho panics. The rover bonks onto his head (BONK!, squash, camera shake), bounces in low gravity and shows its luggage tag: "ROVER (DLR) 25 kg". |
| 14.9 to 18.1 s | On Phobos, it weighs... 15 grams. | Close-up on the rover. On "15" the tag flips to "ON PHOBOS (ESA) 15 g" with no in-between, pops bigger, and the camera pushes onto it while the rover does a slow, floaty hop. Pho rolls his eyes and shrugs. |
| 19.0 to 22.9 s | Step three: the grab. Coring arm, nitrogen blaster. | Night Shift raises STEP 3. Wide: MMX lands on Pho's head (THUNK!). On "grab" an impact frame and a whip push into Pho's eye. On "Coring" the low-angle set: ground row up, sky flat with Mars down, MMX looming, the corer biting ("corer digs to 2 cm (JAXA)"), Pho's eyes glaring up from the bottom edge. On "nitrogen" an impact frame and FSSSH!: gas puffs burst from the leg pad and loft grains. On "blaster" the ground row drops away: Pho in medium shot, outraged, swearing in a grawlix burst. |
| 22.9 to 25.6 s | Target: at least 10 grams. | Night Shift rises at the left holding the vellum jar; the lofted grains arc from the leg pad into it, and its "AT LEAST 10 g" label slaps on "10". Pho, band-aid on his head, glares at the jar and flares up on "10". |
| 25.6 to 28.0 s | Step four: one burn to leave Mars. | Night Shift ducks and pops back up with STEP 4. MMX's engine fires and the flame lights Pho from above. MMX lifts off, Pho shakes a fist and shouts, and the camera tilts up into a torn amber paper wipe. |
| 27.8 to 30.9 s | Capsule lands in Australia, 2031. | A paper Earth with Australia facing us. MMX crosses overhead and lets the capsule go. The capsule streaks down, lands in Australia with a puff, a flag reading "2031" is planted, and "2031" hits with an impact frame. |
| 30.7 to 35.1 s | The loot? First piece of Phobos ever brought home. | A museum heist set: the STEP card flips shut, a vault backdrop drops, a pedestal rises, a velvet rope swings in and the capsule drops from the fly loft onto a cushion. The lid pops on "loot?" (impact frame), the labelled jar rises out of it, and a spotlight snaps on at "First". In a porthole inset Pho sulks, then fumes. |
| 34.5 to 39.0 s | Next: Rocket Lab aims to launch three HawkEye 360 satellites, Wednesday. | Dusk flats drop as the loot line ends; on "Next:" the NEXT sign and the date tag land together with the hills and the Electron. Night Shift rises and points at the rocket. Three satellites drop in on a mobile at "three", and the tag slaps again on "Wednesday". |
| 38.7 to 42.1 s | Follow Downlink Cat. | The NEXT flats fall away onto the starfield. DOWNLINK slaps in letter by letter on "Downlink" and CAT in amber on "Cat". Pho pops up grumpy. The amber echo dot slams down on the sonic logo (40.4 s) with a stage thump: Night Shift hops, arms up, and Pho jumps. The hollow ring lands 0.4 s later on the logo's echo; Pho gulps, then gives a tiny reluctant wave. |

## Techniques

- **Paper engine.** Each paper is a seeded 320 px tile, made tileable: base color, wrapped soft blotches, about 380 curved fibers and per-pixel grain. Every piece is a polygon resampled and pushed along its normals by fbm noise. A torn edge gets a wider "core" layer underneath that shows as the white fibrous tear, with fiber hairs. Every piece gets a baked light gradient and inner-edge darkening.
- **Sprites with baked soft shadows.** Each piece is pre-rendered into 1 to 3 boil variants, each with its own blurred shadow sprite. In round 2 the pieces seen in the close-ups (Pho's body, eyes, brows and mouths, MMX, the arm, the rover, the jar, the luggage tag) are built at 2.2 to 4.5 times resolution so the eye push and the low-angle set stay crisp.
- **Shadows that move with the light.** A global light, directional or a point light, sets each piece's shadow offset from its "lift". The H3 and MMX flames are point lights, so every shadow swings away from the flame; the loot has a top spotlight; the NEXT scene has low dusk light.
- **Multiplane camera.** Every layer has a depth `d`. A pan moves a layer by `1/d` and a dolly scales it by `1 + push/d`. Camera keys are eased; whips use 4 to 6 frame keys; impacts add a stop-motion shake on twos.
- **Theatre set changes instead of cuts.** Flats drop from the fly loft or rise from below in staggered order; set pieces hang on visible threads and swing; the low-angle set is a theatre ground row plus a sky flat; a torn amber sheet wipes from Pho to Earth. The space world is one continuous set with one camera track.
- **Impact frames** as a two-tone print of the rendered frame (see above), 7 hits of 2 frames each.
- **Puppets with brass split pins.** Pho: torn-paper body, sliding lids, brows on split pins, 12 replacement mouths, two-segment arms with 11 poses, sweat, anger vein, shock lines, grawlix, cut line with scissors, band-aid, about 40 acting keys plus a gaze track. In round 2 he can also be drawn "face only" (eyes and brows) for the low-angle set. Night Shift: echo-mark eyes (solid disc viewer-left, ring viewer-right), headset, oversized jacket, split-pin arms, a tail, mouth flaps driven from the caption word timings, seeded blinks, and new paw helpers so he can grip a card on a dowel or a jar (the forearm is redrawn over the prop).
- **Captions.** The narration words verbatim from `captions.json`, each on its own paper slip; the newest plain word is on amber paper; one emphasis word per line is cut out letter by letter in one face. Each word appears on the frame nearest its start (0-frame offset) with a stepped slap. A QA script (`window.__capOnly`) checked every one of the 1263 frames: all caption slips stay inside x 85 to 875 and y 1162 to 1429.
- **Credit slot.** A paper strip at y 1474 that flips like a card when its text changes. It shows "NASA/JPL-Caltech/University of Arizona" for the whole time the photo card is on screen (4.79 to 7.47 s). Otherwise it shows "Illustration · facts: ..." with the source, plus "not to scale" whenever a drawn spacecraft or capsule shares the frame with a drawn moon or planet. During the 0.4 s when the H3 and the photo card overlap, the two credits stack.

## Facts on screen (all from `kit/facts.md`)

"1.8 m (6 ft) closer to Mars every 100 years (NASA)" and "IN 50 MILLION YEARS: crash into Mars or break up into a ring" (F28). "Launch: 04:41:03 JST, Oct 20, 2026 (19:41:03 UTC, Oct 19)", "H3 No.10" (F01). "PHOBOS 27 x 22 x 18 km" (F29). The calendar, OCT 2026 then AUG 2027 only (F08). "dropped from about 40 m, in free fall (DLR)" (F14). "ROVER (DLR) 25 kg" (F15). "ON PHOBOS (ESA) 15 g" (F18). "corer digs to 2 cm (JAXA)" (F22). "AT LEAST 10 g" (F21), on the jar in step three and in the museum. "2031" (F08, F10). "ROCKET LAB ELECTRON", "3x HAWKEYE 360", "WED 21 OCT" (NEXT). No sampling year, no health claim, no logos or insignia. "TARGET", "PHOBOS" on the plaque, "STEP n", the pips, the grawlix and the sound words are story labels, not claims. MMX, the H3, IDEFIX, the Electron, the satellites and the capsule are flat paper illustrations with no engineering detail, and IDEFIX is a box on wheels, never a character.

## Sound

Bed: `bedH_caper` (playful, sneaky heist caper), with `--bed-under 18`. There are 19 cues: a pop for the pointer poke; an impact on "collision"; a long whoosh for the set change; an impact_big on the H3 ignition; a short whoosh on "heist"; a page turn for the calendar; a tick when STEP 1 lands in the corner; impacts for BONK! and THUNK!; a page turn for the 25 kg to 15 g flip; a short whoosh for the push into the eye; a long whoosh for the low-angle set; a short whoosh for the nitrogen burst; a slam for "10"; an impact_big for the burn; an impact for the capsule landing; a swell for the spotlight on "First"; a page turn for the NEXT set; and `wordmark_echo` at frame 1212, when the amber dot slams down. Final mix: -13.9 LUFS integrated, true peak -2.1 dBTP, bed 18.0 LU under the voice while talking, sonic logo at 40.416 s, no warnings (`out/mix.report.json`).

## QA (round 2)

Three QA rounds, each with stills rendered from the page or cut from the video and looked at: every line boundary from the kit table (frames 5, 103, 220, 308, 322, 446, 544, 570, 687, 747, 768, 913, 928, 1030, 1047, 1162, 1167, 1209) and the big moments (impact frames, BONK!, the 15 g tag, the eye push, the low-angle set, the jar, the burn, the spotlight, NEXT, the echo). Fixed along the way: the STEP card covering the cat's face (now on a dowel above his head), the coring and nitrogen close-ups that still read as "Pho's face again" (replaced by the low-angle set), Pho's pupils hiding under his lids while looking up, the jar covering Pho's eye, THUNK! lingering into the eye push, the capsule rising with the pedestal instead of dropping, the date tag still sliding in on "Next:", the photo card entering during the "heist" impact frame (it now enters after it, so the real photo is never two-toned), and old caption slips showing on line-start frames.

Checks on the final: caption slips inside x 85 to 875 and y 1162 to 1429 on every frame (script); every word appears on the frame nearest its start; the credit slot never leaves the photo card uncredited; `final.mp4` is 45.4 MB.

Motion, measured the same way on both finals (mean absolute difference between consecutive frames, grayscale at 135 x 240, 0 to 255): whole Short 3.06 in round 1, 4.93 now; 10.5 to 25.5 s 2.81, now 5.16; hook 3.61, now 5.68; end card (40.3 to 42.1 s) 0.94, now 1.74. The puppets still move on twos, so about a fifth of frame pairs are identical by design.

`qa/round2_sheet.jpg` and `qa/round2/*.jpg` are the final stills; `out/contact_full.png` is one frame per second.

## Render time

A full render of 1263 frames takes 233 to 259 s with 2 workers (about 0.37 to 0.41 s per frame per worker while another agent renders). Round 2 used four full renders: one first look, two fix rounds and the final. The CRF 19 re-encode takes about 1.5 min and the mix under 1 min. Building the page takes under 1 s; sprites build lazily in about 1 s on the first frame.

## Honest weaknesses

- **Night Shift is still a simple stick puppet.** He now acts in seven beats (hook, four STEP cards, the jar, NEXT, end card), but his acting is mostly arm poses, head tilts and talking flaps; his legs show only on the end card.
- **The middle is still one world.** The six set-ups vary the camera a lot (medium, tag close-up, eye close-up, low-angle ground row, jar two-shot), but Pho's grey paper is in almost every frame from 10 s to 28 s. That is the point of the co-star, but it is a lot of grey.
- **Theatre drops briefly fill the frame with flat paper.** The dusk flats at 34.5 s and the amber wipe at 27.8 s each cover the frame for about 0.2 s.
- **The caption chunk change** sinks the old slips in place over the 2 frames before a new line, so a still on exactly those 2 frames shows small shrinking slips.
- **The illustrations are simple.** MMX is drawn side-on with two visible legs; the H3 and Electron are generic silhouettes; the Earth's continents are hand-simplified outlines.
- **The heist is a narrative device.** Pho being "robbed" matches the script's own "heist / steal / loot" framing. The impact frames are 2-frame flashes on 7 words; they are far below 3 flashes per second, but they are bright.
- **The either/or placard is on screen for about 1.2 s**, which is short for four lines of text on a phone. It is there and pausable, but most viewers will only catch "crash into Mars or break up into a ring".
