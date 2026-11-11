The caption shows the narration on screen, word for word, one word at a time.

- **Consumer provides:** the narration chunk (1 to 4 words per line, at most 2 lines) and the frame each word is spoken on.
- **Build:** each line is its own square `caption-box` with padding 8px 16px; text in the `caption` style (Archivo 700, width 100, 90px, sentence case) in `paper`; the newest word in `amber`. Lines stack with `gap-caption-lines`.
- **Place:** left edge at x 80, lines inside y 1160 to 1440.
- **Timing:** a word every 8 frames, each a hard cut-in. Hold the finished chunk at least 0.3 s per word plus 0.5 s.
- **Do not:** fade words, color more than one word amber, center lines, or let a line pass x 900.
