"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  alternativesOf,
  exampleLines,
  exprById,
  GROUPS,
  PARTNERS,
  placesOf,
  type Expr,
  type PartnerId,
} from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { Marked } from "@/components/Marked";
import { Sheet } from "@/components/Sheet";
import { Speak } from "@/components/Speak";
import { ja } from "@/lib/i18n/ja";
import { recordLooked, setCurrent, type EventKind, type Origin, type State } from "@/lib/record";
import { commit, useRecord } from "@/lib/store";
import { loadUses, send, startThread, useWaiting } from "@/lib/talk";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
import styles from "./expr.module.css";

/** An expression to open: where the learner met it, and who would answer when they try it. */
export type ExprTarget = {
  key: string;
  from: Origin;
  partner: PartnerId;
  /** The sentence it was met in, to show it there. */
  text?: string;
  range?: { start: number; end: number } | null;
};

const Open = createContext<(t: ExprTarget) => void>(() => undefined);

/** Opens an expression (a prepared one, or a phrase the AI found) over whatever screen the learner is on. */
export function useOpenExpr() {
  return useContext(Open);
}

const SIDE_RESUME_MS = 6 * 3_600_000;

/** The side conversation already started with this expression from this place, if it is recent. */
function sideThread(state: State, key: string, from: Origin) {
  return state.threads.find(
    (t) => t.kind === "side" && t.ref === key && t.from?.id === from.id && Date.now() - t.updatedAt < SIDE_RESUME_MS,
  );
}

/** One layer of the sheet: an expression open, and whether the learner is trying it (これで言ってみる). */
type Layer = { target: ExprTarget; trying: boolean };

/** Opening an expression is noticing it: kept, so it can come back. Going back to one is not opening it again. */
function notice(t: ExprTarget) {
  commit((s) => recordLooked(s, t.key, { kind: t.from.kind, id: t.from.id }, s.exprs[t.key]));
}

/** What an expression is called: a prepared one's form, or what the AI said for a phrase it found. */
function formOf(key: string, state: State | null): string {
  return exprById(key)?.form ?? state?.exprs[key]?.form ?? key.replace(/^p:/, "");
}

export function ExprHost({ children }: { children: ReactNode }) {
  // The sheet keeps what was open under what is open now (a phrase opened from a side conversation, another way of
  // saying): closing takes off the top only, so the learner is back where they were in the one underneath (its side
  // conversation, the sentence half written), and from the last one back on the screen itself.
  const [layers, setLayers] = useState<Layer[]>([]);
  const open = useCallback((t: ExprTarget, trying = false) => {
    notice(t);
    setLayers((ls) => [...ls, { target: t, trying }]);
  }, []);
  const back = useCallback(() => setLayers((ls) => ls.slice(0, -1)), []);
  const closeAll = useCallback(() => setLayers([]), []);
  const tryTop = useCallback(() => setLayers((ls) => (ls.length ? [...ls.slice(0, -1), { ...ls[ls.length - 1], trying: true }] : ls)), []);

  const state = useRecord();
  const top = layers.at(-1);
  const under = layers.at(-2);
  const expr = top ? exprById(top.target.key) : undefined;
  const log = top && state ? state.exprs[top.target.key] : undefined;
  const form = top ? formOf(top.target.key, state) : "";
  const label = expr?.label ?? log?.label ?? "";
  const backTo = under ? formOf(under.target.key, state) : null;
  // Each layer is its own panel (its own sentence being written), not the one before with another expression.
  const layerKey = top ? `${layers.length}:${top.target.key}:${top.target.from.id}` : "";

  return (
    <Open.Provider value={open}>
      {children}
      <Sheet
        open={Boolean(top)}
        onClose={back}
        closeLabel={backTo ? ja.expr.backTo(backTo) : ja.common.close}
        title={
          <>
            {backTo ? (
              <button type="button" className={styles.back} onClick={back} aria-label={ja.expr.backTo(backTo)}>
                <Icon name="back" size={16} />
                <span className="t-en">{backTo}</span>
              </button>
            ) : null}
            {top?.trying ? <p className={styles.kicker}>{ja.try.title}</p> : null}
            <p className={`${styles.form} t-en`}>{form}</p>
            {label ? <p className={styles.label}>{label}</p> : null}
          </>
        }
      >
        {top && state ? (
          top.trying ? (
            <TryPanel
              key={layerKey}
              target={top.target}
              state={state}
              backTo={backTo}
              onSwitch={(key) => open({ ...top.target, key, text: undefined, range: null }, true)}
              onDone={back}
            />
          ) : expr ? (
            <ExprPanel
              key={layerKey}
              expr={expr}
              target={top.target}
              state={state}
              onOpen={(key) => open({ ...top.target, key, text: undefined, range: null })}
              onTry={tryTop}
              onLeave={closeAll}
            />
          ) : (
            <PhrasePanel key={layerKey} target={top.target} state={state} onTry={tryTop} />
          )
        ) : null}
      </Sheet>
    </Open.Provider>
  );
}

function Here({ target }: { target: ExprTarget }) {
  if (!target.text) return null;
  return (
    <section className={styles.section}>
      <h3 className="label">{ja.expr.here}</h3>
      <p className={`${styles.here} t-en`}>
        <Marked text={target.text} highlights={target.range ? [{ ...target.range, kind: "mark" }] : []} />
      </p>
    </section>
  );
}

function History({ state, keyName }: { state: State; keyName: string }) {
  const events = state.exprs[keyName]?.events ?? [];
  const counts = new Map<EventKind, number>();
  for (const e of events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  const order: EventKind[] = ["met", "looked", "ai", "borrowed", "remade", "own"];
  const shown = order.filter((k) => counts.get(k));
  if (!shown.length) return null;
  return (
    <section className={styles.section}>
      <h3 className="label">{ja.expr.history}</h3>
      <p className={styles.history}>
        {shown.map((k) => (
          <span key={k} className={k === "own" ? `${styles.count} ${styles.own}` : styles.count}>
            {ja.me.kinds[k]} {counts.get(k)}
          </span>
        ))}
      </p>
    </section>
  );
}

function ExprPanel({
  expr,
  target,
  state,
  onOpen,
  onTry,
  onLeave,
}: {
  expr: Expr;
  target: ExprTarget;
  state: State;
  onOpen: (key: string) => void;
  onTry: () => void;
  onLeave: () => void;
}) {
  const router = useRouter();
  const others = alternativesOf(expr.id);
  const shared = others.length ? expr.groups.find((g) => others[0].groups.includes(g)) : undefined;
  const places = placesOf(expr.id).filter((p) => p.id !== target.from.id);

  const go = (p: { kind: "meet" | "scene"; id: string }) => {
    commit((s) => setCurrent(s, p.kind === "meet" ? { meet: p.id } : { scene: p.id, sceneThread: undefined }));
    onLeave();
    router.push(p.kind === "meet" ? "/app" : "/app/scene");
  };

  return (
    <>
      <section className={styles.section}>
        <h3 className="label">{ja.expr.does}</h3>
        <p className={styles.does}>{expr.does}</p>
      </section>
      <Here target={target} />

      {others.length ? (
        <section className={styles.section}>
          <h3 className="label">{ja.expr.others}</h3>
          {shared ? <p className={styles.note}>{ja.expr.othersNote(GROUPS[shared])}</p> : null}
          <ul className={styles.list}>
            {others.map((o) => {
              const line = exampleLines(o)[0];
              return (
                <li key={o.id} className={styles.other}>
                  <button type="button" className={styles.otherHead} onClick={() => onOpen(o.id)}>
                    <span className="t-en">{o.form}</span>
                    <span className={styles.otherDoes}>{o.label}</span>
                    <Icon name="arrow" size={16} />
                  </button>
                  <div className={styles.example}>
                    <p className="t-en">{line.text}</p>
                    <Speak sound={{ line: line.id }} text={line.text} label={ja.common.play} size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className={styles.section}>
        <h3 className="label">{ja.expr.uses}</h3>
        <ul className={styles.list}>
          {exampleLines(expr).map((line, i) => (
            <li key={line.id} className={styles.use}>
              <div className={styles.example}>
                <div>
                  <p className="t-en">{line.text}</p>
                  <p className={styles.ja}>{line.ja}</p>
                </div>
                <Speak sound={{ line: line.id }} text={line.text} label={ja.common.play} size="sm" />
              </div>
              <p className={styles.shift}>{expr.examples[i].note}</p>
            </li>
          ))}
        </ul>
      </section>

      {places.length ? (
        <section className={styles.section}>
          <h3 className="label">{ja.expr.places}</h3>
          <ul className={styles.places}>
            {places.map((p) => (
              <li key={`${p.kind}:${p.id}`}>
                <button type="button" className={styles.place} onClick={() => go(p)}>
                  <span className={styles.placeKind}>{p.kind === "meet" ? ja.nav.meet : ja.nav.scene}</span>
                  <span className={styles.placeTitle}>{p.title}</span>
                  <Icon name="arrow" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <History state={state} keyName={expr.id} />

      <div className={styles.foot}>
        <button type="button" className="btn" onClick={onTry}>
          {ja.expr.try}
        </button>
      </div>
    </>
  );
}

function PhrasePanel({ target, state, onTry }: { target: ExprTarget; state: State; onTry: () => void }) {
  const log = state.exprs[target.key];
  const uses = state.uses[target.key];
  const [failed, setFailed] = useState<string | null>(null);
  const asked = useRef<string | null>(null);
  const voice = PARTNERS[target.partner].voice;
  const text = target.text && target.range ? target.text.slice(target.range.start, target.range.end) : (log?.form ?? "");

  // 別の場面で for a phrase is made once, the first time it is opened.
  useEffect(() => {
    if (uses || !log || asked.current === target.key) return;
    asked.current = target.key;
    void loadUses(target.key, { text, form: log.form, label: log.label }).then((ok) => {
      if (!ok) setFailed(target.key);
    });
  }, [uses, log, target.key, text]);

  return (
    <>
      <Here target={target} />
      <section className={styles.section}>
        <h3 className="label">{ja.expr.uses}</h3>
        {uses ? (
          <ul className={styles.list}>
            {uses.map((u) => (
              <li key={u.text} className={styles.use}>
                <div className={styles.example}>
                  <div>
                    <p className="t-en">{u.text}</p>
                    <p className={styles.ja}>{u.ja}</p>
                  </div>
                  <Speak sound={{ sig: u.sig, voice }} text={u.text} label={ja.common.play} size="sm" />
                </div>
                <p className={styles.shift}>{u.note}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>{failed === target.key ? ja.expr.usesFailed : ja.expr.usesLoading}</p>
        )}
      </section>
      <History state={state} keyName={target.key} />
      <div className={styles.foot}>
        <button type="button" className="btn" onClick={onTry}>
          {ja.expr.try}
        </button>
      </div>
    </>
  );
}

/**
 * これで言ってみる: a sentence of the learner's own with the expression, corrected, and the partner answering its
 * content. A side conversation (寄り道), kept apart from the one underneath, which stays as it was.
 */
function TryPanel({
  target,
  state,
  backTo,
  onSwitch,
  onDone,
}: {
  target: ExprTarget;
  state: State;
  /** The expression open underneath, which 元に戻る goes back to (null: back to the screen itself). */
  backTo: string | null;
  onSwitch: (key: string) => void;
  onDone: () => void;
}) {
  const expr = exprById(target.key);
  const log = state.exprs[target.key];
  // The side conversation with this expression from this place (a new one starts with the first sentence; switching
  // to another way of saying has its own).
  const thread = sideThread(state, target.key, target.from);
  const busy = useWaiting(thread?.id ?? null);
  const alternatives = useMemo(() => (expr ? alternativesOf(expr.id) : []), [expr]);
  const partner = PARTNERS[target.partner];
  const form = expr?.form ?? log?.form ?? "";

  async function onSend(text: string, spoken: boolean) {
    const id = thread?.id ?? startThread({ kind: "side", ref: target.key, partner: target.partner, title: form, from: target.from }).id;
    return send(id, text, { spoken, support: { key: target.key, form } });
  }

  return (
    <>
      {alternatives.length ? (
        <section className={styles.section}>
          <h3 className="label">{ja.try.switch}</h3>
          <div className={styles.chips}>
            {alternatives.map((a) => (
              <button key={a.id} type="button" className={`${styles.chip} t-en`} onClick={() => onSwitch(a.id)}>
                {a.form}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <p className={styles.lead}>
        {ja.try.lead}
        <span className={styles.who}>{ja.try.with(partner.kana)}</span>
      </p>
      {thread && thread.turns.length ? <Conversation thread={thread} compact /> : null}
      <Composer draftKey={`side:${target.key}:${target.from.id}`} onSend={onSend} busy={busy} inSheet />
      <div className={styles.footQuiet}>
        <button type="button" className="btn-quiet" onClick={onDone}>
          {backTo ? ja.expr.backTo(backTo) : ja.try.done}
        </button>
      </div>
    </>
  );
}
