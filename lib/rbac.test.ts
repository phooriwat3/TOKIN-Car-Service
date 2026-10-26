import { describe, expect, it } from "vitest";
import {
  canAccessAuditLogs,
  canAccessDrpOverride,
  canAccessFinancialLedger,
  canApproveDepartment,
  canDispatchVehicles,
  canSubmitPriorityRequest,
  canViewUnmaskedPii,
  filterBookingForRole,
} from "./rbac";
import { Booking } from "./types";

describe("Enterprise RBAC Permission Matrix", () => {
  describe("Role permissions", () => {
    it("enforces canViewUnmaskedPii for admin only", () => {
      expect(canViewUnmaskedPii("admin")).toBe(true);
      expect(canViewUnmaskedPii("approver")).toBe(false);
      expect(canViewUnmaskedPii("requester")).toBe(false);
      expect(canViewUnmaskedPii("finance")).toBe(false);
      expect(canViewUnmaskedPii("auditor")).toBe(false);
    });

    it("enforces canApproveDepartment boundaries", () => {
      expect(canApproveDepartment("admin", "GA", "PE")).toBe(true);
      expect(canApproveDepartment("executive", "EXEC", "PE")).toBe(true);
      expect(canApproveDepartment("approver", "PE", "PE")).toBe(true);
      expect(canApproveDepartment("approver", "PE", "QA")).toBe(false);
      expect(canApproveDepartment("requester", "PE", "PE")).toBe(false);
    });

    it("enforces canDispatchVehicles for admin only", () => {
      expect(canDispatchVehicles("admin")).toBe(true);
      expect(canDispatchVehicles("approver")).toBe(false);
      expect(canDispatchVehicles("driver")).toBe(false);
      expect(canDispatchVehicles("finance")).toBe(false);
    });

    it("enforces canAccessFinancialLedger for admin and finance", () => {
      expect(canAccessFinancialLedger("admin")).toBe(true);
      expect(canAccessFinancialLedger("finance")).toBe(true);
      expect(canAccessFinancialLedger("approver")).toBe(false);
      expect(canAccessFinancialLedger("requester")).toBe(false);
      expect(canAccessFinancialLedger("driver")).toBe(false);
    });

    it("enforces canAccessAuditLogs for admin and auditor", () => {
      expect(canAccessAuditLogs("admin")).toBe(true);
      expect(canAccessAuditLogs("auditor")).toBe(true);
      expect(canAccessAuditLogs("approver")).toBe(false);
      expect(canAccessAuditLogs("requester")).toBe(false);
    });

    it("enforces canAccessDrpOverride for admin only", () => {
      expect(canAccessDrpOverride("admin")).toBe(true);
      expect(canAccessDrpOverride("requester")).toBe(false);
      expect(canAccessDrpOverride("finance")).toBe(false);
    });

    it("enforces canSubmitPriorityRequest for admin and executive", () => {
      expect(canSubmitPriorityRequest("admin")).toBe(true);
      expect(canSubmitPriorityRequest("executive")).toBe(true);
      expect(canSubmitPriorityRequest("requester")).toBe(false);
    });
  });

  describe("filterBookingForRole", () => {
    const sampleBooking: Booking = {
      id: "b-rbac-1",
      bookingNo: "BK-2026-099",
      requesterId: "u-emp1",
      requesterName: "Wichai Thong",
      requesterPhone: "0891234567",
      requesterEmployeeId: "TK8899",
      department: "QA",
      status: "approved",
      category: "overtime_transport",
      usingDate: "2026-09-08",
      startTime: "17:00",
      endTime: "20:00",
      pickupLocation: "TOKIN Factory",
      destination: "หมู่บ้านร่มเย็น ซอย 5",
      purpose: "Urgent QA testing",
      numPassengers: 1,
      passengerList: ["Wichai Thong"],
      overtimeEmployees: [
        {
          employeeId: "TK8899",
          employeeName: "Wichai Thong",
          employeePhone: "0891234567",
          workDescription: "Defect inspection",
          workStart: "17:00",
          workEnd: "20:00",
          totalWeeklyHours: 8,
          transportRequired: true,
          busStop: "หมู่บ้านร่มเย็น ซอย 5",
        },
      ],
      meetingPoint: "front_area",
      vehicleTypePref: "van",
      driverRequired: true,
      urgent: false,
      afterHours: true,
      overtimeTransport: true,
      createdAt: "2026-09-08T09:00:00Z",
      assignment: {
        assignedAt: "2026-09-08T10:00:00Z",
        accepted: true,
        contractorName: "Van Service Group",
        tripRateThb: 1800,
      },
    };

    it("preserves unmasked data for admin", () => {
      const filtered = filterBookingForRole(sampleBooking, "admin");
      expect(filtered.requesterPhone).toBe("0891234567");
      expect(filtered.requesterEmployeeId).toBe("TK8899");
      expect(filtered.assignment?.tripRateThb).toBe(1800);
    });

    it("masks PII and hides trip rate for peer requester", () => {
      const filtered = filterBookingForRole(sampleBooking, "requester", "TK9999");
      expect(filtered.requesterPhone).toBe("089-***-4567");
      expect(filtered.requesterEmployeeId).toBe("TK***99");
      expect(filtered.overtimeEmployees?.[0].employeePhone).toBe("089-***-4567");
      expect(filtered.assignment?.tripRateThb).toBeUndefined();
    });

    it("unmasks employee ID and phone when requester views their own booking", () => {
      const filtered = filterBookingForRole(sampleBooking, "requester", "TK8899");
      expect(filtered.requesterPhone).toBe("0891234567");
      expect(filtered.requesterEmployeeId).toBe("TK8899");
      expect(filtered.overtimeEmployees?.[0].employeePhone).toBe("0891234567");
    });

    it("gives finance access to financial rate while masking personal phone", () => {
      const filtered = filterBookingForRole(sampleBooking, "finance", "TK_FINANCE");
      expect(filtered.assignment?.tripRateThb).toBe(1800);
      expect(filtered.requesterPhone).toBe("089-***-4567");
    });
  });
});
