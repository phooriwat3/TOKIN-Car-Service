type HealthFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export async function checkDatabaseHealth({
  supabaseUrl,
  publishableKey,
  signal,
  fetcher = fetch,
}: {
  supabaseUrl?: string;
  publishableKey?: string;
  signal?: AbortSignal;
  fetcher?: HealthFetch;
}) {
  if (!supabaseUrl || !publishableKey) return false;

  try {
    const endpoint = new URL("/rest/v1/rpc/health_check", supabaseUrl);
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
      signal,
    });
    if (!response.ok) return false;
    return (await response.json().catch(() => false)) === true;
  } catch {
    return false;
  }
}
