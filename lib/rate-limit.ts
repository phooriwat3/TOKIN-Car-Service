/**
 * Sliding-Window Rate Limiter
 * Protects public requisition forms and approval endpoints from brute force / spam.
 */

interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitOptions {
  limit?: number; // max requests allowed in window
  windowMs?: number; // sliding window duration in ms
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {},
): RateLimitResult {
  const limit = options.limit ?? 60; // Default: 60 requests
  const windowMs = options.windowMs ?? 60 * 1000; // Default: 1 minute
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = buckets.get(identifier);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(identifier, bucket);
  }

  // Filter out timestamps outside the sliding window
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const resetMs = Math.max(0, oldest + windowMs - now);
    const retryAfterSeconds = Math.ceil(resetMs / 1000);

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetMs,
      retryAfterSeconds,
    };
  }

  // Record this request
  bucket.timestamps.push(now);
  const remaining = Math.max(0, limit - bucket.timestamps.length);

  return {
    allowed: true,
    limit,
    remaining,
    resetMs: windowMs,
    retryAfterSeconds: 0,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}

export function resetRateLimit(identifier?: string): void {
  if (identifier) {
    buckets.delete(identifier);
  } else {
    buckets.clear();
  }
}
