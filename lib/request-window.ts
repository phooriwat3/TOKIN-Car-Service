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
  return time >= OT_REQUEST_START && time <= OT_REQUEST_END;
}
