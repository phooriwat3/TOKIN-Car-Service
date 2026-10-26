import { describe, expect, it } from "vitest";
import { parseBookingListQuery, safeBookingSearchTerm } from "./booking-query";

describe("booking queue query", () => {
  it("parses supported server-side filters", () => {
    const query = parseBookingListQuery(
      new URLSearchParams({
        page: "3",
        limit: "50",
        stage: "ready_to_plan",
        department: " QA ",
        search: "CSR-2026-000017",
        dateFrom: "2026-10-25",
        dateTo: "2026-10-31",
        requestType: "overtime",
        assignmentStatus: "unassigned",
        urgent: "true",
      }),
    );

    expect(query).toMatchObject({
      page: 3,
      limit: 50,
      stage: "ready_to_plan",
      department: "QA",
      search: "CSR-2026-000017",
      dateFrom: "2026-10-25",
      dateTo: "2026-10-31",
      requestType: "overtime",
      assignmentStatus: "unassigned",
      urgent: true,
    });
  });

  it("caps pagination and rejects unsupported enum and date values", () => {
    const query = parseBookingListQuery(
      new URLSearchParams({
        page: "-1",
        limit: "5000",
        stage: "today",
        status: "unknown",
        usingDate: "25/10/2026",
        requestType: "taxi",
      }),
    );

    expect(query.page).toBe(1);
    expect(query.limit).toBe(100);
    expect(query.stage).toBeNull();
    expect(query.status).toBeNull();
    expect(query.usingDate).toBeNull();
    expect(query.requestType).toBeNull();
  });

  it("removes PostgREST control characters from search input", () => {
    expect(safeBookingSearchTerm("  user%,name_(test).  ")).toBe("user name test");
  });
});
