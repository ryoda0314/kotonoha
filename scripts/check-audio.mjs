// Hears the prepared clips back (OpenAI's transcription: hearing only, it voices nothing) and lists every line whose
// clip does not say its text word for word. Gemini now and then adds a word of its own to a chatty line ("Uh", "Nah"),
// drops or blurs one, and a score of likeness lets "He looked" heard as "you looked" pass: words are compared one by
// one instead, after punctuation, accents ("café"), numbers ("40" and "forty"), "Mt.", short forms ("either's" for
// "either is") and the way friends say things ("wanna" for "want to", "sayin'" for "saying") are evened out.
// whisper-1 hears first, with no hint, word for word (a hint of the line before made the other model drop half a
// line). It also writes a breath before a line as "Ugh" or "Huh", so when it hears otherwise than the text,
// gpt-4o-transcribe gives a second opinion, and a line is listed only when both hear something else. A line listed is
// for a person to hear; when the clip is wrong, delete it and run scripts/generate-audio.mjs again for another take.
// With id prefixes, only the lines whose ids start with one of them are heard.
//   node --env-file=.env.local scripts/check-audio.mjs [id prefix ...]
import { readFileSync } from "node:fs";
import OpenAI, { toFile } from "openai";
import { allLines } from "../src/content/index.ts";

const AT_ONCE = 4;
const prefixes = process.argv.slice(2);
const manifest = JSON.parse(readFileSync("src/content/audio.json", "utf8"));

// How friends say a few things, heard back as they are said: the same words as written.
const SAID = { wanna: "want to", gonna: "going to", kinda: "kind of", gotta: "got to", ya: "you", cannot: "can not" };

const UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const spelled = (n) => (n < 20 ? UNITS[n] : n < 100 ? `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${UNITS[n % 10]}` : ""}` : String(n));

/** The words of a line, evened out: lower case, no punctuation or accents, numbers spelled, "Mt." as "mount", short
 * forms written out ("it's" as "it is", the same on both sides, so a possessive matches itself), "-in'" as "-ing",
 * "wanna" as "want to". */
function wordsIn(text) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\bmt\./g, "mount")
    .replace(/\ba\.m\./g, "am")
    .replace(/\bp\.m\./g, "pm")
    .replace(/(\d+)/g, (d) => ` ${spelled(Number(d))} `)
    .replace(/\bwhat'd\b/g, "what did")
    .replace(/\bcan't\b/g, "can not")
    .replace(/\bwon't\b/g, "will not")
    .replace(/n't\b/g, " not")
    .replace(/'re\b/g, " are")
    .replace(/'m\b/g, " am")
    .replace(/'ll\b/g, " will")
    .replace(/'ve\b/g, " have")
    .replace(/'s\b/g, " is")
    .replace(/'d\b/g, " would")
    .replace(/([a-z])in'(?![a-z])/g, "$1ing")
    .replace(/[^a-z' ]+/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .flatMap((w) => (SAID[w] ?? w).split(" "))
    .filter(Boolean);
}

const client = new OpenAI();
const lines = allLines().filter(({ line }) => !prefixes.length || prefixes.some((p) => line.id.startsWith(p)));

async function heard(file, model) {
  const r = await client.audio.transcriptions.create({
    file: await toFile(readFileSync(`public/audio/${file}`), file, { type: "audio/mpeg" }),
    model,
    language: "en",
  });
  return r.text.trim();
}

const queue = [...lines];
const off = [];
async function worker() {
  for (let item = queue.shift(); item; item = queue.shift()) {
    const { line } = item;
    const file = manifest[line.id];
    if (!file) {
      off.push(`${line.id}: no clip`);
      continue;
    }
    const text = wordsIn(line.text).join(" ");
    const first = await heard(file, "whisper-1");
    if (wordsIn(first).join(" ") === text) continue;
    const second = await heard(file, "gpt-4o-transcribe");
    if (wordsIn(second).join(" ") === text) continue;
    off.push(`${line.id}: "${line.text}"\n    whisper: "${first}"\n    gpt-4o:  "${second}"`);
  }
}
await Promise.all(Array.from({ length: AT_ONCE }, worker));
for (const o of off.sort()) console.log(o);
console.log(`${lines.length} clips heard, ${off.length} to listen to`);
if (off.length) process.exitCode = 1;
