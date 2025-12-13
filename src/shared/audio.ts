export type ToneConfig = {
  durationMs?: number;
  sampleRate?: number;
  frequency?: number;
  amplitude?: number;
};

/**
 * Generate a simple mono sine-wave WAV buffer for stub audio responses.
 */
export function generateBeepWav(config: ToneConfig = {}): Buffer {
  const {
    durationMs = 800,
    sampleRate = 44100,
    frequency = 880,
    amplitude = 0.35,
  } = config;

  const totalSamples = Math.max(1, Math.floor((durationMs / 1000) * sampleRate));
  const data = Buffer.alloc(totalSamples * 2); // 16-bit mono

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude;
    data.writeInt16LE(Math.floor(sample * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  const byteRate = sampleRate * 2; // mono 16-bit
  const dataByteLength = data.length;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataByteLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataByteLength, 40);

  return Buffer.concat([header, data]);
}
