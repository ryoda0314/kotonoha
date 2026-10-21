import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dueKeys,
  emptyState,
  grown,
  kindFor,
  mergeStates,
  pickNext,
  putThread,
  recordLooked,
  recordResult,
  recordVisit,
  removeThread,
  sentAsSample,
  summaryOf,
  withTurn,
} from "../src/lib/record.ts";

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 9, 21, 3); // 12:00 in Japan

function thread(id = "t1") {
  return { id, kind: "talk", ref: "talk-plan", partner: "mia", title: "予定を合わせる", startedAt: T0, updatedAt: T0, turns: [] };
}

function said(id, phrases, support, at = T0) {
  return {
    id,
    role: "me",
    at,
    input: "x",
    support,
    result: { corrected: "x", natural: false, note: "", gaps: [], phrases },
  };
}

const FEEL = { text: "feel like going out", key: "feel-like", form: "feel like + 〜ing", label: "〜したい気分だと言う" };

test("a phrase counts by what the learner had in front of them", () => {
  assert.equal(kindFor({ ...FEEL, origin: "ai" }, undefined), "ai");
  assert.equal(kindFor({ ...FEEL, origin: "mine" }, undefined), "own");
  assert.equal(kindFor({ ...FEEL, origin: "mine" }, { key: "feel-like" }), "remade");
  assert.equal(kindFor({ ...FEEL, origin: "mine" }, { samples: "opened" }), "remade");
  assert.equal(kindFor({ ...FEEL, origin: "mine" }, { samples: "borrowed" }), "borrowed");
  // Trying one expression does not make another one supported.
  assert.equal(kindFor({ ...FEEL, origin: "mine" }, { key: "id-rather" }), "own");
});

test("an expression the AI filled in comes back after a few activities, and rests once used on one's own", () => {
  let s = putThread(emptyState(), thread());
  s = recordResult(s, thread(), said("a", [{ ...FEEL, origin: "ai" }]), null, T0);
  assert.deepEqual(dueKeys(s, T0 + HOUR), []);
  for (let i = 0; i < 3; i++) s = recordVisit(s, "meet", "make-app", T0 + i);
  assert.deepEqual(dueKeys(s, T0 + HOUR), ["feel-like"]);
  // A day later it is due anyway.
  const fresh = recordResult(putThread(emptyState(), thread()), thread(), said("a", [{ ...FEEL, origin: "ai" }]), null, T0);
  assert.deepEqual(dueKeys(fresh, T0 + 21 * HOUR), ["feel-like"]);
  // Used on their own: no longer due.
  s = recordResult(s, thread(), said("b", [{ ...FEEL, origin: "mine" }]), null, T0 + 2 * HOUR);
  assert.deepEqual(dueKeys(s, T0 + 30 * HOUR), []);
});

test("only met is not enough to come back", () => {
  const s = recordVisit(emptyState(), "meet", "decide-tonight", T0);
  assert.ok(s.exprs["feel-like"]);
  assert.deepEqual(dueKeys(s, T0 + 48 * HOUR), []);
});

test("the next conversation holds what is due", () => {
  let s = recordLooked(emptyState(), "fine-with-either", { kind: "meet", id: "decide-laptop" }, undefined, T0);
  s = { ...s, n: 10 };
  assert.equal(pickNext(s, "meet", T0 + HOUR), "decide-laptop");
  assert.equal(pickNext(s, "scene", T0 + HOUR), "scene-dinner");
  // Not the one just shown.
  assert.notEqual(pickNext(s, "meet", T0 + HOUR, "decide-laptop"), "decide-laptop");
});

test("unseen conversations come before ones met already", () => {
  const s = recordVisit(emptyState(), "meet", "plan-movie", T0);
  assert.equal(pickNext(s, "meet", T0 + HOUR), "plan-late");
});

test("できたこと lists own uses that came after support, not first uses", () => {
  let s = putThread(emptyState(), thread());
  s = recordResult(s, thread(), said("a", [{ ...FEEL, origin: "mine" }]), null, T0);
  assert.equal(grown(s).length, 0);
  s = recordResult(s, thread(), said("b", [{ ...FEEL, origin: "ai" }]), null, T0 + HOUR);
  s = recordResult(s, thread(), said("c", [{ ...FEEL, origin: "mine" }]), null, T0 + 30 * HOUR);
  const g = grown(s);
  assert.equal(g.length, 1);
  assert.equal(g[0].before, "ai");
  assert.equal(g[0].key, "feel-like");
});

test("a conversation's summary keeps each gap and phrase once, the learner's own use first", () => {
  let t = thread();
  t = withTurn(t, { ...said("a", [{ ...FEEL, origin: "ai" }]), result: { corrected: "x", natural: false, note: "", gaps: [{ ja: "家", en: "home" }], phrases: [{ ...FEEL, origin: "ai" }] } });
  t = withTurn(t, { ...said("b", [{ ...FEEL, origin: "mine" }]), result: { corrected: "y", natural: false, note: "", gaps: [{ ja: "家", en: "home" }], phrases: [{ ...FEEL, origin: "mine" }] } });
  const sum = summaryOf(t);
  assert.equal(sum.gaps.length, 1);
  assert.equal(sum.phrases.length, 1);
  assert.equal(sum.phrases[0].origin, "mine");
  assert.equal(sum.phrases[0].times, 2);
});

test("a sample sent as it is counts as borrowed; changed content does not", () => {
  const samples = ["I'd rather stay in today."];
  assert.ok(sentAsSample("I'd rather stay in today", samples));
  assert.ok(!sentAsSample("I'd rather go to the library today.", samples));
});

test("two devices' records merge without losing turns, events or deletions", () => {
  const a0 = putThread(emptyState(), thread("t1"));
  const a = putThread(a0, withTurn(thread("t1"), said("x", [{ ...FEEL, origin: "ai" }]), T0 + 1));
  let b = putThread(emptyState(), withTurn(thread("t1"), said("y", [], undefined, T0 + 5), T0 + 5));
  b = putThread(b, thread("t2"));
  b = recordLooked(b, "id-rather", { kind: "meet", id: "plan-lunch" }, undefined, T0);
  let merged = mergeStates(a, b);
  assert.equal(merged.threads.length, 2);
  assert.deepEqual(
    merged.threads.find((t) => t.id === "t1").turns.map((t) => t.id),
    ["x", "y"],
  );
  assert.ok(merged.exprs["id-rather"]);
  // Deleted on one device: gone after merging, even though the other still has it.
  merged = mergeStates(removeThread(merged, "t2", T0 + 9), b);
  assert.equal(merged.threads.length, 1);
});
