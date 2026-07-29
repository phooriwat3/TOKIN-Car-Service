import { z } from "zod";
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
        required_error: "Number of passengers is required",
        invalid_type_error: "Enter a valid passenger count",
      })
      .int("Enter a valid passenger count")
      .min(1, "Number of passengers must be at least 1")
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
    const min = new Date();
    min.setHours(0, 0, 0, 0);
    min.setDate(min.getDate() + 1);
    if (!d.urgent && new Date(d.usingDate) <= min)
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
