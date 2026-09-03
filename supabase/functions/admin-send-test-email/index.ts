import { createClient } from "npm:@supabase/supabase-js@2";
import { manageEmail } from "../_shared/email-template.ts";
import { corsHeaders, json } from "../_shared/http.ts";

const email = (value: unknown) => {
  if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    throw new Error("Enter a valid recipient email.");
  return value.trim().toLowerCase();
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST"].includes(request.method)) return json({ error: "Method not allowed." }, 405);
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const flowUrl = Deno.env.get("POWER_AUTOMATE_REQUESTER_MANAGE_FLOW_URL");
    if (!token || !url || !key) return json({ error: "Administrator sign-in is required." }, 401);
    if (!flowUrl) return json({ error: "Email service is not configured." }, 503);
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data: identity } = await db.auth.getUser(token);
    const { data: admin } = await db.from("profiles").select("role,is_active,full_name")
      .eq("id", identity.user?.id ?? "").maybeSingle();
    if (!admin?.is_active || admin.role !== "admin") return json({ error: "Administrator access is required." }, 403);
    if (request.method === "GET") {
      const { data, error } = await db.from("email_delivery_logs")
        .select("id,request_no,request_type,recipient_email,event,status,created_at")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return json({ history: data ?? [] });
    }
    const body = await request.json();
    const recipientEmail = email(body.recipientEmail);
    const requestType = body.requestType === "overtime" ? "overtime" : body.requestType === "outside_company" ? "outside_company" : null;
    if (!requestType) throw new Error("Select a transport form.");
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const template = manageEmail({
      event: "admin.test_email",
      requestNo: "TEST-EMAIL-ONLY",
      requestType,
      requesterName: "Test employee",
      requesterDepartment: "IT",
      approverName: "Test approver",
      usingDate: tomorrow,
      startTime: requestType === "overtime" ? "17:20" : "09:00",
      endTime: requestType === "overtime" ? "20:00" : "17:00",
      pickupLocation: "TOKIN Main Office",
      destination: requestType === "overtime" ? "Test drop-off location" : "Test business destination",
      purpose: "Email delivery test only — no transport request was created.",
      meetingPoint: "front_area",
      withStaff: false,
      passengers: requestType === "outside_company" ? ["Test passenger"] : [],
      manageUrl: "https://carservice.tokin.co.th/request",
      expiresAt: "This is a test email; no action link is included.",
    });
    const response = await fetch(flowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "admin.test_email",
        isTest: true,
        recipientEmail,
        requester: { name: admin.full_name, email: recipientEmail, department: "Test" },
        requestType,
        emailSubject: `[TEST] ${template.emailSubject}`,
        emailBodyHtml: template.emailBodyHtml,
      }),
    });
    if (!response.ok) {
      await db.from("email_delivery_logs").insert({ recipient_email: recipientEmail, request_type: requestType, event: "admin.test_email", status: "failed" });
      return json({ error: "Email automation rejected the test message." }, 502);
    }
    await db.from("email_delivery_logs").insert({ recipient_email: recipientEmail, request_type: requestType, event: "admin.test_email", status: "sent" });
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to send test email." }, 400);
  }
});
