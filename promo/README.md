# ことのは — promotional film

A film of the app, 1920×1080 at 30 fps, made with Remotion 4 (its own project, apart from the app), in two versions:

- `Promo`: captions only, about 77 seconds (`out/kotonoha-promo.mp4`).
- `PromoNarration`: the same with a Japanese narration, about 100 seconds (`out/kotonoha-promo-narration.mp4`).
  Each step lasts as long as what is said in it. The narration never sits on an English voice.

It follows one expression's way, the design's own example (`../english-learning-system.md`), on the app's screens with
a plain sentence beside each step:

| | On the screen | What the film says |
|---|---|---|
| 出会う | make-email falls in line by line, in Leo's and Mia's voices; its expressions are lit once it has fallen | — |
| | the empty field | 読めば、分かる。なのに、言おうとすると出てこない。 |
| | the icon, three drops falling into its rain | ことのは / 借りた言葉が、自分の言葉になるまで。 |
| 3つの入口 | 出会う・話す・場面で言う; 場面で言う is taken | そのときの気分で、どこからでも。 |
| 場面で言う | Nora: "A few of us are going out tonight. You in?"; the learner types "I 今日は出かける気分じゃない. I just want to 家でゆっくりする." | 英語が出てこないところは、日本語のままで。 |
| | the corrected sentence, changes marked (the app's `diff.ts`) | 意図を保ったまま、英語に直す。 |
| | Nora answers its content | 相手は、中身に返事をする。 |
| | 今回英語で言えなかったところ / また使えるフレーズ | 直した文から、二つが残る。 |
| | feel like opened: ほかの言い方, 別の場面で | 正解は、一つじゃない。 |
| | これで言ってみる: "I feel like watching a movie tonight." | 借りた表現で、言ってみる。 |
| 話す | days later Mia says "I don't feel like cooking tonight." (violet); the learner answers with it on their own | 別の会話の中で、また出会う。/ 今度は、自分から。 |
| 自分 | できたこと | できたことが、残る。 |
| | the name again, はじめる | 借りた言葉が、自分の言葉になるまで。 |

## Making it

```bash
cd promo
npm install
npm run assets     # the app's clips and icon, the partners' replies voiced (../.env.local), the fonts (Python fontTools)
npm run narration  # the narration, voiced by Gemini TTS (../.env.local)
npm run music      # music and small sounds for each version, timed to it (Python with numpy)
npm run studio     # to watch while changing it
npm run render              # out/kotonoha-promo.mp4
npm run render:narration    # out/kotonoha-promo-narration.mp4
npm run stills -- 300 1240                       # single frames to look at, in out/stills
npm run stills -- --id PromoNarration 300 1240   # of the narrated version
```

- The screens are drawn again from the app's CSS and copy (`src/ui.tsx`, `src/scenes/`). When the app's look or words
  change, change them here too.
- Every moment is placed from the clips' own lengths (`src/timeline.ts`, from `src/audio.json` and
  `src/narration.json`). Without the narration, every moment is where it was before the narration existed. After
  changing a line, a narration or a typed sentence, run `assets` or `narration`, then `music` (the music lands its last
  chord on the end card), then render.
- The fonts are the app's (IBM Plex Sans, IBM Plex Sans JP, Shippori Mincho), cut down to the characters of `src/`
  so every page of a render loads them at once. Whole, the Japanese faces once held a page past its time limit. After
  changing any words, run `npm run assets` again.
- The prepared lines are the app's own clips. The partners' replies are voiced as `/api/say` voices them, in each
  partner's voice (Nora: Gemini Kore, Mia: OpenAI marin), and kept in `public/voice/`. The music and the small sounds
  are synthesized by `scripts/music.py`, so nothing in the film belongs to anyone else.
- Levels: the voices and the narration are lifted to about -16 LUFS. The music sits about -22 on its own and some
  14 dB lower under anyone speaking (`src/Promo.tsx`).
- What it shows keeps to `../CONCEPT.md`: no scores, streaks or badges; the record's words are the app's.

## The narration

- The script is `scripts/narration-lines.json` (音声文). It is kept apart from the captions (画面文): a caption is
  short; the narration says a little more, as speech does.
- Each line has a fixed ID (N01…N17) that names it, not its place; a removed line keeps its ID unused. N03 and N04
  (the name and its line) are said again on the end card.
- Voiced by `gemini-3.1-flash-tts-preview` on Vertex AI, the app's project and service account, as
  `../src/lib/tts.ts`. The narrator is Sulafat (warm), so it is not heard as Nora (Kore). The voice, the style line and
  the model are in the JSON; changing any of them makes every line again.
- Made as the gemini-tts-voice skill sets out:
  - the shortest lines first: 「ことのは。」 came out 0.92 s, so the style line is not read aloud;
  - the rate is read from the reply's mime type;
  - the silence before the first sound is cut by 10 ms windows;
  - the end gets a fade and a little silence;
  - each file was checked by `wavcheck.mjs`.
- Checked by machine only: header, rate, peak, the start, the length, and the levels in the mix. Whether a reading
  sounds right (accent, pace, warmth) needs a listen. To voice one line again:
  `npm run narration -- --only N07 --force`.
