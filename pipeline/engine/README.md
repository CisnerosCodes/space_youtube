# Downlink Cat render engine

The daily pipeline cannot hand-build a 1,000-line `anim.html` per Short. This engine turns a declarative shot list (written each day by a director model, see `DIRECTOR.md`) into one self-contained `anim.html` that keeps the pilots' bar: one continuous piece (a persistent amber dot carries across beats, motion carries through every transition), the cat moving through the Short, captions from word timings, the NEXT card, and the render contract (`window.renderAt(t)`, a pure function of t, 30 fps, 1080 x 1920).

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
