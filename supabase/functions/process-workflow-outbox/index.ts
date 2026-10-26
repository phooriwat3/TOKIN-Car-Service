import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "../_shared/http.ts";

type ClaimedMessage = {
  id: string;
  booking_id: string | null;
  event_type: string;
  schema_version: number;
  payload: Record<string, unknown>;
  attempt_no: number;
  correlation_id: string;
  started_at: string;
};

const destinationFor = (
  eventType: string,
  payload: Record<string, unknown>,
) => {
  if (payload.audience === "admin" || eventType.startsWith("admin.")) {
    return Deno.env.get("POWER_AUTOMATE_ADMIN_ALERT_FLOW_URL")?.trim() || "";
  }
  const statusFlow = Deno.env.get("POWER_AUTOMATE_REQUESTER_STATUS_FLOW_URL")?.trim();
  if (statusFlow) return statusFlow;
  if (eventType === "request.changes_requested")
    return Deno.env.get("POWER_AUTOMATE_REQUESTER_MANAGE_FLOW_URL")?.trim() || "";
  return "";
};

const safeError = (cause: unknown) => {
  const message = cause instanceof Error ? cause.message : "Delivery failed.";
  return message.replace(/https?:\/\/\S+/gi, "[redacted-url]").slice(0, 500);
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);

  const expectedSecret = Deno.env.get("WORKFLOW_OUTBOX_SECRET");
  if (!expectedSecret || request.headers.get("x-workflow-secret") !== expectedSecret)
    return json({ error: "Unauthorized." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey)
    return json({ error: "Service configuration is missing." }, 500);

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const workerId = crypto.randomUUID();
  const { data, error } = await db.rpc("claim_workflow_outbox", {
    p_worker_id: workerId,
    p_limit: 20,
    p_lease_seconds: 60,
  });
  if (error) {
    console.error("Unable to claim workflow messages.", { message: error.message });
    return json({ error: "Unable to claim workflow messages." }, 500);
  }

  const claimed = (data ?? []) as ClaimedMessage[];
  const results = await Promise.all(claimed.map(async (message) => {
    const destination = destinationFor(message.event_type, message.payload);
    let success = false;
    let httpStatus: number | null = null;
    let workflowRunId: string | null = null;
    let deliveryError: string | null = null;
    let permanentFailure = false;

    try {
      if (!destination)
        throw new Error(`No delivery destination is configured for ${message.event_type}.`);
      const response = await fetch(destination, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-ID": message.correlation_id,
          "X-Idempotency-Key": message.id,
        },
        body: JSON.stringify({
          ...message.payload,
          delivery: {
            messageId: message.id,
            attempt: message.attempt_no,
            correlationId: message.correlation_id,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      httpStatus = response.status;
      workflowRunId = response.headers.get("x-ms-workflow-run-id") ||
        response.headers.get("x-ms-workflow-run-tracking-id");
      success = response.ok;
      if (!success) {
        deliveryError = `Power Automate returned HTTP ${response.status}.`;
        permanentFailure = [400, 401, 403, 404, 410, 422].includes(
          response.status,
        );
      }
    } catch (cause) {
      deliveryError = safeError(cause);
    }

    const { data: completion, error: completionError } = await db.rpc(
      "complete_workflow_delivery",
      {
        p_outbox_id: message.id,
        p_worker_id: workerId,
        p_attempt_no: message.attempt_no,
        p_success: success,
        p_workflow_run_id: workflowRunId,
        p_http_status: httpStatus,
        p_sanitized_error: deliveryError,
        p_permanent_failure: permanentFailure,
      },
    );
    if (completionError) {
      console.error("Unable to complete workflow delivery.", {
        outboxId: message.id,
        message: completionError.message,
      });
      return {
        id: message.id,
        eventType: message.event_type,
        ok: false,
        status: "completion_failed",
        httpStatus,
        error: "Unable to record the delivery result.",
      };
    }
    return {
      id: message.id,
      eventType: message.event_type,
      ok: success,
      status: (completion as { status?: string } | null)?.status ?? "unknown",
      httpStatus,
      error: deliveryError,
    };
  }));

  return json({
    ok: true,
    claimed: claimed.length,
    delivered: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  });
});
