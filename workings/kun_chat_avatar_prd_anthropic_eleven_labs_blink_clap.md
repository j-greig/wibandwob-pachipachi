# PRD: Wib&Wob Pachi-Pachi-kun (emoji-grid) chat avatar

## Progress checklist (live)
- ✅ Spike layout: centered emoji-grid (~80vh), subtitle area, fixed bottom input.
- ✅ Stub `/api/chat` returning Japanese reply text plus playable stub audio blob.
- ✅ Subtitle stack under avatar (Kun + Scramble variants).
- ✅ Attention 👏 rhythm plays before audio.
- ✅ Mouth state changes during playback (timestamp/algo placeholder ok).
- ✅ Blink behavior present (idle fallback when webcam denied).
- ✅ Webcam blink detection via MediaPipe EAR (graceful fallback).
- ✅ Clap detection hook and Scramble cameo path (mic-based).
- ✅ Hand-proximity clap detection (MediaPipe Hands) to trigger Scramble.
- ✅ Error/retry surface for LLM/TTS failure.
- ✅ Dev/debug overlay for blink/clap/mouth state (dev only).
- ✅ Tests: rhythm pattern schedule + mouth state smoothing utilities.
- ✅ Wire Anthropic + ElevenLabs (Yui) end-to-end for `/api/chat`.
- ✅ Attention audio uses clap SFX samples.

## Parking lot / nice-to-haves
- [ ] Streaming subtitles while generating audio.
- [ ] Server-side conversation tracking by `conversationId`.
- [ ] Dedicated cat voice for Scramble.
- [ ] Playwright E2E once UI stabilizes.

## 0) TL;DR
Build a TypeScript web app where a cute “Kun” emoji-grid character mirrors the user’s **blink** (via webcam), **speaks Japanese** using **ElevenLabs TTS**, and **replies via Anthropic Claude**. The UI is brutalist: **centered emoji-grid (80% viewport)**, **subtitles under the grid**, and a **ChatGPT-style input fixed to the bottom**.

Before Kun plays audio, it does a **short “clapper attention” animation** in a human-ish “morse rhythm” using the 👏 tiles. Bonus: detect real claps via mic; when a clap is detected, **Scramble** (cat) may appear and speak in cute cat-speak in its own bubble.

---

## 1) Goals
### 1.1 Primary goals
- **Chat**: user enters text → Kun replies in **Japanese** (text + voice).
- **Avatar presence**: Kun’s eyes **blink when the user blinks**.
- **Speech**: Kun plays **Japanese TTS** with synchronized **mouth states**.
- **Subtitles**: show exact Japanese text being spoken under the emoji-grid.
- **Attention cue**: 👏 tiles animate first (short, rhythmic) before audio starts.

### 1.2 Secondary goals
- **Clap detection** from microphone.
- **Scramble cameo**: on clap detection (and/or random chance), Scramble appears and emits short cat-speak bubbles.
- **Streaming feel**: partial subtitles while generating audio (optional).

### 1.3 Non-goals
- Multi-user accounts, auth, persistence across devices (Phase 2 only).
- Full 3D avatar, AR filters, or heavy animation framework.
- Perfect lip-sync for every phoneme (good-enough “mouth motion” is fine for v1).

---

## 2) Target users
- A single user in a browser (desktop preferred; mobile best-effort).
- Audience: people who want a playful chat toy with a minimal interface.

---

## 3) Core experience
1) User lands on page, sees centered emoji-grid Kun.
2) User grants webcam permission (for blink mirroring). Optional mic permission (for clap detection).
3) User types message in bottom input and hits Enter.
4) App sends message to server:
   - Anthropic generates Japanese reply (text).
   - ElevenLabs generates Japanese audio (plus timestamps when available).
5) UI shows subtitles immediately.
6) Kun does a short 👏 attention rhythm animation.
7) Audio plays.
8) Mouth animates (open/closed) driven by timestamps or audio amplitude.
9) User blinks; Kun blinks.
10) If user claps (mic), Scramble may pop in and “nya”-talk.

---

## 4) UX / UI requirements
### 4.1 Layout
- Fullscreen, single page.
- **Emoji-grid takes ~80% of screen** and is centered both horizontally + vertically.
- Below grid: **subtitle area**.
- Bottom: fixed chat input bar (ChatGPT-style):
  - single-line input; Enter to send; Shift+Enter does nothing (no multiline in v1).

### 4.2 Typography (strict)
- Font: `SF Mono` → fallback to `ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`.
- Only **three** type sizes across the UI:
  - `text-sm` (meta labels, hints)
  - `text-base` (chat input, buttons)
  - `text-xl` (subtitles)

### 4.3 Styling
- Brutalist: minimal colors, strong blocks, visible spacing.
- Tailwind CSS:
  - Prefer regular Tailwind build in repo.
  - Allowed alternative: Tailwind CDN for fastest prototype.

### 4.4 Emoji-grid rendering
- Render the Kun grid as a monospaced block with fixed line-height to prevent wobble.
- Maintain two “states” at minimum:
  - **Kun (normal)**
  - **Kun + Scramble present**
- Allow runtime substitutions:
  - Eye open: 👁️
  - Eye closed: use a substitute tile (e.g., ▬ or ⟂ or 🟥) — pick one and keep consistent.
  - Mouth open: 💋
  - Mouth closed: 🟥 (as requested) or another red block tile.

### 4.5 Subtitles
- Subtitle line shows Kun’s Japanese utterance.
- If a reply is long, wrap naturally; cap to N lines (e.g., 3) and scroll within subtitle area.
- Subtitles persist for the last K messages (e.g., 6) in a stacked bubble list.

### 4.6 Speech bubbles
- Bubble stack under the avatar:
  - Kun bubbles: Japanese text
  - Scramble bubbles: cat-speak (short)
- Visually distinct but still brutalist (e.g., outline variant or inverted background).

---

## 5) Functional requirements

### 5.1 Chat pipeline (server mediated)
**Rationale:** Anthropic + ElevenLabs keys must not ship to the browser.

- Client sends: `{ userText, conversationId?, settings }` to server endpoint.
- Server:
  1) Calls Anthropic (Claude) to produce Japanese reply.
  2) Calls ElevenLabs to convert that Japanese to speech.
  3) Returns `{ replyTextJa, audioUrlOrBase64, timestamps?, debug? }`.

**Conversation memory**
- v1: keep a short in-memory transcript on client and send it each request.
- Optional v1.1: server keeps transcript by `conversationId` (in-memory only).

### 5.2 Anthropic response format
Anthropic must return structured output to reduce UI bugs.

- Prompt the model to return JSON:
  - `reply_ja` (string)
  - `emotion` (enum: calm | excited | shy | smug | etc)
  - `scramble_chance` (0–1)
  - optional: `stage_directions` (array: ["blink", "pause", ...])

Validation:
- Server validates JSON; if invalid, re-ask once with a strict repair prompt.
- If still invalid, fallback to plain text extraction.

### 5.3 ElevenLabs TTS
- Generate Japanese audio from `reply_ja`.
- Prefer endpoint that can return **timestamps** for alignment (character-level or similar).
- If timestamps are not available for the selected voice/model:
  - fallback to amplitude-based mouth animation.

Audio handling:
- Client receives audio as:
  - streaming URL, or
  - base64 (decode to Blob), or
  - signed URL (if using storage).

### 5.4 Mouth animation
**Mouth states** (minimum viable):
- `OPEN` (💋)
- `CLOSED` (🟥)

Driving options:
1) **Timestamp-driven (preferred)**
   - Use ElevenLabs timestamps to schedule open/close transitions during playback.
2) **Amplitude-driven (fallback)**
   - Use Web Audio `AnalyserNode` on the playing audio to compute RMS/energy.
   - If energy > threshold → OPEN else CLOSED.
   - Add smoothing/hysteresis to avoid flicker.

### 5.5 Blink mirroring (webcam)
- Use Google’s open-source face landmark solution (MediaPipe Face Landmarker / Face Mesh).
- Compute blink via Eye Aspect Ratio (EAR) or blendshape/landmark heuristics.
- Trigger Kun eyes to closed for ~120–200ms when a blink is detected.

Constraints:
- Must run on-device in browser; do not upload video.
- Target 20–30fps on typical laptop.

Fallback:
- If webcam permission denied: run idle blink on Kun (random low rate) and show a small hint.

### 5.6 Attention “clapper morse” animation
- Before audio playback:
  - Play a short pattern (0.8–1.8s total) that pulses the 👏 tiles.
  - Pattern should feel “human rhythm” more than perfect Morse.

Implementation:
- Define a library of 6–10 patterns as arrays of durations, e.g.:
  - `[120, 90, 120, 240, 120]` ms with slight jitter.
- Animation effect:
  - temporarily invert 👏 tiles (or scale via CSS transform) on each pulse.
- After pattern completes, start audio.

### 5.7 Clap detection (microphone, bonus)
- Optional mic permission.
- Use Web Audio API to capture mic input.
- Detect claps as short transients:
  - compute short-time energy, zero crossing rate, and spectral flux (lightweight).
  - apply debounce (e.g., 400ms) to avoid repeated triggers.

On clap detected:
- Trigger Scramble appearance with probability gate (e.g., 30–60%).
- Scramble bubble appears under Kun bubble stack.

### 5.8 Scramble cameo behavior
- Scramble appears:
  - randomly sometimes (idle cameo), and/or
  - after detected clap.

Scramble output:
- Very short “cat-speak” Japanese-ish: mix of `にゃ`, `ﾆｬ`, `…`, kaomoji.
- TTS for Scramble:
  - v1: reuse same ElevenLabs voice with different prompt text.
  - v1.1: dedicated “cat” voice (if available).

Scramble duration:
- On screen for 3–8 seconds then fades.

---

## 6) Technical requirements

### 6.1 Stack recommendation
- **Next.js (TypeScript)** for:
  - server routes (Anthropic + ElevenLabs proxy)
  - easy env handling
  - static + SSR as needed

Alternative:
- Vite + Express/Hono/Fastify (TypeScript) if you want a thinner setup.

### 6.2 Environment variables (.env at repo root)
Required:
- `ANTHROPIC_API_KEY=...`
- `ELEVENLABS_API_KEY=...`

Optional:
- `ELEVENLABS_VOICE_ID_JA=...`
- `ANTHROPIC_MODEL=...`
- `PUBLIC_APP_NAME=Kun`

Never expose secret envs to client bundles.

### 6.3 API routes
- `POST /api/chat`
  - Input: `{ userText: string, history?: Array<{role, content}>, clientSettings?: {...} }`
  - Output: `{ reply_ja: string, audio: { type: 'url'|'base64', value: string }, timestamps?: Alignment, meta?: {...} }`

- `POST /api/tts` (optional split)
  - Input: `{ textJa: string, voiceId?: string }`
  - Output: `{ audio..., timestamps? }`

### 6.4 Client state machine
Recommended state enum:
- `IDLE`
- `CAPTURING_INPUT`
- `WAITING_LLM`
- `WAITING_TTS`
- `ATTENTION_CLAP`
- `PLAYING_AUDIO`
- `ERROR`

### 6.5 Performance targets
- Time to first UI interactive: < 2s on desktop.
- Webcam pipeline: stable 20fps+ (best effort).
- Avoid main-thread jank:
  - run face landmark inference in a Web Worker where possible.
  - keep DOM updates small (only update grid characters that change).

### 6.6 Privacy & permissions
- Webcam: used only for blink detection; no uploads.
- Mic: used only for clap detection; no uploads.
- Display a short “permissions panel” explaining this.

### 6.7 Error handling
- If Anthropic fails:
  - show bubble: “通信が不安定みたい…もう一回？” (or similar) and allow retry.
- If ElevenLabs fails:
  - still show subtitles; skip audio; mouth stays closed.
- If permissions denied:
  - degrade gracefully (idle blink, no clap detection).

---

## 7) Anthropic prompt (v1 draft)
System prompt goals:
- Always respond in Japanese.
- Cute anime vibe, but short and readable.
- Avoid English.
- Output strict JSON only.

Example schema:
```json
{
  "reply_ja": "...",
  "emotion": "shy",
  "scramble_chance": 0.42
}
```

Guardrails:
- If user writes in English, still reply in Japanese.
- Keep replies 1–4 lines by default.

---

## 8) ElevenLabs voice requirements
- Voice must support Japanese.
- Style: cute / anime-ish.
- Prefer model that supports timestamps endpoint.
- Use voice: Yui (ID: fUjY9K2nAIwlALOwSiwc) — https://elevenlabs.io/app/voice-library?voiceId=fUjY9K2nAIwlALOwSiwc

If voice/model lacks timestamps:
- Keep amplitude-driven mouth animation.

---

## 9) Data structures
### 9.1 Message
- `id: string`
- `role: 'user' | 'kun' | 'scramble'`
- `text: string`
- `createdAt: number`
- `audio?: { url?: string; blob?: Blob }`
- `alignment?: { chars: string[]; startMs: number[]; endMs: number[] }` (or ElevenLabs format)

### 9.2 Avatar state
- `eyes: 'open'|'closed'`
- `mouth: 'open'|'closed'`
- `scrambleVisible: boolean`

---

## 10) Acceptance criteria
### Must-have (launch)
- Chat input fixed bottom; Enter sends.
- Emoji-grid centered and stable.
- Anthropic generates Japanese reply.
- Subtitles show Japanese reply.
- ElevenLabs audio plays Japanese voice.
- 👏 attention animation plays before audio.
- Webcam blink detection makes Kun blink.

### Should-have
- Mouth animates (timestamps or amplitude).
- Basic error states and retries.

### Nice-to-have
- Mic clap detection triggers Scramble cameo + bubble.
- Scramble random cameo when idle.

---

## 11) Testing plan
- Unit tests:
  - JSON validation/repair for Anthropic output.
  - clap detection feature extraction and debounce logic (synthetic signals).
- Integration tests:
  - API route contract tests (mock Anthropic/ElevenLabs).
- E2E:
  - Playwright: send message, verify subtitle renders, verify audio element created.

Manual QA checklist:
- Permissions denied flows.
- Low-light webcam (blink detection stability).
- Slow network (spinners, no double sends).

---

## 12) Observability
- Client-side debug overlay (dev only):
  - fps, blink events, clap events, mouth state.
- Server logs:
  - request id, latency, Anthropic + ElevenLabs durations, error codes.

---

## 13) Phased delivery
### Phase 0 — Spike (1–2 days)
- Render emoji-grid + subtitle + fixed input.
- Wire `/api/chat` to return stub Japanese and stub audio.

### Phase 1 — Core (v1)
- Anthropic real response.
- ElevenLabs real TTS.
- 👏 attention rhythm.
- Mouth amplitude-based.

### Phase 2 — Facial + timestamps
- MediaPipe Face Landmarker blink mirroring.
- ElevenLabs timestamps-driven mouth.

### Phase 3 — Bonus
- Mic clap detection.
- Scramble cameo rules + extra bubbles.

---

## 14) Risks & mitigations
- **Webcam inference performance**: mitigate with lower resolution, throttling, worker, and simple blink heuristics.
- **Timestamps availability** depends on ElevenLabs voice/model: keep amplitude fallback.
- **Clap detection false positives**: add debounce + multiple-feature gating.
- **Emoji rendering differences** across platforms: provide fallback tiles and test on Chrome/Safari.

---

## 15) Assumptions
- You are okay using a server route (Next.js or Node) to keep keys private.
- A Japanese-capable ElevenLabs voice ID will be chosen and stored in `.env`.
- “Eye tracking” means blink mirroring (not full gaze estimation) for v1.

Default UI is basically this for the main character:
```
⬜⬜👏⬜⬜⬜👏⬜⬜
⬜🟥🟥🟥⬜🟥🟥🟥⬜
🟥🟥🟥🟥🟥🟥🟥🟥🟥
🟥👁️🟥👁️🟥👁️🟥👁️🟥
🟥🟥💋🟥🟥🟥💋🟥🟥
⬜🟥🟥🟥🟥🟥🟥🟥⬜
⬜⬜🟥🟥🟥🟥🟥⬜⬜
⬜⬜⬜🟥🟥🟥⬜⬜⬜
⬜⬜⬜🟥🟥🟥⬜⬜⬜
⬜⬜🟥🟥🟥🟥🟥⬜⬜
```

Or with Scramble showing 

```
⬜⬜👏⬜⬜⬜👏⬜⬜
⬜🟥🟥🟥⬜🟥🟥🟥⬜
🟥🟥🟥🟥🟥🟥🟥🟥🟥
🟥👁️🟥👁️🟥👁️🟥👁️🟥
🟥🟥💋🟥🟥🟥💋🟥🟥
⬜🟥🟥🟥🟥🟥🟥🟥⬜
⬜⬜🟥🟥🟥🟥🟥⬜⬜
⬜⬜⬜🟥🟥🟥⬜⬜⬜
⬜⬜⬜🟥🟥🟥⬜⬜⬜
⬜⬜🟥🟥🐱🟥🟥⬜⬜
```

---

## 16) Open questions (answer later, defaults provided)
- Which Claude model should be the default (`ANTHROPIC_MODEL`)? (Default: a fast/cheap model.)
- Which ElevenLabs voice ID is the target Japanese anime voice?
- Should the chat history persist on refresh? (Default: no.)
- Do we want streaming audio, or generate-then-play? (Default: generate-then-play for simplicity.)
