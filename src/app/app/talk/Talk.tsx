"use client";

import { useState } from "react";
import { FRAMES, PARTNERS, type Frame } from "@/content/index.ts";
import { play, stop, unlock } from "@/components/audio";
import { Icon } from "@/components/Icon";
import { prefNow } from "@/components/local";
import { ja } from "@/lib/i18n/ja";
import { dayOf, setCurrent, threadById, type Thread } from "@/lib/record";
import { commit, useRecord } from "@/lib/store";
import { lineTurn, send, startThread, useWaiting } from "@/lib/talk";
import { Composer } from "../_parts/Composer";
import { Conversation } from "../_parts/Conversation";
import page from "../_parts/page.module.css";
import { Summary } from "../_parts/Summary";

const t = ja.talk;

/** 話す: say what you want to say to a friend who has their own plans and opinions, Japanese mixed in as needed. */
export function Talk() {
  const state = useRecord();
  const thread = state?.current.talk ? threadById(state, state.current.talk) : undefined;
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
  return thread ? <TalkView key={thread.id} thread={thread} /> : <Choose earlier={state.threads.filter((x) => x.kind === "talk").slice(0, 5)} />;
}

function begin(frame: Frame) {
  unlock();
  const thread = startThread({ kind: "talk", ref: frame.id, partner: frame.partner, title: frame.title, first: lineTurn(frame.opener) });
  commit((s) => setCurrent(s, { talk: thread.id }));
  if (prefNow("sound", true)) void play({ line: frame.opener.id }, frame.opener.text);
}

function Choose({ earlier }: { earlier: Thread[] }) {
  return (
    <div className={page.page}>
      <header className={page.bar}>
        <h1 className={page.barTitle}>{t.title}</h1>
      </header>
      <p className={page.lead}>{t.chooseLead}</p>
      <section className={page.section}>
        <ul className={`${page.cards} ${page.two}`}>
          {FRAMES.map((f) => {
            const p = PARTNERS[f.partner];
            return (
              <li key={f.id}>
                <button type="button" className={page.card} onClick={() => begin(f)}>
                  <span className={page.cardTitle}>{f.title}</span>
                  <span className={page.cardLead}>{f.lead}</span>
                  <span className={page.cardMeta}>
                    {p.kana}（{p.name}）· {p.about}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {earlier.length ? (
        <section className={page.section}>
          <h2 className={page.h2}>{t.earlier}</h2>
          <ul className={page.rows}>
            {earlier.map((x) => (
              <li key={x.id}>
                <button type="button" className={page.row} onClick={() => commit((s) => setCurrent(s, { talk: x.id }))}>
                  <span className={page.rowMain}>
                    <span className={page.rowTitle}>{x.title}</span>
                    <span className={page.rowSub}>
                      {t.with(PARTNERS[x.partner].kana)} · {dayOf(x.updatedAt)} · {t.turns(x.turns.filter((y) => y.role === "me").length)}
                    </span>
                  </span>
                  <Icon name="arrow" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TalkView({ thread }: { thread: Thread }) {
  const busy = useWaiting(thread.id);
  const [summary, setSummary] = useState(false);
  const partner = PARTNERS[thread.partner];
  return (
    <div className={page.page}>
      <header className={page.bar}>
        <h1 className={page.barTitle}>
          {thread.title}
          <span className={page.barSub}>{t.with(`${partner.kana}（${partner.name}）`)}</span>
        </h1>
        <div className={page.barActions}>
          <button type="button" className={page.barButton} onClick={() => setSummary(true)}>
            {t.summary}
          </button>
          <button
            type="button"
            className={page.barButton}
            onClick={() => {
              stop();
              commit((s) => setCurrent(s, { talk: undefined }));
            }}
          >
            {t.end}
          </button>
        </div>
      </header>
      <Conversation thread={thread} />
      <Composer draftKey={`talk:${thread.id}`} busy={busy} onSend={(text, spoken) => send(thread.id, text, { spoken })} />
      <Summary thread={thread} open={summary} onClose={() => setSummary(false)} />
    </div>
  );
}
