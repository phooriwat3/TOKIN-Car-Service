export const TIMEZONE_BANGKOK = "Asia/Bangkok";

export function formatUsDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
}

/**
 * Returns today's date string (YYYY-MM-DD) in Asia/Bangkok timezone.
 */
export function getBangkokDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Returns current time string (HH:mm) in Asia/Bangkok timezone.
 */
export function getBangkokTimeString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE_BANGKOK,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Returns current hour (0-23) in Asia/Bangkok timezone.
 */
export function getBangkokHour(date = new Date()): number {
  const timeStr = getBangkokTimeString(date);
  return parseInt(timeStr.split(":")[0], 10);
}

/**
 * Format a date string (YYYY-MM-DD or ISO) into readable Thai format in Bangkok timezone.
 */
export function formatThaiDate(value?: string | Date | null): string {
  if (!value) return "-";
  const dateObj =
    typeof value === "string"
      ? new Date(value.includes("T") ? value : `${value}T00:00:00+07:00`)
      : value;
  if (isNaN(dateObj.getTime())) return String(value);

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TIMEZONE_BANGKOK,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj);
}

/**
 * Format a datetime string into readable Thai date & time in Bangkok timezone.
 */
export function formatThaiDateTime(value?: string | Date | null): string {
  if (!value) return "-";
  const dateObj = typeof value === "string" ? new Date(value) : value;
  if (isNaN(dateObj.getTime())) return String(value);

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TIMEZONE_BANGKOK,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dateObj);
}
