import { Booking, Role } from "./types";

/**
 * Standard Thailand PDPA PII Redaction Constants
 */
export const PDPA_REDACTED_PHONE = "[PDPA_SCRUBBED]";
export const PDPA_MASKED_MIDDLE = "***";

/**
 * Masks employee or driver phone number to protect personal contact privacy.
 * Example: 0812345678 -> 081-***-5678
 * Unmasked only for GA Admin or Driver operational view when explicitly permitted.
 */
export function maskPhoneNumber(
  phone?: string | null,
  viewerRole?: Role,
  forceUnmask: boolean = false
): string {
  if (!phone || typeof phone !== "string") return "";
  const trimmed = phone.trim();
  if (!trimmed) return "";

  // GA Admin can view unmasked phones for operational dispatch if requested
  if ((viewerRole === "admin" || viewerRole === "driver") && forceUnmask) {
    return trimmed;
  }

  // Remove formatting characters to inspect digits
  const digits = trimmed.replace(/\D/g, "");

  // Standard Thai mobile number: 10 digits starting with 0 (08x, 09x, 06x)
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 3)}-${PDPA_MASKED_MIDDLE}-${digits.slice(6)}`;
  }

  // International format: e.g. 66812345678 (11 digits)
  if (digits.length === 11 && digits.startsWith("66")) {
    return `+66-${digits.slice(2, 4)}-${PDPA_MASKED_MIDDLE}-${digits.slice(7)}`;
  }

  // Fallback for non-standard lengths: keep first 3, last 2
  if (trimmed.length > 5) {
    return `${trimmed.slice(0, 3)}-${PDPA_MASKED_MIDDLE}-${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 1)}***`;
}

/**
 * Masks employee IDs for peer/unauthorized viewers.
 * Example: TK001234 -> TK***34
 */
export function maskEmployeeId(
  empId?: string | null,
  viewerRole?: Role,
  isOwnRecord: boolean = false
): string {
  if (!empId || typeof empId !== "string") return "";
  const trimmed = empId.trim();
  if (!trimmed) return "";

  // Admin, Approver, or Employee's own record view remains unmasked
  if (viewerRole === "admin" || viewerRole === "approver" || viewerRole === "executive" || isOwnRecord) {
    return trimmed;
  }

  if (trimmed.length <= 3) {
    return "***";
  }

  const prefix = trimmed.slice(0, 2);
  const suffix = trimmed.slice(-2);
  return `${prefix}***${suffix}`;
}

/**
 * Generalizes detailed private residential drop-offs for public/peer views
 * while retaining the main bus stop / route line for dispatch.
 */
export function maskDropoffLocation(
  location?: string | null,
  viewerRole?: Role
): string {
  if (!location || typeof location !== "string") return "";
  const trimmed = location.trim();
  if (!trimmed) return "";

  // Admin and Driver need exact pinpoint for navigation
  if (viewerRole === "admin" || viewerRole === "driver") {
    return trimmed;
  }

  // If specific house number/sub-soi detected, generalize
  return trimmed.replace(/(บ้านเลขที่\s*\d+[\d/]*|ซอย\s*\d+[\d/]*)/gi, "...");
}

/**
 * Anonymizes historical bookings (> 1 year old) in accordance with Thailand PDPA
 * Retains essential financial, route, department, and accounting metrics for 3-year statutory audit.
 */
export function anonymizeBookingForArchival(booking: Booking): Booking {
  const cloned: Booking = JSON.parse(JSON.stringify(booking));

  // Scrub requester contact info
  if (cloned.requesterPhone) {
    cloned.requesterPhone = PDPA_REDACTED_PHONE;
  }

  // Scrub overtime employee personal details
  if (cloned.overtimeEmployees && Array.isArray(cloned.overtimeEmployees)) {
    cloned.overtimeEmployees = cloned.overtimeEmployees.map((emp) => ({
      ...emp,
      employeePhone: PDPA_REDACTED_PHONE,
      employeeEmail: undefined,
      workDescription: "[CONFIDENTIAL_ARCHIVED]",
    }));
  }

  // Scrub driver phone in manual transport units
  if (cloned.assignment?.manualTransportUnits) {
    cloned.assignment.manualTransportUnits = cloned.assignment.manualTransportUnits.map((unit) => ({
      ...unit,
      driverPhone: PDPA_REDACTED_PHONE,
    }));
  }

  return cloned;
}
