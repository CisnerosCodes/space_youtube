# Downlink Cat render engine

The daily pipeline cannot hand-build a 1,000-line page per Short. This engine turns a declarative shot list (written each day by a director model, see `DIRECTOR.md`) into one self-contained `anim.html` that keeps the render contract (`window.renderAt(t)`, a pure function of t, 30 fps, 1080 x 1920).

## Styles

| `"style"` | What it is | Code |
|---|---|---|
| `"anime"` (the house style since Oct 20, 2026, and the default) | The look of `lab/ultra/anime/`: cel-shaded Night Shift with expressions, poses and lip sync, Pho the grumpy Phobos, kinetic captions with emphasis lettering, STEP / NEXT bands, speed and focus lines, impact frames, whip pans with motion blur, photo lenses, panels and cutouts with credits, katakana SFX, the echo-mark end card. | `lib/build_anime.mjs`, `lib/validate_anime.mjs`, `anime/*.js`, `schema_anime.json` |
| `"classic"` | The flat v1 look with the v3 cat (the pilots). Kept so older Shorts rebuild; a shot list with a `cat` timeline and no `style` builds as classic. | `build.mjs`, `lib/validate.mjs`, `runtime/`, `shots/`, `schema.json` |

## Anime: daily use

```sh
node pipeline/engine/align_captions.mjs <short>/script.md <short>/voice.words.json <short>/captions.json [--alias heard=script]
# the director writes <short>/shotlist.json with "style": "anime" (DIRECTOR.md part A), then:
node pipeline/engine/build.mjs <short>                       # anim.html, out/cues.json, out/build_report.json, out/caption_sync.json
pipeline/engine/tools/stills.sh <short> <QA frames>          # stills at beat and line boundaries + out/qa_sheet.png
node lab/ultra/render_fast.mjs <short>/anim.html <seconds> 30 <short>/out/video.mp4 --workers=3
python3 lab/ultra/anime/tools/pse.py <short>/out/video.mp4 --json <short>/out/pse.json   # flashes and motion per second
python3 lab/sound/mix.py --voice <short>/voice.mp3 --bed lab/sound/beds/<bed>.wav --cues <short>/out/cues.json \
  --out <short>/out/mix.m4a --video <short>/out/video.mp4 --mux <short>/out/final.mp4 --bed-under 18 --report <short>/out/mix.report.json
python3 lab/ultra/anime/tools/strip.py <short>/out/final.mp4 <short>/out/lines.png <line-boundary frames> 6 0.25
```

`<seconds>` is the build report's `seconds` (the narration, then 48 frames for the sonic logo).

A short example (from `examples/artemis_anime/shotlist.json`):

```json
{ "version": 1, "style": "anime", "series": "HOW DOES THAT WORK", "title": "Artemis II Heat Shield", "bed": "bedD_tense",
  "facts": "factcheck.md", "stress": ["39", "4,000", "nine", "103."], "impacts": ["39", "4,000", "186", "nine", "103."],
  "assets": { "splash": { "file": "img/splash.jpg", "credit": "NASA/Josh Valcarcel", "focus": [0.12, 0.12, 0.76, 0.72] } },
  "beats": [
    { "id": "hook", "start": "Orion#1", "shot": { "type": "hook", "image": "splash", "frame": "full", "overlay": "focus",
        "keys": [{ "at": "39", "zoom": 3.0, "focus": [0.4, 0.66, 0.2, 0.2], "frames": 8 }] },
      "chips": [{ "at": "39+6f", "lines": ["MAX VELOCITY:", { "t": "39 TIMES THE SPEED OF SOUND", "c": "amber" }] }],
      "sfx": [{ "text": "ゴゴゴ", "at": 0, "for": 36, "pos": [690, 560] }] },
    { "id": "cabin", "start": "and", "transition": { "type": "whip", "dir": "up" }, "source": "NASA",
      "shot": { "type": "craft", "craft": "crew-capsule", "bg": "limb", "plasma": { "at": "and" }, "window": "cool", "rot": -0.5 } },
    { "id": "shock", "start": "Fahrenheit.", "hit": true, "transition": { "type": "smash" },
      "shot": { "type": "react", "who": "ns", "bg": "cyan", "faces": [{ "at": "Fahrenheit.", "expr": "shock" }] } },
    { "id": "how", "start": "How?#1", "source": "NASA", "shot": { "type": "band", "style": 1, "words": ["How?#1", "How?#1"] } },
    { "id": "nextband", "start": "NASA#2", "source": "NASA", "shot": { "type": "band", "style": "next", "label": "NEXT", "stamp": { "text": "FRI 23 OCT", "at": "updates" } } },
    { "id": "moonplans", "start": "Moon", "source": "NASA", "shot": { "type": "next", "scene": "moon", "stamp": { "text": "FRI 23 OCT", "at": "Friday," } } },
    { "id": "end", "start": "Follow", "transition": { "type": "whip", "dir": "up" }, "shot": { "type": "end", "downlink": "Downlink", "cat": "Cat" } } ],
  "cast": { "ns": { "moves": [
    { "at": "cabin", "do": "enter", "place": "right", "how": "pop" }, { "at": "mid-70s.", "do": "nod" },
    { "at": "Outside,-14f", "do": "exit", "how": "down" } ] } } }
```

## Anime: files

| Path | What it is |
|---|---|
| `lib/build_anime.mjs` | Validates, prepares images (WebP, at most 2400 px, alpha kept), inlines fonts and `anime/*.js` into `anim.html`, then renders every frame headless and runs the checks below. |
| `lib/validate_anime.mjs` | Shot list checks with specific errors: anchors, beat order and lengths, hard cuts only on a hit or an impact, band words, sources for drawn beats, assets with credit and focus, numbers on screen against the narration and the fact table, filler labels, katakana only in SFX, dates as `DDD DD MMM`, impact frames (at most 3 per second, 10 frames apart), the cast's visits and moves. |
| `anime/core.js`, `util.js` | From the hand-built entry: seeded noise, easing, line boil, cel fills, focus and speed lines, shake, stars; anchors, lip sync, blinks, and the per-frame registries (text boxes, photos drawn, illustrations drawn, caption boxes) the checks read. |
| `anime/chars.js`, `actor.js` | Night Shift (anime design: head with expressions, bust, two-bone sleeve arms, paws, from behind) and Pho; the director rig (moves anchored to words, places, gestures, expressions, look, lip sync, travel with whip pans). |
| `anime/props.js`, `props2.js`, `props3.js` | Generic drawn craft (rocket, slim rocket, probe, rover, satellite, capsule, crew capsule with heat shield, reentry fireball, parachutes), drawn Earth, Mars, Moon, Earth's limb, Phobos ground, sky, sea, clouds and flames, tags, canister, manga bursts. |
| `anime/text.js` | Kinetic captions (automatic chunks, emphasis lettering, ink-exact fit, the fitPop clamp), bands, chips, the auto credit slot, kicker with step pips, katakana SFX with safe-zone fit, slam text, the wordmark. |
| `anime/shots.js`, `shots2.js` | The shot library (below). |
| `anime/runtime.js`, `boot.js`, `page.html` | Beats, transitions (whip with motion blur, smash, iris, cut, band wipes), shake, impact frames, actors, the UI layer, sound cues, QA hooks (`window.AQ`). |
| `anime/fonts/` | Archivo (roman, italic), IBM Plex Mono 500/600, Dela Gothic One (Latin, kana and full-width slices from Google Fonts, SIL Open Font License). |
| `examples/artemis_anime/` | Proof: the Artemis II heat shield Short rebuilt in anime from a shot list (`out/final.mp4`, `out/contact_full.png`). |
| `examples/mmx_anime/` | The MMX kit (`lab/ultra/kit/`) rebuilt from a shot list (stills check; uses the hand-built entry's masked cutouts). |

## Anime: shot library

| Type | What it does |
|---|---|
| `hook` | Beat 0: a real photo that slams in (1.32x to 1x in 9 frames) with focus lines; `keys` zoom onto the subject on the hit word. |
| `photo` | A real photo: `full` (cover, handheld sway), `panel` (tilted cel frame), `circle` (lens with amber ring, slow turn, optional `scan`), `cutout` (PNG alpha), `monitor` (on Night Shift's screen, him over the shoulder, optional pull-back). `marks` ring a point on a word. |
| `number` | A giant number slams in on its word (Dela Gothic, paper and ink outline, red drop, shine; clamped inside the safe zone) over a backdrop, a drawn craft (`art`) or a lens photo. |
| `craft` | A generic drawn spacecraft on a drawn backdrop with actions (reentry fireball, parachutes, splash, liftoff with cel billows, engine burn, coring arm) and `keys` moves; smears on fast moves. |
| `compare` | Two photos or craft in lenses or panels; each value lands as a manga burst on its word (`tone: "bad"` in red). |
| `diagram` | Paths drawing in on words, a craft riding a path (oriented along it, the fireball on hot segments), hot segments, stop markers, labels, rings, bodies, the Earth's limb backdrop (rotating), camera keys and drift. |
| `react` | Night Shift close-up (expressions, a paw thrust at the camera) or Pho (expressions, reticle, the piece outline), on speed, focus, red, cyan or ray backgrounds. |
| `band` | STEP / NEXT eyecatch band (four entry styles and NEXT) carrying the narration words or a label, numeral, step pips, date stamp, Night Shift's face. |
| `next` | The NEXT scene (Moon, rocket on a pad, Earth, Mars, or a photo) with its chip and the date slam. |
| `end` | The end card: salute, the echo mark from his eyes into the wordmark, DOWNLINK and CAT on their words, pulses on the sonic logo, a wink. |

## Anime: checks the build runs (on every frame)

Boot and render errors; caption sync (every word drawn within 2 frames of its spoken start, banded words included); caption bounds with the pop (x 80 to 900, y 260 to 1500); text at rest in the same box (chips, labels, slams, bursts, tags, stamps, band words, SFX, the wordmark, credits; text that is entering, leaving, popping or shaking is exempt); the credit audit (a real photo on screen without its exact credit, or a drawn illustration without an "Illustration" credit, fails); the flash limit (at most 3 impact frames per second). Notes: Night Shift's share of the runtime, his number of overlay moves, frames where an overlay covers a quarter of a photo subject, credits with 3 or more lines.

## Anime: render time

Build and every-frame checks: about 15 s for 34 s. Render with `lab/ultra/render_fast.mjs --workers=3`: about 65 s for the 34 s Artemis proof (1,016 frames); mix about 25 s. No frame folder on disk.

# Classic style

## Daily use

```sh
# 1. captions: script words, voice timings (fails loudly when they disagree)
node pipeline/engine/align_captions.mjs <short>/script.md <short>/voice.words.json <short>/captions.json [--alias heard=script]
# 2. the director writes <short>/shotlist.json (DIRECTOR.md), then:
node pipeline/engine/build.mjs <short>                 # anim.html, out/cues.json, out/build_report.json
pipeline/engine/tools/stills.sh <short> 0,47,145,...   # stills (the QA frames the build prints) + out/qa_sheet.png
node pipeline/engine/tools/inspect.mjs <short> 230,249 # which rectangles the cat touches on those frames
# 3. render, mix, clean up
(cd lab/motion-ab-test && node render.mjs <abs short>/anim.html <seconds> 30 <abs short>/out)
python3 -I pipeline/engine/tools/sheet.py <short>/out/frames <short>/out/contact_full.png 8 216 every=30
(cd lab/sound && python3 mix.py --voice <voice.mp3> --bed beds/<bed>.wav --cues <short>/out/cues.json --out <short>/out/mix.m4a \
   --video <short>/out/video.mp4 --mux <short>/out/final.mp4 --bed-under 18 --report <short>/out/mix.report.json)
node pipeline/engine/tools/check_sync.mjs <short>
rm -rf <short>/out/frames
```

`<seconds>` is the build report's `seconds` (the narration plus the hold for the sonic logo).

## Files

| Path | What it is |
|---|---|
| `schema.json` | The shot list format (JSON Schema). |
| `lib/validate.mjs` | Schema and narration checks with specific errors (`beats[3] (id 'old_record').shot.number.value: must be a number`); resolves every word anchor to a frame. |
| `build.mjs` | Validates, prepares images (WebP, at most 3200 px, inlined), assembles the page, then checks it in headless Chromium. |
| `align_captions.mjs` | The caption aligner (numbers, ordinals, aliases, split tokens, two-word names; fails on disagreement). |
| `runtime/page.html`, `runtime/core.js`, `runtime/boot.js` | The page: timing, transitions, the amber dot, motion blur, chrome (kicker, chip, credit), captions, the cat, cues, checks. |
| `shots/*.js` | The shot library (below). |
| `tools/` | `stills.sh` (stills at chosen frames + a sheet), `sheet.py` (contact sheets), `inspect.mjs` (what the cat touches), `check_sync.mjs` (caption sync, 2-frame tolerance), `profile.mjs` (render cost per beat), `compare.py` (two videos side by side). |
| `examples/p3/`, `examples/p2/` | The proofs: pilot 3 rebuilt from a shot list, and pilot 2's Webb story. |
| `DIRECTOR.md` | Instructions for the director model. |

## The shot list in brief

```json
{ "version": 1, "series": "BY THE NUMBERS", "title": "Perseverance Driving Record", "bed": "bedF_house",
  "stress": ["out-drove", "28.10"],
  "assets": { "persev": { "file": "img/persev.webp", "credit": "NASA/JPL-Caltech/MSSS", "focus": [0.45, 0.18, 0.39, 0.64] } },
  "beats": [
    { "id": "hook", "start": "A#1", "shot": { "type": "hook", "image": "persev", "frame": "right", "headline": ["OFF-WORLD", "*RECORD*"] },
      "chip": { "body": "MARS", "value": "12 min 59 s", "source": "JPL Horizons, 2026-10-15", "at": "Mars", "until": "vehicle" } },
    { "id": "old_record", "start": "The#1", "transition": { "type": "iris", "frames": 14 },
      "shot": { "type": "count", "image": "oppy", "side": "right", "number": { "value": 28.06, "style": "slam", "at": "28.06", "data": "MILES _·_ 45.16 KM" } } },
    { "id": "next", "start": "Next", "hit": true, "transition": { "type": "cut" }, "source": "NASA",
      "shot": { "type": "next", "headline": ["Next stop:", "*Idubi*"], "date": null, "pointer": { "at": "Follow", "text": "*Follow* Downlink Cat" } } } ],
  "cat": { "scale": 0.34, "moves": [ { "at": "A#1+2f", "do": "enter", "how": "pop", "box": "caption" },
                                     { "at": "out-drove-2f", "do": "gasp", "target": "el:subject" } ] } }
```

- **Duration** comes from the voice (`captions.json`): the narration, then the wordmark dot 3 frames after the last word and a 48-frame hold for the sonic logo.
- **Beats** are ordered and anchored to words: `start` is the word the beat lands on. Anchors are `"word"`, `"word#2"` (a word that occurs more than once must say which), `"word@end"`, `"word+4f"`, or a frame number.
- **Transitions** (how a beat enters): `push` (both shots travel together, a camera move, with motion blur), `iris` (the outgoing closes into the amber dot, the incoming opens from it), `morph` (shrinks into the dot, grows or draws in from it), `cut` (only on a hit word, `"hit": true`). Overlaps are 6 to 16 frames, centred on the start word.
- **Text** uses `*amber*` and `_muted_` markup. Line-art beats name their `source` (the credit slot reads `Source: NASA`); photos carry their asset's credit automatically, on every frame any of the photo shows.
- **The cat**: moves anchored to words; targets are `caption`, `caption:0.3`, `left`, `right`, `center`, `dot`, `el:<name>` (an element of the shot on screen: `subject`, `number`, `lens`, `row0`, a diagram element id, `pointer`), `el:<name>:0.3` (a spot along it), or `[x, y]`. Standing spots go through the rig's `fit` (clear of caption words and the shots' subjects). His mouth follows the narration; `stress` words get a head bob.
- No pixel layout is needed: layout is fixed by the design system (kicker y 246, chip y 302, giant numbers from y 314, captions y 1160 to 1440, credit bottom y 1498, text inside x 80 to 900). Only diagrams use coordinates, in their own unit box.

## The shot library

| Type | What it does | From |
|---|---|---|
| `hook` | Beat 0. A photo (or line art) with the series kicker and a giant headline or number; anything anchored in the first 6 frames is drawn finished on frame 0. | all pilots |
| `photo` | Full-bleed photo cut into 3 parallax layers (soft masks around the subject), pushing 3 to 7%, optional drift, punch-ins on hit words, camera keys to a new framing, ring marks with labels, an optional number on an ink box. | p1, p2, p3 |
| `lens` | A photo inside an amber-ringed circle on ink; it grows out of the dot and shrinks back into it. | p1, p2, p3 |
| `count` | A giant number (spring count-up that never shows zero, slam, or odometer roll) with a lens photo or line art under it, so the frame stays full. | all pilots |
| `bars` | Comparison bars on one scale growing at one speed (the shorter stops first), icons riding the fronts, giant count-ups per row; or a `race` of many rows. | p3 |
| `diagram` | Amber line art that draws in: paths (dashed, route: dashed behind the dot and solid ahead), circles, orbits, markers, rings with pulses, spacecraft squares, labels, glyphs (dish, dome, rocket, rover, spiral galaxy, dwarf blob, planet, binary star), hazards revealed by a view fan; a camera with keys or following the dot. | p1, p2, p3 |
| `points` | A count shown as exactly that many points (20, then 600,000) bursting out of each other, with a photo lens per stage. | p3 |
| `fact` | A claim from the source, line by line in headline type beside an amber rule, with its attribution and optional line art. | p2 (the "very unlikely" beat) |
| `next` | The NEXT card: `NEXT ON <SERIES>` kicker, headline, date (or none), lines, optional line art, the pointer box, and the DOWNLINK CAT wordmark whose echo-mark ring lands 12 frames after the dot with the sonic logo. | all pilots |
| chip | Beat-level: the signal delay chip (cuts in 4 frames after its word; the echo ring lands the real delay later when it is short, else 24 frames). | p1, p3 |
| the amber dot | The persistent actor: every shot names where the dot is when it enters and leaves (a photo's subject or its last ring mark, a lens centre, a bar icon, a diagram's dot); iris and morph transitions carry the dot between them, and diagrams move it along paths. | all pilots |

## Checks the build runs

Boot errors; the cat lint per frame (caption words, the shots' subject rectangles; crossings during travel moves and entrances or exits are reported, not failed); the cat's share of the runtime (40 to 60%) and different moves (8 or more); text inside x 80 to 900 (giant type from x 40) and y 240 to 1160 on settled frames; empty bands in y 640 to 1150 (a note); the cue count (12 to 18 per 35 s). Validation refuses: an anchor that is missing or ambiguous, a hook that is not first, a NEXT card that is not last, a hard cut without a hit word, overlaps outside 6 to 16 frames, a push outside 3 to 7%, a count without a picture under it, a photo without credit or focus, a chip without its source, an invented date format, filler labels ("not to scale", "DIAGRAM"), and a cat with fewer than 8 moves.

## Render time

About 6 minutes for a 37 s Short (1,113 frames) on this machine (4 cores), the same as the hand-built pilots; `renderAt` itself averages 36 ms a frame (`tools/profile.mjs`), the PNG screenshots take the rest. Frames are about 1.2 GB for 37 s; delete `out/frames/` after encoding.
