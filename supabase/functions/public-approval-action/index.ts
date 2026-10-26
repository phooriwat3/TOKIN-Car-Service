import { createClient } from "npm:@supabase/supabase-js@2";
import {
  manageEmail,
  requesterDecisionEmail,
} from "../_shared/email-template.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { randomToken, sha256Hex, token } from "../_shared/request-access.ts";
import {
  type ApprovalAction,
  workflowRequestHash,
} from "../_shared/workflow-contract.ts";
import { requesterStatusCard } from "../_shared/audience-adaptive-card.ts";
import { adminNotification } from "../_shared/admin-notification.ts";

const outcomes: Record<string, ApprovalAction> = {
  approve: "approved",
  reject: "rejected",
  request_changes: "changes_requested",
};

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

    const body = await request.json();
    const tokenHash = await sha256Hex(token(body?.token));
    const action = outcomes[String(body?.action ?? "")];
    if (!action) return json({ error: "Approval action is invalid." }, 400);
    const comments = typeof body?.comments === "string"
      ? body.comments.trim().slice(0, 2000)
      : "";
    if (action !== "approved" && !comments)
      return json({ error: "Comments are required." }, 400);

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: access, error: accessError } = await db
      .from("request_access_tokens")
      .select("id,booking_id,revision_no,subject_email,expires_at")
      .eq("token_hash", tokenHash)
      .eq("token_type", "approval")
      .maybeSingle();
    if (accessError) throw accessError;
    if (!access)
      return json({ error: "This approval link is invalid." }, 401);

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id,booking_no,status,revision_no,workflow_version,request_type,requester_name,requester_email,requester_department,approver_name,approver_email,using_date,start_time,end_time,pickup_location,destination,purpose,urgent")
      .eq("id", access.booking_id)
      .maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking) return json({ error: "Request not found." }, 404);

    let manageTokenHash: string | null = null;
    let manageTokenExpiresAt: string | null = null;
    let manageUrl: string | null = null;
    if (action === "changes_requested") {
      const rawToken = randomToken();
      manageTokenHash = await sha256Hex(rawToken);
      manageTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
      manageUrl = `${appBaseUrl()}/request/manage?token=${encodeURIComponent(rawToken)}`;
    }

    const actorEmail = String(access.subject_email ?? "").trim().toLowerCase();
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
        name: booking.approver_name ?? "",
        email: actorEmail,
      },
      requestType: booking.request_type,
      usingDate: booking.using_date,
      startTime: String(booking.start_time).slice(0, 5),
      endTime: String(booking.end_time).slice(0, 5),
      pickupLocation: booking.pickup_location,
      destination: booking.destination,
      purpose: booking.purpose,
      comments,
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
      status: action,
      comments,
      actionUrl: manageUrl,
      expiresAt: manageTokenExpiresAt,
    });
    const adminRecipientEmail = Deno.env.get("POWER_AUTOMATE_ADMIN_RECIPIENT_EMAIL")
      ?.trim();
    const adminReadyNotification = action === "approved" && adminRecipientEmail
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
            approverName: booking.approver_name,
            usingDate: booking.using_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            pickupLocation: booking.pickup_location,
            destination: booking.destination,
            purpose: booking.purpose,
            comments,
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
            event: action === "approved"
              ? "request.approved"
              : "request.rejected",
            requestNo: booking.booking_no,
            requestType: booking.request_type,
            requesterName: booking.requester_name,
            requesterDepartment: booking.requester_department,
            approverName: booking.approver_name,
            usingDate: booking.using_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            pickupLocation: booking.pickup_location,
            destination: booking.destination,
            purpose: booking.purpose,
            comments,
          }),
        };

    const actionKey = `signed-link:${tokenHash}`;
    const requestHash = await workflowRequestHash({
      schemaVersion: 1,
      actionKey,
      requestId: booking.id,
      action,
      expiresAt: access.expires_at,
      comments,
      actorEmail,
    });
    const { data: result, error: decisionError } = await db.rpc(
      "execute_approval_command",
      {
        p_action_key: actionKey,
        p_request_hash: requestHash,
        p_booking_id: booking.id,
        p_action: action,
        p_expected_version: booking.workflow_version,
        p_actor_email: actorEmail,
        p_actor_teams_id: null,
        p_actor_name: booking.approver_name ?? "",
        p_comments: comments,
        p_source: "signed_link",
        p_correlation_id: crypto.randomUUID(),
        p_expires_at: access.expires_at,
        p_access_token_hash: tokenHash,
        p_manage_token_hash: manageTokenHash,
        p_manage_token_expires_at: manageTokenExpiresAt,
        p_notification_payload: notificationPayload,
      },
    );
    if (decisionError) throw decisionError;

    const decision = result as Record<string, unknown> | null;
    if (!decision?.bookingId || !decision.status)
      throw new Error("Approval processing returned an invalid response.");

    return json({
      ok: true,
      ...decision,
      requesterNotificationStatus: "queued",
    });
  } catch (cause) {
    const message = errorMessage(cause);
    const clientError = /invalid|required|expired|already|changed|approver/i.test(message);
    return json({ error: message }, clientError ? 409 : 500);
  }
});
