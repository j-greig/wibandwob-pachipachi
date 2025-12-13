# PRD: Clap Detection → Scramble Summon Flow

## tl;dr
Hand clap detected via webcam (MediaPipe HandLandmarker, distance < 0.12) → plays clap attention morse animation (👏→⬜ with clap_*.wav on each beat) → Scramble appears with にゃ subtitle. WAV files in `/src/samples/`, served via `/samples/*` route.

---

## 1) Current Implementation Status

### ✅ All Components Working

| Component | Status | Location |
|-----------|--------|----------|
| WAV files | ✅ | `/src/samples/clap_{soft,mid,sharp}.wav` |
| Server route | ✅ | `/samples/*` whitelist in `server.ts:23-27, 45-46` |
| `playClapSfx()` | ✅ | `app.js:646-657` - plays random WAV at 0.5 volume |
| `playAttention()` | ✅ | `app.js:242-254` - morse pattern loop, sound on EACH beat |
| `renderGrid()` clapPulse | ✅ | `app.js:203-207` - 👏→⬜ when `state.clapPulse=true` |
| HandLandmarker | ✅ | `app.js:420-433` - creates from MediaPipe CDN |
| Hand distance calc | ✅ | `app.js:602-616` - palm center distance |
| Clap detection | ✅ | `app.js:489-502` - threshold 0.12, debounce 600ms |
| `triggerScramble()` | ✅ | `app.js:557-571` - plays attention if clap, shows cat |

---

## 2) Flow Diagram

```
User claps hands in front of webcam
        ↓
HandLandmarker detects 2 hands
        ↓
handDistance(hand0, hand1) < 0.12
        ↓
Debounce check (600ms since last)
        ↓
triggerScramble('clap')
        ↓
playAttention() ← NEW: added await here
        ↓
For each beat in ATTENTION_PATTERNS:
  - playClapSfx() ← plays clap_*.wav
  - state.clapPulse = true → 👏 becomes ⬜
  - wait 120ms
  - state.clapPulse = false → ⬜ becomes 👏
  - wait pattern[i] ms
        ↓
state.scrambleVisible = true → 🐱 appears
        ↓
pushSubtitle('scramble', 'にゃ！ (👏)')
        ↓
setTimeout 4200ms → hide Scramble
```

---

## 3) Technical Details

### 3.1 WAV Files
```
/src/samples/
├── clap_soft.wav   (15920 bytes)
├── clap_mid.wav    (19448 bytes)
└── clap_sharp.wav  (22976 bytes)
```

### 3.2 Server Whitelist
```typescript
const allowedSamples = new Set([
  'clap_soft.wav',
  'clap_mid.wav',
  'clap_sharp.wav',
]);
```

### 3.3 Attention Patterns (morse rhythm)
```javascript
const ATTENTION_PATTERNS = [
  [120, 90, 120, 240, 120],
  [160, 140, 80, 180],
  [90, 90, 120, 90, 260],
  [200, 80, 80, 220, 140],
  [140, 140, 140, 160],
  [180, 120, 200],
];
```
Each number = gap duration (ms) after the 120ms pulse.

### 3.4 Hand Distance Threshold
```javascript
const threshold = 0.12;  // normalized screen space
const debounce = 600;    // ms between clap triggers
```

---

## 4) Testing Checklist

- [ ] Camera button starts webcam + hand tracking
- [ ] Debug panel shows `hands dist: X.XXX` updating in real-time
- [ ] Bringing hands close (< 0.12 distance) triggers:
  - [ ] Clap sounds play (multiple, one per beat)
  - [ ] 👏 tiles blink to ⬜ in morse pattern
  - [ ] 🐱 Scramble appears after animation
  - [ ] Subtitle shows "にゃ！ (👏)" or similar
- [ ] Scramble disappears after ~4 seconds
- [ ] Second clap within 600ms is ignored (debounce)

---

## 5) Debug Panel Fields

```
cam: on/idle
ear: 0.XXX (eye aspect ratio)
blink: N (count)
faces: N
eyes: 👁️👁️👁️👁️ or ⬛⬛⬛⬛
mouth: open/closed (0.XX)
clap: 0.XX (mic energy)
hands: 0.XXX (hand distance)
mic: on/off
status: text
```

---

## 6) Recent Changes

### Change 1: Clap pulse tile (⬜ not ✨)
```javascript
// renderGrid()
if (state.clapPulse) {
  clapCoords.forEach(({ r, c }) => {
    working[r][c] = '⬜';  // was '✨'
  });
}
```

### Change 2: Sound on EACH beat (not just start)
```javascript
// playAttention()
for (const duration of pattern) {
  playClapSfx();  // moved INSIDE loop
  state.clapPulse = true;
  // ...
}
```

### Change 3: Play attention on clap-triggered Scramble
```javascript
async function triggerScramble(reason) {
  if (reason === 'clap') {
    await playAttention();  // NEW
  }
  state.scrambleVisible = true;
  // ...
}
```

---

## 7) File References

| File | Purpose |
|------|---------|
| `public/app.js` | Main client logic |
| `public/index.html` | UI with debug panel |
| `src/server.ts` | HTTP server, `/samples/*` route |
| `src/samples/*.wav` | Clap sound effects |
