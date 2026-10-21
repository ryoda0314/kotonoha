import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  allLines,
  alternativesOf,
  DIALOGUES,
  EXPRESSIONS,
  exprById,
  FRAMES,
  GROUPS,
  markRange,
  PARTNERS,
  placesOf,
  SCENES,
  sampleLines,
} from "../src/content/index.ts";

test("line ids are unique", () => {
  const ids = allLines().map(({ line }) => line.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every mark names a known expression and sits in its line", () => {
  const lines = [...DIALOGUES.flatMap((d) => d.lines), ...SCENES.flatMap((s) => [s.line, ...sampleLines(s)])];
  for (const line of lines) {
    for (const mark of line.marks ?? []) {
      const expr = exprById(mark.expr);
      assert.ok(expr, `${line.id}: unknown expression ${mark.expr}`);
      assert.ok(markRange(line, mark), `${line.id}: "${mark.text}" is not in "${line.text}"`);
      assert.match(mark.text.replace(/[’‘]/g, "'"), expr.core, `${line.id}: "${mark.text}" lacks the fixed words of ${expr.id}`);
    }
  }
});

test("every expression comes back: it turns up in at least two conversations or scenes", () => {
  for (const expr of EXPRESSIONS) {
    const places = placesOf(expr.id);
    assert.ok(places.length >= 2, `${expr.id} is only in ${places.map((p) => p.id).join(", ") || "nothing"}`);
  }
});

test("every expression has three variations and at least one other way of saying", () => {
  for (const expr of EXPRESSIONS) {
    assert.equal(expr.examples.length, 3, expr.id);
    for (const g of expr.groups) assert.ok(GROUPS[g], `${expr.id}: unknown group ${g}`);
    assert.ok(alternativesOf(expr.id).length >= 1, `${expr.id} has no near intent`);
  }
});

test("frames and scenes have partners who speak", () => {
  for (const f of FRAMES) assert.equal(f.opener.who, f.partner);
  for (const s of SCENES) assert.ok(PARTNERS[s.line.who], s.id);
  for (const d of DIALOGUES) for (const l of d.lines) assert.ok(PARTNERS[l.who], l.id);
});

test("the audio manifest is in step with the lines (after scripts/generate-audio.mjs)", () => {
  const file = "src/content/audio.json";
  if (!existsSync(file)) return;
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  for (const { line, voice } of allLines()) {
    const hash = createHash("sha256").update(`${voice}\n${line.text}`).digest("hex").slice(0, 8);
    assert.equal(manifest[line.id], `${line.id}.${hash}.mp3`, `${line.id} needs voicing again`);
    assert.ok(existsSync(`public/audio/${manifest[line.id]}`), `${line.id}: clip missing`);
  }
});
