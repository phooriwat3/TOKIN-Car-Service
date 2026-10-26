type ApprovalCardInput = {
  actionId: string;
  requestId: string;
  expectedVersion: number;
  expiresAt: string;
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
  numPassengers: number;
  reviewUrl: string;
  urgent?: boolean;
  urgentReason?: string | null;
};

type AdaptiveCard = Record<string, unknown>;

const clean = (value: unknown, max = 500) =>
  String(value ?? "").trim().slice(0, max);

const actionData = (
  input: ApprovalCardInput,
  action: "approved" | "rejected" | "changes_requested",
) => ({
  schemaVersion: 1,
  event: "approval.action_submitted",
  actionId: clean(input.actionId, 200),
  requestId: clean(input.requestId, 50),
  expectedVersion: input.expectedVersion,
  expiresAt: input.expiresAt,
  action,
});

const commentAction = (input: ApprovalCardInput): AdaptiveCard => ({
  type: "Action.ShowCard",
  title: "Reject / request changes",
  card: {
    type: "AdaptiveCard",
    body: [
      {
        type: "Input.Text",
        id: "comments",
        label: "Comment (required)",
        isRequired: true,
        errorMessage: "Enter a comment before submitting this decision.",
        isMultiline: true,
        maxLength: 2000,
        placeholder: "Explain the rejection or what the requester must update.",
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        id: "confirmReject",
        title: "Confirm rejection",
        data: actionData(input, "rejected"),
      },
      {
        type: "Action.Submit",
        id: "confirmRequestChanges",
        title: "Send change request",
        data: actionData(input, "changes_requested"),
      },
    ],
  },
});

const approvalAdaptiveCard = (input: ApprovalCardInput): AdaptiveCard => {
  if (!input.actionId || !input.requestId || input.expectedVersion < 1)
    throw new Error("Approval card command metadata is invalid.");
  if (!input.reviewUrl.startsWith("https://"))
    throw new Error("Approval card review URL must use HTTPS.");
  if (Number.isNaN(Date.parse(input.expiresAt)))
    throw new Error("Approval card expiration is invalid.");

  const body: AdaptiveCard[] = [
    {
      type: "Container",
      style: "accent",
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
          text: "Approval required",
          spacing: "None",
          color: "Light",
          isSubtle: true,
        },
      ],
    },
  ];

  if (input.urgent) {
    body.push({
      type: "Container",
      style: "attention",
      spacing: "Medium",
      items: [
        {
          type: "TextBlock",
          text: "URGENT REQUEST",
          weight: "Bolder",
          color: "Attention",
        },
        {
          type: "TextBlock",
          text: clean(input.urgentReason || "Immediate review requested.", 500),
          wrap: true,
          spacing: "Small",
        },
      ],
    });
  }

  body.push(
    {
      type: "TextBlock",
      text: clean(input.requestNo, 100),
      size: "Large",
      weight: "Bolder",
      wrap: true,
      spacing: "Medium",
    },
    {
      type: "FactSet",
      facts: [
        { title: "Requester", value: clean(input.requesterName, 200) },
        { title: "Department", value: clean(input.requesterDepartment, 200) },
        {
          title: "Type",
          value: input.requestType === "overtime"
            ? "Overtime transport"
            : "Off-site business transport",
        },
        {
          title: "Date / time",
          value: `${clean(input.usingDate, 10)} ${clean(input.startTime, 5)}–${clean(input.endTime, 5)}`,
        },
        {
          title: "Route",
          value: `${clean(input.pickupLocation, 300)} → ${clean(input.destination, 500)}`,
        },
        { title: "Passengers", value: String(input.numPassengers) },
      ],
    },
    {
      type: "TextBlock",
      text: "Purpose",
      weight: "Bolder",
      spacing: "Medium",
    },
    {
      type: "TextBlock",
      text: clean(input.purpose, 1000),
      wrap: true,
      spacing: "Small",
    },
    {
      type: "TextBlock",
      text: `This card expires ${clean(input.expiresAt, 50)}. Only the assigned approver may respond.`,
      wrap: true,
      isSubtle: true,
      size: "Small",
      spacing: "Medium",
    },
  );

  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    fallbackText: `${clean(input.requestNo, 100)} requires approval. Open the secure review link to continue.`,
    body,
    actions: [
      {
        type: "Action.OpenUrl",
        id: "reviewRequest",
        title: "Review full request",
        url: input.reviewUrl,
      },
      {
        type: "Action.Submit",
        id: "approveRequest",
        title: "Approve",
        associatedInputs: "none",
        data: actionData(input, "approved"),
      },
      commentAction(input),
    ],
  };
};

export { approvalAdaptiveCard, type ApprovalCardInput };
