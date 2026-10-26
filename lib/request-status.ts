import type { BookingStatus, RequestType } from "@/lib/types";

export type RequestStatusTone = "active" | "success" | "warning" | "danger" | "neutral";

export type RequestStatusPresentation = {
  label: string;
  summary: string;
  nextAction: string;
  currentStep: number;
  tone: RequestStatusTone;
  terminal: boolean;
};

export const requestJourneySteps = (requestType: RequestType) => [
  {
    title: "Request",
    description: "Submitted and confirmed",
  },
  {
    title: requestType === "overtime" ? "OT verification" : "Approval",
    description:
      requestType === "overtime"
        ? "Checked against Tiger Space"
        : "Reviewed by your approver",
  },
  {
    title: "Assignment",
    description: "GA plans vehicle and driver",
  },
  {
    title: "Trip",
    description: "Transport is operated and closed",
  },
];

export function requestStatusPresentation(
  status: BookingStatus,
  requestType: RequestType,
): RequestStatusPresentation {
  const reviewLabel = requestType === "overtime" ? "OT verification" : "approval";

  switch (status) {
    case "draft":
      return {
        label: "Draft",
        summary: "This request has not entered the transport workflow yet.",
        nextAction: "Complete and submit the request.",
        currentStep: 0,
        tone: "neutral",
        terminal: false,
      };
    case "pending_requester_confirmation":
      return {
        label: "Confirmation required",
        summary: "The request is saved but is waiting for your confirmation.",
        nextAction: "Open the confirmation message sent to your company email or Teams.",
        currentStep: 0,
        tone: "warning",
        terminal: false,
      };
    case "pending_approval":
      return {
        label: "Waiting for approval",
        summary: "Your request is with the department approver.",
        nextAction: "No action is needed unless the approver asks for changes.",
        currentStep: 1,
        tone: "active",
        terminal: false,
      };
    case "pending_ot_verification":
      return {
        label: "Waiting for OT verification",
        summary: "HR/GA is checking this request against the Tiger Space report.",
        nextAction: "No action is needed while verification is in progress.",
        currentStep: 1,
        tone: "active",
        terminal: false,
      };
    case "changes_requested":
      return {
        label: "Changes required",
        summary: `The ${reviewLabel} step needs corrected information before it can continue.`,
        nextAction: "Review the comment below, update the request, and submit it again.",
        currentStep: 1,
        tone: "warning",
        terminal: false,
      };
    case "approved":
      return {
        label: "Approved — waiting for assignment",
        summary: "The request passed review and is now with GA for transport planning.",
        nextAction: "Wait for the vehicle and driver assignment message.",
        currentStep: 2,
        tone: "success",
        terminal: false,
      };
    case "assigned":
      return {
        label: "Vehicle and driver assigned",
        summary: "GA has assigned transport for this request.",
        nextAction: "Review the assignment message and be ready at the meeting point.",
        currentStep: 3,
        tone: "success",
        terminal: false,
      };
    case "scheduled":
      return {
        label: "Trip scheduled",
        summary: "The transport plan is scheduled and ready for operation.",
        nextAction: "Be ready at the meeting point at the confirmed time.",
        currentStep: 3,
        tone: "success",
        terminal: false,
      };
    case "in_progress":
      return {
        label: "Trip in progress",
        summary: "The assigned transport is currently in progress.",
        nextAction: "Follow the confirmed trip plan or contact GA if assistance is needed.",
        currentStep: 3,
        tone: "active",
        terminal: false,
      };
    case "completed":
      return {
        label: "Completed",
        summary: "The transport request and trip are complete.",
        nextAction: "No further action is required.",
        currentStep: 4,
        tone: "success",
        terminal: true,
      };
    case "rejected":
      return {
        label: "Rejected",
        summary: `The request did not pass ${reviewLabel}.`,
        nextAction: "Review the decision reason or create a new request with corrected details.",
        currentStep: 1,
        tone: "danger",
        terminal: true,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        summary: "This request was cancelled and will not continue.",
        nextAction: "Create a new request if transportation is still required.",
        currentStep: 0,
        tone: "neutral",
        terminal: true,
      };
  }
}
