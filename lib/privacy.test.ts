import { describe, expect, it } from "vitest";
import {
  anonymizeBookingForArchival,
  maskDropoffLocation,
  maskEmployeeId,
  maskPhoneNumber,
  PDPA_REDACTED_PHONE,
} from "./privacy";
import { Booking } from "./types";

describe("Thailand PDPA PII Masking Utilities", () => {
  describe("maskPhoneNumber", () => {
    it("masks standard 10-digit Thai mobile number", () => {
      expect(maskPhoneNumber("0812345678", "requester")).toBe("081-***-5678");
      expect(maskPhoneNumber("098-765-4321", "requester")).toBe("098-***-4321");
    });

    it("masks international formatted numbers", () => {
      expect(maskPhoneNumber("66812345678", "approver")).toBe("+66-81-***-5678");
    });

    it("returns raw unmasked number for admin when forceUnmask is enabled", () => {
      expect(maskPhoneNumber("0812345678", "admin", true)).toBe("0812345678");
    });

    it("masks number for admin by default unless forceUnmask is true", () => {
      expect(maskPhoneNumber("0812345678", "admin", false)).toBe("081-***-5678");
    });

    it("handles empty or invalid phone values safely", () => {
      expect(maskPhoneNumber(undefined)).toBe("");
      expect(maskPhoneNumber(null as unknown as string)).toBe("");
      expect(maskPhoneNumber("")).toBe("");
    });
  });

  describe("maskEmployeeId", () => {
    it("masks employee ID for peer viewers", () => {
      expect(maskEmployeeId("TK009876", "requester")).toBe("TK***76");
    });

    it("preserves unmasked employee ID for admin or approver", () => {
      expect(maskEmployeeId("TK009876", "admin")).toBe("TK009876");
      expect(maskEmployeeId("TK009876", "approver")).toBe("TK009876");
    });

    it("preserves unmasked employee ID when viewing own record", () => {
      expect(maskEmployeeId("TK009876", "requester", true)).toBe("TK009876");
    });

    it("handles short IDs safely", () => {
      expect(maskEmployeeId("12", "requester")).toBe("***");
    });
  });

  describe("maskDropoffLocation", () => {
    it("generalizes private house numbers and sub-sois for peer viewers", () => {
      const sensitiveAddress = "โรจนะ ซอย 12 บ้านเลขที่ 45/2 ตลาดสี่ขวา";
      const masked = maskDropoffLocation(sensitiveAddress, "requester");
      expect(masked).not.toContain("บ้านเลขที่ 45/2");
      expect(masked).toContain("ตลาดสี่ขวา");
    });

    it("preserves exact drop-off coordinates for admin and driver", () => {
      const sensitiveAddress = "โรจนะ ซอย 12 บ้านเลขที่ 45/2";
      expect(maskDropoffLocation(sensitiveAddress, "admin")).toBe(sensitiveAddress);
      expect(maskDropoffLocation(sensitiveAddress, "driver")).toBe(sensitiveAddress);
    });
  });

  describe("anonymizeBookingForArchival", () => {
    const mockBooking: Booking = {
      id: "b-test-archival",
      bookingNo: "BK-2025-001",
      requesterId: "req-1",
      requesterName: "Somchai Jaidee",
      requesterPhone: "0812345678",
      requesterEmployeeId: "TK1001",
      department: "PE",
      status: "completed",
      category: "overtime_transport",
      usingDate: "2025-01-15",
      startTime: "17:00",
      endTime: "18:00",
      pickupLocation: "TOKIN Plant 1",
      destination: "Wang Noi",
      purpose: "Production overtime",
      numPassengers: 1,
      passengerList: ["Somchai Jaidee"],
      overtimeEmployees: [
        {
          employeeId: "TK1001",
          employeeName: "Somchai Jaidee",
          employeePhone: "0812345678",
          employeeEmail: "somchai@tokin.com",
          workDescription: "Machine calibration",
          workStart: "17:00",
          workEnd: "20:00",
          totalWeeklyHours: 12,
          transportRequired: true,
          busStop: "Wang Noi",
        },
      ],
      meetingPoint: "front_area",
      vehicleTypePref: "van",
      driverRequired: true,
      urgent: false,
      afterHours: true,
      overtimeTransport: true,
      createdAt: "2025-01-15T08:00:00Z",
      assignment: {
        assignedAt: "2025-01-15T15:00:00Z",
        accepted: true,
        contractorName: "Ayutthaya Transport Co.",
        tripRateThb: 1800,
        manualTransportUnits: [
          {
            unitId: "u1",
            licensePlate: "ฮพ-1234",
            brand: "Toyota Commuter",
            vehicleType: "Van",
            driverName: "Sombat",
            driverPhone: "0899998888",
            employeeIds: ["TK1001"],
          },
        ],
      },
    };

    it("scrubs requester and employee phones while preserving financial metrics", () => {
      const scrubbed = anonymizeBookingForArchival(mockBooking);

      expect(scrubbed.requesterPhone).toBe(PDPA_REDACTED_PHONE);
      expect(scrubbed.overtimeEmployees?.[0].employeePhone).toBe(PDPA_REDACTED_PHONE);
      expect(scrubbed.overtimeEmployees?.[0].employeeEmail).toBeUndefined();
      expect(scrubbed.assignment?.manualTransportUnits?.[0].driverPhone).toBe(PDPA_REDACTED_PHONE);

      // Verify business metrics retained for 3-year audit
      expect(scrubbed.department).toBe("PE");
      expect(scrubbed.assignment?.tripRateThb).toBe(1800);
      expect(scrubbed.destination).toBe("Wang Noi");
      expect(scrubbed.status).toBe("completed");
    });
  });
});
