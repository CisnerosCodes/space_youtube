# Motion

Every frame is code, rendered frame-exact: each frame is a pure function of time `t`, exposed as `window.renderAt(t)`, captured by a headless browser and encoded with ffmpeg. No timers, no clocks, no unseeded randomness.

## Flow (revised after the first pilot)
- 30 fps. Timing follows the narration's word timings; the music bed sits on a 120 BPM grid (15 frames per beat).
- The Short reads as one continuous shot, not a slideshow: one persistent actor (usually the amber dot, or the photo itself) carries across beats and transforms; motion direction carries through each transition; shots overlap by 6 to 16 frames; something moves at every moment.
- Photos are cut into 2 or 3 parallax layers and push 3 to 7%. Fast moves get motion blur (sub-frame averaging or a directional blur).
- Hard cuts only when motivated by a hit word (for example "Liftoff").
- The picture changes at least every 1.5 s. Small labels stay on screen at least 1.5 s or are cut.

## Curves and springs
| Token | Value | Use |
|---|---|---|
| enter | `cubic-bezier(0.16, 1, 0.3, 1)` | Everything that arrives. |
| move | `cubic-bezier(0.76, 0, 0.24, 1)` | Moves across the frame, camera framings in diagrams. |
| exit | `cubic-bezier(0.7, 0, 0.84, 0)` | Leaving; exits run 50 to 60% of the entrance length. |
| spring | `1 - exp(-zeta*w*t) * (cos(wd*t) + (zeta*w/wd) * sin(wd*t))`, `w = 2*pi*f`, `wd = w*sqrt(1 - zeta^2)` | Count-ups (zeta 0.8, f 2), punch-ins (zeta 0.7, f 4, 6 frames), the echo ring (zeta 0.7, f 4, from 0.4 scale). |

Position and scale may overshoot. Opacity and color never do.

## Moves
- **Punch-in:** 4% on the middle beat of a 30-frame shot; at most 10% in one shot.
- **Slam:** giant type enters at 1.12 scale and settles to 1.0 over 5 frames on `enter`, origin left center. Stacked lines (DAY / 20) slam 8 frames apart.
- **Count-up:** spring zeta 0.8, f 2, capped at the true value, only counts up, and starts on the first nonzero step. No frame ever shows a zero value.
- **Words:** one word every 8 frames, a hard cut-in (no fade). The newest word is `amber`, the rest `paper`.
- **Secondary moves** start 4 frames after the hero move and travel 60% as far.
- **Echo mark:** on the chip, the ring lands the real light delay after the dot when it is short (Moon: 1.3 s = 39 frames), otherwise about 24 frames. On the wordmark it lands 12 frames after the dot, with the sonic logo's echo.
- No more than 3 flashes per second.

## Short template (as first tested at 15 s; real Shorts run 30 to 45 s on the narration)
| Frames | Beat |
|---|---|
| 0 to 29 | Hook: series kicker and a giant number on a photo. Frame 0 is a finished composition. |
| 30 to 314 | Story beats on photos, each photo showing what is said; the chip on the beat it belongs to; a number beat over line art when no photo shows it. |
| 315 to 359 | The outcome beat. |
| 360 to 449 | The NEXT card, held at least 0.3 s per headline word plus 0.5 s, ending on the completed wordmark. The kicker sits where frame 0's kicker sits, so the replay reads as the next episode. |

A 30 to 45 second Short stretches the story beats on the same grid; the hook and the NEXT card keep their lengths.
