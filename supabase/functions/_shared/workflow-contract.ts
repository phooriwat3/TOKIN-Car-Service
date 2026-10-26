import { sha256Hex } from "./request-access.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ApprovalAction = "approved" | "rejected" | "changes_requested";

type ApprovalCommand = {
  actionKey: string;
  requestId: string;
  action: ApprovalAction;
  expectedVersion: number;
  expiresAt: string;
  comments: string;
  actor: { name: string; email: string; teamsUserId: string };
};

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  );
};

const workflowRequestHash = (value: unknown) =>
  sha256Hex(JSON.stringify(canonicalize(value)));

const parseTeamsApprovalCommand = (body: unknown): ApprovalCommand => {
  const input = body && typeof body === "object"
    ? body as Record<string, unknown>
    : {};
  const responder = input.responder && typeof input.responder === "object"
    ? input.responder as Record<string, unknown>
    : {};
  const actionAliases: Record<string, ApprovalAction> = {
    approve: "approved",
    approved: "approved",
    reject: "rejected",
    rejected: "rejected",
    request_changes: "changes_requested",
    changes_requested: "changes_requested",
  };
  const action = actionAliases[text(input.action ?? input.outcome, 40).toLowerCase()];
  const actionKey = text(input.actionId, 200);
  const requestId = text(input.requestId, 50);
  const expectedVersion = Number(input.expectedVersion);
  const expiresAt = text(input.expiresAt, 50);
  const comments = text(input.comments, 2000);
  const email = text(responder.email, 240).toLowerCase();

  if (input.schemaVersion !== 1 || input.event !== "approval.action_submitted")
    throw new Error("Unsupported approval callback contract.");
  if (!actionKey || actionKey.length < 8)
    throw new Error("Action ID is invalid.");
  if (!uuidPattern.test(requestId)) throw new Error("Request ID is invalid.");
  if (!action) throw new Error("Approval action is invalid.");
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1)
    throw new Error("Expected workflow version is invalid.");
  if (!expiresAt || Number.isNaN(Date.parse(expiresAt)))
    throw new Error("Approval expiration is invalid.");
  if (!emailPattern.test(email)) throw new Error("Responder email is invalid.");
  if (action !== "approved" && !comments)
    throw new Error("Comments are required for this action.");

  return {
    actionKey,
    requestId,
    action,
    expectedVersion,
    expiresAt,
    comments,
    actor: {
      name: text(responder.name, 200),
      email,
      teamsUserId: text(responder.teamsUserId, 240),
    },
  };
};

export {
  parseTeamsApprovalCommand,
  workflowRequestHash,
  type ApprovalAction,
  type ApprovalCommand,
};
