import { describe, expect, it } from "vitest";
import { encodeWav, Resampler, WAV_RATE } from "@/lib/wav";

describe("WAV voice notes", () => {
  it("resamples 48 kHz to 16 kHz across chunk boundaries, keeping the length exact", () => {
    const r = new Resampler(48_000);
    const second = new Float32Array(48_000).fill(0.5);
    for (let i = 0; i < 3; i++) r.push(second.subarray(i * 16_000, (i + 1) * 16_000)); // 1 s in 3 chunks
    r.push(new Float32Array(4096).fill(0.5));
    expect(r.length).toBe(16_000 + Math.ceil(4096 / 3));
    expect(r.samples()[100]).toBe(Math.trunc(0.5 * 0x7fff));
  });

  it("handles 44.1 kHz and clips loud input", () => {
    const r = new Resampler(44_100);
    r.push(new Float32Array(44_100).fill(2));
    expect(Math.abs(r.length - WAV_RATE)).toBeLessThanOrEqual(1);
    expect(r.samples()[0]).toBe(0x7fff);
  });

  it("writes a valid mono 16-bit PCM header with the right length", () => {
    const buf = encodeWav(new Int16Array(WAV_RATE * 3)); // 3 seconds
    const v = new DataView(buf);
    const tag = (at: number) => String.fromCharCode(...new Uint8Array(buf, at, 4));
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(16_000);
    expect(v.getUint16(34, true)).toBe(16);
    const dataBytes = v.getUint32(40, true);
    expect(dataBytes / v.getUint32(28, true)).toBe(3); // duration = data / bytes-per-second
    expect(buf.byteLength).toBe(44 + dataBytes);
  });
});
