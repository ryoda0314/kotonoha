// The learner's record, kept on the device (store.ts) and, when they are signed in with their ことのあめ account, in
// en_records too (sync.ts, merged, never overwritten). Pure: tested in tests/record.test.mjs.
//
// The centre of the record is the expression and the contexts it worked in, not the sentences: what the learner
// met, looked at, had the AI fill in, borrowed, reworked with support, and later used on their own are kept apart,
// because only the last is evidence of using it (english-learning-system.md, 成長をどう判定するか).
import { DIALOGUES, exprById, exprsIn, SCENES, type PartnerId } from "../content/index.ts";
import { sameness } from "./text.ts";

export type Where = { kind: "meet" | "scene" | "thread"; id: string };

/**
 * met: heard or read it (in a conversation, a scene, a partner's reply). looked: opened it. ai: the AI put it into
 * the learner's sentence. borrowed: sent a sample as it was. remade: used it in their own content with it in front of
 * them (これで言ってみる, or after opening samples). own: produced it themselves, nothing shown.
 */
export type EventKind = "met" | "looked" | "ai" | "borrowed" | "remade" | "own";
export type ExprEvent = { id: string; at: number; kind: EventKind; where: Where; n: number; text?: string };
export type ExprLog = { key: string; form: string; label: string; events: ExprEvent[] };

/** An expression lit in a sentence. */
export type Span = { expr: string; start: number; end: number };
/** 今回英語で言えなかった部分: what the learner wrote in Japanese, and the English used for it this time. */
export type Gap = { ja: string; en: string };
/** 自然なフレーズ: a reusable piece of the corrected sentence, the learner's own or brought in by the AI. */
export type Phrase = { text: string; key: string; form: string; label: string; origin: "mine" | "ai" };
export type Correction = { corrected: string; natural: boolean; note: string; gaps: Gap[]; phrases: Phrase[]; sig?: string };
export type OtherWay = { text: string; puts: string; tone: string; sig: string; exprs: Span[] };

/** What the learner had in front of them: the expression they were trying, samples opened or sent as they were. */
export type Support = { key?: string; form?: string; samples?: "opened" | "borrowed" };

export type MeTurn = {
  id: string;
  role: "me";
  at: number;
  input: string;
  spoken?: boolean;
  support?: Support;
  /** The reading chosen when the AI asked what was meant. */
  intent?: string;
  result?: Correction;
  ask?: { question: string; options: string[] };
  others?: OtherWay[];
};
export type ThemTurn = {
  id: string;
  role: "them";
  at: number;
  who: PartnerId;
  text: string;
  ja: string;
  /** The server's signature over the text, so /api/say reads it; prepared lines have `line` (their clip) instead. */
  sig?: string;
  line?: string;
  exprs: Span[];
};
export type Turn = MeTurn | ThemTurn;

export type ThreadKind = "talk" | "scene" | "side";
export type Origin = { kind: "meet" | "scene" | "thread"; id: string; title: string };
export type Thread = {
  id: string;
  kind: ThreadKind;
  /** The frame (talk), the scene (scene) or the expression's key (side). */
  ref: string;
  partner: PartnerId;
  title: string;
  /** Where a side conversation (寄り道) started. */
  from?: Origin;
  startedAt: number;
  updatedAt: number;
  turns: Turn[];
};

/** A conversation met (出会う) or a scene shown, by day. */
export type Visit = { at: number; kind: "meet" | "scene"; id: string };

export type PhraseUse = { text: string; ja: string; note: string; sig: string };

export type State = {
  v: 1;
  threads: Thread[];
  exprs: Record<string, ExprLog>;
  visits: Visit[];
  /** Counts what the learner has done (conversations met, scenes, sentences sent): "a few activities ago". */
  n: number;
  /** What each entrance is in the middle of, to come back to (the scene, and the thread its answer started). */
  current: { meet?: string; talk?: string; scene?: string; sceneThread?: string; at: number };
  /** Threads the learner deleted, so another device's copy does not bring them back. */
  removed: Record<string, number>;
  /** 別の場面で for phrases the AI found, made once when first asked for. */
  uses: Record<string, PhraseUse[]>;
};

export const THREADS_KEPT = 60;
export const EVENTS_KEPT = 60;
export const VISITS_KEPT = 500;
/** An expression comes back after this long, or after this many other activities, whichever first. */
export const RETURN_HOURS = 20;
export const RETURN_AFTER = 3;

export function emptyState(): State {
  return { v: 1, threads: [], exprs: {}, visits: [], n: 0, current: { at: 0 }, removed: {}, uses: {} };
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** The Japan day of a moment, as 2026-10-21. */
export function dayOf(at: number): string {
  return new Date(at).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function clone(state: State): State {
  return {
    ...state,
    threads: [...state.threads],
    exprs: { ...state.exprs },
    visits: [...state.visits],
    current: { ...state.current },
    removed: { ...state.removed },
    uses: { ...state.uses },
  };
}

/** What an expression is called: the prepared one's form and label, or what the AI said for a phrase. */
function describe(key: string, fallback?: { form: string; label: string }) {
  const e = exprById(key);
  return e ? { form: e.form, label: e.label } : { form: fallback?.form ?? key.replace(/^p:/, ""), label: fallback?.label ?? "" };
}

function withEvent(
  state: State,
  key: string,
  event: Omit<ExprEvent, "id" | "n">,
  info?: { form: string; label: string },
): State {
  const next = clone(state);
  const log = next.exprs[key] ?? { key, ...describe(key, info), events: [] };
  const events = [...log.events, { ...event, id: newId(), n: state.n }].slice(-EVENTS_KEPT);
  next.exprs[key] = { ...log, events };
  return next;
}

/** Heard or read these expressions somewhere (once per place within an hour). */
export function recordMet(state: State, keys: string[], where: Where, at = Date.now()): State {
  let next = state;
  for (const key of new Set(keys)) {
    const already = next.exprs[key]?.events.some(
      (e) => e.kind === "met" && e.where.kind === where.kind && e.where.id === where.id && at - e.at < 3_600_000,
    );
    if (!already) next = withEvent(next, key, { at, kind: "met", where });
  }
  return next;
}

/** Opened an expression (its other ways of saying, where else it turns up). */
export function recordLooked(state: State, key: string, where: Where, info?: { form: string; label: string }, at = Date.now()): State {
  return withEvent(state, key, { at, kind: "looked", where }, info);
}

/**
 * A conversation finished or a scene shown: it counts as one activity, and its expressions were met (`keys`: only
 * those shown, when part of it stays hidden, as a scene's samples do until opened).
 */
export function recordVisit(state: State, kind: "meet" | "scene", id: string, at = Date.now(), keys = exprsIn({ kind, id })): State {
  const next = recordMet(clone(state), keys, { kind, id }, at);
  next.visits = [...next.visits, { at, kind, id }].slice(-VISITS_KEPT);
  next.n = state.n + 1;
  return next;
}

/** How a phrase of a corrected sentence counts, given what the learner had in front of them. */
export function kindFor(phrase: Phrase, support: Support | undefined): EventKind {
  if (phrase.origin === "ai") return "ai";
  if (support?.samples === "borrowed") return "borrowed";
  if (support?.key === phrase.key || support?.samples === "opened") return "remade";
  return "own";
}

/** A sentence came back corrected: each phrase in it is recorded, and so is the partner's reply. */
export function recordResult(state: State, thread: Thread, turn: MeTurn, reply: ThemTurn | null, at = Date.now()): State {
  const where: Where = { kind: "thread", id: thread.id };
  let next = clone(state);
  next.n = state.n + 1;
  for (const p of turn.result?.phrases ?? []) {
    next = withEvent(next, p.key, { at, kind: kindFor(p, turn.support), where, text: p.text }, { form: p.form, label: p.label });
  }
  if (reply?.exprs.length) next = recordMet(next, reply.exprs.map((s) => s.expr), where, at);
  return next;
}

export function threadById(state: State, id: string): Thread | undefined {
  return state.threads.find((t) => t.id === id);
}

/** Adds or replaces a thread, newest first. */
export function putThread(state: State, thread: Thread): State {
  const next = clone(state);
  next.threads = [thread, ...state.threads.filter((t) => t.id !== thread.id)];
  return next;
}

export function removeThread(state: State, id: string, at = Date.now()): State {
  const next = clone(state);
  next.threads = state.threads.filter((t) => t.id !== id);
  next.removed[id] = at;
  if (next.current.talk === id) delete next.current.talk;
  return next;
}

export function setCurrent(state: State, part: Partial<Omit<State["current"], "at">>, at = Date.now()): State {
  const next = clone(state);
  next.current = { ...state.current, ...part, at };
  return next;
}

/** Adds the learner's turn or the partner's, or replaces one with the same id. */
export function withTurn(thread: Thread, turn: Turn, at = Date.now()): Thread {
  const i = thread.turns.findIndex((t) => t.id === turn.id);
  const turns = i === -1 ? [...thread.turns, turn] : thread.turns.map((t, k) => (k === i ? turn : t));
  return { ...thread, turns, updatedAt: at };
}

/** Kinds that mean the learner took notice of an expression (and so it is worth meeting again). */
const NOTICED: EventKind[] = ["looked", "ai", "borrowed", "remade", "own"];

/** The learner has taken notice of it (before `at`, when given): lit in the again violet when it turns up. */
export function noticed(state: State, key: string, at = Infinity): boolean {
  return Boolean(state.exprs[key]?.events.some((e) => NOTICED.includes(e.kind) && e.at < at));
}

/** When the learner last finished this conversation or was shown this scene (Infinity when never). */
export function shownAt(state: State, kind: "meet" | "scene", id: string): number {
  return lastVisit(state, kind, id) || Infinity;
}

/**
 * Expressions due to come back, longest waiting first: noticed, not yet used on the learner's own since it was last
 * supplied or shown, and last met a while ago (RETURN_HOURS) or a few activities ago (RETURN_AFTER).
 */
export function dueKeys(state: State, now = Date.now()): string[] {
  const due: { key: string; last: number }[] = [];
  for (const log of Object.values(state.exprs)) {
    const ev = log.events;
    if (!ev.some((e) => NOTICED.includes(e.kind))) continue;
    const lastSupported = Math.max(0, ...ev.filter((e) => e.kind !== "own" && e.kind !== "met").map((e) => e.at));
    const lastOwn = Math.max(0, ...ev.filter((e) => e.kind === "own").map((e) => e.at));
    if (lastOwn > lastSupported) continue;
    const last = ev[ev.length - 1];
    if (now - last.at >= RETURN_HOURS * 3_600_000 || state.n - last.n >= RETURN_AFTER) due.push({ key: log.key, last: last.at });
  }
  return due.sort((a, b) => a.last - b.last).map((d) => d.key);
}

function lastVisit(state: State, kind: "meet" | "scene", id: string): number {
  for (let i = state.visits.length - 1; i >= 0; i--) if (state.visits[i].kind === kind && state.visits[i].id === id) return state.visits[i].at;
  return 0;
}

/**
 * The next conversation or scene: one holding expressions due to come back first, then ones not met yet, then the
 * one met longest ago; never the one just shown.
 */
export function pickNext(state: State, kind: "meet" | "scene", now = Date.now(), not?: string): string {
  const ids = (kind === "meet" ? DIALOGUES : SCENES).map((x) => x.id).filter((id) => id !== not);
  const due = new Set(dueKeys(state, now));
  const scored = ids.map((id, order) => ({
    id,
    order,
    due: exprsIn({ kind, id }).filter((k) => due.has(k)).length,
    last: lastVisit(state, kind, id),
  }));
  scored.sort((a, b) => b.due - a.due || (a.last === 0 ? 0 : 1) - (b.last === 0 ? 0 : 1) || a.last - b.last || a.order - b.order);
  return scored[0]?.id ?? ids[0];
}

/** One thing the learner did on their own with an expression that had been shown, supplied or borrowed before. */
export type Grown = { key: string; form: string; label: string; at: number; where: Where; text?: string; before: EventKind };

/**
 * 今回、新しい場面でできたこと: each use of an expression on the learner's own, after it had first come with
 * support (the AI filled it in, a sample, trying it with it in front of them), newest first. Not a score.
 */
export function grown(state: State): Grown[] {
  const out: Grown[] = [];
  for (const log of Object.values(state.exprs)) {
    let before: EventKind | null = null;
    for (const e of log.events) {
      if (e.kind === "ai" || e.kind === "borrowed" || e.kind === "remade" || e.kind === "looked") before = e.kind;
      else if (e.kind === "own" && before) out.push({ key: log.key, form: log.form, label: log.label, at: e.at, where: e.where, text: e.text, before });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Every Japanese part the learner filled in and the English used for it that time, newest first. */
export function gapsOf(state: State): { ja: string; en: string; at: number; thread: Thread }[] {
  const out: { ja: string; en: string; at: number; thread: Thread }[] = [];
  for (const thread of state.threads) {
    for (const t of thread.turns) if (t.role === "me") for (const g of t.result?.gaps ?? []) out.push({ ...g, at: t.at, thread });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** まとめ of a conversation: its Japanese parts and the phrases worth meeting again, each once. */
export function summaryOf(thread: Thread): { gaps: Gap[]; phrases: (Phrase & { times: number })[] } {
  const gaps = new Map<string, Gap>();
  const phrases = new Map<string, Phrase & { times: number }>();
  for (const t of thread.turns) {
    if (t.role !== "me" || !t.result) continue;
    for (const g of t.result.gaps) gaps.set(g.ja, g);
    for (const p of t.result.phrases) {
      const had = phrases.get(p.key);
      // The learner's own use outweighs the AI's for the same phrase.
      phrases.set(p.key, { ...(had && had.origin === "mine" ? had : p), times: (had?.times ?? 0) + 1 });
    }
  }
  return { gaps: [...gaps.values()], phrases: [...phrases.values()] };
}

/** True when the learner sent a sample (nearly) as it was, rather than a sentence of their own. */
export function sentAsSample(input: string, samples: string[]): boolean {
  return samples.some((s) => sameness(input, s) >= 0.8);
}

/** The conversation so far, for the AI: what the learner meant (corrected) and what the partner said. */
export function historyOf(thread: Thread, limit = 12): { role: "me" | "them"; text: string }[] {
  return thread.turns
    .slice(-limit)
    .map((t) => (t.role === "me" ? { role: "me" as const, text: t.result?.corrected ?? t.input } : { role: "them" as const, text: t.text }));
}

/** Keeps the record bounded: the newest threads, the latest events of each expression, recent visits. */
export function bounded(state: State): State {
  const next = clone(state);
  next.threads = [...state.threads].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, THREADS_KEPT);
  next.visits = state.visits.slice(-VISITS_KEPT);
  const old = Date.now() - 180 * 86_400_000;
  next.removed = Object.fromEntries(Object.entries(state.removed).filter(([, at]) => at > old));
  return next;
}

function mergeThread(a: Thread, b: Thread): Thread {
  const turns = new Map<string, Turn>();
  for (const t of [...a.turns, ...b.turns]) {
    const had = turns.get(t.id);
    // The fuller copy of the same turn wins: one that has its correction, or the other ways of saying.
    const score = (x: Turn) => (x.role === "me" ? (x.result ? 2 : 0) + (x.others ? 1 : 0) + (x.ask ? 1 : 0) : 1);
    if (!had || score(t) > score(had)) turns.set(t.id, t);
  }
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  return { ...newer, turns: [...turns.values()].sort((x, y) => x.at - y.at), updatedAt: Math.max(a.updatedAt, b.updatedAt) };
}

/** Two copies of the record (this device's and the account's) made one, losing nothing either had. */
export function mergeStates(a: State, b: State): State {
  const removed = { ...a.removed };
  for (const [id, at] of Object.entries(b.removed)) removed[id] = Math.max(removed[id] ?? 0, at);

  const threads = new Map<string, Thread>();
  for (const t of [...a.threads, ...b.threads]) {
    if (removed[t.id]) continue;
    const had = threads.get(t.id);
    threads.set(t.id, had ? mergeThread(had, t) : t);
  }

  const exprs: Record<string, ExprLog> = {};
  for (const log of [...Object.values(a.exprs), ...Object.values(b.exprs)]) {
    const had = exprs[log.key];
    if (!had) {
      exprs[log.key] = log;
      continue;
    }
    const events = new Map(had.events.map((e) => [e.id, e]));
    for (const e of log.events) events.set(e.id, e);
    exprs[log.key] = { ...had, events: [...events.values()].sort((x, y) => x.at - y.at).slice(-EVENTS_KEPT) };
  }

  const visits = new Map<string, Visit>();
  for (const v of [...a.visits, ...b.visits]) visits.set(`${v.at}:${v.kind}:${v.id}`, v);

  return bounded({
    v: 1,
    threads: [...threads.values()],
    exprs,
    visits: [...visits.values()].sort((x, y) => x.at - y.at),
    n: Math.max(a.n, b.n),
    current: a.current.at >= b.current.at ? a.current : b.current,
    removed,
    uses: { ...b.uses, ...a.uses },
  });
}
