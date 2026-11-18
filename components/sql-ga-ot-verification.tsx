"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Field, Textarea } from "@/components/ui";

type Item = { id: string; requestNo: string; requesterName: string; usingDate: string;
  startTime: string; verificationStatus: string; revisionNumber: number };
type Page = { items: Item[]; page: number; total: number };
type Rider = { employeeId: string; employeeName: string; employeeEmail: string | null;
  workDescription: string; workStart: string; workEnd: string; busStop: string | null };
type Detail = Item & { endTime: string; pickupLocation: string; destination: string;
  status: string; verificationNote: string | null; riders: Rider[] };
type ErrorBody = { error?: string; title?: string; detail?: string; errors?: Record<string, string[]> };

export default function SqlGaOtVerification() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function read<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { cache: "no-store", ...init });
    const body = await response.json().catch(() => ({})) as ErrorBody;
    if (!response.ok) throw new Error(body.detail || Object.values(body.errors ?? {}).flat().join(" ")
      || body.error || body.title || "Unable to complete action.");
    return body as T;
  }

  async function refresh(nextPage = 1) {
    setError("");
    try {
      const result = await read<Page>(`/api/transport/ga/ot-requests?page=${nextPage}`);
      setItems(current => nextPage === 1 ? result.items : [...current, ...result.items]);
      setPage(result.page); setTotal(result.total);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load OT requests."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function openRequest(id: string) {
    setError(""); setNotice(""); setDetail(null);
    try {
      const result = await read<Detail>(`/api/transport/ga/ot-requests/${id}`);
      setDetail(result); setNote(result.verificationNote ?? "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open OT request."); }
  }

  async function verify(result: "verified" | "not_found" | "rejected") {
    if (!detail || busy) return;
    if (result !== "verified" && !note.trim()) { setError("Enter a note for not found or rejected."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await read<Detail>(`/api/transport/ga/ot-requests/${detail.id}/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: detail.revisionNumber, result, note }),
      });
      setDetail(updated);
      setNotice(result === "verified" ? "Verified. Request approved and requester notification queued."
        : result === "rejected" ? "Request rejected and requester notification queued."
          : "Not found recorded. Request remains in the verification queue.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save verification."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-brand">TOKIN transport / GA</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">OT verification</h1>
        <p className="mt-1 text-sm text-slate-600">Check the employee and work details in Tiger Space, then record the result.</p></div>
      <div className="flex gap-2"><Link href="/admin/ot-assignments"><Button type="button" variant="outline">OT assignments</Button></Link>
        <Link href="/admin/bookings"><Button type="button" variant="outline">Other trips</Button></Link>
        <Button type="button" variant="outline" onClick={() => void refresh()}>Refresh</Button></div>
    </div>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} {error.includes("Sign in") && <Link className="underline" href="/admin/login">Open login</Link>}</p>}
    {notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <Card className="p-4 sm:p-5"><h2 className="font-semibold text-ink">Awaiting verification ({total})</h2>
        {loading && <p className="mt-4 text-sm text-slate-600">Loading...</p>}
        {!loading && items.length === 0 && <p className="mt-4 text-sm text-slate-600">No OT requests to verify.</p>}
        <div className="mt-3 space-y-2">{items.map(item => <button key={item.id} type="button"
          onClick={() => void openRequest(item.id)} className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-brand hover:bg-blue-50">
          <span className="flex items-center justify-between gap-2"><strong className="text-brand">{item.requestNo}</strong><Badge>{item.verificationStatus}</Badge></span>
          <span className="mt-1 block text-sm text-ink">{item.usingDate} / {item.startTime} / {item.requesterName}</span>
        </button>)}</div>
        {items.length < total && <Button type="button" variant="outline" className="mt-4" disabled={busy}
          onClick={() => void refresh(page + 1)}>Load more</Button>}
      </Card>
      <Card className="p-4 sm:p-6">{!detail ? <p className="text-sm text-slate-600">Select an OT request to see its details.</p> : <>
        <h2 className="text-lg font-bold text-ink">{detail.requestNo}</h2>
        <p className="mt-2 text-sm text-slate-600">{detail.usingDate}, {detail.startTime}–{detail.endTime} / {detail.pickupLocation} to {detail.destination}</p>
        <p className="mt-1 text-sm text-slate-600">Requester: {detail.requesterName}</p>
        <div className="mt-5 space-y-3">{detail.riders.map(rider => <div key={rider.employeeId} className="rounded-lg border border-slate-200 p-3 text-sm">
          <strong>{rider.employeeName}</strong> <span className="text-slate-600">({rider.employeeId})</span>
          <p className="mt-1">{rider.workDescription}</p>
          <p className="text-slate-600">Work: {rider.workStart}–{rider.workEnd}{rider.busStop ? ` / Bus stop: ${rider.busStop}` : ""}</p>
        </div>)}</div>
        {detail.status === "PendingOtVerification" && <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
          <Field label="GA note (required for Not found or Reject)"><Textarea maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></Field>
          <div className="flex flex-wrap gap-2"><Button type="button" disabled={busy} onClick={() => void verify("verified")}>Verified</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void verify("not_found")}>Not found</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void verify("rejected")}>Reject</Button></div>
        </div>}
      </>}</Card>
    </div>
  </main>;
}
