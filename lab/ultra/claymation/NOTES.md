# Claymation entry: MMX heist (Downlink Cat, ultra experiment)

Entry `claymation`, built Oct 20, 2026. The same Short as the other six entries (kit voice, captions, facts), made as a stop-motion clay film in three.js. Round 1 placed in the top three; this is the polish round (round 2). The round-1 film is kept as `out/final.round1.mp4` (its sources in `round1/`).

## Round 2: what changed and why

Every judge note, and what was done about it:

| Judge note | Round 2 |
|---|---|
| The first 1.5 s is mostly idle; the thumb-stop only comes at 1.8 s. | The camera is already pushing in on frame 0. Night Shift now stands on a stack of clay books holding a professor's pointer; on "moon" (0.31 s) he pokes Phobos and it boings on its brass pin (spring on twos), with a punch-in. The pull-back still lands on "collision". |
| The hook never shows the either/or. | A paper sign is lowered into the wide shot on a string (a stage action): "50 million years: crash into Mars / or break up into a ring" (F28, worded as in facts.md). The slow rate ("1.8 m (6 ft) closer to Mars every 100 years") is now a toothpick flag planted on Phobos itself, on "slow-motion". |
| Whip pans smear for 6 to 10 frames; 7.35 and 10.75 s are full-frame blur. | Every whip is 4 or 5 frames (3.4, 7.3, 10.6, 25.0, 27.4, 34.8 s), only real whips blur (threshold raised from 30 to 70 px per frame), and the blur length is capped at 230 px so no frame turns to mush. The two vertical whips go up into the starry sky and come down on the new set, so their middle frames are star streaks, not a smeared table. |
| Captions are puffy clay letters with ghosted offset shadows, low contrast on the coat, smoke and ground, jumping around the frame, popping in at about 30% size. | One fixed caption plaque: a dark plum clay slab with an amber clay bead around its edge, always at x 92 to 888, y 1158 to 1478. The clay letters (off-white, numbers and emphasis words in amber, numbers 1.26x bigger) sit on it with a short real shadow on the slab, so there is no ghost; the slab casts a soft drop shadow on the set. At most two rows; a group that does not fit shrinks instead of wrapping to three. New words start at 88% size on their first frame. The credit line moved inside the plaque (under the caption), so captions and credits never touch the set or the props. |
| 13.5 to 16.5 s: the scale on Phobos reads "25 kg" under "On Phobos, it weighs...". | The dial has no number until "15". The 25 kg is the rover's own paper luggage tag (its mass, true anywhere), popping on "25". The rover now falls slowly (it is Phobos): the cat braces for a crash, peeks, reads the tag, leans in; the rover touches the scale with a tiny tick, and on "15" the dial shows an amber "15 g" and his jaw drops. The scale now stands on a flat clay rock so the dial is always above the plaque. |
| 21 s: the camera is inside the lander leg, white blob in the foreground, tiny caption. | MMX lands to the left of the scale now, and the coring beat is a clean side shot from outside the legs: the arm drives the spinning corer into the ground, clay chips spit out, flag "Corer digs to 2 cm" in the clear sky area. |
| 24.8 to 25 s: full-frame mush, then "10 grams." on black streaks. | 5-frame whip up through the stars and down onto the new step-four shot: MMX beside Phobos with clay Mars filling the whole frame behind them (no longer dark and empty). |
| Material reads as soft vinyl at phone size. | Fingerprints 1.9x deeper everywhere, bigger whorls on the cat, rougher cat clay, a new low-frequency colour mottle in the shader (hand-mixed clay), twice the vertex boil on the cat, and the boiling fingerprint pattern now crawls a little per pose frame instead of jumping to a new pattern. |
| 11 to 12 s: the cat is cropped into a corner under the caption. | Step two opens on a worm's-eye shot: MMX looming with the rover hanging under it, Night Shift small but whole-headed at lower left looking up; then a slow crane up and in follows the falling rover down to the scale. |
| The NEXT beat opens on a blurred empty plain for 0.5 s. | The whip lands on a new set: a clay shop counter with the three satellites and a page-a-day calendar on it, the Electron behind, the NEXT flag above; Night Shift pops up behind the counter on landing (like the end card), counts the satellites as they bounce and points at "WED 21 OCT" as the calendar pops up on "Wednesday". |
| The end card leaves the bottom 40% empty. | Bigger end card: the wordmark across the top, Night Shift 2.3x and much higher, his face filling the middle, the amber ledge, then the caption plaque, then the ledge face. Clay star beads on the backdrop. |
| The video is 20 ms shorter than the mix. | Rendered 42.1 s (1263 frames). |

Ideas borrowed from the other entries, in clay terms:

- **Impact frames (anime):** a stop-motion "bump" on 17 emphasis words (moon, collision, liftoff, heist, steal, 2027, drop, 25, 15, grab, nitrogen, 10, burn, 2031, First, three, Wednesday): a 5% punch-in, a tiny camera roll and an exposure pop, decaying over four pose frames.
- **Stage actions instead of cuts (papercut):** the either/or sign is lowered on a string, the easel springs up for the loot, the cat pops up behind the NEXT counter.
- **Calendar flip (papercut):** a clay-stand flip calendar flips one page every pose pair from OCT 2026 to AUG 2027, landing on AUG on the word "August" and bouncing on "2027".
- **Heist meter (pixel):** four clay beads at the bottom right of the plaque, labelled STEP, fill amber as each step starts; the current one pops.
- **"Not to scale" (cinematic3d):** the credit line says "Illustration, not to scale" whenever drawn hardware shares the frame with clay Mars or Phobos.
- **Source in the label (riso, anime):** every credit line names the facts' source (NASA, JAXA, ESA, DLR, Launch Library 2).

## Adversarial final check (Oct 20, 2026, after round 2)

A last pass looked for anything that would embarrass the channel on upload: numbers or claims not in `kit/facts.md`, real images without their exact credit, drawn spacecraft without "Illustration", caption words that differ from the narration or land late, text outside the safe zone (x 80 to 900, y 260 to 1500) or too small for a phone, flashing, loudness, a cut-off sonic logo, black or broken frames.

What passed as it was:

- **Facts.** Every on-screen number and label is worded as in `facts.md`: the rate flag (F28), the either/or sign (F28), the launch flag (F01, JST and UTC), the flip calendar landing on AUG 2027 (F08, F09), "Rover dropped from about 40 m, in free fall" (F14, with DLR named in the credit line), the "25 kg" tag (F15), the "15 g" dial (F18, ESA), "About 2 to 3 hours on the surface" (F21), "Corer digs to 2 cm" (F22), the jar's "at least 10 g" (F21, F10), the NEXT flag and "WED 21 OCT" (section 4). No sampling year, no "healthy" or "phoned home", no logos (the only flag is Japan's national flag on the launch island).
- **Credits.** The one real image (HiRISE PIA10368) is the easel print; the credit "NASA/JPL-Caltech/University of Arizona" is on screen in every frame where any part of the print is in frame (checked frame by frame across its pop-in at 31.4 s and the whip out at 34.8 s). Every frame with drawn hardware shows "Illustration" (and "not to scale" where Mars or Phobos share the frame) with the facts' source.
- **Captions, from the video pixels.** For each of the 89 words, the screen box of the word was taken from the caption layout and the final video was scanned around its start frame: every word appears on the first frame at or after its spoken start (0.0 to 0.9 frames late, never early), all 89 texts equal `captions.json` (including "slow-motion", "weighs...", "loot?", "HawkEye", "360", "Downlink Cat."). `tools/capcheck.mjs`: letters inside x 118 to 862, y 1189 to 1398.
- **Audio.** ffmpeg loudnorm on `out/final.mp4`: -14.01 LUFS integrated, -2.10 dBTP. The sonic logo runs 40.42 to 41.87 s on the end card, then 0.2 s of silence before the 42.1 s end (not cut off).
- **Frames.** Mean luma of all 1263 frames: no flat or broken frame; the darkest (frames 319, 746, 747, luma 8 to 11) are the planned star-streak whip frames, with the caption plaque on them. No large-area flashing: the exposure flicker is 1.8% and the punch pop 8%; the only repeated light/dark changes are local (the cat's scamper strobing against the camera move and the flip-calendar pages at 7.5 flips per second, each about 3 to 5% of the frame, under the 25% area threshold).

What was wrong and is fixed (all found with a new check, `tools/textzone.mjs`, which projects every text-bearing prop to the screen on all 1263 frames, then confirmed with stills):

| Problem | Fix |
|---|---|
| The rate flag "1.8 m (6 ft) closer to Mars every 100 years" sat entirely in the top 260 px (y about 15 to 260) for 0.6 to 2.5 s, under the Shorts top bar. | The flag stands on Phobos's right shoulder with a short toothpick and its card to the left, over clay Mars (`left: true`, pole 0.8, card 4.2 wide); its text box now starts at y 272 and x 80 or more in every frame, and its pop no longer overshoots out of frame. |
| The either/or sign's first line rode up to y 218 to 244 while it settled (2.6 to 2.8 s). | Hung 1 unit lower (`SIGN_DROP`): the sign now settles at y 273 and up. |
| The launch flag's "Launch:" line reached y 217 during the push-in (5.4 to 6.7 s). | Pole 9.6 to 8.9: text from y 287. |
| The flip calendar sat at x 640 to 1030 for the whole step-one shot, so "2027 AUG" ran past x 900 into the right-edge buttons. | Moved left and slightly smaller (`CAL_X` -5.5, `CAL_S` 1.0): page boxes x 492 to 891 once in frame. |
| The drop tag rode up through the top edge (y 258 to -43) for 1.3 s as the camera craned down after the rover; at its new place an MMX arm crossed its text. | The tag is let down on its string as the camera cranes (string length solved per frame so its card top stays at y 285 or below), and it hangs a little in front of the wing so nothing covers it. |
| After the gag, the "15 g" dial stayed on, so from 19 to 22.9 s a cut-off "15" sat at the right edge of the wide shots (x 950 to 1080). | The dial goes blank again once the rover has floated off and the needle is back at zero (18.13 s). |
| "About 2 to 3 hours on the surface": about 30 px type, and it drifted to x 30 before it popped out. | Type 1.4x bigger (fs 116) and the flag 0.9 units right: text box from x 83. |
| End card: the echo dot started at x 48, CAT ended at x 897 and the letters' top was at y 222 (outside x 80 and y 260). | Wordmark scale 0.8 to 0.7, centred on x 490 including the dot, lowered to y 43.0: x 117 to 862, y 287 to 380 through the push-in, clear of the cat's ears. |

Not changed, judged acceptable: the calendar slides in from the right edge for 0.45 s as the camera trucks right (8.1 to 8.6 s); the "25 kg" tag drifts out to the right as the rover floats away (17.7 to 18.7 s, y about 400 to 500, above the button column); single-frame pop overshoots (the either/or sign dropping in, the NEXT and launch flags popping); the echo ping ring, a graphic, expands to y 243 for 0.25 s. The other boxes `tools/textzone.mjs` flags are whole paper cards or dial faces whose text sits well inside the zone (checked on stills: dial text x 671 to 882, corer flag text x 480 to 720, WED 21 OCT text up to x 860).

Re-render: frames 0 to 320, 350 to 420, 540 to 686 and 1162 to 1262 (640 frames, two processes, about 22 min), spliced onto the CRF 16 base with the round-2 patches in one CRF 20 encode (`tools/splice2.py`), then re-mixed with the same cues. A per-frame PSNR against the round-2 video confirms that only the frames with the moved props changed (all others above 40 dB, encoder noise only) and the seams (320/321, 349/350, 420/421, 539/540) are continuous.

## Files

| Path | What it is |
|---|---|
| `claymation.html` | The self-contained page (built). `window.renderAt(t)` is a pure function of `t`; `window.__ready` builds the sets. three.js r159 inline, fonts and the one photo as data URIs. |
| `build.mjs` | Builds `claymation.html` from `src/*.js` (in name order), `data/glyphs_titan.json`, the fonts and a downscaled copy of the HiRISE Phobos photo. |
| `src/00_util.js` | Seeded PRNG, hash noise, Perlin, easing, springs, keyframe helpers, `twos(t)` (pose time on twos). |
| `src/10_clay.js` | The clay material (MeshStandardMaterial patched with `onBeforeCompile`) and geometry lumping. |
| `src/30_cat.js` | Night Shift built from primitives, plus the pose evaluator (tracks, blinks, ear flicks, breathing, lip sync, clay jitter). |
| `src/40_set.js`, `src/41_craft.js` | Clay Mars, Phobos and Earth; paper flags; the clay H3, MMX, rover, capsule, Electron, satellites, kitchen scale, sample jar, cotton-wool puffs, flames. |
| `src/50_captions.js` | The captions as extruded clay letters (Titan One outlines) on the fixed clay plaque, plus the STEP beads. |
| `src/60_post.js` | The lens: depth of field from a log depth in the alpha channel, whip blur, grade, exposure flicker, vignette, grain. |
| `src/70_world.js` | The three stages: the tabletop (orrery, books, pointer, launch pad, flip calendar, Earth, easel, NEXT counter), the Phobos ground set (rock and scale), the end card. |
| `src/80_timeline.js` | Shots, camera keys, the cat's performance, every prop, flags, credit slot. |
| `src/90_main.js` | Renderer and `renderAt`. |
| `cues.json` | 20 curated SFX cues for `lab/sound/mix.py` (with a `note` per cue), re-timed for round 2. |
| `shot.mjs`, `tools/probe.mjs`, `tools/proj.py`, `tools/capcheck.mjs`, `tools/stills.py`, `tools/tile.py`, `tools/contact.py`, `tools/splice.py`, `tools/glyphs.mjs` | Stills from the page, a world-to-screen probe, an offline pinhole projector used to solve layouts, the caption QA (timing and safe zone), one-pass labelled stills from a video, a tiler, the contact sheet, the frame-range patch splicer (with `CRF=`), the glyph extractor. |
| `tools/textzone.mjs`, `tools/caplayout.mjs`, `tools/splice2.py` | Final check: the screen box of every text-bearing prop on every frame against the safe zone (writes `out/textzone.json`); each caption word's screen box (for checking caption timing from the video pixels); a splicer that takes any frame sub-range of a patch (`FROM:TO:patch.mp4:FIRST`). |
| `vendor/three-0.159.0.min.js` | three.js r159, exactly as served by `https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js`. |
| `fonts/` | Titan One, Kalam Bold, IBM Plex Mono SemiBold (all OFL, from the google/fonts repo via jsDelivr). |
| `out/video.mp4`, `out/final.mp4`, `out/mix.m4a`, `out/mix.report.json`, `out/contact.png`, `out/caption_sync.json` | Round 2: silent render (spliced, CRF 20), muxed final, mix, mix report, labelled contact sheet, caption QA result. |
| `out/final.round1.mp4`, `out/contact.round1.png`, `out/mix.report.round1.json`, `round1/` | Round 1 as judged: the final, its contact sheet and mix report, and its sources (`round1/src`, `round1/claymation.html`, `round1/cues.json`, `round1/NOTES.md`). |
| `out/video.full_crf16.mp4`, `out/patch/` | The round-2 full render at CRF 16 (the splice base, 190 MB) and the patch renders (`r1` to `r4` are the final-check patches); kept for re-splicing, not for publishing. |

Rebuild and render:

```sh
cd lab/ultra/claymation
node build.mjs
node ../render_fast.mjs claymation.html 42.1 30 out/video.mp4 --workers=2 --webgl   # 1263 frames; re-encode at CRF 20 to stay under 60 MB
python3 ../../sound/mix.py --voice ../kit/voice.mp3 --bed ../../sound/beds/bedH_caper.wav --cues cues.json \
  --out out/mix.m4a --video out/video.mp4 --mux out/final.mp4 --bed-under 18 --report out/mix.report.json
python3 tools/contact.py out/final.mp4 out/contact.png
```

## The film

One tabletop world, shot like a stop-motion feature. Night Shift plans the heist on a clay model of the Mars system.

| Time | Shot |
|---|---|
| 0 to 3.4 s | Close on a clay potato Phobos on its brass orrery pin, a huge out-of-focus clay Mars behind, Night Shift on a stack of clay books with a pointer. On "moon" he pokes Phobos and it boings; a flag planted on Phobos says "1.8 m (6 ft) closer to Mars every 100 years"; on "slow-motion" he turns to camera, slowly. On "collision course" he gasps (pointer drops, squash, stretch, ears back, paws to cheeks) as the camera pulls back, an amber clay snake rolls out the spiral toward Mars and a paper sign is lowered in: "50 million years: crash into Mars / or break up into a ring". |
| 3.4 to 7.3 s | 4-frame whip to the launch pad. The clay H3 (four boosters, plain white, no logos) lights up, cotton-wool smoke bursts out, it climbs on twos. The cat flinches, then turns to camera with a sly half-lidded grin on "heist", rubs his paws, snatches on "steal", points up after the rocket. Flag with the launch time (JST and UTC). |
| 7.3 to 10.6 s | "Step one": he scampers across the table holding a clay MMX up on a stick; a flip calendar on a plinth by Mars flips OCT 2026 to AUG 2027, landing on "August" and bouncing on "2027". |
| 10.6 to 18.2 s | Vertical whip through the stars onto the Phobos ground set, giant clay Mars on the horizon. Worm's-eye: MMX looms with the rover hanging under it; a tag under its wing says "Rover dropped from about 40 m, in free fall". On "drop" it lets go; the cat braces for a crash; the rover drifts down slowly (the camera cranes after it), its luggage tag "25 kg" popping on "25". It touches the scale with a tiny tick; on "15" the blank dial shows an amber "15 g" and his jaw drops; on "grams" he pokes it and it floats away. |
| 18.2 to 22.9 s | MMX crosses the frame and lands (dust puffs; flag "About 2 to 3 hours on the surface"). "The grab": he mimes a grab. Side shot of the coring arm driving the spinning corer in, chips flying (flag "Corer digs to 2 cm"). Wide on "nitrogen blaster": cotton gas puffs blast from MMX's leg nozzle and hit the cat. |
| 22.9 to 25.0 s | Macro on a glass sample jar labelled "at least 10 g", clay crumbs dropping in, the amber lid pops on with "grams". |
| 25.0 to 30.4 s | 5-frame whip up and over: MMX beside Phobos with clay Mars filling the frame; "one burn" lights the engine and it flies off; whip to clay Earth; the capsule comes down under a striped parachute onto a raised clay Australia; the cat cheers on "2031". |
| 30.4 to 34.7 s | The easel springs up. "The loot?": the capsule hatch pops, the jar flies into his paw; on "First" a print of the real Phobos (HiRISE, PIA10368) pops onto the easel, credited in the plaque, and he raises the jar. |
| 34.7 to 38.7 s | NEXT: 4-frame whip to a clay shop counter; he pops up behind it. Flag "NEXT: Rocket Lab Electron, three HawkEye 360 satellites", the black Electron behind; the satellites bounce as he counts them; a page-a-day calendar "WED 21 OCT" pops up on "Wednesday" and he points at it. |
| 38.7 to 42.1 s | End card: a puppet-theatre ledge. The echo mark (an amber clay dot and ring) and the clay wordmark (DOWNLINK in off-white, CAT in amber) plop in letter by letter; Night Shift pops up big behind the ledge and waves; the dot pulses on the sonic logo's signal (40.40 s) and the ring sends out an echo ping 0.40 s later. |

## Techniques

- **Clay material.** One MeshStandardMaterial program for everything, patched with `onBeforeCompile`: (1) a fingerprint height map drawn once on a canvas with a seeded PRNG (wobbly concentric whorls and loops, sculpting-tool strokes, pores, broad thumb pushes), applied by triplanar mapping in object space and turned into a normal perturbation with screen-space derivatives (Mikkelsen bump, non-normalized so it stays in world units at any distance); (2) a soft wrap-around rim term that reads as subsurface scattering; (3) per-vertex "boil" noise along the normal. Geometry is lumped on the CPU with fBm displacement and seam-free smoothed normals, so silhouettes are hand-made and slightly uneven.
- **On twos.** Every character pose, prop move, puff, flag pop, caption pop and flame flicker is evaluated at `floor(t * 15) / 15`; the camera moves smoothly at 30 fps, like a motion-control rig over a stop-motion set. On top of that, each pose frame gets tiny seeded transform jitter (the animator's hands), a shifted fingerprint pattern on the characters (clay boil) and a ±1.8% exposure flicker.
- **Night Shift in clay.** Built only from primitives: an ellipsoid head, cone ears with amber-brown insides, capsule tuft, the echo-mark eyes (a solid amber disc with a pupil on viewer-left, a hollow amber torus on the right), off-white brows, nose and replacement mouths (a "w" tube rebuilt per pose, or an open mouth with a tongue), the headset with a crooked boom mic and cable, a lathe-turned oversized jacket with collar, placket, pockets and the echo mark on the chest, capsule sleeves with cuffs, mitten paws, two-bone legs, a tapered tube tail rebuilt each pose. A pose-to-pose track system (holds plus eased or overshooting transitions) drives about 45 channels; on top run seeded blinks, ear flicks, breathing, tail sway, a scamper cycle locked to distance (feet do not slide), and lip sync from the caption word timings with head bobs on the emphasis words.
- **Lens.** The scene renders into an 8-bit 4x MSAA buffer with gamma-encoded colour and a log depth in alpha (one pass, no depth pre-pass). A half-resolution gather pass makes the bokeh (44-tap golden-angle disc with scatter-as-gather weighting so blurry backgrounds do not bleed over sharp foregrounds); a full-resolution composite keeps in-focus pixels sharp. Whip pans are blurred along the camera's real screen-space motion. ACES tone mapping, a gentle warm/cool split grade, vignette and fine grain.
- **Captions are clay, on a clay plaque.** Every caption word is extruded clay type: Titan One outlines extracted to JSON with opentype.js, built with three.js `ExtrudeGeometry` (bevelled), lumped, and lit in their own overlay scene. Round 2 presses them onto one fixed plaque (an extruded rounded-rectangle slab of dark plum clay, fingerprinted and mottled, with an amber clay tube bead around its edge) that receives the letters' shadow, so the shadow is short and dark-on-dark. The lens pass darkens a soft rounded-rectangle drop shadow under the plaque. Words plop in on twos (88%, 107%, 98%, 100%) from their exact `captions.json` start frame; emphasis words and numbers are amber, numbers 1.26x. The credit line (HTML, IBM Plex Mono) and the STEP beads live inside the plaque.
- **Punches.** A table of 17 emphasis-word times drives a decaying (1, 0.55, 0.25, 0.1 on twos) push-in of 5% of the field of view, a small seeded camera roll and an 8% exposure pop: the stop-motion version of an impact frame.
- **Facts as props.** Paper flags on toothpicks, hanging tags on strings (the either/or sign, the drop tag under MMX's wing, the rover's "25 kg" luggage tag), a flip calendar and a page-a-day calendar (Kalam handwriting on a fibrous paper texture) carry the extra facts, popping in and out on twos. Layout was solved with a small pinhole projector (`tools/proj.py`, same maths as three.js) and checked with stills, so every card sits above the plaque and inside the frame.
- **Real image.** HiRISE color Phobos (PIA10368), downscaled only, printed on an easel card; the credit slot shows its exact credit whenever any corner of the print is inside the frame (tested per frame by projection).

## QA

Round 2 ran three QA rounds, every still looked at:

1. **While building (stills from the page).** About 150 stills through `shot.mjs`, tiled 5 to 10 at a time: every line boundary and every new prop or camera. Found and fixed before the full render: the rate tag hidden behind the cat's arm (now a flag on Phobos), the wide hook cropping the either/or flag (now a sign lowered from above), the calendar's mirrored page back, the calendar and the scale dial behind the plaque (now on a plinth and a rock), the rover hidden between MMX's legs (MMX hovers higher), the "25 kg" tag hidden by a wheel, the drop flag off the left edge (now a tag under MMX's wing), MMX landing behind the scale (moved left), the coring shot (re-solved with `tools/proj.py`), the satellites and calendar behind the plaque (now on a counter), the end-card cat half hidden, the Earth-shot cat behind the easel legs (the easel now springs up at the loot), the falling pointer read as a stray rod.
2. **On the full render (stills from the video).** 41 stills at the line boundaries (frames 4, 103, 220, 322, 446, 570, 687, 768, 928, 1047, 1167) and the big moments, plus the contact sheet. Found: one frame of the cat's coat filling the jar macro at the cut (poses are on twos, the cut is not), cotton puffs in the first jar frames, the nitrogen blast hidden behind the plaque, 25.0 s still landing on whip streaks, an empty end card for six frames, an empty plaque on frame 0. Fixed and re-rendered by frame range: the cat and the puffs now hide on the real cut time, the gas now lofts up into a cloud that engulfs the cat (closer camera), the jar-to-table whip lands one frame before 25.0 s, the cat pops up from 38.76 s, and the plaque pops in on frames 2 to 6 so frame 0 is a clean picture.
3. **Motion pass.** Mean absolute frame difference (135 x 240 greyscale) per frame and per 0.5 s window found four quieter stretches (9.7 to 10.6 s, 10.8 to 11.8 s, 35.5 to 36.4 s, 38.2 to 38.7 s). Added a push and a toy-plane swoop of MMX on its stick after "2027", a slow lateral drift (parallax) on the worm's-eye shot with MMX bobbing and yawing more, a thumb toward the Electron on "Rocket Lab", and a slow arc on the NEXT shot (a push-in was tried and dropped because it cropped the NEXT flag). Re-rendered 265 to 590 and 1046 to 1162; every splice seam was checked with stills (264/265, 484/485, 589/590, 1045/1046, 1161/1162).

Numbers on the final:

- `tools/capcheck.mjs` on all 1263 frames: 89 of 89 words appear within 1 frame of their spoken start (none late or early by 2); caption letters stay inside x 118 to 862, y 1189 to 1398; the plaque is x 92 to 888, y 1158 to 1478 (the zone is x 80 to 900, y 260 to 1500). "Downlink Cat." stays on one line.
- Motion: mean frame difference 4.42 (round 1: 4.80, which had longer whips); the lowest 0.5 s window is 0.90 (round 1: 0.79); 0.1% of windows are under 1.0 (round 1: 3.7%); the first second is 5.92 (round 1: 1.64).
- Mix (`out/mix.report.json`): -13.9 LUFS integrated, -2.1 dBTP, bed 18 LU under the voice while talking, sonic logo from 40.42 s (ends about 41.9 s on the end card), no warnings (round 1 warned that the video was 20 ms short; the video is now 42.1 s).

## Render time

- Full render: 1263 frames (42.1 s at 30 fps), `render_fast.mjs --workers=2 --webgl`, **2888 s (48 min)**, about 4.6 to 5.5 s per frame per worker on the shared 4-core box. A first attempt was stopped after 6 min to pick up a step-two fix.
- Patch renders (`--from/--to`, two at a time): frames 0 to 10 (53 s), 652 to 692 (109 s, plus a superseded 171 s version), 738 to 756 (80 s), 1160 to 1185 (56 s), 265 to 485 (879 s), 485 to 590 (457 s), 1046 to 1162 (418 s): about 21 min of wall time.
- Final-check splice (current `out/video.mp4`): `CRF=20 python3 tools/splice2.py out/video.full_crf16.mp4 out/video.mp4 0:321:out/patch/r1.mp4:0 321:350:out/patch/q1.mp4:265 350:421:out/patch/r2.mp4:350 421:485:out/patch/q1.mp4:265 485:540:out/patch/q2.mp4:485 540:687:out/patch/r3.mp4:540 687:692:out/patch/p2b.mp4:652 738:756:out/patch/p3.mp4:738 1046:1162:out/patch/q3.mp4:1046 1162:1263:out/patch/r4.mp4:1162` (52.0 MB). The round-2 splice, for reference: `CRF=20 python3 tools/splice.py out/video.full_crf16.mp4 out/video.mp4 0:10:out/patch/p1.mp4 265:485:out/patch/q1.mp4 485:590:out/patch/q2.mp4 652:692:out/patch/p2b.mp4 738:756:out/patch/p3.mp4 1046:1162:out/patch/q3.mp4 1162:1185:out/patch/p4_tail.mp4` (one re-encode, about 1 min). The CRF 16 render is 190 MB because of the per-frame grain; CRF 20 is 52.8 MB (CRF 19 was 92 MB, CRF 21 was 28 MB).
- `out/final.mp4`: 53.4 MB, 42.1 s, 1080 x 1920, H.264 + AAC 256 kb/s (round 2 before the final check: 54.2 MB).
- Total for round 2, from first edit to final: about 2 h 45 min, about half of it render time. Music bed: `bedH_caper` (unchanged from round 1).

## Honest weaknesses

- **The plaque is big.** One fixed 796 x 320 px slab (about 12% of the frame) buys total legibility and stability, but every composition now lives above y 1158, so close shots crop the cat at the chest and some sets had to be raised (books, rock, plinth, counter) to stay in view.
- **Still slow to render.** About 5 s per frame per worker; round 2 needed one full render and seven patch ranges.
- **Whips still blur.** As asked, each is 4 or 5 frames, but 3 of those frames are motion blur or star streaks; the step-two landing frame (10.73 s) is still slightly soft.
- **Short arms.** He still cannot lift the jar overhead, and the "Rocket Lab" thumb is mostly hidden behind the counter (the head turn carries it).
- **Black clay detail.** At phone size the fingerprints and mottling read clearly on the cream coat, the rock and the sets; on the black head they are subtle.
- **The gags simplify.** A kitchen scale on Phobos reading "15 g" stands for ESA's "will only weigh the equivalent of 15 grams"; the slow fall is illustrative (no fall time is claimed). Both are labelled "Illustration, not to scale".
- **Small type.** The credit line is 22 px IBM Plex Mono inside the plaque: readable on a phone, but small. The hanging drop tag is 290 to 570 px wide (it grows as the camera cranes) for about 2 s; the flag type on the props is about 38 to 55 px.
- **Two scales of set.** The orrery table and the Phobos ground are different sets joined by whips, so Mars changes size between them.
- **Purity note.** `renderAt(t)` is a pure function of `t` (seeded hashes and a seeded PRNG only). The one `Math.random` in the page is inside three.js itself (object UUIDs), which never affects a pixel. The cat's pose is sampled on twos while cuts land on exact frames, so props that must vanish on a cut use the real `t`.
- **Sound** uses only the shared library SFX (no clay squelch or cotton foley), with 20 cues.
