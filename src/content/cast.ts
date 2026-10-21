import type { Partner, PartnerId, SpeakerId, ThemeId, GroupId } from "./types.ts";

// The four people the learner meets and talks with: friends at a university in Tokyo, from abroad, so English is what
// they share. Two speak in OpenAI's voices and two in Google's (Gemini), so the same expression is heard in voices of
// both kinds; a Google voice keeps an OpenAI one to fall back on when Google refuses (src/lib/tts.ts).
// scripts/generate-audio.mjs and /api/say use the same voices.
export const PARTNERS: Record<PartnerId, Partner> = {
  mia: {
    id: "mia",
    name: "Mia",
    kana: "ミア",
    about: "同じ授業をとっている友だち。本屋でバイトしている。",
    voice: "marin",
    persona: "Mia, a university student in Tokyo who takes classes with the learner and works part-time at a bookstore. Practical, warm, organized.",
  },
  leo: {
    id: "leo",
    name: "Leo",
    kana: "レオ",
    about: "デザインを学んでいる友だち。ものを作るのが好き。",
    voice: "google:Puck",
    fallback: "cedar",
    persona: "Leo, a design student and the learner's friend. Curious and honest, likes making things, and says what he really thinks.",
  },
  sam: {
    id: "sam",
    name: "Sam",
    kana: "サム",
    about: "気楽な友だち。食べることと山歩きが好き。",
    voice: "ash",
    persona: "Sam, the learner's laid-back friend, who loves food and the outdoors and is happy to go along with good ideas.",
  },
  nora: {
    id: "nora",
    name: "Nora",
    kana: "ノラ",
    about: "サークルの先輩。はっきりものを言う。",
    voice: "google:Kore",
    fallback: "nova",
    persona: "Nora, an older student in the learner's club. Friendly and direct, a bit of a planner.",
  },
};

/** The voice of the learner's possible answers (a scene's samples). */
export const YOU_VOICE = "alloy";

export const VOICES: readonly string[] = [...Object.values(PARTNERS).map((p) => p.voice), YOU_VOICE];

export function voiceOf(who: SpeakerId): string {
  return who === "you" ? YOU_VOICE : PARTNERS[who].voice;
}

/** The OpenAI voice a Google voice falls back on (null for an OpenAI voice). */
export function fallbackOf(voice: string): string | null {
  return Object.values(PARTNERS).find((p) => p.voice === voice)?.fallback ?? null;
}

export const THEMES: Record<ThemeId, string> = {
  plan: "予定を合わせる",
  make: "作っているもの",
  decide: "二人で決める",
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
