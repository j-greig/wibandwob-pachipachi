# Wib&Wob Pachi Pachi

<img width="1270" height="1329" alt="image" src="https://github.com/user-attachments/assets/e8440999-bc4f-4998-990f-7b4808b3aaa9" />

Playful two-headed emoji avatar that chats in Japanese. Blinks, claps, mouths along to speech. Real-time animation synced to audio energy. MediaPipe face/hand tracking optional. Anthropic Claude for chat, ElevenLabs for TTS.

See [workings/TODO.md](workings/TODO.md) for the feature wishlist.

## Quick Start

```bash
npm install
npm run dev                    # http://localhost:3000
npm test                       # Run unit tests
```

## Environment

```
ANTHROPIC_API_KEY             # Required for chat
ELEVENLABS_API_KEY            # Required for voice
ANTHROPIC_MODEL               # default: claude-haiku-4-5
ELEVENLABS_VOICE_ID_JA        # default: fUjY9K2nAIwlALOwSiwc
ELEVENLABS_MODEL_ID           # default: eleven_multilingual_v2
PORT                          # default: 3000
```

See **[CLAUDE.md](./CLAUDE.md)** for detailed architecture, API integration, implementation notes, and contribution guidelines.
