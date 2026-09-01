import { describe, expect, it } from "vitest";
import {
  normalizeTigerDate,
  normalizeTigerTime,
  parseTigerSpaceSheet,
} from "./tiger-space-report";

describe("Tiger Space report parsing", () => {
  it("normalizes supported dates and times", () => {
    expect(normalizeTigerDate("01-Aug-2569")).toBe("2026-08-01");
    expect(normalizeTigerTime("7:05")).toBe("07:05");
    expect(normalizeTigerTime("25:00")).toBe("");
  });

  it("extracts a complete OT row", () => {
    const row = Array.from({ length: 27 }, () => null) as unknown[];
    row[3] = "2026-08-01";
    row[4] = "1234567 Narin Suksai";
    row[17] = "17:30";
    row[20] = "20:00";
    row[22] = "02:30";

    expect(parseTigerSpaceSheet("Approved OT", [row])).toEqual([
      expect.objectContaining({
        sourceSheet: "Approved OT",
        sourceRow: 1,
        employeeId: "1234567",
        employeeName: "Narin Suksai",
        otDate: "2026-08-01",
        startTime: "17:30",
        endTime: "20:00",
      }),
    ]);
  });
});
