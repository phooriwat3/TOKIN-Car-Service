import { describe, expect, it } from "vitest";
import {
  bookingMatchesOperationalStage,
  countBookingsByOperationalStage,
  getOperationalStage,
  hasTransportAssignment,
  isBookingReadyForAssignment,
  isOperationalStage,
} from "./operations-queue";
import type { Booking } from "./types";

function booking(partial: Partial<Booking>): Booking {
  return {
    id: partial.id ?? "booking-1",
    bookingNo: partial.bookingNo ?? "CSR-2026-000001",
    requesterId: "user-1",
    requesterName: "Employee One",
    department: "GA",
    status: "pending_approval",
    category: "business_trip",
    usingDate: "2026-10-24",
    startTime: "08:00",
    endTime: "10:00",
    pickupLocation: "TOKIN",
    destination: "Supplier",
    purpose: "Business visit",
    numPassengers: 1,
    passengerList: [],
    meetingPoint: "front_area",
    vehicleTypePref: "any",
    driverRequired: true,
    urgent: false,
    afterHours: false,
    overtimeTransport: false,
    createdAt: "2026-10-24T01:00:00.000Z",
    ...partial,
  };
}

describe("GA operational queue", () => {
  it("classifies every actionable workflow stage", () => {
    expect(getOperationalStage(booking({ status: "pending_approval" }))).toBe("needs_review");
    expect(getOperationalStage(booking({ status: "approved" }))).toBe("ready_to_plan");
    expect(
      getOperationalStage(
        booking({
          status: "approved",
          assignment: { assignedAt: "2026-10-24T02:00:00.000Z", accepted: false, vehicleId: "v1" },
        }),
      ),
    ).toBe("assigned");
    expect(getOperationalStage(booking({ status: "in_progress" }))).toBe("in_progress");
    expect(getOperationalStage(booking({ status: "completed" }))).toBe("completed");
  });

  it("returns assigned status only when fleet details exist", () => {
    const inconsistent = booking({ status: "assigned", assignment: undefined });
    expect(hasTransportAssignment(inconsistent)).toBe(false);
    expect(getOperationalStage(inconsistent)).toBe("ready_to_plan");
    expect(isBookingReadyForAssignment(inconsistent)).toBe(true);
  });

  it("counts stages without double-counting requests", () => {
    const bookings = [
      booking({ id: "1", status: "pending_ot_verification" }),
      booking({ id: "2", status: "approved" }),
      booking({
        id: "3",
        status: "scheduled",
        assignment: {
          assignedAt: "2026-10-24T02:00:00.000Z",
          accepted: false,
          manualTransportUnits: [
            {
              unitId: "unit-1",
              licensePlate: "1กก 1234",
              brand: "Toyota",
              vehicleType: "Van",
              driverName: "Driver One",
              driverPhone: "0812345678",
              employeeIds: [],
            },
          ],
        },
      }),
      booking({ id: "4", status: "in_progress" }),
      booking({ id: "5", status: "cancelled" }),
    ];

    expect(countBookingsByOperationalStage(bookings)).toEqual({
      all: 5,
      needs_review: 1,
      ready_to_plan: 1,
      assigned: 1,
      in_progress: 1,
      completed: 1,
    });
  });

  it("validates stage parameters and stage matching", () => {
    expect(isOperationalStage("ready_to_plan")).toBe(true);
    expect(isOperationalStage("today")).toBe(false);
    expect(bookingMatchesOperationalStage(booking({ status: "approved" }), "ready_to_plan")).toBe(true);
    expect(bookingMatchesOperationalStage(booking({ status: "approved" }), "completed")).toBe(false);
  });
});
