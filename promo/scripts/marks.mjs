// Prints the film's sound marks (makeTimeline(...).MUSIC_MARKS in src/timeline.ts, in seconds) as JSON, for
// scripts/music.py. With --narrated, those of the version with the narration.
//   node scripts/marks.mjs [--narrated] | python scripts/music.py public/sound [--music music-narration.wav]   (npm run music)
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const out = await build({ entryPoints: ["src/timeline.ts"], bundle: true, format: "esm", platform: "node", external: ["remotion"], write: false });
mkdirSync("node_modules/.cache", { recursive: true });
const file = "node_modules/.cache/timeline.mjs";
writeFileSync(file, out.outputFiles[0].text);
const { makeTimeline } = await import(pathToFileURL(file).href);
process.stdout.write(JSON.stringify(makeTimeline(process.argv.includes("--narrated")).MUSIC_MARKS));
