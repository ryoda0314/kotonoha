// Renders single frames to look at, from one bundle:
//   node scripts/stills.mjs <out dir> [--id PromoNarration] <frame> [<frame> ...]       (npm run stills -- ...)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const at = args.indexOf("--id");
const id = at >= 0 ? args.splice(at, 2)[1] : "Promo";
const [dir, ...frames] = args;
mkdirSync(dir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id });
for (const f of frames.map(Number)) {
  const output = path.join(dir, `f${String(f).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame: f, output });
  console.log(output);
}
