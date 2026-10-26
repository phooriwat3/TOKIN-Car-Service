import type { Booking } from "./types";
import { isBookingReadyForAssignment } from "./operations-queue";

export const VAN_STANDARD_CAPACITY = 10;

export type SeatOccupancyStatus = "available" | "full" | "overflow";

export interface SmartGroup {
  groupId: string;
  usingDate: string;
  destination: string;
  shiftEndTime?: string;
  bookings: Booking[];
  totalPassengers: number;
  capacity: number;
  occupancyStatus: SeatOccupancyStatus;
  departments: string[];
  startTimeRange: string;
  endTimeRange: string;
}

export function detectSmartGroups(bookings: Booking[]): SmartGroup[] {
  // Only consider eligible bookings that can be grouped
  const eligible = bookings.filter(isBookingReadyForAssignment);

  const groupMap = new Map<string, Booking[]>();

  for (const b of eligible) {
    if (!b.usingDate || !b.destination) continue;
    // Normalize destination string (lowercase trimmed)
    const normDest = b.destination.trim().toLowerCase();

    // In factory logistics: OT vans depart at exact shift end times (16:45, 19:00, 20:00, 22:00)
    // Partition by Date + Route/Destination + Shift End Time for OT requests
    const isOt = b.requestType === "overtime" || b.overtimeTransport;
    const shiftEnd = isOt ? (b.endTime?.trim() || "unknown") : "offsite";
    const key = `${b.usingDate}___${normDest}___${shiftEnd}`;

    const existing = groupMap.get(key) || [];
    groupMap.set(key, [...existing, b]);
  }

  const result: SmartGroup[] = [];
  const entries = Array.from(groupMap.entries());

  for (const [key, items] of entries) {
    if (items.length < 2) continue; // Group when 2 or more requests share parameters

    const [usingDate, , shiftEnd] = key.split("___");
    const rawDestination = items[0].destination;

    let totalPassengers = 0;
    const depts = new Set<string>();
    const startTimes: string[] = [];
    const endTimes: string[] = [];

    for (const b of items) {
      if (b.department) depts.add(b.department);
      if (b.startTime) startTimes.push(b.startTime);
      if (b.endTime) endTimes.push(b.endTime);

      if (b.requestType === "overtime") {
        const otCount = (b.overtimeEmployees ?? []).filter(
          (e: { transportRequired: boolean }) => e.transportRequired,
        ).length;
        totalPassengers += otCount || 1;
      } else {
        const passCount = b.passengerList?.length || b.numPassengers || 1;
        totalPassengers += passCount;
      }
    }

    startTimes.sort();
    endTimes.sort();

    let occupancyStatus: SeatOccupancyStatus = "available";
    if (totalPassengers === VAN_STANDARD_CAPACITY) {
      occupancyStatus = "full";
    } else if (totalPassengers > VAN_STANDARD_CAPACITY) {
      occupancyStatus = "overflow";
    }

    result.push({
      groupId: key,
      usingDate,
      destination: rawDestination,
      shiftEndTime: shiftEnd !== "offsite" && shiftEnd !== "unknown" ? shiftEnd : undefined,
      bookings: items,
      totalPassengers,
      capacity: VAN_STANDARD_CAPACITY,
      occupancyStatus,
      departments: Array.from(depts),
      startTimeRange: `${startTimes[0]} – ${startTimes[startTimes.length - 1]}`,
      endTimeRange: `${endTimes[0]} – ${endTimes[endTimes.length - 1]}`,
    });
  }

  // Sort groups by usingDate, then shiftEndTime, then destination
  result.sort((a, b) => {
    if (a.usingDate !== b.usingDate) return a.usingDate.localeCompare(b.usingDate);
    if (a.shiftEndTime && b.shiftEndTime && a.shiftEndTime !== b.shiftEndTime) {
      return a.shiftEndTime.localeCompare(b.shiftEndTime);
    }
    return a.destination.localeCompare(b.destination);
  });

  return result;
}
