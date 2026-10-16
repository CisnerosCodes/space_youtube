# Publishing the three pilots

Status: READY (Downlink Cat renders pushed Oct 16, 2026)

Approved by the owner on Oct 15, 2026. On Oct 16 the channel was renamed from Signal Delay to Downlink Cat (see PLAYBOOK.md, Identity), so the three Signal Delay uploads from Oct 15 (cUT2N21Rd4c, 8q_GOVc-QAw, Tk6iehSEEVg) are replaced by new renders. Each Short uploads **private** with a `publishAt` time, so any one can still be pulled in Studio before it goes live.

If it is already past 15:30 UTC on Oct 16 when you upload, shift all three times by one day (p1 Sat, p3 Sun, p2 Mon Oct 19 at 16:00 UTC) and say so.

| Order | Short | Publish at (UTC) | Local (ET) | Why this slot |
|---|---|---|---|---|
| 1 | `p1_mmx` (Launch Day) | 2026-10-16T16:00:00Z | Fri Oct 16, 12:00 pm | Before the launch (Launch Library 2, rechecked Oct 15: NET 2026-10-19T19:41Z, status Go). |
| 2 | `p3_perseverance` (By the Numbers) | 2026-10-17T16:00:00Z | Sat Oct 17, 12:00 pm | The record is from Oct 11; it ages fastest of the remaining two. |
| 3 | `p2_webb_frb` (Just Discovered) | 2026-10-18T16:00:00Z | Sun Oct 18, 12:00 pm | Paper from Oct 8; evergreen enough to go last. |

## Commands (run where the token lives)

```
export YT_CLIENT_ID=...  YT_CLIENT_SECRET=...  YT_REFRESH_TOKEN=...   # Channel Ops client + the channel's refresh token
python3 pipeline/youtube_upload.py lab/pilots/p1_mmx          --publish-at 2026-10-16T16:00:00Z
python3 pipeline/youtube_upload.py lab/pilots/p3_perseverance --publish-at 2026-10-17T16:00:00Z
python3 pipeline/youtube_upload.py lab/pilots/p2_webb_frb     --publish-at 2026-10-18T16:00:00Z
```

Add `--dry-run` first to see the exact request. Each upload writes `upload.json` (video ID, URL, schedule) next to `metadata.json`, and refuses to run twice: move the Oct 15 `upload.json` files aside (for example to `upload.signal-delay.json`) before uploading the new renders.

## Settings every upload carries
- Category 28 (Science & Technology), language en, not made for kids.
- `containsSyntheticMedia: true` (Studio: "AI use: Yes"). YouTube's help page (answer 14328491, read Oct 15, 2026) lists "AI generated music" among content to disclose; our music is AI-generated. The same page says disclosure alone does not limit reach or earning.
- Title, description (sources, credits, the AI line) and tags come from each `metadata.json` unchanged.

## After upload (in Studio, by hand, about one minute each)
- Check the scheduled time and the "AI use" setting show as expected.
- Leave "Related video" empty until the first weekly long-form exists.
