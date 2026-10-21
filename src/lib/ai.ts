import "server-only";
import OpenAI from "openai";
import type { OtherWay, PhraseUse } from "./record.ts";
import { sign } from "./sign.ts";
import {
  cleanOther,
  cleanTurn,
  cleanUses,
  OTHER_SCHEMA,
  otherPrompt,
  TURN_SCHEMA,
  turnPrompt,
  USES_SCHEMA,
  usesPrompt,
  type RawTurn,
  type TurnRequest,
  type TurnResult,
} from "./turn-core.ts";

export type { TurnRequest, TurnResult };

// The app's AI: once per sentence of the learner's (corrected, sorted out, answered by the partner), and for ほかの言い方
// and 別の場面で only when the learner opens them. What it asks and how the answers are checked: turn-core.ts.

// gpt-5.5 at low effort: on the design's own examples it kept the learner's meaning (夜 stayed "at night", not
// "tonight") where gpt-5.2 was slower and gpt-5.4-mini and effort "none" changed it. TALK_MODEL changes it.
export const TALK_MODEL = process.env.TALK_MODEL || "gpt-5.5";

let client: OpenAI | null = null;
const openai = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

async function ask<T>({ system, user }: { system: string; user: string }, name: string, schema: object): Promise<T> {
  const completion = await openai().chat.completions.create({
    model: TALK_MODEL,
    reasoning_effort: "low",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema: schema as Record<string, unknown> } },
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error(`empty ${name} response`);
  return JSON.parse(content) as T;
}

export async function takeTurn(req: TurnRequest): Promise<TurnResult> {
  return cleanTurn(await ask<RawTurn>(turnPrompt(req), "turn", TURN_SCHEMA), req, sign);
}

export async function otherWays(args: { sentence: string; before: string | null }): Promise<OtherWay[]> {
  return cleanOther(await ask(otherPrompt(args), "other_ways", OTHER_SCHEMA), args.sentence, sign);
}

export async function phraseUses(args: { text: string; form: string; label: string }): Promise<PhraseUse[]> {
  return cleanUses(await ask(usesPrompt(args), "phrase_uses", USES_SCHEMA), sign);
}
