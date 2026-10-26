import { anonymizeBookingForArchival } from "./privacy";
import { Booking, DataLifecycleStatus } from "./types";

/**
 * Enterprise Data Retention & Archival Policies
 * In compliance with ISO 9001, IATF 16949, and Thailand PDPA
 */
export const HOT_DATA_RETENTION_DAYS = 90; // Active operational views & rapid dispatch
export const PDPA_ANONYMIZE_AFTER_DAYS = 365; // PII scrubbed after 1 year
export const STATUTORY_AUDIT_RETENTION_DAYS = 1095; // 3 years audit trail for Finance

/**
 * Computes calendar age in full days from a given date string compared to reference date.
 */
export function getAgeInDays(dateStr: string, referenceDate: Date = new Date()): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return 0;

  const diffMs = referenceDate.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Classifies booking into its appropriate lifecycle tier based on record age.
 */
export function classifyDataLifecycle(
  dateStr: string,
  referenceDate: Date = new Date()
): DataLifecycleStatus {
  const ageDays = getAgeInDays(dateStr, referenceDate);

  if (ageDays <= HOT_DATA_RETENTION_DAYS) {
    return "hot";
  }
  if (ageDays <= PDPA_ANONYMIZE_AFTER_DAYS) {
    return "cold";
  }
  return "anonymized";
}

/**
 * Determines whether a record should be transitioned from hot operational storage to cold archive.
 */
export function isEligibleForArchival(
  dateStr: string,
  referenceDate: Date = new Date()
): boolean {
  return getAgeInDays(dateStr, referenceDate) > HOT_DATA_RETENTION_DAYS;
}

/**
 * Determines whether a record has exceeded 1 year and must have personal PII anonymized.
 */
export function isEligibleForAnonymization(
  dateStr: string,
  referenceDate: Date = new Date()
): boolean {
  return getAgeInDays(dateStr, referenceDate) > PDPA_ANONYMIZE_AFTER_DAYS;
}

export interface PartitionedBookings {
  hot: Booking[];
  cold: Booking[];
  anonymized: Booking[];
}

/**
 * Partitions a list of bookings into Hot, Cold, and Anonymized tiers.
 */
export function partitionBookingsByLifecycle(
  bookings: Booking[],
  referenceDate: Date = new Date()
): PartitionedBookings {
  const result: PartitionedBookings = {
    hot: [],
    cold: [],
    anonymized: [],
  };

  for (const booking of bookings) {
    const tier = classifyDataLifecycle(booking.usingDate || booking.createdAt, referenceDate);
    if (tier === "hot") {
      result.hot.push(booking);
    } else if (tier === "cold") {
      result.cold.push(booking);
    } else {
      // Scrub PII if not already scrubbed
      result.anonymized.push(anonymizeBookingForArchival(booking));
    }
  }

  return result;
}

/**
 * Prepares a batch of bookings for archival storage, applying PII scrubbing where required.
 */
export function prepareBookingsForArchival(
  bookings: Booking[],
  referenceDate: Date = new Date()
): {
  archived: Booking[];
  scrubbedCount: number;
} {
  let scrubbedCount = 0;
  const archived = bookings.map((b) => {
    if (isEligibleForAnonymization(b.usingDate || b.createdAt, referenceDate)) {
      scrubbedCount++;
      return anonymizeBookingForArchival(b);
    }
    return b;
  });

  return { archived, scrubbedCount };
}
