import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 100) : "";
    if (query.length < 3) return json({ users: [] });
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ users: [] });
    const db = createClient(url, key, { auth: { persistSession: false } });
    const search = query.replace(/[%_,()]/g, " ").trim();
    const { data, error } = await db
      .from("employee_transport_directory")
      .select("full_name,email,department,job_title,employee_id")
      .eq("is_active", true)
      .or(`full_name.ilike.%${search}%,employee_id.ilike.%${search}%,email.ilike.%${search}%`)
      .order("full_name")
      .limit(8);
    if (error) throw error;
    return json({ users: (data ?? []).map((person) => ({
      displayName: person.full_name,
      mail: person.email,
      department: person.department,
      jobTitle: person.job_title,
      employeeId: person.employee_id,
    })) });
  } catch {
    return json({ users: [] });
  }
});
