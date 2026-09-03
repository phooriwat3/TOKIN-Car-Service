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
    const search = query.toLowerCase();
    const matches = (...values: Array<string | null | undefined>) =>
      values.some((value) => value?.toLowerCase().includes(search));
    const { data: directory, error: directoryError } = await db
      .from("employee_transport_directory")
      .select("full_name,email,department,job_title,employee_id")
      .eq("is_active", true)
      .order("full_name")
      .limit(500);
    if (directoryError) throw directoryError;
    const users = new Map<string, { displayName: string; mail: string; department: string; jobTitle: string; employeeId: string }>();
    for (const person of directory ?? []) {
      if (!matches(person.full_name, person.email, person.employee_id)) continue;
      users.set(person.email.toLowerCase(), {
      displayName: person.full_name,
      mail: person.email,
      department: person.department,
      jobTitle: person.job_title,
      employeeId: person.employee_id,
      });
    }
    return json({ users: [...users.values()].slice(0, 8) });
  } catch {
    return json({ users: [] });
  }
});
