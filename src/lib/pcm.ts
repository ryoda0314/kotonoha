// What Gemini's raw speech goes through before anyone hears it, as in ことのおと (scripts/lib/wav.mjs): the silence it
// leaves before the first word is cut (it reads as "I pressed and nothing happened"), the end is faded rather than
// chopped, the loudness is brought to one level so a Google voice sits beside an OpenAI one, and it is kept as MP3.
// Pure: tested in tests/pcm.test.mjs.
import { Mp3Encoder } from "@breezystack/lamejs";

/** 16-bit little-endian mono PCM (what Gemini returns) as samples in -1..1. */
export function pcmToSamples(pcm: Uint8Array): Float32Array {
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const out = new Float32Array(Math.floor(pcm.byteLength / 2));
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}

/** The sample rate Gemini names in its mime type ("audio/L16;codec=pcm;rate=24000"), never assumed. */
export function rateOf(mimeType: string): number {
  const rate = Number(mimeType.match(/rate=(\d+)/i)?.[1]);
  return Number.isFinite(rate) && rate > 0 ? rate : 24000;
}

const FLOOR = 0.006; // 0.6% of full scale
const LEAD = 0.02; // keep 20 ms before the first sound, or the first consonant is clipped
const TAIL = 0.12; // keep 120 ms after the last sound
const FADE = 0.04;
const AFTER = 0.08; // then this much silence
const TARGET_RMS = 0.1; // about -20 dBFS over the loud part
const PEAK = 0.89;

/** Trimmed, faded and levelled samples. */
export function tidy(samples: Float32Array, rate: number): Float32Array {
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < FLOOR) first++;
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < FLOOR) last--;
  if (first >= samples.length) return new Float32Array(0);
  const start = Math.max(0, first - Math.round(LEAD * rate));
  const end = Math.min(samples.length, last + Math.round(TAIL * rate));
  const body = samples.slice(start, end);

  // Level by the loud part (frames above a tenth of the loudest), so a long quiet tail does not lift the speech.
  const win = Math.max(1, Math.round(0.02 * rate));
  const frames: number[] = [];
  for (let i = 0; i + win <= body.length; i += win) {
    let s = 0;
    for (let k = i; k < i + win; k++) s += body[k] * body[k];
    frames.push(Math.sqrt(s / win));
  }
  const top = Math.max(...frames, 1e-6);
  const loud = frames.filter((r) => r > top * 0.1);
  const rms = Math.sqrt(loud.reduce((a, r) => a + r * r, 0) / Math.max(1, loud.length));
  let peak = 0;
  for (const v of body) peak = Math.max(peak, Math.abs(v));
  const gain = Math.min(TARGET_RMS / Math.max(rms, 1e-6), PEAK / Math.max(peak, 1e-6));

  const fade = Math.round(FADE * rate);
  const out = new Float32Array(body.length + Math.round(AFTER * rate));
  for (let i = 0; i < body.length; i++) {
    const fromEnd = body.length - 1 - i;
    out[i] = body[i] * gain * (fromEnd < fade ? fromEnd / fade : 1);
  }
  return out;
}

/** Mono MP3 of the samples (64 kbps: plenty for a voice, a third of a WAV's size). */
export function toMp3(samples: Float32Array, rate: number, kbps = 64): Uint8Array {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767);
  const enc = new Mp3Encoder(1, rate, kbps);
  const parts = [enc.encodeBuffer(pcm), enc.flush()];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Words per second: a clip far outside an everyday pace was rushed, dragged, or read something besides the line. */
export function wordsPerSecond(text: string, seconds: number): number {
  const words = text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
  return seconds > 0 ? words / seconds : 0;
}
