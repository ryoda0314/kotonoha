"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { exportMarkdown } from "@/lib/export";
import { ja } from "@/lib/i18n/ja";
import { dayOf } from "@/lib/record";
import { useRecord } from "@/lib/store";
import page from "../../_parts/page.module.css";
import styles from "./export.module.css";

const t = ja.export;

/** 学習の記録: the record as one text to copy into an AI of the learner's choice. Nothing is sent anywhere. */
export function ExportView() {
  const state = useRecord();
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const text = state ? exportMarkdown(state) : "";
  return (
    <div className={page.page}>
      <header className={page.bar}>
        <Link href="/app/me" className={page.iconLink} aria-label={ja.common.back}>
          <Icon name="back" size={22} />
        </Link>
        <h1 className={page.barTitle}>{t.title}</h1>
      </header>
      <p className={page.lead}>{t.lead}</p>
      <div className={page.actions} style={{ paddingTop: 16 }}>
        <button
          type="button"
          className="btn"
          disabled={!state}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied("done");
            } catch {
              setCopied("failed");
            }
          }}
        >
          <Icon name="copy" size={18} />
          {copied === "done" ? t.copied : t.copy}
        </button>
        <button
          type="button"
          className="btn-quiet"
          disabled={!state}
          onClick={() => {
            const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `kotonoha-${dayOf(Date.now())}.md`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          {t.save}
        </button>
      </div>
      {copied === "failed" ? <p className={page.note}>{t.copyFailed}</p> : null}
      <pre className={styles.text}>{text}</pre>
      <p className={page.note} style={{ padding: "12px 0 24px" }}>
        {t.note}
      </p>
    </div>
  );
}
