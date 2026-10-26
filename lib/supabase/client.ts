import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
);

export const isDemoModeEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";

export const isRuntimeConfigured =
  isSupabaseConfigured || isDemoModeEnabled;

export function createClient() {
  if (!isSupabaseConfigured) {
    if (isDemoModeEnabled) return null;
    throw new Error("Application services are not configured.");
  }
  return createBrowserClient(
    supabaseUrl!,
    supabasePublishableKey!,
  );
}
