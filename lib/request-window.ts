export const OT_REQUEST_START = "08:00";
export const OT_NORMAL_REQUEST_CUTOFF = "15:30";
export const OT_REQUEST_END = "16:00";

export type OtRequestPhase = "closed" | "normal" | "urgent";

export function bangkokTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function isOtRequestWindowOpen(date = new Date()) {
  const time = bangkokTime(date);
  return time >= OT_REQUEST_START && time < OT_REQUEST_END;
}

export interface CutoffCountdown {
  isBeforeCutoff: boolean;
  isPastFinalCutoff: boolean;
  remainingMinutes: number;
  remainingHours: number;
  formattedText: string;
}

export function getOtCutoffCountdown(date = new Date()): CutoffCountdown {
  const timeStr = bangkokTime(date);
  const [currentH, currentM] = timeStr.split(":").map(Number);
  const currentTotal = currentH * 60 + currentM;

  const [normalH, normalM] = OT_NORMAL_REQUEST_CUTOFF.split(":").map(Number);
  const normalTotal = normalH * 60 + normalM;

  const [endH, endM] = OT_REQUEST_END.split(":").map(Number);
  const endTotal = endH * 60 + endM;

  if (currentTotal < normalTotal) {
    const diff = normalTotal - currentTotal;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const formattedText =
      hours > 0
        ? `เหลือเวลาอีก ${hours} ชม. ${mins} นาที ก่อนตัดรอบปกติ (15:30 น.)`
        : `เหลือเวลาอีก ${mins} นาที ก่อนตัดรอบปกติ (15:30 น.)`;

    return {
      isBeforeCutoff: true,
      isPastFinalCutoff: false,
      remainingMinutes: diff,
      remainingHours: hours,
      formattedText,
    };
  }

  if (currentTotal < endTotal) {
    const diff = endTotal - currentTotal;
    return {
      isBeforeCutoff: false,
      isPastFinalCutoff: false,
      remainingMinutes: diff,
      remainingHours: 0,
      formattedText: `เลยเวลาตัดรอบปกติ (15:30 น.) แล้ว — จัดอยู่ในรอบเสริม/ฉุกเฉิน (ปิดรับสิ้นสุด 16:00 น.)`,
    };
  }

  return {
    isBeforeCutoff: false,
    isPastFinalCutoff: true,
    remainingMinutes: 0,
    remainingHours: 0,
    formattedText: `ปิดรับคำขอจัดรถ OT สำหรับวันนี้แล้ว (สิ้นสุดรอบ 16:00 น.)`,
  };
}
