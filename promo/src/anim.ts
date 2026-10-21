import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";

export const FPS = 30;

/** Seconds to frames. */
export const f = (seconds: number) => Math.round(seconds * FPS);

// The app's fall (meet.module.css): lines drop in from above and settle, as in ことのあめ.
export const FALL = Easing.bezier(0.2, 0.8, 0.3, 1);
export const SOFT = Easing.bezier(0.33, 0, 0.2, 1);

/** 0 → 1 from `start` over `dur` frames. */
export function prog(frame: number, start: number, dur: number, easing: (t: number) => number = FALL): number {
  if (dur <= 0) return frame >= start ? 1 : 0;
  return interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** In from above, as the app's lines fall. */
export function fall(frame: number, start: number, dist = 18, dur = f(0.55)): CSSProperties {
  const p = prog(frame, start, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * -dist}px)` };
}

/** Gone softly, rising a little. */
export function leave(frame: number, start: number, dur = f(0.4), dist = 10): CSSProperties {
  const p = prog(frame, start, dur, SOFT);
  return { opacity: 1 - p, transform: `translateY(${p * -dist}px)` };
}

/** Visible between `start` and `end` (frames), falling in and leaving. */
export function during(frame: number, start: number, end: number, dist = 14): CSSProperties {
  if (frame >= end) return leave(frame, end);
  return fall(frame, start, dist);
}

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** One colour toward another, both #rrggbb. */
export function mixColor(a: string, b: string, p: number): string {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${ca.map((x, i) => Math.round(mix(x, cb[i], p))).join(",")})`;
}

// Typing into the composer. English goes in a character at a time; a Japanese part arrives whole, the way an IME
// commits it, after a short pause and with the composition underline for a moment.
export type Seg = { text: string; ja?: boolean };
export type Typing = { full: string; marks: { at: number; len: number; composing?: [number, number] }[]; duration: number };

/** `per`: frames a character takes, on average. */
export function typing(segs: Seg[], per = 2): Typing {
  const marks: Typing["marks"] = [{ at: 0, len: 0 }];
  let at = 0;
  let len = 0;
  let i = 0;
  for (const seg of segs) {
    if (seg.ja) {
      at += 7;
      marks.push({ at: Math.round(at), len: len + seg.text.length, composing: [len, len + seg.text.length] });
      at += 9;
      len += seg.text.length;
      marks.push({ at: Math.round(at), len });
      continue;
    }
    for (const ch of seg.text) {
      // An uneven hand: now and then a beat longer, a little more after a word.
      at += per + (i % 5 === 3 ? 1 : 0) + (ch === " " && i % 2 === 0 ? 1 : 0);
      len += 1;
      i += 1;
      marks.push({ at: Math.round(at), len });
    }
  }
  return { full: segs.map((s) => s.text).join(""), marks, duration: Math.round(at) };
}

export function typedAt(t: Typing, frame: number): { text: string; composing?: [number, number] } {
  let m = t.marks[0];
  for (const x of t.marks) if (x.at <= frame) m = x;
  return { text: t.full.slice(0, m.len), composing: m.composing };
}
