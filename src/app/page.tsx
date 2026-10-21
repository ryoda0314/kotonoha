import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Marked } from "@/components/Marked";
import { diffRanges } from "@/lib/diff";
import { ja } from "@/lib/i18n/ja";
import styles from "./page.module.css";

const t = ja.intro;

export default function Home() {
  const { removed, added } = diffRanges(t.sample.input, t.sample.fixed, "en");
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo size="lg" href={null} />
      </header>
      <section className={styles.hero}>
        <h1 className={styles.lead}>{t.lead}</h1>
        <figure className={styles.figure}>
          <p className={styles.tag}>{t.sampleLabel.input}</p>
          <p className={`${styles.before} t-en`}>
            <Marked text={t.sample.input} highlights={removed.map((r) => ({ ...r, kind: "del" as const }))} />
          </p>
          <p className={styles.tag}>{t.sampleLabel.fixed}</p>
          <p className={`${styles.after} t-en`}>
            <Marked text={t.sample.fixed} highlights={added.map((r) => ({ ...r, kind: "ins" as const }))} />
          </p>
        </figure>
        {t.body.map((p) => (
          <p key={p} className={styles.body}>
            {p}
          </p>
        ))}
        <Link href="/app" className={`btn ${styles.start}`}>
          {t.start}
        </Link>
        <p className={styles.note}>{t.note}</p>
        <Link href="/login?next=/app" className={styles.link}>
          {t.link}
        </Link>
      </section>
    </div>
  );
}
