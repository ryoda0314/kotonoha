// E–L. One expression's way, on the app's screens beside what the film says:
//   場面で言う (Nora asks; the learner answers with Japanese mixed in) → corrected with the intent kept, the partner
//   answering its content → the two things kept (今回英語で言えなかったところ / また使えるフレーズ) → feel like opened
//   (ほかの言い方, 別の場面で) → これで言ってみる → days later, in another conversation, it comes back violet → said
//   on the learner's own → できたこと.
import { diffRanges } from "../../../src/lib/diff.ts";
import { f, fall, prog, SOFT, typedAt, type Typing } from "../anim";
import { Scroll } from "../Scroll";
import { C, FONT } from "../theme";
import { useTimeline } from "../context";
import { FIXED1, SAY2, SAY3, TYPE1, TYPE2, TYPE3, type Timeline } from "../timeline";
import { Btn, Composer, Grow, Icon, label, Marked, Me, Press, Speak, Tag, Them, type HL } from "../ui";
import { Captions, Kicker, type Cap } from "./Caption";

/** What the film says beside each step. With the narration, the violet line waits for the violet. */
const capsOf = (T: Timeline["T"], narrated: boolean): Cap[] => [
  { from: T.scene.cap, door: "scene", main: ["英語が出てこないところは、", "日本語のままで。"] },
  { from: T.fix.cap, door: "scene", main: ["意図を保ったまま、", "英語に直す。"], sub: [["すでに自然なところは、そのままに。"]] },
  { from: T.reply.cap, door: "scene", main: ["相手は、", "中身に返事をする。"], sub: [["予定も意見もある、友だちとして。"]] },
  { from: T.detail.cap, door: "scene", main: ["直した文から、", "二つが残る。"], sub: [["今回英語で言えなかったところと、"], ["また使えるフレーズ。"]] },
  { from: T.sheet.cap, door: "scene", main: ["正解は、一つじゃない。"], sub: [["表現を開くと、ほかの言い方と、"], ["別の場面での使われ方。"]] },
  { from: T.tryIt.cap, door: "scene", main: ["借りた表現で、", "言ってみる。"], sub: [["自分のことで。元の会話は、そのまま残る。"]] },
  { from: T.later.label, door: "talk", main: ["数日後。"] },
  { from: T.later.cap, door: "talk", main: ["別の会話の中で、", "また出会う。"], sub: [["前にも気にとめた表現は、", { text: "紫", color: C.again }, "で。"]], subAt: narrated ? T.later.violet : undefined },
  { from: T.own.cap, door: "talk", main: ["今度は、自分から。"] },
  { from: T.own.capMe, door: "me", main: ["できたことが、残る。"], sub: [["借りた表現が、自分の言葉になったところ。"]] },
];

const PANEL = { left: 880, top: 40, width: 900, height: 1000 };
const K = 1.4;
const PW = PANEL.width / K;
const PH = PANEL.height / K;
const BAR = 60;
const COMPOSER = 70;

export function Story({ frame }: { frame: number }) {
  const { T, narrated } = useTimeline();
  const caps = capsOf(T, narrated);
  return (
    <>
      {frame >= T.doors.end - 8 && frame < caps[0].from ? <Kicker door="scene" style={{ opacity: prog(frame, T.doors.end - 8, 8) }} /> : null}
      <Captions frame={frame} caps={caps} until={T.own.end} />
      <Panel frame={frame} />
    </>
  );
}

function Panel({ frame }: { frame: number }) {
  const { T } = useTimeline();
  const one = 1 - prog(frame, T.later.start, 12, SOFT);
  const two = prog(frame, T.later.start, 12, SOFT) * (1 - prog(frame, T.own.me, 12, SOFT));
  const three = prog(frame, T.own.me, 12, SOFT);
  return (
    <div
      style={{
        position: "absolute",
        ...PANEL,
        borderRadius: 28,
        border: `1.5px solid ${C.line2}`,
        overflow: "hidden",
        background: C.paper,
        ...fall(frame, T.scene.start, 24, 18),
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transform: `scale(${K})`, transformOrigin: "0 0" }}>
        {one > 0 ? (
          <Layer opacity={one}>
            <SceneScreen frame={frame} />
          </Layer>
        ) : null}
        {two > 0 ? (
          <Layer opacity={two}>
            <TalkScreen frame={frame} />
          </Layer>
        ) : null}
        {three > 0 ? (
          <Layer opacity={three}>
            <MeScreen frame={frame} />
          </Layer>
        ) : null}
      </div>
    </div>
  );
}

function Layer({ opacity, children }: { opacity: number; children: React.ReactNode }) {
  return <div style={{ position: "absolute", inset: 0, opacity, background: C.paper }}>{children}</div>;
}

// ---- shared pieces --------------------------------------------------------------------------------------------------

function Bar({ title, sub, actions = [] }: { title: string; sub?: string; actions?: string[] }) {
  return (
    <header
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: BAR,
        padding: "8px 20px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: `1px solid ${C.line}`,
        background: C.paper,
        zIndex: 2,
      }}
    >
      <h1 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.4 }}>
        {title}
        {sub ? <span style={{ display: "block", fontSize: 12.5, fontWeight: 400, color: C.muted, letterSpacing: 0 }}>{sub}</span> : null}
      </h1>
      {actions.map((a) => (
        <span key={a} style={{ display: "inline-flex", alignItems: "center", minHeight: 38, padding: "0 11px", border: `1px solid ${C.line2}`, borderRadius: 999, fontSize: 13 }}>
          {a}
        </span>
      ))}
    </header>
  );
}

/** The composer at the foot of a screen, typing `typing` from `from` and sent at `send`. */
function Typed({ frame, typing, focus, from, send, inSheet = false }: { frame: number; typing: Typing; focus: number; from: number; send: number; inSheet?: boolean }) {
  // Empty before typing and again once sent.
  const now: { text: string; composing?: [number, number] } = frame >= from && frame < send ? typedAt(typing, frame - from) : { text: "" };
  const typingNow = frame >= from && frame < from + typing.duration;
  const focused = frame >= focus && frame < send;
  const caret = focused && (typingNow || Math.floor((frame - focus) / 16) % 2 === 0);
  return <Composer text={now.text} composing={now.composing} caret={caret} sendPress={frame - (send - 3)} inSheet={inSheet} />;
}

const p_ = (frame: number, at: number, dur = 12) => prog(frame, at, dur);

function rangeOf(text: string, piece: string, kind: HL["kind"], p: number): HL {
  const start = text.indexOf(piece);
  return { start, end: start + piece.length, kind, p };
}

// ---- 場面で言う ------------------------------------------------------------------------------------------------------

const NORA_LINE = "A few of us are going out tonight. You in?";
const INPUT1 = TYPE1.full;
const DIFF1 = diffRanges(INPUT1, FIXED1, "en");

function SceneScreen({ frame }: { frame: number }) {
  const { T, playing } = useTimeline();
  const s = T.scene;
  const x = T.fix;
  const r = T.reply;
  const d = T.detail;
  const answered = frame >= x.input;
  return (
    <>
      <Bar title="場面で言う" />
      <Scroll
        style={{ left: 0, right: 0, top: BAR, bottom: COMPOSER }}
        focus={[
          { anchor: "me", w: prog(frame, d.open + 4, 22, SOFT), margin: 8 },
          { anchor: "phrases", w: prog(frame, d.open + f(2.1), 24, SOFT), margin: 8 },
        ]}
      >
        <div style={{ padding: "0 20px" }}>
          <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: "20px 0 16px", borderBottom: `1px solid ${C.line}` }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.accent, ...fall(frame, s.card, 10, 14) }}>二人で決める</p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", ...fall(frame, s.card + 3, 10, 14) }}>今夜は出かける？</h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: C.ink2, ...fall(frame, s.card + 6, 10, 14) }}>ノラから誘われた。</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 0", ...fall(frame, s.line, 12) }}>
              <p style={{ ...label, fontFamily: FONT.en }}>Nora</p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 21, lineHeight: 1.5, fontFamily: FONT.en }}>{NORA_LINE}</p>
                <Speak size={44} playing={playing("scene-going-out.line", frame)} />
              </div>
              <span style={{ alignSelf: "flex-start", padding: "2px 0", color: C.muted, fontSize: 13, textDecoration: "underline dotted", textUnderlineOffset: "0.3em" }}>訳</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px", borderLeft: `2px solid ${C.accent}`, background: C.tint, borderRadius: "0 10px 10px 0", ...fall(frame, s.mine, 12) }}>
              <p style={label}>あなたの事情</p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>今日は出かける気分じゃない。家でゆっくりしたい。</p>
            </div>
          </section>

          <Grow p={1 - p_(frame, x.input, 10)}>
            <p style={{ margin: 0, padding: "18px 0 4px", fontSize: 16, fontWeight: 600, ...fall(frame, s.mine + 6, 10) }}>あなたならどう返す？</p>
          </Grow>

          <Grow p={p_(frame, x.input, 12)}>
            <div style={{ padding: "8px 0 16px" }}>
              <div data-anchor="me" style={fall(frame, x.input, 10)}>
                <Me
                  input={INPUT1}
                  inputHl={DIFF1.removed.map((rg) => ({ ...rg, kind: "del" as const, p: p_(frame, x.fixed, 15) }))}
                  fixed={frame >= x.fixed ? FIXED1 : undefined}
                  fixedP={p_(frame, x.fixed, 12)}
                  fixedHl={[
                    ...DIFF1.added.map((rg) => ({ ...rg, kind: "ins" as const, p: p_(frame, x.fixed + 6, 15) })),
                    ...["feel like", "just want to", "take it easy"].map((m) => rangeOf(FIXED1, m, "mark", p_(frame, x.fixed + 22, 15))),
                  ]}
                  more="日本語で補った 2 · フレーズ 3"
                  morePress={frame - d.press}
                >
                  <Grow p={p_(frame, d.open, 15)}>
                    <Details frame={frame} />
                  </Grow>
                </Me>
              </div>
              <Grow p={p_(frame, r.line, 12)}>
                <div style={{ paddingTop: 18, ...fall(frame, r.line) }}>
                  <Them who="Nora" text="Totally fair. Rest up! Maybe next Friday, then?" playing={playing("nora.fair", frame)} />
                </div>
              </Grow>
            </div>
          </Grow>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "8px 0 20px", ...(answered ? fall(frame, x.input + 4, 8, 12) : fall(frame, s.mine + 10, 10)) }}>
            {answered ? (
              <>
                <Btn quiet>ほかの返し方</Btn>
                <Btn quiet>
                  次の場面
                  <Icon name="arrow" size={16} />
                </Btn>
                <Btn quiet>場面を選ぶ</Btn>
              </>
            ) : (
              <>
                <Btn quiet>見本を見る</Btn>
                <Btn quiet>場面を選ぶ</Btn>
              </>
            )}
          </div>
        </div>
      </Scroll>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <Typed frame={frame} typing={TYPE1} focus={s.type - 14} from={s.type} send={s.send} />
      </div>
      <ExprSheet frame={frame} />
    </>
  );
}

const PHRASES = [
  { form: "feel like + 〜ing", label: "〜したい気分だと言う", mine: false },
  { form: "take it easy", label: "のんびりする・無理しない", mine: false },
  { form: "I just want to 〜", label: "ただ〜したいと言う", mine: true },
];

/** Under 直したところ: the Japanese the learner wrote and the English used for it this time, and the phrases. */
function Details({ frame }: { frame: number }) {
  const { T } = useTimeline();
  const pressed = frame >= T.sheet.press - 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8, marginTop: 2, borderTop: `1px solid ${C.line2}` }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h4 style={label}>今回英語で言えなかったところ</h4>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 15 }}>
          {[
            ["今日は出かける気分じゃない", "don't feel like going out today"],
            ["家でゆっくりする", "take it easy at home"],
          ].map(([ja, en]) => (
            <div key={ja} style={{ display: "flex", borderBottom: `1px solid ${C.line2}`, padding: "6px 0" }}>
              <span style={{ width: "42%", paddingRight: 8, color: C.ink2, fontFamily: FONT.ja }}>{ja}</span>
              <span style={{ flex: 1, fontFamily: FONT.en }}>{en}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: C.muted }}>今回の文で使った言い方です。ほかの場面では、ほかの言い方もあります。</p>
      </section>
      <section data-anchor="phrases" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h4 style={label}>また使えるフレーズ</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PHRASES.map((ph, i) => (
            <span
              key={ph.form}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 48,
                padding: "8px 12px",
                border: `1px solid ${i === 0 && pressed ? C.accent : C.line2}`,
                borderRadius: 10,
                background: C.paper,
              }}
            >
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 600, fontFamily: FONT.en }}>{ph.form}</span>
                <span style={{ fontSize: 12.5, color: C.muted }}>{ph.label}</span>
              </span>
              <Tag good={ph.mine}>{ph.mine ? "自分で使った" : "AIが補った"}</Tag>
              {i === 0 ? <Press t={frame - T.sheet.press} x={90} /> : null}
            </span>
          ))}
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h4 style={label}>ほかの言い方</h4>
        <Btn quiet style={{ alignSelf: "flex-start" }}>
          ほかの言い方
        </Btn>
      </section>
    </div>
  );
}

// ---- the expression, opened (ExprHost.tsx), and これで言ってみる ------------------------------------------------------

const SHEET_H = PH * 0.88;
const FOOT = 81;

function ExprSheet({ frame }: { frame: number }) {
  const { T } = useTimeline();
  const sh = T.sheet;
  const tr = T.tryIt;
  const p = prog(frame, sh.open, 9);
  if (p <= 0) return null;
  const trying = prog(frame, tr.view, 8);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: `rgba(23,32,51,${0.36 * p})`, zIndex: 3 }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: SHEET_H,
          background: C.paper,
          border: `1px solid ${C.line}`,
          borderBottom: 0,
          borderRadius: "16px 16px 0 0",
          overflow: "hidden",
          opacity: p,
          transform: `translateY(${(1 - p) * 24}px)`,
          display: "flex",
          flexDirection: "column",
          zIndex: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 12px 12px 20px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
            <Grow p={trying}>
              <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 600, color: C.accent }}>これで言ってみる</p>
            </Grow>
            <p style={{ margin: 0, fontSize: 21, fontWeight: 600, lineHeight: 1.35, fontFamily: FONT.en }}>feel like + 〜ing</p>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: C.muted }}>〜したい気分だと言う</p>
          </div>
          <span style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <Icon name="close" size={20} />
          </span>
        </div>
        <div style={{ position: "relative", flex: 1 }}>
          {trying < 1 ? (
            <div style={{ position: "absolute", inset: 0, opacity: 1 - trying }}>
              <ExprBody frame={frame} />
            </div>
          ) : null}
          {trying > 0 ? (
            <div style={{ position: "absolute", inset: 0, opacity: trying }}>
              <TryBody frame={frame} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

const section = { display: "flex", flexDirection: "column", gap: 8 } as const;
const listItem = { padding: "10px 0", borderTop: `1px solid ${C.line}` } as const;

function ExprBody({ frame }: { frame: number }) {
  const { T } = useTimeline();
  const sh = T.sheet;
  return (
    <>
      <Scroll from="start" style={{ left: 0, right: 0, top: 0, bottom: FOOT }} focus={[{ anchor: "uses", w: prog(frame, sh.scroll, 26, SOFT), margin: 16 }]}>
        <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
          <section style={section}>
            <h3 style={label}>はたらき</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75 }}>今の気分として、したいこと・したくないことを伝える。</p>
          </section>
          <section style={section}>
            <h3 style={label}>ここでは</h3>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, padding: "10px 12px", borderLeft: `2px solid ${C.line2}`, fontFamily: FONT.en }}>
              <Marked text={FIXED1} hl={[rangeOf(FIXED1, "feel like", "mark", 1)]} />
            </p>
          </section>
          <section style={section}>
            <h3 style={label}>ほかの言い方</h3>
            <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.7 }}>近い意図（希望や気分を伝える）の言い方。何を前に出すかが少しずつ違います。</p>
            <div>
              {[
                ["I'd rather 〜", "比べて、こちらがいいと言う", "I'd rather stay in today."],
                ["I just want to 〜", "ただ〜したいと言う", "I just want to sleep."],
                ["I think I'll just 〜", "自分の判断として言う", "I think I'll just walk. It's not far."],
              ].map(([form, does, ex], i) => (
                <div key={form} style={{ ...listItem, ...(i === 2 ? { borderBottom: `1px solid ${C.line}` } : {}), display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 36 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, fontFamily: FONT.en }}>{form}</span>
                    <span style={{ flex: 1, fontSize: 13, color: C.muted }}>{does}</span>
                    <Icon name="arrow" size={16} color={C.muted} />
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 16, lineHeight: 1.55, fontFamily: FONT.en }}>{ex}</span>
                    <Speak />
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section data-anchor="uses" style={section}>
            <h3 style={label}>別の場面で</h3>
            <div>
              {[
                ["I feel like trying something new.", "何か新しいことをやってみたい気分。", "したい気分を言う"],
                ["Do you feel like watching a movie?", "映画でも見たい気分？", "疑問にすると、誘いになる"],
                ["I don't feel like cooking tonight.", "今夜は料理する気分じゃない。", "否定にして、気分じゃないと言う"],
              ].map(([en, ja, note], i) => (
                <div key={en} style={{ ...listItem, ...(i === 2 ? { borderBottom: `1px solid ${C.line}` } : {}) }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 16, lineHeight: 1.55, fontFamily: FONT.en }}>{en}</span>
                      <span style={{ display: "block", fontSize: 13.5, color: C.muted }}>{ja}</span>
                    </span>
                    <Speak />
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: C.accent }}>{note}</p>
                </div>
              ))}
            </div>
          </section>
          <section style={section}>
            <h3 style={label}>この表現が出る会話と場面</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["出会う", "金曜の夜"],
                ["場面で言う", "今夜は出かける？"],
              ].map(([kind, title]) => (
                <span key={title} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "0 12px", border: `1px solid ${C.line2}`, borderRadius: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted, minWidth: "5em" }}>{kind}</span>
                  <span style={{ flex: 1, fontSize: 15 }}>{title}</span>
                  <Icon name="arrow" size={16} color={C.muted} />
                </span>
              ))}
            </div>
          </section>
        </div>
      </Scroll>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: FOOT, padding: "12px 20px 16px", background: C.paper, borderTop: `1px solid ${C.line}`, display: "flex" }}>
        <Btn press={frame - T.tryIt.press} style={{ flex: 1 }}>
          これで言ってみる
        </Btn>
      </div>
    </>
  );
}

function TryBody({ frame }: { frame: number }) {
  const { T, playing } = useTimeline();
  const tr = T.tryIt;
  const sent = frame >= tr.send;
  const done = frame >= tr.fixed;
  return (
    <Scroll style={{ inset: 0 }}>
      <div style={{ padding: "16px 20px 16px", display: "flex", flexDirection: "column", gap: 22 }}>
        <section style={section}>
          <h3 style={label}>ほかの言い方で</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["I'd rather 〜", "I just want to 〜", "I think I'll just 〜"].map((x) => (
              <span key={x} style={{ display: "inline-flex", alignItems: "center", minHeight: 38, padding: "0 14px", borderRadius: 999, border: `1px solid ${C.line2}`, fontSize: 14, fontFamily: FONT.en }}>
                {x}
              </span>
            ))}
          </div>
        </section>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: C.ink2, display: "flex", flexDirection: "column", gap: 2 }}>
          自分のことで、言ってみたいことを。日本語を混ぜても大丈夫。
          <span style={{ fontSize: 12.5, color: C.muted }}>ノラが返事をします</span>
        </p>
        <Grow p={p_(frame, tr.send + 2, 10)}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={fall(frame, tr.send + 2, 10)}>
              {done ? (
                <Me
                  tags={[{ text: "表現を指定" }, { text: "そのままで自然", good: true }]}
                  fixed={SAY2[0].text}
                  fixedHl={[rangeOf(SAY2[0].text, "feel like", "again", p_(frame, tr.fixed + 8, 14))]}
                  more="フレーズ 1"
                />
              ) : sent ? (
                <Me tags={[{ text: "表現を指定" }]} input={SAY2[0].text} />
              ) : null}
            </div>
            <Grow p={p_(frame, tr.line, 12)}>
              <div style={{ paddingTop: 14, ...fall(frame, tr.line) }}>
                <Them who="Nora" text="Ooh, nice. Anything you want to watch?" size={17} playing={playing("nora.watch", frame)} />
              </div>
            </Grow>
          </div>
        </Grow>
        <div style={{ margin: "0 -20px" }}>
          <Typed frame={frame} typing={TYPE2} focus={tr.view + 8} from={tr.type} send={tr.send} inSheet />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn quiet>元に戻る</Btn>
        </div>
      </div>
    </Scroll>
  );
}

// ---- 数日後、話す ----------------------------------------------------------------------------------------------------

const MIA_LINE = "I don't feel like cooking tonight. Ramen after class?";

function TalkScreen({ frame }: { frame: number }) {
  const { T, playing } = useTimeline();
  const l = T.later;
  const o = T.own;
  const said = SAY3[0].text;
  return (
    <>
      <Bar title="予定を合わせる" sub="ミア（Mia）と" actions={["まとめ", "ほかの話へ"]} />
      <Scroll style={{ left: 0, right: 0, top: BAR, bottom: COMPOSER }}>
        <div style={{ padding: "8px 20px 16px", display: "flex", flexDirection: "column" }}>
          <Them who="Mia" text="Hey! Are you free sometime this week? I really want to try the new café by the station." />
          <div style={{ paddingTop: 18 }}>
            <Me tags={[{ text: "そのままで自然", good: true }]} fixed="I'm free after five today." more="くわしく" />
          </div>
          <Grow p={p_(frame, l.line, 12)}>
            <div style={{ paddingTop: 18, ...fall(frame, l.line) }}>
              <Them who="Mia" text={MIA_LINE} hl={[rangeOf(MIA_LINE, "feel like", "again", p_(frame, l.violet, 14))]} playing={playing("mia.ramen", frame)} />
            </div>
          </Grow>
          <Grow p={p_(frame, o.send + 2, 10)}>
            <div style={{ paddingTop: 18, ...fall(frame, o.send + 2, 10) }}>
              {frame >= o.fixed ? (
                <Me tags={[{ text: "そのままで自然", good: true }]} fixed={said} fixedHl={[rangeOf(said, "feel like", "again", p_(frame, o.fixed + 8, 14))]} more="フレーズ 1" />
              ) : (
                <Me input={said} />
              )}
            </div>
          </Grow>
        </div>
      </Scroll>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <Typed frame={frame} typing={TYPE3} focus={o.type - 6} from={o.type} send={o.send} />
      </div>
    </>
  );
}

// ---- 自分 -----------------------------------------------------------------------------------------------------------

const GROWN = [
  {
    form: "feel like + 〜ing",
    label: "〜したい気分だと言う",
    text: "Sure! I feel like having something spicy.",
    meta: "今日 · 前は表現を指定して使った → 自分から使った ·「予定を合わせる」",
  },
  { form: "Can we 〜 first?", label: "先にしたいことを頼む", text: "Can we eat first? I'm starving.", meta: "きのう · 前は見本をそのまま使った → 自分から使った" },
];

function MeScreen({ frame }: { frame: number }) {
  const { T } = useTimeline();
  const o = T.own;
  return (
    <>
      <Bar title="自分" />
      <div style={{ position: "absolute", top: BAR, left: 0, right: 0, padding: "0 20px" }}>
        <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.75, color: C.muted }}>これまでを振り返る場所。点数にはせず、ほかの人とも比べません。</p>
        <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: "20px 0" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="leaf" size={16} />
            できたこと
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: C.muted }}>見本やAIの助けで出会った表現を、あとで自分から使えたとき。</p>
          <div>
            {GROWN.map((g, i) => (
              <div
                key={g.form}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "12px 0",
                  borderTop: `1px solid ${C.line}`,
                  ...(i === GROWN.length - 1 ? { borderBottom: `1px solid ${C.line}` } : {}),
                  ...fall(frame, o.me + 8 + i * 6, 12, 16),
                }}
              >
                <p style={{ margin: 0, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 10px" }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: C.accent, fontFamily: FONT.en }}>{g.form}</span>
                  <span style={{ fontSize: 13, color: C.muted }}>{g.label}</span>
                </p>
                <p style={{ margin: 0, fontSize: 15, color: C.ink2, fontFamily: FONT.en }}>{g.text}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: C.muted }}>{g.meta}</p>
              </div>
            ))}
          </div>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: "20px 0", borderTop: `1px solid ${C.line}`, ...fall(frame, o.me + 20, 10, 16) }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>これまで</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {[
              ["出会った会話", 6],
              ["話した会話", 4],
              ["送った文", 17],
              ["自分から使った表現", 5],
            ].map(([k, v], i) => (
              <div
                key={k}
                style={{ display: "flex", flexDirection: "column", padding: i ? "2px 0 2px 10px" : "2px 0", ...(i ? { borderLeft: `1px solid ${C.line}` } : {}) }}
              >
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: C.muted }}>{k}</p>
                <p style={{ margin: "auto 0 0", paddingTop: 2, fontSize: 22, fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
