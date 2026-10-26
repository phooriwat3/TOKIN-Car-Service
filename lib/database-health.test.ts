import { describe, expect, it, vi } from "vitest";
import { checkDatabaseHealth } from "./database-health";

describe("database health probe", () => {
  it("uses the data-free health RPC instead of a protected table", async () => {
    const fetcher = vi.fn(async (
      _input: string | URL | Request,
      _init?: RequestInit,
    ) =>
      new Response("true", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      checkDatabaseHealth({
        supabaseUrl: "https://project.supabase.co",
        publishableKey: "publishable-key",
        fetcher,
      }),
    ).resolves.toBe(true);

    expect(fetcher).toHaveBeenCalledOnce();
    const [endpoint, options] = fetcher.mock.calls[0]!;
    expect(String(endpoint)).toBe(
      "https://project.supabase.co/rest/v1/rpc/health_check",
    );
    expect(options?.method).toBe("POST");
    expect(options?.body).toBe("{}");
  });

  it("fails closed for missing configuration and unsuccessful responses", async () => {
    const fetcher = vi.fn(async (
      _input: string | URL | Request,
      _init?: RequestInit,
    ) => new Response("false", { status: 503 }));

    await expect(checkDatabaseHealth({ fetcher })).resolves.toBe(false);
    await expect(
      checkDatabaseHealth({
        supabaseUrl: "https://project.supabase.co",
        publishableKey: "publishable-key",
        fetcher,
      }),
    ).resolves.toBe(false);
  });
});
