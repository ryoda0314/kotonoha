// Voices every prepared line (src/content) with OpenAI's speech model and keeps the clips in public/audio, named by
// line id and a hash of voice and text: a line whose text changes gets a new clip, and the old one is removed.
// src/content/audio.json maps each line id to its clip; the app plays lines without one in the browser's voice.
//   node --env-file=.env.local scripts/generate-audio.mjs [--dry-run]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { allLines } from "../src/content/index.ts";
import { TTS_INSTRUCTIONS, TTS_MODEL } from "../src/lib/speech.ts";

const DIR = "public/audio";
const MANIFEST = "src/content/audio.json";
const AT_ONCE = 4;
const dryRun = process.argv.includes("--dry-run");

export const clipName = (id, voice, text) =>
  `${id}.${createHash("sha256").update(`${voice}\n${text}`).digest("hex").slice(0, 8)}.mp3`;

async function speak(text, voice) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: TTS_MODEL, voice, input: text, instructions: TTS_INSTRUCTIONS, response_format: "mp3" }),
    });
    if (res.ok) return new Uint8Array(await res.arrayBuffer());
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`${res.status} ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
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
if (todo.length && !process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");

let done = 0;
let failed = 0;
const queue = [...todo];
async function worker() {
  for (let item = queue.shift(); item; item = queue.shift()) {
    const { line, voice } = item;
    const name = clipName(line.id, voice, line.text);
    try {
      writeFileSync(`${DIR}/${name}`, await speak(line.text, voice));
      manifest[line.id] = name;
      done++;
      if (done % 20 === 0) console.log(`  ${done} / ${todo.length}`);
    } catch (err) {
      failed++;
      console.error(`  ${line.id}: ${err.message}`);
    }
  }
}
await Promise.all(Array.from({ length: AT_ONCE }, worker));

// Forget lines that no longer exist, and remove clips nothing points to.
const ids = new Set(lines.map(({ line }) => line.id));
for (const id of Object.keys(manifest)) if (!ids.has(id)) delete manifest[id];
const kept = new Set(Object.values(manifest));
for (const file of readdirSync(DIR)) if (file.endsWith(".mp3") && !kept.has(file)) unlinkSync(`${DIR}/${file}`);

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`voiced ${done}, failed ${failed}`);
if (failed) process.exitCode = 1;
