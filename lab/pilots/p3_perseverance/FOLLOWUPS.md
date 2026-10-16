# Pilot 3: BY THE NUMBERS, Perseverance's driving record (review log and follow-ups)

Script `script.md` (77 words), voice `voice.mp3` (Gemini Puck, 35.976 s). Render: 1106 frames at 30 fps (36.867 s: the narration plus a hold for the sonic logo, which starts at 35.28 s and ends at 36.73 s; the last frame is the finished wordmark). Built from a copy of the motion v2 template (`lab/design/v2` was not edited) with the mascot v3 actor (`build.mjs` bundles `lab/mascot/v3/rig`: core.mjs f439d0f328, catA.mjs 77cdcabfd8, actor.mjs 5521613974).

## Files

| File | What it is |
|---|---|
| `anim.html` | The Short, self-contained (`window.renderAt(t)`, pure function of t). Built by `node build.mjs` from `src/anim.template.html`, `captions.json`, `img/`. |
| `align_captions.mjs` | Copy of the v2 aligner plus two normalizations: an ordinal suffix is ignored ("11th" = "11") and "checked" times the script word "checks". |
| `tools/merge_words.mjs` | Writes `voice.words.merged.json` (the original `voice.words.json` is untouched): joins split numbers ("28" ".10") and fills the dropped gap (below). |
| `tools/prep_images.py` | Makes `img/` from `lab/assets/perseverance/` (credits in its `credits.txt`). |
| `tools/inspect.mjs --lint`, `tools/check_sync.mjs`, `tools/export_cues.mjs`, `tools/proof.py`, `tools/sheet.py` | Errors, anchors, chunks and the cat lint; caption sync; the cue list; contact sheet and motion proof; QA sheets. |
| `out/final.mp4` | The mixed Short (1106 video frames, AAC 48 kHz). `out/video.mp4` is the silent render, `out/mix.m4a` the mix, `out/mix.report.json` the mixer report. |
| `out/contact_full.png`, `out/motion_proof.png` (frames 60, 222, 534, 830), `out/cues.json`, `out/caption_sync.json`, `out/cat_lint.json`, `out/qa/` | Checks and QA sheets. |
| `metadata.json` | Upload metadata. |
| `work/` | Gap clip and its re-transcription, the Horizons response, image previews. |

## The transcript gap

The transcript dropped "Next stop, Idubi, to look for ancient" (27.42 to 30.06 s). I clipped 27.2 to 30.9 s (`work/gap_27.2.mp3`) and re-transcribed it with `lab/voice/align.py`: "Next stop, Idubi, to look for ancient hot water systems." Whisper's word times inside the clip drift (it puts "hot" at 29.74 s; the full transcript and the waveform agree on 30.06 s), so each word's start is the speech onset measured on the waveform (20 ms RMS), taken in the re-transcription's order: Next 27.86, stop 28.10, Idubi 28.44, to 29.08, look 29.18, for 29.34, ancient 29.56. No word is interpolated. Caption sync: 77 words, largest difference 0.4 frames, none outside 2 frames.

## Beats (frames come from the narration)

| Frames | Narration | Picture | Credit slot |
|---|---|---|---|
| 0 to 53 | A robot on Mars just out-drove | Perseverance selfie (PIA26574), 3-layer parallax push, punch-in on "out-drove". Chip SIGNAL DELAY MARS 12 min 59 s from 26 (ring 50). Cat pops up from behind the caption box, gasps. | NASA/JPL-Caltech/MSSS |
| 54 to 144 | every vehicle ever sent to another world. | The selfie shrinks onto the Perseverance icon of NASA's infographic; every vehicle's track races in at one speed (the graphic's own km scale, labels cropped out); the camera pulls back to all twelve, then pushes in on the top two; ring on Perseverance on "world". Cat hops right, points, is yanked out on a line. | NASA/JPL-Caltech |
| 141 to 251 | On October 11 it passed 28.10 miles. | The chart leaves up, the record-sol NAVCAM image (PIA26812) rises in. SUN 11 OCT; an odometer (amber on an ink box) rolls 28.06 to 28.10 like a mechanical counter; MILES · 45.22 KM. Cat drops in, thumbs up, hops right; the number flies into his sign "28.10 MILES". | NASA/JPL-Caltech |
| 252 to 373 | The old record, set by Opportunity, was 28.06. | Opportunity's self-portrait (PIA17759) in a lens; 28.06 slams; MILES · 45.16 KM. Cat holds the sign, points, zips out. | NASA/JPL-Caltech/Cornell Univ./Arizona State Univ. |
| 374 to 525 | Opportunity needed almost fifteen years. Perseverance took five and a half. | The lens shrinks into Opportunity's infographic icon; two year bars on one scale (one tick per year) grow at the same speed with each icon riding its front; the counts land on 15 and 5.5. | Source: NASA · rover icons NASA/JPL-Caltech |
| 526 to 672 | How? It drives itself, mapping hazards while rolling. | Everything leaves left; the Perseverance icon becomes the amber dot. Cat drops in on a line, WHAT, listens, nods, points. Line art: the dot drives up a field of rocks; a view fan maps each rock as it comes into range; dashed driven path, solid plan ahead. Cat zips out. | Source: NASA |
| 673 to 739 | Sojourner checked 20 points ahead. | Sojourner (PIA01122) drops in as a large lens and irises down to the corner; "20" counts up as 20 points pop in ahead of a viewpoint dot. | NASA/JPL, then NASA/JPL · Source: NASA |
| 740 to 835 | Perseverance checks 600,000. | Hard cut inside the lens to Perseverance; the lens shrinks into the viewpoint dot; "600,000" counts up and exactly that many points burst out of the 20 (the count on screen is the number of points drawn) into a terrain carpet; at 826 the whole cloud implodes into one dot. | NASA/JPL-Caltech/MSSS · Source: NASA, then Source: NASA |
| 836 to 1105 | Next stop, Idubi, ... Follow Signal Delay to watch. | Hard cut on "Next" (the dot lands where the cloud collapsed): NEXT ON BY THE NUMBERS, NEXT STOP: / IDUBI, HUNTING ANCIENT HOT WATER, EXTENDED MISSION: ABOUT THROUGH 2028. Route line art: the dot drives to the Idubi ring (pulse on "hot"); on "keep growing" the line extends past Idubi off frame. Cat skids in, walks after the dot, points at Idubi, bounces, points at the pointer "Follow Signal Delay", thumbs up. Wordmark dot 1058, echo ring 1070 with the sonic logo. | Source: NASA |

## The cat

On screen in four windows, frames 4-118, 152-345, 536-651, 860-1105: 671 of 1106 frames, 60.7% (top of the 40 to 60% range). 15 different moves: enter pop, gasp, hop, point, exit tether, enter drop, thumbs up, sign, exit zip, WHAT, listen, nod, enter skid, walk, bounce. The mouth follows every narration word while he is on screen (stress on the brief's emphasis words), idle loops run throughout, and he is never mirrored. Fast moves get sub-frame motion blur at half the actor's shutter (the full shutter read as a grey ghost over photos).

`cat.lint` (bounding box, `out/cat_lint.json`): 102 flagged frames, all checked on stills (`out/qa/lint_check_1.png`):
- caption, frames 31-40: the pop entrance; he rises from behind the caption box (the cat layer sits under the captions, so no word is covered).
- caption, 47-55, 334-342, 640-644: hop take-off and zip crouches on the box top (the box overlaps his feet by a few px).
- subject, 54-93: his pointing arm reaches the conservative chart rectangle; the chart itself is not covered.
- safe, 78-80: the tether exit as he leaves the top of the frame.

## QA rounds (stills looked at; frame numbers)

Round 0 (38 stills): 0-45 the rover filled the frame and the cat sat on it; 75-115 chart rows ran under the captions; 150 chunk "On" alone; 200 odometer fine; 245 sign too small; 330 data line touched the lens; 425-530 the year counts overshot to 17 and 6 (easing bug); 530 the cat's drop crossed the exiting numbers; 600-670 diagram thin and in the cat's lane; 690 Sojourner upscaled full bleed was soft; 790 the 600,000 field read as a solid volcano; 980 the cat's bounce reached the data line.
Fixes: rover framed right with the hillside left for the cat; chart zoom limited (0.62) and rows faded before the caption zone; easing fixed (one constant-speed ramp for both bars); drive diagram moved right with denser rocks, the cat stays left; Sojourner as a large lens; field spread across the ground with small bumps; route lowered and the cat at 0.25 scale on the NEXT card; sign at 2.1x.
Round 1 and 2 (46 and 30 stills): the hop and the sign appeared late, the number's hand-off missed the sign (244-262); the float exit crossed the drive diagram (650); "0.5" showed as the first count. Fixed timing, exits, and the count now starts at 1.
Round 3 (18 stills): paper odometer on the scrimmed NAVCAM measured 2.7:1 at its worst pixel (3.8:1 at the 99.9th percentile), short of 4.5:1, and 35% scrim would not reach it; the odometer is now amber on an ink box (11:1). The bars now leave 8 frames before "How?" so the cat's drop is clean (528-552).

## Checks

- Caption sync: 77 of 77 words within 0.4 frames of their spoken start (`out/caption_sync.json`).
- Mix (from `lab/sound`): `python3 mix.py --voice ../pilots/p3_perseverance/voice.mp3 --bed beds/bedF_house.wav --cues ../pilots/p3_perseverance/out/cues.json --out ../pilots/p3_perseverance/out/mix.m4a --video ../pilots/p3_perseverance/out/video.mp4 --mux ../pilots/p3_perseverance/out/final.mp4 --bed-under 18 --report ../pilots/p3_perseverance/out/mix.report.json`, bed `bedF_house` (kept: it sits 18 LU under the voice while talking and 15.9 LU in gaps, and its energy is 91% below 150 Hz, so it does not fight the voice on measurement; not auditioned by ear). Final file: -14.01 LUFS integrated, true peak -2.3 dBTP. 17 cues (`out/cues.json`); the mixer's only warning is that the mix is 10 ms longer than the video (the logo ends 0.13 s before the last frame, so nothing audible is cut).
- `anim.html` was rebuilt once after the full render, only to move one cue (the morph whoosh, frame 54 to 60, to clear the chip echo). No visual change.

## Facts on screen and their sources

All from NASA, Oct 12, 2026 (https://science.nasa.gov/blogs/perseverance-mars-rover/2026/10/12/nasas-perseverance-sets-off-world-record-for-total-distance-driven/): 28.10 mi (45.22 km) on Oct. 11; old record 28.06 mi (45.16 km) by Opportunity; "five and a half years ... almost 15"; 20 measurement points vs 600,000 with every look; AutoNav images the terrain while rolling and maps hazards; Idubi and "ancient hydrothermal systems" (shown as "hunting ancient hot water", the lead's line); extension "through roughly the end of 2028" (shown as "about through 2028"). Following the risk notes: no 45.2 (the infographic labels are cropped out), no Curiosity number, no Opportunity year range. SUN 11 OCT is Oct. 11, 2026's weekday.

Signal delay chip: JPL Horizons (https://ssd.jpl.nasa.gov/api/horizons.api, COMMAND='499', CENTER='500@399', QUANTITIES='20,21', queried 2026-10-15; response in `work/horizons_2026-10-15.txt`): 1-way down-leg light time 12.98557 min at 2026-10-15 12:00 UT = 12 min 59 s (13.017 min at 00:00 UT, 12.954 min at 24:00 UT; range 1.5614 au).

## Deviations from the design system

1. The odometer is amber on an ink box rather than paper on a scrimmed photo (contrast, above).
2. The chip's echo ring lands 24 frames after the chip, not after 12 min 59 s.
3. The year counts follow the bars' constant-speed ramp (so both bars move at the same years per frame) instead of the count-up spring; they still only count up and never show zero. Other counts (20, 600,000) use the spring.
4. "600,000" is set at 189 px (measured to fit x 40 to 900) instead of 300 to 400 px.
5. NEXT card: no date line, by the lead's instruction (no firm date exists); the pointer reads "Follow Signal Delay"; the wordmark sits at y 1112 because captions run to the last word.
6. Only one hard cut on a hit word ("Next"), plus the lens cut on "Perseverance"; everything else is a continuous move.

## Unresolved and follow-ups

- The narrator says "October 11th" and "checked"; the captions show the script's "October 11" and "checks". Re-voice or accept.
- The infographic misspells "Perserverance"; that label is cropped out, but anyone opening the source will see it.
- The infographic is "as of October 12" and NASA's article "as of Oct. 11"; only the rows' tracks and icons are used, no numbers.
- Sojourner (PIA01122, 1276 px) and the NAVCAM image (1288 px) are low resolution; both are soft at their sizes here.
- The 600,000 points are drawn exactly, but the far rows saturate into solid amber at 1080 px; the terrain shape is schematic (Source: NASA covers the numbers, not the shape).
- The drive diagram, the 20-point layout and the route to Idubi are schematic line art, not the real route or the real AutoNav sampling pattern.
- The cat's on-screen share (60.7%) is at the top of the target; trim the NEXT-card entrance if the owner wants less.
- `bedF_house` was chosen on measurements, not by ear. If it fights the voice, remix with `bedB_lofi` (one command in this file's Checks section with the bed swapped).
- Not checked under the real YouTube Shorts overlay. Text stays inside x 80 to 900; line art (chart rows, route, fan) reaches the right edge, by design.
- `out/video.mp4` (13 MB) is the silent intermediate; `out/contact.png` is render.mjs's default sheet. Both can be dropped before committing.

## Rename to Downlink Cat (Oct 16, 2026)

The channel name "Signal Delay" is taken by another space channel. The Short now says and shows "Downlink Cat". The chip label SIGNAL DELAY (one-way light time to Mars) is the science term and stays.

- Narration: only the last line was re-voiced. One Gemini take (`google/gemini-3.8-flash-tts`, Puck, PCM 24 kHz, the direction in `voice.json`) of "NASA expects the record to keep growing. Follow Downlink Cat to watch." (`work/rename/take1.wav`), transcribed with `lab/voice/align.py`, spliced into the original before "Follow". The take's "Follow" onset (2.94 s) lands on the original's (34.07 s on the waveform); the cut is at 33.801 s, inside the pause where both sides are below -65 dB (RMS -73 dB original, -70 dB take), at a zero crossing with a 10 ms crossfade (largest sample step at the cut 0.0006 of full scale). The original's small lip click at 33.87 s falls after the cut and is gone. Take gain -2.9 dB: tail loudness -18.8 LUFS, the same as the original tail. The original is kept as `voice.orig.mp3`, the lossless splice as `work/rename/splice_take1.wav`, details in `work/rename/splice_take1.json` and `voice.json` (`rename_splice_2026_10_16`). One take was enough. New `voice.mp3`: 35.904 s by ffprobe (was 35.976 s).
- Re-transcription of the full new `voice.mp3` (`work/rename/voice_new.words.json`) ends "... NASA expects the record to keep growing. Follow downlink cat to watch."
- `script.md`: the last line reads "Follow Downlink Cat to watch." `voice.words.json` keeps the original words up to "growing." (original in `voice.words.orig.json`; the old merged file is `voice.words.merged.orig.json`) and takes the tail from the re-transcription of the spliced file, checked on the waveform (Follow 34.089, Downlink 34.369, Cat 34.70, to 34.949, watch. 35.129 s). `tools/merge_words.mjs` was re-run unchanged to write `voice.words.merged.json`, then `align_captions.mjs`. On the same audio this newer Whisper run times words about 0.2 s later than the original run; at the tail the waveform agrees with the newer run, so the tail captions sit on the spoken words.
- `src/anim.template.html`: NEXT card pointer "Follow Downlink Cat"; wordmark DOWNLINK (paper) CAT (amber), same font, size and position, echo mark still leading (measured x 208 to 847 on the last frame, so 64 px stays; the pointer box spans x 138 to 457). The ending anchors are follow and watch; nothing keyed on "signal" or "delay". New caption rule: the chunker never breaks "Downlink Cat" across lines (it had made "Follow Downlink / Cat to watch."); the ending now reads "Follow / Downlink Cat", then "to watch.", as in pilot 2. The page title never named the channel.
- New timing: "Follow" 1014 to 1023, "watch" 1055 to 1054, wordmark dot 1058 to 1057, ring 1070 to 1069. Render 1105 frames = 36.833 s (was 1106; the page still runs 48 frames past the dot).
- Cues: `tools/export_cues.mjs` re-run; only the wordmark_echo cue moved (1058 to 1057).
- `metadata.json`: tag "Signal Delay" became "Downlink Cat". The "Signal delay (Mars one-way light time ...)" source line stays. Title unchanged.
- Mix: the command in Checks above, unchanged (bed bedF_house, `--bed-under 18`). Report: -14.0 LUFS integrated, -2.3 dBTP; ffmpeg remeasure of `out/final.mp4`: -14.0 LUFS, -2.3 dBTP. Bed 18.0 LU under the voice. Logo 35.25 to 36.70 s, inside the 36.833 s video. Mixer warning: the mix is 20 ms longer than the video; that span is digital silence.
- `out/final.mp4`: 1105 video frames (ffprobe count), 36.833 s.
- Checks: stills 1000, 1023, 1036, 1048, 1054, 1057, 1069, 1080, 1104 and frames 1036 and 1104 of the encoded `out/final.mp4` looked at. Caption sync 77 words, max 0.5 frames, none outside 2 frames. `tools/inspect.mjs --lint`: 102 flagged frames, the same list as before (all before frame 650; none on the NEXT card). No "Signal Delay" channel name on screen; only the chip label.
- Voice cost: the cost lookup failed (generation id 404, key usage counter not yet moved); estimate about 0.001 USD for the take (the original 36 s take cost 0.008143 USD), plus two Whisper transcriptions.
- Not rebuilt: `out/contact_full.png`, `out/motion_proof.png` and `out/qa/` still show the old ending; `out/contact.png` and `out/rerender.log` are from the new render. `out/frames/` deleted.
