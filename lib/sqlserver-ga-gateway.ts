import "server-only";
import { createHash, createHmac } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { sqlServerApiBaseUrl } from "@/lib/sqlserver-backend";

const noStore = { "Cache-Control": "no-store" };

export async function forwardGaRequest(request: Request, path: string, method: "GET" | "POST") {
  const base = sqlServerApiBaseUrl();
  const secret = process.env.GA_GATEWAY_SHARED_SECRET;
  if (!base || !secret || secret.length < 32)
    return Response.json({ error: "GA assignment service is unavailable." }, { status: 503, headers: noStore });
  if (method === "POST") {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStore });
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (userError || !user || !email || !user.email_confirmed_at)
    return Response.json({ error: "Sign in as a GA administrator." }, { status: 401, headers: noStore });
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role,is_active").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin" || !profile.is_active)
    return Response.json({ error: "GA administrator access required." }, { status: 403, headers: noStore });

  try {
    const body = method === "POST" ? await request.text() : "";
    if (Buffer.byteLength(body, "utf8") > 64 * 1024)
      return Response.json({ error: "Request is too large." }, { status: 413, headers: noStore });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hash = createHash("sha256").update(body).digest("hex");
    const canonical = `${method}\n${path}\n${hash}\n${timestamp}\n${email}`;
    const signature = createHmac("sha256", secret).update(canonical).digest("hex");
    const response = await fetch(new URL(path, base), {
      method, cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        "x-ga-email": email,
        "x-ga-timestamp": timestamp,
        "x-ga-signature": signature,
      },
      ...(method === "POST" ? { body } : {}),
    });
    return new Response(await response.text(), { status: response.status,
      headers: { "Content-Type": "application/json; charset=utf-8", ...noStore } });
  } catch {
    return Response.json({ error: "GA assignment service is unavailable." }, { status: 503, headers: noStore });
  }
}
