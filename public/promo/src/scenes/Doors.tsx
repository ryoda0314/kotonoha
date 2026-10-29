// D. 3つの入口: not a course but ways in, chosen by the mood of the moment. 場面で言う is taken: it turns to the
// accent and travels, as one piece, to where the film names the entrance next (Caption.tsx KICKER).
import { fall, leave, mixColor, prog, SOFT } from "../anim";
import { C, FONT } from "../theme";
import { useTimeline } from "../context";
import type { Timeline } from "../timeline";
import { Icon, type IconName } from "../ui";
import { KICKER } from "./Caption";

const DOORS: { icon: IconName; name: string; does: string[]; x: number }[] = [
  { icon: "meet", name: "出会う", does: ["短い会話を、", "音と文字で。"], x: 560 },
  { icon: "talk", name: "話す", does: ["話したいことを、", "日本語も混ぜて。"], x: 960 },
  { icon: "scene", name: "場面で言う", does: ["相手の一言と、", "自分の事情から。"], x: 1360 },
];
const ICON = { size: 76, top: 330 };
const NAME = { size: 50, top: 436 };

/** How far the chosen door has gone toward the kicker (0 → 1), and how much of it is still drawn. */
function doorTravel(t: Timeline["T"]["doors"], frame: number) {
  const go = prog(frame, t.pick + 6, t.end - t.pick - 6, SOFT);
  return { go, shown: 1 - prog(frame, t.end - 7, 7) };
}

export function Doors({ frame }: { frame: number }) {
  const t = useTimeline().T.doors;
  const chosen = prog(frame, t.pick, 10);
  const { go, shown } = doorTravel(t, frame);
  return (
    <>
      {DOORS.map((d, i) => {
        const picked = d.icon === "scene";
        const enter = fall(frame, t.items + i * 6, 16, 18);
        const away = frame >= t.pick && !picked ? leave(frame, t.pick, 12, 10) : null;
        const nameLeft = d.x - (d.name.length * NAME.size) / 2;
        // The name's left middle travels to the kicker's, shrinking to its size; the icon comes along above it.
        const origin = { x: nameLeft, y: NAME.top + NAME.size * 0.6 };
        const to = { x: KICKER.text.left, y: KICKER.text.top + 18 };
        const scale = 1 - go * (1 - KICKER.text.size / NAME.size);
        const move = picked
          ? {
              transformOrigin: `${origin.x}px ${origin.y}px`,
              transform: `translate(${(to.x - origin.x) * go}px, ${(to.y - origin.y) * go}px) scale(${scale})`,
              opacity: shown,
            }
          : {};
        const ink = picked ? mixColor(C.ink, C.accent, chosen) : C.ink;
        return (
          <div key={d.name} style={away ?? enter}>
            <div style={{ position: "absolute", inset: 0, ...move }}>
              <span style={{ position: "absolute", left: d.x - ICON.size / 2, top: ICON.top, color: picked ? mixColor(C.ink2, C.accent, chosen) : C.ink2 }}>
                <Icon name={d.icon} size={ICON.size} stroke={1.6} />
              </span>
              <span style={{ position: "absolute", left: nameLeft, top: NAME.top, fontSize: NAME.size, lineHeight: 1.2, fontWeight: 600, fontFamily: FONT.ja, color: ink, whiteSpace: "nowrap" }}>
                {d.name}
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                top: 528,
                left: d.x - 200,
                width: 400,
                textAlign: "center",
                fontSize: 26,
                lineHeight: 1.7,
                color: C.muted,
                fontFamily: FONT.ja,
                ...(picked && frame >= t.pick ? leave(frame, t.pick, 10, 6) : {}),
              }}
            >
              {d.does.map((x) => (
                <p key={x} style={{ margin: 0 }}>
                  {x}
                </p>
              ))}
            </div>
          </div>
        );
      })}
      <p
        style={{
          position: "absolute",
          top: 760,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: "center",
          fontSize: 40,
          fontWeight: 600,
          color: C.ink,
          fontFamily: FONT.ja,
          ...(frame >= t.pick ? leave(frame, t.pick, 12, 10) : fall(frame, t.caption, 14, 18)),
        }}
      >
        そのときの気分で、どこからでも。
      </p>
    </>
  );
}
