import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "../_shared/http.ts";
import { randomToken, sha256Hex } from "../_shared/request-access.ts";

type Booking = {
  id: string;
  booking_no: string;
  revision_no: number;
  department_id: string;
  requester_name: string;
  requester_department: string;
  using_date: string;
  start_time: string;
  end_time: string;
  num_passengers: number;
  purpose: string;
};

type Approver = {
  id: string;
  full_name: string;
  email: string;
};

const esc = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const appBaseUrl = () => Deno.env.get("APP_BASE_URL")?.trim().replace(/\/+$/, "") ||
  "https://tokin-car-service.vercel.app";

const bangkokDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const approvalTokenExpiry = () =>
  new Date(Date.now() + 48 * 60 * 60_000).toISOString();


const emailHtml = (input: {
  approverName: string;
  department: string;
  date: string;
  requests: Array<Booking & { approvalUrl: string }>;
}) => `<!doctype html><html><body style="margin:0;background:#f3f6fa;font-family:Arial,'Segoe UI',sans-serif;color:#172033"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#fff;border:1px solid #dbe3ee"><tr><td style="background:#173f73;padding:20px 24px;color:#fff"><div style="font-size:20px;font-weight:700">TOKIN Transport</div><div style="font-size:12px;color:#d8e7fb;margin-top:3px">OT department approval batch</div></td></tr><tr><td style="padding:24px"><h1 style="font-size:21px;margin:0 0 8px">${esc(input.department)} requests awaiting approval</h1><p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6">Dear ${esc(input.approverName)}, review the ${input.requests.length} OT transportation request(s) received before the 15:30 batch cutoff. Approved requests should reach Admin by 16:00.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #dbe3ee"><tr style="background:#eef4fb"><th style="padding:9px;text-align:left;font-size:12px">Request / requester</th><th style="padding:9px;text-align:left;font-size:12px">OT details</th><th style="padding:9px;text-align:center;font-size:12px">Action</th></tr>${input.requests.map((item) => `<tr><td style="padding:10px;border-top:1px solid #dbe3ee;font-size:13px;vertical-align:top"><b>${esc(item.booking_no)}</b><br>${esc(item.requester_name)}<br>${esc(item.requester_department)}</td><td style="padding:10px;border-top:1px solid #dbe3ee;font-size:13px;vertical-align:top">${esc(item.using_date)} &nbsp; ${esc(String(item.start_time).slice(0, 5))}-${esc(String(item.end_time).slice(0, 5))}<br>${esc(item.num_passengers)} passenger(s)<br>${esc(item.purpose)}</td><td style="padding:10px;border-top:1px solid #dbe3ee;text-align:center;vertical-align:middle"><a href="${esc(item.approvalUrl)}" style="display:inline-block;padding:9px 13px;background:#1f5fbf;color:#fff;text-decoration:none;font-size:12px;font-weight:700">Review</a></td></tr>`).join("")}</table><p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#9a3412;background:#fff7ed;padding:10px 12px;border-left:3px solid #f59e0b">Requests submitted from 15:30 to 16:00 are urgent and are emailed separately.</p></td></tr></table></td></tr></table></body></html>`;

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const expectedSecret = Deno.env.get("OT_DIGEST_CRON_SECRET");
  if (!expectedSecret || request.headers.get("x-cron-secret") !== expectedSecret) {
    return json({ error: "Unauthorized." }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const flowUrl = Deno.env.get("POWER_AUTOMATE_OT_DIGEST_FLOW_URL");
    if (!supabaseUrl || !serviceRoleKey || !flowUrl) {
      return json({ error: "Digest configuration is incomplete." }, 500);
    }
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const today = bangkokDate();
    const dayStart = new Date(`${today}T00:00:00+07:00`).toISOString();
    const { data, error } = await db.from("bookings")
      .select("id,booking_no,revision_no,department_id,requester_name,requester_department,using_date,start_time,end_time,num_passengers,purpose")
      .eq("request_type", "overtime")
      .eq("status", "pending_approval")
      .eq("urgent", false)
      .is("approval_digest_sent_at", null)
      .gte("created_at", dayStart)
      .order("created_at");
    if (error) throw error;

    const byDepartment = new Map<string, Booking[]>();
    for (const booking of (data ?? []) as Booking[]) {
      byDepartment.set(booking.department_id, [...(byDepartment.get(booking.department_id) ?? []), booking]);
    }

    let emailsSent = 0;
    let requestsQueued = 0;
    let departmentsSkipped = 0;
    for (const [departmentId, bookings] of byDepartment) {
      const { data: department, error: departmentError } = await db
        .from("departments")
        .select("name,code")
        .eq("id", departmentId)
        .single();
      if (departmentError) throw departmentError;

      const { data: assignments, error: assignmentError } = await db
        .from("department_approvers")
        .select("approver_id")
        .eq("department_id", departmentId)
        .eq("is_active", true);
      if (assignmentError) throw assignmentError;

      const approverIds = [...new Set(
        (assignments ?? []).map((assignment) => String(assignment.approver_id)),
      )];
      if (!approverIds.length) {
        departmentsSkipped += 1;
        continue;
      }

      const { data: approvers, error: approverError } = await db
        .from("profiles")
        .select("id,full_name,email")
        .in("id", approverIds)
        .eq("role", "approver")
        .eq("is_active", true)
        .order("full_name");
      if (approverError) throw approverError;
      if (!approvers?.length) {
        departmentsSkipped += 1;
        continue;
      }

      let departmentSucceeded = true;
      for (const approver of approvers as Approver[]) {
        const linked: Array<Booking & { approvalUrl: string }> = [];
        for (const booking of bookings) {
          const approverEmail = approver.email.trim().toLowerCase();
          const { error: revokeError } = await db
            .from("request_access_tokens")
            .update({ revoked_at: new Date().toISOString() })
            .eq("booking_id", booking.id)
            .eq("token_type", "approval")
            .ilike("subject_email", approverEmail)
            .is("used_at", null)
            .is("revoked_at", null);
          if (revokeError) throw revokeError;

          const rawToken = randomToken();
          const tokenHash = await sha256Hex(rawToken);
          const expiresAt = approvalTokenExpiry();
          const { error: tokenError } = await db
            .from("request_access_tokens")
            .insert({
              booking_id: booking.id,
              token_type: "approval",
              token_hash: tokenHash,
              revision_no: booking.revision_no,
              subject_email: approverEmail,
              expires_at: expiresAt,
            });
          if (tokenError) throw tokenError;

          linked.push({
            ...booking,
            approvalUrl:
              `${appBaseUrl()}/request/approve?token=${encodeURIComponent(rawToken)}`,
          });
        }
        const subject = `[OT approval batch] ${department?.code ?? "Department"} - ${today} (${linked.length})`;
        const response = await fetch(flowUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "ot.approval_digest",
            approver: { name: approver.full_name, email: approver.email },
            department: department ?? { name: bookings[0].requester_department, code: bookings[0].requester_department },
            usingDate: today,
            requestCount: linked.length,
            requests: linked,
            emailSubject: subject,
            emailBodyHtml: emailHtml({
              approverName: approver.full_name,
              department: department?.name ?? bookings[0].requester_department,
              date: today,
              requests: linked,
            }),
          }),
        });
        if (!response.ok) departmentSucceeded = false;
        else emailsSent += 1;
      }

      if (departmentSucceeded) {
        const ids = bookings.map((booking) => booking.id);
        const { error: updateError } = await db.from("bookings").update({
          approval_digest_sent_at: new Date().toISOString(),
          approval_email_status: "sent",
        }).in("id", ids);
        if (updateError) throw updateError;
        requestsQueued += ids.length;
      }
    }

    return json({
      ok: true,
      date: today,
      departments: byDepartment.size,
      departmentsSkipped,
      emailsSent,
      requestsQueued,
    });
  } catch (cause) {
    const errorMessage = cause instanceof Error
      ? cause.message
      : cause && typeof cause === "object" && "message" in cause
      ? String((cause as { message?: unknown }).message ?? "Unknown database error.")
      : "Unable to send OT approval digests.";

    console.error("Unable to send OT approval digests", cause);
    return json({ error: errorMessage }, 500);
  }
});