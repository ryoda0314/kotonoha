// The app's screens, drawn again for the film from their CSS (../src/app/app/**/*.module.css, ../src/app/globals.css).
// Sizes are the app's own pixels; a screen is shown larger with CSS zoom. Nothing moves by itself: every change is a
// function of the frame.
import type { CSSProperties, ReactNode } from "react";
import { Easing } from "remotion";
import { mixColor } from "./anim";
import { C, FONT } from "./theme";

// ---- Icons (../src/components/Icon.tsx) ---------------------------------------------------------------------------

const PATHS = {
  speaker: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </>
  ),
  send: (
    <>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  back: <path d="M15 18l-6-6 6-6" />,
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  meet: (
    <>
      <path d="M7 13.5h10a3.5 3.5 0 0 0 .2-7A5 5 0 0 0 7.7 7.6 3 3 0 0 0 7 13.5z" />
      <path d="M9 17v2.5" />
      <path d="M12 16.5v4" />
      <path d="M15 17v2.5" />
    </>
  ),
  talk: (
    <>
      <path d="M4 5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path d="M17 9h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-4-3h-3a2 2 0 0 1-2-1.5" />
    </>
  ),
  scene: (
    <>
      <path d="M3 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8l-3 2.5V12a2 2 0 0 1-2-2z" />
      <path d="M12 17h7" />
      <path d="M15 20h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
      <path d="M5 19l8-8" />
    </>
  ),
};
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, color = "currentColor", stroke = 1.8 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
      {PATHS[name]}
    </svg>
  );
}

// ---- Marked text (../src/components/Marked.tsx, globals.css .hl-*) ------------------------------------------------

export type HL = { start: number; end: number; kind: "mark" | "again" | "ins" | "del"; p?: number };

const rgba = (hex: string, a: number) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},${a})`;

/** A sentence with expressions lit and a correction's changes marked; each highlight comes in with its `p` (0 → 1). */
export function Marked({ text, hl = [], color = C.ink }: { text: string; hl?: HL[]; color?: string }) {
  const valid = hl.filter((h) => h.start >= 0 && h.end <= text.length && h.start < h.end);
  const cuts = [...new Set([0, text.length, ...valid.flatMap((h) => [h.start, h.end])])].sort((a, b) => a - b);
  const out: ReactNode[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [start, end] = [cuts[i], cuts[i + 1]];
    const here = valid.filter((h) => h.start <= start && h.end >= end);
    const style: CSSProperties = {};
    for (const h of here) {
      const p = h.p ?? 1;
      if (h.kind === "mark" || h.kind === "again") {
        const fg = h.kind === "mark" ? C.accent : C.again;
        style.background = rgba(h.kind === "mark" ? C.tint : C.againTint, p);
        style.color = mixColor(color, fg, p);
        style.borderRadius = "0.15em";
        style.padding = "0 0.1em";
        style.margin = "0 -0.1em";
        // A piece cut out of a longer highlight keeps the highlight's corners only at its ends.
        if (h.start < start) style.borderTopLeftRadius = style.borderBottomLeftRadius = 0;
        if (h.end > end) style.borderTopRightRadius = style.borderBottomRightRadius = 0;
      }
      if (h.kind === "ins") {
        style.color = style.color ?? mixColor(color, C.accent, p);
        style.fontWeight = 400 + 200 * p;
        style.textDecorationLine = "underline";
        style.textDecorationThickness = "2px";
        style.textUnderlineOffset = "0.3em";
        style.textDecorationColor = rgba(C.accent, p);
      }
      if (h.kind === "del") {
        style.color = mixColor(color, C.faint, p);
        style.textDecorationLine = "line-through";
        style.textDecorationThickness = "1.5px";
        style.textDecorationColor = rgba(C.faint, p);
      }
    }
    out.push(
      <span key={start} style={style}>
        {text.slice(start, end)}
      </span>,
    );
  }
  return <>{out}</>;
}

// ---- Small parts ----------------------------------------------------------------------------------------------------

export const label: CSSProperties = { margin: 0, fontSize: 13, fontWeight: 600, color: C.muted };

// Speak.module.css: `ripple 1.4s ease-out infinite`, from scale(1) at 0.7 to scale(1.7) at 0.
const RIPPLE = Easing.bezier(0, 0, 0.58, 1);

/** The app's speak button; while its line plays, a ring spreads from it (Speak.module.css). */
export function Speak({ size = 36, playing = 0 }: { size?: number; playing?: number }) {
  const ring = playing > 0 ? RIPPLE(((playing - 1) % 42) / 42) : -1;
  return (
    <span
      style={{
        position: "relative",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid ${playing > 0 ? C.accent : C.line2}`,
        background: C.paper,
        color: playing > 0 ? C.accent : C.ink,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name="speaker" size={size * 0.5} />
      {ring >= 0 ? (
        <span
          style={{
            position: "absolute",
            inset: -1,
            borderRadius: "50%",
            border: `1px solid ${C.accent}`,
            transform: `scale(${1 + ring * 0.7})`,
            opacity: 0.7 * (1 - ring),
          }}
        />
      ) : null}
    </span>
  );
}

export function Tag({ children, good = false }: { children: ReactNode; good?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 22,
        padding: "0 8px",
        borderRadius: 999,
        border: `1px solid ${good ? C.tint : C.line2}`,
        background: good ? C.tint : C.paper,
        fontSize: 12,
        fontWeight: 500,
        color: good ? C.accent : C.muted,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

/** Cut off above and below only, so a speak button's ripple at the right edge can spread past it. */
export const CLIP_Y: CSSProperties = { clipPath: "inset(0 -80px)" };

/** Grows from nothing to its full height as `p` goes 0 → 1 (a grid row of p fr), so what is below moves smoothly. */
export function Grow({ p, children }: { p: number; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateRows: `${Math.max(0, Math.min(1, p))}fr` }}>
      <div style={{ minHeight: 0, ...CLIP_Y }}>{children}</div>
    </div>
  );
}

/** A finger's press: a ring that closes in on the spot, then lets go. `t` is frames since the press (or < 0). */
export function Press({ t, x = "50%", y = "50%", size = 46 }: { t: number; x?: number | string; y?: number | string; size?: number }) {
  if (t < -8 || t > 16) return null;
  const inP = Math.min(1, (t + 8) / 8);
  const outP = t > 0 ? Math.min(1, t / 16) : 0;
  return (
    <span
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "50%",
        background: rgba(C.ink, 0.14 * inP * (1 - outP)),
        border: `2px solid ${rgba(C.ink, 0.32 * inP * (1 - outP))}`,
        transform: `scale(${1.25 - 0.25 * inP + 0.5 * outP})`,
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

// ---- The composer (composer.module.css) -----------------------------------------------------------------------------

export function Composer({
  text,
  composing,
  caret,
  placeholder = "言いたいことを。英語が出てこないところは日本語のままで。",
  placeholderOpacity = 1,
  sendPress = -99,
  inSheet = false,
  bare = false,
}: {
  text: string;
  composing?: [number, number];
  caret: boolean;
  placeholder?: string;
  placeholderOpacity?: number;
  sendPress?: number;
  inSheet?: boolean;
  /** Without the bar's hairline and padding, for the field on its own. */
  bare?: boolean;
}) {
  const ready = text.length > 0;
  const pieces: ReactNode[] = composing
    ? [
        text.slice(0, composing[0]),
        <span key="c" style={{ textDecoration: "underline", textDecorationThickness: "1.5px", textUnderlineOffset: "0.25em", textDecorationColor: C.muted }}>
          {text.slice(composing[0], composing[1])}
        </span>,
        text.slice(composing[1]),
      ]
    : [text];
  const pressed = sendPress >= 0 && sendPress < 6;
  return (
    <div style={bare ? undefined : { background: C.paper, borderTop: `1px solid ${C.line}`, padding: inSheet ? "10px 20px 14px" : "10px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 48,
            padding: "12px 14px",
            border: `1.5px solid ${C.ink}`,
            borderRadius: 12,
            background: C.paper,
            fontSize: 16,
            lineHeight: 1.5,
            fontFamily: FONT.ui,
            color: C.ink,
            wordBreak: "break-word",
          }}
        >
          {ready ? (
            <span>
              {pieces}
              {caret ? <Caret /> : null}
            </span>
          ) : (
            <span style={{ position: "relative" }}>
              {caret ? <Caret /> : null}
              <span style={{ color: C.faint, fontFamily: FONT.ja, fontSize: 14, opacity: placeholderOpacity }}>{placeholder}</span>
            </span>
          )}
        </div>
        <span style={{ ...round, border: `1px solid ${C.line2}`, background: C.paper, color: C.ink }}>
          <Icon name="mic" size={20} />
        </span>
        <span
          style={{
            ...round,
            position: "relative",
            border: `1px solid ${C.accent}`,
            background: C.accent,
            color: "#fff",
            opacity: ready ? 1 : 0.4,
            transform: pressed ? "scale(0.94)" : undefined,
          }}
        >
          <Icon name="send" size={20} />
          <Press t={sendPress} />
        </span>
      </div>
    </div>
  );
}

const round: CSSProperties = { flexShrink: 0, width: 48, height: 48, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" };

function Caret() {
  return <span style={{ display: "inline-block", width: 1.5, height: "1.15em", marginLeft: 1, marginRight: -2.5, verticalAlign: "-0.2em", background: C.ink }} />;
}

// ---- Conversation turns (conversation.module.css) -------------------------------------------------------------------

/** A partner's line: name, the English (with what is lit), the speak button, and 訳. */
export function Them({ who, text, hl, playing = 0, size = 18 }: { who: string; text: string; hl?: HL[]; playing?: number; size?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <p style={{ ...label, fontFamily: FONT.en }}>{who}</p>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: size, lineHeight: 1.6, fontFamily: FONT.en }}>
          <Marked text={text} hl={hl} />
        </p>
        <Speak playing={playing} />
      </div>
      <span style={{ alignSelf: "flex-start", padding: "2px 0", color: C.muted, fontSize: 13, textDecoration: "underline dotted", textUnderlineOffset: "0.3em" }}>訳</span>
    </div>
  );
}

/** The learner's sentence: what they wrote (Japanese struck through as it is replaced) and the corrected sentence. */
export function Me({
  tags = [],
  input,
  inputHl,
  fixed,
  fixedHl,
  fixedP = 1,
  more,
  morePress = -99,
  children,
}: {
  tags?: { text: string; good?: boolean }[];
  input?: string;
  inputHl?: HL[];
  fixed?: string;
  fixedHl?: HL[];
  fixedP?: number;
  more?: string;
  morePress?: number;
  children?: ReactNode;
}) {
  return (
    <div style={{ marginLeft: 24, padding: "12px 14px", borderRadius: 12, background: C.surface, display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={{ margin: 0, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 13, fontWeight: 600, color: C.muted }}>
        あなた
        {tags.map((t) => (
          <Tag key={t.text} good={t.good}>
            {t.text}
          </Tag>
        ))}
      </p>
      {input ? (
        <p style={{ margin: 0, fontSize: 15, color: C.muted, lineHeight: 1.6, fontFamily: FONT.ui }}>
          <Marked text={input} hl={inputHl} color={C.muted} />
        </p>
      ) : null}
      {fixed ? (
        <Grow p={fixedP}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, opacity: fixedP }}>
            <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 18, lineHeight: 1.6, fontFamily: FONT.en }}>
              <Marked text={fixed} hl={fixedHl} />
            </p>
            <Speak />
          </div>
          {more ? (
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, color: C.accent, fontSize: 13 }}>
              {more}
              <Icon name="arrow" size={14} />
              <Press t={morePress} x={40} />
            </span>
          ) : null}
        </Grow>
      ) : (
        <Dots />
      )}
      {children}
    </div>
  );
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 6, padding: "6px 0" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.faint, opacity: 0.6 }} />
      ))}
    </span>
  );
}

// ---- Buttons --------------------------------------------------------------------------------------------------------

export function Btn({ children, quiet = false, press = -99, style }: { children: ReactNode; quiet?: boolean; press?: number; style?: CSSProperties }) {
  const pressed = press >= 0 && press < 6;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: quiet ? 48 : 52,
        padding: quiet ? "0 18px" : "0 24px",
        borderRadius: 12,
        border: `1px solid ${quiet ? C.line2 : C.accent}`,
        background: quiet ? C.paper : C.accent,
        color: quiet ? C.ink : "#fff",
        fontSize: quiet ? 15 : 16,
        fontWeight: quiet ? 500 : 600,
        transform: pressed ? "scale(0.97)" : undefined,
        ...style,
      }}
    >
      {children}
      <Press t={press} />
    </span>
  );
}
