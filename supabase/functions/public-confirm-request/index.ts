import { createClient } from "npm:@supabase/supabase-js@2";
import { approvalEmail, manageEmail } from "../_shared/email-template.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";
import { randomToken, sha256Hex, token } from "../_shared/request-access.ts";
import { approvalAdaptiveCard } from "../_shared/approval-adaptive-card.ts";
import { requesterStatusCard } from "../_shared/audience-adaptive-card.ts";
import { adminNotification } from "../_shared/admin-notification.ts";

type ConfirmationResult = {
  outcome: "confirmed" | "already_confirmed";
  booking_id: string;
  request_no: string;
  request_type: "outside_company" | "overtime";
  status: string;
};

type Passenger = { name: string; seq: number };
type OvertimeEmployee = {
  employee_id: string;
  employee_name: string;
  work_description: string;
  work_start: string;
  work_end: string;
  total_weekly_hours: number;
  transport_required: boolean;
  bus_stop: string | null;
  seq: number;
};

const appBaseUrl = () =>
  Deno.env.get("APP_BASE_URL")?.trim().replace(/\/+$/, "") ||
  "https://carservice.tokin.co.th";

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
    const rateLimit = await consumeRateLimit(
      db,
      "public-confirm-request",
      request,
      10,
      10 * 60,
    );
    if (!rateLimit.allowed)
      return json({ error: "Too many attempts. Please try again later." }, 429);

    const body = await request.json();
    const rawToken = token(body?.token);
    const tokenHash = await sha256Hex(rawToken);
    const { data: access, error: accessError } = await db
      .from("request_access_tokens")
      .select("booking_id,token_type,bookings(request_type)")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (accessError) throw accessError;
    if (!access || !["requester_confirmation", "requester_manage"].includes(access.token_type)) {
      return json({ error: "The confirmation link is invalid or no longer active." }, 401);
    }

    const joinedBooking = Array.isArray(access.bookings)
      ? access.bookings[0]
      : access.bookings;
    const requestType = joinedBooking?.request_type as
      | "outside_company"
      | "overtime"
      | undefined;
    if (!requestType) throw new Error("Unable to resolve the request type.");

    const requesterFlowUrl = Deno.env.get(
      "POWER_AUTOMATE_REQUESTER_MANAGE_FLOW_URL",
    );
    const approvalFlowUrl = Deno.env.get("POWER_AUTOMATE_APPROVAL_FLOW_URL");
    if (!requesterFlowUrl || (requestType === "outside_company" && !approvalFlowUrl)) {
      return json({ error: "Notification service is temporarily unavailable." }, 503);
    }

    const approvalToken = requestType === "outside_company" ? randomToken() : "";
    const approvalTokenHash = approvalToken
      ? await sha256Hex(approvalToken)
      : null;
    const manageExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60_000,
    ).toISOString();
    const approvalExpiresAt = approvalToken
      ? new Date(Date.now() + 48 * 60 * 60_000).toISOString()
      : null;

    const { data: resultData, error: confirmationError } = await db.rpc(
      "confirm_requester_request",
      {
        p_token_hash: tokenHash,
        p_manage_expires_at: manageExpiresAt,
        p_approval_token_hash: approvalTokenHash,
        p_approval_expires_at: approvalExpiresAt,
      },
    );
    if (confirmationError) throw confirmationError;
    const result = resultData as ConfirmationResult;
    const manageUrl = `${appBaseUrl()}/request/manage?token=${encodeURIComponent(rawToken)}`;

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select(`
        id,booking_no,workflow_version,request_type,requester_name,requester_email,
        requester_department,approver_name,approver_email,using_date,
        start_time,end_time,pickup_location,destination,purpose,num_passengers,meeting_point,
        with_staff,urgent,urgent_reason,
        booking_passengers(name,seq),
        overtime_employees(employee_id,employee_name,work_description,work_start,
          work_end,total_weekly_hours,transport_required,bus_stop,seq)
      `)
      .eq("id", result.booking_id)
      .single();
    if (bookingError || !booking)
      throw bookingError ?? new Error("Unable to load the confirmed request.");

    let adminNotificationStatus: "queued" | "failed" | "not_configured" =
      "not_configured";
    const adminRecipientEmail = Deno.env.get("POWER_AUTOMATE_ADMIN_RECIPIENT_EMAIL")
      ?.trim();
    if (booking.request_type === "overtime" && adminRecipientEmail) {
      const correlationId = crypto.randomUUID();
      const payload = adminNotification({
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
        urgent: booking.urgent,
      });
      const { error: adminQueueError } = await db.from("workflow_outbox").upsert({
        booking_id: booking.id,
        event_type: "admin.request_ready",
        deduplication_key: `admin-ready:confirmation:${booking.id}:${booking.workflow_version}`,
        payload,
        correlation_id: correlationId,
      }, {
        onConflict: "deduplication_key",
        ignoreDuplicates: true,
      });
      adminNotificationStatus = adminQueueError ? "failed" : "queued";
      if (adminQueueError) {
        console.error("Unable to queue GA notification.", {
          bookingId: booking.id,
          message: adminQueueError.message,
        });
      }
    }

    if (result.outcome === "already_confirmed") {
      return json({
        ok: true,
        alreadyConfirmed: true,
        requestNo: result.request_no,
        status: result.status,
        manageUrl,
        adminNotificationStatus,
      });
    }

    const passengers = ((booking.booking_passengers ?? []) as Passenger[])
      .sort((a, b) => a.seq - b.seq)
      .map((item) => item.name);
    const overtimeEmployees = (
      (booking.overtime_employees ?? []) as OvertimeEmployee[]
    )
      .sort((a, b) => a.seq - b.seq)
      .map((item) => ({
        employeeId: item.employee_id,
        employeeName: item.employee_name,
        workDescription: item.work_description,
        workStart: String(item.work_start).slice(0, 5),
        workEnd: String(item.work_end).slice(0, 5),
        totalWeeklyHours: Number(item.total_weekly_hours),
        transportRequired: item.transport_required,
        busStop: item.bus_stop ?? "",
      }));
    const emailRequest = {
      requestNo: booking.booking_no,
      requestType: booking.request_type,
      requesterName: booking.requester_name,
      requesterDepartment: booking.requester_department,
      approverName: booking.approver_name ?? "",
      usingDate: booking.using_date,
      startTime: String(booking.start_time).slice(0, 5),
      endTime: String(booking.end_time).slice(0, 5),
      pickupLocation: booking.pickup_location,
      destination: booking.destination,
      purpose: booking.purpose,
      meetingPoint: booking.meeting_point,
      withStaff: booking.with_staff,
      immediateAction: booking.urgent,
      immediateReason: booking.urgent_reason,
      passengers,
      overtimeEmployees,
    };

    let requesterManageEmailStatus: "sent" | "failed" | "not_configured" =
      "not_configured";
    if (requesterFlowUrl) {
      const template = manageEmail({
        ...emailRequest,
        event: "request.manage_link_created",
        manageUrl,
        expiresAt: manageExpiresAt,
      });
      const adaptiveCard = requesterStatusCard({
        requestNo: booking.booking_no,
        requestType: booking.request_type,
        usingDate: booking.using_date,
        startTime: String(booking.start_time).slice(0, 5),
        endTime: String(booking.end_time).slice(0, 5),
        pickupLocation: booking.pickup_location,
        destination: booking.destination,
        status: "confirmed",
        actionUrl: manageUrl,
        expiresAt: manageExpiresAt,
      });
      try {
        const response = await fetch(requesterFlowUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemaVersion: 1,
            event: "request.confirmed",
            audience: "requester",
            requestId: booking.id,
            requestNo: booking.booking_no,
            requestType: booking.request_type,
            requester: {
              name: booking.requester_name,
              email: booking.requester_email,
              department: booking.requester_department,
            },
            recipient: {
              name: booking.requester_name,
              email: booking.requester_email,
            },
            approver: {
              name: booking.approver_name,
              email: booking.approver_email,
            },
            manageUrl,
            expiresAt: manageExpiresAt,
            adaptiveCard,
            teamsNotification: booking.request_type === "overtime"
              ? {
                  event: "ot_transport_submitted",
                  audience: "ga_management",
                  priority: booking.urgent ? "high" : "normal",
                  title: "New overtime transport request",
                  message: `${booking.booking_no} - ${booking.using_date}`,
                  actionUrl: manageUrl,
                }
              : null,
            ...template,
          }),
        });
        requesterManageEmailStatus = response.ok ? "sent" : "failed";
      } catch {
        requesterManageEmailStatus = "failed";
      }
    }

    let approvalEmailStatus: "queued" | "failed" | "not_configured" =
      "not_configured";
    if (booking.request_type === "outside_company" && approvalToken && approvalExpiresAt) {
      const approvalUrl = `${appBaseUrl()}/request/approve?token=${encodeURIComponent(approvalToken)}`;
      const actionId = crypto.randomUUID();
      if (approvalFlowUrl) {
        const { error: registrationError } = await db.rpc(
          "register_approval_action",
          {
            p_action_key: actionId,
            p_booking_id: booking.id,
            p_expected_version: booking.workflow_version,
            p_subject_email: booking.approver_email,
            p_expires_at: approvalExpiresAt,
          },
        );
        if (registrationError) throw registrationError;

        const adaptiveCard = approvalAdaptiveCard({
          actionId,
          requestId: booking.id,
          expectedVersion: booking.workflow_version,
          expiresAt: approvalExpiresAt,
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
          numPassengers: Number(booking.num_passengers),
          reviewUrl: approvalUrl,
          urgent: booking.urgent,
          urgentReason: booking.urgent_reason,
        });
        const template = approvalEmail({
          ...emailRequest,
          approvalUrl,
          expiresAt: approvalExpiresAt,
        });
        try {
          const response = await fetch(approvalFlowUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schemaVersion: 1,
              event: "request.approval_requested",
              actionId,
              requestId: booking.id,
              expectedVersion: booking.workflow_version,
              expiresAt: approvalExpiresAt,
              requestNo: booking.booking_no,
              requestType: booking.request_type,
              requester: {
                name: booking.requester_name,
                email: booking.requester_email,
                department: booking.requester_department,
              },
              approver: {
                name: booking.approver_name,
                email: booking.approver_email,
              },
              approvalUrl,
              approvalExpiresAt,
              callbackUrl: `${supabaseUrl}/functions/v1/approval-callback`,
              adaptiveCard,
              teamsNotification: {
                event: "offsite_approval_requested",
                audience: "approver",
                priority: booking.urgent ? "high" : "normal",
                title: booking.urgent
                  ? "Immediate transport approval needed"
                  : "Transport approval needed",
                message: `${booking.booking_no} - ${booking.using_date}`,
                actionUrl: approvalUrl,
                actionId,
                requestId: booking.id,
                expectedVersion: booking.workflow_version,
                expiresAt: approvalExpiresAt,
              },
              ...template,
            }),
          });
          approvalEmailStatus = response.ok ? "queued" : "failed";
        } catch {
          approvalEmailStatus = "failed";
        }
      }
    }

    await db
      .from("bookings")
      .update({
        requester_manage_email_status: requesterManageEmailStatus,
        approval_email_status: approvalEmailStatus,
      })
      .eq("id", booking.id);
    await db.from("email_delivery_logs").insert([
      {
        booking_id: booking.id,
        request_no: booking.booking_no,
        request_type: booking.request_type,
        recipient_email: booking.requester_email,
        event: "request.manage_link_created",
        status: requesterManageEmailStatus,
      },
      ...(booking.request_type === "outside_company"
        ? [{
            booking_id: booking.id,
            request_no: booking.booking_no,
            request_type: booking.request_type,
            recipient_email: booking.approver_email,
            event: "request.approval_requested",
            status: approvalEmailStatus,
          }]
        : []),
    ]);

    return json({
      ok: true,
      requestNo: booking.booking_no,
      status: result.status,
      manageUrl,
      requesterManageEmailStatus,
      approvalEmailStatus,
      adminNotificationStatus,
    });
  } catch (cause) {
    const message = cause instanceof Error
      ? cause.message
      : "Unable to confirm request.";
    const status = /expired/i.test(message)
      ? 410
      : /invalid|newer version|already used/i.test(message)
        ? 400
        : 500;
    return json({ error: message }, status);
  }
});
