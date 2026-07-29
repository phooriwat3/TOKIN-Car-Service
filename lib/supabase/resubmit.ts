import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking } from "@/lib/types";

export async function resubmitBooking(
  supabase: SupabaseClient,
  booking: Booking,
): Promise<void> {
  const { error } = await supabase.rpc("resubmit_booking", {
    p_booking_id: booking.id,
    p_request_type: booking.requestType ?? "outside_company",
    p_approver_id: booking.approverId,
    p_using_date: booking.usingDate,
    p_start_time: booking.startTime,
    p_end_time: booking.endTime,
    p_pickup_location: booking.pickupLocation,
    p_destination: booking.destination,
    p_purpose: booking.purpose,
    p_meeting_point: booking.meetingPoint,
    p_with_staff: booking.withStaff ?? false,
    p_passengers: booking.passengerList,
    p_overtime_employees: booking.overtimeEmployees ?? [],
  });
  if (error) throw new Error(error.message);
}
