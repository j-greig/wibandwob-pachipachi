import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBeepWav } from '../src/shared/audio.ts';
import {
  buildPulseSchedule,
  nextMouthState,
  smoothEnergy,
} from '../src/shared/animation.ts';

test('generateBeepWav creates RIFF header and matching length', () => {
  const buf = generateBeepWav({ durationMs: 100 });
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  const dataSize = buf.readUInt32LE(40);
  assert.equal(buf.length, dataSize + 44);
});

test('buildPulseSchedule accumulates time', () => {
  const schedule = buildPulseSchedule([100, 120, 80], 0);
  assert.ok(schedule[0] >= 40);
  assert.ok(schedule[1] > schedule[0]);
  assert.ok(schedule[2] > schedule[1]);
});

test('nextMouthState uses hysteresis', () => {
  let state: 'open' | 'closed' = 'closed';
  state = nextMouthState(0.3, state, { open: 0.25, close: 0.15 });
  assert.equal(state, 'open');
  state = nextMouthState(0.2, state, { open: 0.25, close: 0.15 });
  assert.equal(state, 'open');
  state = nextMouthState(0.1, state, { open: 0.25, close: 0.15 });
  assert.equal(state, 'closed');
});

test('smoothEnergy blends toward current value', () => {
  const blended = smoothEnergy(0.2, 0.8, 0.5);
  assert.ok(blended > 0.2 && blended < 0.8);
});
