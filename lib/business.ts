import { Booking } from "./types";
export const overlaps = (a: Booking, b: Booking) =>
  a.usingDate === b.usingDate &&
  a.startTime < b.endTime &&
  b.startTime < a.endTime;
export function findAssignmentConflict(
  bookings: Booking[],
  bookingId: string,
  vehicleId: string,
  driverId: string,
) {
  const target = bookings.find((b) => b.id === bookingId);
  if (!target) return "Booking not found";
  const active = bookings.filter(
    (b) =>
      b.id !== bookingId &&
      !["cancelled", "rejected", "completed"].includes(b.status) &&
      b.assignment &&
      overlaps(target, b),
  );
  if (active.some((b) => b.assignment?.vehicleId === vehicleId))
    return "Vehicle is already assigned to an overlapping trip.";
  if (active.some((b) => b.assignment?.driverId === driverId))
    return "Driver is already assigned to an overlapping trip.";
  return null;
}
export const totalCost = (b: Booking) =>
  (b.tripLog?.fuelCost || 0) +
  (b.tripLog?.tollFee || 0) +
  (b.tripLog?.parkingFee || 0);
export const statusLabel = (s: string) =>
  s
    .split("_")
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(" ");
