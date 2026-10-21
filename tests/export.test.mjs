import { test } from "node:test";
import assert from "node:assert/strict";
import { exportMarkdown } from "../src/lib/export.ts";
import { emptyState, putThread, recordResult, withTurn } from "../src/lib/record.ts";

const T0 = Date.UTC(2026, 9, 21, 3);
const FEEL = { text: "feel like going out", key: "feel-like", form: "feel like + 〜ing", label: "〜したい気分だと言う" };

test("the export carries what was filled in Japanese, the corrections and what came after support", () => {
  const thread = { id: "t1", kind: "talk", ref: "talk-free", partner: "nora", title: "自由に話す", startedAt: T0, updatedAt: T0, turns: [] };
  const first = {
    id: "a",
    role: "me",
    at: T0,
    input: "I 今日は出かける気分じゃない.",
    result: { corrected: "I don't feel like going out today.", natural: false, note: "", gaps: [{ ja: "今日は出かける気分じゃない", en: "don't feel like going out today" }], phrases: [{ ...FEEL, origin: "ai" }] },
  };
  const later = {
    id: "b",
    role: "me",
    at: T0 + 30 * 3_600_000,
    input: "I feel like going out tonight.",
    result: { corrected: "I feel like going out tonight.", natural: true, note: "", gaps: [], phrases: [{ ...FEEL, origin: "mine" }] },
  };
  let t = withTurn(withTurn(thread, first), later);
  let s = putThread(emptyState(), t);
  s = recordResult(s, t, first, null, T0);
  s = recordResult(s, t, later, null, T0 + 30 * 3_600_000);
  const md = exportMarkdown(s, T0 + 31 * 3_600_000);
  assert.match(md, /「今日は出かける気分じゃない」→ don't feel like going out today/);
  assert.match(md, /feel like \+ 〜ing（〜したい気分だと言う）: AIが補った → 自分から使った/);
  assert.match(md, /自分: I 今日は出かける気分じゃない\. → I don't feel like going out today\./);
  assert.match(md, /I feel like going out tonight\.（そのままで自然）/);
});

test("an empty record still makes a readable text", () => {
  const md = exportMarkdown(emptyState(), T0);
  assert.match(md, /^# 英語の学習の記録/);
  assert.match(md, /まだありません。/);
});
