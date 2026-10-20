# pixel: "PHOBOS HEIST", a 16-bit pixel-game Short

Entry "pixel" in the ultra experiment (Oct 20, 2026). It uses the same story, narration, captions and facts as the other six entries. The art direction is a SNES-era game. Every frame is drawn at **270 x 480** into a fixed palette and upscaled **x4 with nearest-neighbour**, so every pixel is a crisp 4 x 4 block.

- Final: `out/final.mp4` (1080 x 1920, 30 fps, 42.2 s, H.264 + AAC, 15.6 MB, -14.0 LUFS, -2.1 dBTP)
- Silent render: `out/video.mp4`. The pure mix.py version (without my chip layer) is `out/final_mixpy.mp4`.
- Contact sheet: `out/contact_full.png` (every 30th frame, labelled). The renderer's own sheet is `out/video.contact.png`.
- Page: `page.html` (one self-contained file, 2.8 MB, no network). It is built from `src/*.js` by `build.py`.
- Render time: **111 s** for 1266 frames with `--workers=2`, about 0.18 s per frame per worker, while another agent was rendering. Earlier drafts took 75 to 89 s.

## The piece, beat by beat

| Time | Beat | What happens |
|---|---|---|
| 0.0 to 3.4 s | Hook | A shmup **WARNING** alarm, with hazard stripes and a red flash plus shake on "collision". The real HiRISE Phobos, re-pixelated, is the "boss": it punches in and lock-on brackets snap onto it. The real Viking Mars sits as a horizon below. Labels: "1.8 m (6 ft) closer to Mars every 100 years" and "27 x 22 x 18 km". A game menu keeps NASA's either/or: "IN 50 MILLION YEARS: > CRASH INTO MARS / > OR BREAK UP INTO A RING", with the cursor alternating between the two. A dotted trajectory draws on "course". |
| 3.4 to 7.3 s | Launch | SNES mosaic into a night pad at Tanegashima (04:41 JST is before dawn). Searchlights, a sea with wave dashes, the umbilical tower and obstruction lights. H3 ignites on "launched": smoke billows lit from below, then the camera tracks the climb. The **PHOBOS HEIST** title slams on "heist" ("MMX · MARTIAN MOONS eXPLORATION" under it). The SRBs tumble away. On "steal", the fairing opens and Night Shift, sitting on MMX, gives a wink and a thumbs-up. "SEPARATED ~71 MIN 13 S AFTER LIFTOFF" appears as the spent stage falls behind. |
| 7.3 to 10.7 s | STAGE 1: MARS | Stage card. MMX cruises with streaking 3-layer star parallax and a dithered Milky Way. A dotted overworld route runs from a shrinking drawn Earth, through the ship, to the real Mars, which grows. Night Shift points at Mars, then cheers on **AUG 2027**. Iris-out on MMX. |
| 10.7 to 18.1 s | STAGE 2: LOOKOUT | Iris-in onto a **Mode-7 Phobos floor** (the NASA Phobos texture map in perspective) under a giant real Mars. The camera slowly orbits the landing site, so the floor rotates and Mars slides across the sky. IDEFIX drops "~40 m (DLR)" in slow low-g free fall, bounces with a full flip and lands upright on "rover". **25 kg** appears. On "weighs..." the plate drops out of a slot window (no invented in-between numbers), then **15 g** slams and the rover does a feather-light hop. |
| 19.0 to 24.9 s | STAGE 3: THE GRAB | MMX descends on thrusters and touches down on "grab", raising slow low-g dust arcs. The rover patrols nearby. A game-style **2x zoom inset** magnifies the real frame region: the coring arm "digs to 2 cm", then the nitrogen gas burst lofts grains "in a fraction of a second". A HUD target panel appears ("TARGET / AT LEAST 10 g"). The sample pops out as a spinning **coin**, arcs and flies into the slot on "10", and **10 g** slams. |
| 25.6 to 30.4 s | STAGE 4: HOME | The camera tilts up as MMX lifts off and the floor drops away. The big main-engine burn follows ("ONE BURN: LEAVE MARS / EACH WAY: JUST UNDER ONE YEAR"), with the dotted route home. A drawn Earth with hand-traced coastlines slides in. On "Capsule", MMX releases it and peels away. The capsule heats up into a fiery reentry streak toward an amber pin dropped on **AUSTRALIA**, and **2031** slams. A dithered white flash follows. |
| 30.9 to 34.3 s | LOOT | Outback dawn: sky bands, sun, mesas and spinifex in parallax. Night Shift (big sprite) hops in with a "?" emote. The capsule opens like a treasure chest with light rays, and he lifts the sample overhead in the item-get pose. Banner: "PHOBOS SAMPLE / FIRST EVER BROUGHT HOME". |
| 34.9 to 38.7 s | NEXT | Blinds wipe. Night coast at Mahia, New Zealand, with a black Electron illustration on its pad. NEXT / Rocket Lab Electron / three satellites pop in one by one / "3 HAWKEYE 360 SATELLITES" / **WED 21 OCT**. Night Shift points at the rocket from a foreground rock. |
| 38.9 to 42.2 s | End card | Mosaic. The **DOWNLINK CAT** wordmark types in: the amber dot first, DOWNLINK in off-white, CAT in amber. The hollow amber ring "echo" lands with ripples at the `wordmark_echo` cue (frame 1212) as the sonic logo plays. MMX cruises by in the background, Night Shift waves (wink on the logo), and a "> FOLLOW" prompt blinks. |

Captions are a game **dialog box** throughout. Night Shift talks from a comm window: the portrait's mouth flaps follow the real voice level per frame (`VENV`, measured from `voice.mp3`), he blinks, there is comm static when each line starts, and a voice-level meter sits under the portrait. The expressions are scheduled per beat: shocked, sly, keen, focus, happy, wow, wink.

## Techniques

- **Framebuffer engine.** One `Uint32Array` of 270 x 480, my own primitives (pixel discs and rings, polygon fill, Bresenham lines), sprite buffers with an automatic 1-px outline, nearest-neighbour rotation, and present by `drawImage` x4 with smoothing off.
- **Fixed palette.** About 60 colours on ink, paper and amber, plus Mars reds, Phobos browns, Earth blues and greens, and fire. Every drawn pixel is a palette colour.
- **Real images re-pixelated per frame.** HiRISE Phobos and Viking Mars are box-filter resampled to the exact on-screen size, then quantized to palette sub-ramps with a 4 x 4 Bayer ordered dither anchored to the screen. This is resampling, grading and quantizing only. Nothing is painted into them.
- **Mode-7 floor.** A per-scanline perspective plane from the NASA Phobos texture map, with 4 mip levels, distance fog and ping-ponged latitude (no seam). The camera orbits the landing site. Sprites (rover, MMX, shadows, dust) are projected onto the plane.
- **Two hand-made bitmap fonts.** The dialog font has a 9-px cap height and real lowercase. The small font (6-px caps) carries credits and labels. Big titles are the bold dialog font at x2 or x3 integer scale, with banded colour ramps, a dark outline and a drop shadow. Number slams pop for 2 frames (white flash, one size up), then settle with a bounce, clamped inside the frame.
- **Night Shift as pixel art.** A small in-scene sprite: spacesuit, glass helmet, echo-mark eyes, sitting with a gamepad, pointing, cheering, winking. A big sprite at native 2x detail that reuses the comm-portrait head inside the helmet; raised arms go behind the helmet so they never cover the face. A comm portrait with headset and mic and nine expressions. He is never mirrored: the solid dot is always viewer-left.
- **Machines as clearly stylized illustrations.** MMX (gold body, blue wings, legs, capsule on top), H3 (drawn natively at 39 x 152), IDEFIX (a machine, no face), the capsule (small, plus a big treasure-chest version), Electron and generic satellites. No logos.
- **Pure function of t.** Seeded `mulberry32` and integer hash noise. Particles, smoke, dust and sparks are computed analytically from their spawn time. The rover drop, bounce and flip is closed-form low-g kinematics. Any frame renders the same in any order.
- **SNES transitions and effects.** Mosaic (twice), iris out and in, blinds, a dithered white flash, screen shake, game-cadence sprite cycles (flames and wheels on 2s and 3s), 3-layer star parallax, a dithered Milky Way, and dithered sky gradients.
- **Game UI as storytelling.** Stage cards, a HUD with stage pips, lock-on brackets, the either/or menu, the 2x zoom inset, the coin collect into a HUD slot, the item banner, an RPG next-page arrow and a "?" emote.

## Truth, credits, captions

- **On-screen numbers and words** come only from `kit/facts.md`: 1.8 m (6 ft) per 100 years; 50 million years crash OR ring; 27 x 22 x 18 km; 04:41:03 JST Oct 20, 2026; H3 flight No.10; separated ~71 min 13 s after liftoff; AUG 2027; ~40 m free fall (DLR); 25 kg; 15 g; corer digs to 2 cm; nitrogen gas, in a fraction of a second; at least 10 g; one burn; each way just under one year; Australia; 2031; first ever brought home; Rocket Lab Electron, 3 HawkEye 360 satellites, Mahia New Zealand, WED 21 OCT.
- **Avoided on purpose:** no sampling year; no "healthy" or "phoned home"; no solar-array deployment beat (MMX is one cartoon sprite throughout, with no unfolding); no parachute (it is not in the facts). The slot roll from 25 kg to 15 g shows no intermediate numbers.
- **Credits** are drawn in the slot just above the dialog box whenever an asset is on screen, exactly as in `credits.json`: "NASA/JPL-Caltech/University of Arizona" (Phobos), "NASA/JPL/USGS" (Mars), "NASA/JPL/Solar System Simulator" (Phobos texture). Two photo credits share one line with a `|` separator. Illustrations get "Illustration · facts: JAXA" (MMX, H3, capsule), "DLR, ESA" (IDEFIX) and "Launch Library 2" (Electron), merged into one line when several are on screen, or "Illustration" alone (the drawn Earth).
- **Captions:** the 89 words from `captions.json`, verbatim, one dialog page per script line (at most 3 rows). Each word appears at `floor(start * 30)`: never late, at most 0.9 frame early (`out/caption_sync.json`). The text area spans x 68 to 222 and y 322 to 362 at native resolution, which is x 272 to 888 and y 1288 to 1448 at 1080 x 1920, inside the 80 to 900 and 260 to 1500 safe zone. The emphasis words are in amber.

## Audio

- **Bed:** `bedH_caper` (playful, sneaky, chiptune-adjacent) through `mix.py --bed-under 18`. Result: -13.9 LUFS, -2.2 dBTP, no warnings. Bed 18.0 LU under the voice while talking (`out/mix.report.json`).
- **`cues.json`: 17 curated library cues.** The collision impact; the mosaic whoosh; the liftoff (impact_big); the title reveal swell; the cat chirp on the wink; number slams on 2027, 15 g and 2031; the iris whoosh; the rover and MMX touchdowns; the nitrogen whoosh; the burn; the chest-opening swell; the NEXT card; the date tick; `wordmark_echo` at frame 1212.
- **Synthesized chip layer (`tools/chip_layer.py`).** mix.py only loads SFX from the shared `lab/sound/sfx` folder (and its `sfx.json`), so I synthesized 9 square-wave game sounds in numpy (`assets/sfx/`) and laid them over mix.py's output: a two-tone WARNING siren, a stage-start arpeggio on each STAGE card, jump boings on the rover bounce and hop, the classic two-note coin on the collect, and an item-get fanfare. They sit 10 to 13 dB under the voice and are band-limited 150 Hz to 7 kHz like the library SFX. The sum is re-normalized with two-pass linear loudnorm: -14.0 LUFS, -2.1 dBTP (`out/chip.report.json`).

## QA (3 rounds, stills looked at with Read)

1. **Round 1** (about 60 stills plus the sprite sheet). The rocket was anchored by its top and hidden behind the box; the pad read as a dark column; the separation label was cut off; there was no title. The rover landed near the horizon as a speck. The slot roll showed invented intermediate weights, which was a truth problem, fixed. Credits stacked 4 lines deep. The coring arm and the gas burst were invisible. The tiny "≥" read as "2". The rays in the loot scene were garish. The cat was too small for the loot, NEXT and end beats; raised arms covered his face.
2. **Round 2** (32 stills at every line boundary and big moment, plus a full draft render and its contact sheet). Phobos needed a first-second punch; the 15-s Phobos section had a near-static camera (now an orbit); stage 1 felt empty (now an overworld route); labels collided with slams; a pop overflowed the frame edge; the flash went to pure white; the lookout rover now patrols.
3. **Round 3** (the final MP4's own frames, a full-resolution crop of the box and credits, and the final contact sheet). The iris-in lingered near black (now a fast open); the burn shot was sparse (now a route home); the date slam pop was clipped (all slams are now clamped inside the frame).

## Honest weaknesses

- For most of the video Night Shift is a small sprite (about 33 px native, 132 px on screen) sitting on MMX. His acting there is limited to poses, expressions, blinks and tail sway. The comm portrait carries most of the performance, and the big, more expressive sprite appears only in the last 11 s.
- The near rows of the Mode-7 floor show big magnified texels, and the floor is busy. That is authentic Mode-7, but it fights the sprites a little. The Phobos texture map is greyscale, so the floor's browns are a grade.
- Scale and time are cartoon. The rover is oversized next to MMX, the 40 m low-g fall (really about 2 minutes) takes about 1.7 s, MMX is wider than the rocket at the fairing reveal, and only two of the H3-24L's four SRBs are visible from the side.
- The captions are crisp but use a 36-px cap height, smaller than typical Shorts captions, and short lines leave the box half empty.
- Some single frames are hard: one near-black frame at the iris close (about 10.7 s), one blinds-closed frame (34.9 s) and a 90% white flash (30.9 s). The 2-frame slam pops briefly cover their labels.
- The NEXT scene and the burn shot are sparser than the rest.
- The real Phobos does not rotate. It bobs, drifts and punches in; the two HiRISE views were not cross-faded.
- The drawn Earth's coastlines are hand-traced approximations.
- `final.mp4` includes my chip SFX layer, added after mix.py and re-normalized by my own script, so the mix.py report describes `final_mixpy.mp4`, not the final file. Both meet -14 LUFS and true peak at or below -1.5 dBTP.
- I have not checked it under the real YouTube Shorts overlay.

## Files

`build.py` (asset preprocessing: crops, binary sky masks, downsamples, the voice envelope; it inlines everything into `page.html`) · `src/00_core.js` (palette, framebuffer, primitives, PRNG, present) · `src/01_font.js` (bitmap fonts, titles) · `src/02_image.js` (photo re-pixelation, Mode-7) · `src/03_sprites.js` (Night Shift small, big and portrait; MMX, H3, IDEFIX, capsules, Electron, satellites, Earth, stars) · `src/04_scenes.js` and `src/05_scenes2.js` (the nine scenes) · `src/06_main.js` (timeline, HUD, stage cards, transitions, credits, dialog captions, `renderAt`) · `tools/stills.mjs`, `tools/grid.py`, `tools/contact.py` (QA) · `tools/chip_layer.py` (synth SFX and the final loudness) · `cues.json` · `assets/` (preprocessed image cache, voice envelope, synthesized SFX) · `qa/` (QA grids and crops).

Rebuild: `python3 build.py && node ../render_fast.mjs page.html 42.2 30 out/video.mp4 --workers=2`, then the mix.py command, then `python3 tools/chip_layer.py out/mix.m4a out/video.mp4 out/final.mp4 --report out/chip.report.json`.
