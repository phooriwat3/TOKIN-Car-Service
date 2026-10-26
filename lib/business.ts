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
const statusLabels: Record<string, string> = {
  pending_requester_confirmation: "Waiting for requester confirmation",
  pending_approval: "Pending department approval",
  pending_ot_verification: "Waiting for OT verification",
  approved: "Ready for transport planning",
};

export const statusLabel = (s: string) =>
  statusLabels[s] ??
  s
    .split("_")
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(" ");

export const approverPositionLabels: Record<string, string> = {
  Chief: "Chief / Unit Leader",
  Supervisor: "Supervisor / Section Lead",
  "Sect.Manager": "Section Manager",
  "Dept.Manager": "Department Manager",
  "AGM.up": "Asst. General Manager & Above",
};

export function approverPositionLabel(position?: string): string {
  if (!position) return "Approver";
  return approverPositionLabels[position] ?? position;
}

export function getApproverBadgeClass(position?: string): string {
  switch (position) {
    case "AGM.up":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Dept.Manager":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "Sect.Manager":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Supervisor":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Chief":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function calculateTripMileage(tripLog?: { startMileage?: number; endMileage?: number }): number | null {
  if (!tripLog || tripLog.startMileage == null || tripLog.endMileage == null) return null;
  const delta = tripLog.endMileage - tripLog.startMileage;
  return delta >= 0 ? delta : null;
}

export function calculateCostPerKm(booking: Booking): number | null {
  const distance = calculateTripMileage(booking.tripLog);
  if (!distance || distance <= 0) return null;
  const cost = totalCost(booking);
  return Number((cost / distance).toFixed(2));
}
