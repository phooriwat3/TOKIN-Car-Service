import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedDestinations = new Set(["/approvals", "/admin/bookings"]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "";
  const nextPath = allowedDestinations.has(requestedNext)
    ? requestedNext
    : "/approvals";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
    }
  }

  const loginPath = nextPath.startsWith("/admin")
    ? "/admin/login"
    : "/approver/login";
  const loginUrl = new URL(loginPath, requestUrl.origin);
  loginUrl.searchParams.set("error", "microsoft_sign_in_failed");
  return NextResponse.redirect(loginUrl);
}