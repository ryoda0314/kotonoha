// The film's narration, voiced by Gemini TTS on Vertex AI (the app's project and service account, as
// ../src/lib/tts.ts), from scripts/narration-lines.json. Writes public/narration/<id>.<hash>.wav and src/narration.json
// (each clip's file and length), which src/timeline.ts places so that no narration sits on an English voice.
//   node --env-file=../.env.local scripts/narration.mjs [--only N03,N04] [--force] [--dry-run]     (npm run narration)
// Made as the gemini-tts-voice skill sets out:
//   - Try the shortest line first: if the style line were read aloud, 「ことのは。」 would run for seconds.
//   - The silence before the first sound is cut by 10 ms windows, not sample by sample (a click at the start would stop
//     the cut and leave the silence), keeping 20 ms so the first consonant stays.
//   - The end is not chopped: a margin after the last sound, a fade, then a little silence.
//   - Brought to the level of the app's clips (pcm.ts: about -20 dBFS over the loud part), so the narration and the
//     English voices sit together.
//   - A line is made again only when its text, voice, style or model changes (the hash in its name); one that already
//     exists is skipped, so after a refusal the same command carries on.
import { GoogleGenAI } from "@google/genai";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";

const spec = JSON.parse(readFileSync("scripts/narration-lines.json", "utf8"));
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const only = opt("only")?.split(",").map((s) => s.trim());
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const DIR = "public/narration";
const FLOOR = 0.006; // silence: below 0.6% of full scale (as pcm.ts and the skill)
const LEAD_MS = 20;
const TAIL_KEEP_MS = 150;
const FADE_MS = 150;
const AFTER_MS = 120;
const TARGET_RMS = 0.1; // pcm.ts TARGET_RMS
const PEAK = 0.89;
const GAP_MS = 1500;

let client = null;
function vertex() {
  if (client) return client;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!raw || !project) throw new Error("no Google credentials (run with --env-file=../.env.local)");
  let credentials;
  try {
    credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    credentials = JSON.parse(raw.replace(/\\n/g, "\n"));
  }
  client = new GoogleGenAI({ vertexai: true, project, location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1", googleAuthOptions: { credentials } });
  return client;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** One take as samples in -1..1 and its rate, which is read from the mime type, never assumed. */
async function take(text) {
  const r = await vertex().models.generateContent({
    model: spec.model,
    contents: [{ role: "user", parts: [{ text: `${spec.style}\n\n${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { languageCode: spec.language, voiceConfig: { prebuiltVoiceConfig: { voiceName: spec.voice } } },
    },
  });
  const part = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const mime = part?.inlineData?.mimeType ?? "";
  if (!part || !/pcm|l16/i.test(mime)) throw new Error(`no audio (${mime || "nothing"})`);
  const rate = Number(mime.match(/rate=(\d+)/i)?.[1]) || 24000;
  const bytes = Buffer.from(part.inlineData.data, "base64");
  const samples = new Float32Array(Math.floor(bytes.length / 2));
  for (let i = 0; i < samples.length; i++) samples[i] = bytes.readInt16LE(i * 2) / 32768;
  return { samples, rate };
}

async function takeWithRetry(text, label) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await take(text);
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (/429|RESOURCE_EXHAUSTED|quota|5\d\d|UNAVAILABLE|fetch failed|ECONNRESET|ETIMEDOUT|no audio/i.test(msg) && attempt < 4) {
        const back = GAP_MS * 2 ** attempt;
        console.log(`  retry ${attempt + 1}/4 in ${back / 1000}s ${label}: ${msg.slice(0, 100)}`);
        await wait(back);
        continue;
      }
      throw err;
    }
  }
}

/** RMS of each 10 ms window. */
function windows(s, rate) {
  const win = Math.max(1, Math.round(rate * 0.01));
  const out = [];
  for (let i = 0; i + win <= s.length; i += win) {
    let sum = 0;
    for (let k = i; k < i + win; k++) sum += s[k] * s[k];
    out.push(Math.sqrt(sum / win));
  }
  return { win, rms: out };
}

function tidy(s, rate) {
  const { win, rms } = windows(s, rate);
  const first = rms.findIndex((r) => r >= FLOOR);
  if (first < 0) throw new Error("silent take");
  let last = rms.length - 1;
  while (last > first && rms[last] < FLOOR) last--;
  const start = Math.max(0, first * win - Math.round((rate * LEAD_MS) / 1000));
  const end = Math.min(s.length, (last + 1) * win + Math.round((rate * TAIL_KEEP_MS) / 1000));
  const body = s.slice(start, end);

  // Level by the loud part, as pcm.ts does, with the peak kept under PEAK.
  const loud = windows(body, rate).rms;
  const top = Math.max(...loud);
  const kept = loud.filter((r) => r > top * 0.1);
  const level = Math.sqrt(kept.reduce((a, r) => a + r * r, 0) / Math.max(1, kept.length));
  let peak = 0;
  for (const v of body) peak = Math.max(peak, Math.abs(v));
  const gain = Math.min(TARGET_RMS / Math.max(level, 1e-6), PEAK / Math.max(peak, 1e-6));

  const fade = Math.min(body.length, Math.round((rate * FADE_MS) / 1000));
  const out = new Int16Array(body.length + Math.round((rate * AFTER_MS) / 1000));
  for (let i = 0; i < body.length; i++) {
    const fromEnd = body.length - 1 - i;
    out[i] = Math.round(body[i] * gain * (fromEnd < fade ? fromEnd / fade : 1) * 32767);
  }
  return out;
}

function wav(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(samples[i], 44 + i * 2);
  return buf;
}

const nameOf = (line) =>
  `${line.id}.${createHash("sha256").update([spec.model, spec.voice, spec.language, spec.style, line.text].join("\n")).digest("hex").slice(0, 8)}.wav`;

mkdirSync(DIR, { recursive: true });
let made = 0;
let failed = 0;
for (const line of spec.lines) {
  if (only && !only.includes(line.id)) continue;
  const file = `${DIR}/${nameOf(line)}`;
  if (existsSync(file) && !force) {
    console.log(`  have  ${line.id}`);
    continue;
  }
  if (dryRun) {
    console.log(`  would ${line.id}  ${line.text}`);
    continue;
  }
  try {
    const { samples, rate } = await takeWithRetry(line.text, line.id);
    const out = tidy(samples, rate);
    writeFileSync(file, wav(out, rate));
    made++;
    console.log(`  made  ${line.id}  ${(out.length / rate).toFixed(2)}s  ${line.text.length}字  ${line.text}`);
    await wait(GAP_MS);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${line.id}: ${String(err?.message ?? err).slice(0, 200)}`);
  }
}

// What the film uses: every line that has its clip (lengths read from the files themselves).
const manifest = {};
for (const line of spec.lines) {
  const file = `${DIR}/${nameOf(line)}`;
  if (!existsSync(file)) continue;
  const b = readFileSync(file);
  manifest[line.id] = { src: `narration/${nameOf(line)}`, seconds: Math.round(((b.length - 44) / 2 / b.readUInt32LE(24)) * 1000) / 1000, text: line.text };
}
if (!only) {
  const kept = new Set(spec.lines.map(nameOf));
  for (const f of readdirSync(DIR)) if (!kept.has(f)) unlinkSync(`${DIR}/${f}`);
}
writeFileSync("src/narration.json", `${JSON.stringify(manifest, null, 2)}\n`);
const missing = spec.lines.filter((l) => !manifest[l.id]).map((l) => l.id);
console.log(`made ${made}, failed ${failed}; ${Object.keys(manifest).length}/${spec.lines.length} lines have a clip${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`);
if (failed) process.exitCode = 1;
