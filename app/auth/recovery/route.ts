import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(
        new URL("/admin/reset-password", requestUrl.origin),
      );
    }
  }

  const recoveryUrl = new URL("/admin/recover", requestUrl.origin);
  recoveryUrl.searchParams.set("error", "recovery_link_invalid");
  return NextResponse.redirect(recoveryUrl);
}
