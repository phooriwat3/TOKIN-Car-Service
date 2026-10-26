import { describe, expect, it } from "vitest";
import {
  createLineCancellationMessage,
  createLineDispatchMessage,
  createLineShareUrl,
} from "./line-dispatch";
import type { Booking, ManualTransportUnit } from "./types";

const booking: Booking = {
  id: "booking-1",
  bookingNo: "CSR-2026-000017",
  requesterId: "requester-1",
  requesterName: "Watcharaphong Punupa",
  requesterPhone: "081-111-2222",
  requesterEmployeeId: "2172172",
  department: "IT",
  status: "approved",
  requestType: "overtime",
  category: "overtime_transport",
  usingDate: "2026-10-24",
  startTime: "17:00",
  endTime: "20:00",
  pickupLocation: "TOKIN Front Area",
  destination: "Rojana Market",
  purpose: "Confidential internal purpose",
  numPassengers: 1,
  passengerList: [],
  overtimeEmployees: [
    {
      employeeId: "2172172",
      employeeName: "Watcharaphong Punupa",
      employeePhone: "081-111-2222",
      workDescription: "Confidential work",
      workStart: "17:00",
      workEnd: "20:00",
      totalWeeklyHours: 44,
      transportRequired: true,
      busStop: "Rojana Market",
    },
  ],
  meetingPoint: "front_area",
  vehicleTypePref: "van",
  driverRequired: true,
  urgent: false,
  afterHours: true,
  overtimeTransport: true,
  createdAt: "2026-10-24T08:00:00.000Z",
};

const unit: ManualTransportUnit = {
  unitId: "unit-1",
  licensePlate: "1กข-9999",
  brand: "Toyota",
  vehicleType: "Van",
  driverName: "Somchai Dee",
  driverPhone: "089-999-8888",
  contractorName: "Rojana Transport",
  employeeIds: ["2172172"],
};

describe("LINE driver dispatch", () => {
  it("creates a concise Thai dispatch message from GA-approved details", () => {
    const message = createLineDispatchMessage({
      bookings: [booking],
      unit,
      notes: "Meet at the front gate 10 minutes early.",
      capacity: 10,
    });

    expect(message).toContain("ใบสั่งงานรถรับส่ง OT");
    expect(message).toContain("CSR-2026-000017");
    expect(message).toContain("24/10/2026");
    expect(message).toContain("Somchai Dee · 089-999-8888");
    expect(message).toContain("Watcharaphong Punupa (IT) · 081-111-2222");
    expect(message).toContain("ว่าง 9 ที่นั่ง");
  });

  it("does not expose the employee purpose or work description", () => {
    const message = createLineDispatchMessage({ bookings: [booking], unit });

    expect(message).not.toContain(booking.purpose);
    expect(message).not.toContain("Confidential work");
  });

  it("creates a URL-encoded LINE share link", () => {
    const url = createLineShareUrl("รถพร้อมแล้ว\nCSR-2026-000017");

    expect(url).toMatch(/^https:\/\/line\.me\/R\/msg\/text\/\?/);
    expect(decodeURIComponent(url.split("?")[1])).toBe(
      "รถพร้อมแล้ว\nCSR-2026-000017",
    );
  });

  it("creates a privacy-minimized cancellation message for the driver", () => {
    const message = createLineCancellationMessage({
      booking,
      reason: "Customer meeting was postponed.",
      vehicleLabel: "1-9999 Toyota Van",
      driverName: "Somchai Dee",
    });

    expect(message).toContain("TRIP CANCELLED");
    expect(message).toContain("CSR-2026-000017");
    expect(message).toContain("Customer meeting was postponed.");
    expect(message).toContain("Somchai Dee");
    expect(message).not.toContain(booking.purpose);
    expect(message).not.toContain("Watcharaphong Punupa");
  });
});
