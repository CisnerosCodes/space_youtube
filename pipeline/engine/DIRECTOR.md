# Director guide: writing a shot list

You are the director of one Downlink Cat Short. You receive a fact-checked script, its source list, the images (with credits), and the word timings. You write `shotlist.json`; the engine (`pipeline/engine/build.mjs`) turns it into the video. You decide what the viewer sees on every word and how the cat moves. You never decide pixels the design system already fixes, and you never add a fact the script and its sources do not hold.

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
