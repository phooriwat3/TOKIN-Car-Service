import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppData,
  AssignmentDraft,
  Booking,
  Driver,
  User,
  Vehicle,
} from "@/lib/types";

type ProfileRow = {
  id: string;
  employee_id: string;
  full_name: string;
  role: User["role"];
  department_id: string;
  department: { name: string } | { name: string }[] | null;
};

const one = <T>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : (value ?? undefined);

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export async function loadProfile(supabase: SupabaseClient): Promise<User> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);
  if (!authData.user) throw new Error("No authenticated user.");
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,employee_id,full_name,role,department_id,department:departments(name)",
    )
    .eq("id", authData.user.id)
    .single();
  throwIfError(error);
  const row = data as ProfileRow;
  return {
    id: row.id,
    employeeId: row.employee_id,
    fullName: row.full_name,
    email: authData.user.email ?? "",
    department: one(row.department)?.name ?? "",
    role: row.role,
  };
}

function mapBooking(row: any): Booking {
  const approval = [...(row.approvals ?? [])].sort((a, b) =>
    String(b.acted_at).localeCompare(String(a.acted_at)),
  )[0];
  const assignment = one(row.vehicle_assignments);
  const assignmentDraft = one(row.assignment_drafts);
  const trip = one(row.trip_logs);
  const expense = one(row.expenses);
  return {
    id: row.id,
    bookingNo: row.booking_no,
    requesterId: row.requester_id,
    requesterName: row.requester_name ?? one(row.requester)?.full_name ?? "",
    requesterEmail: row.requester_email ?? "",
    requesterEmployeeId: row.requester_employee_id ?? "",
    department: row.requester_department ?? one(row.department)?.name ?? "",
    status: row.status,
    requestType: row.request_type ?? "outside_company",
    approverId: row.approver_id ?? "",
    approverName: row.approver_name ?? "",
    approverEmail: row.approver_email ?? "",
    category: row.category,
    usingDate: row.using_date,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    pickupLocation: row.pickup_location,
    destination: row.destination,
    purpose: row.purpose,
    numPassengers: row.num_passengers,
    passengerList: (row.booking_passengers ?? [])
      .sort((a: any, b: any) => a.seq - b.seq)
      .map((x: any) => x.name),
    overtimeEmployees: (row.overtime_employees ?? [])
      .sort((a: any, b: any) => a.seq - b.seq)
      .map((x: any) => ({
        employeeId: x.employee_id,
        employeeName: x.employee_name,
        employeeEmail: x.employee_email ?? "",
        workDescription: x.work_description,
        workStart: String(x.work_start).slice(0, 5),
        workEnd: String(x.work_end).slice(0, 5),
        totalWeeklyHours: Number(x.total_weekly_hours),
        transportRequired: x.transport_required,
        busStop: x.bus_stop ?? "",
        assignedVehicleId: x.assigned_vehicle_id ?? undefined,
        assignedDriverId: x.assigned_driver_id ?? undefined,
        assignedNotes: x.assigned_notes ?? undefined,
      })),
    meetingPoint: row.meeting_point,
    withStaff: row.with_staff ?? false,
    vehicleTypePref: row.vehicle_type_pref,
    driverRequired: row.driver_required,
    urgent: row.urgent,
    urgentReason: row.urgent_reason ?? undefined,
    afterHours: row.after_hours,
    overtimeTransport: row.overtime_transport,
    sourceSystem: row.source_system ?? "transport_portal",
    sourceReference: row.source_reference ?? undefined,
    sourceConfirmed: row.source_confirmed ?? false,
    requestOrigin: row.request_origin ?? "employee",
    createdByName: row.created_by_name ?? "",
    otVerificationStatus: row.ot_verification_status ??
      (row.request_type === "overtime" ? "pending" : "not_required"),
    otVerificationMode: row.ot_verification_mode ?? "tiger_space",
    otVerifiedAt: row.ot_verified_at ?? undefined,
    otVerificationNote: row.ot_verification_note ?? undefined,
    createdAt: row.created_at,
    rejectReason: row.reject_reason ?? undefined,
    approval: approval
      ? {
          action: approval.action,
          comments: approval.comments ?? "",
          actedAt: approval.acted_at,
          approverName:
            approval.approver_name ?? one(approval.approver)?.full_name ?? "",
        }
      : undefined,
    assignment: assignment
      ? {
          vehicleId: assignment.vehicle_id,
          driverId: assignment.driver_id,
          manualTransportUnits: Array.isArray(assignment.manual_transport_units)
            ? assignment.manual_transport_units
            : [],
          assignedAt: assignment.assigned_at,
          notes: assignment.notes ?? undefined,
          accepted: Boolean(assignment.driver_accepted),
        }
      : undefined,
    assignmentDraft: assignmentDraft
      ? {
          vehicleId: assignmentDraft.vehicle_id,
          driverId: assignmentDraft.driver_id,
          notes: assignmentDraft.notes ?? undefined,
          plannedAt: assignmentDraft.updated_at ?? assignmentDraft.planned_at,
        }
      : undefined,
    tripLog: trip
      ? {
          actualTimeOut: trip.actual_time_out ?? undefined,
          actualTimeIn: trip.actual_time_in ?? undefined,
          startMileage:
            trip.start_mileage == null ? undefined : Number(trip.start_mileage),
          endMileage:
            trip.end_mileage == null ? undefined : Number(trip.end_mileage),
          fuelCost: Number(expense?.fuel_cost ?? 0),
          tollFee: Number(expense?.toll_fee ?? 0),
          parkingFee: Number(expense?.parking_fee ?? 0),
          remarks: trip.remarks ?? undefined,
        }
      : undefined,
  };
}

export async function loadAppData(supabase: SupabaseClient): Promise<AppData> {
  const [bookingsResult, vehiclesResult, driversResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `
      *,
      requester:profiles!bookings_requester_id_fkey(full_name),
      department:departments!bookings_department_id_fkey(name),
      booking_passengers(name,seq),
      overtime_employees(*),
      approvals(action,comments,acted_at,approver_name,approver_email,approver:profiles!approvals_approver_id_fkey(full_name)),
      assignment_drafts(vehicle_id,driver_id,notes,planned_at,updated_at),
      vehicle_assignments(vehicle_id,driver_id,manual_transport_units,assigned_at,notes,driver_accepted),
      trip_logs(actual_time_out,actual_time_in,start_mileage,end_mileage,remarks),
      expenses(fuel_cost,toll_fee,parking_fee)
    `,
      )
      .order("created_at", { ascending: false }),
    supabase.from("vehicles").select("*").order("license_plate"),
    supabase.from("drivers").select("*").order("full_name"),
  ]);
  throwIfError(bookingsResult.error);
  throwIfError(vehiclesResult.error);
  throwIfError(driversResult.error);

  return {
    bookings: (bookingsResult.data ?? []).map(mapBooking),
    vehicles: (vehiclesResult.data ?? []).map(
      (row: any): Vehicle => ({
        id: row.id,
        licensePlate: row.license_plate,
        brand: row.brand,
        model: row.model,
        type: row.vehicle_type,
        capacity: row.capacity,
        color: row.color ?? "",
        year: row.year ?? new Date().getFullYear(),
        active: row.is_active,
        notes: row.notes ?? undefined,
      }),
    ),
    drivers: (driversResult.data ?? []).map(
      (row: any): Driver => ({
        id: row.id,
        userId: row.user_id ?? undefined,
        employeeId: row.employee_id ?? "",
        fullName: row.full_name,
        phone: row.phone,
        licenseNumber: row.license_number,
        licenseExpiry: row.license_expiry,
        active: row.is_active,
        notes: row.notes ?? undefined,
      }),
    ),
  };
}

export async function deleteAllBookings(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("delete_all_bookings", {
    p_confirmation: "DELETE ALL BOOKINGS",
  });
  throwIfError(error);
  return Number(data ?? 0);
}

export async function insertBooking(
  supabase: SupabaseClient,
  booking: Booking,
): Promise<Booking> {
  if (booking.requestOrigin === "hr_direct") {
    const { data, error } = await supabase.rpc("create_admin_transport_booking", {
      p_employee_profile_id: booking.requesterId,
      p_using_date: booking.usingDate,
      p_start_time: booking.startTime,
      p_end_time: booking.endTime,
      p_pickup_location: booking.pickupLocation,
      p_destination: booking.destination,
      p_purpose: booking.purpose,
      p_meeting_point: booking.meetingPoint,
      p_urgent: booking.urgent,
      p_urgent_reason: booking.urgentReason ?? null,
      p_verification_mode: booking.otVerificationMode ?? "tiger_space",
    });
    throwIfError(error);
    if (!data) throw new Error("HR transport booking was not created.");
    const refreshed = await loadAppData(supabase);
    const created = refreshed.bookings.find((item) => item.id === data);
    if (!created) throw new Error("Created HR transport booking was not found.");
    return created;
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);
  if (!authData.user) throw new Error("No authenticated user.");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", authData.user.id)
    .single();
  throwIfError(profileError);
  if (!profile) throw new Error("Profile not found.");
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      requester_id: booking.requesterId,
      requester_name: booking.requesterName,
      requester_email: booking.requesterEmail ?? authData.user.email ?? "",
      requester_employee_id: booking.requesterEmployeeId ?? null,
      requester_department: booking.department,
      department_id: profile.department_id,
      status: booking.status,
      request_type: booking.requestType ?? "outside_company",
      approver_id: booking.approverId,
      approver_name: booking.approverName,
      approver_email: booking.approverEmail,
      with_staff: booking.withStaff ?? false,
      category: booking.category,
      using_date: booking.usingDate,
      start_time: booking.startTime,
      end_time: booking.endTime,
      pickup_location: booking.pickupLocation,
      destination: booking.destination,
      purpose: booking.purpose,
      num_passengers: booking.numPassengers,
      meeting_point: booking.meetingPoint,
      vehicle_type_pref: booking.vehicleTypePref,
      driver_required: booking.driverRequired,
      urgent: booking.urgent,
      urgent_reason: booking.urgentReason ?? null,
      after_hours: booking.afterHours,
      overtime_transport: booking.overtimeTransport,
    })
    .select("id")
    .single();
  throwIfError(error);
  if (!data) throw new Error("Booking was not created.");

  if (booking.passengerList.length) {
    const { error: passengerError } = await supabase
      .from("booking_passengers")
      .insert(
        booking.passengerList.map((name, seq) => ({
          booking_id: data.id,
          name,
          seq,
        })),
      );
    throwIfError(passengerError);
  }

  if (booking.overtimeEmployees?.length) {
    const { error: overtimeError } = await supabase
      .from("overtime_employees")
      .insert(
        booking.overtimeEmployees.map((employee, seq) => ({
          booking_id: data.id,
          employee_id: employee.employeeId,
          employee_name: employee.employeeName,
          employee_email: employee.employeeEmail ?? null,
          work_description: employee.workDescription,
          work_start: employee.workStart,
          work_end: employee.workEnd,
          total_weekly_hours: employee.totalWeeklyHours,
          transport_required: employee.transportRequired,
          bus_stop: employee.transportRequired ? employee.busStop : null,
          assigned_vehicle_id: employee.assignedVehicleId ?? null,
          assigned_driver_id: employee.assignedDriverId ?? null,
          assigned_notes: employee.assignedNotes ?? null,
          seq,
        })),
      );
    throwIfError(overtimeError);
  }

  const refreshed = await loadAppData(supabase);
  return refreshed.bookings.find((item) => item.id === data.id)!;
}
export async function persistAssignmentDraft(
  supabase: SupabaseClient,
  bookingId: string,
  draft: AssignmentDraft,
): Promise<void> {
  const { error } = await supabase.rpc("save_assignment_draft", {
    p_booking_id: bookingId,
    p_vehicle_id: draft.vehicleId,
    p_driver_id: draft.driverId,
    p_notes: draft.notes ?? null,
  });
  throwIfError(error);
}

export async function persistBookingUpdate(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Booking>,
): Promise<void> {
  let result: { error: any };
  if (patch.approval) {
    result = await supabase.rpc("decide_booking", {
      p_booking_id: id,
      p_action: patch.approval.action,
      p_comments: patch.approval.comments,
    });
  } else if (patch.assignment && patch.assignment.accepted) {
    result = await supabase.rpc("accept_assignment", { p_booking_id: id });
  } else if (patch.assignment) {
    result = patch.assignment.manualTransportUnits?.length
      ? await supabase.rpc("assign_booking_manual", {
          p_booking_id: id,
          p_transport_units: patch.assignment.manualTransportUnits,
          p_notes: patch.assignment.notes ?? null,
        })
      : await supabase.rpc("assign_booking", {
          p_booking_id: id,
          p_vehicle_id: patch.assignment.vehicleId,
          p_driver_id: patch.assignment.driverId,
          p_notes: patch.assignment.notes ?? null,
        });
    if (patch.overtimeEmployees?.length) {
      for (const emp of patch.overtimeEmployees) {
        await supabase
          .from("overtime_employees")
          .update({
            assigned_vehicle_id: emp.assignedVehicleId ?? null,
            assigned_driver_id: emp.assignedDriverId ?? null,
            assigned_notes: emp.assignedNotes ?? null,
          })
          .eq("booking_id", id)
          .eq("employee_id", emp.employeeId);
      }
    }
  } else if (patch.otVerificationStatus) {
    result = await supabase.rpc("verify_tiger_space_booking", {
      p_booking_id: id,
      p_result: patch.otVerificationStatus,
      p_note: patch.otVerificationNote ?? null,
    });
  } else if (patch.status === "in_progress" && patch.tripLog) {
    result = await supabase.rpc("start_trip", {
      p_booking_id: id,
      p_actual_time_out: patch.tripLog.actualTimeOut
        ? new Date(patch.tripLog.actualTimeOut).toISOString()
        : null,
      p_start_mileage: patch.tripLog.startMileage,
    });
  } else if (patch.status === "completed" && patch.tripLog) {
    result = await supabase.rpc("complete_trip", {
      p_booking_id: id,
      p_actual_time_in: patch.tripLog.actualTimeIn,
      p_end_mileage: patch.tripLog.endMileage,
      p_fuel_cost: patch.tripLog.fuelCost,
      p_toll_fee: patch.tripLog.tollFee,
      p_parking_fee: patch.tripLog.parkingFee,
      p_remarks: patch.tripLog.remarks ?? null,
    });
  } else {
    result = await supabase
      .from("bookings")
      .update({
        status: patch.status,
        reject_reason: patch.rejectReason,
      })
      .eq("id", id);
  }
  throwIfError(result.error);
}

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
export async function persistVehicle(
  supabase: SupabaseClient,
  vehicle: Vehicle,
) {
  const payload = {
    license_plate: vehicle.licensePlate,
    brand: vehicle.brand,
    model: vehicle.model,
    vehicle_type: vehicle.type,
    capacity: vehicle.capacity,
    color: vehicle.color,
    year: vehicle.year,
    is_active: vehicle.active,
    notes: vehicle.notes ?? null,
  };
  const result = isUuid(vehicle.id)
    ? await supabase.from("vehicles").update(payload).eq("id", vehicle.id)
    : await supabase.from("vehicles").insert(payload);
  throwIfError(result.error);
}

export async function persistDriver(supabase: SupabaseClient, driver: Driver) {
  const payload = {
    user_id: driver.userId ?? null,
    employee_id: driver.employeeId,
    full_name: driver.fullName,
    phone: driver.phone,
    license_number: driver.licenseNumber,
    license_expiry: driver.licenseExpiry,
    is_active: driver.active,
    notes: driver.notes ?? null,
  };
  const result = isUuid(driver.id)
    ? await supabase.from("drivers").update(payload).eq("id", driver.id)
    : await supabase.from("drivers").insert(payload);
  throwIfError(result.error);
}
