// Retained as a protected tombstone so deployments replace the former
// unauthenticated employee-directory endpoint instead of leaving it live.
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

Deno.serve(() =>
  new Response(
    JSON.stringify({
      error: "This endpoint has been retired. Use search-company-users.",
    }),
    { status: 410, headers },
  )
);
