"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { dialogueById, exprById, PARTNERS, sceneById, type PartnerId } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { useChoice } from "@/components/local";
import { ja } from "@/lib/i18n/ja";
import { dayOf, gapsOf, grown, type EventKind, type ExprLog, type State, type Thread, type Where } from "@/lib/record";
import { useRecord } from "@/lib/store";
import { useOpenExpr } from "../_parts/ExprHost";
import page from "../_parts/page.module.css";
import styles from "./me.module.css";

const t = ja.me;

const never = () => () => undefined;
/** Today in Japan, read on the device (empty on the server). */
function useToday(): string {
  return useSyncExternalStore(never, () => dayOf(Date.now()), () => "");
}
const VIEWS = ["grown", "exprs", "gaps", "threads", "days"] as const;
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

/** The first `n` of a list, and a button for the rest: no view runs on down the page before it is asked to. */
function useFirst<T>(items: T[], n: number): [T[], ReactNode] {
  const [all, setAll] = useState(false);
  if (all || items.length <= n) return [items, null];
  return [
    items.slice(0, n),
    <button key="more" type="button" className={styles.more} onClick={() => setAll(true)}>
      {t.more(items.length - n)}
    </button>,
  ];
}

/**
 * 自分: looking back, and only that (sound, the account and the record's file are under 設定). Its own numbers in one
 * row, then one view at a time, できたこと first. Concrete things done, never a score, never compared with anyone.
 */
export function Me() {
  const state = useRecord();
  const [view, setView] = useChoice<View>("me-view", VIEWS, "grown");

  const bar = (
    <header className={page.bar}>
      <h1 className={page.barTitle}>{t.title}</h1>
      <Link href="/app/me/settings" className={styles.settings} aria-label={ja.settings.title} title={ja.settings.title}>
        <Icon name="settings" size={22} />
      </Link>
    </header>
  );
  if (!state) {
    return (
      <div className={page.page}>
        {bar}
        <p className={page.skeleton}>{ja.common.loading}</p>
      </div>
    );
  }

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
      {bar}
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className={`${page.note} ${styles.statsNote}`}>{t.sofarNote}</p>

      <div className={styles.tabs} role="tablist" aria-label={t.viewsLabel}>
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            id={`me-tab-${v}`}
            aria-selected={view === v}
            aria-controls="me-view"
            className={view === v ? styles.tabOn : styles.tab}
            onClick={() => setView(v)}
          >
            {t.views[v]}
          </button>
        ))}
      </div>
      <div id="me-view" role="tabpanel" aria-labelledby={`me-tab-${view}`} className={styles.panel}>
        <p className={page.note}>{t.viewNotes[view]}</p>
        {view === "grown" ? (
          <GrownView state={state} />
        ) : view === "exprs" ? (
          <ExprsView state={state} />
        ) : view === "gaps" ? (
          <GapsView state={state} />
        ) : view === "threads" ? (
          <ThreadsView state={state} />
        ) : (
          <DaysView state={state} />
        )}
      </div>
    </div>
  );
}

function GrownView({ state }: { state: State }) {
  const today = useToday();
  const [shown, more] = useFirst(grown(state), 3);
  if (!shown.length) return <p className={page.empty}>{t.grownEmpty}</p>;
  return (
    <>
      <ul className={styles.grown}>
        {shown.map((g) => (
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
      {more}
    </>
  );
}

/** What the learner did with an expression, in the order it usually happens; met is left out of a row (every one was met). */
const ORDER: EventKind[] = ["looked", "ai", "borrowed", "remade", "own"];
const GROUPS = ["own", "noticed", "met"] as const;
type Group = (typeof GROUPS)[number];

/** Used on their own; taken notice of (opened, or used with help); or only met so far. */
function groupOf(log: ExprLog): Group {
  if (log.events.some((e) => e.kind === "own")) return "own";
  if (log.events.some((e) => e.kind !== "met")) return "noticed";
  return "met";
}

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
    <div className={styles.groups}>
      {GROUPS.map((group) => {
        const list = logs.filter((l) => groupOf(l) === group);
        return list.length ? <ExprGroup key={group} group={group} list={list} onOpen={openLog} /> : null;
      })}
    </div>
  );
}

function ExprGroup({ group, list, onOpen }: { group: Group; list: ExprLog[]; onOpen: (log: ExprLog) => void }) {
  const today = useToday();
  const [shown, more] = useFirst(list, group === "met" ? 6 : 4);
  const formOf = (log: ExprLog) => exprById(log.key)?.form ?? log.form;
  return (
    <section className={styles.group}>
      <h3 className={styles.groupHead}>
        {t.groups[group]}
        <span>{list.length}</span>
      </h3>
      <p className={page.note}>{t.groupNotes[group]}</p>
      {group === "met" ? (
        <div className={styles.chips}>
          {shown.map((log) => (
            <button key={log.key} type="button" className={styles.chip} onClick={() => onOpen(log)}>
              <span className="t-en">{formOf(log)}</span>
              <span className={styles.chipLabel}>{log.label}</span>
            </button>
          ))}
          {more}
        </div>
      ) : (
        <>
          <ul className={page.rows}>
            {shown.map((log) => {
              const counts = new Map<EventKind, number>();
              for (const e of log.events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
              return (
                <li key={log.key}>
                  <button type="button" className={page.row} onClick={() => onOpen(log)}>
                    <span className={page.rowMain}>
                      <span className={styles.rowHead}>
                        <span className={`${styles.form} t-en`}>{formOf(log)}</span>
                        <span className={page.rowSub}>{log.label}</span>
                      </span>
                      <span className={styles.kinds}>
                        <span>{dayWord(dayOf(log.events[log.events.length - 1].at), today)}</span>
                        {ORDER.filter((k) => counts.get(k)).map((k) => (
                          <span key={k} className={k === "own" ? styles.own : undefined}>
                            {t.kinds[k]}
                            {counts.get(k)! > 1 ? ` ${t.times(counts.get(k)!)}` : ""}
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
          {more}
        </>
      )}
    </section>
  );
}

function GapsView({ state }: { state: State }) {
  const today = useToday();
  const [gaps, more] = useFirst(gapsOf(state), 6);
  if (!gaps.length) return <p className={page.empty}>{t.gapsEmpty}</p>;
  return (
    <>
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
      {more}
    </>
  );
}

function ThreadsView({ state }: { state: State }) {
  const today = useToday();
  const [threads, more] = useFirst([...state.threads].sort((a, b) => b.updatedAt - a.updatedAt), 6);
  if (!threads.length) return <p className={page.empty}>{t.threadsEmpty}</p>;
  return (
    <>
      <ul className={page.rows}>
        {threads.map((x) => (
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
      {more}
    </>
  );
}

/** What happened on one day: conversations met, scenes shown, conversations talked in, sentences sent. */
type DayLog = { meets: Set<string>; scenes: Set<string>; threads: Map<string, Thread>; said: number };

function daysOf(state: State): Map<string, DayLog> {
  const days = new Map<string, DayLog>();
  const day = (at: number) => {
    const d = dayOf(at);
    if (!days.has(d)) days.set(d, { meets: new Set(), scenes: new Set(), threads: new Map(), said: 0 });
    return days.get(d)!;
  };
  for (const v of state.visits) {
    const title = v.kind === "meet" ? dialogueById(v.id)?.title : sceneById(v.id)?.title;
    if (title) (v.kind === "meet" ? day(v.at).meets : day(v.at).scenes).add(title);
  }
  for (const x of state.threads)
    for (const turn of x.turns)
      if (turn.role === "me" && turn.result) {
        day(turn.at).said++;
        day(turn.at).threads.set(x.id, x);
      }
  // A scene answered that day is there as the conversation it became.
  for (const log of days.values()) for (const x of log.threads.values()) if (x.kind === "scene") log.scenes.delete(x.title);
  return days;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
/** A month ("2026-10") moved by `by` months. */
function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
/** A month's weeks, Sunday first; null where a week reaches into the month before or after. */
function weeksOf(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const cells: (string | null)[] = Array(new Date(Date.UTC(y, m - 1, 1)).getUTCDay()).fill(null);
  for (let d = 1; d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

/**
 * 日ごと: a month's calendar, the days with a record dotted (only that: no count, no run of days), and the record of the
 * day picked under it; the newest day with a record at first.
 */
function DaysView({ state }: { state: State }) {
  const today = useToday();
  const days = daysOf(state);
  const recorded = [...days.keys()].sort();
  const [picked, setPicked] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  if (!recorded.length) return <p className={page.empty}>{t.daysEmpty}</p>;

  const day = picked ?? recorded[recorded.length - 1];
  const shown = month ?? day.slice(0, 7);
  const first = recorded[0].slice(0, 7);
  const last = [recorded[recorded.length - 1].slice(0, 7), today.slice(0, 7)].sort()[1];
  const [y, m] = shown.split("-").map(Number);
  const log = days.get(day);
  const yesterday = yesterdayOf(today);
  return (
    <>
      <div className={styles.calendar}>
        <div className={styles.calHead}>
          <button type="button" className={styles.calNav} disabled={shown <= first} onClick={() => setMonth(shiftMonth(shown, -1))} aria-label={t.prevMonth}>
            <Icon name="back" size={20} />
          </button>
          <p className={styles.calMonth} aria-live="polite">
            {t.monthLabel(y, m)}
          </p>
          <button
            type="button"
            className={`${styles.calNav} ${styles.calNext}`}
            disabled={shown >= last}
            onClick={() => setMonth(shiftMonth(shown, 1))}
            aria-label={t.nextMonth}
          >
            <Icon name="back" size={20} />
          </button>
        </div>
        <table className={styles.cal}>
          <thead>
            <tr>
              {WEEKDAYS.map((w) => (
                <th key={w} scope="col">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeksOf(shown).map((week, i) => (
              <tr key={i}>
                {week.map((d, j) => (
                  <td key={d ?? `-${j}`}>
                    {d === null ? null : days.has(d) ? (
                      <button
                        type="button"
                        className={d === today ? `${styles.cell} ${styles.cellToday}` : styles.cell}
                        aria-pressed={d === day}
                        aria-label={dayLabel(d)}
                        onClick={() => setPicked(d)}
                      >
                        {Number(d.slice(8))}
                        <span className={styles.dot} />
                      </button>
                    ) : (
                      <span className={d === today ? `${styles.cell} ${styles.cellQuiet} ${styles.cellToday}` : `${styles.cell} ${styles.cellQuiet}`}>
                        {Number(d.slice(8))}
                        <span className={`${styles.dot} ${styles.dotNone}`} />
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className={styles.day}>
        <h3 className={styles.dayHead}>
          {dayLabel(day)}
          {day === today ? <span>{t.today}</span> : day === yesterday ? <span>{t.yesterday}</span> : null}
        </h3>
        {log ? (
          <dl className={styles.dayList}>
            {log.meets.size ? (
              <div>
                <dt>{t.dayMeets}</dt>
                <dd>{[...log.meets].join(" · ")}</dd>
              </div>
            ) : null}
            {log.scenes.size ? (
              <div>
                <dt>{t.dayScenes}</dt>
                <dd>{[...log.scenes].join(" · ")}</dd>
              </div>
            ) : null}
            {log.threads.size ? (
              <div>
                <dt>{t.dayThreads}</dt>
                <dd className={styles.dayLinks}>
                  {[...log.threads.values()].map((x) => (
                    <Link key={x.id} href={`/app/me/t/${x.id}`}>
                      <span className={styles.threadKind}>{t.threadKinds[x.kind]}</span>
                      {x.kind === "side" ? <span className="t-en">{x.title}</span> : x.title}
                      <Icon name="arrow" size={14} />
                    </Link>
                  ))}
                </dd>
              </div>
            ) : null}
            {log.said ? (
              <div>
                <dt>{t.daySaid}</dt>
                <dd>{log.said}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className={page.note}>{t.dayNone}</p>
        )}
      </section>
    </>
  );
}
