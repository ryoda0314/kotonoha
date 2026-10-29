import { useLayoutEffect, useRef, type ReactNode } from "react";
import { mix } from "./anim";
import { CLIP_Y } from "./ui";

export type Focus = { anchor: string; w: number; margin?: number };

/**
 * A window onto content that grows. It keeps the newest part in view, as a conversation does, unless a `focus` asks
 * for an element (marked `data-anchor`) to be near the top; each focus's `w` (0 → 1) eases toward it from what came
 * before, so one can hand over to the next. Positions are measured on every frame, so the content can change freely.
 */
export function Scroll({
  children,
  focus = [],
  short = "top",
  from = "end",
  style,
}: {
  children: ReactNode;
  focus?: Focus[];
  short?: "top" | "center";
  /** What is in view before any focus: the newest part ("end", a conversation) or the beginning ("start", a sheet). */
  from?: "end" | "start";
  style?: React.CSSProperties;
}) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = inner.current;
    const frame = box.current;
    if (!el || !frame) return;
    const view = frame.clientHeight;
    const height = el.offsetHeight;
    const bottom = Math.max(0, height - view);
    let y = height < view && short === "center" ? -(view - height) / 2 : from === "start" ? 0 : bottom;
    for (const fx of focus) {
      if (fx.w <= 0) continue;
      const target: HTMLElement | null = el.querySelector(`[data-anchor="${fx.anchor}"]`);
      if (!target) continue;
      let top = 0;
      for (let n: HTMLElement | null = target; n && n !== el; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
      const wanted = Math.max(0, Math.min(bottom, top - (fx.margin ?? 12)));
      y = mix(y, wanted, fx.w);
    }
    el.style.transform = `translateY(${-y}px)`;
  });

  return (
    <div ref={box} style={{ position: "absolute", ...CLIP_Y, ...style }}>
      <div ref={inner} style={{ position: "relative" }}>
        {children}
      </div>
    </div>
  );
}
