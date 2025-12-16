# Wib&Wob Pachi Pachi

Playful, emoji-grid symbient chat: browser UI shows a Pachi-Pachi avatar that blinks, claps, and mouths along while speaking Japanese.

A small Node server proxies Anthropic (chat text) and ElevenLabs (JP TTS) so keys stay server-side.

## Quick start
- `npm install`
- `npm run dev` → http://localhost:3000 (set `PORT` to override)
- `npm test` runs the small shared utility tests

## Env keys
- `ANTHROPIC_API_KEY` (chat text), `ANTHROPIC_MODEL` optional default `claude-haiku-4-5`
- `ELEVENLABS_API_KEY` (voice), `ELEVENLABS_VOICE_ID_JA` default `fUjY9K2nAIwlALOwSiwc`, `ELEVENLABS_MODEL_ID` default `eleven_multilingual_v2`

## What it does
- Emoji-grid avatar with eye blink mirroring (MediaPipe face landmarks), mouth driven by audio RMS, clap SFX before speech.
- Scramble cat pops in on clap/idle/manual trigger; clap detection via mic energy or MediaPipe Hands.
- Subtitles stack below the grid; export button saves chat JSON; debug overlay shows mic/cam/blink/clap state.

## Notes
- Frontend is plain JS + Tailwind CDN (no build step); server uses native TS via `--experimental-strip-types`.
- API keys must never be shipped to the client; keep secrets in `.env` (auto-read on startup).
