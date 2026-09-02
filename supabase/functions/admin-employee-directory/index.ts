import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";

const text = (value: unknown, label: string, length = 200) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim().slice(0, length);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !url || !key) return json({ error: "Administrator sign-in is required." }, 401);
  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data: identity } = await db.auth.getUser(token);
    const { data: admin } = await db.from("profiles").select("role,is_active").eq("id", identity.user?.id ?? "").maybeSingle();
    if (!admin?.is_active || admin.role !== "admin") return json({ error: "Administrator access is required." }, 403);
    if (request.method === "GET") {
      const { data, error } = await db.from("employee_transport_directory").select("*").order("full_name");
      if (error) throw error;
      return json({ employees: data ?? [] });
    }
    const body = await request.json();
    if (request.method === "DELETE") {
      const { error } = await db.from("employee_transport_directory").delete().eq("id", text(body.id, "Employee"));
      if (error) throw error;
      return json({ ok: true });
    }
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const record = {
      employee_id: text(body.employeeId, "Employee ID", 100),
      full_name: text(body.fullName, "English name"),
      email: text(body.email, "Email").toLowerCase(),
      department: text(body.department, "Department", 100),
      job_title: typeof body.jobTitle === "string" ? body.jobTitle.trim().slice(0, 200) : "",
      is_active: body.isActive !== false,
    };
    const query = body.id
      ? db.from("employee_transport_directory").update(record).eq("id", text(body.id, "Employee"))
      : db.from("employee_transport_directory").insert(record);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return json({ employee: data });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to update directory." }, 400);
  }
});
