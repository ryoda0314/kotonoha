// The shape of the prepared English: who speaks, the expressions, the conversations met in 出会う, the scenes of
// 場面で言う and the frames of 話す. Everything here is written ahead and checked (tests/content.test.mjs); the app's
// AI only corrects and replies (CONCEPT.md).

export type ThemeId = "plan" | "make" | "decide";
export type PartnerId = "mia" | "leo" | "sam" | "nora";
/** The voice of a line: one of the partners, or "you" for things the learner might say (a scene's samples). */
export type SpeakerId = PartnerId | "you";

export type GroupId = "invite" | "schedule" | "decline" | "prefer" | "explain" | "soften" | "decide" | "ask" | "ease";

/** Where an expression shows in a line: the exact text, its fixed words (and what sits between them). */
export type Mark = { expr: string; text: string };

/** One line of English, with what it means in Japanese and the expressions in it. `id` names its audio. */
export type Line = { id: string; who: SpeakerId; text: string; ja: string; marks?: Mark[] };

export type Expr = {
  id: string;
  /**
   * Its fixed words (straight apostrophes): what makes a sentence use it. It tells whether the learner's own words had
   * it, and narrows a highlight to it.
   */
  core: RegExp;
  /** How it is written as a reusable piece: "feel like + 〜ing". */
  form: string;
  /** What it does, in a few plain words: 気分を伝える. */
  label: string;
  /** What it puts forward, one plain sentence. */
  does: string;
  /** Near intents: the other ways of saying (ほかの言い方) are the expressions sharing a group. */
  groups: GroupId[];
  /** 別の場面で: the same expression with something changed (asked, denied, another topic, another person). */
  examples: { text: string; ja: string; note: string }[];
};

export type Dialogue = { id: string; theme: ThemeId; title: string; lead: string; lines: Line[] };

export type Sample = { text: string; puts: string; marks?: Mark[] };

export type Scene = {
  id: string;
  theme: ThemeId;
  title: string;
  /** What has happened, in Japanese. */
  situation: string;
  /** The partner's line the learner answers. */
  line: Line;
  /** The learner's own circumstances and wish, never the finished answer. */
  mine: string;
  /** Ways of answering, each putting something else forward; shown only when asked for. */
  samples: Sample[];
  /** For the partner's side of the scene, in English. */
  brief: string;
};

export type Frame = {
  id: string;
  theme: ThemeId | "free";
  title: string;
  lead: string;
  partner: PartnerId;
  opener: Line;
  /** The partner's situation, in English, for the conversation. */
  brief: string;
};

export type Partner = {
  id: PartnerId;
  name: string;
  /** The name in katakana, for Japanese sentences. */
  kana: string;
  about: string;
  voice: string;
  persona: string;
};
