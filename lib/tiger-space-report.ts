import type { Booking } from "@/lib/types";

export type TigerSpaceReportRow = {
  sourceSheet: string;
  sourceRow: number;
  employeeId: string;
  employeeName: string;
  department: string;
  otDate: string;
  startTime: string;
  endTime: string;
  duration: string;
  note: string;
};

export type TigerSpaceMatchStatus =
  | "exact"
  | "time_mismatch"
  | "ambiguous"
  | "not_found";

export type TigerSpaceMatch = {
  booking: Booking;
  status: TigerSpaceMatchStatus;
  candidates: TigerSpaceReportRow[];
};

const monthNumbers: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const text = (value: unknown) =>
  value == null ? "" : String(value).trim();

export function normalizeTigerDate(value: unknown) {
  const raw = text(value);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;

  const english = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/);
  if (!english) return "";
  const month = monthNumbers[english[2].toLowerCase()];
  if (!month) return "";
  const shortYear = Number(english[3]);
  const year =
    english[3].length === 2
      ? shortYear >= 70
        ? 1900 + shortYear
        : 2000 + shortYear
      : shortYear > 2400
        ? shortYear - 543
        : shortYear;
  return `${year}-${month}-${english[1].padStart(2, "0")}`;
}

export function normalizeTigerTime(value: unknown) {
  const raw = text(value);
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  if (Number(match[1]) > 23 || Number(match[2]) > 59) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function parseTigerSpaceSheet(
  sheetName: string,
  rows: unknown[][],
): TigerSpaceReportRow[] {
  const parsed: TigerSpaceReportRow[] = [];
  let currentDate = "";
  let currentDepartment = "";

  rows.forEach((row, index) => {
    const rowDate = normalizeTigerDate(row[3]);
    if (rowDate) currentDate = rowDate;

    const departmentText = text(row[6]);
    if (departmentText.startsWith("แผนก")) {
      currentDepartment = departmentText
        .replace(/^แผนก\s*/, "")
        .replace(/^\d+\s*:\s*/, "")
        .trim();
    }

    const employee = text(row[4]).match(/^(\d{7})\s+(.+)$/);
    if (!employee || !currentDate) return;

    const startTime = normalizeTigerTime(row[17]);
    const endTime = normalizeTigerTime(row[20]);
    if (!startTime || !endTime) return;

    parsed.push({
      sourceSheet: sheetName,
      sourceRow: index + 1,
      employeeId: employee[1],
      employeeName: employee[2].replace(/\s+/g, " ").trim(),
      department: currentDepartment,
      otDate: currentDate,
      startTime,
      endTime,
      duration: normalizeTigerTime(row[22]) || text(row[22]),
      note: text(row[26]),
    });
  });

  return parsed;
}

export function matchTigerSpaceReport(
  bookings: Booking[],
  reportRows: TigerSpaceReportRow[],
): TigerSpaceMatch[] {
  return bookings
    .filter(
      (booking) =>
        booking.requestType === "overtime" &&
        booking.otVerificationMode !== "manager_exception" &&
        ["pending", "not_found"].includes(booking.otVerificationStatus ?? "pending") &&
        (booking.status === "pending_ot_verification" || booking.requestOrigin === "hr_direct") &&
        !["cancelled", "rejected"].includes(booking.status),
    )
    .map((booking) => {
      const employeeId =
        booking.requesterEmployeeId ||
        booking.overtimeEmployees?.[0]?.employeeId ||
        "";
      const sameEmployeeAndDate = reportRows.filter(
        (row) =>
          row.employeeId === employeeId && row.otDate === booking.usingDate,
      );
      const exact = sameEmployeeAndDate.filter(
        (row) =>
          row.startTime === booking.startTime &&
          row.endTime === booking.endTime,
      );

      if (exact.length === 1)
        return { booking, status: "exact" as const, candidates: exact };
      if (exact.length > 1)
        return {
          booking,
          status: "ambiguous" as const,
          candidates: exact,
        };
      if (sameEmployeeAndDate.length === 1)
        return {
          booking,
          status: "time_mismatch" as const,
          candidates: sameEmployeeAndDate,
        };
      if (sameEmployeeAndDate.length > 1)
        return {
          booking,
          status: "ambiguous" as const,
          candidates: sameEmployeeAndDate,
        };
      return {
        booking,
        status: "not_found" as const,
        candidates: [],
      };
    });
}
