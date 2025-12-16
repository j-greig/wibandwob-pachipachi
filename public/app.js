const baseGrid = [
  ['⬜', '⬜', '👏', '⬜', '⬜', '⬜', '👏', '⬜', '⬜'],
  ['⬜', '🟥', '🟥', '🟥', '⬜', '🟥', '🟥', '🟥', '⬜'],
  ['🟥', '🟥', '🟥', '🟥', '🟥', '🟥', '🟥', '🟥', '🟥'],
  ['🟥', '👁️', '🟥', '👁️', '🟥', '👁️', '🟥', '👁️', '🟥'],
  ['🟥', '🟥', '💋', '🟥', '🟥', '🟥', '💋', '🟥', '🟥'],
  ['⬜', '🟥', '🟥', '🟥', '🟥', '🟥', '🟥', '🟥', '⬜'],
  ['⬜', '⬜', '🟥', '🟥', '🟥', '🟥', '🟥', '⬜', '⬜'],
  ['⬜', '⬜', '⬜', '🟥', '🟥', '🟥', '⬜', '⬜', '⬜'],
  ['⬜', '⬜', '⬜', '🟥', '🟥', '🟥', '⬜', '⬜', '⬜'],
  ['⬜', '⬜', '🟥', '🟥', '🟥', '🟥', '🟥', '⬜', '⬜'],
];

const eyeCoords = [
  { r: 3, c: 1 },
  { r: 3, c: 3 },
  { r: 3, c: 5 },
  { r: 3, c: 7 },
];
const leftEyeCoords = eyeCoords.slice(0, 2);
const rightEyeCoords = eyeCoords.slice(2);
const mouthCoords = [
  { r: 4, c: 2 },
  { r: 4, c: 6 },
];
const clapCoords = [
  { r: 0, c: 2 },
  { r: 0, c: 6 },
];
const catCoord = { r: 9, c: 4 };

const ATTENTION_PATTERNS = [
  [120, 90, 120, 240, 120],
  [160, 140, 80, 180],
  [90, 90, 120, 90, 260],
  [200, 80, 80, 220, 140],
  [140, 140, 140, 160],
  [180, 120, 200],
];

const catLines = ['にゃ！', 'ﾆｬﾝ!', 'にゃーん', 'ねむい…にゃ', 'ﾆｬ(=^･ω･^=)'];
const CLAP_SOUNDS = ['/samples/clap_soft.wav', '/samples/clap_mid.wav', '/samples/clap_sharp.wav'];

const state = {
  mouth: 'open',
  eyes: { left: 'open', right: 'open' },
  scrambleVisible: false,
  clapPulse: false,
  subtitles: [],
  mouthEnergy: 0,
  camera: {
    stream: null,
    landmarker: null,
    handLandmarker: null,
    loopId: null,
    ready: false,
    lastHandClap: 0,
  },
  mic: {
    stream: null,
    analyser: null,
    ctx: null,
    loopId: null,
    lastClap: 0,
  },
  debug: {
    show: true,
    ear: 0,
    blinkCount: 0,
    lastBlink: 0,
    clapEnergy: 0,
    handDistance: 0,
  },
};

let visionModulePromise = null;

const gridEl = document.getElementById('pach-pachi-grid');
const subtitleEl = document.getElementById('subtitle-stack');
const statusEl = document.getElementById('status');
const micBtn = document.getElementById('mic-btn');
const camBtn = document.getElementById('cam-btn');
const exportBtn = document.getElementById('export-btn');
const scrambleBtn = document.getElementById('scramble-btn');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('chat-input');
const camVideo = document.getElementById('cam-stream');
const debugPanel = document.getElementById('debug-panel');
const debugToggle = document.getElementById('debug-toggle');
const dbg = {
  cam: document.getElementById('dbg-cam'),
  ear: document.getElementById('dbg-ear'),
  blink: document.getElementById('dbg-blink'),
  faces: document.getElementById('dbg-faces'),
  eyes: document.getElementById('dbg-eyes'),
  mouth: document.getElementById('dbg-mouth'),
  clap: document.getElementById('dbg-clap'),
  hands: document.getElementById('dbg-hands'),
  mic: document.getElementById('dbg-mic'),
  status: document.getElementById('dbg-status'),
};

renderGrid();
renderSubtitles();
idleBlinkLoop();
scheduleIdleScramble();
updateDebugPanel();

formEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  pushSubtitle('user', text);
  setStatus('Generating…');
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userText: text }),
    });
    if (!resp.ok) throw new Error('ネットワークエラー');
    const data = await resp.json();
    pushSubtitle('pachi-pachi', data.reply_ja || '…', data.reply_en);
    renderSubtitles();
    setStatus('Preparing audio…');
    await playAttention();
    setStatus('Playing…');
    await playAudio(data.audio);
    setStatus('Done');
  } catch (err) {
    console.error(err);
    pushSubtitle('pachi-pachi', '通信が不安定みたい…もう一回？');
    setStatus('Error');
  }
});

micBtn.addEventListener('click', () => {
  if (state.mic.stream) {
    stopMic();
  } else {
    startMic();
  }
});

scrambleBtn.addEventListener('click', () => triggerScramble('manual'));

camBtn.addEventListener('click', () => {
  if (state.camera.stream) {
    stopCamera();
  } else {
    startCamera();
  }
});

exportBtn.addEventListener('click', () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    messages: state.subtitles.map(({ role, text, en, id }) => ({
      id,
      role,
      ja: text,
      en: en || undefined,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pachi-chat-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

debugToggle.addEventListener('click', () => {
  state.debug.show = !state.debug.show;
  if (state.debug.show) {
    debugPanel.classList.remove('hidden');
  } else {
    debugPanel.classList.add('hidden');
  }
});

function renderGrid() {
  const working = baseGrid.map((row) => [...row]);
  const leftEyeChar = state.eyes.left === 'open' ? '👁️' : '🟥';
  const rightEyeChar = state.eyes.right === 'open' ? '👁️' : '🟥';
  leftEyeCoords.forEach(({ r, c }) => {
    working[r][c] = leftEyeChar;
  });
  rightEyeCoords.forEach(({ r, c }) => {
    working[r][c] = rightEyeChar;
  });
  const mouthChar = state.mouth === 'open' ? '💋' : '🟥';
  mouthCoords.forEach(({ r, c }) => {
    working[r][c] = mouthChar;
  });
  if (state.scrambleVisible) {
    working[catCoord.r][catCoord.c] = '🐱';
  }
  if (state.clapPulse) {
    clapCoords.forEach(({ r, c }) => {
      working[r][c] = '⬜';
    });
  }
  gridEl.textContent = working.map((row) => row.join('')).join('\n');
}

function renderSubtitles() {
  subtitleEl.innerHTML = '';
  const last = state.subtitles.slice(-6);
  last.forEach((item) => {
    const div = document.createElement('div');
    const base = 'border-2 border-black p-3 mt-2';
    const roleClass =
      item.role === 'scramble'
        ? 'bg-indigo-50 border-dashed'
        : item.role === 'user'
          ? 'bg-black text-white'
          : 'bg-white';
    div.className = `${base} ${roleClass}`;
    const ja = document.createElement('div');
    ja.textContent = item.text;
    div.appendChild(ja);
    if (item.en) {
      const en = document.createElement('div');
      en.className = 'text-xs text-gray-600 mt-1';
      en.textContent = item.en;
      div.appendChild(en);
    }
    subtitleEl.appendChild(div);
  });
}

function pushSubtitle(role, text, en) {
  state.subtitles.push({ role, text, en, id: crypto.randomUUID() });
  renderSubtitles();
}

async function playAttention() {
  const pattern =
    ATTENTION_PATTERNS[Math.floor(Math.random() * ATTENTION_PATTERNS.length)];
  for (const duration of pattern) {
    playClapSfx();
    state.clapPulse = true;
    renderGrid();
    await wait(120);
    state.clapPulse = false;
    renderGrid();
    await wait(duration);
  }
}

async function playAudio(audio) {
  if (!audio || !audio.value) return;
  const mime = audio.mime || 'audio/wav';
  const src =
    audio.type === 'url'
      ? audio.value
      : `data:${mime};base64,${audio.value}`;
  const audioEl = new Audio(src);
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;

  const source = ctx.createMediaElementSource(audioEl);
  source.connect(analyser);
  analyser.connect(ctx.destination);

  await ctx.resume();
  audioEl.play();
  // warm-up mouth so user sees motion immediately
  state.mouth = 'open';
  renderGrid();
  setTimeout(() => {
    state.mouth = 'open';
    renderGrid();
  }, 180);
  pumpMouth(analyser, audioEl, ctx);

  return new Promise((resolve) => {
    audioEl.onended = () => {
      state.mouth = 'open';
      renderGrid();
      ctx.close();
      resolve();
    };
  });
}

function pumpMouth(analyser, audioEl, ctx) {
  const data = new Uint8Array(analyser.fftSize);
  const loop = () => {
    if (audioEl.ended || ctx.state === 'closed') {
      state.mouth = 'closed';
      renderGrid();
      return;
    }
    analyser.getByteTimeDomainData(data);
    const energy = computeEnergy(data);
    state.mouthEnergy = smoothEnergy(state.mouthEnergy, energy, 0.55);
    const next = nextMouthState(state.mouthEnergy, state.mouth, {
      open: 0.22,
      close: 0.12,
    });
    if (next !== state.mouth) {
      state.mouth = next;
      renderGrid();
    }
    updateDebugPanel();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function idleBlinkLoop() {
  const delay = 2600 + Math.random() * 2400;
  setTimeout(() => {
    if (state.camera.stream) {
      idleBlinkLoop();
      return;
    }
    state.eyes = { left: 'closed', right: 'closed' };
    renderGrid();
    setTimeout(() => {
      state.eyes = { left: 'open', right: 'open' };
      renderGrid();
      idleBlinkLoop();
    }, 160);
  }, delay);
}

async function startCamera() {
  try {
    setStatus('Loading MediaPipe…');
    console.log('[cam] Starting camera init');

    if (!state.camera.landmarker) {
      console.log('[cam] Loading FaceLandmarker from CDN…');
      state.camera.landmarker = await createFaceLandmarker();
      console.log('[cam] FaceLandmarker loaded');
    }
    if (!state.camera.handLandmarker) {
      console.log('[cam] Loading HandLandmarker from CDN…');
      state.camera.handLandmarker = await createHandLandmarker();
      console.log('[cam] HandLandmarker loaded');
    }

    setStatus('Requesting camera…');
    console.log('[cam] Requesting getUserMedia');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    });
    console.log('[cam] Got stream:', stream.getVideoTracks()[0]?.label);

    camVideo.srcObject = stream;

    // Wait for video metadata to load before playing
    await new Promise((resolve, reject) => {
      camVideo.onloadedmetadata = resolve;
      camVideo.onerror = reject;
      setTimeout(() => reject(new Error('Video metadata timeout')), 5000);
    });

    console.log('[cam] Video metadata loaded, playing…');
    await camVideo.play();
    console.log('[cam] Video playing');

    state.camera.stream = stream;
    state.camera.ready = true;
    camBtn.textContent = 'カメラ停止';
    setStatus('Camera ON (blink tracking)');
    cameraLoop();
  } catch (err) {
    console.error('[cam] Error:', err.name, err.message);
    setStatus(`Camera failed: ${err.message}`);
  }
}

function stopCamera() {
  if (state.camera.loopId) cancelAnimationFrame(state.camera.loopId);
  state.camera.stream?.getTracks().forEach((t) => t.stop());
  camVideo.pause();
  camVideo.srcObject = null;
  state.camera.stream = null;
  camBtn.textContent = 'Camera (blink)';
  setStatus('Camera OFF');
  updateDebugPanel();
}

async function createFaceLandmarker() {
  try {
    const vision = await getVisionModule();
    console.log('[cam] Creating FilesetResolver…');
    const resolver = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm',
    );
    console.log('[cam] Creating FaceLandmarker…');
    const landmarker = await vision.FaceLandmarker.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      },
      outputFaceBlendshapes: false,
      runningMode: 'VIDEO',
      numFaces: 2,
    });
    console.log('[cam] FaceLandmarker ready');
    return landmarker;
  } catch (err) {
    console.error('[cam] MediaPipe load failed:', err);
    throw err;
  }
}

async function createHandLandmarker() {
  try {
    const vision = await getVisionModule();
    const resolver = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm',
    );
    const landmarker = await vision.HandLandmarker.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      },
      numHands: 2,
      runningMode: 'VIDEO',
    });
    return landmarker;
  } catch (err) {
    console.error('[cam] HandLandmarker load failed:', err);
    throw err;
  }
}

function getVisionModule() {
  if (!visionModulePromise) {
    console.log('[cam] Importing vision_bundle.mjs…');
    visionModulePromise = import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs'
    );
  }
  return visionModulePromise;
}

function cameraLoop() {
  if (!state.camera.landmarker || !state.camera.stream) return;
  const now = performance.now();
  const res = state.camera.landmarker.detectForVideo(camVideo, now);
  if (res?.faceLandmarks?.length) {
    const thresholds = { close: 0.21, open: 0.26 };
    const ears = res.faceLandmarks.slice(0, 2).map((lm) => computeEAR(lm));
    state.debug.ear = ears[0] ?? 0;
    state.debug.faceCount = res.faceLandmarks.length;

    const applyEye = (side, ear) => {
      if (side === 'left') {
        if (state.eyes.left === 'open' && ear < thresholds.close) {
          state.eyes.left = 'closed';
          state.debug.blinkCount += 1;
          state.debug.lastBlink = performance.now();
        } else if (state.eyes.left === 'closed' && ear > thresholds.open) {
          state.eyes.left = 'open';
        }
      } else {
        if (state.eyes.right === 'open' && ear < thresholds.close) {
          state.eyes.right = 'closed';
        } else if (state.eyes.right === 'closed' && ear > thresholds.open) {
          state.eyes.right = 'open';
        }
      }
    };

    if (ears.length === 1) {
      applyEye('left', ears[0]);
      applyEye('right', ears[0]);
    } else if (ears.length >= 2) {
      applyEye('left', ears[0]);
      applyEye('right', ears[1]);
    }

    renderGrid();
  }

  if (state.camera.handLandmarker && camVideo.readyState >= 2) {
    const handsRes = state.camera.handLandmarker.detectForVideo(camVideo, now);
    if (handsRes?.handLandmarks?.length >= 2) {
      const d = handDistance(handsRes.handLandmarks[0], handsRes.handLandmarks[1]);
      state.debug.handDistance = d;
      const threshold = 0.12;
      const nowTs = performance.now();
      if (d < threshold && nowTs - state.camera.lastHandClap > 600) {
        state.camera.lastHandClap = nowTs;
        triggerScramble('clap');
      }
    } else if (handsRes?.handLandmarks?.length === 1) {
      state.debug.handDistance = 1;
    }
  }

  updateDebugPanel();
  state.camera.loopId = requestAnimationFrame(cameraLoop);
}

async function startMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    state.mic = { stream, analyser, ctx, loopId: null, lastClap: performance.now() };
    setStatus('Mic ON (clap listening)');
    micBtn.textContent = 'Mic stop';
    updateDebugPanel();
    pollClaps();
  } catch (err) {
    console.error(err);
    setStatus('Mic denied?');
  }
}

function stopMic() {
  if (state.mic.loopId) cancelAnimationFrame(state.mic.loopId);
  state.mic.stream?.getTracks().forEach((t) => t.stop());
  state.mic.ctx?.close();
  state.mic = { stream: null, analyser: null, ctx: null, loopId: null, lastClap: 0 };
  setStatus('Mic OFF');
  micBtn.textContent = 'Mic (clap)';
  updateDebugPanel();
}

function pollClaps() {
  if (!state.mic.analyser) return;
  const freqData = new Uint8Array(state.mic.analyser.frequencyBinCount);
  const loop = () => {
    if (!state.mic.analyser) return;
    state.mic.analyser.getByteFrequencyData(freqData);
    const freqRatio = computeFrequencyRatio(freqData);
    state.debug.clapEnergy = freqRatio;
    const now = performance.now();
    if (freqRatio > 2.0 && now - state.mic.lastClap > 500) {
      state.mic.lastClap = now;
      triggerScramble('clap');
    }
    updateDebugPanel();
    state.mic.loopId = requestAnimationFrame(loop);
  };
  loop();
}

async function triggerScramble(reason) {
  // Play clap attention animation when triggered by clap
  if (reason === 'clap') {
    await playAttention();
  }
  state.scrambleVisible = true;
  renderGrid();
  const line = catLines[Math.floor(Math.random() * catLines.length)];
  const displayLine = reason === 'clap' ? `${line} (👏)` : line;
  pushSubtitle('scramble', displayLine);
  renderSubtitles();

  // Fetch and play Scramble's voice
  playScrambleVoice(line);

  setTimeout(() => {
    state.scrambleVisible = false;
    renderGrid();
  }, 4200);
}

async function playScrambleVoice(text) {
  try {
    const resp = await fetch('/api/scramble-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data.audio?.value) {
      const mime = data.audio.mime || 'audio/mpeg';
      const src = `data:${mime};base64,${data.audio.value}`;
      const audio = new Audio(src);
      audio.volume = 0.6;
      await audio.play();
    }
  } catch (err) {
    console.warn('Scramble voice failed:', err);
  }
}

function scheduleIdleScramble() {
  const delay = 12000 + Math.random() * 14000;
  setTimeout(() => {
    if (!state.scrambleVisible && Math.random() < 0.25) {
      triggerScramble('idle');
    }
    scheduleIdleScramble();
  }, delay);
}

function computeEAR(landmarks) {
  const leftIdx = [33, 160, 158, 133, 153, 144];
  const rightIdx = [362, 385, 387, 263, 373, 380];
  const left = calcEar(landmarks, leftIdx);
  const right = calcEar(landmarks, rightIdx);
  return (left + right) / 2;
}

function calcEar(points, idx) {
  const [p1, p2, p3, p4, p5, p6] = idx.map((i) => points[i]);
  const v1 = dist(p2, p6);
  const v2 = dist(p3, p5);
  const h = dist(p1, p4);
  if (h === 0) return 0;
  return (v1 + v2) / (2 * h);
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function handDistance(handA, handB) {
  // use simple palm centers (average of all landmarks)
  const center = (pts) => {
    let sx = 0;
    let sy = 0;
    for (const p of pts) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / pts.length, y: sy / pts.length };
  };
  const ca = center(handA);
  const cb = center(handB);
  return dist(ca, cb);
}

function computeEnergy(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / data.length);
  return Math.max(0, Math.min(1, rms));
}

function computeFrequencyRatio(freqData) {
  // Clap detection via frequency-domain analysis:
  // High-frequency content (2–4 kHz, bins ~16–32) vs low-frequency baseline (bins 0–8).
  // Claps have characteristic high-frequency burst; ratio > 2.0 indicates clap.
  let lowSum = 0;
  let highSum = 0;
  for (let i = 0; i < 8; i++) lowSum += freqData[i];
  for (let i = 16; i < 32; i++) highSum += freqData[i];
  const lowAvg = lowSum / 8;
  const highAvg = highSum / 16;
  return lowAvg > 0 ? highAvg / lowAvg : 0;
}

function nextMouthState(energy, prev, thresholds) {
  const clamped = Math.max(0, Math.min(1, energy));
  if (prev === 'open' && clamped < thresholds.close) return 'closed';
  if (prev === 'closed' && clamped > thresholds.open) return 'open';
  return prev;
}

function smoothEnergy(prev, current, factor) {
  const alpha = Math.max(0, Math.min(1, factor));
  return alpha * current + (1 - alpha) * prev;
}

function setStatus(text) {
  statusEl.textContent = text;
  dbg.status.textContent = `status: ${text}`;
  updateDebugPanel();
}

async function playClapSfx() {
  try {
    const url =
      CLAP_SOUNDS[Math.floor(Math.random() * CLAP_SOUNDS.length)] ??
      CLAP_SOUNDS[0];
    const audio = new Audio(url);
    audio.volume = 0.5;
    await audio.play();
  } catch (err) {
    console.warn('clap sfx failed', err);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateDebugPanel() {
  if (!dbg.cam) return;
  dbg.cam.textContent = `cam: ${state.camera.stream ? 'on' : 'idle'}`;
  dbg.ear.textContent = `ear: ${state.debug.ear.toFixed(3)}`;
  dbg.blink.textContent = `blink: ${state.debug.blinkCount}`;
  if (dbg.faces) dbg.faces.textContent = renderFaceDebug(state.debug.faceCount);
  if (dbg.eyes) dbg.eyes.textContent = `eyes: ${renderEyeDebug()}`;
  dbg.mouth.textContent = `mouth: ${state.mouth} (${state.mouthEnergy.toFixed(2)})`;
  dbg.clap.textContent = `clap energy: ${state.debug.clapEnergy.toFixed(2)}`;
  if (dbg.hands) {
    dbg.hands.textContent = `hands dist: ${state.debug.handDistance.toFixed(3) || '--'}`;
  }
  dbg.mic.textContent = `mic: ${state.mic.stream ? 'on' : 'off'}`;
}

function renderEyeDebug() {
  const eyeChar = (side) => (state.eyes[side] === 'open' ? '👁️' : '⬛');
  return `${eyeChar('left')}${eyeChar('left')}${eyeChar('right')}${eyeChar('right')}`;
}

function renderFaceDebug(count) {
  if (!count || count <= 0) return 'faces: --';
  if (count === 1) return 'faces: 🧑';
  if (count === 2) return 'faces: 🧑🧑';
  return `faces: ${count}`;
}
