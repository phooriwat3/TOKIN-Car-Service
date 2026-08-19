import type { Booking } from "./types";

export interface SmartGroup {
  groupId: string;
  usingDate: string;
  destination: string;
  bookings: Booking[];
  totalPassengers: number;
  departments: string[];
  startTimeRange: string;
  endTimeRange: string;
}

export function detectSmartGroups(bookings: Booking[]): SmartGroup[] {
  // Only consider eligible bookings that can be grouped
  const eligible = bookings.filter((b) =>
    ["approved", "assigned", "pending_approval", "pending_ot_verification"].includes(
      b.status,
    ),
  );

  const groupMap = new Map<string, Booking[]>();

  for (const b of eligible) {
    if (!b.usingDate || !b.destination) continue;
    // Normalize destination string (lowercase trimmed)
    const normDest = b.destination.trim().toLowerCase();
    const key = `${b.usingDate}___${normDest}`;
    const existing = groupMap.get(key) || [];
    groupMap.set(key, [...existing, b]);
  }

  const result: SmartGroup[] = [];
  const entries = Array.from(groupMap.entries());

  for (const [key, items] of entries) {
    if (items.length < 2) continue; // Only group when 2 or more requests share date & destination

    const [usingDate] = key.split("___");
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

    result.push({
      groupId: key,
      usingDate,
      destination: rawDestination,
      bookings: items,
      totalPassengers,
      departments: Array.from(depts),
      startTimeRange: `${startTimes[0]} – ${startTimes[startTimes.length - 1]}`,
      endTimeRange: `${endTimes[0]} – ${endTimes[endTimes.length - 1]}`,
    });
  }

  return result;
}
