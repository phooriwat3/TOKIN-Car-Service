"use client";
import { use, useState } from "react";
import { BookingDetail } from "@/components/booking-detail";
import { LineDispatchActions } from "@/components/line-dispatch-actions";
import { useApp } from "@/components/app-provider";
import { Button, Card, Field, Select, Textarea } from "@/components/ui";
import { findAssignmentConflict } from "@/lib/business";
import { createLineCancellationMessage } from "@/lib/line-dispatch";
export default function AdminBooking({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, updateBooking } = useApp();
  const b = data.bookings.find((x) => x.id === id);
  const [vehicleId, setVehicle] = useState(b?.assignment?.vehicleId || "");
  const [driverId, setDriver] = useState(b?.assignment?.driverId || "");
  const [notes, setNotes] = useState(b?.assignment?.notes || "");
  const [message, setMessage] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const assign = async () => {
    const conflict = findAssignmentConflict(
      data.bookings,
      id,
      vehicleId,
      driverId,
    );
    if (conflict) {
      setMessage(conflict);
      return;
    }
    await updateBooking(id, {
      status: "assigned",
      assignment: {
        vehicleId,
        driverId,
        notes,
        accepted: false,
        assignedAt: new Date().toISOString(),
      },
    });
    setMessage("Assignment saved.");
  };
  const cancelBooking = async () => {
    const reason = cancellationReason.trim();
    if (reason.length < 5) {
      setMessage("Enter a cancellation reason with at least 5 characters.");
      return;
    }
    if (!window.confirm(`Cancel ${b?.bookingNo ?? "this request"}?`)) return;
    setCancelling(true);
    setMessage("");
    try {
      await updateBooking(id, { status: "cancelled", rejectReason: reason });
      setMessage("Request cancelled. Notify the driver through LINE if an assignment was already sent.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to cancel request.");
    } finally {
      setCancelling(false);
    }
  };

  const cancellationUnits = b?.assignment?.manualTransportUnits?.length
    ? b.assignment.manualTransportUnits.map((unit) => ({
        id: unit.unitId,
        vehicleLabel: [unit.licensePlate, unit.brand, unit.vehicleType].filter(Boolean).join(" "),
        driverName: unit.driverName,
      }))
    : b?.assignment
      ? [{
          id: b.assignment.vehicleId ?? "assigned-unit",
          vehicleLabel: (() => {
            const vehicle = data.vehicles.find((item) => item.id === b.assignment?.vehicleId);
            return vehicle
              ? [vehicle.licensePlate, vehicle.brand, vehicle.model].filter(Boolean).join(" ")
              : "Assigned vehicle";
          })(),
          driverName: data.drivers.find((item) => item.id === b.assignment?.driverId)?.fullName
            ?? "Assigned driver",
        }]
      : [];
  return (
    <div className="space-y-5">
      <BookingDetail id={id} admin />
      {b && ["approved", "assigned", "scheduled"].includes(b.status) && (
        <Card className="border-l-4 border-l-red-500 p-5">
          <h2 className="font-bold text-ink">Cancel request</h2>
          <p className="mb-4 mt-1 text-sm text-gray-600">
            GA cancellation notifies the requester. If a driver was assigned, send the withdrawal message through LINE below.
          </p>
          <Field label="Cancellation reason">
            <Textarea
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value)}
              placeholder="Reason shown to the requester and GA..."
              maxLength={1000}
            />
          </Field>
          <Button
            className="mt-4"
            variant="danger"
            disabled={cancelling || cancellationReason.trim().length < 5}
            onClick={cancelBooking}
          >
            {cancelling ? "Cancelling..." : "Cancel request"}
          </Button>
        </Card>
      )}
      {b?.status === "cancelled" && cancellationUnits.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-1 font-bold text-ink">Driver withdrawal</h2>
          <p className="mb-4 text-sm text-gray-600">
            Send one cancellation message to every assigned driver and record it only after pressing Send in LINE.
          </p>
          <div className="space-y-3">
            {cancellationUnits.map((unit) => (
              <LineDispatchActions
                key={unit.id}
                mode="cancellation"
                message={createLineCancellationMessage({
                  booking: b,
                  reason: b.rejectReason || "Cancelled by GA.",
                  vehicleLabel: unit.vehicleLabel,
                  driverName: unit.driverName,
                })}
                bookingIds={[b.id]}
                transportUnitId={unit.id}
                title={`Cancel driver: ${unit.driverName}`}
              />
            ))}
          </div>
        </Card>
      )}
      {b && ["approved", "assigned"].includes(b.status) && (
        <Card className="border-l-4 border-l-accent p-5">
          <h2 className="font-bold">Vehicle and driver assignment</h2>
          <p className="mb-4 mt-1 text-sm text-gray-500">
            Availability is checked against active overlapping bookings.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vehicle">
              <Select
                value={vehicleId}
                onChange={(e) => setVehicle(e.target.value)}
              >
                <option value="">Select vehicle</option>
                {data.vehicles
                  .filter((v) => v.active && v.capacity >= b.numPassengers)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} · {v.brand} {v.model} ({v.capacity})
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Driver">
              <Select
                value={driverId}
                onChange={(e) => setDriver(e.target.value)}
              >
                <option value="">Select driver</option>
                {data.drivers
                  .filter((d) => d.active)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Assignment notes">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
          {message && (
            <p
              className={`mt-3 text-sm font-medium ${message.includes("saved") ? "text-green-700" : "text-red-600"}`}
            >
              {message}
            </p>
          )}
          <Button
            className="mt-4"
            disabled={!vehicleId || !driverId}
            onClick={assign}
          >
            Save assignment
          </Button>
        </Card>
      )}
    </div>
  );
}
