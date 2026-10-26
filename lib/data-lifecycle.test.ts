import { describe, expect, it } from "vitest";
import {
  classifyDataLifecycle,
  getAgeInDays,
  isEligibleForAnonymization,
  isEligibleForArchival,
  partitionBookingsByLifecycle,
  prepareBookingsForArchival,
} from "./data-lifecycle";
import { PDPA_REDACTED_PHONE } from "./privacy";
import { Booking } from "./types";

describe("Data Lifecycle & Archival Policies", () => {
  const refDate = new Date("2026-09-08T00:00:00Z");

  describe("getAgeInDays and classifyDataLifecycle", () => {
    it("classifies bookings <= 90 days as hot", () => {
      // 30 days ago
      expect(classifyDataLifecycle("2026-08-09", refDate)).toBe("hot");
      // 90 days ago
      expect(classifyDataLifecycle("2026-06-10", refDate)).toBe("hot");
    });

    it("classifies bookings 91-365 days as cold", () => {
      // 120 days ago
      expect(classifyDataLifecycle("2026-05-11", refDate)).toBe("cold");
      // 300 days ago
      expect(classifyDataLifecycle("2025-11-12", refDate)).toBe("cold");
    });

    it("classifies bookings > 365 days as anonymized", () => {
      // 400 days ago
      expect(classifyDataLifecycle("2025-08-04", refDate)).toBe("anonymized");
    });

    it("returns correct boolean eligibility for archival and anonymization", () => {
      expect(isEligibleForArchival("2026-08-01", refDate)).toBe(false);
      expect(isEligibleForArchival("2026-05-01", refDate)).toBe(true);

      expect(isEligibleForAnonymization("2026-01-01", refDate)).toBe(false);
      expect(isEligibleForAnonymization("2025-01-01", refDate)).toBe(true);
    });
  });

  describe("partitionBookingsByLifecycle", () => {
    const bookings: Booking[] = [
      {
        id: "b1-hot",
        bookingNo: "BK-HOT-01",
        requesterId: "r1",
        requesterName: "Nong Hot",
        requesterPhone: "0811111111",
        department: "PE",
        status: "approved",
        category: "overtime_transport",
        usingDate: "2026-09-01", // 7 days ago
        startTime: "17:00",
        endTime: "20:00",
        pickupLocation: "TOKIN",
        destination: "Rojana",
        purpose: "Hot run",
        numPassengers: 1,
        passengerList: ["Nong Hot"],
        meetingPoint: "front_area",
        vehicleTypePref: "van",
        driverRequired: true,
        urgent: false,
        afterHours: true,
        overtimeTransport: true,
        createdAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "b2-cold",
        bookingNo: "BK-COLD-01",
        requesterId: "r2",
        requesterName: "Nong Cold",
        requesterPhone: "0822222222",
        department: "QA",
        status: "completed",
        category: "overtime_transport",
        usingDate: "2026-05-01", // ~130 days ago
        startTime: "17:00",
        endTime: "20:00",
        pickupLocation: "TOKIN",
        destination: "Ayutthaya",
        purpose: "Cold audit",
        numPassengers: 1,
        passengerList: ["Nong Cold"],
        meetingPoint: "front_area",
        vehicleTypePref: "van",
        driverRequired: true,
        urgent: false,
        afterHours: true,
        overtimeTransport: true,
        createdAt: "2026-05-01T00:00:00Z",
      },
      {
        id: "b3-anon",
        bookingNo: "BK-ANON-01",
        requesterId: "r3",
        requesterName: "Nong Stale",
        requesterPhone: "0833333333",
        department: "TA MFG",
        status: "completed",
        category: "overtime_transport",
        usingDate: "2025-01-01", // > 600 days ago
        startTime: "17:00",
        endTime: "20:00",
        pickupLocation: "TOKIN",
        destination: "Wang Noi",
        purpose: "Ancient trip",
        numPassengers: 1,
        passengerList: ["Nong Stale"],
        meetingPoint: "front_area",
        vehicleTypePref: "van",
        driverRequired: true,
        urgent: false,
        afterHours: true,
        overtimeTransport: true,
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    it("partitions records into hot, cold, and scrubbed anonymized tiers", () => {
      const partitioned = partitionBookingsByLifecycle(bookings, refDate);

      expect(partitioned.hot).toHaveLength(1);
      expect(partitioned.hot[0].id).toBe("b1-hot");

      expect(partitioned.cold).toHaveLength(1);
      expect(partitioned.cold[0].id).toBe("b2-cold");
      expect(partitioned.cold[0].requesterPhone).toBe("0822222222");

      expect(partitioned.anonymized).toHaveLength(1);
      expect(partitioned.anonymized[0].id).toBe("b3-anon");
      // Must be scrubbed in compliance with PDPA
      expect(partitioned.anonymized[0].requesterPhone).toBe(PDPA_REDACTED_PHONE);
    });

    it("prepares archival batch with accurate scrub count", () => {
      const { archived, scrubbedCount } = prepareBookingsForArchival(bookings, refDate);
      expect(archived).toHaveLength(3);
      expect(scrubbedCount).toBe(1);
      expect(archived[2].requesterPhone).toBe(PDPA_REDACTED_PHONE);
    });
  });
});
