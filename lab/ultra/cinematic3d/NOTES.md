# cinematic3d: the MMX heist as a physically lit three.js short

Entry for the ultra experiment (Oct 20, 2026). Same story, voice, captions and facts as the other six entries; this one is the "no mascot" control: real NASA 3D models and the USGS Mars map, lit like a film, with clean cinematic titles. The only cat is a one-second cameo of Night Shift's echo-mark eyes on the end card.

## Files

| Path | What it is |
|---|---|
| `src/index.template.html` | Page shell: CSS, overlay DOM, import map (three@0.169.0 from cdn.jsdelivr.net, pinned) |
| `src/main.js` | Everything else: renderer, post pipeline, models, shots, titles, captions, credits, end card |
| `build.py` | Writes `page.html`: inlines `main.js`, the 89 caption words from `kit/captions.json`, and the three real assets as base64 |
| `page.html` | The self-contained render page (about 24 MB, because the assets are embedded) |
| `cues.json` | 16 sound cues for `mix.py` (one `wordmark_echo` at frame 1213) |
| `tools/stills.mjs` | Renders chosen times to PNG with one browser (QA) |
| `tools/sheet.sh` | Labeled contact sheet from stills |
| `tools/contact.sh` | One-frame-per-second labeled contact sheet from a video |
| `qa/r0` to `qa/r7` | Contact sheets from every QA round (the full-size stills were deleted to save space) |
| `qa/final/` | Frames pulled from the delivered video: the kit's line-boundary frames (`line_boundaries.png`), the cuts and whips (`trans.png`), and a master vs encode crop (`crop_compare.png`) |
| `out/video.mp4` | Silent render (two-pass H.264 at 9.5 Mbps, 50.3 MB; see below) |
| `out/mix.m4a`, `out/mix.report.json` | Mix and its report |
| `out/final.mp4` | Final Short with sound, 42.5 s, 1080 x 1920, 30 fps, 51.7 MB |
| `out/contact.png` | Contact sheet of the final render, one frame per second |
| `out/render.log` | Render log |

Rebuild and render:

```
python3 lab/ultra/cinematic3d/build.py
node lab/ultra/render_fast.mjs lab/ultra/cinematic3d/page.html 42.5 30 lab/ultra/cinematic3d/out/video_master_crf16.mp4 --workers=2 --webgl
# the film grain makes the CRF 16 master about 132 MB, so it is re-encoded two-pass to 9.5 Mbps for a final under 60 MB
ffmpeg -i lab/ultra/cinematic3d/out/video_master_crf16.mp4 -c:v libx264 -preset slow -b:v 9500k -maxrate 14000k -bufsize 20000k -pass 1 -profile:v high -pix_fmt yuv420p -an -f mp4 /dev/null
ffmpeg -i lab/ultra/cinematic3d/out/video_master_crf16.mp4 -c:v libx264 -preset slow -b:v 9500k -maxrate 14000k -bufsize 20000k -pass 2 -profile:v high -pix_fmt yuv420p -movflags +faststart -an lab/ultra/cinematic3d/out/video.mp4
python3 lab/sound/mix.py --voice lab/ultra/kit/voice.mp3 --bed lab/sound/beds/bedG_cinepulse.wav --cues lab/ultra/cinematic3d/cues.json \
  --out lab/ultra/cinematic3d/out/mix.m4a --video lab/ultra/cinematic3d/out/video.mp4 --mux lab/ultra/cinematic3d/out/final.mp4 --bed-under 18 \
  --report lab/ultra/cinematic3d/out/mix.report.json
```

## Why the assets are embedded

Headless Chromium blocks `fetch()` of `file://` URLs and treats `file://` images as cross-origin, so WebGL refuses them as textures. `build.py` therefore embeds `models/phobos_nasa.glb`, `models/deimos_nasa.glb` and `textures/mars_viking_color_mosaic_usgs_8192x4096.jpg` as base64 `<script type="text/plain">` blocks; the page decodes them with `atob`, parses the GLBs with `GLTFLoader.parse`, and turns the Mars JPEG into an `ImageBitmap`. Nothing else is loaded except three.js and the two Google fonts.

## Shot list (all times from captions.json)

| Time | Shot | Real data on screen | Illustration on screen |
|---|---|---|---|
| 0 to 3.43 | Hook: Phobos 3D model huge and side-lit, Mars's limb with its haze below, slow push and roll. Title PHOBOS, then "1.8 m (6 ft) closer to Mars every 100 years" (NASA) and a dashed amber arc pointing at Mars | Phobos model, USGS Mars | none |
| 3.43 to 5.37 | Night launch: camera rides up with the H3, plume lights the smoke, whip up with motion blur. LIFTOFF, 04:41:03 JST, Oct 20, 2026 (JAXA) | none | H3 |
| 5.37 to 10.12 | MMX cruising (own camera layer), Mars a small disc upper right; on "Step one" the camera pushes past MMX (it blurs out, rack focus) and Mars grows from a dot to a looming globe. MARS, Arrival: August 2027 (NASA) | USGS Mars, Deimos model (far) | MMX |
| 10.12 to 11.74 | Whip pan (directional motion blur) onto Phobos with Mars behind; the quasi-satellite loop draws on with a small MMX riding it; callout "Quasi-satellite orbit, a loop close to Phobos" (JAXA) | Phobos model, USGS Mars | MMX, QSO loop |
| 11.74 to 14.86 | On the surface: MMX hovering, silhouetted against Mars, drops IDEFIX. LOOKOUT, "IDEFIX rover, by CNES and DLR", 25 KG count-up | Phobos model (ground, soft focus), USGS Mars | MMX, IDEFIX |
| 14.86 to 18.99 | Low macro shot: IDEFIX touches down, floats up in the tiny gravity, lands tilted and rights itself; grains fly on long ballistic arcs. 15 GRAMS (ESA), "Same 25 kg rover" | Phobos model, USGS Mars | IDEFIX |
| 18.99 to 22.90 | MMX descends against a huge Mars and lands (dust ring); the coring arm unfolds and drills; the gas sampler fires. Pinned callouts: "Coring arm, digs down to 2 cm" (JAXA), "Nitrogen gas sampler, high-pressure gas" (NASA) | Phobos model, USGS Mars | MMX, IDEFIX |
| 22.90 to 25.59 | Low hero angle on the landed craft, arm stowing. "at least 10 GRAMS" (JAXA, ESA) | Phobos model, USGS Mars | MMX, IDEFIX |
| 25.59 to 26.73 | Liftoff from Phobos, thruster dust | Phobos model, USGS Mars | MMX |
| 26.73 to 28.20 | The burn: side view, blue-white plume streaming back toward a receding Mars, flash and anamorphic streak. ONE BURN, "A single main-engine manoeuvre" (JAXA) | USGS Mars, Phobos model (far) | MMX |
| 28.20 to 30.92 | Re-entry: log-distance pull-back from the glowing heat shield to a long plasma streak over Earth's night side and its twilight limb. AUSTRALIA, 2031; kicker "Sample capsule, about 60 cm across" | none | Earth, capsule |
| 30.92 to 34.89 | The loot: hard cut with a soft flash; Phobos turns and Stickney rolls into the hard light, Mars defocused behind. FIRST, "First mission to return material from the Mars system" (JAXA) | Phobos model, USGS Mars | none |
| 34.89 to 38.85 | NEXT: three small satellites on an amber orbit just above a glowing limb. ELECTRON, "Rocket Lab, 3 HawkEye 360 satellites", WED 21 OCT (Launch Library 2) | none | Earth, satellites |
| 38.85 to 42.5 | End card: dim Mars; two echo-mark eyes open in the dark, blink, glance, then fly into place as the echo mark leading DOWNLINK CAT; the dot pulses with the sonic logo's note and the ring rings out with its echo 12 frames later | USGS Mars | none |

## Techniques

- **Layered rendering with per-layer focus.** Each shot renders up to three passes (sky, ground or world, subject) into 4x MSAA half-float targets. Each layer gets its own Gaussian focus blur (half or quarter resolution, radius in pixels) and they are composited back to front with premultiplied alpha. That is how the rack focus works (MMX blurs out as Mars sharpens), how the ground on Phobos sits in soft focus behind a sharp rover, and how illustrations at a different scale share a frame with the real 27 km moon.
- **Ground occlusion and shadows across layers.** In the surface shots the subject pass draws Phobos depth-only (no color), so terrain still hides the craft correctly, and the ground pass draws the craft as invisible shadow casters, so MMX and IDEFIX cast real shadows onto the blurred real terrain.
- **Physically based look.** One hard directional sun (PCF soft shadow map fitted per shot: 36 km box for whole-moon shots so Phobos self-shadows, 9 km box at the landing site), a faint red fill from Mars's direction (Mars-shine) on Phobos's night side, almost no ambient. HDR all the way; the final pass does ACES filmic (three.js's fitted RRT/ODT), a mild saturation and vignette, slight chromatic aberration, seeded per-frame film grain.
- **Bloom and anamorphic streak.** Soft-threshold bright pass, three blurred mips (1/4, 1/8, 1/16), plus a very wide horizontal blur of the 1/8 mip for the streak on the sun, the burn and the re-entry.
- **Motion blur on fast moves.** A 16-tap directional blur in the final pass, driven per shot (the launch whip, the Mars-to-Phobos whip pan).
- **Mars atmosphere.** A ray-traced haze shell (impact parameter of each view ray against the planet): a soft glow just outside the limb and a thin haze just inside, butterscotch on the day side and blue toward the terminator. The same shader, bluer and brighter, draws the illustrated Earth's limb.
- **Real-data handling.** The Phobos GLB's own 2048 px atlas and geometry, with metalness forced to 0 and roughness to 1 and a slight warm grade. The model has black no-data patches at its poles, so every Phobos shot is pitched to keep them out of view. A landing site was chosen by ray casting the mesh (Mars about 16 degrees above the local horizon), and a 33 x 33 height grid around it is precomputed so feet, dust and the rover sit on the real terrain.
- **Illustrations look drawn.** MMX, IDEFIX, H3, the capsule and the satellites are built from primitives with a three-step toon ramp and ink edge lines (amber edges on the panels), never PBR, and the credit line says "Illustration" (plus "not to scale" where they share the frame with the real moon) with the facts source.
- **Particles.** Seeded CPU particle systems written each frame from pure functions of t: launch smoke lit by the plume, ballistic regolith grains in low gravity, the nitrogen burst, thruster puffs, the plasma trail.
- **Titles.** DOM over the canvas: Archivo light at width 125 with letter-by-letter blur-in and tracking that tightens over 1.6 s; numbers in Archivo 800 that slam from 1.12 scale and count up (never showing 0); IBM Plex Mono kickers and sources. Captions are the 89 words of captions.json, each appearing on its start frame, newest word amber.

## QA rounds

1. Round 0: hook too dark (Mars invisible), surface shots showed the model's 0.4 km facets in sharp focus and no Mars in the sky, capsule hidden by its own glow, NEXT camera inside the orbit looking away from Earth, wordmark cut off.
2. Round 1 to 3: relit the hook (side light, Mars brighter), chose a new landing site with Mars low behind the craft, split the surface into sky, soft ground and sharp subject layers, rebuilt the burn as a side view, rebuilt the capsule as a side tracking pull-back over the night side, re-aimed NEXT, fitted the wordmark, replaced the 3D orbit spiral (edge-on, it only showed as a stray line) with a 2D arc.
3. Round 4 to 7: line-boundary frames from the kit table; replaced a pan that left an empty black frame (10.3 s) with a whip pan; re-aimed the grab and liftoff cameras so Mars sits behind MMX; pinned callouts with a dark backing and kept them inside x 900; card exits now end before the next card starts; fixed a purity bug (the cruise shot did not reset the arm pose, so a worker starting mid-timeline could draw a different arm); pulled the launch camera back and cut the plume light so the rocket is not blown out; IDEFIX now rides between MMX's legs (DLR: "in its travel position between the probe's landing legs") and MMX lands clear of the rover; satellites turned wings-along-track; end-card wordmark lifted off Mars's limb; QSO callout reworded to JAXA's "an orbit that flies close". Two full renders were stopped early so the final one carries all of this.

## Render and mix

- Final render: 1275 frames (42.5 s at 30 fps) in **3328 s (55.5 min)** wall time with `--workers=2 --webgl` (SwiftShader, CPU WebGL), about 2.2 s per frame per worker on an idle machine and 4 to 5 s per frame per worker under the shared load (load average about 16 while another agent rendered). Page load about 6 s per worker (decoding 24 MB of embedded assets and ray casting the landing-site height grid).
- The CRF 16 master was 132 MB because of the grain; the two-pass 9.5 Mbps encode is visually identical on a detailed crop (`qa/final/crop_compare.png`). The master was then deleted (it would exceed GitHub's 100 MB file limit and is reproducible from `page.html`).
- Mix: bed `bedG_cinepulse`, `--bed-under 18`, 16 cues (whooshes on the cuts and whips, impact_big on 25 KG, 15 GRAMS and 10 GRAMS, a riser landing on the burn, a swell on the loot, page turn on NEXT, sonic logo at frame 1213). Result: -13.9 LUFS integrated, -2.1 dBTP, bed 18.0 LU under the voice while talking, no warnings.

## Best moments

- 0.0 s: first frame is already a finished composition: the real Phobos model, huge and side-lit, over the hazy limb of Mars.
- 8 to 10 s: the push past MMX (it melts out of focus) into a full, slowly turning Mars from the USGS map.
- 10.1 to 10.5 s: whip pan with motion blur from Mars onto Phobos, which lands in front of the looming planet as the quasi-satellite loop draws on.
- 12 to 13 s: MMX hovering in silhouette against Mars, dropping IDEFIX from between its legs.
- 16 to 18 s: IDEFIX floating up off the ground in Phobos's tiny gravity against Mars as 15 GRAMS slams in.
- 19 to 23 s: MMX landing in front of a Mars that fills the sky, the arm drilling and the gas burst firing.
- 26.7 to 28 s: the burn: a blue-white plume streaming back toward a shrinking Mars.
- 28.2 to 30.9 s: the pull-back from the glowing heat shield to a long plasma streak over Earth's night side.
- 31 to 34.8 s: Phobos turning Stickney into the hard light.

## Honest weaknesses

- **The surface sequence leans on soft focus.** The NASA model's triangles are about 0.4 km across and its texture is about 13 m per texel, so close to the ground the real terrain is smooth and faceted. I hid that with a shallow-focus ground layer rather than adding detail (adding fake craters would break the no-fake-detail rule). The ground reads as soft, dark regolith, not as a crisp landscape.
- **Scale is cheated, openly.** MMX is drawn about 50 times too big and IDEFIX about 130 times too big next to the 27 km moon so they read at all. The credit line says "not to scale", but a viewer may still come away with the wrong sense of size.
- **The illustrations are simple.** MMX, IDEFIX, H3 and the capsule are box-and-cylinder toon models with ink edges. They read as illustrations (as required), but beside the photoreal moons they can look like props; the H3 launch is the weakest shot (generic rocket, flat smoke, no real launch site).
- **Earth has no real data.** The kit has no Earth map, so Earth is a drawn dark sphere with a lit limb (and a faint graticule on the NEXT card). Australia is named, never shown.
- **Not one continuous camera.** 5.4 to 11.7 s is one move and the surface section is one place, but the launch, the capsule, the loot and the NEXT card are hard cuts (each lands on a hit word, two with a soft flash).
- **The control has no character.** Without Night Shift, nothing in the piece reacts or acts; the spectacle and the titles carry it. The 1 s eye cameo on the end card is the only warmth.
- **Physics liberties for the look:** stars are visible next to sunlit bodies, Mars's albedo is graded up a little, and the drop and bounce are time-compressed (a real 40 m fall in Phobos gravity takes about two minutes).
- **Small things:** the AUSTRALIA card is still fading for one frame after the loot cut; at 18.1 s the righting rover is cropped by the bottom edge; the dust is simple soft sprites; the "LAUNCH DAY" kicker sits at y 236 (the channel's fixed kicker position), just above the y 260 caption zone that the rules require for captions.
- **Render cost:** about 55 minutes for 42.5 s under shared load on CPU WebGL, so iteration relied on single stills; two full renders were stopped early to fold in fixes.
