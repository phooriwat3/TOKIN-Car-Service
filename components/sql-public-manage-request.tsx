"use client";

import { useEffect, useState } from "react";
import { PublicFrame } from "@/components/public-request-form";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type ChangeRequest = {
  requestNo: string;
  requesterName: string;
  approverName: string;
  reason: string;
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  meetingPoint: string;
  withStaff: boolean;
  immediateReason: string | null;
  passengers: string[];
};

const readError = (body: { title?: string; error?: string; errors?: Record<string, string[]> }) =>
  body.error || Object.values(body.errors ?? {}).flat().join(" ") || body.title || "Unable to process request.";

export default function SqlPublicManageRequest({ token }: { token?: string }) {
  const [request, setRequest] = useState<ChangeRequest | null>(null);
  const [passengerText, setPassengerText] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(token ? "" : "Request link is missing.");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch("/api/transport/requests/change/access", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }), cache: "no-store", signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(readError(body));
        return body as ChangeRequest;
      })
      .then((body) => { setRequest(body); setPassengerText(body.passengers.join("\n")); })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Request unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);

  async function resubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !request || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/transport/requests/change/resubmit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, usingDate: request.usingDate, startTime: request.startTime,
          endTime: request.endTime, pickupLocation: request.pickupLocation,
          destination: request.destination, purpose: request.purpose,
          meetingPoint: request.meetingPoint, withStaff: request.withStaff,
          immediateReason: request.immediateReason,
          passengers: passengerText.split("\n").map((name) => name.trim()).filter(Boolean),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readError(body));
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to resubmit request.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof ChangeRequest>(field: K, value: ChangeRequest[K]) {
    setRequest((current) => current ? { ...current, [field]: value } : current);
  }

  return <PublicFrame>
    <div className="mx-auto max-w-2xl py-6">
      <Card className="p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">TOKIN transport</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Update your request</h1>
        {loading && <p className="mt-5 text-sm text-slate-600">Loading request...</p>}
        {error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {done && <div role="status" className="mt-5 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Request {request?.requestNo} was resubmitted to {request?.approverName}. This link cannot be used again.
        </div>}
        {request && !done && <form onSubmit={(event) => void resubmit(event)} className="mt-5 space-y-5">
          <p className="text-sm text-slate-600">{request.requestNo} · {request.requesterName} · Approver: {request.approverName}</p>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Changes requested:</strong> {request.reason}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Travel date"><Input type="date" required value={request.usingDate} onChange={(e) => update("usingDate", e.target.value)} /></Field>
            <Field label="Start time"><Input type="time" required value={request.startTime} onChange={(e) => update("startTime", e.target.value)} /></Field>
            <Field label="End time"><Input type="time" required value={request.endTime} onChange={(e) => update("endTime", e.target.value)} /></Field>
          </div>
          <Field label="Pickup location"><Input required maxLength={500} value={request.pickupLocation} onChange={(e) => update("pickupLocation", e.target.value)} /></Field>
          <Field label="Destination"><Input required maxLength={500} value={request.destination} onChange={(e) => update("destination", e.target.value)} /></Field>
          <Field label="Purpose"><Textarea required maxLength={1000} value={request.purpose} onChange={(e) => update("purpose", e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meeting point"><Select value={request.meetingPoint} onChange={(e) => update("meetingPoint", e.target.value)}>
              <option value="front_area">Front area</option><option value="loading_area">Loading area</option>
            </Select></Field>
            <Field label="Passengers (one per line)"><Textarea value={passengerText} onChange={(e) => setPassengerText(e.target.value)} maxLength={3400} rows={3} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={request.withStaff} onChange={(e) => update("withStaff", e.target.checked)} />Travel with staff</label>
          <Field label="Reason for urgent trip, if applicable"><Textarea maxLength={1000} value={request.immediateReason ?? ""} onChange={(e) => update("immediateReason", e.target.value)} /></Field>
          <Button type="submit" disabled={saving}>{saving ? "Submitting..." : "Save and resubmit"}</Button>
        </form>}
      </Card>
    </div>
  </PublicFrame>;
}
