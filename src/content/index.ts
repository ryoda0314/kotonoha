import { fallbackOf, GROUPS, PARTNERS, THEMES, VOICES, voiceOf, YOU_VOICE } from "./cast.ts";
import { DIALOGUES } from "./dialogues.ts";
import { EXPRESSIONS } from "./expressions.ts";
import { FRAMES } from "./frames.ts";
import { SCENES } from "./scenes.ts";
import type { Dialogue, Expr, Frame, Line, Mark, PartnerId, Scene, SpeakerId } from "./types.ts";

export { DIALOGUES, EXPRESSIONS, fallbackOf, FRAMES, GROUPS, PARTNERS, SCENES, THEMES, VOICES, voiceOf, YOU_VOICE };
export type * from "./types.ts";

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const EXPR = byId(EXPRESSIONS);
const DIALOGUE = byId(DIALOGUES);
const SCENE = byId(SCENES);
const FRAME = byId(FRAMES);

export const exprById = (id: string): Expr | undefined => EXPR.get(id);
export const dialogueById = (id: string): Dialogue | undefined => DIALOGUE.get(id);
export const sceneById = (id: string): Scene | undefined => SCENE.get(id);
export const frameById = (id: string): Frame | undefined => FRAME.get(id);

/** A scene's samples as lines, so each has its own audio (spoken by "you"). */
export function sampleLines(scene: Scene): Line[] {
  return scene.samples.map((s, i) => ({ id: `${scene.id}.s${i + 1}`, who: "you", text: s.text, ja: "", marks: s.marks }));
}

// The examples of an expression are said by the four friends in turn, so the same expression is heard in several voices.
const EXAMPLE_VOICES: PartnerId[] = ["mia", "leo", "nora", "sam"];

/** An expression's examples (別の場面で) as lines. */
export function exampleLines(expr: Expr): Line[] {
  const offset = EXPRESSIONS.indexOf(expr);
  return expr.examples.map((x, i) => ({
    id: `x.${expr.id}.${i + 1}`,
    who: EXAMPLE_VOICES[(offset + i) % EXAMPLE_VOICES.length],
    text: x.text,
    ja: x.ja,
  }));
}

/** Every line that has a voice: the audio script makes a clip for each, and the app plays them by id. */
export function allLines(): { line: Line; voice: string }[] {
  const lines: Line[] = [
    ...DIALOGUES.flatMap((d) => d.lines),
    ...SCENES.flatMap((s) => [s.line, ...sampleLines(s)]),
    ...FRAMES.map((f) => f.opener),
    ...EXPRESSIONS.flatMap(exampleLines),
  ];
  return lines.map((line) => ({ line, voice: voiceOf(line.who as SpeakerId) }));
}

/** Where a place in the prepared English is: a conversation of 出会う or a scene. */
export type Place = { kind: "meet"; id: string; title: string } | { kind: "scene"; id: string; title: string };

/** Every place an expression turns up (its own examples aside): the conversations and scenes to meet it again in. */
export function placesOf(exprId: string): (Place & { text: string })[] {
  const has = (marks?: Mark[]) => Boolean(marks?.some((m) => m.expr === exprId));
  const out: (Place & { text: string })[] = [];
  for (const d of DIALOGUES) {
    const line = d.lines.find((l) => has(l.marks));
    if (line) out.push({ kind: "meet", id: d.id, title: d.title, text: line.text });
  }
  for (const s of SCENES) {
    const sample = s.samples.find((x) => has(x.marks));
    if (has(s.line.marks)) out.push({ kind: "scene", id: s.id, title: s.title, text: s.line.text });
    else if (sample) out.push({ kind: "scene", id: s.id, title: s.title, text: sample.text });
  }
  return out;
}

/** The expressions a conversation or a scene (with its samples) holds. */
export function exprsIn(place: { kind: "meet" | "scene"; id: string }): string[] {
  const lines =
    place.kind === "meet"
      ? (dialogueById(place.id)?.lines ?? [])
      : (() => {
          const s = sceneById(place.id);
          return s ? [s.line, ...sampleLines(s)] : [];
        })();
  return [...new Set(lines.flatMap((l) => (l.marks ?? []).map((m) => m.expr)))];
}

/**
 * ほかの言い方 of an expression: others with a near intent (sharing a group), nearest first, at most `limit`. Never
 * filled up with loose matches: an expression alone in its groups has fewer.
 */
export function alternativesOf(exprId: string, limit = 3): Expr[] {
  const expr = exprById(exprId);
  if (!expr) return [];
  return EXPRESSIONS.filter((e) => e.id !== exprId)
    .map((e, order) => ({ e, order, shared: e.groups.filter((g) => expr.groups.includes(g)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.order - b.order)
    .slice(0, limit)
    .map((x) => x.e);
}

/** Where a mark sits in its line (the first place its text occurs), or null when the text is not there. */
export function markRange(line: { text: string }, mark: Mark): { start: number; end: number } | null {
  const start = line.text.indexOf(mark.text);
  return start === -1 ? null : { start, end: start + mark.text.length };
}
