import type { Booking } from "./types";

export type OperationalStage =
  | "all"
  | "needs_review"
  | "ready_to_plan"
  | "assigned"
  | "in_progress"
  | "completed";

export const operationalStageOrder: OperationalStage[] = [
  "all",
  "needs_review",
  "ready_to_plan",
  "assigned",
  "in_progress",
  "completed",
];

export const operationalStageLabels: Record<OperationalStage, string> = {
  all: "All requests",
  needs_review: "Needs review",
  ready_to_plan: "Ready to plan",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
};

export const operationalStageDescriptions: Record<OperationalStage, string> = {
  all: "Every transport request available to this workspace.",
  needs_review: "Waiting for confirmation, approval, correction, or OT verification.",
  ready_to_plan: "Approved requests that still need a vehicle and driver.",
  assigned: "Vehicle and driver details are ready for dispatch.",
  in_progress: "Trips currently being carried out.",
  completed: "Completed, rejected, or cancelled requests kept for reference.",
};

export function isOperationalStage(value: string | null): value is OperationalStage {
  return Boolean(value && operationalStageOrder.includes(value as OperationalStage));
}
export function hasTransportAssignment(booking: Booking): boolean {
  return Boolean(
    booking.assignment?.vehicleId ||
      booking.assignment?.driverId ||
      booking.assignment?.manualTransportUnits?.length,
  );
}

export function getOperationalStage(
  booking: Booking,
): Exclude<OperationalStage, "all"> | null {
  if (
    [
      "pending_requester_confirmation",
      "pending_approval",
      "pending_ot_verification",
      "changes_requested",
    ].includes(booking.status)
  ) {
    return "needs_review";
  }

  if (["approved", "assigned", "scheduled"].includes(booking.status)) {
    return hasTransportAssignment(booking) ? "assigned" : "ready_to_plan";
  }

  if (booking.status === "in_progress") return "in_progress";

  if (["completed", "rejected", "cancelled"].includes(booking.status)) {
    return "completed";
  }

  return null;
}

export function bookingMatchesOperationalStage(
  booking: Booking,
  stage: OperationalStage,
): boolean {
  return stage === "all" || getOperationalStage(booking) === stage;
}

export function countBookingsByOperationalStage(bookings: Booking[]) {
  const counts: Record<OperationalStage, number> = {
    all: bookings.length,
    needs_review: 0,
    ready_to_plan: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
  };

  for (const booking of bookings) {
    const stage = getOperationalStage(booking);
    if (stage) counts[stage] += 1;
  }

  return counts;
}

export function isBookingReadyForAssignment(booking: Booking): boolean {
  return getOperationalStage(booking) === "ready_to_plan";
}
