"use client";

import Link from "next/link";
import { useState } from "react";
import { PARTNERS } from "@/content/index.ts";
import { Icon } from "@/components/Icon";
import { ja } from "@/lib/i18n/ja";
import { removeThread, threadById } from "@/lib/record";
import { commit, useRecord } from "@/lib/store";
import { send, useWaiting } from "@/lib/talk";
import { Composer } from "../../../_parts/Composer";
import { Conversation } from "../../../_parts/Conversation";
import page from "../../../_parts/page.module.css";
import { Summary } from "../../../_parts/Summary";

/** One conversation looked back on, and carried on if the learner wants to. */
export function ThreadLook({ id }: { id: string }) {
  const state = useRecord();
  const thread = state ? threadById(state, id) : undefined;
  const busy = useWaiting(thread?.id ?? null);
  const [summary, setSummary] = useState(false);

  return (
    <div className={page.page}>
      <header className={page.bar}>
        <Link href="/app/me" className={page.iconLink} aria-label={ja.common.back}>
          <Icon name="back" size={22} />
        </Link>
        <h1 className={page.barTitle}>
          {thread ? (thread.kind === "side" ? <span className="t-en">{thread.title}</span> : thread.title) : ja.me.title}
          {thread ? (
            <span className={page.barSub}>
              {ja.me.threadKinds[thread.kind]}
              {thread.from?.title ? `（${thread.from.title} から）` : ""} · {ja.talk.with(PARTNERS[thread.partner].kana)}
            </span>
          ) : null}
        </h1>
        {thread ? (
          <div className={page.barActions}>
            <button type="button" className={page.barButton} onClick={() => setSummary(true)}>
              {ja.talk.summary}
            </button>
          </div>
        ) : null}
      </header>
      {!state ? (
        <p className={page.skeleton}>{ja.common.loading}</p>
      ) : !thread ? (
        <p className={page.empty}>{ja.me.notFound}</p>
      ) : (
        <>
          <Conversation thread={thread} />
          <div className={page.actions}>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                if (window.confirm(ja.me.deleteConfirm)) {
                  commit((s) => removeThread(s, thread.id));
                  history.back();
                }
              }}
            >
              {ja.me.deleteThread}
            </button>
          </div>
          <Composer
            draftKey={`thread:${thread.id}`}
            busy={busy}
            onSend={(text, spoken) =>
              send(thread.id, text, { spoken, support: thread.kind === "side" ? { key: thread.ref, form: thread.title } : undefined })
            }
          />
          <Summary thread={thread} open={summary} onClose={() => setSummary(false)} />
        </>
      )}
    </div>
  );
}
