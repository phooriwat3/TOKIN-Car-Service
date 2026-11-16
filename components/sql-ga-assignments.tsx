"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";

type QueueItem = {
  id: string; requestNo: string; status: string; requesterName: string;
  usingDate: string; startTime: string; pickupLocation: string; destination: string;
};
type QueuePage = { items: QueueItem[]; page: number; pageSize: number; total: number };
type Detail = QueueItem & {
  revisionNumber: number; requesterPhone: string | null; endTime: string;
  purpose: string; passengerCount: number; licensePlate: string | null;
  vehicleType: string | null; driverName: string | null; driverPhone: string | null;
  notes: string | null; lineMessage: string | null; lineSent: boolean;
};
type AssignmentForm = {
  licensePlate: string; vehicleType: string; driverName: string;
  driverPhone: string; notes: string;
};
const emptyForm: AssignmentForm = { licensePlate: "", vehicleType: "", driverName: "", driverPhone: "", notes: "" };
const errorText = (body: { error?: string; title?: string; errors?: Record<string, string[]> }) =>
  body.error || Object.values(body.errors ?? {}).flat().join(" ") || body.title || "Unable to complete action.";

export default function SqlGaAssignments() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function read<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { cache: "no-store", ...init });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(errorText(body));
    return body as T;
  }

  async function refresh() {
    setError("");
    try {
      const result = await read<QueuePage>("/api/transport/ga/requests?page=1");
      setQueue(result.items); setTotal(result.total); setPage(1);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load requests."); }
    finally { setLoading(false); }
  }

  async function loadMore() {
    if (busy || queue.length >= total) return;
    setBusy(true); setError("");
    try {
      const next = await read<QueuePage>(`/api/transport/ga/requests?page=${page + 1}`);
      setQueue((current) => [...current, ...next.items]);
      setPage(next.page); setTotal(next.total);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load more requests."); }
    finally { setBusy(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function openRequest(id: string) {
    setError(""); setNotice(""); setDetail(null);
    try { setDetail(await read<Detail>(`/api/transport/ga/requests/${id}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open request."); }
  }

  async function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await read<Detail>(`/api/transport/ga/requests/${detail.id}/assign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expectedRevision: detail.revisionNumber }),
      });
      setDetail(updated); setNotice("Vehicle and driver assigned. The requester notification is queued.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to assign vehicle."); }
    finally { setBusy(false); }
  }

  async function dispatch(action: "copied" | "sent") {
    if (!detail || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (action === "copied") {
        if (!detail.lineMessage) throw new Error("LINE details are unavailable.");
        await navigator.clipboard.writeText(detail.lineMessage);
      }
      const updated = await read<Detail>(`/api/transport/ga/requests/${detail.id}/dispatch`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setDetail(updated);
      setNotice(action === "copied" ? "Details copied. Send them to the driver in LINE." : "LINE handoff recorded.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to record LINE handoff."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-brand">TOKIN transport · GA</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Vehicle assignments</h1></div>
      <Button type="button" variant="outline" onClick={() => void refresh()}>Refresh</Button>
    </div>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} {error.includes("Sign in") && <Link className="underline" href="/admin/login">Open login</Link>}</p>}
    {notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold text-ink">Approved and assigned requests</h2>
        {loading && <p className="mt-4 text-sm text-slate-600">Loading...</p>}
        {!loading && queue.length === 0 && <p className="mt-4 text-sm text-slate-600">No requests to assign.</p>}
        <div className="mt-3 space-y-2">{queue.map((item) =>
          <button key={item.id} type="button" onClick={() => void openRequest(item.id)}
            className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-brand hover:bg-blue-50">
            <span className="flex items-center justify-between gap-2"><strong className="text-brand">{item.requestNo}</strong>
              <Badge>{item.status}</Badge></span>
            <span className="mt-1 block text-sm text-ink">{item.usingDate} · {item.startTime} · {item.requesterName}</span>
            <span className="mt-1 block text-xs text-slate-600">{item.pickupLocation} → {item.destination}</span>
          </button>)}</div>
        {queue.length < total && <Button type="button" variant="outline" className="mt-4" disabled={busy}
          onClick={() => void loadMore()}>Load more</Button>}
      </Card>
      <Card className="p-4 sm:p-6">
        {!detail ? <p className="text-sm text-slate-600">Select a request to see details.</p> : <>
          <h2 className="text-lg font-bold text-ink">{detail.requestNo}</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <DetailRow label="Requester" value={`${detail.requesterName} ${detail.requesterPhone ?? ""}`} />
            <DetailRow label="Date and time" value={`${detail.usingDate} · ${detail.startTime}–${detail.endTime}`} />
            <DetailRow label="Pickup" value={detail.pickupLocation} />
            <DetailRow label="Destination" value={detail.destination} />
            <DetailRow label="Passengers" value={String(detail.passengerCount)} />
            <DetailRow label="Purpose" value={detail.purpose} />
          </div>
          {detail.status === "Approved" ? <form onSubmit={(event) => void assign(event)} className="mt-6 space-y-4 border-t border-slate-200 pt-5">
            <h3 className="font-semibold text-ink">Assign vehicle and driver</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vehicle type"><Input required maxLength={80} value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} /></Field>
              <Field label="License plate"><Input required maxLength={40} value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} /></Field>
              <Field label="Driver name"><Input required maxLength={160} value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} /></Field>
              <Field label="Driver phone"><Input required maxLength={40} value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Assign vehicle"}</Button>
          </form> : <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="font-semibold text-ink">Driver LINE handoff</h3>
            <p className="mt-2 text-sm text-slate-600">Copy these details, send them to the driver in LINE, then mark them as sent.</p>
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm text-ink">{detail.lineMessage}</pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => void dispatch("copied")}>Copy LINE details</Button>
              <Button type="button" disabled={busy || detail.lineSent} onClick={() => void dispatch("sent")}>{detail.lineSent ? "Sent recorded" : "Mark sent in LINE"}</Button>
            </div>
          </div>}
        </>}
      </Card>
    </div>
  </main>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 break-words text-ink">{value}</p></div>;
}
