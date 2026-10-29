// Voices every prepared line (src/content) in its speaker's voice and keeps the clips in public/audio, named by line id
// and a hash of voice and text: a line whose text or voice changes gets a new clip, and the old one is removed once
// nothing points to it. Every voice is a Google one ("google:Puck"): Gemini on Vertex AI, tidied, checked for pace and
// encoded as MP3 (src/lib/tts.ts). src/content/audio.json maps each line id to its clip; a line not voiced yet keeps its
// old clip, or plays in the browser's voice.
//   node --env-file=.env.local scripts/generate-audio.mjs [--dry-run]
// A clip's name also carries VOICING (src/lib/speech.ts): change it when the voicing itself changes.
// When Google's quota keeps refusing it stops politely; the same command later carries on where it stopped.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { allLines } from "../src/content/index.ts";
import { VOICING } from "../src/lib/speech.ts";
import { isQuota, speak } from "../src/lib/tts.ts";

const DIR = "public/audio";
const MANIFEST = "src/content/audio.json";
const AT_ONCE = 3;
const dryRun = process.argv.includes("--dry-run");

export const clipName = (id, voice, text) =>
  `${id}.${createHash("sha256").update(`${VOICING}\n${voice}\n${text}`).digest("hex").slice(0, 8)}.mp3`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A prepared line in exactly its own voice: retried while a quota or the network refuses. */
async function voiced(text, voice) {
  for (let attempt = 1; ; attempt++) {
    try {
      // A take is made again (up to three) when its pace is off.
      return (await speak(text, voice, { tries: 3 })).mp3;
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (isQuota(err) && attempt < 12) {
        await wait(10_000);
        continue;
      }
      if (/fetch failed|ECONNRESET|ETIMEDOUT|503|UNAVAILABLE|5\d\d/i.test(msg) && attempt < 4) {
        await wait(3000 * attempt);
        continue;
      }
      throw err;
    }
  }
}

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
mkdirSync(DIR, { recursive: true });
const lines = allLines();
const todo = lines.filter(({ line, voice }) => {
  const name = clipName(line.id, voice, line.text);
  return manifest[line.id] !== name || !existsSync(`${DIR}/${name}`);
});
console.log(`${lines.length} lines, ${todo.length} to voice`);
if (dryRun) process.exit(0);

let done = 0;
let failed = 0;
let refused = 0;
const queue = [...todo];
async function worker() {
  for (let item = queue.shift(); item && refused < 3; item = queue.shift()) {
    const { line, voice } = item;
    const name = clipName(line.id, voice, line.text);
    try {
      writeFileSync(`${DIR}/${name}`, await voiced(line.text, voice));
      manifest[line.id] = name;
      done++;
      refused = 0;
      if (done % 20 === 0) console.log(`  ${done} / ${todo.length}`);
    } catch (err) {
      failed++;
      if (isQuota(err)) refused++;
      console.error(`  ${line.id}: ${String(err?.message ?? err).slice(0, 160)}`);
    }
  }
}
await Promise.all(Array.from({ length: AT_ONCE }, worker));
if (refused >= 3) console.log("stopped: the quota keeps refusing. Run the same command later to carry on.");

// Forget lines that no longer exist, and remove clips nothing points to.
const ids = new Set(lines.map(({ line }) => line.id));
for (const id of Object.keys(manifest)) if (!ids.has(id)) delete manifest[id];
const kept = new Set(Object.values(manifest));
for (const file of readdirSync(DIR)) if (file.endsWith(".mp3") && !kept.has(file)) unlinkSync(`${DIR}/${file}`);

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`voiced ${done}, failed ${failed}, left ${todo.length - done}`);
if (done < todo.length) process.exitCode = 1;
