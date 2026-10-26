import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { checkDatabaseHealth } from "@/lib/database-health";

export const dynamic = "force-dynamic";

const DATABASE_TIMEOUT_MS = 3_000;

async function databaseIsReady() {
  if (!isSupabaseConfigured) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DATABASE_TIMEOUT_MS);
  try {
    return await checkDatabaseHealth({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const databaseReady = await databaseIsReady();
  const status = databaseReady ? "healthy" : "unavailable";

  return NextResponse.json(
    {
      status,
      checks: {
        database: databaseReady ? "up" : "down",
      },
    },
    {
      status: databaseReady ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        ...(databaseReady ? {} : { "Retry-After": "30" }),
      },
    },
  );
}
