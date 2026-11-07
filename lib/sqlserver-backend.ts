import "server-only";

export function sqlServerBackendEnabled() {
  return process.env.CAR_SERVICE_BACKEND === "sqlserver";
}

export function sqlServerApiBaseUrl(): URL | null {
  if (!sqlServerBackendEnabled()) return null;
  const configured = process.env.CAR_SERVICE_API_URL;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    return url;
  } catch {
    return null;
  }
}

export async function forwardSqlServerGet(path: string): Promise<Response> {
  const base = sqlServerApiBaseUrl();
  if (!base) return Response.json({ error: "SQL Server request service is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  try {
    const response = await fetch(new URL(path, base), {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "SQL Server request service is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
