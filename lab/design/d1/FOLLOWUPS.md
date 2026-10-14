# D1 Telemetry: motion test review log

## Round 1 (stills 0, 20, 45, 75, 105, 150, 180, 210, 255, 300, 330, 359)
1. f105: photo NHQ202211160022 put the booster logotype at the center of the "SLS and Orion" beat and Orion was not in frame. Swapped: 0022 (ignition close-up) now carries "Artemis I lifts off." (f60 to 89) and NHQ202211160200 (full stack with Orion on top) carries "SLS and Orion fly together" (f105 to 149). Credits follow the photos.
2. f255, f300, f330: the "MOON" diagram label ended near x 990, outside the 900 px text safe zone. Moved it above the Moon circle (x 800).
3. f0, f20: hook photo too dark under the 65% scrim; the rocket barely read. Scrim set to 60% (inside the 60 to 70% token).

## Round 2 (same stills)
4. f210 and every frame with a lower third: the Moon signal delay chip and the photo credit block were rendering in Archivo, not IBM Plex Mono (font-family was missing on both). Set IBM Plex Mono 500 explicitly on the chip, the lower third and the kicker.

## Round 3 (same stills, full-size checks of f0, f210, f300)
No new defects. Checked: frame 0 is a finished composition (kicker, headline, credit, progress segment 1); chip and credits now in IBM Plex Mono; all text inside x 80 to 900, y 260 to 1500; the 3:27 count settles to the true value and never exceeds it; the diagram reads as flat line art with a "not to scale" label. Proceeded to the full render.

## After full render (contact.png)
5. f255 to f270: the 3:27 readout showed 3:27 and then 3:26. The spring overshoots, is capped at 207 s, then dips under 1.0 on its return swing, so the display counted backward. The display now holds the running peak of the spring (still capped at 3:27), so it only counts up. Re-rendered the full video.
