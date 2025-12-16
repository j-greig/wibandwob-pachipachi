# Wib&Wob Pachi Pachi

Playful two-headed emoji avatar that chats in Japanese. Blinks, claps, mouths along to speech. Real-time animation synced to audio energy. MediaPipe face/hand tracking optional. Anthropic Claude for chat, ElevenLabs for TTS.

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
