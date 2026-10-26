import { isOperationalStage, type OperationalStage } from "./operations-queue";
import type { BookingStatus, RequestType } from "./types";

const bookingStatuses: BookingStatus[] = [
  "draft",
  "pending_requester_confirmation",
  "pending_approval",
  "pending_ot_verification",
  "changes_requested",
  "approved",
  "rejected",
  "assigned",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export interface BookingListQuery {
  page: number;
  limit: number;
  status: BookingStatus | null;
  stage: OperationalStage | null;
  department: string | null;
  search: string;
  usingDate: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  requestType: RequestType | null;
  assignmentStatus: "assigned" | "unassigned" | null;
  urgent: boolean;
  otVerification: boolean;
}
function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function safeBookingSearchTerm(value: string | null) {
  return (value ?? "")
    .replace(/[%_,().]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

const validDate = (value: string | null) =>
  value && datePattern.test(value) ? value : null;

export function parseBookingListQuery(searchParams: URLSearchParams): BookingListQuery {
  const statusValue = searchParams.get("status");
  const stageValue = searchParams.get("stage");
  const requestTypeValue = searchParams.get("requestType");
  const assignmentValue = searchParams.get("assignmentStatus");

  return {
    page: positiveInteger(searchParams.get("page"), 1),
    limit: Math.min(100, positiveInteger(searchParams.get("limit"), 25)),
    status: bookingStatuses.includes(statusValue as BookingStatus)
      ? (statusValue as BookingStatus)
      : null,
    stage: isOperationalStage(stageValue) ? stageValue : null,
    department: searchParams.get("department")?.trim().slice(0, 80) || null,
    search: safeBookingSearchTerm(searchParams.get("search")),
    usingDate: validDate(searchParams.get("usingDate")),
    dateFrom: validDate(searchParams.get("dateFrom")),
    dateTo: validDate(searchParams.get("dateTo")),
    requestType: ["overtime", "outside_company"].includes(requestTypeValue ?? "")
      ? (requestTypeValue as RequestType)
      : null,
    assignmentStatus: ["assigned", "unassigned"].includes(assignmentValue ?? "")
      ? (assignmentValue as "assigned" | "unassigned")
      : null,
    urgent: searchParams.get("urgent") === "true",
    otVerification: searchParams.get("otVerification") === "true",
  };
}
