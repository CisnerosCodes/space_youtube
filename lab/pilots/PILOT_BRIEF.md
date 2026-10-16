# Pilot build brief (shared by all three pilots)

You are building one complete, publish-ready YouTube Short for "Signal Delay". It must be better than pilot 1 v2 (`lab/design/v2/out/short_v2_mixed.mp4`), which the owner liked ("I really like it") but with two notes: the cat felt like a sticker (it needs to move through the whole Short, creatively), and the motion throughout is the most important thing for keeping viewers engaged.

## Read first
- Rules: `PLAYBOOK.md`, `VOICE.md`, `design-system/README.md`, `design-system/Motion.md`, `design-system/tokens.json`, `design-system/tokens.motion-v1.json`, `design-system/components/*/README.md`
- Research on what to avoid: `lab/research/2026-10-15_findings.md`
- The template to start from: `lab/design/v2/` (`src/anim.template.html`, `build.mjs`, `align_captions.mjs`, `tools/`, `README.md`, `FOLLOWUPS.md`, `out/contact_full.png`). Copy what you need into your own pilot folder; do not edit `lab/design/v2`.
- The cat: `lab/mascot/v3/README.md` (director API in `rig/actor.mjs`, bundle with `build/bundle.mjs`), `lab/mascot/v3/demo.html`, `moves.png`
- Sound: `lab/sound/mix.py` (run `python3 lab/sound/mix.py --help`), `lab/sound/beds/beds.json`, `lab/sound/sfx/sfx.json`. Beds are WAV in `lab/sound/beds/` (regenerate with `prep_beds.py` only if a WAV is missing).
(All paths are relative to `/home/user/space_youtube`.)

## What must be true
1. **Flow.** One continuous piece, never a slideshow: a persistent actor (the amber dot, the photo, or the cat) carries across beats; motion carries through transitions; photos in parallax layers; motion blur only on fast moves; hard cuts only on a hit word.
2. **The cat moves through the Short.** He is on screen for roughly 40 to 60% of the runtime, entering and leaving with purpose, travelling between elements (hop onto a caption box or a planet edge, ride the amber dot, float, skid), reacting to the beat (point, gasp, WHAT, shrug, thumbs up, sign with a number), talking with mouth movement on lines where he is on screen, and idling (never frozen). Use at least 8 different moves. He never covers caption words or the subject of a photo (use `lint` and `fit`), stays in the safe zone, and is never mirrored. He is a guide and a reaction, never the source of facts.
3. **Fill the frame.** Pilot 1 left the bottom half empty in many frames. Compose the full 1080x1920: large photo crops, the cat, numbers and line art working together; captions in the y 1160 to 1440 zone; nothing important outside x 80 to 900 (the H3 drawing in pilot 1 crossed x 900).
4. **Truth.** Captions are the script's words, timed from `voice.words.json` (use or adapt `lab/design/v2/align_captions.mjs`; for any gap over 1 s with script words missing, re-transcribe that gap with `lab/voice/align.py` on a clipped segment before interpolating). Show only facts that are in the script and its sources. Every photo carries its exact credit; line art carries "Source: ..." in the credit slot. An image must show what the narration says. No filler labels, no fake readouts.
5. **Ending.** The NEXT card as in the design system (pointer above the wordmark, the cat on it), using the next item given in your pilot section, never an invented date.
6. **Sound.** Export a curated cue list (no sound on every move: about 12 to 18 cues in 35 s) and mix with `lab/sound/mix.py --bed-under 18`, using the bed named in your pilot section. Hold the last frame long enough for the sonic logo (pilot 1 needed 0.7 s with `tpad`). Target -14 LUFS, true peak at or below -1.5 dBTP.
7. **Render contract.** One self-contained HTML per pilot, `window.renderAt(t)`, pure function of t, 30 fps, 1080x1920. Render with `node lab/motion-ab-test/render.mjs anim.html <seconds> 30 out` (stills: add `frames=...`). After encoding, delete `out/frames/` (about 500 MB).

## QA (required)
Stills at every beat boundary and every cat move, looked at with the Read tool; notes with frame numbers; fix; at most 3 rounds. Then the full render, a full contact sheet (every 30 frames), a `motion_proof.png` (four mid-motion frames), a caption sync check (every caption word within 2 frames of its time), and the cat `lint` report. Log notes in `FOLLOWUPS.md`.

## Deliverables in your pilot folder
- `anim.html`, `out/final.mp4` (mixed), `out/contact_full.png`, `out/motion_proof.png`, `out/cues.json`, `FOLLOWUPS.md`
- `metadata.json` for upload: `title` (names the real, dated event; under 70 characters; no clickbait the video does not deliver), `description` (2 to 4 plain sentences, then "Sources:" with the URLs from `script.md`, then "Credits:" with every image credit, then "Narration: AI voice. Music: AI-generated (Google Lyria). Mascot: original animation."), `tags` (8 to 12), `series`, `ai_disclosure` (true; music is AI-generated), `related_long_form` (null for now), `made_for_kids` (false).
- A one-paragraph self-review: what is strongest, what is weakest.

No contractions in anything you write. Do not commit or push (the lead does that).
