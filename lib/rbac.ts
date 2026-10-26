import { maskDropoffLocation, maskEmployeeId, maskPhoneNumber } from "./privacy";
import { Booking, Role } from "./types";

/**
 * Enterprise RBAC Permission Checks
 */

/**
 * Checks if the role has authority to view unmasked employee PII (phones, IDs).
 * GA Admin has primary operational access.
 */
export function canViewUnmaskedPii(role: Role): boolean {
  return role === "admin";
}

/**
 * Checks if the role has permission to approve department requisitions.
 */
export function canApproveDepartment(
  role: Role,
  approverDepartment?: string,
  targetDepartment?: string
): boolean {
  if (role === "admin" || role === "executive") {
    return true; // Global oversight
  }
  if (role !== "approver") {
    return false;
  }
  if (!approverDepartment || !targetDepartment) {
    return false;
  }
  return approverDepartment.trim().toLowerCase() === targetDepartment.trim().toLowerCase();
}

/**
 * Checks if the role has permission to dispatch vehicles, batch vans, and assign contractor units.
 */
export function canDispatchVehicles(role: Role): boolean {
  return role === "admin";
}

/**
 * Checks if the role has permission to view financial accounting ledgers and billing cross-charges.
 */
export function canAccessFinancialLedger(role: Role): boolean {
  return role === "admin" || role === "finance";
}

/**
 * Checks if the role has permission to inspect immutable audit logs and security events.
 */
export function canAccessAuditLogs(role: Role): boolean {
  return role === "admin" || role === "auditor";
}

/**
 * Checks if the role has emergency Disaster Recovery Plan (DRP) execution privileges.
 */
export function canAccessDrpOverride(role: Role): boolean {
  return role === "admin";
}

/**
 * Checks if the role can submit priority or executive bypass requests.
 */
export function canSubmitPriorityRequest(role: Role): boolean {
  return role === "admin" || role === "executive";
}

/**
 * Sanitizes a Booking object for presentation based on the viewing user's role.
 * Enforces Thailand PDPA principles: least-privilege exposure of sensitive contact data.
 */
export function filterBookingForRole(
  booking: Booking,
  viewerRole: Role,
  viewerEmployeeId?: string
): Booking {
  // Admin sees raw data for operational dispatch
  if (viewerRole === "admin") {
    return booking;
  }

  const isOwnRecord = !!(viewerEmployeeId && booking.requesterEmployeeId === viewerEmployeeId);

  const sanitized: Booking = {
    ...booking,
    requesterPhone: isOwnRecord
      ? booking.requesterPhone
      : maskPhoneNumber(booking.requesterPhone, viewerRole),
    requesterEmployeeId: maskEmployeeId(booking.requesterEmployeeId, viewerRole, isOwnRecord),
    destination: maskDropoffLocation(booking.destination, viewerRole),
  };

  // Mask individual overtime passenger phone numbers if viewer is not the passenger themselves
  if (sanitized.overtimeEmployees && Array.isArray(sanitized.overtimeEmployees)) {
    sanitized.overtimeEmployees = sanitized.overtimeEmployees.map((emp) => {
      const isSelf = !!(viewerEmployeeId && emp.employeeId === viewerEmployeeId);
      return {
        ...emp,
        employeePhone: isSelf
          ? emp.employeePhone
          : maskPhoneNumber(emp.employeePhone, viewerRole),
        employeeId: maskEmployeeId(emp.employeeId, viewerRole, isSelf),
        busStop: maskDropoffLocation(emp.busStop, viewerRole),
      };
    });
  }

  // Hide contractor billing rates from non-admin/non-finance users
  if (sanitized.assignment && !canAccessFinancialLedger(viewerRole)) {
    sanitized.assignment = {
      ...sanitized.assignment,
      tripRateThb: undefined,
      manualTransportUnits: sanitized.assignment.manualTransportUnits?.map((unit) => ({
        ...unit,
        tripRateThb: undefined,
      })),
    };
  }

  return sanitized;
}
