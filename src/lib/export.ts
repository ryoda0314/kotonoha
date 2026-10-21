// 学習の記録: the whole record as one Markdown text the learner can paste into an AI of their choice to talk about how
// it is going. The app makes no AI call for it. Pure: tested in tests/export.test.mjs.
import { dialogueById, exprById, PARTNERS, sceneById } from "../content/index.ts";
import { dayOf, gapsOf, grown, type EventKind, type State, type Where } from "./record.ts";

const KIND: Record<EventKind, string> = {
  met: "出会った",
  looked: "開いた",
  ai: "AIが補った",
  borrowed: "見本を使った",
  remade: "支援ありで使った",
  own: "自分から使った",
};

function title(state: State, where: Where): string {
  if (where.kind === "meet") return dialogueById(where.id)?.title ?? where.id;
  if (where.kind === "scene") return sceneById(where.id)?.title ?? where.id;
  return state.threads.find((x) => x.id === where.id)?.title ?? "";
}

export function exportMarkdown(state: State, now = Date.now()): string {
  const out: string[] = [];
  out.push(`# 英語の学習の記録（ことのは、${dayOf(now)} 書き出し）`);
  out.push("");
  out.push(
    "以下は、英語を学んでいる私の記録です。日本語を混ぜて言ってみた文をAIが直したもの、そのとき日本語で補ったところ、表現ごとの記録（AIが補ったのか、見本を使ったのか、自分から使ったのか）が入っています。点数はつけずに、いまの様子を見てください。特に、前にAIが補った表現や日本語で補ったところを、あとで自分から言えているか。次に練習するとよさそうな場面を、具体的に3つ提案してください。",
  );

  const done = grown(state);
  out.push("", "## できたこと（支援のあとで、自分から使えた表現）");
  if (!done.length) out.push("まだありません。");
  for (const g of done) {
    out.push(`- ${dayOf(g.at)} ${exprById(g.key)?.form ?? g.form}（${g.label}）: ${KIND[g.before]} → 自分から使った${g.text ? `「${g.text}」` : ""}`);
  }

  out.push("", "## 表現ごとの記録");
  const logs = Object.values(state.exprs).filter((l) => l.events.length);
  if (!logs.length) out.push("まだありません。");
  for (const log of logs) {
    const counts = new Map<EventKind, number>();
    for (const e of log.events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
    const parts = (Object.keys(KIND) as EventKind[]).filter((k) => counts.get(k)).map((k) => `${KIND[k]} ${counts.get(k)}`);
    out.push(`- ${exprById(log.key)?.form ?? log.form}（${log.label}）: ${parts.join("、")}`);
  }

  const gaps = gapsOf(state);
  out.push("", "## 日本語で補ったところと、そのとき使った英語");
  if (!gaps.length) out.push("まだありません。");
  for (const g of gaps) out.push(`- ${dayOf(g.at)}「${g.ja}」→ ${g.en}（${g.thread.title}）`);

  out.push("", "## 会話");
  const threads = [...state.threads].sort((a, b) => a.startedAt - b.startedAt);
  if (!threads.length) out.push("まだありません。");
  for (const x of threads) {
    const kind = x.kind === "talk" ? "話す" : x.kind === "scene" ? "場面" : "寄り道";
    const from = x.from ? `、${title(state, { kind: x.from.kind, id: x.from.id })}から` : "";
    out.push("", `### ${dayOf(x.startedAt)} ${kind}「${x.title}」（${PARTNERS[x.partner].name}と${from}）`);
    for (const turn of x.turns) {
      if (turn.role === "them") {
        out.push(`- ${PARTNERS[turn.who].name}: ${turn.text}`);
        continue;
      }
      const support = turn.support?.samples === "borrowed" ? "（見本をそのまま）" : turn.support?.samples ? "（見本あり）" : turn.support?.key ? "（表現を指定）" : "";
      if (!turn.result) {
        out.push(`- 自分${support}: ${turn.input}`);
        continue;
      }
      out.push(
        turn.result.natural
          ? `- 自分${support}: ${turn.input}（そのままで自然）`
          : `- 自分${support}: ${turn.input} → ${turn.result.corrected}`,
      );
    }
  }
  return `${out.join("\n")}\n`;
}
