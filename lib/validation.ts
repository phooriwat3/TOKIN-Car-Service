import { z } from "zod";
import { getBangkokDateString } from "./date-format";
export const bookingSchema = z
  .object({
    category: z.enum([
      "business_trip",
      "after_hours",
      "errand",
      "overtime_transport",
      "visitor_pickup",
    ]),
    usingDate: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    pickupLocation: z.string().min(3),
    destination: z.string().min(3),
    purpose: z.string().min(10),
    numPassengers: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? "Number of passengers is required"
            : "Enter a valid passenger count",
      })
      .int({ error: "Enter a valid passenger count" })
      .min(1, { error: "Number of passengers must be at least 1" })
      .max(20),
    meetingPoint: z.enum(["front_area", "loading_area"]),
    vehicleTypePref: z.enum(["van", "car", "pickup", "other", "any"]),
    driverRequired: z.boolean(),
    urgent: z.boolean(),
    urgentReason: z.string().optional(),
    afterHours: z.boolean(),
    overtimeTransport: z.boolean(),
    passengerNames: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.endTime <= d.startTime)
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time",
      });
    if (d.urgent && !d.urgentReason?.trim())
      ctx.addIssue({
        code: "custom",
        path: ["urgentReason"],
        message: "Urgent reason is required",
      });
    if (d.overtimeTransport && !d.passengerNames?.trim())
      ctx.addIssue({
        code: "custom",
        path: ["passengerNames"],
        message: "Passenger list is required",
      });
    const todayStr = getBangkokDateString();
    if (!d.urgent && d.usingDate <= todayStr)
      ctx.addIssue({
        code: "custom",
        path: ["usingDate"],
        message: "Submit at least 1 working day in advance",
      });
  });
export const assignmentSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  notes: z.string().optional(),
});
export const tripStartSchema = z.object({
  actualTimeOut: z.string().min(1),
  startMileage: z.coerce.number().positive(),
});
export const tripCompleteSchema = z.object({
  actualTimeIn: z.string().min(1),
  endMileage: z.coerce.number().positive(),
  fuelCost: z.coerce.number().min(0),
  tollFee: z.coerce.number().min(0),
  parkingFee: z.coerce.number().min(0),
  remarks: z.string().optional(),
});

export function normalizeThaiPhone(phone: string): string {
  return phone.replace(/[-\s]/g, "").trim();
}

export function isValidThaiMobilePhone(phone?: string): boolean {
  if (!phone) return false;
  const cleaned = normalizeThaiPhone(phone);
  return /^0[689]\d{8}$/.test(cleaned);
}
