import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";
import {
  bangkokMinutes,
  date,
  email,
  randomToken,
  requiredText,
  sha256Hex,
  time,
} from "../_shared/request-access.ts";
import { approvalEmail, manageEmail } from "../_shared/email-template.ts";

type PublicRequest = {
  requestType: "outside_company" | "overtime";
  requester: {
    name: string;
    email: string;
    employeeId?: string;
    department: string;
  };
  approver?: { name?: string; email?: string };
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  meetingPoint: "front_area" | "loading_area";
  withStaff?: boolean;
  passengers?: string[];
  overtimeEmployees?: Array<{
    employeeId: string;
    employeeName: string;
    workDescription: string;
    workStart: string;
    workEnd: string;
    totalWeeklyHours: number;
    transportRequired: boolean;
    busStop?: string;
    employeeEmail?: string;
  }>;
  tigerSpaceConfirmed?: boolean;
  website?: string;
};

const appBaseUrl = () => {
  const configured = Deno.env.get("APP_BASE_URL")?.trim().replace(/\/+$/, "");
  return configured || "https://tokin-car-service.vercel.app";
};
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
    const payload = (await request.json()) as PublicRequest;
    if (payload.website) return json({ error: "Request rejected." }, 400);

    const forwarded =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const bytes = new TextEncoder().encode(
      `${forwarded}:${request.headers.get("user-agent") || ""}`,
    );
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const fingerprint = Array.from(new Uint8Array(digest))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await db
      .from("public_request_attempts")
      .select("id", { count: "exact", head: true })
      .eq("fingerprint", fingerprint)
      .gte("created_at", since);
    if ((count ?? 0) >= 5)
      return json({ error: "Too many requests. Please try again later." }, 429);
    await db.from("public_request_attempts").insert({ fingerprint });

    if (!["outside_company", "overtime"].includes(payload.requestType))
      throw new Error("Request type is invalid.");
    const submittedAtBangkokMinutes = bangkokMinutes();
    const isLateOt =
      payload.requestType === "overtime" && submittedAtBangkokMinutes >= 15 * 60 + 30;
    if (
      payload.requestType === "overtime" &&
      (submittedAtBangkokMinutes < 8 * 60 || submittedAtBangkokMinutes >= 16 * 60)
    ) {
      throw new Error(
        "OT requests can be submitted only from 08:00 to 16:00 (Thailand time).",
      );
    }

    const requesterName = requiredText(
      payload.requester?.name,
      "Requester name",
      200,
    );
    const requesterEmail = email(payload.requester?.email, "Requester email");
    const requesterDepartment = requiredText(
      payload.requester?.department,
      "Requester department",
      200,
    );
    const departmentCode = requesterDepartment.trim().toUpperCase().replace(/\s+/g, " ");
    const { data: department, error: departmentError } = await db
      .from("departments")
      .select("id,name,code")
      .eq("code", departmentCode)
      .eq("is_active", true)
      .single();
    if (departmentError || !department)
      throw new Error("Selected department is unavailable. Please contact Admin.");

    let selectedApprover: { id: string; full_name: string; email: string } | undefined;
    if (payload.requestType === "outside_company") {
      const requestedApproverEmail = email(payload.approver?.email, "Approver email");
      const { data: departmentApprovers, error: approversError } = await db
        .from("profiles")
        .select("id,full_name,email")
        .eq("department_id", department.id)
        .eq("role", "approver")
        .eq("is_active", true)
        .order("full_name");
      if (approversError) throw approversError;
      selectedApprover = departmentApprovers?.find(
        (item) => item.email?.trim().toLowerCase() === requestedApproverEmail,
      );
      if (!selectedApprover)
        throw new Error(`Select an active approver for ${department.code}.`);
    }
    const approverName = selectedApprover?.full_name ?? "Tiger Space";
    const approverEmail = selectedApprover
      ? email(selectedApprover.email, "Approver email")
      : requesterEmail;
    const usingDate = date(payload.usingDate);
    const startTime = time(payload.startTime, "Start time");
    const endTime = time(payload.endTime, "End time");
    if (endTime <= startTime)
      throw new Error("End time must be after start time.");

    const passengers = (payload.passengers ?? [])
      .map((x) => requiredText(x, "Passenger name", 200))
      .slice(0, 20);
    const overtimeEmployees =
      payload.requestType === "overtime"
        ? (payload.overtimeEmployees ?? [])
        : [];
    if (payload.requestType === "overtime" && !overtimeEmployees.length)
      throw new Error("At least one OT employee is required.");
    if (payload.requestType === "overtime" && !payload.tigerSpaceConfirmed)
      throw new Error("Confirm that you submitted this OT in Tiger Space.");
    if (
      payload.requestType === "overtime" &&
      overtimeEmployees.some((item) => !item.transportRequired)
    )
      throw new Error("This form is only for employees who require transportation.");
    if (overtimeEmployees.length > 20)
      throw new Error("A request can contain at most 20 employees.");

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .insert({
        requester_id: null,
        requester_name: requesterName,
        requester_email: requesterEmail,
        requester_employee_id:
          typeof payload.requester.employeeId === "string"
            ? payload.requester.employeeId.trim().slice(0, 100)
            : null,
        requester_department: department.name,
        department_id: department.id,
        status:
          payload.requestType === "overtime"
            ? "pending_ot_verification"
            : "pending_approval",
        request_type: payload.requestType,
        approver_id:
          payload.requestType === "outside_company"
            ? selectedApprover?.id ?? null
            : null,
        approver_name:
          payload.requestType === "outside_company" && selectedApprover
            ? approverName
            : null,
        approver_email:
          payload.requestType === "outside_company" && selectedApprover
            ? approverEmail
            : null,
        source_system:
          payload.requestType === "overtime" ? "tiger_space" : "transport_portal",
        source_reference: null,
        source_confirmed:
          payload.requestType === "overtime" && Boolean(payload.tigerSpaceConfirmed),
        ot_verification_status:
          payload.requestType === "overtime" ? "pending" : "not_required",
        category:
          payload.requestType === "overtime"
            ? "overtime_transport"
            : "business_trip",
        using_date: usingDate,
        start_time: startTime,
        end_time: endTime,
        pickup_location: requiredText(
          payload.pickupLocation,
          "Pickup location",
          500,
        ),
        destination: requiredText(payload.destination, "Destination", 500),
        purpose: requiredText(payload.purpose, "Purpose", 2000),
        num_passengers:
          payload.requestType === "overtime"
            ? Math.max(
                1,
                overtimeEmployees.filter((x) => x.transportRequired).length,
              )
            : Math.max(1, passengers.length),
        meeting_point:
          payload.meetingPoint === "loading_area"
            ? "loading_area"
            : "front_area",
        with_staff: Boolean(payload.withStaff),
        vehicle_type_pref: "any",
        driver_required: true,
        urgent: isLateOt,
        urgent_reason: isLateOt
          ? "Submitted after the 15:30 OT approval batch cutoff."
          : null,
        after_hours: payload.requestType === "overtime",
        overtime_transport: payload.requestType === "overtime",
      })
      .select("id,booking_no")
      .single();
    if (bookingError || !booking)
      throw bookingError ?? new Error("Unable to create request.");

    if (passengers.length) {
      const { error } = await db.from("booking_passengers").insert(
        passengers.map((name, seq) => ({
          booking_id: booking.id,
          name,
          seq,
        })),
      );
      if (error) throw error;
    }
    if (overtimeEmployees.length) {
      const rows = overtimeEmployees.map((employee, seq) => ({
        booking_id: booking.id,
        employee_id: requiredText(employee.employeeId, "Employee number", 100),
        employee_name: requiredText(
          employee.employeeName,
          "Employee name",
          200,
        ),
        employee_email:
          employee.transportRequired || employee.employeeEmail
            ? email(employee.employeeEmail, "Employee email")
            : null,
        work_description: requiredText(
          employee.workDescription,
          "Work description",
          500,
        ),
        work_start: time(employee.workStart, "OT start"),
        work_end: time(employee.workEnd, "OT end"),
        total_weekly_hours: Number(employee.totalWeeklyHours),
        transport_required: Boolean(employee.transportRequired),
        bus_stop: employee.transportRequired
          ? requiredText(employee.busStop, "Bus stop", 500)
          : null,
        seq,
      }));
      if (
        rows.some(
          (row) =>
            !Number.isFinite(row.total_weekly_hours) ||
            row.total_weekly_hours < 0 ||
            row.total_weekly_hours > 60,
        )
      ) {
        throw new Error("Weekly hours must be between 0 and 60.");
      }
      const { error } = await db.from("overtime_employees").insert(rows);
      if (error) throw error;
    }

    const manageToken = randomToken();
    const manageTokenHash = await sha256Hex(manageToken);
    const manageTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60_000,
    ).toISOString();
    const manageUrl = `${appBaseUrl()}/request/manage?token=${encodeURIComponent(manageToken)}`;
    const { error: manageTokenError } = await db
      .from("request_access_tokens")
      .insert({
        booking_id: booking.id,
        token_type: "requester_manage",
        token_hash: manageTokenHash,
        revision_no: 1,
        subject_email: requesterEmail,
        expires_at: manageTokenExpiresAt,
      });
    if (manageTokenError) throw manageTokenError;

    let approvalTokenExpiresAt = "";
    let approvalUrl = "";
    if (payload.requestType === "outside_company") {
      const approvalToken = randomToken();
      const approvalTokenHash = await sha256Hex(approvalToken);
      approvalTokenExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60_000,
      ).toISOString();
      approvalUrl = `${appBaseUrl()}/request/approve?token=${encodeURIComponent(approvalToken)}`;
      const { error: approvalTokenError } = await db
        .from("request_access_tokens")
        .insert({
          booking_id: booking.id,
          token_type: "approval",
          token_hash: approvalTokenHash,
          revision_no: 1,
          subject_email: approverEmail,
          expires_at: approvalTokenExpiresAt,
        });
      if (approvalTokenError) throw approvalTokenError;
    }

    const requesterManageFlowUrl = Deno.env.get(
      "POWER_AUTOMATE_REQUESTER_MANAGE_FLOW_URL",
    );
    const emailRequest = {
      requestNo: booking.booking_no,
      requestType: payload.requestType,
      requesterName,
      requesterDepartment,
      approverName,
      usingDate,
      startTime,
      endTime,
      pickupLocation: payload.pickupLocation,
      destination: payload.destination,
      purpose: payload.purpose,
      meetingPoint: payload.meetingPoint,
      withStaff: payload.withStaff,
      passengers,
      overtimeEmployees,
    };
    const requesterEmailTemplate = manageEmail({
      ...emailRequest,
      event: "request.manage_link_created",
      manageUrl,
      expiresAt: manageTokenExpiresAt,
    });
    let requesterManageEmailStatus: "sent" | "failed" | "not_configured" =
      "not_configured";
    if (requesterManageFlowUrl) {
      try {
        const response = await fetch(requesterManageFlowUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "request.manage_link_created",
            requestId: booking.id,
            requestNo: booking.booking_no,
            requestType: payload.requestType,
            requester: {
              name: requesterName,
              email: requesterEmail,
              department: requesterDepartment,
            },
            approver: { name: approverName, email: approverEmail },
            usingDate,
            startTime,
            endTime,
            pickupLocation: payload.pickupLocation,
            destination: payload.destination,
            purpose: payload.purpose,
            manageUrl,
            expiresAt: manageTokenExpiresAt,
            ...requesterEmailTemplate,
          }),
        });
        requesterManageEmailStatus = response.ok ? "sent" : "failed";
      } catch {
        requesterManageEmailStatus = "failed";
      }
    }

    const approvalFlowUrl = Deno.env.get("POWER_AUTOMATE_APPROVAL_FLOW_URL");
    let approvalEmailStatus: "queued" | "sent" | "failed" | "not_configured" =
      "not_configured";
    if (approvalFlowUrl && payload.requestType === "outside_company") {
      const approverEmailTemplate = approvalEmail({
        ...emailRequest,
        approvalUrl,
        expiresAt: approvalTokenExpiresAt,
      });
      try {
        const response = await fetch(approvalFlowUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: booking.id,
            requestNo: booking.booking_no,
            requestType: payload.requestType,
            requester: {
              name: requesterName,
              email: requesterEmail,
              department: requesterDepartment,
            },
            approver: { name: approverName, email: approverEmail },
            usingDate,
            startTime,
            endTime,
            pickupLocation: payload.pickupLocation,
            destination: payload.destination,
            purpose: payload.purpose,
            manageUrl,
            approvalUrl,
            approvalExpiresAt: approvalTokenExpiresAt,
            callbackUrl: `${supabaseUrl}/functions/v1/approval-callback`,
            passengers,
            overtimeEmployees,
            ...approverEmailTemplate,
          }),
        });
        approvalEmailStatus = response.ok ? "sent" : "failed";
      } catch {
        approvalEmailStatus = "failed";
      }
    }
    await db
      .from("bookings")
      .update({
        approval_email_status: approvalEmailStatus,
        requester_manage_email_status: requesterManageEmailStatus,
      })
      .eq("id", booking.id);

    return json(
      {
        requestId: booking.id,
        requestNo: booking.booking_no,
        approvalEmailStatus,
        approvalMode:
          payload.requestType === "overtime"
            ? "tiger_space_transport_only"
            : "department_approval",
        requesterManageEmailStatus,
        manageUrl,
        manageTokenExpiresAt,
      },
      201,
    );
  } catch (cause) {
    return json(
      {
        error:
          cause instanceof Error ? cause.message : "Unable to submit request.",
      },
      400,
    );
  }
});
