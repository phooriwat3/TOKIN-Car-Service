import { describe, expect, it } from "vitest";
import { detectSmartGroups } from "./smart-grouping";
import type { Booking } from "./types";

function makeBooking(partial: Partial<Booking>): Booking {
  return {
    id: "b-" + Math.random().toString(36).substring(2, 9),
    bookingNo: "CSR-2026-0001",
    requesterId: "u1",
    requesterName: "Test User",
    department: "PE",
    status: "approved",
    category: "overtime_transport",
    usingDate: "2026-09-08",
    startTime: "17:20",
    endTime: "20:00",
    pickupLocation: "Front Area",
    destination: "สายโรจนะ - วังน้อย",
    purpose: "OT Work",
    numPassengers: 1,
    passengerList: [],
    meetingPoint: "front_area",
    vehicleTypePref: "van",
    driverRequired: true,
    urgent: false,
    afterHours: true,
    overtimeTransport: true,
    requestType: "overtime",
    createdAt: new Date().toISOString(),
    overtimeEmployees: [
      {
        employeeId: "E001",
        employeeName: "Employee 1",
        employeePhone: "081-111-2222",
        workDescription: "Production support",
        workStart: "17:20",
        workEnd: "20:00",
        totalWeeklyHours: 12,
        transportRequired: true,
        busStop: "ปากทางโรจนะ",
      },
    ],
    ...partial,
  };
}

describe("Shift-aware Smart Grouping", () => {
  it("groups requests with matching Date + Route + Shift End Time", () => {
    const b1 = makeBooking({ id: "b1", endTime: "20:00", destination: "สายโรจนะ - วังน้อย" });
    const b2 = makeBooking({ id: "b2", endTime: "20:00", destination: "สายโรจนะ - วังน้อย" });

    const groups = detectSmartGroups([b1, b2]);
    expect(groups.length).toBe(1);
    expect(groups[0].bookings.length).toBe(2);
    expect(groups[0].shiftEndTime).toBe("20:00");
    expect(groups[0].totalPassengers).toBe(2);
    expect(groups[0].occupancyStatus).toBe("available");
  });

  it("does NOT group requests with DIFFERENT Shift End Times (e.g. 16:45 vs 20:00)", () => {
    const bEarly = makeBooking({ id: "bEarly", endTime: "16:45", destination: "สายโรจนะ - วังน้อย" });
    const bLate = makeBooking({ id: "bLate", endTime: "20:00", destination: "สายโรจนะ - วังน้อย" });

    const groups = detectSmartGroups([bEarly, bLate]);
    expect(groups.length).toBe(0); // Cannot group 1 early and 1 late
  });

  it("does not suggest assignment before approval or OT verification", () => {
    const pendingApproval = makeBooking({ id: "pending-1", status: "pending_approval" });
    const pendingVerification = makeBooking({ id: "pending-2", status: "pending_ot_verification" });

    expect(detectSmartGroups([pendingApproval, pendingVerification])).toEqual([]);
  });

  it("correctly flags full and overflow van capacity", () => {
    // 10 passengers = full
    const bookingsFull: Booking[] = Array.from({ length: 10 }, (_, i) =>
      makeBooking({ id: `full-${i}`, endTime: "20:00", destination: "สายเสนา" }),
    );
    const groupsFull = detectSmartGroups(bookingsFull);
    expect(groupsFull.length).toBe(1);
    expect(groupsFull[0].totalPassengers).toBe(10);
    expect(groupsFull[0].occupancyStatus).toBe("full");

    // 11 passengers = overflow
    const bookingsOverflow: Booking[] = Array.from({ length: 11 }, (_, i) =>
      makeBooking({ id: `overflow-${i}`, endTime: "20:00", destination: "สายเสนา" }),
    );
    const groupsOverflow = detectSmartGroups(bookingsOverflow);
    expect(groupsOverflow.length).toBe(1);
    expect(groupsOverflow[0].totalPassengers).toBe(11);
    expect(groupsOverflow[0].occupancyStatus).toBe("overflow");
  });
});
