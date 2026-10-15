The NEXT card closes every Short with a real, dated event coming up, so viewers have a reason to return.

- **Consumer provides:** the series, one headline line naming the next event (at most 4 lines of `headline`), its date (`DDD DD MMM`, from Launch Library 2 or the story's source), and optionally a line diagram.
- **Build:** `ink` ground, no photo. All seven ticks `amber`. The kicker reads `NEXT ON <SERIES>` in the kicker's usual place. Headline in `headline` (`paper`) at x 80, y 330; date in IBM Plex Mono 64px `amber` at y 698; the pointer "This week in space · Sunday" in a 2px `amber` outline box at y 800; an optional diagram on the right half labeled `DIAGRAM · NOT TO SCALE` in `muted`; the wordmark at x 80, y 1404.
- **Timing:** starts on a beat (frame 360 in the 15 s template) and holds at least 0.3 s per headline word plus 0.5 s. Order: headline, date (+15 frames), pointer (+30), diagram (+34), wordmark dot (+45), echo ring (+84). The last frame is the finished wordmark.
- **Fallback:** when nothing dated fits, point to the next "This week in space" episode instead; never invent an event or a date.
