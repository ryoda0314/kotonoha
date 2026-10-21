"use client";

// What the screens do with a conversation: start one, send the learner's sentence (it shows at once, the correction
// and the partner's reply follow), ask for other ways of saying or for more uses of a phrase. Everything lands in the
// record (store.ts) and from there on every screen.
import { useSyncExternalStore } from "react";
import { exprById, markRange, type Line, type PartnerId } from "@/content/index.ts";
import { prefNow } from "@/components/local";
import { playAll, replyItems } from "@/components/audio";
import {
  dueKeys,
  historyOf,
  newId,
  noticed,
  putThread,
  recordResult,
  threadById,
  withTurn,
  type MeTurn,
  type Origin,
  type OtherWay,
  type PhraseUse,
  type Span,
  type Support,
  type ThemTurn,
  type Thread,
  type ThreadKind,
} from "./record.ts";
import { commit, getState } from "./store.ts";
import { PARTNERS } from "@/content/index.ts";

// Threads waiting for the AI, so their screens can show it.
const waiting = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useWaiting(threadId: string | null): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (threadId ? waiting.has(threadId) : false),
    () => false,
  );
}

/** A prepared line said by a partner, as the first turn of a conversation. */
export function lineTurn(line: Line, at = Date.now()): ThemTurn {
  const exprs: Span[] = [];
  for (const m of line.marks ?? []) {
    const r = markRange(line, m);
    if (r) exprs.push({ expr: m.expr, ...r });
  }
  return { id: newId(), role: "them", at, who: line.who as PartnerId, text: line.text, ja: line.ja, line: line.id, exprs };
}

export function startThread(args: {
  kind: ThreadKind;
  ref: string;
  partner: PartnerId;
  title: string;
  from?: Origin;
  first?: ThemTurn;
}): Thread {
  const at = Date.now();
  const thread: Thread = {
    id: newId(),
    kind: args.kind,
    ref: args.ref,
    partner: args.partner,
    title: args.title,
    from: args.from,
    startedAt: at,
    updatedAt: at,
    turns: args.first ? [args.first] : [],
  };
  commit((s) => putThread(s, thread));
  return thread;
}

export type SendResult = { ok: true } | { ok: false; reason: "failed" | "tooMany" };

/**
 * Sends one sentence of the learner's. It shows at once; the correction and the reply follow. On failure the turn is
 * taken back and the screen keeps the text so nothing typed is lost.
 */
export async function send(
  threadId: string,
  input: string,
  opts: { support?: Support; spoken?: boolean; intent?: string; again?: string } = {},
): Promise<SendResult> {
  const state = getState();
  const thread = threadById(state, threadId);
  if (!thread || waiting.has(threadId)) return { ok: false, reason: "failed" };

  const before = opts.again ? { ...thread, turns: thread.turns.filter((t) => t.id !== opts.again) } : thread;
  const me: MeTurn = {
    id: opts.again ?? newId(),
    role: "me",
    at: Date.now(),
    input,
    spoken: opts.spoken || undefined,
    support: opts.support,
    intent: opts.intent,
  };
  commit((s) => putThread(s, withTurn(before, me)));
  waiting.add(threadId);
  emit();

  const phraseLog = thread.kind === "side" && thread.ref.startsWith("p:") ? state.exprs[thread.ref] : undefined;
  let response: Response | null = null;
  try {
    response = await fetch("/api/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: thread.kind,
        ref: thread.ref,
        partner: thread.partner,
        history: historyOf(before),
        input,
        intent: opts.intent,
        phrase: phraseLog ? { form: phraseLog.form, label: phraseLog.label } : undefined,
        due: dueKeys(state).slice(0, 3),
        noticed: Object.keys(state.exprs).filter((k) => exprById(k) && noticed(state, k)),
      }),
    });
  } catch {
    response = null;
  }

  const body = response?.ok ? await response.json().catch(() => null) : null;
  waiting.delete(threadId);
  emit();
  if (!body || (!body.ask && !body.result)) {
    // Take the sentence back: the composer still has it.
    commit((s) => {
      const t = threadById(s, threadId);
      return t ? putThread(s, { ...t, turns: t.turns.filter((x) => x.id !== me.id) }) : s;
    });
    return { ok: false, reason: response?.status === 429 ? "tooMany" : "failed" };
  }

  if (body.ask) {
    commit((s) => {
      const t = threadById(s, threadId);
      return t ? putThread(s, withTurn(t, { ...me, ask: body.ask })) : s;
    });
    return { ok: true };
  }

  const done: MeTurn = { ...me, result: body.result, ask: undefined };
  const reply: ThemTurn = {
    id: newId(),
    role: "them",
    at: Date.now(),
    who: thread.partner,
    text: body.reply.text,
    ja: body.reply.ja,
    sig: body.reply.sig,
    parts: body.reply.parts,
    exprs: body.reply.exprs ?? [],
  };
  commit((s) => {
    const t = threadById(s, threadId);
    if (!t) return s;
    const next = withTurn(withTurn(t, done), reply);
    return recordResult(putThread(s, next), next, done, reply);
  });
  if (prefNow("sound", true)) void playAll(replyItems(reply, PARTNERS[thread.partner].voice));
  return { ok: true };
}

/** ほかの言い方 for one corrected sentence, asked for once and kept with it (an empty list when there is none). */
export async function loadOthers(threadId: string, turnId: string): Promise<boolean> {
  const thread = threadById(getState(), threadId);
  const i = thread?.turns.findIndex((t) => t.id === turnId) ?? -1;
  const turn = thread?.turns[i];
  if (!thread || !turn || turn.role !== "me" || !turn.result) return false;
  const prev = thread.turns.slice(0, i).reverse().find((t) => t.role === "them");
  const res = await fetch("/api/other", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sentence: turn.result.corrected, before: prev?.role === "them" ? prev.text : null }),
  }).catch(() => null);
  const body = res?.ok ? ((await res.json().catch(() => null)) as { options?: OtherWay[] } | null) : null;
  if (!body?.options) return false;
  commit((s) => {
    const t = threadById(s, threadId);
    const x = t?.turns.find((y) => y.id === turnId);
    return t && x && x.role === "me" ? putThread(s, withTurn(t, { ...x, others: body.options }, t.updatedAt)) : s;
  });
  return true;
}

/** 別の場面で for a phrase the AI found, made once and kept in the record. */
export async function loadUses(key: string, phrase: { text: string; form: string; label: string }): Promise<boolean> {
  const res = await fetch("/api/other", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phrase }),
  }).catch(() => null);
  const body = res?.ok ? ((await res.json().catch(() => null)) as { uses?: PhraseUse[] } | null) : null;
  if (!body?.uses?.length) return false;
  commit((s) => ({ ...s, uses: { ...s.uses, [key]: body.uses! } }));
  return true;
}
