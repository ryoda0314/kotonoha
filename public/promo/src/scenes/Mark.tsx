// The name, as the app shows it first: the icon the maker chose and ことのは in mincho. Three drops fall into the
// icon's own rain (a cloud raining onto two leaves: the leaves of words grow from the rain of words).
import { Img, interpolate, staticFile } from "remotion";
import { fall, FALL, prog } from "../anim";
import { C, FONT } from "../theme";

// The icon's drops, in its 512 px picture (public/icons/icon-512.png), and a flat colour of each.
const DROPS = [
  { x0: 202, x1: 223, y0: 155, y1: 201, color: "#5fb2f9", delay: 4 },
  { x0: 245, x1: 266, y0: 122, y1: 178, color: "#9a83f6", delay: 0 },
  { x0: 288, x1: 309, y0: 162, y1: 212, color: "#f696cf", delay: 7 },
];

export function NameMark({
  frame,
  start,
  icon,
  word,
  lead,
  size,
  top,
  wordSize,
  leadSize,
}: {
  frame: number;
  /** When the drops begin to fall. */
  start: number;
  icon: number;
  word: number;
  lead: number;
  size: number;
  top: number;
  wordSize: number;
  leadSize: number;
}) {
  const left = 960 - size / 2;
  const k = size / 512;
  const shown = prog(frame, icon, 15);
  return (
    <>
      <div style={{ position: "absolute", left, top, width: size, height: size, opacity: shown, transform: `scale(${0.96 + 0.04 * shown})` }}>
        <Img src={staticFile("app/icon.png")} style={{ width: size, height: size }} />
      </div>
      {DROPS.map((d) => {
        const p = interpolate(frame, [start + d.delay, start + d.delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: FALL });
        const gone = prog(frame, icon + 6, 12);
        if (frame < start + d.delay || gone >= 1) return null;
        const y = top + d.y0 * k - (1 - p) * (top + d.y0 * k + 120);
        return (
          <span
            key={d.color}
            style={{
              position: "absolute",
              left: left + d.x0 * k,
              top: y,
              width: (d.x1 - d.x0) * k,
              height: (d.y1 - d.y0) * k,
              borderRadius: 999,
              background: d.color,
              opacity: (0.35 + 0.65 * p) * (1 - gone),
            }}
          />
        );
      })}
      <p
        style={{
          position: "absolute",
          top: top + size + wordSize * 0.42,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: "center",
          fontFamily: FONT.mincho,
          fontWeight: 700,
          fontSize: wordSize,
          letterSpacing: "0.06em",
          lineHeight: 1.2,
          color: C.ink,
        }}
      >
        {[..."ことのは"].map((ch, i) => (
          <span key={i} style={{ display: "inline-block", ...fall(frame, word + i * 3, wordSize * 0.18, 16) }}>
            {ch}
          </span>
        ))}
      </p>
      <p
        style={{
          position: "absolute",
          top: top + size + wordSize * 1.95,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: "center",
          fontFamily: FONT.ja,
          fontWeight: 600,
          fontSize: leadSize,
          lineHeight: 1.45,
          color: C.ink,
          ...fall(frame, lead, 14, 18),
        }}
      >
        借りた言葉が、自分の言葉になるまで。
      </p>
    </>
  );
}
