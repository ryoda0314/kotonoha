import "server-only";

// Signing in is optional, so the AI routes are limited per address and per instance of the server, as ことのおと's
// /api/hear is: generous for a learner, a ceiling for anything else. Each limit is per minute and per (UTC) day.

type Count = { minute: number; minuteCount: number; day: string; dayCount: number };

export type Limit = { perMinute: number; perDay: number; allPerDay: number };

export const LIMITS = {
  turn: { perMinute: 20, perDay: 400, allPerDay: Number(process.env.TURNS_PER_DAY) || 5000 },
  other: { perMinute: 15, perDay: 200, allPerDay: 3000 },
  say: { perMinute: 60, perDay: 1500, allPerDay: 20000 },
  hear: { perMinute: 20, perDay: 400, allPerDay: 5000 },
} satisfies Record<string, Limit>;

const counts = new Map<string, Count>();
const totals = new Map<string, { day: string; count: number }>();

export function addressOf(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** Counts one use; false when the address or the whole service has had enough for now. */
export function allow(kind: keyof typeof LIMITS, address: string): boolean {
  const limit = LIMITS[kind];
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  const day = new Date(now).toISOString().slice(0, 10);
  const total = totals.get(kind) ?? { day, count: 0 };
  if (total.day !== day) Object.assign(total, { day, count: 0 });
  if (total.count >= limit.allPerDay) return false;
  const key = `${kind}:${address}`;
  const c = counts.get(key) ?? { minute, minuteCount: 0, day, dayCount: 0 };
  if (c.minute !== minute) Object.assign(c, { minute, minuteCount: 0 });
  if (c.day !== day) Object.assign(c, { day, dayCount: 0 });
  if (c.minuteCount >= limit.perMinute || c.dayCount >= limit.perDay) return false;
  c.minuteCount++;
  c.dayCount++;
  total.count++;
  counts.set(key, c);
  totals.set(kind, total);
  if (counts.size > 20000) counts.clear();
  return true;
}
