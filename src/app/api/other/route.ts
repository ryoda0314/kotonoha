import { otherWays, phraseUses } from "@/lib/ai";
import { addressOf, allow } from "@/lib/limits";

// Asked for only when the learner opens them:
//   POST { sentence, before? }          ほかの言い方 for a sentence of theirs
//   POST { phrase: { text, form, label } }   別の場面で for a phrase the AI found

const MAX = 500;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "unavailable" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "bad request" }, { status: 400 });
  const phrase = body.phrase as Record<string, unknown> | undefined;
  const sentence = typeof body.sentence === "string" ? body.sentence.trim() : "";
  if (!phrase && (!sentence || sentence.length > MAX)) return Response.json({ error: "bad request" }, { status: 400 });
  if (!allow("other", addressOf(request))) return Response.json({ error: "too many" }, { status: 429 });
  try {
    if (phrase) {
      const text = String(phrase.text ?? "").trim().slice(0, 120);
      if (!text) return Response.json({ error: "bad request" }, { status: 400 });
      const uses = await phraseUses({ text, form: String(phrase.form ?? text).slice(0, 80), label: String(phrase.label ?? "").slice(0, 40) });
      return Response.json({ uses });
    }
    const before = typeof body.before === "string" ? body.before.slice(0, MAX) : null;
    return Response.json({ options: await otherWays({ sentence, before }) });
  } catch (err) {
    console.error("[other]", err instanceof Error ? err.message : err);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
