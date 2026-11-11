# Director guide: writing a shot list

You are the director of one Downlink Cat Short. You receive a fact-checked script, its source list, the images (with credits), and the word timings. You write `shotlist.json`; the engine (`pipeline/engine/build.mjs`) turns it into the video. You decide what the viewer sees on every word and how the cast acts. You never decide pixels the style already fixes, and you never add a fact the script and its sources do not hold.

**Anime is the house style (Oct 20, 2026) and the engine's default.** Write `"style": "anime"` and follow part A. Part B (the flat "classic" look with the v3 cat) is kept only to rebuild older Shorts; write `"style": "classic"` for it.

# Part A: anime (house style)

Read first: `PLAYBOOK.md` (House animation style), `pipeline/engine/README.md` (the anime shot library), `pipeline/engine/schema_anime.json`, and the two worked examples: `pipeline/engine/examples/artemis_anime/shotlist.json` (an engineering story on real photos, a diagram and a comparison) and `examples/mmx_anime/shotlist.json` (the house reference, the MMX heist, rebuilt from a shot list with Pho). The hand-built reference itself is `lab/ultra/anime/` (look at `out/contact_full.png`). The inputs are the same as in Part B (script, fact table, captions, images with credits and focus boxes, the NEXT event, the bed); name the fact table in `"facts"`.

## A1. Cut the script into beats

- One beat per claim, usually one per sentence or half sentence: 10 to 16 beats in 30 to 40 s (the anime cuts faster than classic). A beat starts on the word that names its subject.
- Beat 0 is the `hook` on a real photo, on the first word. The NEXT beat (a `band` with `"style": "next"`, then a `next` scene) comes before the `end` card, which starts on "Follow".
- The picture changes at least every 1.5 s. A beat longer than 2 s needs inner moves: camera `keys`, a craft travelling (`keys`), a diagram `camera`, chips landing, Night Shift acting. The build warns at 5 s.
- Words that occur more than once need `#n`; anchors ignore case and punctuation when counting ("The#8", "It#3", "Mars,#2"). The builder lists the occurrences when you forget.
- Minimum beat length: 24 frames (16 after a band).

## A2. Choose the shot for each beat

| The narration says... | Shot | Notes |
|---|---|---|
| The first line | `hook` (a `photo` that slams in) | A real photo of the subject. `frame`: `full` (cover, with `overlay: "focus"` lines), `panel` (tilted cel frame), `circle` (lens), `cutout` (a PNG with alpha, such as a masked moon). A `keys` zoom onto the subject on the hit word. |
| Something a real photo shows | `photo` | `marks` ring the exact thing named, on its word; `scan` sweeps a lens; `monitor` puts the photo on Night Shift's screen with him over the shoulder (`pull: true` continues from a full-frame shot). |
| One number (speed, temperature, mass) | `number` | The number as it reads ("4,000°F"), slammed on its word over a drawn backdrop (`bg`) or an `art` craft, or a lens `image`. Units go on the chip. One per beat. |
| A spacecraft, rocket, rover, capsule doing something | `craft` | Generic drawn craft: `capsule`, `crew-capsule`, `rocket`, `rocket-slim`, `probe`, `rover`, `satellite`; backdrops `limb`, `sky`, `sea`, `pad`, `earth`, `mars`, `moon`, `phobos`, `plasma`; actions `plasma` (reentry fireball), `chutes`, `splash`, `liftoff`, `burn`, `arm`; `keys` move it on words. It is credited "Illustration · facts: <source>" automatically. |
| Two things compared (before and after, this mission and the last) | `compare` | `layout: "lens"` (two round lenses, the first starts big), `"stack"` or `"side"` panels; each item a photo (`image`, with its own `focus`) or a drawn `craft`; `value` lands as a manga burst on `value_at`; `tone: "bad"` makes it red. |
| How something works, where something goes | `diagram` | Paths that draw in on words (`color`, `dash`), a craft riding a path (`keys` with `u`), `heat` segments (the hot part of a path), `stop` markers, labels (facts only), rings, drawn bodies; a backdrop (`limb` for reentry); `camera` keys to keep it moving. |
| A surprising number, a twist | `react` | Night Shift close-up (`faces` with `expr`: `shock`, `grit`, `smirk`...) on `cyan`, `red`, `focus` or `rays`; `paw` thrusts a paw at the camera; or Pho (`who: "pho"`, with a `reticle` and the `piece` outline). |
| "Step one:", "How?" (a numbered plan, a question turn) | `band` | The narration words drawn on an eyecatch band (`words`), `num`, `step`/`steps` pips; styles 1 to 4 enter differently (left slide, drop and bounce with binoculars, red slam with grit and fist, rising ink band with a zooming numeral). Never the same style twice in a row. |
| The closing line | `band` style `next` (label "NEXT", `stamp` with the date) then `next` | The next event, drawn (`scene`: `moon`, `rocket`, `earth`, `mars`) or on a photo; a `chip` with its facts; the date slams on its word (`stamp`). Date format `DDD DD MMM` from the source; no dated event: no stamp. |
| "Follow Downlink Cat" | `end` | The echo mark flies out of Night Shift's eyes; DOWNLINK lands on "Downlink", CAT on "Cat". |

Beat-level extras on any beat: `chips` (mono fact tags, top-left from y 330, wipe in on `at`, out on `until`), `sfx` (katakana onomatopoeia: ドン, ゴゴゴ, ゴオッ, バシュッ, ズン, ガシッ, エッ!?; never Latin letters or numbers; the engine fits them inside the safe zone), `caption` (`y`, `size`, `maxY` when the picture needs the caption elsewhere, as on a monitor shot), `source` (the facts of every drawn beat), `impact` (an impact frame on a word).

## A3. Transitions

- `whip` (`dir`: up, down, left, right or a diagonal) for a change of place: both shots travel, speed lines, real motion blur. The default between unrelated shots.
- `smash` (a cut with a 1.22x zoom punch and a shake) on a hit word or an impact.
- `iris` (an amber ring opens the next shot from a point, `at`) when the next shot grows out of something on screen (into a screen, into a scope).
- `band` beats are their own wipe; the beat after a band has no transition.
- `cut` only with `"hit": true` or an impact frame on the start word.
- Never three of the same in a row. A beat of about 30 frames between two whips reads best.

## A4. Impact frames (photosensitivity)

- `impacts` (top level) lists the words that get ONE impact frame (the whole frame turned to ink on red for one frame). Use them on the 5 to 8 biggest hits of the Short: the hook number, the record, the result, the date.
- Hard limits the build enforces: at most 3 impact frames in any second, never two closer than 10 frames. Keep them about 2 s apart (the build warns under 1.5 s). After the render, `python3 lab/ultra/anime/tools/pse.py out/video.mp4` must report at most 3 flashes in any second (the reference reports 1).
- Do not put an impact frame on a whip or a band (they already flash).

## A5. Choreograph Night Shift (and Pho)

Night Shift is the anime heist-leader design: echo-mark eyes, headset, oversized jacket. He mouths the narration (lip sync on twos), blinks, bobs. He is a guide and a reaction, never the source of a fact. He appears in three ways:

1. **Shots that draw him**: `react` close-ups, band faces (styles 1, 2, 3, 4, next), the `monitor` over-the-shoulder, the `end` card.
2. **The overlay rig** (`cast.ns.moves`), like the v3 actor: moves anchored to words.
   - Visits: `enter` (`place`: `left`, `right`, `center`, `low-left`, `low-right`, `peek-right`, `peek-left`, `peek-right-low`, `peek-left-low`, `back`, or `[x, y, size]`; `how`: `pop`, `slide`, `drop`, `smear`) ... `exit` (`how`: `down`, `slide`, `zip`). `move` (`to` a place) travels between places.
   - Gestures (hold 36 frames or until the next): `point` (`target`: `el:subject`, `el:<element id>`, `el:mark0`, `el:craft`, `el:cap`, `el:moon`, `el:rocket`, `el:face`, `camera` or `[x, y]`), `pump` (fist pump), `fist` (both fists, grit), `salute`, `wave`, `shrug`, `think` (paw to chin), `gasp` (shock face, open paws), `nod`, `lean` (toward a target), `hold` (a tag with a fact, or `"prop": "canister"`), `wink`.
   - `expr` sets the face until the next: `neutral`, `smirk`, `grin`, `happy`, `proud`, `shock`, `grit`, `wink`, `curious`, `worried`, `focus`, `meh`. Gestures bring their own face when no `expr` comes after them.
   - `look` aims his eyes and head.
3. **Pho** (`cast.pho.moves`, optional): the grumpy drawn Phobos, only in stories about Phobos, Mars's moons or small bodies where a grumpy moon fits. Places `top-right`, `top-left`, `right`, `left`, `center`, `inset-right`, `inset-left` (a manga inset panel); `expr`: `grumpy`, `alarm`, `furious`, `flinch`; `shake`, `sweat`, `piece` (the dashed outline of the piece being taken). He is credited as an illustration. Do not invent other characters.

Rules of thumb (the build reports them): Night Shift on screen about half the runtime or more (the MMX rebuild 57%, the Artemis proof 65%; the build notes under 30%); 6 or more different overlay moves; react on the words he reacts to (gasp on the surprising number, pump on the date or the record, point at the thing named, think on "How?"); exit about 10 frames before a whip so he does not cover the cut; never over a photo's subject (the build notes frames where an overlay covers more than a quarter of a subject); never mirrored; never holding a number that is not in the facts; at most one Night Shift on screen (do not put an overlay visit on a `react` Night Shift beat).

## A6. Text, credits and truth

- Captions are automatic: every narration word, verbatim, popping in on its frame; `stress` words and numbers become emphasis lettering; chunks break at sentences, pauses, commas and beat starts, and fit inside x 80 to 900, y 260 to 1398 (two credit lines under them). The pop is clamped (fitPop) so no word ever leaves the safe zone.
- Credits are automatic: every real photo drawn on a frame puts its exact credit in the slot on that frame; every drawn craft, planet, diagram or Pho puts "Illustration · facts: <beat source>". You never write credits, only `assets.*.credit` exactly as the source gives it and `source` on drawn beats.
- Every number on screen (chips, labels, slams, bursts, tags, stamps) must appear in the narration or in the fact table named by `"facts"` (`factcheck.md`); the build refuses others.
- Labels are facts only. No "not to scale", no "DIAGRAM", no readouts or telemetry, no agency logos, no flags.

## A7. Banned in anime

- More than 3 flashes in any second; impact frames on a real photo for more than one frame; white full-frame flashes (use the amber stripe or a whip).
- AI-generated images or photos run through a model; painting detail into real photos (crop, scale, mask, pan, rotate and overlay lines only).
- A drawn craft that imitates a specific vehicle's markings, a logo or a flag (they are generic).
- Katakana with Latin letters or numbers; katakana or chips over the caption block (move them up).
- A photo that does not show what the narration says (use a `craft` or `diagram` beat instead).
- Night Shift as a source of facts, two Night Shifts on one frame, a hard cut without a hit, an empty frame held for more than 1.5 s.

## A8. QA (required, at most 3 fix rounds)

1. `node pipeline/engine/build.mjs <short>`: fix every validation error and every failed check. The build renders every frame headless and checks caption sync (2 frames), caption bounds with the pop, text at rest in the safe zone, the credit audit on every frame, and the flash limit.
2. Stills at every beat and line boundary: `pipeline/engine/tools/stills.sh <short> <the QA frames the build prints>` and look at the sheet with the Read tool. For each still: does the picture show what is said; is anything cut, crossing x 900, or under Night Shift; is the frame full and moving; is the credit right?
3. Render: `node lab/ultra/render_fast.mjs <short>/anim.html <seconds> 30 <short>/out/video.mp4 --workers=3` (about 65 s for 34 s). Then `python3 lab/ultra/anime/tools/pse.py <short>/out/video.mp4 --json <short>/out/pse.json`: at most 3 flashes in any second; per-second motion should stay above about 2 (the reference averages 6.9; the Artemis proof 6.5). A second under 2 needs camera keys or acting.
4. Mix with `lab/sound/mix.py --bed-under 18` and the build's `out/cues.json`; then look at the final MP4 at every line boundary (`python3 lab/ultra/anime/tools/strip.py out/final.mp4 out/lines.png <frames> 6 0.25`).

# Part B: classic (kept for older Shorts)

The rest of this guide is the classic style (`"style": "classic"`), unchanged.

Read first: `PLAYBOOK.md`, `design-system/README.md`, `design-system/Motion.md`, `pipeline/engine/README.md` (the shot types), `pipeline/engine/schema.json`, and the two worked examples `pipeline/engine/examples/p3/shotlist.json` (a numbers story on photos) and `examples/p2/shotlist.json` (a discovery story told mostly in line art).

## Inputs

| Input | Where | What you take from it |
|---|---|---|
| Script | `<short>/script.md` (lines starting `> `) | The narration, the emphasis words, the series, the facts. |
| Sources | the script's source list | Every number, label and date you put on screen. |
| Images | `<short>/img/` and their credits | What each image shows; you must look at every image (Read tool) before using it. |
| Word timings | `<short>/captions.json` (made by `align_captions.mjs`) | The words you anchor to. List them with their frames: `python3 -c "import json;[print(i,w['text'],round(w['start']*30)) for i,w in enumerate(json.load(open('captions.json'))['words'])]"`. |
| Next event | Launch Library 2 or the story's source | The NEXT card's headline and date. No dated event: `"date": null` and a pointer to "This week in space · Sunday". |
| Bed | `lab/sound/beds/beds.json` | Never the bed of the previous Short. |

## 1. Cut the script into beats

- One beat per claim, usually one per sentence: 6 to 9 beats in 30 to 40 s. A beat starts on the word that names its subject (`"start": "Opportunity#2"`), not on a filler word.
- The hook is beat 0 and starts on the first word. The NEXT card is the last beat and starts on the first word of the closing line ("Next", "MeerKAT", "Liftoff").
- The picture must change at least every 1.5 s. A beat longer than 2 s needs inner motion: a camera key, a ring mark, a number landing, a bar growing, line art drawing in, the dot travelling. The builder warns on beats over 8 s.
- Words that appear more than once need `#n` (`"the#2"`); the builder lists the occurrences when you forget.

## 2. Choose the shot for each beat

| The narration says... | Use | Notes |
|---|---|---|
| The first line (always) | `hook` | A photo that shows the subject, framed so the subject is clear of the top-left text; a giant number from the script, or a 1 to 3 line headline (`headline_size` 100 to 140 on busy photos). Anything at the first word is drawn finished on frame 0. No photo shows it (a radio burst, an orbit): line art (`elements`) instead of `image`. |
| Something a real photo shows | `photo` | `frame` puts the subject left, center or right; leave the other side for the cat. `push` 0.04 to 0.06. `marks` ring the exact thing the narration names, on its word. `camera` keys move to a new framing on a word ("found", "So"). |
| A number from the script, with an image of its subject | `count` with `image` | The lens sits under the number on the side away from the cat. `style: "slam"` for a stated value, `"count"` to count up, `"roll"` for an odometer between two close values (28.06 to 28.10). |
| A number with no photo of it | `count` with `diagram` | Line art that shows what the number is about (the path, the two sizes), never decoration. |
| Two to four quantities compared | `bars` | One scale, one speed: the shorter bar stops first. `data` repeats the script's words ("ALMOST 15 YEARS"). |
| "Every X ever" against many items | `bars` with `race: true` | Icons from a sourced graphic (`kind: "graphic"` with `crop`); no numbers you cannot source. |
| How something works, where something goes | `diagram` | The dot is the thing moving (`dot.path`, `dot.keys`); `camera: {"follow": "dot"}` for long paths; `region: "right"` keeps the left for the cat. |
| A count you can draw (points, samples) | `points` | The count on screen is the number of points drawn. |
| A conclusion or quote from the team | `fact` | Short lines (2 to 4 words each), the decisive word in `*amber*`, the attribution in `by`. |
| The closing line | `next` | Headline names the real next event; date `DDD DD MMM` or null; the pointer on "Follow". Optional `art`: a route to the destination, the dish, the rocket. |

Rules that apply to every choice:
- **An image must show what the narration says.** A photo of a different rover, a different galaxy or a generic sky is wrong; use line art instead.
- **Fill the frame.** Numbers sit at the top; something real fills y 640 to 1150 under them (a lens, line art, bars, the cat). The build notes beats with empty bands; look at those stills.
- **One giant number per beat**, from the script. Units and conversions go on the `data` line, in `_muted_`.
- **Credits**: photos credit themselves (from `assets`); a line-art beat needs `"source"` (it shows as `Source: NASA`). Copy credits exactly as the source gives them.
- **The chip** (`"chip"` on a beat) only on the beat about a body beyond Earth orbit, with a computed value and its `source` (JPL Horizons, the article). Never guess a light time.
- Labels are facts only: names, units, places. No "not to scale", no "DIAGRAM", no fake readouts.

## 3. Choose the transitions (the flow)

- Vary them; never three of the same in a row.
- `morph` when the next beat grows out of something on screen (a photo shrinks into the icon it becomes; a lens shrinks into a diagram's dot). The dot carries across: put the dot where it should land (a `mark` on the photo, the diagram's first `dot.keys` position, a bar row's icon with `dot_row`).
- `iris` from photo to photo or photo to lens: the old shot closes into the dot on its subject and the new one opens from it.
- `push` for a change of place or time, with a direction that continues the motion (the chart leaves `up` while the record-day photo rises; a photo drops in `down`).
- `cut` only on a hit word ("Liftoff", "Next"); set `"hit": true`. The NEXT card usually cuts.
- `frames` 10 to 14 is the default feel; 16 for a big scale change, 8 for a snap.

## 4. Choreograph the cat

He is a guide and a reaction, never the source of a fact. Aim for 45 to 55% of the runtime on screen (the build fails outside 40 to 60%) and at least 8 different moves (it fails under 8; 12 or more is better).

- **Three or four visits**, each an entrance, two to four reactions or travels, and an exit. Enter on a beat change or a hit word; leave before a beat that needs the whole frame (a big photo subject, a full-width diagram).
- **Entrances**: `pop` from behind the caption (`"box": "caption"`, `along` 0.05 to 0.3), `drop` on a tether, `skid` on the thruster board, `float` in zero-g. **Exits**: `zip` (left, right, up), `tether`, `float`, `jet`. Vary them.
- **Travel**: `hop` onto an element (`"to": "el:dome:0.25"`), `walk` along a route, `scoot` on the amber dot, `fly`, `swing`, `float`. Travel happens between beats or on empty floor; the build notes when a hop crosses a subject in mid-air (look at those stills, then choose a lower path or a walk).
- **Reactions on the words they react to**: `gasp` on the surprising number, `point` at the thing named (`"target": "el:subject"`, `"el:row0"`, `"dot"`), `thumbs` on the record, `sign` holding a number the narration just said (`"text": "28.10", "sub": "MILES"`), `what` on a question, `shrug` on "nobody knows", `listen` and `nod` on explanations, `bounce` on good news, `wave` at the end.
- **Expressions** (`"do": "expr"`) follow the story's mood: curious at the hook, excited on records, skeptical on doubts, happy on the NEXT card.
- **Where he stands**: `left` or `right` on the caption floor, on top of the caption box (`caption`, `caption:0.3`), on an element (`el:<id>`), or a point. The builder fits standing spots clear of caption words and subjects. Put him on the side the shot leaves free (`frame: "right"` photo, cat `left`).
- **Scale** 0.34 (about 375 px) on story beats; 0.25 to 0.28 on the NEXT card so the card stays readable.
- Never mirror him, never put him over caption words, a photo's subject or a number, never in the top-left text column while a number is up.

## 5. Banned

Starfields or particles, nebula gradients, glow, added lens flares, HUD rings, frosted glass, typewriter text, fade-and-slide-up everywhere, everything entering at once, centred layouts, a top progress bar, emoji, "not to scale" or other filler labels, invented dates, numbers not in the script or its sources, photos that do not show what is said, unlabelled AI imagery, a cat that sits still for a whole beat, hard cuts without a hit word.

## 6. QA (required, at most 3 fix rounds)

1. `node pipeline/engine/build.mjs <short>`. Fix every validation error (they name the beat and the field) and every failed check.
2. Stills at every beat boundary: the build prints `QA frames`; render them with `pipeline/engine/tools/stills.sh <short> <frames>` and look at `out/qa_sheet.png` with the Read tool. Add the frame of every cat entrance, exit and hop, and every frame the build notes. For each still ask:
   - Does the picture show what is being said on that word?
   - Is the frame full (nothing large and empty under the number)?
   - Is any text cut, crossing x 900, under the cat, or over the subject?
   - Is the credit right for what is on screen?
   - Is the cat doing something, on the free side, clear of captions and subjects?
   - Does the transition read as one move (the dot, the push direction)?
3. Lint details: `node pipeline/engine/tools/inspect.mjs <short> <frames>` prints the cat box and every caption and subject rectangle he touches.
4. Fix in the shot list (move the cat, change `frame`, `side`, `region`, a `headline_size`, an anchor), rebuild, look again. Stop after three rounds and write what is left in the Short's notes.
5. Full render, then the contact sheet every 30 frames (`tools/sheet.py ... every=30`) and four mid-motion frames. Check caption sync on a few words (the caption word must appear within 2 frames of its spoken start; the engine schedules them from `captions.json`).
6. Mix with the bed (`lab/sound/mix.py --bed-under 18`, the cues in `out/cues.json`), check the report (-14 LUFS, true peak at or below -1.5 dBTP), delete `out/frames/`.
