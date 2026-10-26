import { describe, expect, it } from "vitest";
import {
  bookingSchema,
  isValidThaiMobilePhone,
  normalizeThaiPhone,
  tripStartSchema,
  tripCompleteSchema,
} from "./validation";

describe("Validation helpers & schemas", () => {
  describe("Booking schema", () => {
    const validBooking = {
      category: "business_trip" as const,
      usingDate: "2099-01-02",
      startTime: "08:00",
      endTime: "09:00",
      pickupLocation: "TOKIN factory",
      destination: "Customer office",
      purpose: "Customer meeting",
      meetingPoint: "front_area" as const,
      vehicleTypePref: "van" as const,
      driverRequired: true,
      urgent: false,
      afterHours: false,
      overtimeTransport: false,
    };

    it("preserves required and invalid passenger messages on Zod 4", () => {
      const required = bookingSchema.safeParse(validBooking);
      expect(required.success).toBe(false);
      if (!required.success) {
        expect(required.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["numPassengers"],
            message: "Number of passengers is required",
          }),
        );
      }

      const invalid = bookingSchema.safeParse({
        ...validBooking,
        numPassengers: "two",
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["numPassengers"],
            message: "Enter a valid passenger count",
          }),
        );
      }
    });
  });

  describe("Thai mobile phone validation", () => {
    it("accepts valid Thai mobile numbers with various formatting", () => {
      expect(isValidThaiMobilePhone("0812345678")).toBe(true);
      expect(isValidThaiMobilePhone("081-234-5678")).toBe(true);
      expect(isValidThaiMobilePhone("092 345 6789")).toBe(true);
      expect(isValidThaiMobilePhone("065-987-6543")).toBe(true);
    });

    it("rejects invalid, landline, or incomplete numbers", () => {
      expect(isValidThaiMobilePhone("02-123-4567")).toBe(false); // Bangkok landline
      expect(isValidThaiMobilePhone("081-234-567")).toBe(false); // 9 digits
      expect(isValidThaiMobilePhone("081-234-56789")).toBe(false); // 11 digits
      expect(isValidThaiMobilePhone("1234567890")).toBe(false); // Doesn't start with 0
      expect(isValidThaiMobilePhone("")).toBe(false);
      expect(isValidThaiMobilePhone(undefined)).toBe(false);
    });

    it("normalizes phone numbers by stripping dashes and spaces", () => {
      expect(normalizeThaiPhone("081-234-5678")).toBe("0812345678");
      expect(normalizeThaiPhone("  092 345 6789  ")).toBe("0923456789");
    });
  });

  describe("Trip Schemas", () => {
    it("validates trip start schema properly", () => {
      const valid = tripStartSchema.safeParse({
        actualTimeOut: "2026-09-08 08:30",
        startMileage: 45100,
      });
      expect(valid.success).toBe(true);

      const invalid = tripStartSchema.safeParse({
        actualTimeOut: "",
        startMileage: -10,
      });
      expect(invalid.success).toBe(false);
    });

    it("validates trip complete schema properly", () => {
      const valid = tripCompleteSchema.safeParse({
        actualTimeIn: "2026-09-08 17:30",
        endMileage: 45220,
        fuelCost: 500,
        tollFee: 120,
        parkingFee: 40,
        remarks: "Smooth trip",
      });
      expect(valid.success).toBe(true);
    });
  });
});
