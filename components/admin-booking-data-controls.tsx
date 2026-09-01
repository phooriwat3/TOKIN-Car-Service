"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Button, Card, Input } from "@/components/ui";

const CONFIRMATION = "DELETE ALL BOOKINGS";

export function AdminBookingDataControls() {
  const { data, deleteAllBookings } = useApp();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bookingCount = data.bookings.length;

  const handleDelete = async () => {
    if (confirmation !== CONFIRMATION || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      const deleted = await deleteAllBookings();
      setResult(`${deleted} booking${deleted === 1 ? " was" : "s were"} deleted.`);
      setIsConfirming(false);
      setConfirmation("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to delete bookings. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (result) {
    return (
      <Card className="flex items-center gap-3 border-green-200 bg-green-50 p-4 text-sm text-green-900">
        <CheckCircle2 size={18} className="shrink-0 text-green-700" />
        <span>{result} The booking list is now empty.</span>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50/60 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="mt-0.5 rounded-lg bg-red-100 p-2 text-red-700">
            <AlertTriangle size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-red-950">Danger zone</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-red-900/80">
              Permanently delete all {bookingCount} booking{bookingCount === 1 ? "" : "s"}, including related passenger, overtime, approval, assignment, and trip records. Booking deletion events remain in the audit log.
            </p>
          </div>
        </div>
        {!isConfirming && (
          <Button
            type="button"
            variant="danger"
            disabled={bookingCount === 0}
            onClick={() => setIsConfirming(true)}
          >
            <Trash2 size={15} />
            Delete all bookings
          </Button>
        )}
      </div>

      {isConfirming && (
        <div className="mt-5 border-t border-red-200 pt-5">
          <p className="text-sm font-semibold text-red-950">
            This cannot be undone. Type <code className="rounded bg-white px-1.5 py-0.5 text-xs">{CONFIRMATION}</code> to continue.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              aria-label="Delete all bookings confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={CONFIRMATION}
              className="bg-white sm:max-w-sm"
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsConfirming(false);
                  setConfirmation("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={confirmation !== CONFIRMATION || isDeleting}
                onClick={handleDelete}
              >
                <Trash2 size={15} />
                {isDeleting ? "Deleting…" : "Permanently delete"}
              </Button>
            </div>
          </div>
          {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
        </div>
      )}
    </Card>
  );
}
