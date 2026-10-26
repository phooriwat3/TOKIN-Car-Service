import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, isPublicPath } from "@/lib/route-access";

const rejectRequest = (request: NextRequest, status: 401 | 403) => {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Forbidden" },
      { status },
    );
  }
  const url = request.nextUrl.clone();
  url.pathname = status === 401 ? "/admin/login" : "/access-denied";
  url.search = "";
  return NextResponse.redirect(url);
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname)) return response;
  if (!user) return rejectRequest(request, 401);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (
    profileError ||
    !profile?.is_active ||
    !canAccessPath(pathname, profile.role)
  ) {
    return rejectRequest(request, 403);
  }
  return response;
}
