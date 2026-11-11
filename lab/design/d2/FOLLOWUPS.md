# d2 "Dispatch": review log

Stills came from `node /home/user/space_youtube/lab/motion-ab-test/render.mjs anim.html 12 30 out frames=...` run in this folder. Source is `build/anim.src.html`; `python3 build/build.py` inlines the three Google Fonts latin woff2 files (Barlow Condensed 800, IBM Plex Mono 500, Source Serif 4 600 with the opsz axis) and writes `anim.html`. Photos load from `../../assets/nasa/`.

## Round 1 (frames 0, 20, 45, 75, 105, 150, 180, 210, 255, 300, 330, 359)

1. Frame 180: the Earthrise print snapped in from the left, so for the first frames a newsprint strip showed at the right bleed edge, where the frame has no rule; it read as a bad crop. The shot now snaps in from the right like the others, and the image overflow hides the strip.
2. Frames 45, 75, 210, 255, 330: on the frame a new word cuts in, the orange underline was still under the previous word, so the active word looked unmarked for one frame. The 3-frame jump now starts one frame early, so it is about 85 percent of the way there on the word's first frame.
3. Frame 255: the 3:27 block sat right under the masthead with about 300 px of empty newsprint above the caption band. The whole number block (label, rule, number, scale, labels) moved down 100 px.

## Round 2 (frames 0, 15, 20, 45, 75, 92, 105, 150, 180, 183, 210, 243, 255, 300, 318, 330, 347, 359)

1. Frame 243: during the count, the round right side of the "3" in "1:23" ran into the "MIN : SEC" label at x 770. The label moved up to the label row, right aligned at x 900 next to "RETURN POWERED FLYBY BURN".
2. Beat check: frame 270 had no event, because the count settles at about frame 252 and the next cut was at 285. The cut to the Earth crop moved to 270, the caption "sends Orion home." now cuts in at 270, 278 and 285, and a 5 percent punch-in toward Earth lands on 300. Every beat from 0 to 345 now carries a cut, a word, a punch-in, a stamp or a count.

## Round 3 (frames 0, 20, 45, 75, 105, 150, 180, 210, 243, 255, 270, 285, 300, 305, 330, 359)

No notes acted on.

What a viewer sees in the final stills:
- 0: a newspaper front page on warm newsprint: SIGNAL DELAY masthead, an orange LAUNCHING TODAY tab, "1:47 A.M." in huge black condensed caps with a small EST, a serif deck, and the liftoff photo framed below with its credit.
- 15 to 20: the same page; the photo has punched in a few percent on the rocket.
- 45: a hard cut to the wide pad photo in a ruled frame, "Launch Pad 39B." under it, the orange underline under "39B.", and the orange tab now sits on the masthead rule.
- 75: an engine close-up, "Artemis I lifts" with the underline under "lifts".
- 92: the engine shot has punched in, and the caption reads "Artemis I lifts off."
- 105: the tall Orion and SLS stack slides up into the frame (its top edge shows for a moment), caption "SLS".
- 150: the arcing exhaust trail slides in from the right, caption "for".
- 180 to 183: Earthrise from Orion; "DAY 20." stamps into the caption band in condensed caps; the dateline now reads MON 5 DEC 2022; the signal delay chip snaps onto the bottom edge of the print.
- 210: "Earth rises / behind" with the underline on "behind", chip still on the print.
- 243: no photo, a pure numbers page: "RETURN POWERED FLYBY BURN", a giant "1:23" counting, and a bar filling along a 0:00 to 3:27 scale.
- 255: the count holds at "3:27", the bar is full, and the caption reads "A 3-minute, / 27-second".
- 270 to 305: a tight crop of the Moon limb with the Earth crescent; "sends Orion home."; at 300 it punches in toward Earth.
- 318 to 330: a flat line diagram (Moon circle, Earth circle, a return path drawing in to a dot), dateline SUN 11 DEC 2022, "Splashdown: Dec. 11." and the label SPLASHDOWN · PACIFIC OCEAN.
- 347 to 359: the front page again, with "SIGNAL DELAY" stamped in the headline slot, "@SIGNALDELAYHQ" on the tab and the same liftoff photo in the same frame, so the replay cut to frame 0 reads as the next edition turning over.

## Full render

`out/video.mp4`: 360 frames, 1080x1920, 30 fps. `out/contact.png` shows every 15th frame from 0 to 285 (render.mjs tiles 5x4). In the contact sheet the shot order is clear, captions build word by word with the orange underline, the 240 tile shows the empty 0:00 count, and the 255 tile shows 3:27 held.
