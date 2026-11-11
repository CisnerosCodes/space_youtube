# Review: 2026-11-11 Just Discovered, "Chandra Unmasks a Supernova Impostor Star (Nov. 9, 2026)"

Unattended run (no human approval step since 2026-11-11). Started 16:29 UTC, run by an interactive session on the owner's request instead of the 5:13 am scheduled task.

## Story and why it was picked
Six candidates from the last 72 hours were triaged by two Haiku subagents (research/2026-11-11/triage/haiku_a.md and haiku_b.md):
| Candidate | Story | Image | Insight | Next | Note |
|---|---|---|---|---|---|
| Chandra, AT 2016blu outbursts (Nov 9) | 5 | 4 | 5 | 1 | Picked |
| ESCAPADE powered Earth flybys (Nov 9) | 4 | 2 | 4 | 5 | No real photo of the spacecraft |
| Voyager 1 one light-day (Nov 10, event Nov 18) | 3 | 1 | 4 | 5 | Story under the bar today; used as the NEXT event. Strong candidate for Nov 17 or 18 |
| LISA, planets from gravitational waves (Nov 10) | 4 | 1 | 5 | 2 | Artist's concept only |
| Rubies on Mars? (Nov 9) | 4 | 2 | 4 | 1 | Hedged, no image of the crystals |
| Newest sample, oldest rock? (Nov 9) | 3 | 4 | 3 | 1 | Routine status update |

News bar: published Nov 9 (inside 72 hours); a concrete, surprising payoff (a hidden black hole or neutron star, at least 100 times brighter in X-rays, first X-ray detection of this class); real images (the release's composite and four-panel set); not covered before. Series Just Discovered is allowed (last one Oct 19; Launch Day was blocked).

## Final script (90 words)
> A star about 30 million light-years away keeps erupting like a supernova, and surviving.
> At least 27 bursts between 2012 and 2026.
> They call it a supernova impostor.
> Why? Chandra caught it at least 100 times brighter in X-rays than before its outbursts began.
> The best explanation: a hidden black hole or neutron star, pulling material off it every 113 days.
> It is the first X-ray detection of this class of erupting star.
> Next: Voyager 1 reaches one light-day from Earth, Wednesday, November 18.
> Follow Downlink Cat for that milestone.

## Fact check
See factcheck.md: 23 of 23 quotes matched the live pages (quotecheck.py). Judgment calls are listed there. The two that matter most:
- The page caption of the four-panel image says optical is on top and X-ray on the bottom; the image's own printed labels say the opposite. The Short follows the labels printed on the image.
- "The best explanation" and "black hole or neutron star" keep the release's hedges; the Short does not say which one it is.

## Voice
Take 1 failed (heard "outburst" for "outbursts", and a stray word). Take 2 verified with 0 differences, 35.56 s. Alias impostor=imposter (Whisper spelling only). Listener check: nothing known.

## QA
- Build OK after 3 fix rounds. Engine change in this run: long official photo credits (the Chandra credits are 73 and 114 characters) now wrap at their "; " parts onto two lines at 21 px, and the credit audit accepts a credit wrapped across consecutive lines (it still requires the exact full credit). Files: pipeline/engine/anime/text.js, pipeline/engine/lib/build_anime.mjs.
- The four-panel image is shown as four crops (img/xray_before.jpg and the others), because the lens and monitor shots showed the whole four-panel image instead of the quadrant named. Each crop keeps the label printed on it.
- The orbit diagram is a schematic (a ring for the star, a dot and pulsing ring for the partner, a dashed orbit, an amber stream), credited "Illustration · facts: NASA".
- Flashes: worst 1 in any second. Motion: every second at 1.7 or above (seconds 24 and 29, the 113 slam and the NEXT band, are 1.8 and 1.7).
- Left as is: about frame 470 the second X-ray lens briefly overlaps the "X-RAY 2001-2002" label (readable again by frame 530). The galaxy credit is two lines in small type; legible at full size, small on a phone.
- Mix: -13.9 LUFS integrated, -2.0 dBTP true peak, bed bedE_arp (the previous Short used bedG_cinepulse).

## Costs and durations
OpenRouter: voice about 0.017 USD (2 takes plus Whisper). Triage and script ran on the Agent tool (no OpenRouter cost). Durations: research 1 min, triage 1 min, script 1 min, fact check 2 min, assets 2 min, voice 1 min, captions under 1 min, director, build and QA about 11 min, render and mix about 6 min (3 renders of 75 s).

## Self-review
Strongest: a real result with two real images that show the outburst in both optical and X-ray, and a NEXT card that sets up next week's Voyager milestone.
Weakest: the star is a tiny dot in every real image, so the payoff leans on the schematic diagram and the chips.
