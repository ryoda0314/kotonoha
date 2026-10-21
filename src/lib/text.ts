// Small pure helpers on English text, shared by the server (what came from the learner) and the device (the record).

/** Lower case, straight apostrophes, single spaces, no punctuation at the ends: for comparing pieces of English. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/^[\s"'.,!?;:()-]+|[\s"'.,!?;:()-]+$/g, "")
    .trim();
}

export function wordsOf(s: string): string[] {
  return normalize(s).match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
}

/** True when every word of `piece` appears in `text` in the same order (other words may sit between). */
export function inOrder(text: string, piece: string): boolean {
  const have = wordsOf(text);
  const want = wordsOf(piece);
  if (want.length === 0) return false;
  let i = 0;
  for (const w of have) if (w === want[i] && ++i === want.length) return true;
  return false;
}

/** True when `piece` occurs in `text` as it is, ignoring case, spacing and curly apostrophes. */
export function contains(text: string, piece: string): boolean {
  const p = normalize(piece);
  return p.length > 0 && normalize(text).includes(p);
}

/** Japanese script anywhere: the learner filled in what English did not come out for. */
export function hasJapanese(s: string): boolean {
  return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s);
}

/** How many words the two have in common, in order. */
function common(x: string[], y: string[]): number {
  if (!x.length || !y.length) return 0;
  const lcs: number[][] = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  return lcs[0][0];
}

/** How much of `b`'s words `a` keeps, in order (0..1): to tell a sample sent as it is from one made the learner's own. */
export function sameness(a: string, b: string): number {
  const x = wordsOf(a);
  const y = wordsOf(b);
  return x.length && y.length ? common(x, y) / Math.max(x.length, y.length) : 0;
}

/** How much of `piece` is in `text`, word by word in order (0..1): a chunk the learner wrote with a word fixed is theirs. */
export function coverage(text: string, piece: string): number {
  const want = wordsOf(piece);
  return want.length ? common(wordsOf(text), want) / want.length : 0;
}

/** A key for a phrase the AI found (not one of the prepared expressions): its form, normalized. */
export function phraseKey(form: string): string {
  return `p:${normalize(form.replace(/[〜~]/g, "…")).replace(/\s*…\s*/g, " … ")}`;
}
