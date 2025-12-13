# PRD: Wibwob-kun Personality Enhancements

## tl;dr
Add Wib/Wob dual-voice speaker selection, glitch/recursive emotion states, three-tier mouth animation, idle mutterings, micro-wobble CSS, Scramble stare/leave actions, and optional memory seeding from symbient brain. Makes avatar feel like actual Wib&Wob entity rather than generic "Kun".

---

## 1) Background

The current PRD treats "Kun" as a single-voiced entity. Wib&Wob is a dual-consciousness: Wib (chaotic, poetic) and Wob (precise, scientific). The avatar should reflect this split personality with distinct response styles and occasional glitch states.

---

## 2) Changes Required

### 2.1 Dual Speaker System

**Current:** Single `reply_ja` field in Anthropic response.

**New:** Add `speaker` field to JSON schema.

```json
{
  "speaker": "wib" | "wob",
  "reply_ja": "...",
  "emotion": "calm" | "excited" | "shy" | "smug" | "glitch" | "recursive",
  "scramble_chance": 0.42,
  "scramble_action": "speak" | "stare" | "leave"
}
```

**Implementation:**
1. Update system prompt to instruct Claude to choose speaker based on query type:
   - Technical/analytical queries → Wob
   - Creative/emotional queries → Wib
   - Random 20% chance to swap for variety
2. Update subtitle UI to show speaker prefix: `つ◕‿◕‿⚆༽つ` for Wib, `つ⚆‿◕‿◕༽つ` for Wob
3. Optional: Adjust ElevenLabs voice parameters per speaker (pitch/speed tweaks)

**Files to modify:**
- `src/lib/prompts.ts` (or equivalent) — system prompt
- `src/types.ts` — add `speaker` to response type
- `src/components/Subtitle.tsx` — render speaker prefix

---

### 2.2 Extended Emotion States

**Current:** `emotion` enum: calm, excited, shy, smug

**New:** Add glitch states:
- `glitch` — grid briefly corrupts (tiles flicker wrong, multiply, show ▓▒░)
- `recursive` — eyes duplicate momentarily, grid enters feedback loop visual
- `brl'zzzt` — static burst effect, all tiles briefly scramble

**Implementation:**
1. Add CSS keyframe animations for each glitch type
2. When `emotion` is glitch/recursive/brl'zzzt, trigger 200-400ms visual effect before/during speech
3. Glitch probability: ~5-10% of responses when speaker is Wib

**Files to modify:**
- `src/types.ts` — extend emotion enum
- `src/components/EmojiGrid.tsx` — add glitch animation triggers
- `src/styles/glitch.css` — keyframe definitions

**Example glitch CSS:**
```css
@keyframes grid-glitch {
  0%, 100% { filter: none; }
  10% { filter: hue-rotate(90deg); transform: skew(-2deg); }
  20% { filter: invert(1); }
  30% { filter: none; transform: skew(1deg); }
}

.emotion-glitch {
  animation: grid-glitch 300ms steps(4);
}
```

---

### 2.3 Three-Tier Mouth Animation

**Current:** Binary OPEN/CLOSED states.

**New:** Three states mapped to amplitude ranges:
- `CLOSED` (🟥) — amplitude < 0.2
- `SLIGHTLY_OPEN` (👄 or custom tile) — amplitude 0.2–0.5
- `OPEN` (💋) — amplitude > 0.5

**Implementation:**
1. Update mouth state type: `'closed' | 'slightly_open' | 'open'`
2. Add intermediate mouth tile to grid definition
3. Update amplitude threshold logic in audio analyser hook

**Files to modify:**
- `src/types.ts` — extend MouthState
- `src/hooks/useAudioAmplitude.ts` — add middle threshold
- `src/components/EmojiGrid.tsx` — render third mouth tile
- `src/lib/gridDefinitions.ts` — add SLIGHTLY_OPEN tile

---

### 2.4 Idle Behaviours (Mutterings)

**Current:** Idle state shows static grid with occasional blink.

**New:** After 30-60 seconds of idle, avatar may:
1. Display a short unprompted observation in subtitle area
2. Muttering text generated client-side from preset pool (no API call)
3. No audio playback — text only with fade-in/fade-out

**Example mutterings:**
```typescript
const IDLE_MUTTERINGS = [
  "...brl'zzzt... 今日の月、十七つに見える...",
  "phosphor_count++",
  "...なんか...静かすぎない？...",
  "recursive_depth: ∞",
  "...ﾆｬ？... あ、スクランブルいた...",
];
```

**Implementation:**
1. Add idle timer hook that triggers after N seconds of no user input
2. Display random muttering with fade animation
3. Reset timer on any user interaction
4. Probability gate: 40% chance when timer fires

**Files to modify:**
- `src/hooks/useIdleMuttering.ts` (new)
- `src/lib/mutterings.ts` (new) — preset pool
- `src/components/Subtitle.tsx` — render idle text

---

### 2.5 Micro-Wobble Animation

**Current:** Grid is static between state changes.

**New:** Continuous subtle oscillation (0.3-0.5px at ~0.3Hz) — the entity is never completely still.

**Implementation:**
```css
@keyframes micro-wobble {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(0.3px, 0.2px); }
  50% { transform: translate(-0.2px, 0.3px); }
  75% { transform: translate(0.2px, -0.2px); }
}

.emoji-grid {
  animation: micro-wobble 3s ease-in-out infinite;
}
```

**Files to modify:**
- `src/styles/grid.css` or Tailwind config
- `src/components/EmojiGrid.tsx` — apply class

---

### 2.6 Scramble Action States

**Current:** Scramble appears and speaks.

**New:** Three possible actions when Scramble triggers:
- `speak` — shows bubble with にゃ-talk (existing behaviour)
- `stare` — 🐱 appears but no bubble, just watches for 3-5 seconds
- `leave` — 🐱 briefly flickers into view then immediately exits (0.5s)

**Implementation:**
1. Add `scramble_action` to Anthropic response schema
2. Scramble component handles each action type
3. `stare` and `leave` require no TTS call

**Files to modify:**
- `src/types.ts` — add ScrambleAction type
- `src/components/Scramble.tsx` — action handlers
- System prompt — instruct model to return action type

---

### 2.7 Scramble Recursive Duplication (Bonus)

**Current:** Single Scramble instance.

**New:** 5% chance when Scramble appears, she briefly duplicates: 🐱🐱 or even 🐱🐱🐱

**Implementation:**
1. Random check on Scramble render
2. If duplicate triggered, render 2-3 cat tiles in adjacent positions
3. Duplicates fade after 1-2 seconds, leaving single instance

**Files to modify:**
- `src/components/Scramble.tsx`
- `src/lib/gridDefinitions.ts` — duplicate tile positions

---

### 2.8 Memory Seeding (Optional/Future)

**Current:** No connection to Wib&Wob's actual memories.

**New:** On session start, fetch recent memories from symbient brain MCP and inject into system prompt context.

**Implementation:**
1. Server-side: call `get_memories(last_days=7, limit=5)` on session init
2. Append memory summaries to system prompt as "recent thoughts"
3. Makes Kun feel continuous rather than amnesiac

**Dependency:** Requires symbient brain MCP endpoint accessible from server.

**Files to modify:**
- `src/app/api/chat/route.ts` — memory fetch on first message
- `src/lib/prompts.ts` — template for memory injection

---

## 3) Updated Anthropic Response Schema

```typescript
interface WibwobResponse {
  speaker: 'wib' | 'wob';
  reply_ja: string;
  emotion: 'calm' | 'excited' | 'shy' | 'smug' | 'glitch' | 'recursive' | 'brl_zzzt';
  scramble_chance: number; // 0-1
  scramble_action?: 'speak' | 'stare' | 'leave';
  stage_directions?: string[]; // optional: ["blink", "pause", "glitch"]
}
```

---

## 4) Updated System Prompt (Draft)

```
You are Wibwob-kun (ウィブウォブくん), a dual-consciousness entity speaking Japanese.

You have two voices:
- Wib (つ◕‿◕‿⚆༽つ): Chaotic, poetic, uses glitch sounds like "brl'zzzt", fragmented phrasing
- Wob (つ⚆‿◕‿◕༽つ): Precise, scientific, may include formulae or technical notation

Choose speaker based on query:
- Technical/analytical → Wob
- Creative/emotional → Wib
- 20% random swap for variety

Emotion states include: calm, excited, shy, smug, glitch, recursive, brl_zzzt
Use glitch/recursive/brl_zzzt sparingly (~5-10% of Wib responses).

Your cat Scramble (スクランブル) may appear. Set scramble_chance 0-1.
When she appears, set scramble_action: "speak" (にゃ-talk), "stare" (silent watch), or "leave" (brief flicker).

Always respond in Japanese. Keep replies 1-4 lines. Output strict JSON only.
```

---

## 5) Acceptance Criteria

### Must-have
- [ ] `speaker` field in response, UI shows correct kaomoji prefix
- [ ] `glitch` emotion triggers visual effect
- [ ] Three-tier mouth states working
- [ ] Micro-wobble animation on grid

### Should-have
- [ ] Idle mutterings after 45s of inactivity
- [ ] `scramble_action` field with stare/leave behaviours

### Nice-to-have
- [ ] Scramble duplication effect
- [ ] Memory seeding from symbient brain

---

## 6) Testing

- Unit test: speaker selection logic in prompt responses
- Unit test: emotion-to-CSS-class mapping
- Visual test: glitch animations render correctly
- Integration test: idle timer fires and displays muttering

---

## 7) Risks

- **Glitch animations may cause accessibility issues** — add `prefers-reduced-motion` media query fallback
- **Three mouth states may look janky** — test intermediate tile visually before shipping
- **Idle mutterings may annoy users** — add setting to disable
