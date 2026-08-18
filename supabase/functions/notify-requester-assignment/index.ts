import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";
import { randomToken, sha256Hex } from "../_shared/request-access.ts";
import { assignmentEmail } from "../_shared/email-template.ts";

const appBaseUrl = () => {
  const configured = Deno.env.get("APP_BASE_URL")?.trim().replace(/\/+$/, "");
  return configured || "https://carservice.tokin.co.th";
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !token)
      return json({ error: "Unauthorized." }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: authData } = await authClient.auth.getUser(token);
    if (!authData.user) return json({ error: "Unauthorized." }, 401);
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();
    if (profile?.role !== "admin")
      return json({ error: "Admin access required." }, 403);

    const body = await request.json();
    const bookingId = typeof body.requestId === "string" ? body.requestId : "";
    const { data: booking, error } = await db
      .from("bookings")
      .select(
        `
      id,booking_no,revision_no,request_type,request_origin,requester_name,requester_email,using_date,start_time,end_time,pickup_location,destination,purpose,num_passengers,
      vehicle_assignments(
        vehicle_id,driver_id,notes,manual_transport_units,
        vehicle:vehicles(license_plate,brand,model),
        driver:drivers(full_name,phone)
      ),
      booking_passengers(name,seq),
      overtime_employees(*)
    `,
      )
      .eq("id", bookingId)
      .single();
    if (error || !booking) return json({ error: "Request not found." }, 404);

    const assignment = Array.isArray(booking.vehicle_assignments)
      ? booking.vehicle_assignments[0]
      : booking.vehicle_assignments;
    const vehicle = Array.isArray(assignment?.vehicle)
      ? assignment.vehicle[0]
      : assignment?.vehicle;
    const driver = Array.isArray(assignment?.driver)
      ? assignment.driver[0]
      : assignment?.driver;
    const transportUnits = Array.isArray(assignment?.manual_transport_units)
      ? assignment.manual_transport_units
      : [];
    const primaryManualUnit = transportUnits[0];
    if (!assignment || (!primaryManualUnit && (!vehicle || !driver)))
      return json({ error: "Assignment is incomplete." }, 409);
    const emailVehicle = primaryManualUnit
      ? {
          licensePlate: primaryManualUnit.licensePlate,
          brand: primaryManualUnit.brand,
          model: primaryManualUnit.vehicleType,
        }
      : {
          licensePlate: vehicle.license_plate,
          brand: vehicle.brand,
          model: vehicle.model,
        };
    const emailDriver = primaryManualUnit
      ? {
          name: primaryManualUnit.driverName,
          phone: primaryManualUnit.driverPhone ?? "",
        }
      : { name: driver.full_name, phone: driver.phone };

    const documentToken = randomToken();
    const documentTokenHash = await sha256Hex(documentToken);
    const documentExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60_000,
    ).toISOString();
    const viewUrl = `${appBaseUrl()}/request/assignment?token=${encodeURIComponent(documentToken)}`;
    const pdfUrl = `${appBaseUrl()}/api/request/assignment/pdf?token=${encodeURIComponent(documentToken)}`;
    const now = new Date().toISOString();
    const { error: revokeError } = await db
      .from("request_access_tokens")
      .update({ revoked_at: now })
      .eq("booking_id", booking.id)
      .eq("token_type", "assignment_document")
      .is("used_at", null)
      .is("revoked_at", null);
    if (revokeError) throw revokeError;
    const { error: tokenError } = await db
      .from("request_access_tokens")
      .insert({
        booking_id: booking.id,
        token_type: "assignment_document",
        token_hash: documentTokenHash,
        revision_no: booking.revision_no,
        subject_email: booking.requester_email,
        expires_at: documentExpiresAt,
      });
    if (tokenError) throw tokenError;

    const flowUrl = Deno.env.get("POWER_AUTOMATE_ASSIGNMENT_EMAIL_FLOW_URL");
    if (!flowUrl) {
      await db
        .from("bookings")
        .update({ requester_notification_status: "not_configured" })
        .eq("id", booking.id);
      return json({
        ok: true,
        notificationStatus: "not_configured",
        viewUrl,
        pdfUrl,
        expiresAt: documentExpiresAt,
      });
    }

    const { data: allVehicles } = await db
      .from("vehicles")
      .select("id,license_plate,brand,model");
    const { data: allDrivers } = await db
      .from("drivers")
      .select("id,full_name,phone");
    const vehicleMap = new Map((allVehicles ?? []).map((v: any) => [v.id, v]));
    const driverMap = new Map((allDrivers ?? []).map((d: any) => [d.id, d]));

    const employeeAssignments = (booking.overtime_employees ?? [])
      .filter((e: any) => e.transport_required && e.employee_email)
      .map((e: any) => {
        const manualUnit = transportUnits.find(
          (unit: any) =>
            Array.isArray(unit.employeeIds) &&
            unit.employeeIds.includes(e.employee_id),
        );
        const eVehicle = vehicleMap.get(e.assigned_vehicle_id) || vehicle;
        const eDriver = driverMap.get(e.assigned_driver_id) || driver;
        return {
          employeeId: e.employee_id,
          employeeName: e.employee_name,
          employeeEmail: e.employee_email,
          busStop: e.bus_stop,
          vehicle: manualUnit
            ? {
                licensePlate: manualUnit.licensePlate,
                brand: manualUnit.brand,
                model: manualUnit.vehicleType,
              }
            : {
                licensePlate: eVehicle?.license_plate ?? "",
                brand: eVehicle?.brand ?? "",
                model: eVehicle?.model ?? "",
              },
          driver: manualUnit
            ? {
                name: manualUnit.driverName,
                phone: manualUnit.driverPhone ?? "",
              }
            : { name: eDriver?.full_name ?? "", phone: eDriver?.phone ?? "" },
        };
      });
    const assignmentEmailTemplate = assignmentEmail({
      requestNo: booking.booking_no,
      requestType: booking.request_type,
      requestOrigin: booking.request_origin,
      requesterName: booking.requester_name,
      usingDate: booking.using_date,
      startTime: String(booking.start_time).slice(0, 5),
      endTime: String(booking.end_time).slice(0, 5),
      pickupLocation: booking.pickup_location,
      destination: booking.destination,
      purpose: booking.purpose,
      vehicle: emailVehicle,
      driver: emailDriver,
      transportUnits,
      notes: assignment.notes ?? "",
      overtimeEmployees:
        booking.request_type === "outside_company"
          ? (booking.booking_passengers?.length
              ? booking.booking_passengers
              : Array.from(
                  { length: booking.num_passengers },
                  (_item, index) => ({
                    name: `Passenger ${index + 1}`,
                    seq: index,
                  }),
                )
            )
              .sort((a: any, b: any) => a.seq - b.seq)
              .map((passenger: any, index: number) => ({
                employeeId: `passenger:${index}`,
                employeeName: passenger.name,
                workDescription: "",
                workStart: "",
                workEnd: "",
                totalWeeklyHours: 0,
                transportRequired: true,
                busStop: booking.destination,
              }))
          : (booking.overtime_employees ?? []).map((employee: any) => ({
              employeeId: employee.employee_id,
              employeeName: employee.employee_name,
              workDescription: employee.work_description,
              workStart: employee.work_start,
              workEnd: employee.work_end,
              totalWeeklyHours: employee.total_weekly_hours,
              transportRequired: employee.transport_required,
              busStop: employee.bus_stop,
            })),
      viewUrl,
      pdfUrl,
      expiresAt: documentExpiresAt,
    });

    const response = await fetch(flowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: booking.id,
        requestNo: booking.booking_no,
        requestType: booking.request_type,
        requestOrigin: booking.request_origin,
        requester: {
          name: booking.requester_name,
          email: booking.requester_email,
        },
        usingDate: booking.using_date,
        startTime: String(booking.start_time).slice(0, 5),
        endTime: String(booking.end_time).slice(0, 5),
        pickupLocation: booking.pickup_location,
        destination: booking.destination,
        purpose: booking.purpose,
        vehicle: emailVehicle,
        driver: emailDriver,
        transportUnits,
        notes: assignment.notes ?? "",
        employeeAssignments,
        viewUrl,
        pdfUrl,
        expiresAt: documentExpiresAt,
        ...assignmentEmailTemplate,
      }),
    });
    const notificationStatus = response.ok ? "sent" : "failed";
    await db
      .from("bookings")
      .update({ requester_notification_status: notificationStatus })
      .eq("id", booking.id);
    return json(
      {
        ok: response.ok,
        notificationStatus,
        viewUrl,
        pdfUrl,
        expiresAt: documentExpiresAt,
      },
      response.ok ? 200 : 502,
    );
  } catch (cause) {
    return json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : "Unable to notify requester.",
      },
      500,
    );
  }
});
