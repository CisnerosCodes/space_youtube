# Music beds: origin, license terms and watermark

Checked on 2026-10-15. These are notes from reading the terms, not legal advice. Check them again before the channel joins the YouTube Partner Program, because the model is still a preview.

## What these files are
- Six instrumental beds, `bedA_pluck` to `bedF_house`, generated on 2026-10-15 with Google Lyria 3 Clip (`google/lyria-3-clip-preview`, served by Google AI Studio) through OpenRouter.
- Every prompt asks for instrumental music only and names no artist, song or label. Each call returned the text tag `<instrumental>`. The full prompts, generation IDs, timestamps and costs are in `paid_calls.json`. Keep that file: it is the proof of where the music came from if a claim ever has to be disputed.
- `raw/` holds the files exactly as Lyria returned them (30.8 s MP3s). `raw/bedA_pluck_v1_raw.mp3` is a rejected first take (it has a 4 s dropout) and is not used.
- The WAV and MP3 beds in this folder were made from the raw files by `prep_beds.py` (time-stretched to 120 BPM, looped to 64 s, loudness-normalized).
- The SFX kit and the sonic logo (`../sfx/`) contain no samples or generated audio. `make_sfx.py` synthesizes them from scratch in numpy, so no third-party terms apply to them.

## What Google's terms say about using the output

**Ownership and use: Gemini API Additional Terms of Service**, https://ai.google.dev/gemini-api/terms (page "Last updated 2026-04-28 UTC"), section "Use of Generated Content":
> "Some of our Services allow you to generate original content. Google won't claim ownership over that content. You acknowledge that Google may generate the same or similar content for others and that we reserve all rights to do so. As required by the API Terms, you'll comply with applicable law in using generated content, which may require the provision of attribution to your users when returned as part of an API call. Use discretion before relying on generated content, including code. You're responsible for your use of generated content, and for the use of that content by anyone you share it with."

Section "Disclaimers":
> "Use discretion before relying on, publishing, or otherwise using content provided by the Services."

The terms do not forbid commercial use or monetized videos, and they do not mention YouTube. Google does not claim the music. Google also does not promise exclusivity: it "may generate the same or similar content for others". I found no separate clause for preview (pre-GA) models on that page.

**OpenRouter's terms**, https://openrouter.ai/terms:
> "Your ownership rights in the Output are set forth in the Model Terms for each Model you use."

OpenRouter passes the question on to Google's terms above, and it disclaims any warranty that output fits a given use.

**Prohibited uses: Generative AI Prohibited Use Policy**, https://policies.google.com/terms/generative-ai/use-policy ("Last Modified: December 17, 2024"). The relevant line forbids content that:
> "Violates the rights of others, including privacy and intellectual property rights"

The policy also forbids "Circumvention of abuse protections or safety filters". Our prompts name no artists, and we must never try to remove the watermark (see below).

**Model limits: Lyria documentation**, https://ai.google.dev/gemini-api/docs/music-generation ("Last updated 2026-10-01 UTC"):
> "Safety: All prompts are checked by safety filters. Prompts that trigger the filters will be blocked. This includes prompts that request specific artist voices or the generation of copyrighted lyrics."

## SynthID watermark and C2PA metadata
- From the Lyria documentation (same URL):
  > "Watermarking: All generated audio includes a SynthID audio watermark for identification. This watermark is imperceptible to the human ear and does not affect the listening experience."
- From the SynthID page, https://deepmind.google/models/synthid/:
  > "SynthID embeds a watermark into any audio generated or published through our AI music generation model Lyria [...] It's inaudible to the human ear, and can't be altered by common modifications like adding noise, MP3 compression, or changing the speed of the track."

  The same page says the public SynthID Detector lets "anyone" check whether a file "was made with AI from Google".
- What this means for us: the watermark survives our time-stretching, looping, ducking and encoding. Every Signal Delay video that uses these beds can be identified as containing Google-made AI music. That is acceptable, and we do not try to remove it.
- C2PA: each raw Lyria MP3 also carries a Google-signed C2PA manifest (an `application/c2pa` ID3 frame; claim generator "Google C2PA Core Generator Library"). Our processed WAV and MP3 beds and the mixes are new files without that manifest. The SynthID watermark stays in the audio itself.

## YouTube disclosure
From YouTube Help, "Disclosing use of GenAI content", https://support.google.com/youtube/answer/14328491:
- Creators must disclose GenAI content that "Creates music that's the main focus of the video". The examples of content that needs disclosure include, without qualification, "AI generated music".
- YouTube "may automatically apply an AI label" for "Content that contains C2PA metadata" and "Content that our internal systems detect is AI generated or altered".
- "Disclosing AI content alone won't limit a video's audience or impact its eligibility to earn money."
- "Creators who consistently choose not to disclose this information may be subject to manual application of a label, or penalties from YouTube, including removal of content or suspension from the YouTube Partner Program."

Our beds are background music, not "the main focus". Even so, the example list names "AI generated music" outright, and the watermark can be detected. The safe choice is to answer **Yes** to "AI use" in Studio for every video that uses a Lyria bed. YouTube says the label costs nothing in reach or revenue. This fits the playbook rule on disclosure.

## Copyright-claim risk and what to do about it
- The beds are original generations, so they should not match any Content ID reference. The remaining risk comes from the terms themselves: Google may give other users "the same or similar content". Someone could register similar AI music in Content ID, or upload it to a distributor that does, and that could trigger a false claim on our video. If that happens, dispute the claim with the generation ID, timestamp and prompt from `paid_calls.json`.
- Never submit these beds to Content ID or to music stores ourselves. We cannot claim exclusive rights in them.
- If the channel ever needs music that is fully owned and has no watermark, fall back to code-synthesized beds made the same way as `../sfx/`.

## Cost
Seven Lyria 3 Clip calls at $0.04 each, $0.28 in total, as reported by `GET https://openrouter.ai/api/v1/generation?id=<id>`. Six of the beds are in use; the seventh call is the rejected take of bedA. See `paid_calls.json`.

## Added Oct 20, 2026: three more beds (bedG, bedH, bedI)
- `bedG_cinepulse` (cinematic orchestral-hybrid with a synth pulse), `bedH_caper` (playful chiptune-adjacent caper) and `bedI_darkpulse` (dark, tense electronic pulse), made for the ultra animation lab (`lab/ultra/kit/`). Same model (`google/lyria-3-clip-preview`), same instrumental-only `COMMON` prompt, no artist, song or label named. Every kept call returned the text tag `<instrumental>`.
- Five calls in all. The first prompts for bedG and bedI came back with no audio: OpenRouter's `/generation` record shows Google's `native_finish_reason` `OTHER` and `total_cost` 0, so they were blocked and not billed. Both prompts were rewritten in plainer words and retried once each. Three paid calls at $0.04, $0.12 for the three beds; the log total is now $0.40. Prompts, generation IDs and costs: `paid_calls.json`.
- Conformed by `prep_beds.py bedG_cinepulse bedH_caper bedI_darkpulse` (the new id arguments process only those beds and leave the other `beds.json` entries unchanged; the six older WAVs were checked unchanged by md5). All three are 120 BPM on the grid, 64 s, -16 LUFS.
- The same terms, SynthID watermark, disclosure answer (**Yes** to "AI use") and claim-dispute notes above apply to them.
