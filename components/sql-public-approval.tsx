"use client";

import { useEffect, useState } from "react";
import { PublicFrame } from "@/components/public-request-form";
import { Button, Card, Field, Textarea } from "@/components/ui";

type Approval = {
  requestNo: string;
  requesterName: string;
  department: string;
  approverName: string;
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  passengerCount: number;
  isUrgent: boolean;
};

const readError = (body: { title?: string; error?: string; errors?: Record<string, string[]> }) =>
  body.error || Object.values(body.errors ?? {}).flat().join(" ") || body.title || "Unable to process approval.";

export default function SqlPublicApproval({ token }: { token?: string }) {
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState("");
  const [error, setError] = useState(token ? "" : "Approval link is missing.");
  const [decision, setDecision] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch("/api/transport/approvals/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(readError(body));
        return body as Approval;
      })
      .then(setApproval)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Approval unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);

  async function decide(action: "approve" | "reject" | "request_changes") {
    if (!token || saving) return;
    if (action !== "approve" && !comments.trim()) {
      setError("Enter a reason before denying or requesting changes.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/transport/approvals/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, comments }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readError(body));
      setDecision(String(body.status));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to record decision.");
    } finally {
      setSaving(false);
    }
  }

  return <PublicFrame>
    <div className="mx-auto max-w-2xl py-6">
      <Card className="p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">TOKIN transport</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Review transport request</h1>
        {loading && <p className="mt-5 text-sm text-slate-600">Loading request...</p>}
        {error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {decision && <div role="status" className="mt-5 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Decision recorded: {decision.replaceAll(/([a-z])([A-Z])/g, "$1 $2")}. This link cannot be used again.
        </div>}
        {approval && !decision && <>
          <div className="mt-6 grid gap-4 border-y border-slate-200 py-5 text-sm sm:grid-cols-2">
            <Detail label="Request" value={approval.requestNo} />
            <Detail label="Requester" value={`${approval.requesterName} · ${approval.department}`} />
            <Detail label="Approver" value={approval.approverName} />
            <Detail label="Date and time" value={`${approval.usingDate}, ${approval.startTime}–${approval.endTime}`} />
            <Detail label="Pickup" value={approval.pickupLocation} />
            <Detail label="Destination" value={approval.destination} />
            <Detail label="Passengers" value={String(approval.passengerCount)} />
            <Detail label="Priority" value={approval.isUrgent ? "Urgent" : "Normal"} />
            <div className="sm:col-span-2"><Detail label="Purpose" value={approval.purpose} /></div>
          </div>
          <div className="mt-5">
            <Field label="Reason for denial or changes">
              <Textarea value={comments} onChange={(event) => setComments(event.target.value)}
                maxLength={1000} placeholder="Required when denying or requesting changes" />
            </Field>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button type="button" disabled={saving} onClick={() => void decide("approve")}>Approve</Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => void decide("request_changes")}>Request changes</Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => void decide("reject")}>Deny</Button>
          </div>
        </>}
      </Card>
    </div>
  </PublicFrame>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 break-words text-ink">{value}</p></div>;
}
