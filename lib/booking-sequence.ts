/**
 * Year-Partitioned Booking Number Sequence Utility
 * Format: CSR-YYYY-XXXXXX (e.g., CSR-2026-000042)
 */

const BOOKING_NO_REGEX = /^CSR-(\d{4})-(\d{4,8})$/;

export function formatBookingNo(year: number, sequence: number, padding = 6): string {
  const safeSeq = Math.max(1, Math.floor(sequence));
  const seqPadded = String(safeSeq).padStart(padding, "0");
  return `CSR-${year}-${seqPadded}`;
}

export function parseBookingNo(bookingNo?: string): { year: number; sequence: number } | null {
  if (!bookingNo) return null;
  const match = bookingNo.trim().match(BOOKING_NO_REGEX);
  if (!match) return null;

  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}

export function isValidBookingNo(bookingNo?: string): boolean {
  if (!bookingNo) return false;
  return BOOKING_NO_REGEX.test(bookingNo.trim());
}

export function generateMockBookingNo(existingCount: number, customYear?: number): string {
  const currentYear = customYear ?? new Date().getFullYear();
  return formatBookingNo(currentYear, existingCount + 1, 6);
}
