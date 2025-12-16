# Wib&Wob Pachi Pachi

## What this is
- Single-page Node app: static frontend in `public`, thin server in `src/server.ts` that calls Anthropic for Japanese replies then ElevenLabs for JP TTS. If keys are missing, it returns stub text + a generated WAV beep so the app still works offline.
- Avatar (“Pachi-Pachi”) is an emoji grid with mouth animation from audio RMS, blink mirroring via MediaPipe FaceLandmarker, and clap-triggered cat cameo (“Scramble”). Clap sound effects live in `src/samples` and are served under `/samples/*`.
- Brutalist/mono UI, Tailwind CDN, plain JS; no bundler or build step by design.

## Run & test
- `npm install` (once), then `npm run dev` → http://localhost:3000 (override with `PORT`). `npm run dev:watch` auto-reloads the server. Unit tests: `npm test` (covers animation/audio helpers).
- `.env` is auto-read at startup by `loadEnvFromFile`. Keep secrets out of `public`.

## Env keys
- `ANTHROPIC_API_KEY` (required for live chat), optional `ANTHROPIC_MODEL` default `claude-haiku-4-5`.
- `ELEVENLABS_API_KEY` (required for live audio), optional `ELEVENLABS_VOICE_ID_JA` default `fUjY9K2nAIwlALOwSiwc`, `ELEVENLABS_MODEL_ID` default `eleven_multilingual_v2`.
- Missing keys → graceful fallback JSON + WAV stub. Preserve this behavior for demos/offline.

## HTTP surfaces
- `POST /api/chat { userText, history? }` → `{ reply_ja, reply_en?, audio:{ type:'base64'|'url', mime, value }, timestamps?, meta }`; defensive JSON parsing and fallback reply on errors.
- `POST /api/scramble-tts { text }` → base64 audio or stub beep.
- `GET /samples/{clap_soft|clap_mid|clap_sharp}.wav` serves clap SFX. Static assets come from `public`.

## Frontend essentials (`public/app.js`)
- Emoji grid with eye/mouth states; Scramble cat tile toggles on triggers.
- Attention animation (👏 pulses) runs before audio and on clap; plays random WAV each beat.
- Audio playback uses `AudioContext` analyser RMS + hysteresis to drive mouth; smoothing helpers duplicated client-side.
- Blink mirroring: MediaPipe FaceLandmarker (@0.10.8 via CDN) EAR thresholds (open 0.26, close 0.21). Idle blink fallback when camera off/denied.
- Clap triggers: mic energy >0.6 (debounced) and/or MediaPipe Hands distance <0.12; both funnel into `triggerScramble`, which may call `/api/scramble-tts`.
- Debug overlay (toggle `dbg`) shows EAR/clap/mic/cam states; export button downloads chat JSON. Dependencies are CDN-fetched (Tailwind, MediaPipe); keep zero-build setup.

## Shared utilities & tests
- `src/shared/audio.ts` builds WAV stub; `src/shared/animation.ts` defines attention patterns, mouth state transitions, and smoothing. Covered by `tests/utils.test.ts`.
- WAV samples live in `src/samples`; server whitelist mirrors this set.

## Contribution guardrails
- Preserve brutalist mono aesthetic and emoji-grid rendering; avoid introducing bundlers unless necessary.
- Keep API keys server-only; do not leak to client.
- Maintain graceful fallbacks (stub text/audio) and the debug overlay when adding features.
- For new Scramble/Wib/Wob behaviors, stay aligned with PRDs/research in `workings/`.
