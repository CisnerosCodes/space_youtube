# Anime action entry: MMX heist (ultra experiment)

Entry "anime" for the seven-style experiment. Same story, voice, captions and facts as every other entry; the art direction is a cel-shaded, hand-drawn-feel anime action piece: line boil, speed and focus lines, impact frames, ghost smears, camera shakes, a low-angle launch with exploding cel exhaust, STEP eyecatch cards, and big face close-ups. Night Shift is redesigned as the heist leader (echo-mark eyes, headset, oversized jacket kept), and "Pho", a grumpy drawn Phobos, is the target.

## Polish round (round 2, Oct 20, 2026)

The round-1 cut placed in the top three. This round fixes every judge note, pushes the strongest beats and borrows ideas from the other entries. The round-1 final is kept as `out/final.round1.mp4`; `out/final.mp4` is the new cut.

### Judge notes and what changed

| Note | Fix |
|---|---|
| 6.0 to 7.0 s, "steal a piece of it" holds (diff 0.8) | Continuous push on Pho plus a snap-zoom punch on "piece"; the reticle jumps from Pho to the piece; the pointing arm jabs again; Pho sweats and tracks the piece; a manga insert panel slides in with Night Shift's eyes narrowing in extreme close-up. Per-second diff now 3.1. |
| 22.9 to 24.0 s, the Target shot barely moves | Rebuilt as a scope POV: the iris opens on "Target:", a handheld aim walks onto Pho, zoom snaps on "at" and "10" (radial streaks, bezel ticks turn per stage), red lock brackets close on the piece, Pho goes alarmed then furious and sweats. No numbers in the scope (tick marks only). |
| 36 to 38 s, NEXT holds on the Electron (diff 0.6 to 1.0) | Parallax truck (stars slow, rocket medium, Night Shift and the rock fast) plus a push; searchlights sweep; the three satellites fly in on "three", bob in a row, then dive into the nose one by one on "satellites" (amber pop on each); fist pump on "Wednesday". Per-second diff now 3.4 and 2.9. |
| 36 to 38 s, the cat is cropped at the frame bottom, head behind the credit | Night Shift now stands on the headland with his whole head between y 750 and 1060; a foreground rock lip hides his jacket hem at y 1355 to 1440, so he never touches the frame bottom and the credit sits on the rock. |
| WED 21 OCT only arrives on "Wednesday" | A red date stamp lands on the NEXT band on "Next:" (35 s); the Electron chip carries "WED 21 OCT" as its third line from 35.0 s on; the big stamp still slams on "Wednesday". |
| STEP 1/2/3/4 banner uses the same layout four times; the colon of "Step three:" hits the 3 | Four styles: 1 slides in from the left (amber, -8 deg, cat peeks over); 2 drops from the top and bounces (amber, +6 deg, Night Shift as the lookout with binoculars, lowers them and winks); 3 slams in from the right at -16 deg with a zoom punch and shake (red band, amber numeral, grit face and a fist from the lower left); 4 rises from the bottom with a camera roll and a numeral that zooms from 3.2x (ink band, amber type, cat peeks over the numeral). Every band shows four heist progress pips. The band words auto-fit before the numeral, so no collision. |
| End card: the wordmark bar is still empty at 40.3 s; DOWNLINK CAT lands near 41 s | The echo mark (dot and ring) flies out of Night Shift's eyes into the wordmark at 39.2 to 39.5 s; DOWNLINK slams in on "Downlink" (39.47 s), CAT on "Cat." (39.9 s); the dot pulses on the logo note (40.4 s) and the ring on its echo (40.8 s). Rotating amber rays and echo rings fill the card from 38.7 s. |
| Impact on the real Phobos photo: keep it to 1 frame | Every impact frame is now ONE frame (high-contrast ink multiplied with red, no invert). |
| About 20 full-frame impacts, two within 0.6 s; speed lines strobe at 16.5 to 18.1 s and 20.1 to 20.4 s; re-check 4.3 to 4.9 s and 30.4 to 30.6 s | 8 impact frames (collision 54, heist 147, 2027 280, 15 496, grab 604, 10 723, burn 802, 2031 886), never closer than 63 frames. The liftoff and nitrogen impact frames are gone (shake and SFX stay). Focus lines in the shock and grab shots redraw on fours, at lower alpha; the shock lightning on sixes. The white flash into "The loot?" (30.4 s) is replaced by an amber stripe sweep. `tools/pse.py`: 16 large-area transitions in 42 s (round 1: 36), at most 1 flash in any second, no red flashes. |
| 23 s, 35 s and 39 s are sparse | 23 s is the scope; 35 s adds Night Shift peeking over the NEXT band and the date stamp; 39 s has the rays, echo rings and the flying echo mark. |
| 34 s: the Earth/Phobos photo tilted on flat grey reads like a slide | One continuous move: the camera pulls back from the "First piece of Phobos" photo to reveal it on a monitor in Night Shift's dark HQ (over-the-shoulder, screen-lit rim), the screen wipes to Curiosity's photo zoomed on its own inset (Phobos and Earth), an amber echo ring marks Earth, and he leans in on "home". Both credits show during the wipe. |
| Katakana should stay off the chip zone | バシュッ moved to y 640, ロックオン to the lower right of the scope, ムカッ right of the chip. |

### Ideas borrowed from other entries

- Claymation (numbers as props): a "25 KG" paper tag pops onto IDEFIX on "25" and floats up on its string in the low gravity, swings on the rover in the wide shot and drifts up on "weighs..."; on "The loot?" Night Shift raises a drawn sample canister with an "AT LEAST 10 G" tag (with a cat chirp in the mix).
- Pixel (progress meter): four heist pips beside the LAUNCH DAY kicker from Step 1 to Step 4, and on every STEP band.
- Cinematic3d ("not to scale"): "Illustration · not to scale" joins the Mars credit whenever the drawn MMX shares the frame with the real Mars photo (the band-one fly-by and the new arrival arc).
- Kinetic (eyes resolve into the logo): the end-card echo mark is literally Night Shift's eyes flying into the wordmark.
- Papercut (scene change as a stage action): the "First piece" to "ever brought home" change is a single camera pull-back to a monitor, not a cut.

### Other pushes

- Mars, August 2027: a drawn MMX arcs in on a dashed amber trail and arrives on "2027." with an echo pulse.
- The burn: an anticipation beat (MMX settles back, shivers, the engine glows) before the burn.
- The capsule globe turns slowly; the wide shot orbits and pulls out more slowly; the "First" photo pops in on rotating treasure rays with sparkles circling it.

## Files

| Path | What it is |
|---|---|
| `page.html` | The self-contained page (built). `window.renderAt(t)` is a pure function of `t`; `window.__ready` waits for fonts and images. No timers, no Date, no unseeded randomness (all noise is an integer hash of shape id, point index and frame). |
| `build.mjs` | Inlines `src/*.js` and the caption words from `../kit/captions.json` into `page.html`. |
| `src/core.js` | Seeded hash noise, easing and springs, line boil, Catmull-Rom paths, cel fills, focus lines, speed lines, camera shake, stars, sparkles. |
| `src/chars.js` | Night Shift (anime head with expressions, bust with two-bone sleeve arms and paws) and Pho (drawn Phobos with grumpy, alarm, furious, flinch faces, anger vein, sweat). |
| `src/props.js` | Stylized illustrations: H3, MMX, IDEFIX, sample capsule, Electron, satellites, cel Mars, cel Earth centred on Australia, Phobos ground, exhaust clouds, flames. |
| `src/captions.js` | Kinetic captions (layout, auto-fit to the safe zone, per-word pop), the styled STEP / NEXT band (`drawBanner`: per-style colours, numeral zoom, pips, date stamp, exact screen boxes for QA), credit slot, fact chips, kicker, katakana SFX lettering. |
| `src/shots.js` | The timeline: shot functions, the four band styles (`BAND_ST`, `bandShot`, half-plane wipes along any axis), whip pans, the scope, the HQ monitor, `drawNSBack` (over-the-shoulder), tags and canister props, the wordmark, heist pips, the impact-frame post pass. |
| `assets/` | Masked cutouts of PIA10368 and PIA10369 (Phobos) and PIA00407 (Mars), made by `tools/masks.py` (resize and alpha mask only), and a copy of PIA26362. |
| `fonts/` | Archivo (variable, roman and italic), IBM Plex Mono 500/600, Dela Gothic One (subset with the katakana used). |
| `cues.json` | 20 SFX cues, including `wordmark_echo` at frame 1211. |
| `tools/` | `stills.mjs` (render chosen frames + grid), `capqa.mjs` (per-frame caption QA), `pse.py` (photosensitivity and per-second motion check of a video), `strip.py` (tile frames from a video), `masks.py`, `shot_hash.mjs`. |
| `out/video.mp4` | Silent render, 1080 x 1920, 30 fps, 1260 frames, 42.0 s. |
| `out/final.mp4` | Muxed final (round 2 plus the adversarial-check fixes), 42.2 MB. |
| `out/final.round1.mp4` | The round-1 final, kept for comparison. |
| `out/mix.m4a`, `out/mix.report.json`, `out/mix.log` | The mix and its report. |
| `out/contact_full.png` | Contact sheet of the final, one frame per second plus the last frame, labelled (round 1: `qa/contact_full.round1.png`). |
| `out/caption_qa.json` | Per-word first-visible frame vs spoken start, bounds check, impact rate. |
| `out/pse.json` | Photosensitivity transitions and per-second frame difference of the final render. |
| `qa/` | QA grids: round 1 (`round_r*`, `sheet`, `props`, `boundaries`, `big`, `strip*`) and the polish round (`polish_boundaries`, `polish_big_a`, `polish_big_b`, `polish_transitions_a`, `polish_transitions_b`). Individual frame folders were deleted. |

Rebuild and render:

```
cd lab/ultra/anime
node build.mjs
node tools/capqa.mjs                      # caption timing + bounds
node ../render_fast.mjs page.html 42 30 out/video.mp4 --workers=2
python3 tools/pse.py out/video.mp4 --json out/pse.json
python3 ../../sound/mix.py --voice ../kit/voice.mp3 --bed ../../sound/beds/bedG_cinepulse.wav --cues cues.json \
  --out out/mix.m4a --video out/video.mp4 --mux out/final.mp4 --bed-under 18 --report out/mix.report.json
```

## Shot list (frames at 30 fps)

| Frames | Shot | Notes |
|---|---|---|
| 0-103 | Hook | Real HiRISE Phobos slams in (1.32x to 1x in 9 frames) under paper focus lines and ゴゴゴ. One impact frame on "collision" (54), snap to the wide: real Mars rises as a horizon, an amber dashed spiral shows the slow fall, chips give the either/or and the 1.8 m (6 ft) per 100 years. |
| 97-107 | Whip pan down | Both shots on screen, speed lines. |
| 103-147 | Launch | Low-angle H3 with a Dutch tilt and slow push, vapour, ignition at "just", liftoff shake at "launched" (no flash), cel billows with warm underlight, camera tilts up, a cloud wall wipes to the reveal. |
| 147-168 | Heist leader | Head turn with ghost smear, impact frame, eye glint, ドン. |
| 168-212 | Target | Arm points, reticle closes, push in; snap zoom and reticle jump on "piece"; eye-strip insert panel; Pho alarmed, sweating, then furious. |
| 212-244 | STEP 1 band | Amber, slides in from the left, cat peeks over; MMX flies through (credit adds "not to scale"). |
| 244-314 | Mars, August 2027 | Real Mars photo, push and turn; drawn MMX arcs in and arrives on "2027." (impact frame); chip "just under one year each way". |
| 314-356 | STEP 2 band | Drops from the top with a bounce; Night Shift the lookout with binoculars, lowers them and winks. |
| 356-446 | Drop a lookout | MMX hovers, IDEFIX free-falls (smear, 40 m measure), lands, rights itself, scans; Pho inset; "25 KG" tag pops on and floats up; push and roll. |
| 446-496 | On Phobos | Slow pull-out and orbit to the whole of Pho; the tagged rover floats up on "weighs...". |
| 496-544 | 15 grams | Shock close-up (impact frame), pupils to dots, sweat, gag lightning (calmer strobe). |
| 544-600 | Recover + STEP 3 band | Shakes it off; red band slams in from the right with a zoom punch; grit face and fist. |
| 600-630 | The grab | Paw thrusts at the camera, impact frame, closes into a fist. |
| 630-687 | Coring arm, nitrogen blaster | MMX on legs, corer digs, nitrogen burst lofts grains; Pho flinch inset. |
| 687-758 | Target: 10 grams | Scope POV: iris, aim walk, zoom snaps on "at" and "10", lock brackets, impact frame on "10", Hayabusa2 chip. |
| 758-792 | STEP 4 band | Ink band rises from the bottom with a camera roll, the 4 zooms in from 3.2x, cat peeks over the numeral. |
| 792-846 | One burn | Anticipation, engine burn, exhaust, impact frame, MMX smears away from a receding Mars, Pho fumes. |
| 840-850 | Diagonal whip | Into the capsule shot. |
| 846-913 | Capsule, Australia, 2031 | Capsule streaks in onto a slowly turning drawn Earth; echo rings on the landing; "2031." impact frame. |
| 913-949 | The loot? | Amber stripe sweep (no flash), sly bust, raises the "AT LEAST 10 G" canister. |
| 949-999 | First piece of Phobos | Real Phobos photo pops in on rotating treasure rays, sparkles circle it. |
| 999-1038 | Ever brought home | Pull back to the HQ monitor, screen wipe to PIA26362's inset, echo ring on Earth, over-the-shoulder Night Shift leans in. |
| 1038-1064 | NEXT band | Paper band, cat peeks over, WED 21 OCT stamp on "Next:". |
| 1056-1162 | NEXT: Electron | Parallax truck and push, searchlights, three satellites fly in and load into the nose, fist pump and WED 21 OCT slam on "Wednesday". |
| 1156-1166 | Whip pan down | Into the end card. |
| 1162-1260 | End card | Low-angle salute; the echo mark flies from his eyes into the wordmark (1176-1185), DOWNLINK on "Downlink", CAT on "Cat."; pulses on the logo note (1212) and its echo (1224); rays and echo rings; wink. |

## Techniques

- Line boil: every outline vertex is jittered by a hash of (shape, point, boil frame); the boil frame changes every 3 frames (10 fps), 1.6 px at screen scale.
- Limited animation: characters are posed on twos (15 fps), while cameras and effects move on ones.
- Cel shading: flat base, hard clipped shadow shape, highlight shape, paper keyline around the black cat, a hard coloured rim light that changes per scene (amber, red, cyan).
- Impact frames: 8 hits on emphasis words, ONE frame each (grayscale at high contrast, multiplied with red), at least 63 frames apart.
- Ghost smears and speed lines on fast moves (head turn, MMX fly-by, rover fall, paw thrust, engine burn, satellites).
- 集中線 focus lines (regenerated on twos to fours) and parallel speed lines in the transition direction.
- Camera shake: a seeded, decaying shake from a hit list, with 3% overscan so edges never show; captions shake at 35%.
- Transitions: four STEP band styles plus the NEXT band are wipes along any axis (previous scene ahead of the band, next scene behind it); three whip pans; one pull-back into a monitor; an iris; hard cuts only on impacts.
- Insert panel (manga strip) and a scope POV with zoom snaps.
- Kinetic captions: every narration word from `captions.json`, popping in on its own frame, newest word amber; emphasis words in Dela Gothic One with a paper and ink double outline, red drop and a shine band; chunks auto-fit above the credit slot.
- Real photos: alpha-masked cutouts (crop, scale, mask only), so they sit on drawn skies without black boxes. The impact frame is the only filter, on one frame each at 54 (Phobos) and 280 (Mars).

## Rules kept

- Facts: every chip and tag is worded from `facts.md` (either/or hook, 1.8 m (6 ft), 04:41:03 JST, OCT 20, 2026 with 19:41:03 UTC, OCT 19, 27 x 22 x 18 km, just under one year each way, about 40 m free fall, crate of drinks, 25 kg / 15 grams equivalent, 2 cm, nitrogen bursts, Hayabusa2 0.1 g / 5.4 g, at least 10 g, 60 cm capsule with a heat shield, Electron, three HawkEye 360 satellites, WED 21 OCT). No sampling year, no telemetry, no readouts in the scope. The katakana are onomatopoeia, not claims.
- Credits: exact strings from `credits.json` while each photo is on screen (both during whip pans and the monitor wipe); "Illustration · facts: ..." while drawn items are on screen; "Illustration · not to scale" when the drawn MMX is over the real Mars photo. No agency logos.
- No AI images. Everything not from `assets/` is drawn in code. Illustrations are flat and stylized.
- Captions: 89 of 89 words appear on their spoken frame (delta 0 for all, `out/caption_qa.json`), 0 word-frames outside x 80-900, y 260-1500 (band words are checked through their real rotated transform); "Downlink Cat" stays on one line.
- Photosensitivity (`out/pse.json`): 16 large-area transitions, at most 1 flash in any one second (limit 3), no saturated-red flashes.
- Music: `bedG_cinepulse`. SFX from `lab/sound/sfx` only.
- Mix: -13.9 LUFS, true peak -2.1 dBTP, bed 18.0 LU under the voice while talking, no warnings. Logo starts at 40.38 s, under the finished wordmark.

## Motion (from `tools/pse.py`, 30 fps)

Per-second mean frame difference, lowest seconds: round 1 had 0.7 (6 s), 0.8 (36 s), 0.6 (37 s), 1.3 (41 s); round 2 has no second under 2.9 (37 s), with 3.1 at 6 s and 3.4 at 36 s. The mean is a little lower than round 1 (7.0 vs 8.3 on this tool) because the strobing focus lines and the 2-frame invert flashes were removed for photosensitivity.

## Render time

- Polish round: three full renders (111 s, 121 s, 133 s) and the final (170 s wall, 1260 frames, 2 workers, another agent rendering at the same time), about 0.27 s per frame per worker. Mix about 20 s.
- Round 1: final render 87 s; earlier renders 161 s and 94 s.

## Honest weaknesses

- Night Shift's head is very round and the headset band follows its top, so he can read as wearing a helmet; the spiky tuft reads a little like a crown.
- Arms are simple tube rigs; there is no full-body acting, and the end-card salute is stiff. The over-the-shoulder back view is a simple shape.
- The PIA26362 inset is small and dark in the source, so the monitor beat reads as a crescent and a dot even when enlarged.
- Smears are ghosted afterimages plus speed lines, not hand-designed smear drawings.
- Line boil is subtle (1.6 px); on a phone it may barely show.
- During the band-four camera roll and the whip pans, a chip rides with its scene and briefly overlaps the kicker for a few frames.

## Adversarial final check (Oct 20, 2026)

An independent pass over the round-2 cut, with its own tools (not the entry's own QA): every text and image draw on the canvas was instrumented for all 1260 frames (transformed screen box, alpha, the helper that drew it, and which drawn spacecraft were on screen), and the final MP4 was scanned for luma, flashes, loudness and the logo tail.

### Found and fixed

| Problem | Fix |
|---|---|
| Frame 53: the real Mars photo (PIA00407) is on screen at the bottom without its credit (the hook returned the Mars credit only once the snap passed 50%). | The Mars credit shows from the first frame Mars is drawn. |
| Caption pops left the safe area: on a word's first frame the pop scale (1.7x for emphasis words) pushed it past x 900 and off the frame ("heis", "2027" cut at the edge, "203", "Wednesd"); up to 611 px outside. The entry's own QA measured unscaled boxes, so it never saw this. | `fitPop`: the pop scale is clamped so the word's real ink stays inside x 82 to 898, y 262 to 1498; when a long word cannot grow sideways, the pop becomes a vertical stretch (at most 1.4x its width scale), a squash-and-stretch slam. |
| At rest, caption outlines (stroke, italic overhang, tilt) sat up to 27 px left of x 80 and up to 22 px right of x 900 ("15", "2031.", "Wednesday."). | `wordInk` measures the real ink box (measureText bounds, outline, drop, tilt, pop) and `layoutChunk` fits every line inside the safe area (scale down if too wide, then shift). |
| Caption shake (35% of the camera shake) could push words a few px out on hits. | The shake is clamped per chunk to the safe area. |
| "slow-motion collision course" and "Mars, August 2027." ran up to 40 px under the two-line credit box. | Those chunks sit above y 1398 (two credit lines below). |
| STEP numerals 1 to 4 sat up to x 1026 at rest, under YouTube's right-edge buttons. | Numeral font 380 to 340 px, right edge at band x 300 (inside x 900 at rest); band words start a little further left so they keep their size. |
| The NEXT band's "Next:" was ink letters with an ink outline on paper: the counters filled in and the word read as a blob. | Ink letters on a paper band get a paper outline; "Next:" is clean and readable. |
| Katakana SFX lettering reached x 1053 and y 180 (under the right-edge buttons and the top bar): ゴゴゴ, ドン (three), ムカッ, エッ!?, ガシッ, バシュッ, ロックオン, ズン. | All moved inside the safe area at rest; ガシッ moved to the empty space left of the paw. |
| The "WED 21 OCT" slam on "Wednesday" and the end-card wordmark ("T" of CAT) ended at x 908 to 912. | Slam 104 to 88 px, centred at x 490 (inside even at the overshoot); wordmark fitted to 740 px. |
| The "AT LEAST 10 G" tag started at x 71. | Tag moved 34 px right. |

### Checked and clean

- Facts: every chip, tag, stamp and credit string was read from the instrumented draws and matched against `facts.md` (either/or hook, 1.8 M (6 FT) per 100 years, 04:41:03 JST OCT 20, 2026 with 19:41:03 UTC OCT 19, 27 x 22 x 18 km, just under one year each way, about 40 m free fall, crate of drinks, 25 kg and 15 grams equivalent, 2 cm, nitrogen bursts, Hayabusa2 0.1 g and 5.4 g, about 60 cm with a heat shield, Electron, three HawkEye 360 satellites, WED 21 OCT). No sampling year, no telemetry, no readouts. Props draw no text, flags or logos.
- Credits: every frame where a real photo is drawn on screen carries its exact credit (0 misses after the frame-53 fix); every frame with drawn MMX, H3, IDEFIX, capsule, Electron or satellites carries an "Illustration" credit (0 misses). The echo ring in the HQ monitor beat sits on Earth (checked against the PIA26362 inset).
- Captions: the page's 89 words equal `kit/captions.json` (text and start); every word is drawn on its start frame (delta 0) except five words whose start falls exactly on a half frame ("This", "launched", "of", "Rocket", "HawkEye": JavaScript rounds 0.5 up, so they appear 1 frame, 17 ms, after the half-frame start; within the 2-frame limit). All 89 start frames were also looked at in the final MP4. 0 caption word-frames outside x 80 to 900, y 260 to 1500.
- Flashes (independent scan, WCAG-style, 90 x 160): 16 large-area transitions, at most 2 flashes in any one second; saturated-red changes at most 2 per second (the one-frame impact frames, 63 or more frames apart). `tools/pse.py`: at most 1 flash per second.
- Frames: no black, flat or broken frame (lowest mean luma 10.8 at frame 723, the red impact frame inside the dark scope; 687 is the scope iris opening); no page errors.
- Audio (ffmpeg loudnorm on `out/final.mp4`): -14.04 LUFS integrated, true peak -2.01 dBTP. The sonic logo starts at 40.38 s under the finished wordmark and decays to silence by 41.8 s, before the 42.0 s end.
- `out/final.mp4`: 1080 x 1920, 30 fps, 1260 frames, 42.0 s, 42.2 MB.

### What remains (by design, not fixed)

- Text that moves out of frame with its scene during a transition: chips during the three whip pans and the band wipes (1 to 3 frames each), the STEP numerals while their band slides in or out, and the "4" zooming in from 3.2x (frames 758 to 765). These are motion, not placement.
- The banner words "one:", "two:", "four:" and "Next:" are on screen for 8 to 10 frames before their band wipes out (they appear on their spoken frame). "one:" is also crossed by the MMX fly-by for its last 2 frames.
