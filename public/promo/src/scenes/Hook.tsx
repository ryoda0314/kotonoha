// A. 出会う: the design's own example (make-email), falling in line by line with the app's voices. Its expressions are
// lit only after it has fallen, and offered as chips, as on the app's 出会う screen (_meet/Meet.tsx).
import { fall, prog } from "../anim";
import { Scroll } from "../Scroll";
import { C, FONT } from "../theme";
import { useTimeline } from "../context";
import { Btn, Grow, Icon, label, Marked, Speak, type HL } from "../ui";

const LINES = [
  { id: "make-email.1", who: "Leo", text: "You still haven't sent it?", marks: [] as string[] },
  { id: "make-email.2", who: "Mia", text: "I keep rewriting it. It never sounds right.", marks: ["keep rewriting"] },
  { id: "make-email.3", who: "Leo", text: "Just send it. It doesn't have to be perfect.", marks: ["doesn't have to be"] },
];
const CHIPS = [
  { form: "keep 〜ing", label: "何度も〜してしまう" },
  { form: "It doesn't have to be 〜", label: "〜でなくていいと言う" },
];

const ZOOM = 2;
const W = 1040 / ZOOM;
const H = 1080 / ZOOM;

export function Hook({ frame }: { frame: number }) {
  const { T, playing } = useTimeline();
  const t = T.hook;
  const starts = [t.line1, t.line2, t.line3];
  const lit = prog(frame, t.lit, 15);
  const done = frame >= t.lit;
  return (
    <div style={{ position: "absolute", left: (1920 - W * ZOOM) / 2, top: 0, width: W, height: H, transform: `scale(${ZOOM})`, transformOrigin: "0 0" }}>
      <Scroll short="center" style={{ inset: "28px 0" }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 0 8px", ...fall(frame, 0, 12, 16) }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.accent }}>作っているもの</p>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>送れないメール</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: C.ink2 }}>ミアは教授へのメールを、まだ送れずにいる。</p>
          <div style={{ display: "flex", gap: 10, paddingTop: 12 }}>
            <Btn press={frame - t.press}>
              <Icon name={done ? "replay" : "speaker"} size={20} />
              {done ? "もう一度流す" : "流す"}
            </Btn>
          </div>
          <Grow p={1 - prog(frame, t.line1, 12)}>
            <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.7, color: C.muted }}>短い会話が流れてきます。内容を追いながら、気になる言い方を拾ってみて。</p>
          </Grow>
        </section>

        <div style={{ display: "flex", flexDirection: "column", padding: "12px 0 8px" }}>
          {LINES.map((line, i) => {
            const hl: HL[] = line.marks.map((m) => {
              const start = line.text.indexOf(m);
              return { start, end: start + m.length, kind: "mark", p: lit };
            });
            return (
              <Grow key={line.id} p={prog(frame, starts[i], 14)}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: i ? 18 : 0, ...fall(frame, starts[i]) }}>
                  <p style={{ ...label, fontFamily: FONT.en }}>{line.who}</p>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 19, lineHeight: 1.6, fontFamily: FONT.en }}>
                      <Marked text={line.text} hl={hl} />
                    </p>
                    <Speak playing={playing(line.id, frame)} />
                  </div>
                  <span style={{ alignSelf: "flex-start", padding: "2px 0", color: C.muted, fontSize: 13, textDecoration: "underline dotted", textUnderlineOffset: "0.3em" }}>訳</span>
                </div>
              </Grow>
            );
          })}
        </div>

        <Grow p={prog(frame, t.chips, 16)}>
          <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: "20px 0", ...fall(frame, t.chips, 12) }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>この会話の表現</h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: C.muted }}>押すと、ほかの言い方と、別の場面での使われ方が見られます。紫は、前にも気にとめた表現。</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CHIPS.map((c, i) => (
                <span
                  key={c.form}
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    gap: 2,
                    padding: "8px 14px",
                    border: `1px solid ${C.line2}`,
                    borderRadius: 12,
                    background: C.paper,
                    ...fall(frame, t.chips + 4 + i * 4, 10),
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, fontFamily: FONT.en }}>{c.form}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{c.label}</span>
                </span>
              ))}
            </div>
          </section>
        </Grow>
      </Scroll>
    </div>
  );
}
