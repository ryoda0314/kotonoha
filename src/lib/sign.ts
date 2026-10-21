import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// English the app's AI wrote is signed when it is written, and /api/say reads aloud only signed text (or a prepared
// line by its id), so the speech route cannot be used to voice anything else.

function secret(): string {
  const s = process.env.SAY_SECRET;
  if (s) return s;
  // Without its own secret the app still signs, with one derived from a key only the server has.
  return createHash("sha256").update(`say:${process.env.OPENAI_API_KEY ?? ""}`).digest("hex");
}

export function sign(text: string): string {
  return createHmac("sha256", secret()).update(text, "utf8").digest("base64url").slice(0, 32);
}

export function verify(text: string, sig: string): boolean {
  const want = Buffer.from(sign(text));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
