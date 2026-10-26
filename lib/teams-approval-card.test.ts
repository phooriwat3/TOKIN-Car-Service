import { describe, expect, it } from "vitest";
import { approvalAdaptiveCard } from "../supabase/functions/_shared/approval-adaptive-card.ts";
import {
  parseTeamsApprovalCommand,
  workflowRequestHash,
} from "../supabase/functions/_shared/workflow-contract.ts";

const input = {
  actionId: "550e8400-e29b-41d4-a716-446655440000",
  requestId: "660e8400-e29b-41d4-a716-446655440000",
  expectedVersion: 3,
  expiresAt: "2027-10-22T10:00:00.000Z",
  requestNo: "CSR-2027-000123",
  requestType: "outside_company" as const,
  requesterName: "Narin Srisuk",
  requesterDepartment: "Engineering",
  usingDate: "2027-10-30",
  startTime: "08:00",
  endTime: "17:00",
  pickupLocation: "TOKIN Thailand",
  destination: "Customer factory",
  purpose: "Customer meeting",
  numPassengers: 3,
  reviewUrl: "https://carservice.tokin.co.th/request/approve?token=signed-token",
  urgent: true,
  urgentReason: "Customer escalation",
};

describe("Teams approval Adaptive Card", () => {
  it("uses a conservative Teams schema and three concise action groups", () => {
    const card = approvalAdaptiveCard(input) as any;
    expect(card.version).toBe("1.4");
    expect(card.actions.map((action: any) => action.type)).toEqual([
      "Action.OpenUrl",
      "Action.Submit",
      "Action.ShowCard",
    ]);
    expect(card.actions[1].data).toMatchObject({
      schemaVersion: 1,
      event: "approval.action_submitted",
      actionId: input.actionId,
      requestId: input.requestId,
      expectedVersion: 3,
      action: "approved",
    });
  });

  it("uses one shared comment input for reject and request-changes", () => {
    const card = approvalAdaptiveCard(input) as any;
    const responseAction = card.actions[2];
    expect(responseAction.card.body[0]).toMatchObject({
      type: "Input.Text",
      id: "comments",
      isRequired: true,
      isMultiline: true,
    });
    expect(responseAction.card.actions.map((action: any) => action.id)).toEqual([
      "confirmReject",
      "confirmRequestChanges",
    ]);
    expect(responseAction.card.actions[0].data.action).toBe("rejected");
    expect(responseAction.card.actions[1].data.action).toBe("changes_requested");
  });

  it("does not place callback secrets or raw token fields in card data", () => {
    const serialized = JSON.stringify(approvalAdaptiveCard(input));
    expect(serialized).not.toContain("callbackSecret");
    expect(serialized).not.toContain("approvalToken");
    expect(serialized).not.toContain("serviceRole");
  });

  it("rejects a non-HTTPS review address", () => {
    expect(() => approvalAdaptiveCard({ ...input, reviewUrl: "http://example.test" }))
      .toThrow(/HTTPS/);
  });
});

describe("Teams callback v1 contract", () => {
  const callback = {
    schemaVersion: 1,
    event: "approval.action_submitted",
    actionId: input.actionId,
    requestId: input.requestId,
    expectedVersion: 3,
    expiresAt: input.expiresAt,
    action: "request_changes",
    comments: "Correct the destination.",
    responder: {
      name: "Manager One",
      email: "manager.one@yageo.com",
      teamsUserId: "29:teams-user-id",
    },
  };

  it("accepts connector identity and normalizes the decision", () => {
    expect(parseTeamsApprovalCommand(callback)).toMatchObject({
      action: "changes_requested",
      expectedVersion: 3,
      actor: { email: "manager.one@yageo.com" },
    });
  });

  it("rejects legacy callbacks and missing mandatory comments", () => {
    expect(() => parseTeamsApprovalCommand({ ...callback, schemaVersion: 0 }))
      .toThrow(/Unsupported/);
    expect(() => parseTeamsApprovalCommand({
      ...callback,
      action: "reject",
      comments: "",
    })).toThrow(/Comments/);
  });

  it("creates the same request hash regardless of object key order", async () => {
    await expect(workflowRequestHash({ b: 2, a: { d: 4, c: 3 } }))
      .resolves.toBe(await workflowRequestHash({ a: { c: 3, d: 4 }, b: 2 }));
  });
});
