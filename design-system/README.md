Signal Delay is a faceless daily space-news channel: one real space story a day, explained in under a minute, with the source on screen. This system governs every Short (1080 x 1920, 9:16), the weekly long-form video, thumbnails, and channel art. The frame is photo-first and fast; the type is calm and precise; amber is the only accent.

## Content fundamentals

- **Voice.** Plain, specific, present tense. Name the real thing and its real number: "Artemis I lifts off." "A 3-minute, 27-second burn sends Orion home." No hype words, no questions as hooks, no emoji.
- **Facts.** Every fact on screen comes from the video's source list. Never round a number into a different claim. Dates are written `MON 19 OCT` (data) or `Dec. 11` (captions).
- **Captions** are the narration, word for word, in sentence case. 1 to 4 words per line, at most 2 lines per chunk.
- **Series.** Every Short belongs to one of four named series and shows it for the whole Short: `LAUNCH DAY`, `JUST DISCOVERED`, `HOW DOES THAT WORK`, `BY THE NUMBERS`.
- **Ending.** Every Short ends on the NEXT card: `NEXT ON <SERIES>`, one line naming a real upcoming event, its date, and a pointer ("Follow for the launch", or "This week in space · Sunday").
- **Credits.** Every photo on screen shows its credit exactly as supplied (`NASA/Joel Kowsky`, `NASA/Bill Ingalls`, `NASA`).

## Visual foundations

### Color
- Set every text box, diagram and the NEXT card on `ink`.
- Set all text in `paper`. Use `amber` only for: the newest caption word, series marks, the chip value and echo mark, diagram strokes, key numbers on `ink`, and DELAY in the wordmark.
- Put `muted` on `ink` only, for units and secondary labels; never on a photo.
- Put each caption line on `caption-box`. When giant `paper` type sits directly on a photo, add a flat `photo-scrim` between 25% and 35% and measure: the worst pixel under the type must reach 4.5:1. Never a gradient.

### Type
- Display face: Archivo (Google Fonts, variable width axis 62 to 125). Load `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@500&display=block` and wait for `document.fonts.ready` before the first frame.
- `giant-number` (Archivo 800, width 112, 300 to 400px, uppercase, tabular numerals) for hooks, count-ups and dates; it may start at x 40.
- `caption` (Archivo 700, width 100, 90px, sentence case) for narration.
- `headline` (Archivo 800, width 112, 88px, uppercase) for the NEXT card line.
- `wordmark` (Archivo 800, width 125): SIGNAL in `paper`, DELAY in `amber`, always after the echo mark.
- `kicker`, `chip`, `data`, `credit`, `diagram-label`: IBM Plex Mono 500. Every number, label, credit and unit is mono.

### Layout (Shorts, 1080 x 1920)
- Text lives inside x 80 to 900, y 260 to 1500 (`margin-shorts`); YouTube's controls cover the rest.
- Fixed positions, identical every day: kicker at y 246, chip at y 302, captions in the y 1160 to 1440 zone, credit at y 1458. No progress bar (it reads like Instagram story segments).
- Everything is left-aligned. Boxes are square (`radius-none`); only the echo mark is round (`radius-round`).

### Imagery
- Real photos first: NASA media (public domain), ESA only with its required credit. No webcast footage without a confirmed license.
- A photo fills the whole 1080 x 1920 frame, cropped per shot. No added glow, flare or gradient; a real flare in the source stays as shot.
- **An image must show what the narration says.** When no real image fits a beat, use flat amber line art (see Diagram); the credit slot then names the source of the facts ("Source: NASA"). Never reuse an unrelated photo, and never add filler labels or fake readouts.
- AI imagery only as clearly labeled illustration, never as a photo of a real mission.

### Motion
See the Motion section. In one line: the Short flows like one continuous shot (a persistent amber dot or photo carries across beats, motion carries through cuts, photos move in parallax layers, fast moves get motion blur), words cut in one at a time with the newest word in `amber`, numbers count up and never show zero, and the cat moves like a character, never a sticker.

### Banned
Starfields or particles, purple or blue nebula gradients, glow, bloom, added lens flares, HUD rings or sci-fi interface chrome, frosted glass, typewriter text, fade-and-slide-up on everything, everything entering at once, centered layouts, emoji, Inter, Roboto, Arial.

## Voice and sound
- Narrator: Gemini 3.8 Flash TTS voice `Puck`, creator-style direction with faint cat hints (see `VOICE.md` in the repo). Captions take their words from the script and their timing from speech-to-text.
- Music: original beds generated with Google Lyria, conformed to 120 BPM, ducked 18 to 20 dB under the voice. Rotate beds so no two Shorts in a row share one. Never use copyrighted music.
- Sound effects: synthesized in code; only on beats that matter (big numbers, key transitions, the cat's entrances, the chip), never on every move.
- Sonic logo: a note and its delayed echo, 0.40 s apart, on the wordmark.
- Final mix: -14 LUFS integrated, true peak at or below -1.5 dBTP.

## The mascot
- The Night Shift cat: a young, nerdy black cat whose eyes are the echo mark, in a headset and an oversized jacket. Drawn by code from one rig, never generated, never mirrored (the solid disc stays viewer-left).
- He is a guide and a reaction, not the source of facts: he enters, travels, points, reacts and exits; facts come from the narration and the on-screen sources.
- He never covers caption words or the subject of a photo.

## Iconography
- Four series marks, amber, 28 x 28 (assets in Series): an upward triangle (`LAUNCH DAY`), a four-point diamond (`JUST DISCOVERED`), a circle with a crosshair (`HOW DOES THAT WORK`), three ascending bars (`BY THE NUMBERS`).
- The echo mark (assets in Marks): a solid amber dot and a hollow amber ring offset to its right, a signal and its delayed echo. It leads the wordmark, the chip, and the avatar.
- No other icons. The NEXT card pointer uses one amber arrow drawn as a line.

## Channel art
- Avatar: the echo mark on `ink`, 800 x 800, readable at 98px inside the circle crop.
- Banner: 2560 x 1440, all text inside the centered 1546 x 423 safe area.
- Long-form thumbnail: 1280 x 720, a real photo, at most 4 large words, readable at 320 x 180, nothing in the bottom-right corner (duration badge).
