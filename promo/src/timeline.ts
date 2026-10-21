// When everything happens, in frames, built from the clips' own lengths (src/audio.json from `npm run assets`,
// src/narration.json from `npm run narration`), so a line is shown while it is heard and the next waits for it.
// One timeline for each version of the film. With the narration, a beat lasts as long as what is said in it, and the
// narration never sits on an English voice. Without it, every moment is where it always was: each wait below is
// "the later of the narration's end and the usual time".
import audioJson from "./audio.json";
import narrationJson from "./narration.json";
import { f, typing, type Seg } from "./anim";

type Clip = { src: string; seconds: number; text?: string };
export const AUDIO = audioJson as Record<string, Clip>;
export const NARRATION = narrationJson as Record<string, Clip>;
const len = (id: string) => AUDIO[id].seconds;

// What the learner types (Japanese where English did not come), and what the AI made of it: the design's own example
// (english-learning-system.md, 日本語を混ぜた文). The diff is the app's (../src/lib/diff.ts).
export const SAY1: Seg[] = [
  { text: "I " },
  { text: "今日は出かける気分じゃない", ja: true },
  { text: ". I just want to " },
  { text: "家でゆっくりする", ja: true },
  { text: "." },
];
export const FIXED1 = "I don't feel like going out today. I just want to take it easy at home.";
export const SAY2: Seg[] = [{ text: "I feel like watching a movie tonight." }];
export const SAY3: Seg[] = [{ text: "Sure! I feel like having something spicy." }];

export const TYPE1 = typing(SAY1);
export const TYPE2 = typing(SAY2, 1.5);
export const TYPE3 = typing(SAY3, 1.5);

const frames = <T extends Record<string, number>>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)])) as { [K in keyof T]: number };

export type Timeline = ReturnType<typeof makeTimeline>;

export function makeTimeline(narrated: boolean) {
  const said: { id: string; at: number }[] = [];
  /** The narration `id` from `at` (seconds); when it ends. Without narration, nothing is said and it "ends" at once. */
  const say = (id: string, at: number) => {
    if (!narrated) return at;
    said.push({ id, at });
    return at + NARRATION[id].seconds;
  };
  let t = 0;
  const at = (s: number) => (t = s);

  // A. 出会う: a conversation falls in line by line, each in its own voice; its expressions light once it has fallen.
  const hook = { start: 0, press: 0.75, line1: 1.1, line2: 0, line3: 0, lit: 0, chips: 0, end: 0 };
  hook.line2 = hook.line1 + 0.15 + len("make-email.1") + 0.25;
  hook.line3 = hook.line2 + 0.15 + len("make-email.2") + 0.25;
  hook.lit = hook.line3 + 0.15 + len("make-email.3") + 0.25;
  hook.chips = hook.lit + 0.4;
  const n01 = say("N01", hook.lit + 0.15);
  hook.end = Math.max(hook.lit + 2.0, n01 + 0.35);

  // B. 読めば分かる。なのに、言おうとすると出てこない。
  const gap = { start: at(hook.end), l1: t + 0.3, l2: narrated ? t + 0.9 : t + 1.25, hint: 0, end: 0 };
  const n02 = say("N02", gap.l2 + 0.05);
  gap.hint = Math.max(t + 2.6, n02 + 0.3);
  gap.end = gap.hint + 1.8;

  // C. ことのは
  const title = { start: at(gap.end), drops: t, icon: t + 0.55, word: t + 0.95, lead: 0, end: 0 };
  const n03 = say("N03", title.word + 0.05);
  title.lead = Math.max(t + 1.65, n03 + 0.2);
  const n04 = say("N04", title.lead + 0.05);
  title.end = Math.max(t + 4.0, n04 + 0.7);

  // D. 3つの入口
  const doors = { start: at(title.end), items: t + 0.15, caption: 0, pick: 0, end: 0 };
  const n05 = say("N05", t + 0.3);
  doors.caption = narrated ? n05 + 0.15 : t + 1.1;
  const n06 = say("N06", doors.caption + 0.05);
  doors.pick = Math.max(t + 2.75, n06 + 0.35);
  doors.end = doors.pick + 0.75;

  // E–J. 場面で言う, on one screen, with the expression sheet over it.
  const scene = { start: at(doors.end - 0.2), card: 0, line: 0, mine: 0, cap: 0, type: 0, send: 0 };
  scene.card = t + 0.35;
  scene.line = t + 0.9;
  scene.mine = scene.line + 0.15 + len("scene-going-out.line") + 0.25;
  scene.cap = scene.mine + 0.2;
  const n07 = say("N07", scene.cap + 0.1);
  scene.type = scene.mine + 0.9;
  scene.send = scene.type + TYPE1.duration / 30 + 0.45;

  const fix = { input: scene.send + 0.12, fixed: 0, cap: Math.max(scene.send + 0.9, n07 + 0.25), end: 0 };
  fix.fixed = fix.cap + 0.1;
  const n08 = say("N08", fix.cap + 0.1);
  fix.end = Math.max(fix.fixed + 2.3, n08 + 0.5);

  // The narration says the partner answers its content; then she does.
  const reply = { cap: fix.end, line: 0, end: 0 };
  const n09 = say("N09", fix.end + 0.1);
  reply.line = narrated ? n09 + 0.2 : fix.end;
  reply.end = reply.line + 0.15 + len("nora.fair") + 0.45;

  const detail = { press: reply.end, open: reply.end + 0.25, cap: reply.end + 0.2, end: 0 };
  const n10 = say("N10", detail.cap + 0.15);
  detail.end = Math.max(reply.end + 4.1, n10 + 1.0);

  const sheet = { press: detail.end, open: detail.end + 0.25, cap: detail.end + 0.2, scroll: 0, end: 0 };
  const n11 = say("N11", sheet.cap + 0.15);
  const n12 = say("N12", n11 + 0.2);
  // Toward 別の場面で as it is said.
  sheet.scroll = narrated ? n11 + 1.1 : detail.end + 2.4;
  sheet.end = Math.max(detail.end + 4.8, n12 + 0.6);

  const tryIt = { press: sheet.end, view: sheet.end + 0.25, cap: sheet.end + 0.2, type: sheet.end + 0.9, send: 0, fixed: 0, line: 0, end: 0 };
  const n13 = say("N13", tryIt.cap + 0.15);
  tryIt.send = tryIt.type + TYPE2.duration / 30 + 0.3;
  tryIt.fixed = tryIt.send + 0.85;
  tryIt.line = Math.max(tryIt.fixed + 0.65, n13 + 0.25);
  tryIt.end = tryIt.line + 0.15 + len("nora.watch") + 0.5;

  // K–L. 数日後、話す (ミアと), then 自分 (できたこと).
  const later = { start: tryIt.end, label: tryIt.end + 0.1, line: 0, violet: 0, cap: 0, end: 0 };
  const n14 = say("N14", later.label + 0.15);
  if (narrated) {
    later.cap = n14 + 0.15;
    later.line = say("N15", later.cap + 0.05) + 0.25;
  } else {
    later.line = later.start + 1.1;
    later.cap = later.line + 0.2;
  }
  later.violet = later.line + 0.75;
  later.end = later.line + 0.15 + len("mia.ramen") + 0.45;

  const own = { type: later.end, cap: later.end, send: 0, fixed: 0, me: 0, capMe: 0, end: 0 };
  const n16 = say("N16", own.cap + 0.15);
  own.send = own.type + TYPE3.duration / 30 + 0.3;
  own.fixed = own.send + 0.85;
  own.me = Math.max(own.fixed + 1.5, n16 + 0.4);
  own.capMe = own.me + 0.1;
  const n17 = say("N17", own.capMe + 0.25);
  own.end = Math.max(own.me + 4.2, n17 + 1.0);

  // M. 終わり: the name and the line under it, said again as at the title.
  const end = { start: own.end, icon: own.end + 0.3, word: own.end + 0.7, lead: 0, rest: 0, end: 0 };
  const e03 = say("N03", end.word + 0.05);
  end.lead = Math.max(end.start + 1.3, e03 + 0.2);
  const e04 = say("N04", end.lead + 0.05);
  end.rest = Math.max(end.start + 2.0, end.lead + 0.7);
  end.end = Math.max(end.start + 5.6, e04 + 1.8);

  const T = {
    hook: frames(hook),
    gap: frames(gap),
    title: frames(title),
    doors: frames(doors),
    scene: frames(scene),
    fix: frames(fix),
    reply: frames(reply),
    detail: frames(detail),
    sheet: frames(sheet),
    tryIt: frames(tryIt),
    later: frames(later),
    own: frames(own),
    end: frames(end),
  };

  /** Where each English clip starts (frames). A line is heard just after it starts to fall. */
  const VOICES: { id: string; from: number }[] = [
    { id: "make-email.1", from: f(hook.line1 + 0.15) },
    { id: "make-email.2", from: f(hook.line2 + 0.15) },
    { id: "make-email.3", from: f(hook.line3 + 0.15) },
    { id: "scene-going-out.line", from: f(scene.line + 0.15) },
    { id: "nora.fair", from: f(reply.line + 0.15) },
    { id: "nora.watch", from: f(tryIt.line + 0.15) },
    { id: "mia.ramen", from: f(later.line + 0.15) },
  ];
  /** Where each narration clip starts (frames). */
  const SAID = said.map((s) => ({ id: s.id, from: f(s.at) }));

  return {
    narrated,
    T,
    TOTAL: f(end.end),
    VOICES,
    SAID,
    /** Frames since the voice of `id` began, while it is still playing (else 0): the speak button's ring. */
    playing(id: string, frame: number): number {
      const v = VOICES.find((x) => x.id === id);
      if (!v) return 0;
      const since = frame - v.from;
      return since >= 0 && since < f(len(id)) ? since + 1 : 0;
    },
    /** The marks in the film's sound track, in seconds, for scripts/music.py. */
    MUSIC_MARKS: { title: title.start, story: scene.start, later: later.start, end: end.start, total: end.end },
  };
}
