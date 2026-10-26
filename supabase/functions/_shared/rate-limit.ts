import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type RateLimitRow = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const sha256Hex = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
};

export async function consumeRateLimit(
  db: SupabaseClient,
  namespace: string,
  request: Request,
  limit = 20,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const forwarded =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 200) || "unknown";
  const fingerprint = await sha256Hex(`${namespace}:${forwarded}:${userAgent}`);
  const { data, error } = await db.rpc("consume_rate_limit", {
    p_fingerprint: fingerprint,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Unable to verify request rate.");

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null;
  if (!row || typeof row.allowed !== "boolean") {
    throw new Error("Rate-limit service returned an invalid response.");
  }

  return {
    allowed: row.allowed,
    remaining: Number(row.remaining) || 0,
    resetAt: new Date(row.reset_at).getTime(),
  };
}

export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(resetAt / 1000).toString(),
  };
}
