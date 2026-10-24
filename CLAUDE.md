@AGENTS.md

# ことのは

Read [CONCEPT.md](CONCEPT.md) and the design it summarizes, [english-learning-system.md](english-learning-system.md),
before adding anything. Three ways in (出会う, 話す, 場面で言う) lead to the same operations: open an expression, see
other ways of saying and other scenes, try it in a sentence of one's own with Japanese mixed in, get it corrected with the
intent kept and answered by a friend, and meet the expression again elsewhere. No scores, no streaks, no badges, no forced
review, no grammar lessons. The sister apps are ことのあめ (`../polylinga`) and ことのおと (`../作品,app/chinese`); this one
borrows their look, their accounts and their way of keeping a record.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, plain CSS modules. Same versions as the sisters. `npm run dev` serves on
  port 3220.
- The learner's record (`State`, `src/lib/record.ts`) is on their device (`src/lib/store.ts`, localStorage key
  `english:v1`, every access guarded); signing in is optional. With a ことのあめ account (the same Supabase project, so the
  same accounts) it is also kept in `en_records`, one row per account (`supabase/migrations/`, RLS: only their own row),
  read and written from the browser as the learner with the anon key (`src/lib/sync.ts`, as ことのおと's). The two copies
  are merged, never overwritten (`mergeStates`). Everything of this app's in that project is prefixed `en_` (named for the
  language, not the app, so renaming the app changes nothing); never touch ことのあめ's `pl_`, ことのおと's `kn_` or the old
  app's tables, and do not create test users there (a trigger of the old app fires on `auth.users`).
- The prepared English is TypeScript data in `src/content/` (typed, checked by `tests/content.test.mjs`); its audio is
  static MP3 in `public/audio`, named by line id and a hash of voice and text, listed in `src/content/audio.json`.
- Voices (`src/content/cast.ts`, `src/lib/tts.ts`): Mia, Sam and the learner's samples speak in OpenAI's voices
  (gpt-4o-mini-tts); Leo and Nora in Google's (`google:Puck`, `google:Kore`: Gemini TTS on Vertex AI, ことのあめ's project
  and service account, `gemini-3.1-flash-tts-preview`, a model whose per-model quota neither ことのあめ's live 2.5 Pro
  voice nor ことのおと's 2.5 Flash scripts use). A Google take is tidied as ことのおと's clips are (`src/lib/pcm.ts`:
  leading silence cut to 20 ms, faded end, levelled) and made again when its pace is outside `PACE_RANGE`. A Google
  voice keeps its old OpenAI voice as `fallback`, which speaks a reply when Google refuses; prepared lines never fall
  back (a clip is named for its voice). OpenAI speech comes back as PCM and is tidied the same way, so the two kinds
  sound equally loud (all four voices within 0.2 dB) and start at once. A reply is voiced sentence by sentence
  (`parts`, each signed; `sentencesOf` in `text.ts`), all asked for at once and played in turn: Gemini needs 6 s or more
  for a whole reply, the first sentence is heard after about 3 s. A clip's name carries `VOICING` (`speech.ts`); clips
  are cached as immutable, so bump it whenever the voicing itself changes.
- AI is OpenAI, server-side only (`src/lib/ai.ts`), with no sign-in, so every route is limited per address and per server
  instance (`src/lib/limits.ts`, as ことのおと's `/api/hear`):
  - `/api/turn`: one sentence of the learner's. One call (`TALK_MODEL`, default gpt-5.5 at low reasoning effort) both
    corrects and answers as the partner. Chosen on the design's own examples: gpt-5.2 was slower, and gpt-5.4-mini and
    effort "none" changed the learner's meaning (夜 became "tonight" when the plan was for tomorrow).
  - `/api/other`: ほかの言い方 for a corrected sentence, or 別の場面で for a phrase the AI found; only when opened, kept in
    the record so each is asked once.
  - `/api/say`: voices English the AI wrote in the partner's voice (OpenAI or Google, see above), only with the
    signature the server gave that text (`src/lib/sign.ts`), so it cannot voice anything else. Prepared lines never come
    here.
  - `/api/hear`: what the learner said aloud (gpt-4o-transcribe, English with Japanese mixed in), as text to check before
    sending. The recording is not kept.

## The core (`src/lib`, pure, tested in `tests/`)

- `turn-core.ts`: the prompts and the checks on every answer before the learner sees it. The model's word is never taken
  for where something is: each Japanese part must be in what the learner wrote, each English piece in the sentence it is
  said to be in. Whether the learner's own words had a prepared expression is decided from their words (each expression's
  `core` pattern), never from the model's `learner_had_it`; a phrase the AI found counts as theirs when 80% of its words
  are in their sentence in order. A prepared expression the learner has noticed before is caught in their own words even
  when the model did not name it. Highlights are narrowed to an expression's fixed words. The corrected sentence and the
  reply are signed for `/api/say`.
- `record.ts`: the record. Its centre is the expression (`exprs`: key → events), not the sentence. Event kinds follow the
  design's 成長をどう判定するか: `met` (heard or read it: a conversation finished, a scene shown, a partner's reply),
  `looked` (opened it), `ai` (the AI put it into the learner's sentence), `borrowed` (a sample sent as it was), `remade`
  (used with it in front of them: これで言ってみる, or after opening samples), `own` (produced it themselves). `kindFor`
  decides from the turn's `support`. `dueKeys`: noticed, not yet used on their own since last supplied, and last met
  `RETURN_HOURS` ago or `RETURN_AFTER` activities ago; `pickNext` chooses the next conversation or scene holding those, then
  unseen ones. `grown`: an `own` use after a supported one (できたこと). `noticed(state, key, at)` lights the again violet
  only for what was noticed before that moment. Threads (`talk`, `scene`, `side` for 寄り道) keep their turns; the newest
  60 are kept (`bounded`).
- `text.ts`: comparing pieces of English (normalized, in order, coverage). `export.ts`: the whole record as one Markdown
  text for an AI of the learner's choice (学習の記録); no AI call. `diff.ts` is ことのあめ's word diff (punctuation-only
  edits are not lit).

## The app

- `/` intro (static). `/app` 出会う (`_meet/Meet.tsx`): a conversation falls in line by line with its voices; expressions
  are lit only after it has fallen (and violet if noticed before); chips open them. `/app/talk` 話す: four frames, each a
  partner with their own plans, then a conversation with まとめ. `/app/scene` 場面で言う: the partner's line and the
  learner's circumstances (never a finished Japanese answer); samples only when opened; after answering the scene goes
  on as a conversation. `/app/me` 自分: できたこと, counts (their own, never compared), and four views (expressions,
  Japanese parts, conversations, days); `/app/me/t/[id]` a conversation looked back on and carried on; `/app/me/export`;
  `/app/me/settings` (sound, speed, translations, the account, clearing the record). `/login`: ことのあめのアカウントでつなぐ.
  ことのあめでつなぐ (`src/lib/connect.ts`): off to ことのあめ's `/connect` (log in or sign up there), back to `/login`
  with a one-time token in the fragment, spent with `verifyOtp` (`signInWithKotonoame`) only when the random state kept
  on this device before leaving comes back with it (a link carrying someone else's token cannot sign the learner in).
- `_parts/ExprHost.tsx`: one sheet over any screen for an expression (a prepared one: はたらき, ほかの言い方 from its
  near-intent groups, 別の場面で, where else it appears; a phrase the AI found: its uses, made once) and これで言ってみる,
  a side conversation (`side` thread from that place) that leaves the screen underneath as it was.
- `_parts/Conversation.tsx`: turns. The learner's shows the corrected sentence with changes marked; 直したところ,
  日本語で補ったところ, フレーズ and ほかの言い方 are folded under one line, so the conversation can just go on.
  A sentence whose answer never came back (the page was left) can be sent again; a question back from the AI offers its
  readings. `_parts/Composer.tsx`: the field (draft kept per place), the microphone, send. Its buttons keep the focus in
  the field: on a phone a blur first swaps the tab bar and the composer, and the press would land elsewhere.
- `src/components/audio.ts`: one sound at a time, prepared clips by id, AI text through `/api/say` (fetched once), the
  browser's voice when nothing else plays. `recorder.ts`: the microphone (AudioWorklet), stops itself after a pause.

## Content (`src/content`)

- `expressions.ts` (32, each with `core`, a plain `label`, what it `does`, near-intent `groups`, three `examples` with
  what changed), `dialogues.ts` (12 for 出会う), `scenes.ts` (12, with samples and the partner's `brief`), `frames.ts`
  (4 for 話す), `cast.ts` (the four friends and their voices). Marks name an expression and the exact text of its fixed
  words in the line. Every expression must turn up in two or more conversations or scenes.
- After changing lines or voices: `node --env-file=.env.local scripts/generate-audio.mjs` (only new or changed lines are
  voiced; when Google's quota keeps refusing it stops, and the same command carries on later; old
  clips are removed), then `npm test`.

## The promotional film (`promo/`)

- Its own Remotion 4 project (its own package.json; left out of the app's tsconfig and eslint), described in
  `promo/README.md`. It follows feel like's way through the app, one plain sentence beside each step. Two versions:
  `Promo` (captions only) and `PromoNarration` (Japanese narration by Gemini TTS, `promo/scripts/narration-lines.json`,
  never over an English voice).
- It draws the app's screens again from their CSS and copy (`promo/src/ui.tsx`, `promo/src/scenes/`): when the look or
  the words change, change them there too. Every moment is placed from the clips' lengths (`promo/src/timeline.ts`).
- In `promo/`:
  - `npm run assets`: the app's clips and icon, the partners' replies voiced through `src/lib/tts.ts`, the fonts cut to
    the film's characters.
  - `npm run narration`: the narration.
  - `npm run music`: synthesized, timed to each version.
  - `npm run render` / `npm run render:narration`: written to `promo/out/`.
  - `npm run stills -- [--id PromoNarration] <frame> ...`: frames to look at.

## Commands

- `npm run dev` / `npm run build` / `npm run lint` / `npm test` (node:test, `tests/*.test.mjs`)
- `npx tsc --noEmit` (run `npx next typegen` first after adding routes)
- `node --env-file=.env.local scripts/generate-audio.mjs [--dry-run]`
- `node --env-file=../polylinga/.env.local ../polylinga/scripts/migrate.mjs supabase/migrations/<file>.sql`: apply one
  migration to ことのあめ's database, in a transaction (ことのあめ's runner and connection settings).

## Conventions

- UI copy in `src/lib/i18n/ja.ts`, plain, from the learner's side.
- Colors and type are the sisters' (`src/app/globals.css`): paper, ink, one accent, `--again` violet for what comes back.
  No gradients, emoji or shadows inside the app; hairlines separate. Japanese wraps between phrases and a paragraph does
  not end on a lone word (`body`: `word-break: auto-phrase`, `text-wrap: pretty`); a lit expression's tint does not move
  the words around it (`.hl-mark`/`.hl-again`: padding with the same margin back), as the promotional film shows them.
- The app icon is the one picture with gradients: the image the maker chose (`design/icon-source.png`, a cloud raining
  onto two leaves). `python design/make-icons.py design/icon-source.png .` (Pillow, numpy) cuts its card out of the white
  ground and the grey shadow around it, and writes `public/icons/` (transparent corners; maskable on a full square),
  `src/app/icon.png`, `apple-icon.png`, `favicon.ico`. `Logo` shows `icon-192.png`.
- Pure modules imported by tests and scripts use `.ts` extensions in their imports (Node strips types).
- Phone first; from 720 px the tabs become a column on the left (BottomNav, the sisters' CSS).
