import type { ReactNode } from "react";

export type HighlightKind = "mark" | "again" | "ins" | "del";
export type Highlight = { start: number; end: number; kind: HighlightKind; expr?: string };

const CLASS: Record<HighlightKind, string> = { mark: "hl-mark", again: "hl-again", ins: "hl-ins", del: "hl-del" };

/**
 * A sentence with expressions lit (in the again violet when the learner has noticed one before), and a correction's
 * changes: removed words struck through, added ones underlined. Ranges are UTF-16 offsets into `text` and may overlap.
 * With `onExpr`, a lit expression can be pressed to open it.
 */
export function Marked({
  text,
  highlights = [],
  onExpr,
}: {
  text: string;
  highlights?: Highlight[];
  onExpr?: (expr: string) => void;
}) {
  const valid = highlights.filter((h) => h.start >= 0 && h.end <= text.length && h.start < h.end);
  const cuts = new Set([0, text.length]);
  for (const h of valid) {
    cuts.add(h.start);
    cuts.add(h.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const out: ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const piece = text.slice(start, end);
    const here = valid.filter((h) => h.start <= start && h.end >= end);
    const classes = [...new Set(here.map((h) => CLASS[h.kind]))].join(" ");
    const expr = here.find((h) => h.expr)?.expr;
    if (!classes) out.push(<span key={start}>{piece}</span>);
    else if (expr && onExpr)
      // A span, not a <button>: a lit expression that runs onto the next line has to wrap like the words around it.
      out.push(
        <span
          key={start}
          role="button"
          tabIndex={0}
          className={`${classes} hl-button`}
          onClick={() => onExpr(expr)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onExpr(expr);
            }
          }}
        >
          {piece}
        </span>,
      );
    else if (here.some((h) => h.kind === "del")) out.push(<del key={start} className={classes}>{piece}</del>);
    else if (here.some((h) => h.kind === "ins")) out.push(<ins key={start} className={classes}>{piece}</ins>);
    else out.push(<span key={start} className={classes}>{piece}</span>);
  }
  return <>{out}</>;
}
