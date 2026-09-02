"use client";

import { use, useMemo, useState } from "react";
import { ArrowRight, Car, CheckCircle2, Clock3, Plus, SearchX, Trash2, Users, XCircle } from "lucide-react";
import { BookingDetail } from "./booking-detail";
import { useApp } from "./app-provider";
import { Button, Card, Field, Input, Select, Textarea } from "./ui";
import { createClient } from "@/lib/supabase/client";
import type { ManualTransportUnit, OtVerificationStatus } from "@/lib/types";

const newUnitId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `unit-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptyUnit = (): ManualTransportUnit => ({
  unitId: newUnitId(),
  licensePlate: "",
  brand: "",
  vehicleType: "",
  driverName: "",
  driverPhone: "",
  employeeIds: [],
});

export function AdminAssignmentPanel({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, updateBooking, configured } = useApp();
  const booking = data.bookings.find((item) => item.id === id);
  const isOt = booking?.requestType === "overtime";
  const transportMemories = data.transportMemories ?? [];
  const passengers = useMemo(() => {
    if (!booking) return [];
    if (isOt) {
      return (booking.overtimeEmployees ?? [])
        .filter((employee) => employee.transportRequired)
        .map((employee) => ({
          id: employee.employeeId,
          name: employee.employeeName,
          detail: `${employee.busStop || "No drop-off"} · ends ${employee.workEnd}`,
        }));
    }
    const names = booking.passengerList.length
      ? booking.passengerList
      : Array.from(
          { length: booking.numPassengers },
          (_, index) => `Passenger ${index + 1}`,
        );
    return names.map((name, index) => ({
      id: `passenger:${index}`,
      name,
      detail: booking.destination,
    }));
  }, [booking, isOt]);

  const [units, setUnits] = useState<ManualTransportUnit[]>(() =>
    booking?.assignment?.manualTransportUnits?.length
      ? booking.assignment.manualTransportUnits.map((unit) => ({
          ...unit,
          unitId: unit.unitId || newUnitId(),
          employeeIds: unit.employeeIds ?? [],
        }))
      : [emptyUnit()],
  );
  const [notes, setNotes] = useState(booking?.assignment?.notes ?? "");
  const [verificationNote, setVerificationNote] = useState(
    booking?.otVerificationNote ?? "",
  );
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (!booking) return <BookingDetail id={id} admin />;

  const canConfirm = ["approved", "assigned"].includes(booking.status);
  const canViewPlanner = [
    "pending_approval",
    "pending_ot_verification",
    "approved",
    "assigned",
    "changes_requested",
  ].includes(booking.status);
  const assignedRefs = units.flatMap((unit) => unit.employeeIds);
  const assignmentsComplete =
    passengers.length > 0 &&
    assignedRefs.length === passengers.length &&
    new Set(assignedRefs).size === assignedRefs.length &&
    passengers.every((passenger) => assignedRefs.includes(passenger.id));
  const unitsComplete =
    units.length > 0 &&
    units.every(
      (unit) =>
        unit.licensePlate.trim() &&
        unit.vehicleType.trim() &&
        unit.driverName.trim() &&
        unit.employeeIds.length > 0,
    );

  const updateUnit = (
    index: number,
    field: "licensePlate" | "brand" | "vehicleType" | "driverName" | "driverPhone",
    value: string,
  ) =>
    setUnits((current) =>
      current.map((unit, unitIndex) =>
        unitIndex === index ? { ...unit, [field]: value } : unit,
      ),
    );

  const applyRememberedUnit = (index: number, memoryId: string) => {
    const memory = transportMemories.find((item) => item.id === memoryId);
    if (!memory) return;
    setUnits((current) =>
      current.map((unit, unitIndex) =>
        unitIndex === index
          ? {
              ...unit,
              licensePlate: memory.licensePlate,
              brand: memory.brand,
              vehicleType: memory.vehicleType,
              driverName: memory.driverName,
              driverPhone: memory.driverPhone,
            }
          : unit,
      ),
    );
  };

  const assignPassenger = (passengerId: string, unitId: string) =>
    setUnits((current) =>
      current.map((unit) => {
        const remaining = unit.employeeIds.filter((id) => id !== passengerId);
        return unit.unitId === unitId
          ? { ...unit, employeeIds: [...remaining, passengerId] }
          : { ...unit, employeeIds: remaining };
      }),
    );

  const updateOtVerification = async (
    result: Exclude<OtVerificationStatus, "not_required">,
  ) => {
    setSaving(true);
    setMessage("");
    try {
      const nextStatus = booking.requestOrigin === "hr_direct"
        ? booking.status
        : result === "verified"
          ? "approved"
          : result === "rejected"
            ? "rejected"
            : "pending_ot_verification";
      await updateBooking(id, {
        status: nextStatus,
        otVerificationStatus: result,
        otVerificationNote: verificationNote.trim() || undefined,
        otVerifiedAt:
          result === "verified" ? new Date().toISOString() : undefined,
      });
      setMessage(
        result === "verified"
          ? "OT verified. This request is ready for transport confirmation."
          : result === "not_found"
            ? "No matching approved OT was found yet. The request remains in the waiting list."
            : result === "rejected"
              ? "The transport request was rejected because the OT was not approved."
              : "The request remains pending OT verification.",
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to update OT verification.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirm = async () => {
    if (!canConfirm) {
      setMessage(
        isOt
          ? "Verify the approved OT in Tiger Space before GA confirms transport."
          : "This request must be approved before GA confirms transport.",
      );
      return;
    }
    if (!unitsComplete || !assignmentsComplete) {
      setMessage(
        "Complete every daily vehicle and driver, then assign each passenger exactly once.",
      );
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const normalized = units.map((unit) => ({
        ...unit,
        licensePlate: unit.licensePlate.trim(),
        brand: unit.brand.trim(),
        vehicleType: unit.vehicleType.trim(),
        driverName: unit.driverName.trim(),
        driverPhone: unit.driverPhone.trim(),
      }));
      await updateBooking(id, {
        status: "assigned",
        assignment: {
          manualTransportUnits: normalized,
          notes,
          accepted: false,
          assignedAt: new Date().toISOString(),
        },
      });

      if (!configured) {
        setMessage("Daily transport assignment confirmed in demo mode.");
      } else {
        const supabase = createClient();
        if (!supabase) throw new Error("Supabase is unavailable.");
        const { data: notification, error } = await supabase.functions.invoke(
          "notify-requester-assignment",
          { body: { requestId: id } },
        );
        if (error) throw error;
        setMessage(
          notification?.notificationStatus === "sent"
            ? "Assignment confirmed and notification sent."
            : "Assignment confirmed. Notification service requires attention.",
        );
      }
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to confirm the daily transport assignment.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <BookingDetail id={id} admin />
      {isOt && booking.otVerificationMode !== "manager_exception" && !["assigned", "scheduled", "in_progress", "completed", "cancelled"].includes(booking.status) && (
        <Card className="border-l-4 border-l-sky-500 p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="text-sky-700" size={20} />
                <h2 className="text-lg font-bold text-ink">
                  Tiger Space OT verification
                </h2>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-gray-500">
                Match the employee number, OT date, and start/end time against
                the Tiger Space report. A missing result stays pending because
                approval may arrive after the transport request cutoff.
              </p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {booking.otVerificationStatus === "verified"
                ? "Verified"
                : booking.otVerificationStatus === "not_found"
                  ? "Not found yet"
                  : booking.otVerificationStatus === "rejected"
                    ? "OT rejected"
                    : "Waiting for report"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 rounded-lg border border-line bg-canvas p-4 text-sm sm:grid-cols-4">
            <div><span className="block text-xs text-gray-500">Employee number</span><strong>{booking.requesterEmployeeId || "-"}</strong></div>
            <div><span className="block text-xs text-gray-500">Department</span><strong>{booking.department}</strong></div>
            <div><span className="block text-xs text-gray-500">OT date</span><strong>{booking.usingDate}</strong></div>
            <div><span className="block text-xs text-gray-500">OT time</span><strong>{booking.startTime}-{booking.endTime}</strong></div>
          </div>
          <div className="mt-4">
            <Field label="Verification note (optional)">
              <Textarea
                value={verificationNote}
                onChange={(event) => setVerificationNote(event.target.value)}
                placeholder="Report date, mismatch details, or exception reason"
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" disabled={saving} onClick={() => updateOtVerification("verified")}>
              <CheckCircle2 size={16} /> OT approved / matched
            </Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => updateOtVerification("not_found")}>
              <SearchX size={16} /> Not found yet
            </Button>
            <Button type="button" variant="danger" disabled={saving} onClick={() => updateOtVerification("rejected")}>
              <XCircle size={16} /> OT not approved
            </Button>
          </div>
        </Card>
      )}
      {canViewPlanner && (
        <Card className="border-l-4 border-l-brand p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Car className="text-brand" size={20} />
                <h2 className="text-lg font-bold text-ink">
                  Daily vehicle and driver arrangement
                </h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                GA enters the actual vehicle and driver sourced for this service day. No fleet master is required.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                canConfirm
                  ? "bg-success-light text-success"
                  : "bg-accent-light text-amber-800"
              }`}
            >
              {canConfirm
                ? "Ready for GA"
                : isOt
                  ? "Planning only - waiting for OT verification"
                  : "Waiting for outside-trip approval"}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {units.map((unit, index) => (
              <div key={unit.unitId} className="rounded-lg border border-line bg-canvas p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-ink">Vehicle {index + 1}</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={units.length === 1 || saving}
                    onClick={() =>
                      setUnits((current) =>
                        current.filter((_, unitIndex) => unitIndex !== index),
                      )
                    }
                  >
                    <Trash2 size={15} /> Remove
                  </Button>
                </div>
                {transportMemories.length > 0 && (
                  <div className="mb-4 rounded-lg border border-brand/20 bg-brand-50/40 p-3">
                    <label className="mb-1.5 block text-xs font-semibold text-brand-900">
                      Use remembered vehicle and driver
                    </label>
                    <Select
                      aria-label={`Use remembered vehicle and driver for vehicle ${index + 1}`}
                      value=""
                      onChange={(event) => applyRememberedUnit(index, event.target.value)}
                    >
                      <option value="">Select a previous transport unit</option>
                      {transportMemories.map((memory) => (
                        <option key={memory.id} value={memory.id}>
                          {memory.licensePlate} · {memory.driverName} · {memory.vehicleType}
                        </option>
                      ))}
                    </Select>
                    <p className="mt-1.5 text-xs text-brand-800/80">
                      Saved automatically after you confirm a vehicle and driver assignment.
                    </p>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="License plate / vehicle ID *">
                    <Input
                      value={unit.licensePlate}
                      onChange={(event) => updateUnit(index, "licensePlate", event.target.value)}
                      placeholder="License plate or temporary vehicle ID"
                    />
                  </Field>
                  <Field label="Provider / vehicle description">
                    <Input
                      value={unit.brand}
                      onChange={(event) => updateUnit(index, "brand", event.target.value)}
                      placeholder="Vendor, brand, or description"
                    />
                  </Field>
                  <Field label="Vehicle type *">
                    <Select
                      value={unit.vehicleType}
                      onChange={(event) => updateUnit(index, "vehicleType", event.target.value)}
                    >
                      <option value="">Select type</option>
                      <option>Car</option>
                      <option>Van</option>
                      <option>Pickup</option>
                      <option>Bus</option>
                      <option>Other</option>
                    </Select>
                  </Field>
                  <Field label="Driver name *">
                    <Input
                      value={unit.driverName}
                      onChange={(event) => updateUnit(index, "driverName", event.target.value)}
                      placeholder="Driver full name"
                    />
                  </Field>
                  <Field label="Driver phone">
                    <Input
                      inputMode="tel"
                      value={unit.driverPhone}
                      onChange={(event) => updateUnit(index, "driverPhone", event.target.value)}
                      placeholder="Contact number"
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setUnits((current) => [...current, emptyUnit()])}
            >
              <Plus size={16} /> Add another daily vehicle
            </Button>
          </div>

          <div className="mt-6 rounded-lg border border-brand/20 p-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-brand" />
              <h3 className="font-semibold text-ink">Assign passengers</h3>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Every person requesting transportation must be assigned to exactly one vehicle.
            </p>
            <div className="mt-4 space-y-3">
              {passengers.map((passenger) => {
                const selected = units.find((unit) =>
                  unit.employeeIds.includes(passenger.id),
                );
                return (
                  <div
                    key={passenger.id}
                    className="grid gap-3 rounded-lg border border-line p-3 md:grid-cols-2 md:items-center"
                  >
                    <div>
                      <p className="font-semibold text-ink">{passenger.name}</p>
                      <p className="text-xs text-gray-500">{passenger.detail}</p>
                    </div>
                    <Select
                      aria-label={`Vehicle for ${passenger.name}`}
                      value={selected?.unitId ?? ""}
                      onChange={(event) => assignPassenger(passenger.id, event.target.value)}
                    >
                      <option value="">Select vehicle</option>
                      {units.map((unit, index) => (
                        <option key={unit.unitId} value={unit.unitId}>
                          Vehicle {index + 1} · {unit.licensePlate || "not entered"} · {unit.driverName || "driver not entered"}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <Field label="GA notes / meeting instructions">
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Meeting time, pickup point, route, or instructions..."
              />
            </Field>
          </div>

          {message && (
            <p className="mt-4 rounded-lg border border-line bg-canvas p-3 text-sm font-medium text-ink">
              {message}
            </p>
          )}
          <div className="mt-6 flex justify-end border-t border-line pt-4">
            <Button
              type="button"
              disabled={saving || !canConfirm || !unitsComplete || !assignmentsComplete}
              onClick={confirm}
            >
              {saving ? "Confirming..." : "Confirm assignment & send notification"}
              {!saving && <ArrowRight size={16} />}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
