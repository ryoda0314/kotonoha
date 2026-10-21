"use client";

import { useState } from "react";
import { PARTNERS, YOU_VOICE } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { Marked, type Highlight } from "@/components/Marked";
import { replyItems } from "@/components/audio";
import { Speak } from "@/components/Speak";
import { usePref } from "@/components/local";
import { diffRanges } from "@/lib/diff";
import { ja } from "@/lib/i18n/ja";
import { noticed, type MeTurn, type Origin, type Span, type State, type ThemTurn, type Thread } from "@/lib/record";
import { useRecord } from "@/lib/store";
import { loadOthers, send, useWaiting } from "@/lib/talk";
import { useOpenExpr } from "./ExprHost";
import styles from "./conversation.module.css";

const t = ja.turn;

/** Where this conversation is, for an expression opened from it. */
function originOf(thread: Thread): Origin {
  return { kind: "thread", id: thread.id, title: thread.title };
}

/** Expressions lit in a sentence: violet when the learner had taken notice of them before `at` (when it was said). */
export function exprHighlights(spans: Span[], state: State | null, at: number): Highlight[] {
  return spans.map((s) => ({ start: s.start, end: s.end, expr: s.expr, kind: state && noticed(state, s.expr, at) ? "again" : "mark" }));
}

/** A conversation's turns: the partner's lines and the learner's sentences with their corrections. */
export function Conversation({ thread, compact = false }: { thread: Thread; compact?: boolean }) {
  const state = useRecord();
  const waiting = useWaiting(thread.id);
  return (
    <ol className={compact ? `${styles.turns} ${styles.compact}` : styles.turns}>
      {thread.turns.map((turn, i) =>
        turn.role === "them" ? (
          <ThemView key={turn.id} turn={turn} thread={thread} state={state} />
        ) : (
          <MeView key={turn.id} turn={turn} thread={thread} last={i === thread.turns.length - 1} />
        ),
      )}
      {waiting ? (
        <li className={styles.waiting} aria-live="polite">
          <span className={styles.dots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="sr-only">{ja.composer.sending}</span>
        </li>
      ) : null}
    </ol>
  );
}

function ThemView({ turn, thread, state }: { turn: ThemTurn; thread: Thread; state: State | null }) {
  const open = useOpenExpr();
  const [always] = usePref("translation", false);
  const [shown, setShown] = useState(false);
  const partner = PARTNERS[turn.who];
  const sound = turn.line ? { line: turn.line } : turn.sig ? { sig: turn.sig, voice: partner.voice } : null;
  const sequence = turn.line ? undefined : replyItems(turn, partner.voice);
  return (
    <li className={styles.them}>
      <p className={styles.who}>{partner.name}</p>
      <div className={styles.line}>
        <p className={`${styles.text} t-en`}>
          <Marked
            text={turn.text}
            highlights={exprHighlights(turn.exprs, state, turn.at)}
            onExpr={(expr) => {
              const s = turn.exprs.find((x) => x.expr === expr);
              open({ key: expr, from: originOf(thread), partner: thread.partner, text: turn.text, range: s ?? null });
            }}
          />
        </p>
        <Speak sound={sound} text={turn.text} label={ja.common.play} size="sm" sequence={sequence} />
      </div>
      {turn.ja ? (
        always || shown ? (
          <p className={styles.ja}>{turn.ja}</p>
        ) : (
          <button type="button" className={styles.reveal} onClick={() => setShown(true)}>
            {ja.common.translation}
          </button>
        )
      ) : null}
    </li>
  );
}

function SupportTags({ turn }: { turn: MeTurn }) {
  const tags: string[] = [];
  if (turn.spoken) tags.push(t.spoken);
  if (turn.support?.samples) tags.push(t.support[turn.support.samples]);
  else if (turn.support?.key) tags.push(t.support.key);
  return tags.length ? (
    <span className={styles.tags}>
      {tags.map((x) => (
        <span key={x} className={styles.tag}>
          {x}
        </span>
      ))}
    </span>
  ) : null;
}

function MeView({ turn, thread, last }: { turn: MeTurn; thread: Thread; last: boolean }) {
  const state = useRecord();
  const open = useOpenExpr();
  const waiting = useWaiting(thread.id);
  const [details, setDetails] = useState(false);
  const r = turn.result;

  if (!r) {
    return (
      <li className={styles.me}>
        <p className={styles.meHead}>
          {ja.common.you}
          <SupportTags turn={turn} />
        </p>
        <p className={`${styles.input} t-en`}>{turn.input}</p>
        {turn.ask && last ? <Ask turn={turn} thread={thread} /> : !turn.ask && !waiting ? <Unanswered turn={turn} thread={thread} /> : null}
      </li>
    );
  }

  const { removed, added } = diffRanges(turn.input, r.corrected, "en");
  const phraseMarks: Highlight[] = r.phrases.flatMap((p) => {
    const at = r.corrected.indexOf(p.text);
    return at === -1 ? [] : [{ start: at, end: at + p.text.length, expr: p.key, kind: (state && noticed(state, p.key, turn.at) ? "again" : "mark") as Highlight["kind"] }];
  });
  const openPhrase = (key: string) => {
    const p = r.phrases.find((x) => x.key === key);
    const at = p ? r.corrected.indexOf(p.text) : -1;
    open({ key, from: originOf(thread), partner: thread.partner, text: r.corrected, range: at === -1 ? null : { start: at, end: at + p!.text.length } });
  };

  return (
    <li className={styles.me}>
      <p className={styles.meHead}>
        {ja.common.you}
        <SupportTags turn={turn} />
        {r.natural ? <span className={`${styles.tag} ${styles.good}`}>{t.natural}</span> : null}
      </p>
      {r.natural ? null : (
        <p className={`${styles.input} t-en`}>
          <Marked text={turn.input} highlights={removed.map((x) => ({ ...x, kind: "del" as const }))} />
        </p>
      )}
      <div className={styles.line}>
        <p className={`${styles.fixed} t-en`}>
          <Marked text={r.corrected} highlights={[...added.map((x) => ({ ...x, kind: "ins" as const })), ...phraseMarks]} onExpr={openPhrase} />
        </p>
        <Speak sound={r.sig ? { sig: r.sig, voice: YOU_VOICE } : null} text={r.corrected} label={ja.common.play} size="sm" />
      </div>
      <button type="button" className={styles.more} onClick={() => setDetails(!details)} aria-expanded={details}>
        <span>
          {[r.gaps.length ? `${t.gapsShort} ${r.gaps.length}` : null, r.phrases.length ? `${t.phrasesShort} ${r.phrases.length}` : null].filter(Boolean).join(" · ") || t.details}
        </span>
        <Icon name={details ? "back" : "arrow"} size={14} />
      </button>
      {details ? <Details turn={turn} thread={thread} onPhrase={openPhrase} /> : null}
    </li>
  );
}

function Details({ turn, thread, onPhrase }: { turn: MeTurn; thread: Thread; onPhrase: (key: string) => void }) {
  const r = turn.result!;
  const [loading, setLoading] = useState<"idle" | "loading" | "failed">("idle");
  const open = useOpenExpr();
  return (
    <div className={styles.details}>
      {r.note ? (
        <section>
          <h4 className="label">{t.why}</h4>
          <p className={styles.note}>{r.note}</p>
        </section>
      ) : null}
      {r.gaps.length ? (
        <section>
          <h4 className="label">{t.gaps}</h4>
          <table className={styles.gaps}>
            <tbody>
              {r.gaps.map((g) => (
                <tr key={g.ja}>
                  <td className="t-ja">{g.ja}</td>
                  <td className="t-en">{g.en}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.small}>{t.gapsNote}</p>
        </section>
      ) : null}
      {r.phrases.length ? (
        <section>
          <h4 className="label">{t.phrases}</h4>
          <ul className={styles.phrases}>
            {r.phrases.map((p) => (
              <li key={p.key}>
                <button type="button" className={styles.phrase} onClick={() => onPhrase(p.key)}>
                  <span className={styles.phraseText}>
                    <span className="t-en">{p.form}</span>
                    <span className={styles.phraseLabel}>{p.label}</span>
                  </span>
                  <span className={p.origin === "mine" ? `${styles.tag} ${styles.good}` : styles.tag}>{t.origin[p.origin]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h4 className="label">{t.others}</h4>
        {turn.others ? (
          turn.others.length ? (
            <ul className={styles.others}>
              {turn.others.map((o) => (
                <li key={o.text}>
                  <div className={styles.line}>
                    <p className="t-en">
                      <Marked
                        text={o.text}
                        highlights={o.exprs.map((s) => ({ ...s, kind: "mark" as const }))}
                        onExpr={(expr) => {
                          const s = o.exprs.find((x) => x.expr === expr);
                          open({ key: expr, from: { kind: "thread", id: thread.id, title: thread.title }, partner: thread.partner, text: o.text, range: s ?? null });
                        }}
                      />
                    </p>
                    <Speak sound={{ sig: o.sig, voice: YOU_VOICE }} text={o.text} label={ja.common.play} size="sm" />
                  </div>
                  <p className={styles.small}>
                    {o.puts}
                    {o.tone ? ` · ${o.tone}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.small}>{t.othersNone}</p>
          )
        ) : (
          <button
            type="button"
            className="btn-quiet"
            disabled={loading === "loading"}
            onClick={async () => {
              setLoading("loading");
              setLoading((await loadOthers(thread.id, turn.id)) ? "idle" : "failed");
            }}
          >
            {loading === "loading" ? t.othersLoading : loading === "failed" ? t.othersFailed : t.others}
          </button>
        )}
      </section>
    </div>
  );
}

/** A sentence whose answer never came back (the page was left on the way): it can go again as it is. */
function Unanswered({ turn, thread }: { turn: MeTurn; thread: Thread }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.ask}>
      <p className={styles.small}>{failed ? ja.composer.failed : t.unanswered}</p>
      <div className={styles.askOptions}>
        <button
          type="button"
          className="btn-quiet"
          onClick={async () => {
            const res = await send(thread.id, turn.input, { support: turn.support, spoken: turn.spoken, again: turn.id });
            setFailed(!res.ok);
          }}
        >
          {t.sendAgain}
        </button>
      </div>
    </div>
  );
}

/** The AI asked what the learner meant: they choose, and the same sentence goes again with that meaning. */
function Ask({ turn, thread }: { turn: MeTurn; thread: Thread }) {
  const busy = useWaiting(thread.id);
  return (
    <div className={styles.ask}>
      <p className={styles.askQ}>{turn.ask!.question}</p>
      <div className={styles.askOptions}>
        {turn.ask!.options.map((o) => (
          <button
            key={o}
            type="button"
            className="btn-quiet"
            disabled={busy}
            onClick={() => void send(thread.id, turn.input, { support: turn.support, spoken: turn.spoken, intent: o, again: turn.id })}
          >
            {o}
          </button>
        ))}
      </div>
      <p className={styles.small}>{t.askOr}</p>
    </div>
  );
}
