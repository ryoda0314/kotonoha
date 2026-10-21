"use client";

// One sentence from the microphone, as in ことのおと but longer: it starts listening at once, notices when the learner
// starts speaking, and stops by itself a moment after they stop (or when they press stop, or at the time limit). Only
// a 16 kHz WAV is sent to be heard (/api/hear), and nothing is kept.
import { stop as stopPlayback } from "./audio";

export type Recording = { samples: Float32Array; rate: number };
export type RecordError = "denied" | "missing" | "failed";

const MAX_MS = 30_000;
const SILENCE_AFTER_MS = 1800;
const FRAME_MS = 20;

export type Take = { done: Promise<Recording>; stop: () => void };

export async function startRecording(onLevel?: (level: number) => void): Promise<Take> {
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") throw "missing" satisfies RecordError;
  stopPlayback();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  } catch (err) {
    throw (err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "missing") satisfies RecordError;
  }
  const ctx = new AudioContext();
  const close = () => {
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => undefined);
  };
  try {
    await ctx.audioWorklet.addModule("/worklets/recorder.js");
  } catch {
    close();
    throw "failed" satisfies RecordError;
  }
  const input = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "english-recorder");
  const chunks: Float32Array[] = [];
  const frameLength = Math.round((ctx.sampleRate * FRAME_MS) / 1000);
  let finish: () => void = () => undefined;

  const done = new Promise<Recording>((resolve) => {
    let total = 0;
    let pending: number[] = [];
    let noise = 0;
    let frames = 0;
    let speaking = false;
    let quietFrames = 0;
    let finished = false;
    finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(limit);
      node.port.onmessage = null;
      const out = new Float32Array(total);
      let offset = 0;
      for (const c of chunks) {
        out.set(c, offset);
        offset += c.length;
      }
      const rate = ctx.sampleRate;
      close();
      resolve({ samples: out, rate });
    };
    const limit = setTimeout(finish, MAX_MS);
    node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      chunks.push(e.data);
      total += e.data.length;
      pending.push(...e.data);
      while (pending.length >= frameLength) {
        const frame = pending.slice(0, frameLength);
        pending = pending.slice(frameLength);
        const rms = Math.sqrt(frame.reduce((a, v) => a + v * v, 0) / frameLength);
        frames++;
        onLevel?.(Math.min(1, rms * 8));
        // The first 200 ms set the room's noise; speech is well above it.
        if (frames <= 10) noise = Math.max(noise, rms);
        const threshold = Math.max(0.015, noise * 3);
        if (rms > threshold) {
          speaking = true;
          quietFrames = 0;
        } else if (speaking && ++quietFrames * FRAME_MS >= SILENCE_AFTER_MS) {
          finish();
          return;
        }
      }
    };
    input.connect(node);
  });
  return { done, stop: () => finish() };
}

/** A 16 kHz, 16-bit mono WAV of a recording: small enough to send, plenty for recognizing speech. */
export function toWav16k({ samples, rate }: Recording): Blob {
  const out = Math.floor((samples.length * 16000) / rate);
  const pcm = new Int16Array(out);
  const step = rate / 16000;
  for (let i = 0; i < out; i++) {
    // The average of the samples this one stands for: a crude but adequate low-pass.
    const from = Math.floor(i * step);
    const to = Math.max(from + 1, Math.floor((i + 1) * step));
    let sum = 0;
    for (let k = from; k < to && k < samples.length; k++) sum += samples[k];
    pcm[i] = Math.round(Math.max(-1, Math.min(1, sum / (to - from))) * 32767);
  }
  const header = new DataView(new ArrayBuffer(44));
  const text = (o: number, s: string) => [...s].forEach((c, i) => header.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  header.setUint32(4, 36 + pcm.byteLength, true);
  text(8, "WAVE");
  text(12, "fmt ");
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, 16000, true);
  header.setUint32(28, 32000, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  text(36, "data");
  header.setUint32(40, pcm.byteLength, true);
  return new Blob([header.buffer, pcm.buffer], { type: "audio/wav" });
}
