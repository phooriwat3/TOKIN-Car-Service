"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";

type QueueItem = { id: string; requestNo: string; status: string; requesterName: string;
  usingDate: string; startTime: string; pickupLocation: string; destination: string };
type QueuePage = { items: QueueItem[]; page: number; total: number };
type Rider = { id: string; employeeId: string; employeeName: string;
  employeePhone: string | null; busStop: string | null };
type AssignedUnit = { id: string; unitCode: string; licensePlate: string; vehicleType: string;
  driverName: string; driverPhone: string; riderIds: string[]; lineMessage: string; lineSent: boolean };
type Detail = QueueItem & { revisionNumber: number; endTime: string; notes: string | null;
  riders: Rider[]; units: AssignedUnit[] };
type UnitForm = { key: number; licensePlate: string; vehicleType: string;
  driverName: string; driverPhone: string; riderIds: string[] };
type ErrorBody = { error?: string; title?: string; detail?: string; errors?: Record<string, string[]> };

const blankUnit = (key: number, riderIds: string[] = []): UnitForm => ({
  key, licensePlate: "", vehicleType: "", driverName: "", driverPhone: "", riderIds,
});

export default function SqlGaOtAssignments() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [units, setUnits] = useState<UnitForm[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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
      const result = await read<QueuePage>(`/api/transport/ga/ot-assignments?page=${nextPage}`);
      setQueue(current => nextPage === 1 ? result.items : [...current, ...result.items]);
      setPage(result.page); setTotal(result.total);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load OT assignments."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function openRequest(id: string) {
    setError(""); setNotice(""); setDetail(null);
    try {
      const result = await read<Detail>(`/api/transport/ga/ot-assignments/${id}`);
      setDetail(result);
      setUnits([blankUnit(0, result.riders.map(rider => rider.id))]);
      setNextKey(1); setNotes(result.notes ?? "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open OT request."); }
  }

  function updateUnit(key: number, change: Partial<UnitForm>) {
    setUnits(current => current.map(unit => unit.key === key ? { ...unit, ...change } : unit));
  }

  function moveRider(key: number, riderId: string, checked: boolean) {
    setUnits(current => current.map(unit => ({ ...unit,
      riderIds: unit.key === key
        ? checked ? [...unit.riderIds, riderId] : unit.riderIds.filter(id => id !== riderId)
        : checked ? unit.riderIds.filter(id => id !== riderId) : unit.riderIds,
    })));
  }

  async function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || busy) return;
    const assigned = units.flatMap(unit => unit.riderIds);
    if (units.some(unit => unit.riderIds.length === 0)
      || assigned.length !== detail.riders.length || new Set(assigned).size !== detail.riders.length) {
      setError("Place every rider in exactly one vehicle, with no empty vehicle."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await read<Detail>(`/api/transport/ga/ot-assignments/${detail.id}/assign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: detail.revisionNumber,
          units: units.map(({ licensePlate, vehicleType, driverName, driverPhone, riderIds }) =>
            ({ licensePlate, vehicleType, driverName, driverPhone, riderIds })), notes }),
      });
      setDetail(updated); setNotice("Vehicles assigned. Requester notification is queued.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to assign vehicles."); }
    finally { setBusy(false); }
  }

  async function dispatch(unit: AssignedUnit, action: "copied" | "sent") {
    if (!detail || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (action === "copied") await navigator.clipboard.writeText(unit.lineMessage);
      const updated = await read<Detail>(
        `/api/transport/ga/ot-assignments/${detail.id}/units/${unit.id}/dispatch`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      setDetail(updated);
      setNotice(action === "copied" ? `Vehicle ${unit.unitCode} details copied. Send them in LINE.`
        : `Vehicle ${unit.unitCode} LINE handoff recorded.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to record LINE handoff."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-brand">TOKIN transport / GA</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">OT vehicle assignment</h1></div>
      <div className="flex flex-wrap gap-2"><Link href="/admin/ot-verification"><Button type="button" variant="outline">OT verification</Button></Link>
        <Link href="/admin/bookings"><Button type="button" variant="outline">Other trips</Button></Link>
        <Button type="button" variant="outline" onClick={() => void refresh()}>Refresh</Button></div>
    </div>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} {error.includes("Sign in") && <Link className="underline" href="/admin/login">Open login</Link>}</p>}
    {notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Card className="p-4 sm:p-5"><h2 className="font-semibold text-ink">Verified and assigned OT ({total})</h2>
        {loading && <p className="mt-4 text-sm text-slate-600">Loading...</p>}
        {!loading && queue.length === 0 && <p className="mt-4 text-sm text-slate-600">No verified OT requests.</p>}
        <div className="mt-3 space-y-2">{queue.map(item => <button key={item.id} type="button"
          onClick={() => void openRequest(item.id)} className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-brand hover:bg-blue-50">
          <span className="flex items-center justify-between gap-2"><strong className="text-brand">{item.requestNo}</strong><Badge>{item.status}</Badge></span>
          <span className="mt-1 block text-sm text-ink">{item.usingDate} / {item.startTime} / {item.requesterName}</span>
        </button>)}</div>
        {queue.length < total && <Button type="button" variant="outline" className="mt-4" disabled={busy}
          onClick={() => void refresh(page + 1)}>Load more</Button>}
      </Card>
      <Card className="p-4 sm:p-6">{!detail ? <p className="text-sm text-slate-600">Select an OT request.</p> : <>
        <h2 className="text-lg font-bold text-ink">{detail.requestNo}</h2>
        <p className="mt-2 text-sm text-slate-600">{detail.usingDate}, {detail.startTime} to {detail.endTime}</p>
        <p className="text-sm text-slate-600">{detail.pickupLocation} to {detail.destination}</p>
        {detail.status === "Approved" ? <form onSubmit={(event) => void assign(event)} className="mt-5 space-y-5">
          <p className="text-sm text-slate-600">Place each rider in one vehicle. GA can add another vehicle when needed.</p>
          {units.map((unit, index) => <div key={unit.key} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold text-ink">Vehicle {index + 1}</h3>
              {units.length > 1 && <Button type="button" variant="outline" onClick={() => setUnits(current => current.filter(x => x.key !== unit.key))}>Remove</Button>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Vehicle type"><Input required maxLength={80} value={unit.vehicleType} onChange={e => updateUnit(unit.key, { vehicleType: e.target.value })} /></Field>
              <Field label="License plate"><Input required maxLength={40} value={unit.licensePlate} onChange={e => updateUnit(unit.key, { licensePlate: e.target.value })} /></Field>
              <Field label="Driver name"><Input required maxLength={160} value={unit.driverName} onChange={e => updateUnit(unit.key, { driverName: e.target.value })} /></Field>
              <Field label="Driver phone"><Input required maxLength={40} value={unit.driverPhone} onChange={e => updateUnit(unit.key, { driverPhone: e.target.value })} /></Field>
            </div>
            <fieldset><legend className="text-sm font-semibold text-ink">Riders</legend>
              <div className="mt-2 space-y-2">{detail.riders.map(rider => <label key={rider.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={unit.riderIds.includes(rider.id)}
                  onChange={e => moveRider(unit.key, rider.id, e.target.checked)} />
                <span>{rider.employeeName} ({rider.employeeId}) / {rider.busStop}</span>
              </label>)}</div>
            </fieldset>
          </div>)}
          {units.length < 20 && <Button type="button" variant="outline" onClick={() => {
            setUnits(current => [...current, blankUnit(nextKey)]); setNextKey(nextKey + 1);
          }}>Add vehicle</Button>}
          <Field label="GA notes"><Textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
          <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Assign vehicles"}</Button>
        </form> : <div className="mt-5 space-y-5">{detail.units.map(unit => <div key={unit.id} className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-ink">Vehicle {unit.unitCode}: {unit.vehicleType} / {unit.licensePlate}</h3>
          <p className="mt-1 text-sm text-slate-600">Driver: {unit.driverName} / {unit.driverPhone}</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-100 p-3 text-sm text-ink">{unit.lineMessage}</pre>
          <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy}
            onClick={() => void dispatch(unit, "copied")}>Copy LINE details</Button>
            <Button type="button" disabled={busy || unit.lineSent} onClick={() => void dispatch(unit, "sent")}>{unit.lineSent ? "Sent recorded" : "Mark sent in LINE"}</Button></div>
        </div>)}</div>}
      </>}</Card>
    </div>
  </main>;
}
