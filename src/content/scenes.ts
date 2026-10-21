import type { Scene } from "./types.ts";

// 場面で言う: a friend's line and the learner's own circumstances, never a finished Japanese answer to translate. Any
// reply that fits is fine; the samples (opened only when the learner asks) each put something else forward.
export const SCENES: Scene[] = [
  {
    id: "scene-movie",
    theme: "plan",
    title: "映画の誘い",
    situation: "友だちのサムから誘われた。",
    line: { id: "scene-movie.line", who: "sam", text: "Want to see a movie tomorrow afternoon?", ja: "明日の午後、映画見に行かない？", marks: [{ expr: "want-to", text: "Want to" }] },
    mine: "その時間はバイト。でも、一緒に行きたい。",
    samples: [
      {
        text: "I have to work tomorrow afternoon. How about the evening?",
        puts: "夜を提案する",
        marks: [
          { expr: "have-to", text: "have to" },
          { expr: "how-about", text: "How about" },
        ],
      },
      { text: "I'd love to, but I have work. Are you free on Sunday?", puts: "別の日を聞く" },
      { text: "Let me check my shift and get back to you.", puts: "確かめてから返す", marks: [{ expr: "let-me-check", text: "Let me check" }] },
    ],
    brief: "You (Sam) just invited the learner to a movie tomorrow afternoon. React to their answer and keep the plan moving.",
  },
  {
    id: "scene-meeting",
    theme: "plan",
    title: "朝9時の打ち合わせ",
    situation: "サークルの先輩ノラから、打ち合わせの時間についてメッセージが来た。",
    line: { id: "scene-meeting.line", who: "nora", text: "Can we move tomorrow's meeting to 9 a.m.?", ja: "明日の打ち合わせ、朝9時にずらせる？" },
    mine: "1限に授業がある。10時半からなら出られる。",
    samples: [
      {
        text: "I have a class first period. Does ten thirty work for you?",
        puts: "事情を言って、代わりの時間を聞く",
        marks: [{ expr: "works-for", text: "work for you" }],
      },
      { text: "Nine is hard for me. How about ten thirty?", puts: "別の時間を出す", marks: [{ expr: "how-about", text: "How about" }] },
      {
        text: "I can't make it at nine, but I can join from ten thirty.",
        puts: "行けない時間と行ける時間を分けて言う",
        marks: [{ expr: "cant-make-it", text: "can't make it" }],
      },
    ],
    brief: "You (Nora) want to move tomorrow's club meeting to 9 a.m. because the room is taken later. You can be flexible.",
  },
  {
    id: "scene-station",
    theme: "plan",
    title: "6時に駅で",
    situation: "レオから、今夜の集まりについて聞かれた。",
    line: { id: "scene-station.line", who: "leo", text: "We're all meeting at the station at six. You coming?", ja: "6時に駅でみんな集まるけど、来る？" },
    mine: "行く。でも、20分くらい遅れそう。",
    samples: [
      {
        text: "Yeah! I'm running a bit late, though. Maybe twenty minutes.",
        puts: "遅れることを先に伝える",
        marks: [{ expr: "running-late", text: "running a bit late" }],
      },
      { text: "I'll be there, but go ahead without me. I'll catch up.", puts: "先に行ってもらう" },
      { text: "Yes, but can you wait for me? I'll be about twenty minutes late.", puts: "待ってほしいと頼む" },
    ],
    brief: "You (Leo) are meeting friends at the station at six to go to a birthday dinner together. React to the learner's answer.",
  },
  {
    id: "scene-party",
    theme: "plan",
    title: "今夜のパーティー",
    situation: "ミアから、急な誘いが来た。",
    line: {
      id: "scene-party.line",
      who: "mia",
      text: "We're having a little party tonight. Want to come?",
      ja: "今夜ちょっとしたパーティーをやるんだけど、来る？",
      marks: [{ expr: "want-to", text: "Want to" }],
    },
    mine: "明日の朝が早いから、今日は行けない。でも、誘ってくれてうれしい。",
    samples: [
      {
        text: "Thanks for asking! I can't make it tonight, though. Maybe another time?",
        puts: "お礼を言って、次につなぐ",
        marks: [
          { expr: "cant-make-it", text: "can't make it" },
          { expr: "another-time", text: "another time" },
        ],
      },
      { text: "I'd love to, but I have to get up early tomorrow.", puts: "事情を伝える", marks: [{ expr: "have-to", text: "have to" }] },
      { text: "Can I just come for an hour? I have an early morning.", puts: "少しだけ顔を出す" },
    ],
    brief: "You (Mia) are having a small party at your place tonight and just invited the learner. React to their answer.",
  },

  {
    id: "scene-what-app",
    theme: "make",
    title: "何ができるの？",
    situation: "ノラに、あなたが作っているものについて聞かれた。",
    line: { id: "scene-what-app.line", who: "nora", text: "I heard you're making something. What does it do?", ja: "何か作ってるんだって？何ができるの？" },
    mine: "自分が作っているもの（アプリでも、レポートでも、作品でも）を、ひとことで説明したい。",
    samples: [
      {
        text: "It's basically a timetable app. It lets you see which rooms are free.",
        puts: "ひとことで言ってから、できることを足す",
        marks: [
          { expr: "basically", text: "basically" },
          { expr: "lets-you", text: "lets you" },
        ],
      },
      {
        text: "I'm working on a study app. It lets you save phrases you hear.",
        puts: "取り組んでいることとして話す",
        marks: [
          { expr: "working-on", text: "working on" },
          { expr: "lets-you", text: "lets you" },
        ],
      },
      { text: "It's kind of like a diary, but for English.", puts: "似ているものにたとえる", marks: [{ expr: "kind-of", text: "kind of" }] },
    ],
    brief: "You (Nora) heard the learner is making something and you are curious. Ask about it, react with interest and give your honest opinion.",
  },
  {
    id: "scene-chat",
    theme: "make",
    title: "公開前の相談",
    situation: "いっしょにアプリを作っているレオからの相談。公開は来週。",
    line: { id: "scene-chat.line", who: "leo", text: "Can we add a chat feature before launch?", ja: "公開前に、チャット機能を入れられない？" },
    mine: "まだテストが終わっていない。入れるなら公開のあとにしたい。",
    samples: [
      {
        text: "I'm not sure if we have time. Can we test it first?",
        puts: "迷いを伝えて、先にしたいことを頼む",
        marks: [
          { expr: "not-sure-if", text: "not sure if" },
          { expr: "can-we-first", text: "Can we test it first" },
        ],
      },
      {
        text: "Let's add it later. I'd rather launch first.",
        puts: "あとに回す",
        marks: [
          { expr: "lets-later", text: "Let's add it later" },
          { expr: "id-rather", text: "I'd rather" },
        ],
      },
      { text: "What if we launch without it and ask users if they want it?", puts: "別のアイデアを出す", marks: [{ expr: "what-if", text: "What if" }] },
    ],
    brief: "You (Leo) and the learner are making an app together and launch next week. You'd like a chat feature, but you can be convinced otherwise.",
  },
  {
    id: "scene-confusing",
    theme: "make",
    title: "分かりにくいボタン",
    situation: "サムが、あなたの試作品を試してくれた。",
    line: {
      id: "scene-confusing.line",
      who: "sam",
      text: "I tried your prototype. Honestly, the buttons were kind of confusing.",
      ja: "試作品さわったよ。正直、ボタンがちょっと分かりにくかった。",
      marks: [{ expr: "kind-of", text: "kind of" }],
    },
    mine: "言ってくれて助かる。どのボタンが分かりにくかったか知りたい。",
    samples: [
      { text: "Thanks for telling me! Which button confused you?", puts: "お礼を言って、具体的に聞く" },
      {
        text: "That really helps. Would it be okay if I watched you use it?",
        puts: "使うところを見せてもらう",
        marks: [{ expr: "would-it-be-okay", text: "Would it be okay if" }],
      },
      {
        text: "Good to know. To be honest, I keep changing them.",
        puts: "自分の事情も正直に話す",
        marks: [
          { expr: "to-be-honest", text: "To be honest" },
          { expr: "keep-ing", text: "keep changing" },
        ],
      },
    ],
    brief: "You (Sam) tried the learner's app prototype. The two buttons at the bottom of the first screen looked the same and you pressed the wrong one twice. Be specific and kind.",
  },
  {
    id: "scene-poster",
    theme: "make",
    title: "締め切りは明日",
    situation: "ミアと、文化祭のポスターを作っている。",
    line: {
      id: "scene-poster.line",
      who: "mia",
      text: "The poster's due tomorrow. Should we redo the whole design?",
      ja: "ポスター、明日締め切りだよ。デザインを全部やり直す？",
    },
    mine: "全部やり直す時間はない。完璧じゃなくていいから、文字だけ直したい。",
    samples: [
      { text: "It doesn't have to be perfect. Let's just fix the text.", puts: "完璧でなくていいと伝える", marks: [{ expr: "doesnt-have-to", text: "doesn't have to be" }] },
      { text: "I don't think we have time. What if we only change the title?", puts: "範囲をしぼる案を出す", marks: [{ expr: "what-if", text: "What if" }] },
      {
        text: "The thing is, we only have tonight. I think we should keep the design.",
        puts: "事情を言ってから、意見を言う",
        marks: [
          { expr: "the-thing-is", text: "The thing is" },
          { expr: "i-think-we-should", text: "I think we should" },
        ],
      },
    ],
    brief: "You (Mia) and the learner are making a poster for the school festival, due tomorrow. You're not happy with the design and wonder about redoing it.",
  },

  {
    id: "scene-coffee",
    theme: "decide",
    title: "授業のあとのコーヒー",
    situation: "レオに誘われた。",
    line: { id: "scene-coffee.line", who: "leo", text: "Want to grab coffee after class?", ja: "授業のあと、コーヒーでもどう？", marks: [{ expr: "want-to", text: "Want to" }] },
    mine: "コーヒーより、先に何か食べたい。お昼を食べていない。",
    samples: [
      {
        text: "Coffee sounds good, but I'd rather get some food first.",
        puts: "希望を比べて伝える",
        marks: [
          { expr: "sounds-good-but", text: "sounds good, but" },
          { expr: "id-rather", text: "I'd rather" },
        ],
      },
      {
        text: "I'm starving. Want to grab dinner instead?",
        puts: "自分の状態から、提案へ進める",
        marks: [
          { expr: "want-to", text: "Want to" },
          { expr: "instead", text: "instead" },
        ],
      },
      {
        text: "Can we get something to eat first? I haven't had lunch.",
        puts: "お願いと理由を組み合わせる",
        marks: [{ expr: "can-we-first", text: "Can we get something to eat first" }],
      },
    ],
    brief: "You (Leo) just suggested coffee after class. You're flexible and a little hungry yourself.",
  },
  {
    id: "scene-going-out",
    theme: "decide",
    title: "今夜は出かける？",
    situation: "ノラから誘われた。",
    line: { id: "scene-going-out.line", who: "nora", text: "A few of us are going out tonight. You in?", ja: "今夜何人かで出かけるけど、来る？" },
    mine: "今日は出かける気分じゃない。家でゆっくりしたい。",
    samples: [
      { text: "I don't really feel like going out today.", puts: "今の気分を伝える", marks: [{ expr: "feel-like", text: "feel like going" }] },
      { text: "I'd rather stay in today.", puts: "出かけるのと比べて、家で過ごしたいと伝える", marks: [{ expr: "id-rather", text: "I'd rather" }] },
      {
        text: "I think I'll just stay home and take it easy.",
        puts: "家で過ごす判断として伝える",
        marks: [
          { expr: "i-think-ill-just", text: "I think I'll just" },
          { expr: "take-it-easy", text: "take it easy" },
        ],
      },
    ],
    brief: "You (Nora) are going out for dinner and maybe karaoke with a few club members tonight and invited the learner. Respect their answer.",
  },
  {
    id: "scene-dinner",
    theme: "decide",
    title: "ピザかタイ料理か",
    situation: "サムと夕飯を決める。",
    line: {
      id: "scene-dinner.line",
      who: "sam",
      text: "Pizza or Thai tonight? I'm fine with either.",
      ja: "今夜、ピザとタイ料理どっちにする？ぼくはどっちでもいい。",
      marks: [{ expr: "fine-with-either", text: "fine with either" }],
    },
    mine: "きのうピザを食べた。タイ料理がいい。",
    samples: [
      { text: "I had pizza yesterday, so I'd rather have Thai.", puts: "理由をつけて希望を言う", marks: [{ expr: "id-rather", text: "I'd rather" }] },
      { text: "Let's go with Thai. I had pizza last night.", puts: "先に決めてしまう", marks: [{ expr: "go-with", text: "go with" }] },
      { text: "Thai sounds good. Pizza two days in a row is too much.", puts: "片方に乗って、理由を足す" },
    ],
    brief: "You (Sam) are deciding dinner with the learner: pizza or Thai. You really are fine with either; once it's decided, move on to where or when.",
  },
  {
    id: "scene-poster-idea",
    theme: "decide",
    title: "どっちの案にする？",
    situation: "ミアとポスターの案を決めている。あなたにも案がある。",
    line: {
      id: "scene-poster-idea.line",
      who: "mia",
      text: "Let's just go with my idea for the poster. It's faster.",
      ja: "ポスターは私の案でいこうよ。そのほうが早いし。",
      marks: [{ expr: "go-with", text: "go with" }],
    },
    mine: "早いのは分かる。でも、2つの案を見比べてから決めたい。",
    samples: [
      {
        text: "Your idea sounds good, but can we compare both first?",
        puts: "受け止めてから、頼む",
        marks: [
          { expr: "sounds-good-but", text: "sounds good, but" },
          { expr: "can-we-first", text: "can we compare both first" },
        ],
      },
      { text: "I think we should look at both before we decide.", puts: "意見として言う", marks: [{ expr: "i-think-we-should", text: "I think we should" }] },
      { text: "It depends on what the others think. Let's ask them too.", puts: "条件しだいにして、ほかの人も入れる", marks: [{ expr: "depends-on", text: "depends on" }] },
    ],
    brief: "You (Mia) want to use your own poster idea because it's quicker to finish, but you'll listen if the learner has a good reason.",
  },
];
