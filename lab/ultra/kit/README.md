# Ultra kit: MMX heist Short (shared by every animation style)

Seven animation-style agents each build one Downlink Cat Short from this kit. The story, the voice, the caption timings, the real images and the music are the same for all of them; only the look and the motion change. Built Oct 20, 2026.

Story: Japan's MMX launched on H3 flight No.10 (04:41:03 JST, Oct 20, 2026; 19:41:03 UTC, Oct 19) to land on Phobos, grab at least 10 grams and bring them home in 2031.

## What is in the kit

| File | What it is |
|---|---|
| `script.md` | Title, the 11 narration lines (`> `), emphasis words, sources. Fact-checked; do not change a word. |
| `facts.md` | The quote table for every claim the script makes, extra verified numbers that may go on screen, the NEXT event, hard limits, and the exact credit for every asset. |
| `voice.mp3` | The narration, locked Downlink Cat voice (Gemini TTS, voice Puck). **40.608 s** (ffprobe). Verified against the script: content 0, spelling 0, minor 0. |
| `voice.words.json` | Whisper word timings of `voice.mp3` (timing source only). |
| `captions.json` | **The caption schedule: 89 script words, every one timed** (89 matched, 0 substituted, 0 interpolated), from `pipeline/engine/align_captions.mjs`. `words[i].text` is the script word, `start` and `end` in seconds. "Downlink Cat" is kept together. |
| `voice.json` | Voice model, direction, takes, cost, verification record. |
| `assets/` | 25 real, public-domain files: 13 images, 5 videos, 2 NASA 3D models, 5 texture maps. |
| `assets/credits.json` | For every asset: `credit` (exact, on screen), `source_url`, `license` (with the quoted terms), title, what it shows, pixels, notes. |
| `assets_preview.jpg` | Contact sheet of the images and textures (a preview only, never in a video). |
| `voice.orig.mp3`, `voice.words.orig.json`, `work/` | The full take before the last-line splice, every take and transcript. Do not use. |

Voice: 89 words, 40.61 s, $0.0304 in all (3 full takes $0.0279, one last-line splice $0.0019, checks $0.0007). All three full takes ended with "Downlink Cat" heard as "hat" or "at", so the kept take (take 3) had its last line re-voiced and spliced in a pause (`voice.py --splice-last-line`); the spliced file then verified clean. Details in `voice.json` (`splices`, `verification`).

## Line timings (from captions.json, 30 fps)

| Time | Frames | Line |
|---|---|---|
| 0.15 to 3.43 s | 4 to 103 | This moon is on a slow-motion collision course with Mars. |
| 3.43 to 7.33 s | 103 to 220 | Japan just launched a heist to steal a piece of it. |
| 7.33 to 10.27 s | 220 to 308 | Step one: Mars, August 2027. |
| 10.74 to 14.86 s | 322 to 446 | Step two: drop a lookout. A 25 kilo rover. |
| 14.86 to 18.14 s | 446 to 544 | On Phobos, it weighs... 15 grams. |
| 18.99 to 22.90 s | 570 to 687 | Step three: the grab. Coring arm, nitrogen blaster. |
| 22.90 to 24.90 s | 687 to 747 | Target: at least 10 grams. |
| 25.59 to 30.42 s | 768 to 913 | Step four: one burn to leave Mars. Capsule lands in Australia, 2031. |
| 30.92 to 34.34 s | 928 to 1030 | The loot? First piece of Phobos ever brought home. |
| 34.89 to 38.73 s | 1047 to 1162 | Next: Rocket Lab aims to launch three HawkEye 360 satellites, Wednesday. |
| 38.89 to 40.29 s | 1167 to 1209 | Follow Downlink Cat. |

Emphasis words (the narrator punches these; good hit points for motion): collision course, heist, steal, 2027, lookout, 25, 15 grams, grab, nitrogen, 10 grams, 2031, loot, First. Whisper word starts can be up to about 0.2 s early; check big hits against the waveform.

List every word with its frame: `python3 -c "import json;[print(i,w['text'],round(w['start']*30)) for i,w in enumerate(json.load(open('lab/ultra/kit/captions.json'))['words'])]"`

## Assets at a glance (full detail in `assets/credits.json`)

- Hero Phobos: `images/phobos_color_hirise_6800km_PIA10368.jpg` (3374 x 3300) and `..._5800km_PIA10369.jpg` (3515 x 3474), HiRISE color, made from the lossless TIFFs. Taken ten minutes apart from slightly different angles.
- Deimos: `images/deimos_color_hirise_PIA11826.png` (two views; the right one has a burned-in "2 km" bar, so crop to one view).
- Mars: `images/mars_global_color_viking_PIA00407.jpg` (6787 px full disk).
- Phobos from the ground: `video/phobos_eclipse_perseverance_PIA25179.mp4` (720 x 720, 50 s) and its still; `video/phobos_transit_perseverance_2024_PIA26380.mp4` and `_figA.mp4` (512 x 512); `images/phobos_annular_eclipse_curiosity_PIA17356.png` (three frames, a flip-book); `video/phobos_passes_deimos_curiosity_PIA17352.gif` and `.mp4` (Phobos passing Deimos, 20 s, which NASA says matches the actual elapsed time).
- Home beat: `images/earth_setting_phobos_rising_curiosity_PIA26362.jpg` (native vertical 1080 x 2100, Phobos and Earth in the inset) and `images/earth_moon_from_mars_hirise_PIA10244.png` (Earth and Moon from Mars orbit, tiny: use small).
- Small or special: `phobos_deimos_two_moons_curiosity_PIA17350.png` (200 px), `phobos_occults_deimos_curiosity_PIA17353.png`, `mars_phobos_deimos_infrared_europa_clipper_PIA26567.png` (infrared, points of light), `phobos_thermal_six_views_odyssey_PIA23893.jpg` (FALSE-COLOR temperature: label it as an infrared view if used).
- 3D: `models/phobos_nasa.glb` (glTF 2.0, 16,449 vertices, 32,040 triangles, embedded 2048 px texture atlas, bounding box about 24.4 x 20.5 x 27.0 units = km) and `models/deimos_nasa.glb` (16,649 vertices, 32,512 triangles, 1024 px atlas, about 15.0 x 11.9 x 10.5 km). Load with three.js `GLTFLoader` (pin an exact version from cdnjs or jsdelivr) or parse the GLB yourself.
- Textures (equirectangular): `textures/mars_viking_color_mosaic_usgs_8192x4096.jpg` and `_4096x2048.jpg` (USGS colorized Viking mosaic; longitude -180 to 180, east positive), `textures/mars_texture_nasa3d_1440x720.png`, `textures/phobos_texture_nasa3d_1440x720.png`, `textures/deimos_texture_nasa3d_1440x720.png` (grayscale).

Not included, on purpose: any JAXA, DLR, CNES or ESA image or video (their terms forbid commercial use or modification without permission, see the research notes in `facts.md` section 5 and the JAXA and DLR terms), NASA's MEGANE photo (co-credited to JAXA and APL), the ESA/DLR Phobos HRSC mosaic, PIA10370 (overexposed) and PIA02992 (a printable globe of gores, not a map).

## Music

Nine beds, all 120 BPM on the Motion.md grid (one beat = 15 frames at 30 fps), 64 s, -16 LUFS, with loop points, in `lab/sound/beds/beds.json`. Three are new today for this kit (Google Lyria 3 Clip through OpenRouter, $0.04 each):

| Bed | Mood | Fits |
|---|---|---|
| `bedG_cinepulse` | cinematic, adventurous, driving (orchestral-hybrid with a synth pulse) | the mission-trailer read of the heist |
| `bedH_caper` | playful, sneaky, mischievous (chiptune-adjacent synth caper; full groove from its 15 s mark) | the heist-plan read, step one to step four |
| `bedI_darkpulse` | dark, tense, cold (sub pulse, ticking hats, drone) | a doom-moon hook, tense countdown styles |

The older six (`bedA_pluck`, `bedB_lofi`, `bedC_chip`, `bedD_tense`, `bedE_arp`, `bedF_house`) stay available. Mix with:

```
python3 lab/sound/mix.py --voice lab/ultra/kit/voice.mp3 --bed lab/sound/beds/bedH_caper.wav \
  --cues <your cues.json> --out <your out>.m4a --video <your silent render>.mp4 --mux <your final>.mp4
```

`cues.json` is a list of `{"frame": N, "fps": 30, "type": "...", "sfx": "name"}` (types and SFX in `lab/sound/mix.py` and `lab/sound/sfx/`); an empty list `[]` gives voice, bed and the sonic logo. Tested today with all three new beds and this voice: no warnings, bed 20 LU under the voice while talking, final -13.9 LUFS. Music origin and terms: `lab/sound/beds/LICENSE.md`.

## Rules every animator must keep

1. **Only facts in `facts.md`.** Every number, date, label and diagram claim on screen must come from the quote table or the extra-numbers list there, worded as given. No sampling year. No "MMX is healthy" or "phoned home". Keep the hook's either/or (crash into Mars or break up into a ring). Use the gravity, mass and rover numbers exactly as `facts.md` section 5 says.
2. **Exact credits on real images.** Whenever a file from `assets/` is on screen, its `credit` from `assets/credits.json` is on screen too, small and readable, exactly as written. No NASA, JAXA, ESA, CNES or DLR logos or insignia anywhere. Nothing may suggest that NASA or any agency endorses the channel.
3. **No AI-generated images or video.** Every picture is either a real image from `assets/` or drawn by you in code (SVG, Canvas, WebGL, CSS). Do not generate images, textures or footage with any image or video model, and do not run real images through one. Do not paint fake detail into the real images (crop, scale, pan, grade and mask are fine; adding craters or spacecraft into a photo is not).
4. **Illustrations must look like illustrations.** MMX, the H3 rocket, IDEFIX, the corer, the gas sampler and the capsule are drawn in code. Give them a clear drawn style (line art, flat shapes, diagram labels, stylized shading) so no viewer could take them for a photo or for real footage, and never caption them as photos. They are simplified and were not checked against JAXA drawings, so avoid precise-looking engineering detail. IDEFIX is a machine: never an Asterix-style character or a dog.
5. **Captions are the narration words, verbatim, timed from `captions.json`.** Take each word's text and its `start`/`end` from `captions.json`; do not retype, paraphrase, re-spell or re-time them from your own transcript. Numbers stay as the script writes them ("2027", "25 kilo", "15 grams", "HawkEye 360"). "Downlink Cat" stays on one line.
6. **Use the kit's voice as is.** Do not re-voice, cut, speed up or reorder `voice.mp3`. The video is as long as the voice plus the end card and logo (about 41 to 43 s).
7. **The mascot.** Night Shift is a young, nerdy black cat with echo-mark eyes: a solid amber dot and a hollow ring. Keep him recognizable in every style (rigs and references in `lab/mascot/`).
8. **Format.** 1080 x 1920 (9:16), 30 fps, per `design-system/README.md` and `design-system/Motion.md` (the channel's colors, type and motion rules), unless your style brief says otherwise.
9. **Do not edit the kit.** It is shared. Work in your own folder and read from here.
