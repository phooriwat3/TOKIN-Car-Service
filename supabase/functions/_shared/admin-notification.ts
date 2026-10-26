import { adminAlertCard } from "./audience-adaptive-card.ts";
import { adminAlertEmail } from "./email-template.ts";

type AdminNotificationInput = {
  requestId: string;
  requestNo: string;
  requestType: "outside_company" | "overtime";
  requesterName: string;
  requesterDepartment: string;
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  reviewUrl: string;
  recipientName: string;
  recipientEmail: string;
  urgent?: boolean;
  exception?: string | null;
};

const adminNotification = (input: AdminNotificationInput) => ({
  schemaVersion: 1,
  event: input.exception ? "admin.workflow_exception" : "admin.request_ready",
  audience: "admin",
  requestId: input.requestId,
  requestNo: input.requestNo,
  requestType: input.requestType,
  recipient: {
    name: input.recipientName,
    email: input.recipientEmail.trim().toLowerCase(),
  },
  requester: {
    name: input.requesterName,
    department: input.requesterDepartment,
  },
  usingDate: input.usingDate,
  startTime: input.startTime,
  endTime: input.endTime,
  pickupLocation: input.pickupLocation,
  destination: input.destination,
  priority: input.urgent || input.exception ? "high" : "normal",
  reviewUrl: input.reviewUrl,
  adaptiveCard: adminAlertCard({
    requestNo: input.requestNo,
    requestType: input.requestType,
    requesterName: input.requesterName,
    requesterDepartment: input.requesterDepartment,
    usingDate: input.usingDate,
    startTime: input.startTime,
    endTime: input.endTime,
    pickupLocation: input.pickupLocation,
    destination: input.destination,
    reviewUrl: input.reviewUrl,
    urgent: input.urgent,
    exception: input.exception,
  }),
  ...adminAlertEmail({
    requestNo: input.requestNo,
    requestType: input.requestType,
    requesterName: input.requesterName,
    requesterDepartment: input.requesterDepartment,
    usingDate: input.usingDate,
    startTime: input.startTime,
    endTime: input.endTime,
    pickupLocation: input.pickupLocation,
    destination: input.destination,
    purpose: input.purpose,
    reviewUrl: input.reviewUrl,
    urgent: input.urgent,
    exception: input.exception,
  }),
});

export { adminNotification };
export type { AdminNotificationInput };
