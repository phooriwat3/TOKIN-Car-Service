"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type WorkflowDelivery = {
  outbox_id: string;
  request_id: string | null;
  event_type: string;
  status: "pending" | "processing" | "delivered" | "failed" | "dead_letter";
  attempt_count: number;
  available_at: string;
  delivered_at: string | null;
  last_error: string | null;
  correlation_id: string;
  created_at: string;
};

const readableEvent = (value: string) =>
  value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export function AdminWorkflowExceptions() {
  const [deliveries, setDeliveries] = useState<WorkflowDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      if (!supabase) {
        setDeliveries([]);
        return;
      }
      const { data, error: queryError } = await supabase.rpc(
        "admin_workflow_delivery_overview",
        { p_limit: 100 },
      );
      if (queryError) throw queryError;
      setDeliveries((data ?? []) as WorkflowDelivery[]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load workflow delivery status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const failures = useMemo(
    () =>
      deliveries.filter(
        (delivery) =>
          delivery.status === "failed" || delivery.status === "dead_letter",
      ),
    [deliveries],
  );
  const pendingCount = deliveries.filter(
    (delivery) =>
      delivery.status === "pending" || delivery.status === "processing",
  ).length;

  const retry = async (outboxId: string) => {
    setRetryingId(outboxId);
    setError("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Workflow service is not configured.");
      const { error: retryError } = await supabase.rpc(
        "admin_retry_workflow_delivery",
        { p_outbox_id: outboxId },
      );
      if (retryError) throw retryError;
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to queue the delivery retry.",
      );
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="flex items-center gap-3 border-brand-100 bg-white p-4 text-sm text-slate-600">
        <RefreshCw size={17} className="animate-spin text-brand-600" />
        Checking email and Teams delivery status...
      </Card>
    );
  }

  if (!error && failures.length === 0) {
    return (
      <Card className="flex flex-col gap-3 border-emerald-200 bg-emerald-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <p className="text-sm font-bold text-emerald-950">Workflow delivery is healthy</p>
            <p className="mt-0.5 text-xs text-emerald-800">
              No failed email or Teams messages in the latest 100 events{pendingCount ? `; ${pendingCount} currently queued` : ""}.
            </p>
          </div>
        </div>
        <Link href="/admin/advanced?tab=history" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900 hover:underline">
          Delivery history <ChevronRight size={13} />
        </Link>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-amber-300 bg-amber-50/80">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-amber-100 p-2 text-amber-800">
            <AlertTriangle size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-amber-950">
              {failures.length} delivery exception{failures.length === 1 ? "" : "s"} need attention
            </p>
            <p className="mt-0.5 text-xs text-amber-900">
              Review failed email or Teams events and queue a controlled retry.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Hide details" : "Review failures"}
          </Button>
        </div>
      </div>

      {error && <p role="alert" className="border-t border-amber-200 bg-white/70 px-4 py-3 text-sm text-danger">{error}</p>}

      {expanded && failures.length > 0 && (
        <div className="divide-y divide-amber-200 border-t border-amber-200 bg-white/75">
          {failures.map((delivery) => (
            <div key={delivery.outbox_id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{readableEvent(delivery.event_type)}</p>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                    {delivery.status === "dead_letter" ? "Stopped" : "Failed"}
                  </span>
                  <span className="text-xs text-slate-500">Attempt {delivery.attempt_count}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-600">
                  {delivery.last_error || "The workflow did not report an error message."}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {new Date(delivery.created_at).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })}
                  {delivery.request_id ? ` · Request ${delivery.request_id.slice(0, 8)}` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={Boolean(retryingId)}
                onClick={() => void retry(delivery.outbox_id)}
              >
                <RotateCcw size={14} className={retryingId === delivery.outbox_id ? "animate-spin" : ""} />
                {retryingId === delivery.outbox_id ? "Queuing..." : "Queue retry"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
