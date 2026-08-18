import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    );
    const offset = (page - 1) * limit;

    const status = searchParams.get("status");
    const department = searchParams.get("department");
    const search = searchParams.get("search");
    const usingDate = searchParams.get("usingDate");

    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        booking_passengers(*),
        approvals(*),
        vehicle_assignments(*),
        trip_logs(*),
        expenses(*)
      `,
        { count: "exact" },
      );

    if (status) {
      query = query.eq("status", status);
    }

    if (department) {
      query = query.eq("department", department);
    }

    if (usingDate) {
      query = query.eq("using_date", usingDate);
    }

    if (search) {
      query = query.or(
        `booking_no.ilike.%${search}%,requester_name.ilike.%${search}%,destination.ilike.%${search}%`,
      );
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: bookings, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: bookings ?? [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
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
