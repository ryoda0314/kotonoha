"use client";

import { exprById } from "@/content/index.ts";
import { Sheet } from "@/components/Sheet";
import { ja } from "@/lib/i18n/ja";
import { summaryOf, type Thread } from "@/lib/record";
import { useOpenExpr } from "./ExprHost";
import styles from "./summary.module.css";

const t = ja.summary;

/**
 * まとめ at a break in a conversation: where English did not come out this time (and what was said for it), and the
 * phrases to meet again, each marked as the learner's own or brought in by the AI.
 */
export function Summary({ thread, open, onClose }: { thread: Thread; open: boolean; onClose: () => void }) {
  const openExpr = useOpenExpr();
  const { gaps, phrases } = summaryOf(thread);
  const corrected = thread.turns.some((x) => x.role === "me" && x.result);
  return (
    <Sheet open={open} onClose={onClose} closeLabel={ja.common.close} title={<p className={styles.title}>{t.title}</p>}>
      <p className={styles.lead}>{t.lead}</p>
      {!corrected ? (
        <p className={styles.empty}>{t.empty}</p>
      ) : (
        <>
          <section className={styles.section}>
            <h3 className="label">{ja.turn.gaps}</h3>
            {gaps.length ? (
              <table className={styles.table}>
                <tbody>
                  {gaps.map((g) => (
                    <tr key={g.ja}>
                      <td className="t-ja">{g.ja}</td>
                      <td className="t-en">{g.en}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.empty}>{t.gapsEmpty}</p>
            )}
          </section>
          <section className={styles.section}>
            <h3 className="label">{ja.turn.phrases}</h3>
            {phrases.length ? (
              <ul className={styles.list}>
                {phrases.map((p) => (
                  <li key={p.key}>
                    <button
                      type="button"
                      className={styles.phrase}
                      onClick={() => {
                        onClose();
                        openExpr({ key: p.key, from: { kind: "thread", id: thread.id, title: thread.title }, partner: thread.partner, text: p.text, range: { start: 0, end: p.text.length } });
                      }}
                    >
                      <span className={styles.text}>
                        <span className="t-en">{exprById(p.key)?.form ?? p.form}</span>
                        <span className={styles.label}>{p.label}</span>
                      </span>
                      <span className={p.origin === "mine" ? `${styles.tag} ${styles.mine}` : styles.tag}>{ja.turn.origin[p.origin]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>{t.phrasesEmpty}</p>
            )}
          </section>
        </>
      )}
    </Sheet>
  );
}
