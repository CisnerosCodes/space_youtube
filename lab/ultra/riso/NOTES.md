# riso: the MMX heist as a living risograph print

Entry "riso" in the ultra experiment (Oct 20, 2026). It uses the same story, voice, captions and facts as the other entries, printed in three spot inks: federal blue, fluorescent pink and sunflower. Every frame is a three-ink print on cream stock. The press prints 15 sheets a second ("on twos"), like a riso flip-book, and the inks overprint, misregister, mottle and drift.

## Files

| Path | What it is |
|---|---|
| `out/final.mp4` | The Short: 1080 x 1920, 30 fps, 42.0 s, H.264 about 9.8 Mb/s plus AAC 256 kb/s, 52.9 MB, -13.9 LUFS, true peak -1.8 dBTP |
| `out/video.mp4` | Silent picture: the render master re-encoded with two-pass x264 at 10 Mb/s (the master was 146 MB, see below) |
| `out/mix.m4a`, `out/mix.report.json` | Mix by `lab/sound/mix.py` (voice, `bedA_pluck`, 20 cues, sonic logo). Report has no warnings. |
| `out/contact_full.png` | Every 30th frame of `final.mp4`, labelled |
| `out/caption_sync.json` | Every caption word: spoken start and first frame shown. All 89 words are within 1.4 frames (the largest gap is 1.4 frames early, none late). |
| `cues.json` | 20 curated cues, with a note on each; `wordmark_echo` at frame 1208 |
| `page.html` | The self-contained render page (3.1 MB: fonts, Phobos model, Mars mosaic and HiRISE cut-outs are embedded as data URIs, because Chromium taints canvases that read images from `file://`) |
| `src/engine.js` | Plates, ink encoding, 3D layer (Phobos model, Mars globe), the press shader |
| `src/art.js` | Riso drawing kit: screened skies, stars, sunbursts, cloud banks, stamps, rosette, ticket, the stylized H3, MMX, IDEFIX, capsule, Electron, scissors |
| `src/scenes.js` | The 13 sheets, Night Shift's timeline, slams and registration kicks |
| `src/main.js` | Assets, captions, credits, print furniture, Night Shift in inks, the timeline and `renderAt` |
| `src/rig_bundle.js` | The Night Shift v3 rig, bundled unmodified from `lab/mascot/v3` |
| `tools/` | `prep.py` (asset prep), `build.mjs` (page), `stills.mjs`, `sheet.py`, `contact.py`, `capcheck.mjs`, `g3test.mjs`, `prof2.mjs` |
| `qa/` | Stills from the QA rounds (`r2_sheet.jpg` onward, `v2_sheet.jpg`, `v3_sheet.jpg`) |

Rebuild: `python3 tools/prep.py && node tools/build.mjs`, then `node ../render_fast.mjs page.html 42 30 out/video_master.mp4 --workers=2` (no `--webgl` flag: without it Chromium keeps the 2D canvases in software, which is about twice as fast here; WebGL2 still runs on SwiftShader), then the two-pass encode and `mix.py` as below.

## How the print works

- **Two plates per sheet.** Each sheet has a solid canvas (type, line art, flat ink, Night Shift) and a tone canvas (tints, gradients, photos, 3D renders, shadows). Colours on both are encoded transmissions: red = 1 - blue density, green = 1 - pink density, blue = 1 - sunflower density. Drawing with `multiply` overprints. Drawing with `source-over` knocks out what is below, as a real separation does.
- **The press shader (WebGL2).** It screens the tone plate into AM halftone dots (one screen angle per ink: 15, 75 and 45 degrees, 10 px cell, a cheap piecewise-quadratic dot shape), adds the solid plate, and offsets and rotates each ink on its own (registration drift plus spring kicks on every cut and every number slam). It also roughens ink edges with a noise wobble, mottles the solid ink, drops a few speckle voids, and multiplies the three inks onto cream paper with a fibre texture. The intro opens 30 px out of register and snaps in within about 6 frames.
- **Transitions are press moves, not dissolves.** An *ink roller pass*: the three drums print the new sheet in turn (sunflower, then pink, then blue), each sweeping top to bottom with an ink bead on its edge, so for a few frames you see the separations. A *paper feed*: the new sheet is pulled through in stepped jerks, with a shadow edge on the old sheet. A *side feed* does the same sideways.
- **Real images, inked.** NASA's Phobos shape model (`phobos_nasa.glb`, credit NASA/JPL-Caltech) is drawn in raw WebGL with its texture and Lambert light. The fragment shader separates it straight into inks: blue shadows, pink midtones, a touch of sunflower. Mars is a ray-cast globe in a fragment shader, mapped with the USGS Viking colour mosaic and separated the same way: sunflower brightness, pink redness, blue for dark terrain and the night side. It rotates in every Mars shot. The HiRISE Phobos photos (PIA10368, PIA10369) are cut out of the black sky (alpha only: no painting) and separated into blue and pink. Every one is credited with its exact string while on screen. During a transition both sheets carry both sheets' credits, so a credit never lags its image.
- **Night Shift in ink.** The v3 rig is used unchanged. At runtime its palette is switched to separation colours: fur in full blue ink, jacket and keylines left as paper, echo-mark eyes in sunflower, inner ears in pink. Each frame is rasterized and printed with a pink halftone drop shadow, a knockout, and a halftone shading crescent on the side away from the light, which shows purple where it overprints the blue fur. He acts in 7 of the 13 sheets, and is seen leaving at the start of two more: he pops up behind the launch clouds with a sly look, points at the piece being cut, zips out, skids in to the scale, leans in, gasps at 15 g and throws a WHAT, drops in on a tether like a cat burglar at "Target", points at 10 g, gets yanked out, skids in and bounces on "First", gives a thumbs up, hops to the NEXT ticket and nods, then hops into the end-card medallion and waves. His mouth follows the narration's word timings whenever he is on screen.
- **Captions.** These are the `captions.json` words verbatim, in Barlow Condensed 800 at 84 px, printed in blue with a paper knockout halo. Emphasis words get a sunflower highlighter swipe and a pink offset print. They sit at x 90 to 880. The bottom zone runs from about y 1282 to 1467; the hook uses a top zone (about y 274 to 454). During a transition both sheets set the caption where the incoming sheet wants it, so a pass never hides a word. On twos, a word is shown on the sheet that covers its spoken start, so it can be up to 1.4 frames early and is never late.
- **Print furniture.** A slug (DOWNLINK CAT / LAUNCH DAY, NEXT LAUNCH, FOLLOW), crop marks, a colour bar, a registration target printed in all three inks (it shows the misregistration), and a step tracker (1 to 4) on the heist-plan sheets.

## The sheets

1. **Hook** (0 to 3.1 s): the NASA Phobos model tumbles over a rotating Mars horizon, on a decaying-orbit spiral with crawling chevrons and stroboscopic ghosts. A vertical PHOBOS title, "27 x 22 x 18 km", "1.8 m (6 ft) closer to Mars every 100 years", and the either/or footnote: "in 50 million years: crash into Mars or break up into a ring".
2. **Heist** (H3, illustration): a pink and sunflower dawn sunburst, a lattice tower with its arm swinging away, the H3 climbing on a flickering flame out of a flat two-layer cloud bank. Launch facts are typed in: H3 flight No.10, 04:41:03 JST, Oct 20, 2026 (19:41:03 UTC, Oct 19).
3. **Steal a piece** (HiRISE): scissors cut along a dotted line around a piece of Phobos, under a "CUT HERE" coupon label. The piece lifts out with a pink shadow.
4. **Step one**: a giant sunflower 1, a rotating Mars, MMX arriving on a transfer arc into orbit, and an AUG 2027 rubber date stamp slammed on "2027".
5. **Step two**: the HiRISE limb as ground, MMX overhead, IDEFIX dropped on a dashed line ("dropped from about 40 m, in free fall (DLR)"), a slow low-gravity bounce, and a lookout scan cone. Then a push-in for the 25 KG slam and "about the size of a crate of drinks".
6. **15 grams**: a dial scale with the rover on it. The needle trembles on "weighs..." and springs to the one printed value, 15 g. "Phobos gravity: 1/1700 of Earth (JAXA)".
7. **Step three**: MMX lands on an illustrated regolith cross-section with a dust ring. The coring arm reaches and drills ("corer digs to 2 cm"). The nitrogen burst fans out on "nitrogen", with "bursts of high-pressure nitrogen gas" and "in a fraction of a second".
8. **Target**: a bullseye with each ring in its own ink, a rotating tick ring, a closing crosshair, "AT LEAST", a 10 g slam, and the footnote "Hayabusa2 aimed for 0.1 g and got 5.4 g".
9. **Step four**: a giant 4, Mars, and MMX's burn on an escape arc ("escape in a single manoeuvre (JAXA)", from F37).
10. **Capsule**: re-entry over the curve of the Earth, with flame tongues and a bow shock. "Capsule: about 60 cm across, with a heat shield". A postmark (LANDS IN AUSTRALIA, 2031) slams on "2031".
11. **The loot**: the HiRISE Phobos on a rotating two-ink sunburst, THE LOOT, and a FIRST rosette on "First".
12. **NEXT**: a printed ticket fed in (ROCKET LAB, ELECTRON, 3 x HawkEye 360 satellites, WED 21 OCT), a stylized Electron on its pad, and three satellite icons popping on "three".
13. **End card**: a blue flood with a pink sunburst and a paper medallion holding Night Shift. The wordmark has DOWNLINK knocked out to paper and CAT in sunflower. The echo mark (sunflower dot, then the hollow ring 0.4 s later) lands on the sonic logo cue at frame 1208.

## Sound

The bed is `bedA_pluck` (playful, curious), mixed with `--bed-under 18`. There are 20 cues: a press slam at frame 2, whooshes on roller passes and side feeds, page turns on paper feeds, a pop for the cat's entrance, impacts for the AUG 2027 stamp and the 2031 postmark, number slams for 25 KG, 15 g and 10 g, a whoosh for the burn, a swell into FIRST, a page turn for the NEXT ticket, and `wordmark_echo` at frame 1208. Final loudness is -13.9 LUFS with a true peak of -1.8 dBTP, and the mix report has no warnings.

## Render time

- The final render took 7 min 1 s for 1,260 frames with 2 workers (6 min 12 s on the run before), while another entry rendered on the same 4 cores. Printing on twos lets `renderAt` keep the canvas for the second frame of each pair. A full sheet costs about 0.7 to 1.1 s per worker under that load: the press shader takes about 0.3 to 0.4 s and the 3D layer up to 0.2 s.
- The two-pass 10 Mb/s encode took 94 s, and the mix about 20 s.
- The first full render (every frame unique, per-frame grain) took 13 min and came out at 443 MB at CRF 16. That is what forced the changes below.

## QA rounds (3)

1. **Stills round** (`qa/r2` to `qa/r4`). I fixed the muddy olive overprints (sunflower over blue) by knocking out the ground under the yellow numerals and the echo mark. Blank paper at the bottom of half the sheets became full-bleed backgrounds. The ball-like exhaust clouds became flat two-layer cloud banks. The hook's Mars horizon showed the polar cap and now shows equatorial terrain. The re-entry trail looked like a paintbrush. I also rebalanced Phobos's ink mapping, moved Night Shift off the NEXT ticket, and fixed a bug where a path-less `inked()` call filled the last stroked path with paper. That bug caused a white wave across the regolith.
2. **First full render** (`qa/contact_v1.png`, `qa/v2_sheet.jpg`). The file was 443 MB. I made the paper grain static, slowed the speckle boil, coarsened the screen to 10 px, and moved the press to twos, which brought the master to 146 MB and 10 Mb/s to 51.5 MB. At the line boundary at 3.43 s, "Japan" was hidden mid-pass, because the two sheets put the caption in different zones; captions now follow the incoming sheet. I also hid a label that zoomed into the 25 KG slam.
3. **Final** (`qa/v3_sheet.jpg`, `out/contact_full.png`). Every line boundary (frames 4, 103, 220, 322, 446, 570, 687, 768, 928, 1047, 1167) shows its first word readable, and the echo mark lands on its cue.

## Honest weaknesses

- **Compression eats the dots.** The halftone is the whole look, and halftone in motion is close to the worst case for a video codec. To fit under 60 MB the picture is 10 Mb/s, which softens the finest dots. YouTube's own re-encode will soften them more, so on a phone the screens will often read as texture rather than crisp dots.
- **Busy mid-pass frames.** For 3 or 4 frames in the middle of some roller passes (around 22.9 s into Target and 38.9 s into the end card), two sheets' plates mix and the frame is chaotic. That is the intended separations effect, but it is busy.
- **Gaps in the cast.** Night Shift is absent from the hook, step two and step three, and in step one and step four he is only seen leaving. He acts well where he appears, but the first 4.5 s have no character.
- **The cat is recoloured, not redrawn.** He is the existing rig in separation colours, and his shading is a single edge crescent from the silhouette, not per-part riso shading. He reads as riso, but the line style is the channel's.
- **Simple illustrations.** The rover, capsule, Electron and satellites are simple. The re-entry trail still reads a little like a torch beam. The rotated-HiRISE ground in step two is soft and mostly pink.
- **Pink Phobos.** The Phobos separations lean pink by design (riso, not true colour). A viewer may not recognize the HiRISE images as the familiar grey-brown moon.
- **Small labels.** The typewriter labels (20 to 25 px) and credits (21 px) are readable at full size but small on a phone, and some labels are up for only 2 to 3 s.
- **A caption jump.** At the first cut (3.07 s) the caption moves from the top zone to the bottom zone in the middle of "with Mars."
- **A judgement call on the photo.** "Steal a piece" lifts a masked copy of part of the HiRISE image off the photo, leaving a dashed hole. It is a graphic cut-out under a "CUT HERE" print joke, with no new detail painted in, but it does handle a real image graphically.
