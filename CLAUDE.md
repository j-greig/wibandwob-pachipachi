# Overview

**Wib&Wob Pachi Pachi** is an interactive avatar system featuring a dual-personality Japanese-speaking character powered by Anthropic's Claude for chat replies and ElevenLabs for text-to-speech. The system renders an emoji-grid avatar with dynamic mouth/eye/clap animations synced to audio, plus optional computer vision integration via MediaPipe.

**Key characteristics:**
- ASCII/emoji grid-based avatar with multiple expression states
- Real-time animation driven by audio energy and attention patterns
- Two-way integration: Anthropic API for chat, ElevenLabs API for voice
- Browser-based client with WebSocket/HTTP communication
- TypeScript with Node.js (experimental strip-types for native TS support)

---

## Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Set up environment
cp .env.sample .env
# Edit .env and add: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY
```

### Common Commands

#### Run Development Server
```bash
npm run dev
# Starts HTTP server on http://localhost:3000
# Server auto-loads .env; listens for POST /api/chat and /api/scramble-tts

npm run dev:watch
# Same as dev but restarts on file changes (requires --watch support)
```

#### Run Tests
```bash
npm test
# Runs all *.test.ts files using Node's native test runner
# Tests use strict assertions and are located in /tests

# Run single test file
npm test -- tests/utils.test.ts
```

#### Build/Lint
Currently no build step. TypeScript is validated at runtime via `--experimental-strip-types` flag. For validation, use your IDE or:
```bash
# Manual check (requires tsc to be installed globally or locally)
npx tsc --noEmit
```

---

## Architecture

### Graceful Degradation

The system is designed to work offline or with missing API keys. If either `ANTHROPIC_API_KEY` or `ELEVENLABS_API_KEY` is absent, the server returns stub text (Japanese fallback) and a generated WAV beep (880 Hz sine wave). This preserves the full user experience for demos or local development without credentials.

### Backend (Node.js HTTP Server)

**`src/server.ts`** — Main HTTP server. Handles:
- **GET** `/` → serves `public/index.html` (static files)
- **POST** `/api/chat` → chat with Anthropic, returns JSON with reply + audio
- **POST** `/api/scramble-tts` → generate TTS-only audio (for "scramble" actions)
- **GET** `/samples/{clap_*.wav}` → serves pre-recorded clap samples (soft/mid/sharp)

**Response structure** from `/api/chat`:
```typescript
{
  reply_ja: string;          // Japanese reply from Anthropic
  reply_en?: string;         // English gloss
  audio: {
    type: 'base64';
    mime: 'audio/mpeg' | 'audio/wav';
    value: string;          // base64-encoded audio
  };
  timestamps: number[];      // Alignment timestamps (currently empty)
  meta: {
    source: 'live' | 'fallback' | 'fallback-missing-keys';
    anthropic_model?: string;
    eleven_voice?: string;
    emotion?: string;        // calm, excited, shy, smug (future: glitch, recursive)
    scramble_chance?: number; // 0–1 probability for audio scramble effect
  };
}
```

**Anthropic prompt** (in `fetchAnthropicReply`):
- System prompt instructs Claude to always return strict JSON with `reply_ja`, `reply_en`, `emotion`, `scramble_chance` keys
- `emotion` enum: `calm | excited | shy | smug`
- `scramble_chance`: float from 0.0 to 1.0 (probability)
- Subgoal: help English speakers learn a tiny bit of Japanese through playful interaction (light, natural teaching moments in `reply_en` where they fit)
- Chat history is forwarded in messages array for context
- Temperature 0.9, max_tokens 200

**ElevenLabs integration**:
- Multilingual model v2 by default
- Voice settings: stability 0.35, similarity_boost 0.7, style 0.55
- Output format: MP3 22050 Hz, 32 kbit/s
- Fallback: generates stub 880 Hz sine-wave WAV if API keys missing

### Shared Utilities

**`src/shared/audio.ts`**:
- `generateBeepWav(config)` — generates a mono 16-bit PCM WAV buffer with RIFF header; used for stub audio when APIs unavailable

**`src/shared/animation.ts`**:
- `buildPulseSchedule(pattern, jitterMs)` — converts an attention pattern (array of durations) into cumulative timestamps with optional randomness jitter
- `nextMouthState(energy, prev, thresholds)` — hysteresis-based state machine (open/closed) from normalized audio energy
- `smoothEnergy(prev, current, factor)` — exponential smoothing filter to reduce audio noise
- `DEFAULT_ATTENTION_PATTERNS` — six pre-defined animation sequences for blinking/eye movement

### Frontend (Browser Client)

**`public/index.html`**:
- Single-page app with Tailwind CSS
- Main canvas: `<pre id="kun-grid">` rendering 2D emoji grid (9×10 cells)
- Input section: text field for chat, microphone button (MediaPipe face/hand tracking)
- Debug panel (bottom-right): shows camera, mic, animation state

**`public/app.js`** (21KB, ~700 lines):
- **Grid system**: 9×10 emoji matrix with named coordinates (eyes, mouth, claps, cat body)
- **State management**: `state` object tracking mouth animation, eye state, scramble visibility, subtitle queue
- **Animation loop**: `requestAnimationFrame` loop driving mouth/eye/clap pulses, subtitle rendering
- **Audio analysis**: Web Audio API creates real-time frequency analyzer from playing audio for mouth sync
- **API calls**: Fetch to `/api/chat` with user text + chat history
- **MediaPipe integration** (optional): Detects face/hand landmarks; triggers clap samples and scramble effects when hand gestures detected
- **Scramble effect**: Renders distorted/glitchy version of text temporarily; triggered by emotion or hand clap detection
- **Debug panel**: Real-time state overlay (toggle `dbg`); includes export button to download chat history as JSON

---

## Key Implementation Details

### Avatar Grid

The avatar is a 9-column × 10-row grid of emoji cells:
```
Row 0:  ⬜ ⬜ 👏 ⬜ ⬜ ⬜ 👏 ⬜ ⬜  (claps at columns 2 and 6)
Row 1:  ⬜ 🟥 🟥 🟥 ⬜ 🟥 🟥 🟥 ⬜  (face outline)
Rows 2-3: 🟥 🟥 🟥 🟥 🟥 🟥 🟥 🟥 🟥  (head)
Row 3:  🟥 👁️ 🟥 👁️ 🟥 👁️ 🟥 👁️ 🟥  (four eyes)
Row 4:  🟥 🟥 💋 🟥 🟥 🟥 💋 🟥 🟥  (two mouths for left/right faces)
Rows 5-8: body shape
Row 9:  ⬜ ⬜ 🟥 🟥 🟥 🟥 🟥 ⬜ ⬜  (cat tail bottom)
```

Multi-faced design: left pair of eyes + mouth, right pair + mouth. Used for dual Wib/Wob expressions.

### Mouth Animation

- Driven by audio frequency energy (0–1 normalized)
- Hysteresis prevents flickering: thresholds open=0.25, close=0.18
- Smooth energy filter (alpha 0.6) tames mic noise
- Mouth cells (💋) toggle open/closed
- Microphone clap detection: energy >0.6 (debounced) triggers clap sound sample

### Attention Patterns (Eye Blinking)

Six hardcoded sequences of durations (ms). Randomly selected and cycled:
```
[120, 90, 120, 240, 120]  // blink-blink-long-blink
[160, 140, 80, 180]       // ...
```

Pulses are drawn from these via `buildPulseSchedule()`, with optional jitter (±10ms typical).

**MediaPipe Face Tracking:** Uses FaceLandmarker (v0.10.8) to measure Eye Aspect Ratio (EAR). Blink thresholds: open 0.26, close 0.21. When camera is unavailable or permission denied, falls back to idle blink animation.

### Scramble Effect & Hand Detection

Triggered by:
1. **Emotion**: `scramble_chance` from Anthropic response (e.g., 0.15–0.42)
2. **Hand clap detection**: MediaPipe Hands detects hand landmarks; distance <0.12 between key points (e.g., thumb-to-finger) triggers clap

Effect: text rendered with random character substitution and opacity flicker for 400–800ms.

### Chat History

Stored client-side in `state.history` array. Each `/api/chat` call includes full history to provide context. No server-side persistence.

---

## API Integration Points

### Anthropic Claude API

**Endpoint**: `https://api.anthropic.com/v1/messages`

**Headers**:
```
x-api-key: {ANTHROPIC_API_KEY}
anthropic-version: 2023-06-01
```

**Model**: Configurable via `ANTHROPIC_MODEL` env var (default: `claude-haiku-4-5`)

**Request body**:
```json
{
  "model": "claude-haiku-4-5",
  "max_tokens": 200,
  "temperature": 0.9,
  "system": "You are Pachi-Pachi... [JSON schema instructions]",
  "messages": [
    { "role": "user", "content": "こんにちは" },
    { "role": "assistant", "content": "{...JSON...}" },
    ...
  ]
}
```

### ElevenLabs TTS API

**Endpoint**: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`

**Voice IDs**: Configurable. Default Japanese voice: `fUjY9K2nAIwlALOwSiwc`

**Headers**:
```
xi-api-key: {ELEVENLABS_API_KEY}
Accept: audio/mpeg
```

---

## Environment Variables

All loaded from `.env` file (see `.env.sample`):

```
ANTHROPIC_API_KEY         # Required for /api/chat
ELEVENLABS_API_KEY        # Required for TTS audio
ANTHROPIC_MODEL           # Claude model (default: claude-haiku-4-5)
ELEVENLABS_VOICE_ID_JA    # Japanese voice ID (default: fUjY9K2nAIwlALOwSiwc)
ELEVENLABS_MODEL_ID       # ElevenLabs model (default: eleven_multilingual_v2)
PORT                      # Server port (default: 3000)
```

---

## Testing Strategy

**Current tests** (`tests/utils.test.ts`):
- Audio WAV generation (RIFF header, size)
- Pulse schedule accumulation and ordering
- Mouth state hysteresis logic
- Energy smoothing filter

Use Node's native `test` module (no external test framework). Tests are assertion-based.

**Running**: `npm test` executes all `*.test.ts` files.

---

## Common Development Tasks

### Adding a New Chat Emotion

1. Add emotion string to Anthropic system prompt in `fetchAnthropicReply()`
2. Update response type parsing in `parseReplyJson()`
3. Add UI logic in `public/app.js` (e.g., new CSS class or animation)
4. Add test if emotion changes behavior (e.g., scramble threshold)

### Extending Animation Patterns

1. Add pattern array to `DEFAULT_ATTENTION_PATTERNS` in `src/shared/animation.ts`
2. Update test expectations in `tests/utils.test.ts`
3. Patterns are auto-selected randomly in frontend

### Adding API Endpoints

1. Add route in `src/server.ts` within the request handler
2. Return JSON via `sendJson(res, status, body)`
3. Static files are served automatically from `public/`

### Debugging Client State

- Open browser Dev Tools → Console
- Frontend logs to `console.log()` throughout `public/app.js`
- Debug panel (bottom-right of page) shows real-time state
- Use `?debug=1` query param (if implemented) to enable verbose logging

---

## Known Limitations & Future Enhancements

- **No server-side persistence**: Chat history lost on page reload
- **No video/face tracking in backend**: All MediaPipe integration is client-side
- **Scramble effect**: Text-only; audio is not scrambled (only chance is reported)
- **No speaker selection**: System always uses single ElevenLabs voice (Wib/Wob dual voices planned)
- **No timestamp alignment**: Audio/text syncing is visual only (future work)

---

## File Structure Summary

```
src/
├── server.ts                 # HTTP server, API endpoints, Anthropic/ElevenLabs calls
├── shared/
│   ├── audio.ts             # WAV generation utility
│   └── animation.ts         # Animation math (pulses, mouth, smoothing)
└── samples/
    ├── clap_soft.wav
    ├── clap_mid.wav
    └── clap_sharp.wav

public/
├── index.html               # Single-page app shell
├── app.js                   # Frontend logic, grid rendering, animation loop
└── favicon.ico

tests/
└── utils.test.ts            # Unit tests for shared utilities

workings/                     # Research docs & PRDs
├── prd_wibwob_enhancements.md
├── prd_clap_scramble_flow.md
└── ...

.env                          # Local secrets (not committed)
.env.sample                   # Example env template
package.json                  # Scripts: dev, dev:watch, test
```

---

## Contribution Guardrails

When extending this project, adhere to these principles:

**Design & Aesthetics:**
- Preserve the brutalist mono aesthetic and emoji-grid rendering; avoid UI frameworks or visual overhauls
- Avoid bundlers or build steps; keep the zero-build setup (TypeScript via `--experimental-strip-types`)
- Maintain graceful fallbacks (stub text + audio) so the app works offline or without API keys

**Security & Data:**
- Keep API keys server-only; never leak them to the browser or client-side code
- Preserve the debug overlay when adding features; it's valuable for demos and development

**Feature Alignment:**
- For Wib/Wob dual-personality enhancements, consult PRDs in `workings/` to ensure consistency
- Dual-consciousness theme (Wib = creative/chaotic, Wob = analytical/precise) should inform response styles and animations

**Technical Details:**
- **TypeScript**: Uses Node's `--experimental-strip-types` to run TS directly. For production, consider `esbuild` or `tsc`
- **Styling**: Tailwind CSS (CDN) in HTML. No separate CSS files
- **No external UI framework**: Vanilla JS in browser; all dependencies are CDN-fetched
- **API-first design**: Backend provides JSON; frontend handles all rendering and state
