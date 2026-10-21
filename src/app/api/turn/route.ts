import { exprById, frameById, PARTNERS, sceneById, type PartnerId } from "@/content/index.ts";
import { takeTurn, type TurnRequest } from "@/lib/ai";
import { addressOf, allow } from "@/lib/limits";

// One sentence of the learner's: corrected, sorted out, and answered by the partner (src/lib/ai.ts).
//   POST { kind, ref, partner, history, input, intent?, phrase?, due }

const MAX_INPUT = 500;
const MAX_TURN = 800;

function parse(body: unknown): TurnRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const kind = b.kind;
  const ref = typeof b.ref === "string" ? b.ref : "";
  const partner = b.partner as PartnerId;
  const input = typeof b.input === "string" ? b.input.trim() : "";
  if (kind !== "talk" && kind !== "scene" && kind !== "side") return null;
  if (!PARTNERS[partner] || !input || input.length > MAX_INPUT) return null;
  if (kind === "talk" && !frameById(ref)) return null;
  if (kind === "scene" && !sceneById(ref)) return null;
  if (kind === "side" && !exprById(ref) && !ref.startsWith("p:")) return null;

  const history = Array.isArray(b.history)
    ? b.history
        .filter((h): h is { role: "me" | "them"; text: string } => {
          const x = h as Record<string, unknown>;
          return (x?.role === "me" || x?.role === "them") && typeof x.text === "string" && x.text.length <= MAX_TURN;
        })
        .slice(-14)
    : [];
  const phrase =
    b.phrase && typeof b.phrase === "object"
      ? {
          form: String((b.phrase as Record<string, unknown>).form ?? "").slice(0, 80),
          label: String((b.phrase as Record<string, unknown>).label ?? "").slice(0, 40),
        }
      : undefined;
  return {
    kind,
    ref,
    partner,
    history,
    input,
    intent: typeof b.intent === "string" ? b.intent.slice(0, 200) : undefined,
    phrase,
    due: Array.isArray(b.due) ? b.due.filter((d): d is string => typeof d === "string").slice(0, 5) : [],
    noticed: Array.isArray(b.noticed) ? b.noticed.filter((d): d is string => typeof d === "string" && Boolean(exprById(d))).slice(0, 40) : [],
  };
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "unavailable" }, { status: 503 });
  const req = parse(await request.json().catch(() => null));
  if (!req) return Response.json({ error: "bad request" }, { status: 400 });
  if (!allow("turn", addressOf(request))) return Response.json({ error: "too many" }, { status: 429 });
  try {
    return Response.json(await takeTurn(req));
  } catch (err) {
    console.error("[turn]", err instanceof Error ? err.message : err);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
