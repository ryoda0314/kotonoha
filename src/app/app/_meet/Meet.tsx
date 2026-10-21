"use client";

import { useEffect, useRef, useState } from "react";
import { DIALOGUES, dialogueById, exprById, markRange, PARTNERS, THEMES, type Dialogue, type ThemeId } from "@/content/index.ts";
import { playInTurn, stop, unlock } from "@/components/audio";
import { Icon } from "@/components/Icon";
import { Marked, type Highlight } from "@/components/Marked";
import { Sheet } from "@/components/Sheet";
import { Speak } from "@/components/Speak";
import { prefNow, usePref } from "@/components/local";
import { ja } from "@/lib/i18n/ja";
import { noticed, pickNext, recordVisit, setCurrent, shownAt, type State } from "@/lib/record";
import { commit, useRecord } from "@/lib/store";
import { useOpenExpr } from "../_parts/ExprHost";
import page from "../_parts/page.module.css";
import styles from "./meet.module.css";

const t = ja.meet;

/** 出会う: a short conversation falls in, line by line, with its voices; its expressions can be picked up after. */
export function Meet() {
  const state = useRecord();
  const current = state?.current.meet;

  // The first time (or after the last one was finished and left), the next conversation is chosen and kept.
  useEffect(() => {
    if (state && (!current || !dialogueById(current))) commit((s) => setCurrent(s, { meet: pickNext(s, "meet") }));
  }, [state, current]);

  const dialogue = current ? dialogueById(current) : undefined;
  return (
    <div className={page.page}>
      <header className={page.bar}>
        <h1 className={page.barTitle}>{t.title}</h1>
      </header>
      {state && dialogue ? <DialogueView key={dialogue.id} dialogue={dialogue} state={state} /> : <p className={page.skeleton}>{ja.common.loading}</p>}
    </div>
  );
}

const seen = (state: State, id: string) => state.visits.some((v) => v.kind === "meet" && v.id === id);

function DialogueView({ dialogue, state }: { dialogue: Dialogue; state: State }) {
  const open = useOpenExpr();
  const [translations] = usePref("translation", false);
  const [before] = useState(() => seen(state, dialogue.id));
  // A conversation met before is all there at once; a new one falls in as it is played.
  const [shown, setShown] = useState(before ? dialogue.lines.length : 0);
  const [playing, setPlaying] = useState(false);
  const [lineJa, setLineJa] = useState<Set<string>>(new Set());
  const [choosing, setChoosing] = useState(false);
  const done = shown >= dialogue.lines.length;
  const finished = useRef(before);

  useEffect(() => () => stop(), []);

  // Once all of it has fallen, it counts as met (its expressions too).
  useEffect(() => {
    if (done && !finished.current) {
      finished.current = true;
      commit((s) => recordVisit(s, "meet", dialogue.id));
    }
  }, [done, dialogue.id]);

  async function run() {
    unlock();
    setPlaying(true);
    const items = dialogue.lines.map((l) => ({ sound: { line: l.id }, text: l.text }));
    if (prefNow("sound", true)) {
      await playInTurn(items, (i) => setShown((n) => Math.max(n, i + 1)));
    } else {
      // Without sound the lines still fall, at a reading pace.
      for (let i = shown; i < dialogue.lines.length; i++) {
        setShown(i + 1);
        await new Promise((r) => setTimeout(r, 900 + dialogue.lines[i].text.length * 45));
      }
    }
    setShown(dialogue.lines.length);
    setPlaying(false);
  }

  const next = () => {
    stop();
    commit((s) => setCurrent(s, { meet: pickNext(s, "meet", Date.now(), dialogue.id) }));
  };

  const exprs = [...new Set(dialogue.lines.flatMap((l) => (l.marks ?? []).map((m) => m.expr)))];
  // Violet for what the learner had noticed before this conversation, not for what they open in it now.
  const since = shownAt(state, "meet", dialogue.id);
  const lineOf = (expr: string) => dialogue.lines.find((l) => l.marks?.some((m) => m.expr === expr))!;
  const from = { kind: "meet" as const, id: dialogue.id, title: dialogue.title };

  return (
    <>
      <section className={styles.head}>
        <p className={styles.theme}>{THEMES[dialogue.theme]}</p>
        <h2 className={styles.title}>{dialogue.title}</h2>
        <p className={styles.lead}>{dialogue.lead}</p>
        <div className={styles.controls}>
          <button type="button" className="btn" onClick={() => (playing ? stop() : void run())} disabled={playing && !prefNow("sound", true)}>
            <Icon name={done ? "replay" : "speaker"} size={20} />
            {done ? t.replay : t.playAll}
          </button>
        </div>
        {shown === 0 ? <p className={styles.hint}>{t.lead}</p> : null}
      </section>

      <ol className={styles.lines}>
        {dialogue.lines.slice(0, shown).map((line) => {
          const marks: Highlight[] = done
            ? (line.marks ?? []).flatMap((m) => {
                const r = markRange(line, m);
                return r ? [{ ...r, expr: m.expr, kind: noticed(state, m.expr, since) ? ("again" as const) : ("mark" as const) }] : [];
              })
            : [];
          const showJa = translations || lineJa.has(line.id);
          return (
            <li key={line.id} className={styles.line}>
              <p className={styles.who}>{PARTNERS[line.who as keyof typeof PARTNERS]?.name}</p>
              <div className={styles.lineRow}>
                <p className={`${styles.text} t-en`}>
                  <Marked
                    text={line.text}
                    highlights={marks}
                    onExpr={(expr) => {
                      const m = line.marks?.find((x) => x.expr === expr);
                      open({ key: expr, from, partner: line.who as keyof typeof PARTNERS, text: line.text, range: m ? markRange(line, m) : null });
                    }}
                  />
                </p>
                <Speak sound={{ line: line.id }} text={line.text} label={ja.common.play} size="sm" />
              </div>
              {showJa ? (
                <p className={styles.ja}>{line.ja}</p>
              ) : (
                <button type="button" className={styles.reveal} onClick={() => setLineJa(new Set(lineJa).add(line.id))}>
                  {ja.common.translation}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {done ? (
        <>
          <section className={page.section}>
            <h3 className={page.h2}>{t.exprs}</h3>
            <p className={page.note}>{t.exprsNote}</p>
            <div className={styles.chips}>
              {exprs.map((id) => {
                const e = exprById(id)!;
                const line = lineOf(id);
                const m = line.marks!.find((x) => x.expr === id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    className={noticed(state, id, since) ? `${styles.chip} ${styles.again}` : styles.chip}
                    onClick={() => open({ key: id, from, partner: line.who as keyof typeof PARTNERS, text: line.text, range: markRange(line, m) })}
                  >
                    <span className="t-en">{e.form}</span>
                    <span className={styles.chipLabel}>{e.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <div className={page.actions}>
            <button type="button" className="btn" onClick={next}>
              {t.next}
              <Icon name="arrow" size={18} />
            </button>
            <button type="button" className="btn-quiet" onClick={() => setChoosing(true)}>
              {t.choose}
            </button>
          </div>
        </>
      ) : null}

      <Sheet open={choosing} onClose={() => setChoosing(false)} closeLabel={ja.common.close} title={<p className={styles.sheetTitle}>{t.chooseTitle}</p>}>
        {(Object.keys(THEMES) as ThemeId[]).map((theme) => (
          <section key={theme} className={styles.pick}>
            <h3 className="label">{THEMES[theme]}</h3>
            <ul className={page.rows}>
              {DIALOGUES.filter((d) => d.theme === theme).map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className={page.row}
                    onClick={() => {
                      stop();
                      setChoosing(false);
                      commit((s) => setCurrent(s, { meet: d.id }));
                    }}
                  >
                    <span className={page.rowMain}>
                      <span className={page.rowTitle}>{d.title}</span>
                      <span className={page.rowSub}>{d.lead}</span>
                    </span>
                    {seen(state, d.id) ? <span className={page.met}>{t.met}</span> : null}
                    <Icon name="arrow" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Sheet>
    </>
  );
}
