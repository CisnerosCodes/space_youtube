# Pilot 1: LAUNCH DAY, MMX ("Mars has a moon that is falling")

One self-contained page, `anim.html` (1080 x 1920, 30 fps, `window.renderAt(t)`, every frame a pure function of t). It rebuilds `lab/design/v2` on the new narration take (`voice.mp3`, 35.76 s) with the v3 mascot actor (`lab/mascot/v3`).

| File | What it is |
|---|---|
| `script.md`, `voice.mp3`, `voice.words.json`, `voice.json` | Script with sources, narration, its word timings, the TTS request |
| `align_captions.mjs` | Makes `captions.json`: caption words from the script, timing from `voice.words.json` (copied from v2) |
| `build.mjs` | Makes `anim.html` from `src/anim.template.html`, `captions.json`, `img/*.webp` and the bundled v3 actor |
| `src/anim.template.html` | The animation source. Edit this, not `anim.html` |
| `img/` | Photo cutouts (copied from `lab/design/v2/img`, made from `lab/assets/nasa/`) |
| `tools/inspect.mjs` | Page errors, beat anchors, caption chunks |
| `tools/catlint.mjs` | The cat checks: `Actor.lint` against caption line boxes and photo subjects, safe zone, screen share, moves used (`out/cat_lint.json`) |
| `tools/check_sync.mjs` | Every caption word against its spoken time (`out/caption_sync.json`) |
| `tools/export_cues.mjs` | The curated cue list in `lab/sound/mix.py` format (`out/cues.json`) |
| `tools/proof.py` | `out/contact_full.png` (every 30th frame) and `out/motion_proof.png` |
| `tools/sheet.py` | QA sheets from stills |
| `metadata.json` | Upload metadata |
| `FOLLOWUPS.md` | Beats, QA rounds, checks, deviations, open items |

## Rebuild and render

```sh
cd lab/pilots/p1_mmx
node align_captions.mjs script.md voice.words.json      # captions.json
node build.mjs                                           # anim.html; prints the frame count (1094 = 36.4667 s)
node tools/inspect.mjs && node tools/catlint.mjs
node ../../motion-ab-test/render.mjs anim.html 36.4667 30 out      # out/frames + out/video.mp4
python3 -I tools/proof.py out/frames 117,382,455,976
node tools/check_sync.mjs anim.html captions.json && node tools/export_cues.mjs
python3 ../../sound/mix.py --voice voice.mp3 --bed ../../sound/beds/bedE_arp.wav --cues out/cues.json \
  --out out/mix.m4a --video out/video.mp4 --mux out/final.mp4 --bed-under 18
rm -rf out/frames
```

The page renders 21 frames (0.7 s) past the end of the narration with the finished wordmark and the cat idling, so the sonic logo has room without an ffmpeg `tpad`.
