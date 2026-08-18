// Sliding window rate limiter for Edge Functions
const windows = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const w = windows.get(key);

  if (!w || now > w.reset) {
    windows.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  w.count++;
  if (w.count > limit) {
    return { allowed: false, remaining: 0, resetAt: w.reset };
  }
  return { allowed: true, remaining: limit - w.count, resetAt: w.reset };
}

export function getRateLimitHeaders(limit: number, remaining: number, resetAt: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(resetAt / 1000).toString(),
  };
}
