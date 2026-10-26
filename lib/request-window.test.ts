import { describe, expect, it } from "vitest";
import {
  bangkokTime,
  getOtCutoffCountdown,
  isOtRequestWindowOpen,
  OT_NORMAL_REQUEST_CUTOFF,
  OT_REQUEST_END,
  OT_REQUEST_START,
} from "./request-window";

describe("OT Request Window & Cutoff Boundaries", () => {
  it("defines standard operational time constants", () => {
    expect(OT_REQUEST_START).toBe("08:00");
    expect(OT_NORMAL_REQUEST_CUTOFF).toBe("15:30");
    expect(OT_REQUEST_END).toBe("16:00");
  });

  it("identifies window open between 08:00 and 16:00 Bangkok time", () => {
    // 09:15 Bangkok time (02:15 UTC)
    const morningDate = new Date("2026-09-08T02:15:00.000Z");
    expect(bangkokTime(morningDate)).toBe("09:15");
    expect(isOtRequestWindowOpen(morningDate)).toBe(true);

    // 07:45 Bangkok time (00:45 UTC) -> closed
    const earlyDate = new Date("2026-09-08T00:45:00.000Z");
    expect(bangkokTime(earlyDate)).toBe("07:45");
    expect(isOtRequestWindowOpen(earlyDate)).toBe(false);

    // 16:15 Bangkok time (09:15 UTC) -> closed
    const lateDate = new Date("2026-09-08T09:15:00.000Z");
    expect(bangkokTime(lateDate)).toBe("16:15");
    expect(isOtRequestWindowOpen(lateDate)).toBe(false);
  });

  it("calculates countdown correctly before normal 15:30 cutoff", () => {
    // 14:00 Bangkok time (07:00 UTC) -> 90 minutes before 15:30
    const testDate = new Date("2026-09-08T07:00:00.000Z");
    const countdown = getOtCutoffCountdown(testDate);

    expect(countdown.isBeforeCutoff).toBe(true);
    expect(countdown.isPastFinalCutoff).toBe(false);
    expect(countdown.remainingMinutes).toBe(90);
    expect(countdown.remainingHours).toBe(1);
    expect(countdown.formattedText).toContain("1 ชม. 30 นาที");
  });

  it("identifies emergency/supplementary window between 15:30 and 16:00", () => {
    // 15:45 Bangkok time (08:45 UTC)
    const testDate = new Date("2026-09-08T08:45:00.000Z");
    const countdown = getOtCutoffCountdown(testDate);

    expect(countdown.isBeforeCutoff).toBe(false);
    expect(countdown.isPastFinalCutoff).toBe(false);
    expect(countdown.remainingMinutes).toBe(15);
    expect(countdown.formattedText).toContain("รอบเสริม/ฉุกเฉิน");
  });

  it("locks requests after final 16:00 cutoff", () => {
    // 16:05 Bangkok time (09:05 UTC)
    const testDate = new Date("2026-09-08T09:05:00.000Z");
    const countdown = getOtCutoffCountdown(testDate);

    expect(countdown.isBeforeCutoff).toBe(false);
    expect(countdown.isPastFinalCutoff).toBe(true);
    expect(countdown.remainingMinutes).toBe(0);
    expect(countdown.formattedText).toContain("ปิดรับคำขอจัดรถ OT สำหรับวันนี้แล้ว");
  });
});
