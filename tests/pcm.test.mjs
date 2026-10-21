import { test } from "node:test";
import assert from "node:assert/strict";
import { pcmToSamples, rateOf, tidy, toMp3, wordsPerSecond } from "../src/lib/pcm.ts";
import { fallbackOf, PARTNERS, VOICES } from "../src/content/index.ts";

const RATE = 24000;

/** Silence, then a tone, then silence: what a generated clip looks like. */
function clip(leadSeconds, toneSeconds, tailSeconds, amplitude = 0.3) {
  const n = Math.round((leadSeconds + toneSeconds + tailSeconds) * RATE);
  const out = new Float32Array(n);
  const from = Math.round(leadSeconds * RATE);
  const to = from + Math.round(toneSeconds * RATE);
  for (let i = from; i < to; i++) out[i] = amplitude * Math.sin((2 * Math.PI * 220 * i) / RATE);
  return out;
}

test("the silence before the first sound is cut, keeping a short lead-in", () => {
  const out = tidy(clip(0.6, 1, 0.5), RATE);
  // 20 ms lead + 1 s + 120 ms tail + 80 ms after, give or take a sample.
  assert.ok(Math.abs(out.length / RATE - 1.22) < 0.01, `${out.length / RATE}`);
  let firstSound = 0;
  while (Math.abs(out[firstSound]) < 0.006) firstSound++;
  assert.ok(firstSound / RATE <= 0.021);
});

test("the end fades out instead of stopping mid-wave, and quiet speech is brought up", () => {
  const out = tidy(clip(0.1, 1, 0.1, 0.02), RATE);
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  assert.ok(peak > 0.1 && peak <= 0.89, `${peak}`);
  assert.equal(out[out.length - 1], 0);
});

test("silence alone gives nothing, and the rate is read from the mime type", () => {
  assert.equal(tidy(new Float32Array(RATE), RATE).length, 0);
  assert.equal(rateOf("audio/L16;codec=pcm;rate=24000"), 24000);
  assert.equal(rateOf("audio/l16; rate=16000; channels=1"), 16000);
  assert.equal(rateOf("audio/l16"), 24000);
});

test("16-bit PCM becomes samples, and samples become an MP3", () => {
  const pcm = new Uint8Array([0x00, 0x40, 0x00, 0xc0]); // 16384, -16384
  assert.deepEqual([...pcmToSamples(pcm)], [0.5, -0.5]);
  const mp3 = toMp3(clip(0, 0.5, 0), RATE);
  assert.ok(mp3.length > 1000);
  assert.ok(mp3[0] === 0xff || String.fromCharCode(mp3[0], mp3[1], mp3[2]) === "ID3");
});

test("pace counts words", () => {
  assert.equal(wordsPerSecond("Want to grab coffee after class?", 2), 3);
});

test("every Google voice has an OpenAI voice to fall back on, and only those", () => {
  for (const p of Object.values(PARTNERS)) {
    if (p.voice.startsWith("google:")) assert.ok(p.fallback && !p.fallback.startsWith("google:"), p.id);
    else assert.equal(fallbackOf(p.voice), null);
  }
  assert.ok(VOICES.some((v) => v.startsWith("google:")));
});
