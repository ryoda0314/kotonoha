"use client";

import { useEffect, useState } from "react";
import { markRange, PARTNERS, SCENES, sceneById, THEMES, type Scene, type ThemeId } from "@/content/index.ts";
import { play, stop, unlock } from "@/components/audio";
import { Icon } from "@/components/Icon";
import { Marked } from "@/components/Marked";
import { Sheet } from "@/components/Sheet";
import { Speak } from "@/components/Speak";
import { prefNow, usePref } from "@/components/local";
import { ja } from "@/lib/i18n/ja";
import { pickNext, recordMet, recordVisit, sentAsSample, setCurrent, shownAt, threadById, type State, type Thread } from "@/lib/record";
import { commit, useRecord } from "@/lib/store";
import { lineTurn, send, startThread, useWaiting } from "@/lib/talk";
import { Composer } from "../_parts/Composer";
import { Conversation, exprHighlights } from "../_parts/Conversation";
import { useOpenExpr } from "../_parts/ExprHost";
import page from "../_parts/page.module.css";
import styles from "./scene.module.css";

const t = ja.scene;

/**
 * Moves to a scene: it counts as an activity, and the expressions in the friend's line are met. From a tap, the line
 * is heard at once.
 */
function goTo(id: string, hear = false) {
  const scene = sceneById(id)!;
  const keys = (scene.line.marks ?? []).map((m) => m.expr);
  commit((s) => recordVisit(setCurrent(s, { scene: id, sceneThread: undefined }), "scene", id, Date.now(), keys));
  if (hear && prefNow("sound", true)) void play({ line: scene.line.id }, scene.line.text);
}

/** 場面で言う: a friend's line and your own circumstances; how to answer is yours to decide. */
export function ScenePage() {
  const state = useRecord();
  const current = state?.current.scene;
  useEffect(() => {
    if (state && (!current || !sceneById(current))) goTo(pickNext(state, "scene"));
  }, [state, current]);
  // Leaving the screen stops what is playing.
  useEffect(() => () => stop(), []);
  const scene = current ? sceneById(current) : undefined;
  return (
    <div className={page.page}>
      <header className={page.bar}>
        <h1 className={page.barTitle}>{t.title}</h1>
      </header>
      {state && scene ? <SceneView key={scene.id} scene={scene} state={state} /> : <p className={page.skeleton}>{ja.common.loading}</p>}
    </div>
  );
}

function SceneView({ scene, state }: { scene: Scene; state: State }) {
  const open = useOpenExpr();
  const [translations] = usePref("translation", false);
  const [showJa, setShowJa] = useState(false);
  const [samples, setSamples] = useState(false);
  const [fill, setFill] = useState<{ text: string; n: number } | null>(null);
  const [choosing, setChoosing] = useState(false);
  const thread: Thread | undefined = state.current.sceneThread ? threadById(state, state.current.sceneThread) : undefined;
  const busy = useWaiting(thread?.id ?? null);
  const partner = PARTNERS[scene.line.who as keyof typeof PARTNERS];
  const from = { kind: "scene" as const, id: scene.id, title: scene.title };

  const openSamples = () => {
    setSamples(true);
    const keys = scene.samples.flatMap((s) => (s.marks ?? []).map((m) => m.expr));
    commit((s) => recordMet(s, keys, { kind: "scene", id: scene.id }));
  };

  async function onSend(text: string, spoken: boolean) {
    let id = thread?.id;
    if (!id) {
      id = startThread({ kind: "scene", ref: scene.id, partner: partner.id, title: scene.title, first: lineTurn(scene.line) }).id;
      commit((s) => setCurrent(s, { sceneThread: id }));
    }
    // Samples opened before answering are support; a sample sent as it was is borrowing.
    const support = samples ? { samples: sentAsSample(text, scene.samples.map((s) => s.text)) ? ("borrowed" as const) : ("opened" as const) } : undefined;
    return send(id, text, { spoken, support });
  }

  const next = () => {
    unlock();
    goTo(pickNext(state, "scene", Date.now(), scene.id), true);
  };

  const lineSpans = (scene.line.marks ?? []).flatMap((m) => {
    const r = markRange(scene.line, m);
    return r ? [{ expr: m.expr, ...r }] : [];
  });

  return (
    <>
      <section className={styles.card}>
        <p className={styles.theme}>{THEMES[scene.theme]}</p>
        <h2 className={styles.title}>{scene.title}</h2>
        <p className={styles.situation}>{scene.situation}</p>
        <div className={styles.line}>
          <p className={styles.who}>{partner.name}</p>
          <div className={styles.lineRow}>
            <p className={`${styles.text} t-en`}>
              <Marked
                text={scene.line.text}
                highlights={exprHighlights(lineSpans, state, shownAt(state, "scene", scene.id))}
                onExpr={(expr) => {
                  const s = lineSpans.find((x) => x.expr === expr);
                  open({ key: expr, from, partner: partner.id, text: scene.line.text, range: s ?? null });
                }}
              />
            </p>
            <Speak sound={{ line: scene.line.id }} text={scene.line.text} label={ja.common.play} />
          </div>
          {translations || showJa ? (
            <p className={styles.ja}>{scene.line.ja}</p>
          ) : (
            <button type="button" className={styles.reveal} onClick={() => setShowJa(true)}>
              {ja.common.translation}
            </button>
          )}
        </div>
        <div className={styles.mine}>
          <p className="label">{t.mine}</p>
          <p className={styles.mineText}>{scene.mine}</p>
        </div>
      </section>

      {thread ? (
        <Conversation thread={{ ...thread, turns: thread.turns.slice(1) }} />
      ) : (
        <p className={styles.ask}>{t.ask}</p>
      )}

      {samples ? (
        <section className={styles.samples}>
          <h3 className="label">{thread ? t.otherReplies : t.samplesTitle}</h3>
          <p className={page.note}>{t.samplesNote}</p>
          <ul className={styles.sampleList}>
            {scene.samples.map((s, i) => {
              const spans = (s.marks ?? []).flatMap((m) => {
                const r = markRange(s, m);
                return r ? [{ expr: m.expr, ...r }] : [];
              });
              return (
                <li key={s.text}>
                  <p className={styles.puts}>{s.puts}</p>
                  <div className={styles.lineRow}>
                    <p className={`${styles.sampleText} t-en`}>
                      <Marked
                        text={s.text}
                        highlights={exprHighlights(spans, state, shownAt(state, "scene", scene.id))}
                        onExpr={(expr) => {
                          const r = spans.find((x) => x.expr === expr);
                          open({ key: expr, from, partner: partner.id, text: s.text, range: r ?? null });
                        }}
                      />
                    </p>
                    <Speak sound={{ line: `${scene.id}.s${i + 1}` }} text={s.text} label={ja.common.play} size="sm" />
                  </div>
                  {!thread ? (
                    <button type="button" className={styles.use} onClick={() => setFill({ text: s.text, n: (fill?.n ?? 0) + 1 })}>
                      {t.use}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className={page.actions}>
        {!samples ? (
          <button type="button" className="btn-quiet" onClick={openSamples}>
            {thread ? t.otherReplies : t.samples}
          </button>
        ) : null}
        {thread ? (
          <button type="button" className="btn-quiet" onClick={next}>
            {t.next}
            <Icon name="arrow" size={16} />
          </button>
        ) : null}
        <button type="button" className="btn-quiet" onClick={() => setChoosing(true)}>
          {t.choose}
        </button>
      </div>

      <Composer
        draftKey={thread ? `scene-thread:${thread.id}` : `scene:${scene.id}`}
        busy={busy}
        onSend={onSend}
        fill={thread ? null : fill}
      />

      <Sheet open={choosing} onClose={() => setChoosing(false)} closeLabel={ja.common.close} title={<p className={styles.sheetTitle}>{t.chooseTitle}</p>}>
        {(Object.keys(THEMES) as ThemeId[]).filter((theme) => SCENES.some((s) => s.theme === theme)).map((theme) => (
          <section key={theme} className={styles.pick}>
            <h3 className="label">{THEMES[theme]}</h3>
            <ul className={page.rows}>
              {SCENES.filter((s) => s.theme === theme).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={page.row}
                    onClick={() => {
                      unlock();
                      setChoosing(false);
                      goTo(s.id, true);
                    }}
                  >
                    <span className={page.rowMain}>
                      <span className={page.rowTitle}>{s.title}</span>
                      <span className={`${page.rowSub} t-en`}>{s.line.text}</span>
                    </span>
                    {state.threads.some((x) => x.kind === "scene" && x.ref === s.id) ? <span className={page.met}>{ja.meet.met}</span> : null}
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
