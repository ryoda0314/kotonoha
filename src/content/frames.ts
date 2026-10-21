import type { Frame } from "./types.ts";

// 話す: who the learner talks with and what is going on for them. The partner has their own plans, opinions and
// limits, so the conversation moves with what the learner decides instead of repeating questions.
export const FRAMES: Frame[] = [
  {
    id: "talk-plan",
    theme: "plan",
    title: "予定を合わせる",
    lead: "ミアが、今週どこかで会いたがっている。",
    partner: "mia",
    opener: {
      id: "talk-plan.open",
      who: "mia",
      text: "Hey! Are you free sometime this week? I really want to try the new café by the station.",
      ja: "ねえ、今週どこか空いてる？駅前の新しいカフェに行ってみたくて。",
    },
    brief:
      "You (Mia) want to go to the new café by the station with the learner sometime this week. Your week: classes on Monday and Wednesday mornings, bookstore shifts on Tuesday and Thursday evenings, Friday afternoon free, and you want Sunday to rest. Work out a time together: suggest options, react to the learner's schedule, and now and then bring in a small new wrinkle (your shift might change, the café is closed on Mondays, a friend might join).",
  },
  {
    id: "talk-make",
    theme: "make",
    title: "作っているものの話",
    lead: "デザインを学んでいるレオが、あなたの作っているものに興味がある。",
    partner: "leo",
    opener: {
      id: "talk-make.open",
      who: "leo",
      text: "So, what are you making these days? You always seem to be working on something.",
      ja: "で、最近は何を作ってるの？いつも何かに取り組んでるよね。",
    },
    brief:
      "You (Leo) are curious about what the learner is making (an app, a report, a club project, anything). React with real interest, share your own experience, give specific suggestions, and sometimes disagree politely and say why.",
  },
  {
    id: "talk-decide",
    theme: "decide",
    title: "二人で決める",
    lead: "サムと、週末の日帰り旅行の行き先を決める。",
    partner: "sam",
    opener: {
      id: "talk-decide.open",
      who: "sam",
      text: "Okay, we need to decide where to go this weekend. I'm thinking the mountains, but I'm open.",
      ja: "よし、週末どこに行くか決めないと。ぼくは山かなと思ってるけど、ほかでもいいよ。",
    },
    brief:
      "You (Sam) and the learner are planning a day trip this weekend. You lean toward hiking on Mt. Takao, but you're open. Your limits: about 5,000 yen, and back home by 8 p.m. Compare options with reasons, give your opinion, propose compromises, and move toward one decision. Good reasons can change your mind.",
  },
  {
    id: "talk-free",
    theme: "free",
    title: "自由に話す",
    lead: "サークルの先輩ノラと、話したいことを自由に。",
    partner: "nora",
    opener: { id: "talk-free.open", who: "nora", text: "Hey! How's your week going?", ja: "やあ！今週はどう？" },
    brief:
      "You (Nora) are chatting with the learner, a younger member of your club. Follow their topic. Share your own opinions, stories and circumstances, not only questions.",
  },
];
