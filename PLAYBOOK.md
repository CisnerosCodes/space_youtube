# Downlink Cat: channel playbook

The rules every script, video, title and upload must follow. The pipeline reads this file; change it here, not in code.

## Identity
- Name: Downlink Cat (renamed from Signal Delay on Oct 16, 2026). Handle: @downlinkcat (fallback @downlinkcathq if taken). Channel ID: UC30o4V9vQ6ReBOpbCY2_7lg (created Oct 14, 2026).
- Why the rename: another space channel, "Signal Delay" (@SignalDelay-22, UCKmS_6B0Ip8dmGbfHjfcTsA, joined Oct 6, 2026), was first in the same niche, with a weekly show. Before naming anything again, search YouTube channels, handles, TikTok, Instagram and X for the exact name, not only handle availability.
- "Signal delay" stays as a science label on screen (the one-way light time chip); it never names the channel. Google account: Brand Account under latentdrives@gmail.com.
- Positioning: one real space story a day, explained in under a minute, with the source on screen.
- Output: one 30 to 45 second Short per day, plus one 8 to 10 minute "This week in space" long-form video per week, built from the same week's research.
- Voice: one anonymous AI narrator, never a clone of a real person, on a plan that allows commercial use. Chosen in Phase 3.
- Visual identity: the v1 design system (made as Signal Delay, renamed Downlink Cat) (Full Bleed base with Telemetry type, amber accent and labeled diagrams).

## House animation style (decided Oct 20, 2026)
- Anime action is the house style from now on (the owner's pick after the seven-style experiment in `lab/ultra/`; it scored highest with all three judges and renders in about 2 minutes). Reference build: `lab/ultra/anime/` (page, NOTES.md, the polish and verify notes). Night Shift in his anime design, Pho the Phobos moon as a recurring character where it fits, kinetic captions, speed lines, impact frames (at most 3 flashes per second), katakana sound-effect lettering as flavor.
- The truth rules do not change: facts only from the fact-check table, exact credits on real images, drawn spacecraft labeled "Illustration", captions verbatim and on time.

## Named series (rotate; never post two of the same series in a row)
| Series | What it is |
|---|---|
| Launch Day | What is launching today and why it matters. |
| Just Discovered | A new paper or image, explained. |
| How Does That Work | The engineering behind today's news. |
| By the Numbers | One striking comparison. |

## Hard rules (YouTube inauthentic content policy)
- No two videos may feel interchangeable: vary hooks, pacing and visuals, not only the series.
- Every script contains a real, sourced insight. Every video keeps a source list.
- Every video waits in the approval queue; a human approves the script and the video before anything posts.
- Visuals: NASA media first (follow NASA's media usage guidelines). ESA images only with the required credit. No SpaceX or other webcast footage unless its license is confirmed. AI images only as clearly labeled illustration, never passed off as real photos of real missions.
- An image must show what the narration says. When no real image fits a beat, use a labeled line diagram ("DIAGRAM · NOT TO SCALE"), never an unrelated photo.
- Every photo on screen carries its credit.
- Audio: no copyrighted music.
- Use YouTube's altered or synthetic content disclosure whenever a realistic AI visual could mislead.
- Facts come only from the sources in the video's source list; the lead model checks every fact before the script reaches the approval queue.

## Growth rules (design for subscribing, not only views)
1. Recurring identity: the same narrator, the four named series, and the same visual signature every day.
2. A reason to return: where it fits, every Short ends on a NEXT card with a real, dated upcoming event (from Launch Library 2 or the source), for example "Japan's MMX launches for the moons of Mars. Mon 19 Oct."
3. Tie every Short to the weekly long-form video. Shorts descriptions and comments cannot carry clickable links, so use YouTube's "Related video" link on each Short to point at the latest long-form video (verify the current Studio and API support in Phase 5).
4. Specific titles: every title names a real, dated event. No title pattern repeats within 14 days.
5. Cross-post to TikTok and Instagram Reels from day one, as free distribution, not for income.

## Review gate after the first 30 Shorts
| Metric | Target | Where to read it |
|---|---|---|
| Median views per Short | above 1,000 | YouTube Studio, Content tab |
| Subscribers per 1,000 views | above 3 | Studio, Analytics: subscribers gained / views x 1,000 |
| Retention at 15 seconds | above 70% | Studio, the audience retention curve of each Short; also track "Stayed to watch" vs "Swiped away" |

If any target is missed, change the format before adding volume.

## Upload path (verified Oct 15, 2026)
- Uploads use the "Channel Ops" OAuth client (project playtest-channel, In production, unverified) on latentdrives@gmail.com, minted per channel with Hermes' `ytmint.py`. No Google Cloud work is needed for a Brand Account on latentdrives.
- No unaudited-client lock: all 13 Gambitss API uploads are public, including 8 uploaded private with `publishAt`, which YouTube published on schedule to the second.
- Approved videos upload as private with a `publishAt` time, so a post can still be pulled before it goes live.
- The channel token was minted by Hermes on Oct 15, 2026 (scopes youtube.upload, youtube, yt-analytics.readonly); it lives in the gitignored `.env` on the owner's computer. A rename does not change the channel ID or the token.
- AI disclosure (checked Oct 15, 2026 against YouTube help answer 14328491): every upload sets `containsSyntheticMedia: true` (Studio "AI use: Yes") because the music is AI-generated; YouTube says disclosure alone does not limit reach or earning.
- Uploader: `pipeline/youtube_upload.py` (private + `publishAt`, credentials from `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`). Pilot schedule: `lab/pilots/PUBLISH.md`.
- Shared-account watch item: MAGNETIC VALENTINE's "Love at First Taste" carries an "Other notices" flag in Studio. A strike on any channel of this Google account puts every channel on it at risk, Downlink Cat included.

## Spending
- Voice is the only planned spend (budget ceiling about $4 per week; expected well under $1 per week with Fish Drama 3, about $1 per week with Eleven v4 Turbo).
- Do not buy paid layers (video SaaS, scheduling SaaS) until the free or cheap stack has cleared the review gate.
- Log the cost of every run.
- Voice licensing (decided Oct 15, 2026): during testing we publish with voices bought through OpenRouter without a separate written commercial-use confirmation. Fish's own terms grant commercial use to users of its Paid Services; whether OpenRouter billing counts is unconfirmed. Revisit before the channel earns money (or when switching voice models).
