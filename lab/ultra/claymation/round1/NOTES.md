# Claymation entry: MMX heist (Downlink Cat, ultra experiment)

Entry `claymation`, built Oct 20, 2026. The same Short as the other six entries (kit voice, captions, facts), made as a stop-motion clay film in three.js.

## Files

| Path | What it is |
|---|---|
| `claymation.html` | The self-contained page (built). `window.renderAt(t)` is a pure function of `t`; `window.__ready` builds the sets. three.js r159 inline, fonts and the one photo as data URIs. |
| `build.mjs` | Builds `claymation.html` from `src/*.js` (in name order), `data/glyphs_titan.json`, the fonts and a downscaled copy of the HiRISE Phobos photo. |
| `src/00_util.js` | Seeded PRNG, hash noise, Perlin, easing, springs, keyframe helpers, `twos(t)` (pose time on twos). |
| `src/10_clay.js` | The clay material (MeshStandardMaterial patched with `onBeforeCompile`) and geometry lumping. |
| `src/30_cat.js` | Night Shift built from primitives, plus the pose evaluator (tracks, blinks, ear flicks, breathing, lip sync, clay jitter). |
| `src/40_set.js`, `src/41_craft.js` | Clay Mars, Phobos and Earth; paper flags; the clay H3, MMX, rover, capsule, Electron, satellites, kitchen scale, sample jar, cotton-wool puffs, flames. |
| `src/50_captions.js` | The captions as extruded clay letters (Titan One outlines). |
| `src/60_post.js` | The lens: depth of field from a log depth in the alpha channel, whip blur, grade, exposure flicker, vignette, grain. |
| `src/70_world.js` | The three stages: the tabletop (orrery, launch pad, Earth, easel, Electron pad), the Phobos ground set, the end card. |
| `src/80_timeline.js` | Shots, camera keys, the cat's performance, every prop, flags, credit slot. |
| `src/90_main.js` | Renderer and `renderAt`. |
| `cues.json` | 20 curated SFX cues for `lab/sound/mix.py` (with a `note` per cue). |
| `shot.mjs`, `tools/probe.mjs`, `tools/capcheck.mjs`, `tools/contact.py`, `tools/splice.py`, `tools/glyphs.mjs` | Stills, a world-to-screen probe used for layout, the caption QA (timing and safe zone), the contact sheet, the frame-range patch splicer, the glyph extractor. |
| `vendor/three-0.159.0.min.js` | three.js r159, exactly as served by `https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js`. |
| `fonts/` | Titan One, Kalam Bold, IBM Plex Mono SemiBold (all OFL, from the google/fonts repo via jsDelivr). |
| `out/video.mp4`, `out/final.mp4`, `out/mix.m4a`, `out/mix.report.json`, `out/contact.png`, `out/caption_sync.json` | Silent render, muxed final, mix, mix report, labelled contact sheet, caption QA result. |

Rebuild and render:

```sh
cd lab/ultra/claymation
node build.mjs
node ../render_fast.mjs claymation.html 42 30 out/video.mp4 --workers=2 --webgl
python3 ../../sound/mix.py --voice ../kit/voice.mp3 --bed ../../sound/beds/bedH_caper.wav --cues cues.json \
  --out out/mix.m4a --video out/video.mp4 --mux out/final.mp4 --bed-under 18 --report out/mix.report.json
python3 tools/contact.py out/final.mp4 out/contact.png
```

## The film

One tabletop world, shot like a stop-motion feature. Night Shift plans the heist on a clay model of the Mars system.

| Time | Shot |
|---|---|
| 0 to 3.4 s | Close on a clay potato Phobos on its brass orrery pin, a huge out-of-focus clay Mars behind, Night Shift looking up at it. On "collision course" he gasps (squash, stretch, ears back, hands to cheeks) as the camera pulls back and an amber clay snake rolls out a spiral toward Mars. Paper flag: "1.8 m (6 ft) closer to Mars every 100 years". |
| 3.4 to 7.3 s | Whip pan to the launch pad. The clay H3 (four boosters, plain white, no logos) lights up, cotton-wool smoke bursts out, it climbs on twos. The cat flinches from the blast, then turns to camera with a sly half-lidded grin on "heist", rubs his paws, snatches at the lens on "steal", points up after the rocket. Flag with the launch time (JST and UTC). |
| 7.3 to 10.3 s | "Step one": he scampers across the table holding a clay MMX up on a stick, like a kid with a toy plane, and holds it up next to Mars for "August 2027". |
| 10.3 to 18.1 s | Vertical whip into a second set: the Phobos ground, giant clay Mars on the horizon. MMX hovers and drops the rover onto a kitchen scale ("25 kg"); paper flag "Rover dropped from about 40 m, in free fall". On "15" the dial flips to an amber "15 g", the needle drops, the rover floats up and the cat's jaw drops; on "grams" he pokes it and it drifts away. |
| 18.1 to 22.9 s | MMX lands (legs squash, dust puffs; flag "About 2 to 3 hours on the surface"). "The grab": he mimes a grab. Cut to the coring arm reaching down (flag "Corer digs to 2 cm"). Cut wide on "nitrogen blaster": cotton gas puffs blast across the ground and hit the cat. |
| 22.9 to 25.0 s | Macro on a glass sample jar labelled "at least 10 g", clay crumbs dropping in, the amber lid pops on with "grams". |
| 25.0 to 30.4 s | Vertical whip back to the table: MMX by Phobos, "one burn" lights the engine and it whips across to clay Earth; the capsule comes down under a striped parachute onto a raised clay Australia; the cat cheers on "2031". |
| 30.9 to 34.3 s | "The loot?": the capsule hatch pops, the jar flies into his paw; he raises it on "First". Behind him a print of the real Phobos (HiRISE, PIA10368) on a clay easel, credited on screen. |
| 34.9 to 38.7 s | NEXT: pan to a slim black clay Electron with three clay satellites that bounce as he counts them; flags "NEXT: Rocket Lab Electron, three HawkEye 360 satellites" and "WED 21 OCT". |
| 38.7 to 42 s | End card: a puppet-theatre ledge. The echo mark (an amber clay dot and ring) and the clay wordmark (DOWNLINK in off-white, CAT in amber) plop in letter by letter; Night Shift pops up behind the ledge and waves; the ring sends out an echo ping on the sonic logo cue (frame 1212). |

## Techniques

- **Clay material.** One MeshStandardMaterial program for everything, patched with `onBeforeCompile`: (1) a fingerprint height map drawn once on a canvas with a seeded PRNG (wobbly concentric whorls and loops, sculpting-tool strokes, pores, broad thumb pushes), applied by triplanar mapping in object space and turned into a normal perturbation with screen-space derivatives (Mikkelsen bump, non-normalized so it stays in world units at any distance); (2) a soft wrap-around rim term that reads as subsurface scattering; (3) per-vertex "boil" noise along the normal. Geometry is lumped on the CPU with fBm displacement and seam-free smoothed normals, so silhouettes are hand-made and slightly uneven.
- **On twos.** Every character pose, prop move, puff, flag pop, caption pop and flame flicker is evaluated at `floor(t * 15) / 15`; the camera moves smoothly at 30 fps, like a motion-control rig over a stop-motion set. On top of that, each pose frame gets tiny seeded transform jitter (the animator's hands), a shifted fingerprint pattern on the characters (clay boil) and a ±1.8% exposure flicker.
- **Night Shift in clay.** Built only from primitives: an ellipsoid head, cone ears with amber-brown insides, capsule tuft, the echo-mark eyes (a solid amber disc with a pupil on viewer-left, a hollow amber torus on the right), off-white brows, nose and replacement mouths (a "w" tube rebuilt per pose, or an open mouth with a tongue), the headset with a crooked boom mic and cable, a lathe-turned oversized jacket with collar, placket, pockets and the echo mark on the chest, capsule sleeves with cuffs, mitten paws, two-bone legs, a tapered tube tail rebuilt each pose. A pose-to-pose track system (holds plus eased or overshooting transitions) drives about 45 channels; on top run seeded blinks, ear flicks, breathing, tail sway, a scamper cycle locked to distance (feet do not slide), and lip sync from the caption word timings with head bobs on the emphasis words.
- **Lens.** The scene renders into an 8-bit 4x MSAA buffer with gamma-encoded colour and a log depth in alpha (one pass, no depth pre-pass). A half-resolution gather pass makes the bokeh (44-tap golden-angle disc with scatter-as-gather weighting so blurry backgrounds do not bleed over sharp foregrounds); a full-resolution composite keeps in-focus pixels sharp. Whip pans are blurred along the camera's real screen-space motion. ACES tone mapping, a gentle warm/cool split grade, vignette and fine grain.
- **Captions are clay.** Every caption word is extruded clay type: Titan One outlines extracted to JSON with opentype.js, built with three.js `ExtrudeGeometry` (bevelled), lumped, and lit in their own overlay scene with a real shadow on an invisible shadow catcher behind them, plus a soft dark scrim in the lens pass. Words plop in on twos (stretch, squash, settle) from their exact `captions.json` start frame; emphasis words are amber.
- **Facts as props.** Paper flags on toothpicks and labels (Kalam handwriting on a fibrous paper texture) carry the extra facts, popping in and out on twos. Layout was checked with a world-to-screen probe so every flag sits inside the safe area.
- **Real image.** HiRISE color Phobos (PIA10368), downscaled only, printed on an easel card; the credit slot shows its exact credit whenever any corner of the print is inside the frame (tested per frame by projection).

## QA

- Three rounds of stills (line boundaries, every big moment), looked at each time, plus a full contact sheet of the final.
- `tools/capcheck.mjs` runs the real timeline for all 1260 frames: all 89 words appear within 1 frame of their spoken start, and every caption box stays inside x 92 to 886, y 277 to 1449 (the zone is x 80 to 900, y 260 to 1500). "Downlink Cat." is kept on one line by the wrapper.
- Fixed between rounds: flag text colour bug, flags cut off by the narrow 9:16 frame (re-laid out with the probe), the camera passing through the cat on the coring beat (now two cuts), the scale's body poking through its dial, a too-close push-in on "piece of it", the jar hidden inside the cat's head on "First" (arms are too short to lift it overhead, so he now holds it up to the side), caption overshoot leaving the safe zone, "Downlink Cat." wrapping onto two lines.

## Render time

- Full render: 1260 frames (42 s at 30 fps), `render_fast.mjs --workers=2 --webgl`, **3217 s (53.6 min)**, about 5.1 s per frame per worker. The machine was shared with another agent's render the whole time (load average 9 to 15 on 4 cores); single stills on a quieter machine took about 2 to 3 s.
- After reviewing the full render, five frame ranges were re-rendered from the final page with `--from/--to` and spliced in with `tools/splice.py` (one re-encode, x264 CRF 20, to bring the file under 60 MB): 48 to 130 (the spiral now stops short of Mars's surface), 325 to 440 (the drop flag says "Rover dropped from about 40 m, in free fall", moved clear of the falling rover; the needle now slams on "25"), 628 to 633 and 653 to 658 (no whip blur across the two hard cuts of the coring beat), 1205 to 1260 (the dot pulses on the logo's signal and the ring pings on its echo 0.40 s later). Patch renders: 302 + 471 + 184 + 16 + 16 s, run two at a time, about 8 min wall.
- Total wall time for the final video, renders and splice: about 63 min. Where the time goes: SwiftShader (CPU WebGL) shading 1080 x 1920 with 4x MSAA and a soft shadow map, plus the half-resolution bokeh pass.
- `out/final.mp4`: 54.8 MB, 42.0 s, 1080 x 1920, H.264 + AAC; mix -13.9 LUFS integrated, -2.1 dBTP, bed 18 LU under the voice while talking, sonic logo from 40.42 s (ends 41.87 s, inside the end card).

## Honest weaknesses

- **It is slow to render.** About 5 s per frame per worker on this shared CPU box, so a full re-render costs nearly an hour; late fixes were patched in by frame range instead of re-rendering everything.
- **The cat's arms are short for his big head.** He cannot lift the jar over his head on "First", so he holds it up beside his face. His walk and scamper are a simple procedural cycle (no real weight shift), and lip sync is syllable-based, not phoneme-based.
- **Two scales of set.** The orrery table and the close-up Phobos ground are different sets joined by vertical whip pans (a stop-motion convention), so Mars changes size between them; a viewer may notice.
- **Some beats are thin.** The coring arm is on screen for under a second and its corer tip is small; the nitrogen puffs are modest; the "Step four" shot of MMX beside Phobos is a little dark and empty before the burn; the NEXT pan opens on about half a second of empty table before the cat arrives.
- **Whip pans.** The whip back to the table at 25.0 s passes through a few frames of plain blue table under motion blur, and every whip leaves the bokeh stars as streaks; it reads as a fast camera move, not a cut.
- **Small type.** The credit tag (23 px IBM Plex Mono on a paper label) and the paper flags are readable on a phone but small; the flags hold for 1 to 3 s each, so the longer ones (launch time, drop height) are a quick read.
- **Captions.** The clay letters are bold and well inside the safe zone, but their bevels and clay texture make them softer than flat type, and a dark scrim and shadow sit behind them, slightly dimming the set in the lower third. The groups are short (2 to 5 words), so lines change often.
- **Simplifications by design.** The H3, MMX, IDEFIX, capsule and Electron are toy-like approximations (no logos, no engineering detail). The kitchen scale shows the narration's numbers ("25 kg", "15 g") as a gag; the fact behind it is ESA's "will only weigh the equivalent of 15 grams". The collision-course spiral shows the path, labelled with the slow rate, but the 50-million-year either/or (crash or ring) is not on screen.
- **Depth of field** is a half-resolution gather; at hard depth edges in the macro jar shot there is slight haloing, and the grain is per frame while poses are on twos.
- **Purity note.** `renderAt(t)` is a pure function of `t` (seeded hashes and a seeded PRNG only). The one `Math.random` in the page is inside three.js itself (object UUIDs), which never affects a pixel.
- **Sound** uses only the shared library SFX (no clay squelch or cotton foley), with 20 cues.
