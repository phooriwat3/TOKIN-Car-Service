import { describe, expect, it } from "vitest";
import {
  aggregateContractorBilling,
  aggregateDepartmentCostCenters,
  DEFAULT_VAN_TRIP_RATE_THB,
  getContractorBillingLedger,
} from "./contractor-billing";
import type { Booking } from "./types";

describe("Plan 05: Contractor Billing & Department Cost Centers", () => {
  const mockBookings: Partial<Booking>[] = [
    {
      id: "b1",
      bookingNo: "CSR-2026-000001",
      usingDate: "2026-09-08",
      startTime: "16:45",
      endTime: "18:00",
      pickupLocation: "TOKIN Plant",
      destination: "Amata City",
      department: "PE",
      status: "assigned",
      numPassengers: 8,
      assignment: {
        assignedAt: "2026-09-08 10:00",
        accepted: true,
        contractorName: "หจก. นครหลวง แวน ทรานสปอร์ต",
        tripRateThb: 1800,
        manualTransportUnits: [
          {
            unitId: "u1",
            licensePlate: "1มข-4421",
            brand: "Toyota Commuter",
            vehicleType: "Van",
            driverName: "สมชาย มีสุข",
            driverPhone: "081-234-5678",
            contractorName: "หจก. นครหลวง แวน ทรานสปอร์ต",
            tripRateThb: 1800,
            employeeIds: ["E001", "E002", "E003", "E004", "E005", "E006", "E007", "E008"],
          },
        ],
      },
    },
    {
      id: "b2",
      bookingNo: "CSR-2026-000002",
      usingDate: "2026-09-08",
      startTime: "20:00",
      endTime: "21:30",
      pickupLocation: "TOKIN Plant",
      destination: "Bangna-Trad",
      department: "QA",
      status: "completed",
      numPassengers: 4,
      assignment: {
        assignedAt: "2026-09-08 11:00",
        accepted: true,
        contractorName: "บจก. สยาม ออโต้ เซอร์วิส",
        tripRateThb: 2200,
        manualTransportUnits: [
          {
            unitId: "u2",
            licensePlate: "2นค-9988",
            brand: "Toyota Commuter",
            vehicleType: "Van",
            driverName: "วิชัย ใจดี",
            driverPhone: "089-999-8877",
            contractorName: "บจก. สยาม ออโต้ เซอร์วิส",
            tripRateThb: 2200,
            employeeIds: ["E010", "E011", "E012", "E013"],
          },
        ],
      },
    },
    {
      id: "b3",
      bookingNo: "CSR-2026-000003",
      usingDate: "2026-09-08",
      startTime: "20:00",
      endTime: "21:30",
      pickupLocation: "TOKIN Plant",
      destination: "Bangkadi",
      department: "PE",
      status: "cancelled", // should be excluded from billing!
      numPassengers: 2,
    },
  ];

  it("extracts flattened billing ledger excluding cancelled trips", () => {
    const ledger = getContractorBillingLedger(mockBookings as Booking[]);
    expect(ledger.length).toBe(2);

    expect(ledger[0].bookingNo).toBe("CSR-2026-000001");
    expect(ledger[0].contractorName).toBe("หจก. นครหลวง แวน ทรานสปอร์ต");
    expect(ledger[0].agreedRateThb).toBe(1800);
    expect(ledger[0].passengerCount).toBe(8);

    expect(ledger[1].bookingNo).toBe("CSR-2026-000002");
    expect(ledger[1].contractorName).toBe("บจก. สยาม ออโต้ เซอร์วิส");
    expect(ledger[1].agreedRateThb).toBe(2200);
    expect(ledger[1].passengerCount).toBe(4);
  });

  it("aggregates contractor totals and average occupancy accurately", () => {
    const summaries = aggregateContractorBilling(mockBookings as Booking[]);
    expect(summaries.length).toBe(2);

    // Sorted by highest total amount: Siam Auto (2200) then Nakhon Luang (1800)
    const siam = summaries.find((s) => s.contractorName.includes("สยาม"));
    expect(siam?.totalAmountThb).toBe(2200);
    expect(siam?.tripCount).toBe(1);
    expect(siam?.averageOccupancy).toBe(4);

    const nakhon = summaries.find((s) => s.contractorName.includes("นครหลวง"));
    expect(nakhon?.totalAmountThb).toBe(1800);
    expect(nakhon?.tripCount).toBe(1);
    expect(nakhon?.averageOccupancy).toBe(8);
  });

  it("allocates cost centers across requesting departments (PE & QA)", () => {
    const deptSummaries = aggregateDepartmentCostCenters(mockBookings as Booking[]);
    expect(deptSummaries.length).toBe(2);

    // Total = 4000. QA = 2200 (55%), PE = 1800 (45%)
    const qa = deptSummaries.find((d) => d.departmentCode === "QA");
    expect(qa?.allocatedAmountThb).toBe(2200);
    expect(qa?.percentageShare).toBe(55);

    const pe = deptSummaries.find((d) => d.departmentCode === "PE");
    expect(pe?.allocatedAmountThb).toBe(1800);
    expect(pe?.percentageShare).toBe(45);
  });
});
