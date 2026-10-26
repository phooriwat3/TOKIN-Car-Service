import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapBooking } from "@/lib/supabase/repository";
import { parseBookingListQuery } from "@/lib/booking-query";
import type { BookingStatus } from "@/lib/types";

const reviewStatuses: BookingStatus[] = [
  "pending_requester_confirmation",
  "pending_approval",
  "pending_ot_verification",
  "changes_requested",
];
const planningStatuses: BookingStatus[] = ["approved", "assigned", "scheduled"];
const completedStatuses: BookingStatus[] = ["completed", "rejected", "cancelled"];
async function loadStageCounts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const count = (statuses?: BookingStatus[], assignment?: "assigned" | "unassigned") => {
    let query = supabase
      .from("bookings")
      .select(
        assignment ? "id,vehicle_assignments(id)" : "id",
        { count: "exact", head: true },
      );
    if (statuses?.length) query = query.in("status", statuses);
    if (assignment === "assigned")
      query = query.not("vehicle_assignments", "is", null);
    if (assignment === "unassigned")
      query = query.is("vehicle_assignments", null);
    return query;
  };

  const [all, needsReview, readyToPlan, assigned, inProgress, completed] =
    await Promise.all([
      count(),
      count(reviewStatuses),
      count(planningStatuses, "unassigned"),
      count(planningStatuses, "assigned"),
      count(["in_progress"]),
      count(completedStatuses),
    ]);

  const error = [all, needsReview, readyToPlan, assigned, inProgress, completed]
    .map((result) => result.error)
    .find(Boolean);
  if (error) throw error;

  return {
    all: all.count ?? 0,
    needs_review: needsReview.count ?? 0,
    ready_to_plan: readyToPlan.count ?? 0,
    assigned: assigned.count ?? 0,
    in_progress: inProgress.count ?? 0,
    completed: completed.count ?? 0,
  };
}
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (
      profileError ||
      !profile?.is_active ||
      !["admin", "finance", "executive", "auditor"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const {
      page,
      limit,
      status,
      stage,
      department,
      search,
      usingDate,
      dateFrom,
      dateTo,
      requestType,
      assignmentStatus,
      urgent,
      otVerification,
    } = parseBookingListQuery(searchParams);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        booking_passengers(*),
        overtime_employees(*),
        approvals(*),
        vehicle_assignments(*),
        assignment_drafts(*),
        trip_logs(*),
        expenses(*)
      `,
        { count: "exact" },
      );

    if (status) query = query.eq("status", status);
    if (stage === "needs_review") query = query.in("status", reviewStatuses);
    if (stage === "ready_to_plan")
      query = query.in("status", planningStatuses).is("vehicle_assignments", null);
    if (stage === "assigned")
      query = query.in("status", planningStatuses).not("vehicle_assignments", "is", null);
    if (stage === "in_progress") query = query.eq("status", "in_progress");
    if (stage === "completed") query = query.in("status", completedStatuses);

    if (department) query = query.eq("requester_department", department);
    if (usingDate) query = query.eq("using_date", usingDate);
    if (dateFrom) query = query.gte("using_date", dateFrom);
    if (dateTo) query = query.lte("using_date", dateTo);
    if (requestType) query = query.eq("request_type", requestType);
    if (assignmentStatus === "assigned")
      query = query.not("vehicle_assignments", "is", null);
    if (assignmentStatus === "unassigned")
      query = query.is("vehicle_assignments", null);
    if (urgent) query = query.eq("urgent", true);
    if (otVerification) query = query.eq("status", "pending_ot_verification");

    if (search) {
      query = query.or(
        `booking_no.ilike.%${search}%,requester_name.ilike.%${search}%,requester_employee_id.ilike.%${search}%,destination.ilike.%${search}%`,
      );
    }

    query = query
      .order("using_date", { ascending: true })
      .order("start_time", { ascending: true })
      .range(offset, offset + limit - 1);

    const [bookingResult, stageCounts] = await Promise.all([
      query,
      loadStageCounts(supabase),
    ]);

    if (bookingResult.error) {
      return NextResponse.json(
        { error: bookingResult.error.message },
        { status: 500 },
      );
    }

    const total = bookingResult.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      data: (bookingResult.data ?? []).map(mapBooking),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
      facets: { stages: stageCounts },
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : "An unexpected error occurred",
      },
      { status: 500 },
    );
  }
}
