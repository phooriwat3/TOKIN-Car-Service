"use client";

import { useState } from "react";
import { Check, CheckCircle2, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createLineShareUrl } from "@/lib/line-dispatch";
import { Button } from "./ui";

type DispatchAction =
  | "copied"
  | "opened"
  | "sent"
  | "cancellation_copied"
  | "cancellation_opened"
  | "cancellation_sent";

export function LineDispatchActions({
  message,
  bookingIds,
  transportUnitId,
  disabled = false,
  mode = "dispatch",
  title,
}: {
  message: string;
  bookingIds: string[];
  transportUnitId?: string;
  disabled?: boolean;
  mode?: "dispatch" | "cancellation";
  title?: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const isCancellation = mode === "cancellation";
  const resolvedTitle = title ?? (isCancellation
    ? "LINE driver cancellation"
    : "LINE driver dispatch");
  const actionFor = (action: "copied" | "opened" | "sent"): DispatchAction =>
    isCancellation ? `cancellation_${action}` : action;

  const recordAction = async (action: DispatchAction) => {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("record_driver_dispatch_event", {
      p_booking_ids: bookingIds,
      p_transport_unit_id: transportUnitId ?? null,
      p_action: action,
    });
    if (error) throw error;
  };

  const copyForLine = async () => {
    setBusy(true);
    setResult("");
    try {
      await navigator.clipboard.writeText(message);
      try {
        await recordAction(actionFor("copied"));
        setResult(isCancellation
          ? "Cancellation copied for LINE. The GA action was recorded."
          : "Copied for LINE. The GA action was recorded.");
      } catch {
        setResult("Copied for LINE, but the audit record needs attention.");
      }
    } catch {
      setResult("Unable to copy the LINE message in this browser.");
    } finally {
      setBusy(false);
    }
  };

  const openLine = async () => {
    window.open(createLineShareUrl(message), "_blank", "noopener,noreferrer");
    setBusy(true);
    setResult("");
    try {
      await recordAction(actionFor("opened"));
      setResult(`LINE opened. Confirm the driver chat and press Send${isCancellation ? " cancellation" : ""} in LINE.`);
    } catch {
      setResult("LINE opened, but the audit record needs attention.");
    } finally {
      setBusy(false);
    }
  };

  const markSent = async () => {
    if (!confirmSent) {
      setConfirmSent(true);
      setResult("Confirm only after you press Send in the correct LINE driver chat.");
      return;
    }
    setBusy(true);
    setResult("");
    try {
      await recordAction(actionFor("sent"));
      setResult(isCancellation
        ? "Driver cancellation recorded as sent by GA."
        : "Recorded as sent to the driver by GA.");
      setConfirmSent(false);
    } catch {
      setResult("Unable to record the driver dispatch. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <MessageCircle size={16} />
          </span>
          <div>
            <h4 className="text-sm font-bold text-emerald-950">{resolvedTitle}</h4>
            <p className="text-xs text-emerald-800">
              {isCancellation
                ? "GA sends this withdrawal to the assigned driver through LINE and records the handoff."
                : "GA reviews the saved assignment, then sends this message to the driver through LINE."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled || busy || !message}
            onClick={copyForLine}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {result.toLowerCase().includes("copied") ? <Check size={14} /> : <Copy size={14} />}
            {isCancellation ? "Copy cancellation" : "Copy for LINE"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled || busy || !message}
            onClick={openLine}
            className="border-emerald-300 text-emerald-900 hover:bg-emerald-100"
          >
            <ExternalLink size={14} /> Open LINE
          </Button>
          <Button
            type="button"
            size="sm"
            variant={confirmSent ? "primary" : "outline"}
            disabled={disabled || busy || !message}
            onClick={markSent}
            className={confirmSent ? "bg-amber-600 text-white hover:bg-amber-700" : ""}
          >
            <CheckCircle2 size={14} />
            {confirmSent ? "Confirm sent" : "Mark as sent"}
          </Button>
        </div>
      </div>

      {disabled && (
        <p className="mt-3 text-xs font-semibold text-amber-800">
          {isCancellation
            ? "Cancel the request before sending the withdrawal to LINE."
            : "Save the vehicle and driver assignment before sending details to LINE."}
        </p>
      )}
      {result && !disabled && (
        <p
          className={`mt-3 text-xs font-semibold ${
            confirmSent ? "text-amber-900" : "text-emerald-900"
          }`}
          role="status"
        >
          {result}
        </p>
      )}
      <button
        type="button"
        onClick={() => setShowPreview((current) => !current)}
        className="mt-3 text-xs font-semibold text-emerald-900 underline underline-offset-2"
      >
        {showPreview
          ? "Hide LINE message preview"
          : `Preview LINE ${isCancellation ? "cancellation" : "message"}`}
      </button>
      {showPreview && (
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-emerald-200 bg-white p-3 font-sans text-xs leading-5 text-slate-800 shadow-2xs">
          {message}
        </pre>
      )}
    </div>
  );
}
