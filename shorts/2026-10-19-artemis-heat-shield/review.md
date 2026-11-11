# Review: 2026-10-19-artemis-heat-shield (HOW DOES THAT WORK)

Status: pending approval. Planned publish date: Tue Oct 20, 2026 (How Does That Work has not run yet; the previous Short, Oct 19, is pilot 2, Just Discovered). Video: `out/final.mp4` (33.9 s, 1080 x 1920, -13.9 LUFS, true peak -2.1 dBTP). Nothing was uploaded.

## Why this story
Research on Oct 19 (`research/2026-10-19/candidates.json`, 68 items) was pre-filtered to six pages; Haiku triage (`research/2026-10-19/triage/haiku.md`) ranked them: 1 Artemis II heat shield analysis (NASA, Oct 15), 2 Juice Earth flyby (ESA), 3 Moon batteries (NASA), then ExoMars twin, Euclid comet (Just Discovered, not allowed after pilot 2), station solar arrays. The heat shield story has a clear engineering payoff (NASA changed the reentry path, not the material story people expect), a hard number contrast (nine spots of char loss versus 103), real NASA and US Navy photos of both shields, and a dated NEXT event (NASA Moon plans update, Fri Oct 23, media advisory M26-081).

## Script (88 words)
> Orion came home at 39 times the speed of sound, and the cabin stayed in the mid-70s.
> Outside, it passed 4,000 degrees Fahrenheit. The heat shield took it: 186 blocks of Avcoat.
> After Artemis I, NASA changed the path home.
> How? It capped how far Orion could fly through the atmosphere, so less time in the temperature range that damaged Artemis I.
> The result: nine spots of char loss. Artemis I had 103.
> NASA updates its Moon plans on Friday, October 23. Follow Downlink Cat for the update.

## Fact check
Every claim and every photo caption is in `factcheck.md` with its quote; `python3 pipeline/quotecheck.py` matched 14 of 14 quotes against the live pages on 2026-10-19 at 17:05 UTC. Judgment calls (also in `factcheck.md`): two unsourced lines of the Sonnet draft were rewritten ("NASA did not rebuild that shield", "Same shield, smarter flight path"); "factor of ten" was not used because it covers cracking and char loss together; the page is NASA's own assessment and the laser-scan and sample work continues, which the script does not contradict.

## Voice
Three takes. With no aliases, all three failed verification; voice.py kept take 3, which had dropped the sentence "Artemis I had 103." Take 2 has every word; its only differences were Whisper spellings ("Artemis 1", "AVCODE"), so take 2 was promoted (`voice.json`, `promoted`). Listener check: "Avcoat" may sound like "av-code" (Whisper heard "AVCODE" and "afcode" in two takes). If it does, re-voice is about one cent.

## QA notes (3 still rounds, then the full render)
- Round 1: cabin beat (frames 106 to 160) showed no number and a tiny diagram; Artemis I photo label below y 1160; diagram labels "Splashdown" and "Pacific Ocean" overlapped; the cat covered the pointer and wordmark on the NEXT card; cat on screen 65%.
- Round 2 and 3: focus boxes tightened (landscape photos show only about 37% of their width in 9:16), photos framed right, the diagram moved to the full frame, the ring mark on the Artemis I photo removed (it marked nothing the narration names), the cat hops onto the pointer box on "Downlink". Final build: OK, cat 56% on screen, 15 different moves, lint 0, caption sync max 0.5 frames.
- Left as is: the Artemis I photo (frames 396 to 459) shows the top and side of the Artemis I capsule, not its heat shield; the path diagram (frames 459 to 662) is clear but sparse, with the lower third of the frame empty after the cat exits at frame 604; the NEXT card is mostly empty for its first 1.5 s (frames 812 to 865) while the headline lands.
- Mix report warning: the video is 0.01 s shorter than the mix; the sonic logo starts at 32.28 s and finishes inside the 33.87 s video.

## Costs and time (wall clock, Oct 19, 2026, UTC)
| Step | Time | OpenRouter |
|---|---|---|
| Research (research.py, pre-filter, page fetch) | 17:00 to 17:02 | 0 |
| Triage (Haiku 5.5 via pipeline/llm.py; the first call returned empty and still cost about $0.002, not recorded by the tool) | 17:02 to 17:03 | $0.0032 + about $0.002 |
| Script (Sonnet 5.5 via pipeline/llm.py) | 17:03 to 17:04 | $0.0207 |
| Fact check and quote check | 17:04 to 17:06 | 0 |
| Assets | 17:05 to 17:10 | 0 |
| Voice (3 takes plus Whisper) and promotion | 17:06 to 17:08 | $0.0251 |
| Captions | 17:08 | 0 |
| Director (the session) and 3 QA rounds | 17:10 to 17:16 | 0 |
| Render | 17:16 to 17:27 (11 min) | 0 |
| Contact sheet, mix, sync | 17:27 to 17:29 | 0 |
| Package, queue, log | 17:29 to 17:35 | 0 |
| Total | about 35 minutes plus runbook writing | about $0.051 |

## Self-review
Strongest: the payoff is real and visible: the 9 and 103 beats sit on NASA's own side-by-side photo, so the viewer sees the cracked Artemis I shield next to the clean Artemis II one, and every line is sourced. Weakest: the middle (the path diagram) is thinner than the pilots' hand-tuned diagrams, and the hook number sits on a sky photo where Orion is small; compared with the pilots it has less cat choreography variety and no signal-delay chip (the story is about Earth reentry, so none applies).
