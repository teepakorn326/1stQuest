// Voice notes are 16 kHz mono 16-bit WAV: every browser and phone plays it, and its length is exact
// (it's in the header, worked out from the samples), unlike MediaRecorder's WebM/MP4.
// About 32 KB a second, so 5 minutes is under 10 MB.

export const WAV_RATE = 16_000;

/**
 * Turns the microphone's samples (usually 44.1 or 48 kHz floats) into 16 kHz 16-bit samples, a chunk
 * at a time, averaging each window so it doesn't hold minutes of raw audio in memory.
 */
export class Resampler {
  private readonly ratio: number;
  private carry = 0; // where the next output sample starts, relative to the next chunk
  private readonly out: Int16Array[] = [];
  length = 0;

  constructor(inputRate: number, outputRate = WAV_RATE) {
    this.ratio = inputRate / outputRate;
  }

  push(chunk: Float32Array): void {
    const ratio = this.ratio;
    const n = Math.max(0, Math.ceil((chunk.length - this.carry) / ratio));
    const out = new Int16Array(n);
    let i = 0;
    let t = this.carry;
    while (t < chunk.length && i < n) {
      const from = Math.floor(t);
      const to = Math.min(chunk.length, Math.max(from + 1, Math.floor(t + ratio)));
      let sum = 0;
      for (let k = from; k < to; k++) sum += chunk[k]!;
      const v = Math.max(-1, Math.min(1, sum / (to - from)));
      out[i++] = v < 0 ? v * 0x8000 : v * 0x7fff;
      t += ratio;
    }
    this.carry = t - chunk.length;
    const filled = i === n ? out : out.subarray(0, i);
    this.out.push(filled);
    this.length += filled.length;
  }

  samples(): Int16Array {
    const all = new Int16Array(this.length);
    let at = 0;
    for (const c of this.out) {
      all.set(c, at);
      at += c.length;
    }
    return all;
  }
}

/** A WAV file (RIFF, PCM, mono) around 16-bit samples. */
export function encodeWav(samples: Int16Array, rate = WAV_RATE): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true); // PCM header size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); // bytes per second
  v.setUint16(32, 2, true); // bytes per frame
  v.setUint16(34, 16, true); // bits per sample
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  new Int16Array(buf, 44).set(samples);
  return buf;
}
