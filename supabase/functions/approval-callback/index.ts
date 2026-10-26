import { createClient } from "npm:@supabase/supabase-js@2";
import {
  manageEmail,
  requesterDecisionEmail,
} from "../_shared/email-template.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { consumeRateLimit, getRateLimitHeaders } from "../_shared/rate-limit.ts";
import { randomToken, sha256Hex } from "../_shared/request-access.ts";
import {
  parseTeamsApprovalCommand,
  workflowRequestHash,
} from "../_shared/workflow-contract.ts";
import { requesterStatusCard } from "../_shared/audience-adaptive-card.ts";
import { adminNotification } from "../_shared/admin-notification.ts";

const appBaseUrl = () =>
  Deno.env.get("APP_BASE_URL")?.trim().replace(/\/+$/, "") ||
  "https://carservice.tokin.co.th";

const errorMessage = (cause: unknown) => cause instanceof Error
  ? cause.message
  : cause && typeof cause === "object" && "message" in cause
  ? String((cause as { message?: unknown }).message ?? "Unable to record approval.")
  : "Unable to record approval.";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey)
      return json({ error: "Service configuration is missing." }, 500);

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const rateLimit = await consumeRateLimit(db, "approval-callback", request, 30, 60);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests." }), {
        status: 429,
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(30, rateLimit.remaining, rateLimit.resetAt),
          "Content-Type": "application/json",
        },
      });
    }

    const expectedSecret = Deno.env.get("POWER_AUTOMATE_CALLBACK_SECRET");
    const suppliedSecret = request.headers.get("x-tokin-callback-secret");
    if (!expectedSecret || suppliedSecret !== expectedSecret)
      return json({ error: "Unauthorized." }, 401);

    const body = await request.json();
    const command = parseTeamsApprovalCommand(body);
    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id,booking_no,workflow_version,request_type,requester_name,requester_email,requester_department,approver_name,approver_email,using_date,start_time,end_time,pickup_location,destination,purpose,urgent")
      .eq("id", command.requestId)
      .maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking) return json({ error: "Request not found." }, 404);

    let manageTokenHash: string | null = null;
    let manageTokenExpiresAt: string | null = null;
    let manageUrl: string | null = null;
    if (command.action === "changes_requested") {
      const rawToken = randomToken();
      manageTokenHash = await sha256Hex(rawToken);
      manageTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
      manageUrl = `${appBaseUrl()}/request/manage?token=${encodeURIComponent(rawToken)}`;
    }

    const basePayload = {
      schemaVersion: 1,
      audience: "requester",
      recipient: {
        name: booking.requester_name,
        email: booking.requester_email,
      },
      requester: {
        name: booking.requester_name,
        email: booking.requester_email,
        department: booking.requester_department,
      },
      approver: {
        name: command.actor.name || booking.approver_name || "",
        email: command.actor.email,
        teamsUserId: command.actor.teamsUserId || undefined,
      },
      requestType: booking.request_type,
      usingDate: booking.using_date,
      startTime: String(booking.start_time).slice(0, 5),
      endTime: String(booking.end_time).slice(0, 5),
      pickupLocation: booking.pickup_location,
      destination: booking.destination,
      purpose: booking.purpose,
      comments: command.comments,
      manageUrl,
      expiresAt: manageTokenExpiresAt,
    };
    const adaptiveCard = requesterStatusCard({
      requestNo: booking.booking_no,
      requestType: booking.request_type,
      usingDate: booking.using_date,
      startTime: String(booking.start_time).slice(0, 5),
      endTime: String(booking.end_time).slice(0, 5),
      pickupLocation: booking.pickup_location,
      destination: booking.destination,
      status: command.action,
      comments: command.comments,
      actionUrl: manageUrl,
      expiresAt: manageTokenExpiresAt,
    });
    const adminRecipientEmail = Deno.env.get("POWER_AUTOMATE_ADMIN_RECIPIENT_EMAIL")
      ?.trim();
    const adminReadyNotification = command.action === "approved" && adminRecipientEmail
      ? adminNotification({
          requestId: booking.id,
          requestNo: booking.booking_no,
          requestType: booking.request_type,
          requesterName: booking.requester_name,
          requesterDepartment: booking.requester_department,
          usingDate: booking.using_date,
          startTime: String(booking.start_time).slice(0, 5),
          endTime: String(booking.end_time).slice(0, 5),
          pickupLocation: booking.pickup_location,
          destination: booking.destination,
          purpose: booking.purpose,
          reviewUrl: `${appBaseUrl()}/admin/bookings?search=${encodeURIComponent(booking.booking_no)}`,
          recipientName: Deno.env.get("POWER_AUTOMATE_ADMIN_RECIPIENT_NAME")?.trim() ||
            "GA Administrator",
          recipientEmail: adminRecipientEmail,
          urgent: Boolean(booking.urgent),
        })
      : null;
    const notificationPayload = manageUrl && manageTokenExpiresAt
      ? {
          ...basePayload,
          ...(adminReadyNotification
            ? { adminNotification: adminReadyNotification }
            : {}),
          adaptiveCard,
          ...manageEmail({
            event: "request.changes_requested",
            requestNo: booking.booking_no,
            requestType: booking.request_type,
            requesterName: booking.requester_name,
            requesterDepartment: booking.requester_department,
            approverName: command.actor.name || booking.approver_name,
            usingDate: booking.using_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            pickupLocation: booking.pickup_location,
            destination: booking.destination,
            purpose: booking.purpose,
            comments: command.comments,
            manageUrl,
            expiresAt: manageTokenExpiresAt,
          }),
        }
      : {
          ...basePayload,
          ...(adminReadyNotification
            ? { adminNotification: adminReadyNotification }
            : {}),
          adaptiveCard,
          ...requesterDecisionEmail({
            event: command.action === "approved"
              ? "request.approved"
              : "request.rejected",
            requestNo: booking.booking_no,
            requestType: booking.request_type,
            requesterName: booking.requester_name,
            requesterDepartment: booking.requester_department,
            approverName: command.actor.name || booking.approver_name,
            usingDate: booking.using_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            pickupLocation: booking.pickup_location,
            destination: booking.destination,
            purpose: booking.purpose,
            comments: command.comments,
          }),
        };

    const requestHash = await workflowRequestHash({
      schemaVersion: 1,
      actionKey: command.actionKey,
      requestId: command.requestId,
      action: command.action,
      expectedVersion: command.expectedVersion,
      expiresAt: command.expiresAt,
      comments: command.comments,
      actorEmail: command.actor.email,
      actorTeamsUserId: command.actor.teamsUserId,
    });
    const correlationId = crypto.randomUUID();
    const { data, error } = await db.rpc("execute_approval_command", {
      p_action_key: command.actionKey,
      p_request_hash: requestHash,
      p_booking_id: command.requestId,
      p_action: command.action,
      p_expected_version: command.expectedVersion,
      p_actor_email: command.actor.email,
      p_actor_teams_id: command.actor.teamsUserId || null,
      p_actor_name: command.actor.name,
      p_comments: command.comments,
      p_source: "teams",
      p_correlation_id: correlationId,
      p_expires_at: command.expiresAt,
      p_access_token_hash: null,
      p_manage_token_hash: manageTokenHash,
      p_manage_token_expires_at: manageTokenExpiresAt,
      p_notification_payload: notificationPayload,
    });
    if (error) throw error;

    const result = data as Record<string, unknown> | null;
    if (!result?.bookingId || !result.status)
      throw new Error("Approval processing returned an invalid response.");

    return json({ ok: true, ...result, notificationStatus: "queued" });
  } catch (cause) {
    const message = errorMessage(cause);
    const clientError = /invalid|required|expired|changed|assigned approver|active approver|already|unsupported/i.test(message);
    console.error("Approval callback failed.", { message });
    return json({ error: message }, clientError ? 409 : 500);
  }
});
