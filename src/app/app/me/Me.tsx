"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { dialogueById, exprById, PARTNERS, sceneById, type PartnerId } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { useChoice } from "@/components/local";
import { ja } from "@/lib/i18n/ja";
import { dayOf, gapsOf, grown, type EventKind, type ExprLog, type State, type Where } from "@/lib/record";
import { useRecord } from "@/lib/store";
import { account, type Account } from "@/lib/sync";
import { useOpenExpr } from "../_parts/ExprHost";
import page from "../_parts/page.module.css";
import styles from "./me.module.css";

const t = ja.me;

const never = () => () => undefined;
/** Today in Japan, read on the device (empty on the server). */
function useToday(): string {
  return useSyncExternalStore(never, () => dayOf(Date.now()), () => "");
}
const VIEWS = ["exprs", "gaps", "threads", "days"] as const;
type View = (typeof VIEWS)[number];

/** A day as the learner would say it: 10月21日（火）. */
export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" }).format(
    new Date(`${day}T12:00:00+09:00`),
  );
}

const yesterdayOf = (today: string) => dayOf(Date.parse(`${today}T12:00:00+09:00`) - 86_400_000);

/** A day in a list: 今日 and きのう by name, any other by its date. */
function dayWord(day: string, today: string): string {
  if (today && day === today) return t.today;
  if (today && day === yesterdayOf(today)) return t.yesterday;
  return dayLabel(day);
}

/** What a place in the record is called. */
export function whereTitle(state: State, where: Where): string {
  if (where.kind === "meet") return dialogueById(where.id)?.title ?? "";
  if (where.kind === "scene") return sceneById(where.id)?.title ?? "";
  return state.threads.find((x) => x.id === where.id)?.title ?? "";
}

/** 自分: looking back. Concrete things done, never a score, never compared with anyone. */
export function Me() {
  const state = useRecord();
  const [view, setView] = useChoice<View>("me-view", VIEWS, "exprs");
  const [me, setMe] = useState<Account | null | undefined>(undefined);
  useEffect(() => {
    void account().then(setMe);
  }, []);
  const today = useToday();

  if (!state) {
    return (
      <div className={page.page}>
        <header className={page.bar}>
          <h1 className={page.barTitle}>{t.title}</h1>
        </header>
        <p className={page.skeleton}>{ja.common.loading}</p>
      </div>
    );
  }

  const done = grown(state);
  const said = state.threads.flatMap((x) => x.turns).filter((x) => x.role === "me" && x.result).length;
  const own = Object.values(state.exprs).filter((l) => l.events.some((e) => e.kind === "own")).length;
  const stats = [
    { label: t.stats.meets, value: new Set(state.visits.filter((v) => v.kind === "meet").map((v) => v.id)).size },
    { label: t.stats.threads, value: state.threads.length },
    { label: t.stats.said, value: said },
    { label: t.stats.own, value: own },
  ];

  return (
    <div className={page.page}>
      <header className={page.bar}>
        <h1 className={page.barTitle}>{t.title}</h1>
      </header>
      <p className={page.lead}>{t.lead}</p>

      <section className={page.section}>
        <h2 className={page.h2}>
          <Icon name="leaf" size={16} /> {t.grown}
        </h2>
        <p className={page.note}>{t.grownLead}</p>
        {done.length ? (
          <ul className={styles.grown}>
            {done.slice(0, 12).map((g) => (
              <li key={`${g.key}:${g.at}`}>
                <p className={styles.grownHead}>
                  <span className="t-en">{exprById(g.key)?.form ?? g.form}</span>
                  <span className={styles.grownLabel}>{g.label}</span>
                </p>
                {g.text ? <p className={`${styles.grownText} t-en`}>{g.text}</p> : null}
                <p className={styles.grownMeta}>
                  {dayWord(dayOf(g.at), today)} · {t.grownItem(g.before)} → {t.kinds.own}
                  {whereTitle(state, g.where) ? ` ·「${whereTitle(state, g.where)}」` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={page.empty}>{t.grownEmpty}</p>
        )}
      </section>

      <section className={page.section}>
        <h2 className={page.h2}>{t.sofar}</h2>
        <dl className={styles.stats}>
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className={page.note}>{t.sofarNote}</p>
      </section>

      <section className={page.section}>
        <div className={styles.views} role="group" aria-label={t.viewsLabel}>
          {VIEWS.map((v) => (
            <button key={v} type="button" className={styles.view} aria-pressed={view === v} onClick={() => setView(v)}>
              {t.views[v]}
            </button>
          ))}
        </div>
        {view === "exprs" ? <ExprsView state={state} /> : view === "gaps" ? <GapsView state={state} /> : view === "threads" ? <ThreadsView state={state} /> : <DaysView state={state} />}
      </section>

      <section className={page.section}>
        <p className={page.note}>{me ? t.linkedShort(me.email ?? "") : me === null ? t.localShort : ""}</p>
        <ul className={page.rows}>
          <li>
            <Link href="/app/me/export" className={page.row}>
              <span className={page.rowMain}>
                <span className={page.rowTitle}>{t.exportLink}</span>
              </span>
              <Icon name="arrow" size={16} />
            </Link>
          </li>
          <li>
            <Link href="/app/me/settings" className={page.row}>
              <span className={page.rowMain}>
                <span className={page.rowTitle}>{t.settingsLink}</span>
              </span>
              <Icon name="arrow" size={16} />
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

const ORDER: EventKind[] = ["met", "looked", "ai", "borrowed", "remade", "own"];

function ExprsView({ state }: { state: State }) {
  const open = useOpenExpr();
  const logs = Object.values(state.exprs)
    .filter((l) => l.events.length)
    .sort((a, b) => b.events[b.events.length - 1].at - a.events[a.events.length - 1].at);
  if (!logs.length) return <p className={page.empty}>{t.exprsEmpty}</p>;

  const openLog = (log: ExprLog) => {
    const last = log.events[log.events.length - 1];
    const thread = last.where.kind === "thread" ? state.threads.find((x) => x.id === last.where.id) : undefined;
    const partner: PartnerId = thread?.partner ?? (last.where.kind === "scene" ? (sceneById(last.where.id)?.line.who as PartnerId) : "mia") ?? "mia";
    open({ key: log.key, from: { kind: last.where.kind, id: last.where.id, title: whereTitle(state, last.where) }, partner, text: last.text, range: last.text ? { start: 0, end: last.text.length } : null });
  };

  return (
    <ul className={page.rows}>
      {logs.map((log) => {
        const counts = new Map<EventKind, number>();
        for (const e of log.events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
        return (
          <li key={log.key}>
            <button type="button" className={page.row} onClick={() => openLog(log)}>
              <span className={page.rowMain}>
                <span className={`${page.rowTitle} t-en`}>{exprById(log.key)?.form ?? log.form}</span>
                <span className={page.rowSub}>{log.label}</span>
                <span className={styles.kinds}>
                  {ORDER.filter((k) => counts.get(k)).map((k) => (
                    <span key={k} className={k === "own" ? `${styles.kind} ${styles.own}` : styles.kind}>
                      {t.kinds[k]} {counts.get(k)}
                    </span>
                  ))}
                </span>
              </span>
              <Icon name="arrow" size={16} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function GapsView({ state }: { state: State }) {
  const today = useToday();
  const gaps = gapsOf(state);
  if (!gaps.length) return <p className={page.empty}>{t.gapsEmpty}</p>;
  return (
    <ul className={page.rows}>
      {gaps.map((g) => (
        <li key={`${g.thread.id}:${g.at}:${g.ja}`}>
          <Link href={`/app/me/t/${g.thread.id}`} className={page.row}>
            <span className={page.rowMain}>
              <span className={styles.gap}>
                <span className="t-ja">{g.ja}</span>
                <Icon name="arrow" size={14} />
                <span className="t-en">{g.en}</span>
              </span>
              <span className={page.rowSub}>
                {dayWord(dayOf(g.at), today)} ·「{g.thread.title}」
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ThreadsView({ state }: { state: State }) {
  const today = useToday();
  if (!state.threads.length) return <p className={page.empty}>{t.threadsEmpty}</p>;
  return (
    <ul className={page.rows}>
      {[...state.threads]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((x) => (
          <li key={x.id}>
            <Link href={`/app/me/t/${x.id}`} className={page.row}>
              <span className={page.rowMain}>
                <span className={page.rowTitle}>
                  <span className={styles.threadKind}>{t.threadKinds[x.kind]}</span>
                  {x.kind === "side" ? <span className="t-en">{x.title}</span> : x.title}
                </span>
                <span className={page.rowSub}>
                  {ja.talk.with(PARTNERS[x.partner].kana)} · {dayWord(dayOf(x.updatedAt), today)} · {ja.talk.turns(x.turns.filter((y) => y.role === "me").length)}
                </span>
              </span>
              <Icon name="arrow" size={16} />
            </Link>
          </li>
        ))}
    </ul>
  );
}

function DaysView({ state }: { state: State }) {
  const today = useToday();
  const days = new Map<string, { meets: Set<string>; scenes: Set<string>; said: number }>();
  const day = (at: number) => {
    const d = dayOf(at);
    if (!days.has(d)) days.set(d, { meets: new Set(), scenes: new Set(), said: 0 });
    return days.get(d)!;
  };
  for (const v of state.visits) {
    const title = v.kind === "meet" ? dialogueById(v.id)?.title : sceneById(v.id)?.title;
    if (title) (v.kind === "meet" ? day(v.at).meets : day(v.at).scenes).add(title);
  }
  for (const x of state.threads) for (const turn of x.turns) if (turn.role === "me" && turn.result) day(turn.at).said++;
  const list = [...days.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  if (!list.length) return <p className={page.empty}>{t.daysEmpty}</p>;
  const yesterday = yesterdayOf(today);
  return (
    <div className={styles.days}>
      {list.map(([d, v]) => (
        <section key={d} className={styles.day}>
          <h3 className={styles.dayHead}>
            {dayLabel(d)}
            {d === today ? <span>{t.today}</span> : d === yesterday ? <span>{t.yesterday}</span> : null}
          </h3>
          <dl className={styles.dayList}>
            {v.meets.size ? (
              <div>
                <dt>{t.dayMeets}</dt>
                <dd>{[...v.meets].join(" · ")}</dd>
              </div>
            ) : null}
            {v.scenes.size ? (
              <div>
                <dt>{t.dayScenes}</dt>
                <dd>{[...v.scenes].join(" · ")}</dd>
              </div>
            ) : null}
            {v.said ? (
              <div>
                <dt>{t.daySaid}</dt>
                <dd>{v.said}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ))}
    </div>
  );
}
