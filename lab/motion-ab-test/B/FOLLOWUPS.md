# B: review log

These are the review notes I acted on, copied exactly as I wrote them and numbered by round. Stills came from `node render.mjs B/anim.html 12 30 B/out frames=0,15,45,60,90,105,135,165,225,255,290,315,359`. Contrast numbers came from `B/build/qa_contrast.mjs` and `B/build/qa_contrast.py`, which measure every text pixel against the same frame rendered with the text hidden and the scrims kept.

## Round 1

1. frame 0-44, 315-359: credit line gray #8C8A85 measures 2.65:1 over the photo with the 55% scrim (fails 4.5:1); give the credit its own denser flat ink backing.
   - Follow-up: the 2.65 reading was too low because the checker counted anti-aliased headline edges as gray. Once the check was limited to the credit area, the credit measured 3.28:1 at 55%, which still fails. The credit scrim is now flat #0A0A0A at 85%, and its worst reading is 5.03:1.
2. frame 315: caption scrim box is drawn full-size for both lines while only "18" is on screen, so the frame opens on an empty gray slab; make the scrim follow the revealed words line by line.
3. frame 290: "6.5 m" glyphs sit 26 px under the merged outline and 28 px above the credit, cramped; lift the merged shape 50 px during the merge move and raise the number.

## Round 2

1. frame 318: the descender of "pieces." hangs below the line-1 scrim onto the bright wall (gold measures 1.88:1); put the line scrims in one 55% group so they can overlap without double-darkening.
2. frame 15: the two headline scrims overlap by 28 px under "18 MIRRORS.", leaving a darker stripe between the lines; merge them into one scrim group so the ink stays one flat 55%.
3. frame 255: at the pop peak the merged outline's bottom edge comes within 21 px of the "0.0 m" glyph tops; move the 6.5 m readout down 12 px.

## Round 3

No notes acted on. The worst text contrast over all checked frames (0, 15-18, 30, 44, 60, 105, 165, 225, 255, 315, 318, 321, 324, 330, 359) is 5.03:1.

What a viewer sees in the final stills:
- 0: a tight, dimmed clean-room shot of the black-covered segments around the empty centre hexagon, with "18 MIRRORS." in big white caps on a dark box.
- 15: "ONE EYE." slams in under it in gold, slightly oversized, and the two lines share one even dark box.
- 45: a hard cut to the whole photo in a band on black, with "Each" in gold at the top.
- 60: the photo is still easing out, the caption reads "Each one is 1.3 meters across.", and a gold "0.0 m" sits under the band.
- 90: a thin gold hexagon traces the segment just below the centre hole, and the readout says "1.3 m".
- 105: "About" appears in gold as the start of a third caption line.
- 135: a hard cut to black with one small gold hexagon outline at the top of the rings.
- 165: sixteen of the eighteen outlines are in, with gaps between them; the caption reads "Each weighs about 40 kilograms." and "0 kg" starts counting.
- 225: all 18 outlines are spread out, and "40 kg" holds.
- 255: the rings have closed into one gold mirror silhouette with the centre hole; "0.0 m" begins counting, and the caption reads "Together, one".
- 290: one gold mirror outline, "6.5 m" in big gold type, and "Together, one 6.5-meter mirror."
- 315: a hard cut back to the dimmed close photo, with a gold "18" in a box that only covers that word.
- 359: "18 pieces. One telescope." on the photo, in the same spot and at the same framing as frame 0, so the replay cut continues the push.

## Full render

`B/out/video.mp4` has 360 frames at 1080x1920 and 30 fps. `B/out/contact.png` shows every 15th frame from 0 to 285 (render.mjs tiles 5x4, so shot 5 is not in it). In the contact sheet the shot order reads clearly, the 240 frame shows the rings partway closed, and the 255 frame shows the merge.
