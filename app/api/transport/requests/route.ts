import { sqlServerApiBaseUrl } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const base = sqlServerApiBaseUrl();
  if (!base) return Response.json({ error: "SQL Server request service is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const key = request.headers.get("Idempotency-Key") ?? "";
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(key)) {
    return Response.json({ error: "A valid Idempotency-Key is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return Response.json({ error: "Request is too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return Response.json({ error: "Request is too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    const response = await fetch(new URL("/api/v1/requests", base), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body,
      signal: AbortSignal.timeout(15000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "SQL Server request service is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
