The progress ticks show how far the Short has come, one tick per story beat.

- **Consumer provides:** the number of story beats (7 in the template) and which beat is current.
- **Build:** 7 bars across x 80 to 1000 at y 220, each `tick-height` tall with `tick-gap` between; pending in `tick-pending`, reached in `amber`.
- **Motion:** a tick fills (scaleX 0 to 1 over 6 frames on `enter`) 4 frames after its beat's cut. All seven are amber on the NEXT card.
- **Do not:** add numbers, round the ends, or animate a tick backward.
