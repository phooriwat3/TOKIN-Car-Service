type AdaptiveCard = Record<string, unknown>;

type RequestSummary = {
  requestNo: string;
  requestType: "outside_company" | "overtime";
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation?: string;
  destination?: string;
};

type RequesterConfirmationCardInput = RequestSummary & {
  confirmationUrl: string;
  expiresAt: string;
};

type RequesterStatusCardInput = RequestSummary & {
  status: "confirmed" | "approved" | "rejected" | "changes_requested";
  comments?: string | null;
  actionUrl?: string | null;
  expiresAt?: string | null;
};

type AdminAlertCardInput = RequestSummary & {
  requesterName: string;
  requesterDepartment: string;
  reviewUrl: string;
  urgent?: boolean;
  exception?: string | null;
};

type AssignmentCardInput = RequestSummary & {
  viewUrl: string;
  pdfUrl: string;
  expiresAt: string;
  vehicleLabel: string;
  driverName: string;
  transportUnitCount?: number;
};

type DriverOfferCardInput = RequestSummary & {
  passengerCount: number;
  acceptUrl: string;
  routeUrl?: string | null;
  expiresAt: string;
};

type ReminderCardInput = {
  requestNo: string;
  title: string;
  message: string;
  actionUrl: string;
  deadline?: string | null;
  escalated?: boolean;
};

const clean = (value: unknown, max = 500) =>
  String(value ?? "").trim().slice(0, max);

const httpsUrl = (value: string, label: string) => {
  const url = clean(value, 2000);
  if (!url.startsWith("https://")) throw new Error(`${label} must use HTTPS.`);
  return url;
};

const requestTypeLabel = (requestType: RequestSummary["requestType"]) =>
  requestType === "overtime" ? "Overtime transport" : "Off-site business transport";

const requestFacts = (input: RequestSummary) => [
  { title: "Type", value: requestTypeLabel(input.requestType) },
  {
    title: "Date / time",
    value: `${clean(input.usingDate, 10)} ${clean(input.startTime, 5)}-${clean(input.endTime, 5)}`,
  },
  ...(input.pickupLocation || input.destination
    ? [{
        title: "Route",
        value: `${clean(input.pickupLocation || "TOKIN", 200)} to ${clean(input.destination || "Assigned destination", 300)}`,
      }]
    : []),
];

const openUrl = (id: string, title: string, url: string): AdaptiveCard => ({
  type: "Action.OpenUrl",
  id,
  title,
  url: httpsUrl(url, title),
});

const card = (
  subtitle: string,
  requestNo: string,
  body: AdaptiveCard[],
  actions: AdaptiveCard[],
  attention = false,
): AdaptiveCard => ({
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
  version: "1.4",
  fallbackText: `${clean(requestNo, 100)} - ${clean(subtitle, 160)}`,
  body: [
    {
      type: "Container",
      style: attention ? "attention" : "accent",
      bleed: true,
      items: [
        {
          type: "TextBlock",
          text: "TOKIN TRANSPORT",
          weight: "Bolder",
          size: "Medium",
          color: "Light",
        },
        {
          type: "TextBlock",
          text: clean(subtitle, 160),
          spacing: "None",
          wrap: true,
          color: "Light",
        },
      ],
    },
    {
      type: "TextBlock",
      text: clean(requestNo, 100),
      size: "Large",
      weight: "Bolder",
      wrap: true,
      spacing: "Medium",
    },
    ...body,
  ],
  actions,
});

const requesterConfirmationCard = (
  input: RequesterConfirmationCardInput,
): AdaptiveCard => card(
  "Confirm your transport request",
  input.requestNo,
  [
    { type: "FactSet", facts: requestFacts(input) },
    {
      type: "TextBlock",
      text: "Confirm only if you submitted this request. The request will not enter the approval queue until confirmation.",
      wrap: true,
      spacing: "Medium",
    },
    {
      type: "TextBlock",
      text: `Secure link expires ${clean(input.expiresAt, 50)}. Do not forward it.`,
      wrap: true,
      size: "Small",
      isSubtle: true,
    },
  ],
  [openUrl("confirmRequest", "Confirm request", input.confirmationUrl)],
);

const statusLabels: Record<RequesterStatusCardInput["status"], string> = {
  confirmed: "Request confirmed",
  approved: "Request approved",
  rejected: "Request rejected",
  changes_requested: "Changes requested",
};

const requesterStatusCard = (input: RequesterStatusCardInput): AdaptiveCard => {
  const body: AdaptiveCard[] = [
    { type: "FactSet", facts: requestFacts(input) },
  ];
  if (input.comments) {
    body.push(
      { type: "TextBlock", text: "Approver comment", weight: "Bolder", spacing: "Medium" },
      { type: "TextBlock", text: clean(input.comments, 1000), wrap: true, spacing: "Small" },
    );
  }
  if (input.expiresAt) {
    body.push({
      type: "TextBlock",
      text: `Secure link expires ${clean(input.expiresAt, 50)}.`,
      wrap: true,
      size: "Small",
      isSubtle: true,
    });
  }
  const actions = input.actionUrl
    ? [openUrl("openRequest", input.status === "changes_requested" ? "Update request" : "View request", input.actionUrl)]
    : [];
  return card(
    statusLabels[input.status],
    input.requestNo,
    body,
    actions,
    input.status === "rejected" || input.status === "changes_requested",
  );
};

const adminAlertCard = (input: AdminAlertCardInput): AdaptiveCard => card(
  input.exception ? "Transport workflow exception" : "Request ready for GA review",
  input.requestNo,
  [
    {
      type: "FactSet",
      facts: [
        { title: "Requester", value: clean(input.requesterName, 160) },
        { title: "Department", value: clean(input.requesterDepartment, 120) },
        ...requestFacts(input),
      ],
    },
    ...(input.exception
      ? [{ type: "TextBlock", text: clean(input.exception, 800), wrap: true, color: "Attention" }]
      : []),
  ],
  [openUrl("openAdminReview", "Open GA workspace", input.reviewUrl)],
  Boolean(input.urgent || input.exception),
);

const assignmentCard = (input: AssignmentCardInput): AdaptiveCard => card(
  "Vehicle and driver confirmed",
  input.requestNo,
  [
    {
      type: "FactSet",
      facts: [
        ...requestFacts(input),
        { title: "Vehicle", value: clean(input.vehicleLabel, 200) },
        { title: "Driver", value: clean(input.driverName, 160) },
        ...(input.transportUnitCount && input.transportUnitCount > 1
          ? [{ title: "Vehicles", value: String(input.transportUnitCount) }]
          : []),
      ],
    },
    {
      type: "TextBlock",
      text: "Driver phone numbers and passenger details are available only in the secure assignment page.",
      wrap: true,
      size: "Small",
      isSubtle: true,
    },
    {
      type: "TextBlock",
      text: `Secure links expire ${clean(input.expiresAt, 50)}.`,
      wrap: true,
      size: "Small",
      isSubtle: true,
    },
  ],
  [
    openUrl("viewAssignment", "View assignment", input.viewUrl),
    openUrl("downloadAssignment", "Download PDF", input.pdfUrl),
  ],
);

const driverOfferCard = (input: DriverOfferCardInput): AdaptiveCard => card(
  "Transport assignment offered",
  input.requestNo,
  [
    {
      type: "FactSet",
      facts: [
        ...requestFacts(input),
        { title: "Passengers", value: String(input.passengerCount) },
      ],
    },
    {
      type: "TextBlock",
      text: "Passenger names and phone numbers are intentionally omitted. Open the secure route page after accepting.",
      wrap: true,
      size: "Small",
      isSubtle: true,
    },
    {
      type: "TextBlock",
      text: `Offer expires ${clean(input.expiresAt, 50)}.`,
      wrap: true,
      size: "Small",
      isSubtle: true,
    },
  ],
  [
    openUrl("acceptAssignment", "Accept assignment", input.acceptUrl),
    ...(input.routeUrl ? [openUrl("viewRoute", "View route", input.routeUrl)] : []),
  ],
);

const reminderCard = (input: ReminderCardInput): AdaptiveCard => card(
  input.escalated ? "Escalation" : clean(input.title, 160),
  input.requestNo,
  [
    { type: "TextBlock", text: clean(input.message, 800), wrap: true },
    ...(input.deadline
      ? [{ type: "TextBlock", text: `Deadline: ${clean(input.deadline, 50)}`, wrap: true, weight: "Bolder" }]
      : []),
  ],
  [openUrl("openReminder", "Open request", input.actionUrl)],
  Boolean(input.escalated),
);

export {
  adminAlertCard,
  assignmentCard,
  driverOfferCard,
  reminderCard,
  requesterConfirmationCard,
  requesterStatusCard,
  type AdminAlertCardInput,
  type AssignmentCardInput,
  type DriverOfferCardInput,
  type ReminderCardInput,
  type RequesterConfirmationCardInput,
  type RequesterStatusCardInput,
};
