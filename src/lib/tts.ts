// Voicing English in a Google voice, "google:<Gemini voice>" (Gemini TTS on Vertex AI, the same project and service
// account as ことのあめ). Only Google's voices speak: no OpenAI voice is used, not even when Google refuses. A take comes
// back as raw PCM and goes through the tidying of pcm.ts, so every line starts at once and is as loud as the one before.
// Used by /api/say and scripts/generate-audio.mjs only, never in the browser: it reads the keys.
import { GoogleGenAI } from "@google/genai";
import { pcmToSamples, rateOf, tidy, toMp3, wordsPerSecond } from "./pcm.ts";
import { GEMINI_INSTRUCTION, GEMINI_TTS_MODEL, PACE_RANGE } from "./speech.ts";

export const isGoogle = (voice: string) => voice.startsWith("google:");

let gemini: GoogleGenAI | null = null;

function vertex(): GoogleGenAI {
  if (gemini) return gemini;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!raw || !project) throw new Error("no Google credentials");
  let credentials: object;
  try {
    credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    credentials = JSON.parse(raw.replace(/\\n/g, "\n"));
  }
  gemini = new GoogleGenAI({
    vertexai: true,
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
    googleAuthOptions: { credentials },
  });
  return gemini;
}

/** One Gemini take, tidied (see pcm.ts), with its length. */
async function geminiTake(text: string, name: string): Promise<{ samples: Float32Array; rate: number; seconds: number }> {
  const r = await vertex().models.generateContent({
    model: GEMINI_TTS_MODEL,
    contents: [{ role: "user", parts: [{ text: GEMINI_INSTRUCTION + text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { languageCode: "en-US", voiceConfig: { prebuiltVoiceConfig: { voiceName: name } } },
    },
  });
  const part = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const data = part?.inlineData?.data;
  const mime = part?.inlineData?.mimeType ?? "";
  if (!data || !/pcm|l16/i.test(mime)) throw new Error(`no audio (${mime || "nothing"})`);
  const rate = rateOf(mime);
  const samples = tidy(pcmToSamples(new Uint8Array(Buffer.from(data, "base64"))), rate);
  return { samples, rate, seconds: samples.length / rate };
}

/** How far a take is from an everyday pace (0 inside it). Lines under four words are not judged. */
function offPace(text: string, seconds: number): number {
  if (text.split(/\s+/).length < 4) return 0;
  const speed = wordsPerSecond(text, seconds);
  const [slow, fast] = PACE_RANGE;
  if (speed > fast) return speed / fast - 1;
  if (speed < slow) return slow / Math.max(speed, 0.01) - 1;
  return 0;
}

export const isQuota = (err: unknown) => /RESOURCE_EXHAUSTED|429|quota/i.test(String((err as Error)?.message ?? err));

/**
 * The line in this Google voice, as MP3: up to `tries` takes, keeping the first at an everyday pace (or the nearest).
 * When Google cannot (its quota refuses, no credentials) it throws, and the caller decides what speaks instead.
 */
export async function speak(text: string, voice: string, { tries = 1 }: { tries?: number } = {}): Promise<{ mp3: Uint8Array; voice: string }> {
  if (!isGoogle(voice)) throw new Error(`not a Google voice: ${voice}`);
  let best: { samples: Float32Array; rate: number; off: number } | null = null;
  for (let i = 0; i < tries; i++) {
    const take = await geminiTake(text, voice.slice("google:".length));
    const off = offPace(text, take.seconds);
    if (!best || off < best.off) best = { ...take, off };
    if (off === 0) break;
  }
  if (!best || best.samples.length === 0) throw new Error("empty take");
  return { mp3: toMp3(best.samples, best.rate), voice };
}
