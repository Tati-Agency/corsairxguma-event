/**
 * Simple in-memory sliding-window rate limiter.
 * Note: with serverless multi-instance deployment this is per-instance —
 * it is a cheap first line of defense, DB-level dedupe remains authoritative.
 */
const windows = new Map<string, number[]>();

const WINDOW_MS = 60_000;

export function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const arr = (windows.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= max) {
    windows.set(key, arr);
    return false;
  }
  arr.push(now);
  windows.set(key, arr);

  // Opportunistic cleanup to avoid unbounded growth
  if (windows.size > 5000) {
    for (const [k, v] of windows) {
      if (v.every((t) => now - t > WINDOW_MS)) windows.delete(k);
    }
  }
  return true;
}
