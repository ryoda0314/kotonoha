// Gathers what the film needs into public/ and writes src/audio.json (each clip's file and length), which the timeline
// is built from.
//   - Prepared lines are the app's own clips (../public/audio, named in ../src/content/audio.json), copied as they are.
//   - The partners' replies, which in the app the AI writes, are voiced here in that partner's voice, the way /api/say
//     voices them (../src/lib/tts.ts). A clip is made again only when its text or voice changes.
//   - The app's type, cut down to the characters of the film's source (Python's fontTools), so every page of a render
//     has it at once. Run again after changing any words.
//   node --env-file=../.env.local scripts/assets.mjs        (npm run assets)
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { speak } from "../../src/lib/tts.ts";

const APP = "..";
const PREPARED = ["make-email.1", "make-email.2", "make-email.3", "scene-going-out.line"];
// The replies the AI would write in the film's conversations, in the voices of src/content/cast.ts.
const REPLIES = {
  "nora.fair": { voice: "google:Kore", fallback: "nova", text: "Totally fair. Rest up! Maybe next Friday, then?" },
  "nora.watch": { voice: "google:Kore", fallback: "nova", text: "Ooh, nice. Anything you want to watch?" },
  "mia.ramen": { voice: "marin", text: "I don't feel like cooking tonight. Ramen after class?" },
};

// The app's type (src/app/layout.tsx), as whole files from Google Fonts' repository (OFL), kept out of public/.
const FONTS = {
  "IBMPlexSans.ttf": "ibmplexsans/IBMPlexSans%5Bwdth,wght%5D.ttf",
  "IBMPlexSansJP-Regular.ttf": "ibmplexsansjp/IBMPlexSansJP-Regular.ttf",
  "IBMPlexSansJP-Medium.ttf": "ibmplexsansjp/IBMPlexSansJP-Medium.ttf",
  "IBMPlexSansJP-SemiBold.ttf": "ibmplexsansjp/IBMPlexSansJP-SemiBold.ttf",
  "ShipporiMincho-Bold.ttf": "shipporimincho/ShipporiMincho-Bold.ttf",
};
const WHOLE = "node_modules/.cache/fonts";

mkdirSync("public/app", { recursive: true });
mkdirSync("public/voice", { recursive: true });
mkdirSync("public/fonts", { recursive: true });
mkdirSync(WHOLE, { recursive: true });
copyFileSync(`${APP}/public/icons/icon-512.png`, "public/app/icon.png");

// Whole, the Japanese faces are 2–9 MB each: loading them on every page of a render once held one page past its
// time limit. Cut to the characters the film's source holds (with all of printable ASCII), they load at once.
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const chars = new Set(Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)));
for (const file of walk("src")) for (const ch of readFileSync(file, "utf8")) if (ch > "\u007f") chars.add(ch);
writeFileSync(`${WHOLE}/chars.txt`, [...chars].join(""));
for (const [file, path] of Object.entries(FONTS)) {
  if (!existsSync(`${WHOLE}/${file}`)) {
    const res = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${path}`);
    if (!res.ok) throw new Error(`${file}: ${res.status}`);
    writeFileSync(`${WHOLE}/${file}`, Buffer.from(await res.arrayBuffer()));
    console.log(`  font ${file}`);
  }
  const cut = spawnSync(
    "python",
    ["-m", "fontTools.subset", `${WHOLE}/${file}`, `--text-file=${WHOLE}/chars.txt`, `--output-file=public/fonts/${file}`, "--layout-features=*", "--no-hinting"],
    { encoding: "utf8" },
  );
  if (cut.status !== 0) throw new Error(`cutting ${file} (pip install fonttools): ${cut.stderr}`);
}
console.log(`  fonts cut to ${chars.size} characters`);

const manifest = JSON.parse(readFileSync(`${APP}/src/content/audio.json`, "utf8"));
const out = {};
for (const id of PREPARED) {
  const file = manifest[id];
  if (!file) throw new Error(`${id} has no clip in the app`);
  copyFileSync(`${APP}/public/audio/${file}`, `public/app/${id}.mp3`);
  out[id] = { src: `app/${id}.mp3` };
}

for (const [id, { voice, fallback, text }] of Object.entries(REPLIES)) {
  const name = `${id}.${createHash("sha256").update(`${voice}\n${text}`).digest("hex").slice(0, 8)}.mp3`;
  if (!existsSync(`public/voice/${name}`)) {
    const said = await speak(text, voice, { tries: 3, fallback: fallback ?? null });
    if (said.voice !== voice) console.log(`  ${id}: ${voice} refused, voiced by ${said.voice}`);
    writeFileSync(`public/voice/${name}`, said.mp3);
    console.log(`  voiced ${id}`);
  }
  out[id] = { src: `voice/${name}`, text };
}
const kept = new Set(Object.values(out).map((x) => x.src.replace(/^voice\//, "")));
for (const f of readdirSync("public/voice")) if (!kept.has(f)) unlinkSync(`public/voice/${f}`);

// Lengths from the clips themselves (Remotion's ffprobe).
for (const [id, clip] of Object.entries(out)) {
  const r = spawnSync(`npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 "public/${clip.src}"`, { encoding: "utf8", shell: true });
  const seconds = Number.parseFloat(r.stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`no length for ${clip.src}: ${r.stderr}`);
  clip.seconds = Math.round(seconds * 1000) / 1000;
}
writeFileSync("src/audio.json", `${JSON.stringify(out, null, 2)}\n`);
console.log(Object.entries(out).map(([id, c]) => `${id} ${c.seconds}s`).join("\n"));
