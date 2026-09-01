"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Car, CheckCircle2, ClipboardList, Trash2, UserRound } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Button, Card, Input } from "@/components/ui";

const CONFIRMATION = "DELETE ALL FLEET RESOURCES";

export function AdminDailyTransportSetup() {
  const { data, deleteAllFleetResources } = useApp();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resourceCount = data.vehicles.length + data.drivers.length;

  const removeLegacyResources = async () => {
    if (confirmation !== CONFIRMATION || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      const deleted = await deleteAllFleetResources();
      setMessage(`Removed ${deleted.vehicles} vehicle${deleted.vehicles === 1 ? "" : "s"} and ${deleted.drivers} driver${deleted.drivers === 1 ? "" : "s"}.`);
      setIsConfirming(false);
      setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to clear fleet resources.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500">
            GA operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Daily transport setup</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Enter the actual vehicle and driver together for each approved transport request. A separate vehicle or driver directory is not required.
          </p>
        </div>
        <Link href="/admin/bookings">
          <Button>
            <ClipboardList size={16} />
            Open approved bookings
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SetupStep icon={<ClipboardList size={18} />} number="1" title="Open an approved request" body="Use the All bookings queue to find a trip ready for GA assignment." />
        <SetupStep icon={<Car size={18} />} number="2" title="Enter the vehicle" body="Add the license plate, vehicle type, and provider or vehicle description." />
        <SetupStep icon={<UserRound size={18} />} number="3" title="Enter the driver" body="Enter the assigned driver’s name and phone number in the same transport unit." />
      </div>

      {message ? (
        <Card className="flex items-center gap-3 border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <CheckCircle2 size={18} className="shrink-0 text-green-700" />
          <span>{message}</span>
        </Card>
      ) : (
        <Card className="border-red-200 bg-red-50/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="mt-0.5 rounded-lg bg-red-100 p-2 text-red-700"><AlertTriangle size={18} /></span>
              <div>
                <h2 className="font-semibold text-red-950">Remove legacy fleet records</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-red-900/80">
                  Remove the old master list of {data.vehicles.length} vehicle{data.vehicles.length === 1 ? "" : "s"} and {data.drivers.length} driver{data.drivers.length === 1 ? "" : "s"}. This is available only after all bookings are deleted, so it cannot break historical assignments.
                </p>
              </div>
            </div>
            {!isConfirming && (
              <Button type="button" variant="danger" disabled={resourceCount === 0 || data.bookings.length > 0} onClick={() => setIsConfirming(true)}>
                <Trash2 size={15} /> Remove all legacy records
              </Button>
            )}
          </div>
          {data.bookings.length > 0 && (
            <p className="mt-4 rounded-lg border border-red-200 bg-white/70 p-3 text-sm text-red-800">
              Delete all bookings first. {data.bookings.length} booking{data.bookings.length === 1 ? " remains" : "s remain"}.
            </p>
          )}
          {isConfirming && (
            <div className="mt-5 border-t border-red-200 pt-5">
              <p className="text-sm font-semibold text-red-950">Type <code className="rounded bg-white px-1.5 py-0.5 text-xs">{CONFIRMATION}</code> to permanently clear the old resource lists.</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={CONFIRMATION} className="bg-white sm:max-w-sm" autoComplete="off" />
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => { setIsConfirming(false); setConfirmation(""); setError(null); }}>Cancel</Button>
                  <Button type="button" variant="danger" disabled={confirmation !== CONFIRMATION || isDeleting} onClick={removeLegacyResources}>
                    <Trash2 size={15} /> {isDeleting ? "Removing…" : "Permanently remove"}
                  </Button>
                </div>
              </div>
              {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function SetupStep({ icon, number, title, body }: { icon: React.ReactNode; number: string; title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-brand-50 p-2 text-brand-600">{icon}</span>
        <span className="text-xs font-bold text-slate-400">STEP {number}</span>
      </div>
      <h2 className="mt-4 font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
    </Card>
  );
}
