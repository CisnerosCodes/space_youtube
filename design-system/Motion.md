# Motion

Every frame is code, rendered frame-exact: each frame is a pure function of time `t`, exposed as `window.renderAt(t)`, captured by a headless browser and encoded with ffmpeg. No timers, no clocks, no unseeded randomness.

## Grid
- 30 fps. 120 BPM, so one beat is 15 frames.
- Every cut lands on a multiple of 15. Shots last 15 or 30 frames. The picture changes at least every 30 frames.
- Something meaningful lands on every beat: a cut, a punch-in, a new word, a number or a mark.
- Hard cuts only. No dissolves, wipes, whip pans, blur or shake.

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
- **Ticks:** one tick fills per story beat (scaleX 0 to 1 over 6 frames on `enter`, 4 frames after the cut). All seven are amber on the NEXT card.
- **Echo mark:** the ring lands exactly the real light delay after the dot (Moon: 1.3 s = 39 frames).
- No more than 3 flashes per second.

## Short template (15 s, 450 frames)
| Frames | Beat |
|---|---|
| 0 to 29 | Hook: series kicker and a giant number on a photo. Frame 0 is a finished composition. |
| 30 to 314 | Story beats on photos, each photo showing what is said; the chip on the beat it belongs to; a number beat on a diagram when no photo shows it. |
| 315 to 359 | The outcome beat. |
| 360 to 449 | The NEXT card, held at least 0.3 s per headline word plus 0.5 s, ending on the completed wordmark. The kicker sits where frame 0's kicker sits, so the replay reads as the next episode. |

A 30 to 45 second Short stretches the story beats on the same grid; the hook and the NEXT card keep their lengths.
