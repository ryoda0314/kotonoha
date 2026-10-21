import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanOther, cleanTurn, coreRange, spansIn, turnPrompt } from "../src/lib/turn-core.ts";
import { exprById } from "../src/content/index.ts";

const sign = (t) => `sig:${t.length}`;

function req(input, extra = {}) {
  return { kind: "scene", ref: "scene-movie", partner: "sam", history: [], input, due: [], noticed: [], ...extra };
}

function raw(over) {
  return { ask: "", options: [], corrected: "", note: "", gaps: [], phrases: [], reply: "Sounds good.", reply_ja: "いいね。", reply_exprs: [], ...over };
}

test("the learner's own words decide whose an expression is, not the model's word", () => {
  const out = cleanTurn(
    raw({
      corrected: "I have to work tomorrow afternoon. How about the evening?",
      phrases: [
        // The model returned whole sentences and said the AI brought them in.
        { text: "I have to work tomorrow afternoon.", form: "I have to 〜", label: "", expr: "have-to", learner_had_it: false },
        { text: "How about the evening?", form: "How about 〜?", label: "", expr: "how-about", learner_had_it: false },
      ],
      gaps: [
        { ja: "バイト", en: "work" },
        { ja: "夜", en: "the evening" },
        { ja: "昼", en: "noon" }, // not in what the learner wrote
      ],
    }),
    req("I have to バイト tomorrow afternoon. How about 夜?"),
    sign,
  );
  assert.deepEqual(
    out.result.phrases.map((p) => [p.key, p.text, p.origin]),
    [
      ["have-to", "have to", "mine"],
      ["how-about", "How about", "mine"],
    ],
  );
  assert.deepEqual(out.result.gaps, [
    { ja: "バイト", en: "work" },
    { ja: "夜", en: "the evening" },
  ]);
  assert.equal(out.reply.sig, sign("Sounds good."));
});

test("an expression the AI put in is the AI's, even when the model says otherwise", () => {
  const out = cleanTurn(
    raw({
      corrected: "I don't feel like going out today. I just want to take it easy at home.",
      phrases: [
        { text: "feel like going out", form: "", label: "", expr: "feel-like", learner_had_it: true },
        { text: "take it easy", form: "", label: "", expr: "take-it-easy", learner_had_it: false },
      ],
    }),
    req("I 今日は出かける気分じゃない. I just want to 家でゆっくりする."),
    sign,
  );
  assert.deepEqual(
    out.result.phrases.map((p) => [p.key, p.origin]),
    [
      ["feel-like", "ai"],
      ["take-it-easy", "ai"],
    ],
  );
});

test("a noticed expression in the learner's own words is kept even when the model did not name it", () => {
  const out = cleanTurn(
    raw({ corrected: "I'd rather go on Friday.", phrases: [] }),
    req("I'd rather go on Friday", { noticed: ["id-rather", "feel-like"] }),
    sign,
  );
  assert.deepEqual(out.result.phrases.map((p) => [p.key, p.text, p.origin]), [["id-rather", "I'd rather", "mine"]]);
  assert.equal(out.result.natural, true);
});

test("phrases that are whole sentences or not in the sentence are dropped", () => {
  const out = cleanTurn(
    raw({
      corrected: "I'm making an app for learning English with my friends at school.",
      phrases: [
        { text: "I'm making an app for learning English with my friends at school.", form: "x", label: "", expr: "", learner_had_it: false },
        { text: "fall like rain", form: "fall like 〜", label: "", expr: "", learner_had_it: false },
        { text: "an app for learning English", form: "an app for 〜", label: "", expr: "", learner_had_it: false },
      ],
    }),
    req("I make app for learning english with my friends at school"),
    sign,
  );
  assert.deepEqual(out.result.phrases.map((p) => p.text), ["an app for learning English"]);
  assert.equal(out.result.phrases[0].origin, "mine");
});

test("a question back comes through only with real choices, and not twice", () => {
  const ask = raw({ ask: "どちらの意味？", options: ["今夜", "明日の夜"] });
  assert.ok(cleanTurn(ask, req("夜 is ok"), sign).ask);
  assert.throws(() => cleanTurn({ ...ask, options: ["今夜"] }, req("夜 is ok"), sign));
  // After the learner has chosen, the model must answer.
  assert.throws(() => cleanTurn(ask, req("夜 is ok", { intent: "今夜" }), sign));
});

test("highlights narrow to an expression's fixed words, wherever the model put them", () => {
  const text = "Same, ramen sounds perfect. I’m free tonight—want to go to that place near the station?";
  const [s] = spansIn(text, [{ expr: "want-to", text: "want to go to that place near the station?" }]);
  assert.equal(text.slice(s.start, s.end), "want to");
  assert.deepEqual(spansIn(text, [{ expr: "id-rather", text: "ramen" }]), []);
  const can = "Sure. Can we test it first, though?";
  const r = coreRange(can, exprById("can-we-first"));
  assert.equal(can.slice(r.start, r.end), "Can we test it first");
});

test("other ways never repeat what the learner said", () => {
  const out = cleanOther(
    { options: [{ text: "I'd rather stay in.", puts: "", tone: "", exprs: [] }, { text: "I think I'll just stay home today.", puts: "判断", tone: "", exprs: [{ expr: "i-think-ill-just", text: "I think I'll just" }] }] },
    "I'd rather stay in",
    sign,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].exprs[0].expr, "i-think-ill-just");
});

test("the prompt names the partner and the scene, and offers what is due", () => {
  const { system, user } = turnPrompt(req("Sure!", { due: ["feel-like"], history: [{ role: "them", text: "Want to see a movie?" }] }));
  assert.match(system, /You are Sam/);
  assert.match(system, /movie tomorrow afternoon/);
  assert.match(system, /Met before.*feel like/);
  assert.match(user, /Sam: Want to see a movie\?/);
});

test("a reply is voiced sentence by sentence, short ones joined, abbreviations kept whole", async () => {
  const { sentencesOf } = await import("../src/lib/text.ts");
  assert.deepEqual(sentencesOf("Yeah. The beach sounds fun, but I want to keep it cheap. How about Enoshima?"), [
    "Yeah. The beach sounds fun, but I want to keep it cheap.",
    "How about Enoshima?",
  ]);
  assert.deepEqual(sentencesOf("Mt. Takao gets crowded on weekends. Let's go early, around 7 a.m. or so."), [
    "Mt. Takao gets crowded on weekends.",
    "Let's go early, around 7 a.m. or so.",
  ]);
  assert.deepEqual(sentencesOf("Sounds good to me!"), ["Sounds good to me!"]);
  const text = "That sounds fun. If the sentences fall like rain, users could tap one to save it. What kind of sentences are you using?";
  assert.equal(sentencesOf(text).join(" "), text);
  const out = cleanTurn(raw({ corrected: "Sure.", reply: text }), req("Sure"), sign);
  assert.equal(out.reply.parts.length, 3);
  assert.equal(out.reply.parts[1].sig, sign(out.reply.parts[1].text));
});
