# Signal Delay motion v2: MMX (Launch Day)

One self-contained page, `anim.html` (1080 x 1920, 30 fps), that draws every frame as a pure function of time (`window.renderAt(t)`). The length, the caption words, the caption timing and every beat come from `captions.json`, so a new voice needs only a new mp3 and its `words.json`.

## Files

| File | What it is |
|---|---|
| `align_captions.mjs` | Makes `captions.json`: caption WORDS from the script, TIMING from the transcript. |
| `build.mjs` | Makes `anim.html` from `src/anim.template.html`, `captions.json`, `img/*.webp` and the mascot rig (`lab/mascot/v2/rig`). |
| `src/anim.template.html` | The animation source. Edit this, not `anim.html`. |
| `img/` | Photo cutouts made by `tools/prep_images.py` from `lab/assets/nasa/` (credits in `lab/assets/nasa/credits.txt`). |
| `tools/mux.sh` | Adds the narration at -14 LUFS (true peak -1.5 dB) and keeps every video frame. |
| `tools/check_sync.mjs` | Checks that each caption word appears within 2 frames of its spoken time. |
| `tools/export_cues.mjs` | Writes `out/cues.json` (frame and type of every event that could take a sound). |
| `tools/inspect.mjs` | Prints page errors, the beat anchors and the caption chunks. |
| `out/short_v2.mp4` | The finished Short with narration. `out/video.mp4` is the silent render. |

## Swap the voice

1. Put the new `voice.mp3` and its `voice.words.json` in one folder. The JSON is `{ "audio": "voice.mp3", "duration": 37.2, "words": [{ "w": "Mars", "start": 0.36, "end": 0.68 }, ...] }`; `audio` must name the mp3 next to it.
2. Make the caption schedule. Caption words always come from the script (the lines that start with `> `), never from the transcript:

   ```
   node align_captions.mjs ../../voice/script_mmx_v3.md path/to/voice.words.json
   ```

   It matches script words to transcript words in order (case and punctuation do not matter, "fifty" = "50", "H-3" = "H3"), and gives any word the transcript missed a time inside the gap it falls in. It prints which words were interpolated. The length is taken from the mp3 itself (ffprobe), not from the JSON.
3. Build and check:

   ```
   node build.mjs              # prints the frame count, for example "1117 frames = 37.2333 s"
   node tools/inspect.mjs      # must print no errors; shows the anchors and caption chunks
   ```

   If the script wording changed, `inspect.mjs` reports `anchor not found: /^word$/`. The anchors (the spoken words that start each beat) are listed in `src/anim.template.html` under "timing from the caption schedule"; point the missing one at the new word and rebuild.
4. Render, using the seconds that `build.mjs` printed:

   ```
   node ../../motion-ab-test/render.mjs anim.html 37.2333 30 out
   ```

   (Stills only: add `frames=0,120,975` as a fifth argument.) A full render takes about 5 minutes.
5. Add the narration, then run the checks:

   ```
   bash tools/mux.sh path/to/voice.mp3          # writes out/short_v2.mp4
   node tools/check_sync.mjs                     # writes out/caption_sync.json
   node tools/export_cues.mjs                    # writes out/cues.json for the sound mixer
   ```

## Swap the mascot rig

`build.mjs` bundles `lab/mascot/v2/rig/core.mjs` and `catA.mjs` at build time and prints their hashes. If the rig changes, rebuild and re-render; the page calls only `CatRig.draw({ expression, pose, lookX, lookY, blink, mouthOpen, earTwitch, tail, pointAngle, state })`.
