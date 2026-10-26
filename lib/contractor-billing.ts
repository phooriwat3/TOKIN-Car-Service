import type { Booking } from "./types";
import { totalCost } from "./business";

export const DEFAULT_VAN_TRIP_RATE_THB = 1800;

export interface BillingLedgerItem {
  id: string;
  bookingNo: string;
  usingDate: string;
  shiftTime: string;
  route: string;
  vehiclePlate: string;
  vehicleModel: string;
  driverName: string;
  driverPhone: string;
  contractorName: string;
  passengerCount: number;
  departments: string[];
  agreedRateThb: number;
  status: string;
}

export interface ContractorSummary {
  contractorName: string;
  tripCount: number;
  passengerCount: number;
  averageOccupancy: number;
  totalAmountThb: number;
}

export interface DepartmentCostSummary {
  departmentCode: string;
  passengerRides: number;
  allocatedAmountThb: number;
  percentageShare: number;
}

/**
 * Extracts a flattened trip-by-trip billing ledger from bookings.
 * Handles both manual transport units and primary assignments.
 */
export function getContractorBillingLedger(bookings: Booking[]): BillingLedgerItem[] {
  const items: BillingLedgerItem[] = [];

  for (const b of bookings) {
    if (b.status === "cancelled" || b.status === "rejected") continue;

    const units = b.assignment?.manualTransportUnits;
    const shiftTime = `${b.startTime} - ${b.endTime}`;
    const route = `${b.pickupLocation} → ${b.destination}`;

    if (units && units.length > 0) {
      units.forEach((unit, idx) => {
        const contractor = unit.contractorName?.trim() || b.assignment?.contractorName?.trim() || "Third-Party Contractor";
        const rate = unit.tripRateThb || b.assignment?.tripRateThb || DEFAULT_VAN_TRIP_RATE_THB;
        const passengerCount = unit.employeeIds ? unit.employeeIds.length : Math.max(1, Math.floor(b.numPassengers / units.length));

        items.push({
          id: `${b.id}-unit-${unit.unitId || idx}`,
          bookingNo: b.bookingNo,
          usingDate: b.usingDate,
          shiftTime,
          route,
          vehiclePlate: unit.licensePlate || "Pending",
          vehicleModel: `${unit.brand} ${unit.vehicleType}`.trim() || "Van",
          driverName: unit.driverName || "Assigned Driver",
          driverPhone: unit.driverPhone || "-",
          contractorName: contractor,
          passengerCount,
          departments: [b.department],
          agreedRateThb: rate,
          status: b.status,
        });
      });
    } else if (b.assignment?.vehicleId || b.status === "assigned" || b.status === "completed" || b.status === "in_progress") {
      const contractor = b.assignment?.contractorName?.trim() || "Third-Party Contractor";
      const rate = b.assignment?.tripRateThb || totalCost(b) || DEFAULT_VAN_TRIP_RATE_THB;

      items.push({
        id: b.id,
        bookingNo: b.bookingNo,
        usingDate: b.usingDate,
        shiftTime,
        route,
        vehiclePlate: b.assignment?.vehicleId || "Assigned",
        vehicleModel: "Company/Contractor Fleet",
        driverName: b.assignment?.driverId || "Assigned Driver",
        driverPhone: "-",
        contractorName: contractor,
        passengerCount: b.numPassengers || 1,
        departments: [b.department],
        agreedRateThb: rate,
        status: b.status,
      });
    }
  }

  return items.sort((a, b) => b.usingDate.localeCompare(a.usingDate));
}

/**
 * Aggregates trips by Contractor provider.
 */
export function aggregateContractorBilling(bookings: Booking[]): ContractorSummary[] {
  const ledger = getContractorBillingLedger(bookings);
  const map = new Map<string, { tripCount: number; passengerCount: number; totalAmountThb: number }>();

  for (const item of ledger) {
    const existing = map.get(item.contractorName) || { tripCount: 0, passengerCount: 0, totalAmountThb: 0 };
    existing.tripCount += 1;
    existing.passengerCount += item.passengerCount;
    existing.totalAmountThb += item.agreedRateThb;
    map.set(item.contractorName, existing);
  }

  return Array.from(map.entries()).map(([contractorName, stats]) => ({
    contractorName,
    tripCount: stats.tripCount,
    passengerCount: stats.passengerCount,
    averageOccupancy: stats.tripCount > 0 ? Number((stats.passengerCount / stats.tripCount).toFixed(1)) : 0,
    totalAmountThb: stats.totalAmountThb,
  })).sort((a, b) => b.totalAmountThb - a.totalAmountThb);
}

/**
 * Aggregates transport expenses partitioned by Department code.
 */
export function aggregateDepartmentCostCenters(bookings: Booking[]): DepartmentCostSummary[] {
  const ledger = getContractorBillingLedger(bookings);
  const deptMap = new Map<string, { passengerRides: number; allocatedAmountThb: number }>();
  let grandTotalThb = 0;

  for (const item of ledger) {
    grandTotalThb += item.agreedRateThb;
    const depts = item.departments.length > 0 ? item.departments : ["GENERAL"];
    const perDeptAmount = item.agreedRateThb / depts.length;
    const perDeptRides = item.passengerCount / depts.length;

    for (const dept of depts) {
      const existing = deptMap.get(dept) || { passengerRides: 0, allocatedAmountThb: 0 };
      existing.passengerRides += perDeptRides;
      existing.allocatedAmountThb += perDeptAmount;
      deptMap.set(dept, existing);
    }
  }

  return Array.from(deptMap.entries()).map(([departmentCode, stats]) => ({
    departmentCode,
    passengerRides: Math.round(stats.passengerRides),
    allocatedAmountThb: Math.round(stats.allocatedAmountThb),
    percentageShare: grandTotalThb > 0 ? Number(((stats.allocatedAmountThb / grandTotalThb) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.allocatedAmountThb - a.allocatedAmountThb);
}
