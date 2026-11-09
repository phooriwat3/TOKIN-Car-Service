import { sqlServerApiBaseUrl } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const base = sqlServerApiBaseUrl();
  if (!base) return Response.json({ error: "Confirmation service is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 1024)
      return Response.json({ error: "Request is too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    const response = await fetch(new URL("/api/v1/requests/confirm", base), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(10000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Confirmation service is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
