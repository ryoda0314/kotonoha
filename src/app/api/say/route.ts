import OpenAI from "openai";
import { VOICES } from "@/content/index.ts";
import { addressOf, allow } from "@/lib/limits";
import { verify } from "@/lib/sign";
import { TTS_INSTRUCTIONS, TTS_MODEL } from "@/lib/speech";

// Voices English the app's AI wrote (a partner's reply, a corrected sentence, other ways of saying), only when it
// comes with the signature the server gave it. Prepared lines are static files (public/audio) and never come here.
//   POST { text, sig, voice }  →  audio/mpeg

const MAX = 600;
const KEPT = 300;
// The same few sentences are played again and again in a conversation: keep the recent ones.
const cache = new Map<string, Uint8Array>();
let client: OpenAI | null = null;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "unavailable" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { text?: unknown; sig?: unknown; voice?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text : "";
  const sig = typeof body?.sig === "string" ? body.sig : "";
  const voice = typeof body?.voice === "string" && VOICES.includes(body.voice) ? body.voice : null;
  if (!text || text.length > MAX || !voice || !verify(text, sig)) return Response.json({ error: "bad request" }, { status: 400 });

  const key = `${voice}\n${text}`;
  let audio = cache.get(key);
  if (!audio) {
    if (!allow("say", addressOf(request))) return Response.json({ error: "too many" }, { status: 429 });
    try {
      client ??= new OpenAI();
      const res = await client.audio.speech.create({ model: TTS_MODEL, voice, input: text, instructions: TTS_INSTRUCTIONS, response_format: "mp3" });
      audio = new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      console.error("[say]", err instanceof Error ? err.message : err);
      // The page falls back to the browser's own voice.
      return Response.json({ error: "failed" }, { status: 502 });
    }
    cache.set(key, audio);
    if (cache.size > KEPT) cache.delete(cache.keys().next().value as string);
  }
  return new Response(Buffer.from(audio), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
}
