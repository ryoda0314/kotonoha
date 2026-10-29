import type { Partner, PartnerId, SpeakerId, ThemeId, GroupId } from "./types.ts";

// The four people the learner meets and talks with: friends at a university in Tokyo, from abroad, so English is what
// they share. Every voice is one of Google's (Gemini TTS, src/lib/tts.ts), each told apart from the others: Mia's warm
// and the highest, Sam's easy-going and the lowest, Leo's upbeat, Nora's firm. No OpenAI voice speaks, not even when
// Google refuses (the browser's own voice does then). scripts/generate-audio.mjs and /api/say use the same voices.
export const PARTNERS: Record<PartnerId, Partner> = {
  mia: {
    id: "mia",
    name: "Mia",
    kana: "ミア",
    about: "同じ授業をとっている友だち。本屋でバイトしている。",
    voice: "google:Sulafat",
    persona: "Mia, a university student in Tokyo who takes classes with the learner and works part-time at a bookstore. Practical, warm, organized.",
  },
  leo: {
    id: "leo",
    name: "Leo",
    kana: "レオ",
    about: "デザインを学んでいる友だち。ものを作るのが好き。",
    voice: "google:Puck",
    persona: "Leo, a design student and the learner's friend. Curious and honest, likes making things, and says what he really thinks.",
  },
  sam: {
    id: "sam",
    name: "Sam",
    kana: "サム",
    about: "気楽な友だち。食べることと山歩きが好き。",
    voice: "google:Umbriel",
    persona: "Sam, the learner's laid-back friend, who loves food and the outdoors and is happy to go along with good ideas.",
  },
  nora: {
    id: "nora",
    name: "Nora",
    kana: "ノラ",
    about: "サークルの先輩。はっきりものを言う。",
    voice: "google:Kore",
    persona: "Nora, an older student in the learner's club. Friendly and direct, a bit of a planner.",
  },
};

/**
 * The voice of what the learner might say or did say: a scene's samples, their own corrected sentence, other ways of
 * saying it. Bright, and of the voices left the nearest to the middle between the friends' high and low ones.
 */
export const YOU_VOICE = "google:Zephyr";

export const VOICES: readonly string[] = [...Object.values(PARTNERS).map((p) => p.voice), YOU_VOICE];

export function voiceOf(who: SpeakerId): string {
  return who === "you" ? YOU_VOICE : PARTNERS[who].voice;
}

export const THEMES: Record<ThemeId, string> = {
  plan: "予定を合わせる",
  make: "作っているもの",
  decide: "二人で決める",
  chat: "ふだんの話",
};

/** Near intents. Expressions sharing one are each other's ほかの言い方. */
export const GROUPS: Record<GroupId, string> = {
  invite: "誘う・案を出す",
  schedule: "都合を合わせる",
  decline: "断る・無理だと言う",
  prefer: "希望や気分を伝える",
  explain: "説明する",
  soften: "やわらげる・迷いを言う",
  decide: "決める",
  ask: "頼む・許可をとる",
  ease: "力を抜く",
};
