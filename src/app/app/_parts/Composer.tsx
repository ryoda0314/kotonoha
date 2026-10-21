"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useDraft } from "@/components/local";
import { startRecording, toWav16k, type RecordError, type Take } from "@/components/recorder";
import { ja } from "@/lib/i18n/ja";
import type { SendResult } from "@/lib/talk";
import styles from "./composer.module.css";

const t = ja.composer;

// The buttons beside the field leave the focus in it. Otherwise pressing one blurs the field first, the keyboard and
// the tab bar trade places (composer.module.css), the button moves out from under the finger, and the press is lost.
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

/**
 * Where the learner writes (or says) what they want to say, Japanese mixed in wherever English does not come out.
 * The draft is kept on the device under `draftKey`, so going to look at an expression and coming back loses nothing.
 * A spoken sentence comes back as text to check before sending.
 */
export function Composer({
  draftKey,
  onSend,
  busy,
  placeholder = t.placeholder,
  fill,
  inSheet = false,
}: {
  draftKey: string;
  onSend: (text: string, spoken: boolean) => Promise<SendResult>;
  busy: boolean;
  placeholder?: string;
  /** Text put into the field from outside (a sample the learner chose to use). */
  fill?: { text: string; n: number } | null;
  /** Inside a sheet it sits at the sheet's bottom, not above the tab bar. */
  inSheet?: boolean;
}) {
  const draft = useDraft(draftKey);
  const [spoken, setSpoken] = useState(false);
  const [error, setError] = useState("");
  const [mic, setMic] = useState<"idle" | "listening" | "hearing">("idle");
  const [level, setLevel] = useState(0);
  const take = useRef<Take | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  // A sample chosen to use goes into the field (once per choice).
  const filled = useRef(0);
  useEffect(() => {
    if (fill && fill.n !== filled.current) {
      filled.current = fill.n;
      draft.change(fill.text);
      box.current?.focus();
    }
  }, [fill, draft]);

  // The field grows with what is written, up to a few lines.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [draft.value]);

  async function submit() {
    const text = draft.value.trim();
    if (!text || busy) return;
    setError("");
    const result = await onSend(text, spoken);
    if (result.ok) {
      draft.clear();
      setSpoken(false);
    } else {
      setError(result.reason === "tooMany" ? t.tooMany : t.failed);
    }
  }

  async function listen() {
    if (mic === "listening") {
      take.current?.stop();
      return;
    }
    if (mic !== "idle") return;
    setError("");
    try {
      take.current = await startRecording(setLevel);
      setMic("listening");
      const rec = await take.current.done;
      setMic("hearing");
      setLevel(0);
      const res = await fetch("/api/hear", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: toWav16k(rec) }).catch(() => null);
      const body = res?.ok ? ((await res.json().catch(() => null)) as { text?: string } | null) : null;
      if (body?.text) {
        draft.change(draft.value.trim() ? `${draft.value.trim()} ${body.text}` : body.text);
        setSpoken(true);
      } else {
        setError(t.hearFailed);
      }
    } catch (err) {
      const reason = err as RecordError;
      setError(reason === "denied" ? t.micDenied : reason === "missing" ? t.micMissing : t.hearFailed);
    } finally {
      take.current = null;
      setMic("idle");
      setLevel(0);
    }
  }

  return (
    <div className={inSheet ? `${styles.composer} ${styles.inSheet}` : styles.composer}>
      <div className={styles.row}>
        <textarea
          ref={box}
          className={`${styles.field} t-en`}
          rows={1}
          value={draft.value}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => draft.change(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter sends; Enter alone is a new line (a phone's keyboard has no other way to make one).
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <button
          type="button"
          className={mic === "listening" ? `${styles.icon} ${styles.listening}` : styles.icon}
          onMouseDown={keepFocus}
          onClick={() => void listen()}
          aria-label={mic === "listening" ? t.stopMic : t.mic}
          disabled={busy || mic === "hearing"}
          style={mic === "listening" ? ({ "--level": level } as React.CSSProperties) : undefined}
        >
          <Icon name={mic === "listening" ? "stop" : "mic"} size={20} />
        </button>
        <button
          type="button"
          className={styles.send}
          onMouseDown={keepFocus}
          onClick={() => void submit()}
          disabled={busy || !draft.value.trim()}
          aria-label={t.send}
        >
          <Icon name="send" size={20} />
        </button>
      </div>
      {mic !== "idle" || busy || error ? (
        <p className={error ? `${styles.status} ${styles.error}` : styles.status} role={error ? "alert" : "status"}>
          {error || (mic === "listening" ? t.listening : mic === "hearing" ? t.hearing : t.sending)}
        </p>
      ) : null}
    </div>
  );
}
