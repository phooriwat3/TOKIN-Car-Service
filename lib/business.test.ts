import { describe, expect, it } from "vitest";
import {
  approverPositionLabel,
  getApproverBadgeClass,
  calculateTripMileage,
  calculateCostPerKm,
  totalCost,
} from "./business";
import type { Booking } from "./types";

describe("business logic & off-site workflow helpers", () => {
  it("formats approver position labels correctly", () => {
    expect(approverPositionLabel("Supervisor")).toBe("Supervisor / Section Lead");
    expect(approverPositionLabel("Dept.Manager")).toBe("Department Manager");
    expect(approverPositionLabel("AGM.up")).toBe("Asst. General Manager & Above");
    expect(approverPositionLabel("Chief")).toBe("Chief / Unit Leader");
    expect(approverPositionLabel(undefined)).toBe("Approver");
  });

  it("returns appropriate badge classes by approver hierarchy tier", () => {
    expect(getApproverBadgeClass("AGM.up")).toContain("purple");
    expect(getApproverBadgeClass("Dept.Manager")).toContain("indigo");
    expect(getApproverBadgeClass("Supervisor")).toContain("emerald");
    expect(getApproverBadgeClass("Chief")).toContain("amber");
  });

  it("calculates trip mileage correctly", () => {
    expect(
      calculateTripMileage({
        startMileage: 10250,
        endMileage: 10385,
      }),
    ).toBe(135);

    expect(calculateTripMileage(undefined)).toBeNull();
    expect(
      calculateTripMileage({
        startMileage: 10250,
        endMileage: undefined,
      }),
    ).toBeNull();
  });

  it("calculates total trip cost and cost per kilometer", () => {
    const mockBooking: Partial<Booking> = {
      tripLog: {
        startMileage: 20000,
        endMileage: 20100, // 100 km
        fuelCost: 350,
        tollFee: 120,
        parkingFee: 50, // total = 520
      },
    };

    expect(totalCost(mockBooking as Booking)).toBe(520);
    expect(calculateCostPerKm(mockBooking as Booking)).toBe(5.2);
  });
});
