// What the film says, on the left of the app's screen: which way in (the entrance), one plain sentence, and a quieter
// one under it. Each falls in when its moment comes and the one before rises away.
import { fall, leave, mixColor, prog } from "../anim";
import { C, FONT } from "../theme";
import { Icon, type IconName } from "../ui";

export const CAP = { left: 120, width: 700, kickerTop: 300, mainTop: 372 };
// The kicker: an entrance's icon and name, where 3つの入口 hands 場面で言う over to it.
export const KICKER = { icon: { left: CAP.left, top: 301, size: 34 }, text: { left: CAP.left + 46, top: 300, size: 30 } };

export type Line = string | { text: string; color: string };
/** `subAt`: when the quieter line falls in, if not just after the main one. */
export type Cap = { from: number; door: Door; main: string[]; sub?: Line[][]; subAt?: number };
export type Door = "meet" | "talk" | "scene" | "me";
export const DOOR_NAME: Record<Door, string> = { meet: "出会う", talk: "話す", scene: "場面で言う", me: "自分" };
const DOOR_ICON: Record<Door, IconName> = { meet: "meet", talk: "talk", scene: "scene", me: "user" };

export function Kicker({ door, style }: { door: Door; style?: React.CSSProperties }) {
  return (
    <>
      <span style={{ position: "absolute", left: KICKER.icon.left, top: KICKER.icon.top, color: C.accent, ...style }}>
        <Icon name={DOOR_ICON[door]} size={KICKER.icon.size} stroke={1.7} />
      </span>
      <span
        style={{
          position: "absolute",
          left: KICKER.text.left,
          top: KICKER.text.top,
          fontSize: KICKER.text.size,
          lineHeight: "36px",
          fontWeight: 600,
          color: C.accent,
          fontFamily: FONT.ja,
          whiteSpace: "nowrap",
          ...style,
        }}
      >
        {DOOR_NAME[door]}
      </span>
    </>
  );
}

/** The captions of a stretch of the film; `from` frames, each until the next begins. */
export function Captions({ frame, caps, until }: { frame: number; caps: Cap[]; until: number }) {
  return (
    <>
      {caps.map((c, i) => {
        const next = caps[i + 1]?.from ?? until;
        if (frame < c.from || frame > next + 14) return null;
        const prevDoor = caps[i - 1]?.door;
        const nextDoor = caps[i + 1]?.door;
        // The one before is gone (9 frames) before this one falls in, so two sentences never sit on each other.
        const style = frame >= next ? leave(frame, next, 9, 12) : fall(frame, c.from + 8, 16, 16);
        // The kicker stays while the entrance does, and changes with it: the old one goes, then the new one falls in.
        const kickerIn = prevDoor === c.door ? { opacity: 1 } : i === 0 ? { opacity: 1 } : fall(frame, c.from + 8, 10, 12);
        const kickerOut = nextDoor === c.door || !caps[i + 1] ? null : leave(frame, next, 8, 8);
        const kick = frame >= next && kickerOut ? kickerOut : frame >= next ? { opacity: 0 } : kickerIn;
        return (
          <div key={c.from}>
            <Kicker door={c.door} style={kick} />
            <div style={{ position: "absolute", left: CAP.left, top: CAP.mainTop, width: CAP.width, ...style }}>
              {c.main.map((m) => (
                <p key={m} style={{ margin: 0, fontSize: 52, fontWeight: 600, lineHeight: 1.42, letterSpacing: "0.01em", color: C.ink, fontFamily: FONT.ja }}>
                  {m}
                </p>
              ))}
              {c.sub ? (
                <div style={{ marginTop: 30, ...fall(frame, c.subAt ?? c.from + 16, 10, 16) }}>
                  {c.sub.map((line, j) => (
                    <p key={j} style={{ margin: 0, fontSize: 27, lineHeight: 1.75, color: C.ink2, fontFamily: FONT.ja }}>
                      {line.map((part, k) =>
                        typeof part === "string" ? (
                          <span key={k}>{part}</span>
                        ) : (
                          <span key={k} style={{ color: mixColor(C.ink2, part.color, prog(frame, (c.subAt ?? c.from + 16) + 8, 14)), fontWeight: 600 }}>
                            {part.text}
                          </span>
                        ),
                      )}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
