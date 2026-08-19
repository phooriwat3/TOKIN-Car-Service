"use client";

import { useMemo, useState } from "react";
import {
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useApp } from "./app-provider";
import { Button, Card, Field, Input, Select, Textarea } from "./ui";
import { detectSmartGroups, type SmartGroup } from "@/lib/smart-grouping";
import type { Booking } from "@/lib/types";

export function AdminSmartGroupingSection({
  onSelectGroup,
}: {
  onSelectGroup: (group: SmartGroup) => void;
}) {
  const { data } = useApp();
  const smartGroups = useMemo(
    () => detectSmartGroups(data.bookings),
    [data.bookings],
  );

  if (smartGroups.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand">
        <Sparkles size={15} className="text-amber-500" />
        Smart Grouping Suggestions ({smartGroups.length})
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {smartGroups.map((group) => {
          const unassignedCount = group.bookings.filter(
            (b) => b.status !== "assigned",
          ).length;
          return (
            <div
              key={group.groupId}
              className="flex flex-col justify-between rounded-xl border border-brand/20 bg-gradient-to-br from-brand-50/60 to-blue-50/40 p-4 shadow-card transition hover:border-brand/40"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white shadow-xs">
                      <Layers size={14} />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand">
                        {group.bookings.length} Requests Combined
                      </p>
                      <h3 className="font-bold text-ink">
                        {group.destination}
                      </h3>
                    </div>
                  </div>
                  {unassignedCount > 0 && (
                    <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {unassignedCount} Needs Vehicle
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 border-t border-brand/10 pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-brand shrink-0" />
                    <span>{group.usingDate} ({group.startTimeRange})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-brand shrink-0" />
                    <span>{group.totalPassengers} Passengers ({group.departments.join(", ")})</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.bookings.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center rounded bg-white px-2 py-0.5 text-[11px] font-medium border border-line text-slate-700"
                    >
                      {b.bookingNo} ({b.department})
                    </span>
                  ))}
                </div>
              </div>

              <Button
                size="sm"
                className="mt-4 w-full gap-1.5 bg-brand hover:bg-brand-dark"
                onClick={() => onSelectGroup(group)}
              >
                <Car size={14} />
                Batch Assign Vehicle to All {group.bookings.length} Requests
                <ChevronRight size={14} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminBatchAssignModal({
  selectedBookings,
  onClose,
  onSuccess,
}: {
  selectedBookings: Booking[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data, updateBooking } = useApp();

  const activeVehicles = useMemo(
    () => data.vehicles.filter((v) => v.active),
    [data.vehicles],
  );
  const activeDrivers = useMemo(
    () => data.drivers.filter((d) => d.active),
    [data.drivers],
  );

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [brand, setBrand] = useState("Toyota");
  const [vehicleType, setVehicleType] = useState("Van");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill when active vehicle is selected
  const handleVehicleSelect = (id: string) => {
    setSelectedVehicleId(id);
    const vehicle = activeVehicles.find((v) => v.id === id);
    if (vehicle) {
      setLicensePlate(vehicle.licensePlate);
      setBrand(vehicle.brand || "Toyota");
      setVehicleType(vehicle.type || "Van");
    }
  };

  // Auto-fill when active driver is selected
  const handleDriverSelect = (id: string) => {
    setSelectedDriverId(id);
    const driver = activeDrivers.find((d) => d.id === id);
    if (driver) {
      setDriverName(driver.fullName);
      setDriverPhone(driver.phone);
    }
  };

  const totalPassengers = useMemo(() => {
    let count = 0;
    for (const b of selectedBookings) {
      if (b.requestType === "overtime") {
        count += (b.overtimeEmployees ?? []).filter((e) => e.transportRequired).length || 1;
      } else {
        count += b.passengerList?.length || b.numPassengers || 1;
      }
    }
    return count;
  }, [selectedBookings]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(selectedBookings.map((b) => b.department).filter(Boolean)),
    ).join(", ");
  }, [selectedBookings]);

  const handleConfirmBatch = async () => {
    if (!licensePlate.trim()) {
      setError("Vehicle license plate is required.");
      return;
    }
    if (!driverName.trim()) {
      setError("Driver name is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const nowIso = new Date().toISOString();

      // Batch update every selected booking with the SAME vehicle & driver dispatch
      await Promise.all(
        selectedBookings.map((b) =>
          updateBooking(b.id, {
            status: "assigned",
            assignment: {
              vehicleId: selectedVehicleId || undefined,
              driverId: selectedDriverId || undefined,
              assignedAt: nowIso,
              accepted: true,
              notes: notes || `Batch consolidated dispatch for ${selectedBookings.length} requests`,
              manualTransportUnits: [
                {
                  unitId: `unit-${Date.now()}-${b.id}`,
                  licensePlate: licensePlate.trim(),
                  brand: brand.trim(),
                  vehicleType: vehicleType.trim(),
                  driverName: driverName.trim(),
                  driverPhone: driverPhone.trim(),
                  employeeIds: [b.requesterEmployeeId || b.id],
                },
              ],
            },
          }),
        ),
      );

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign vehicle in batch.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-white shadow-modal">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <Car size={16} />
            </span>
            <div>
              <h2 className="font-bold leading-tight">
                Batch Vehicle Assignment
              </h2>
              <p className="text-xs text-slate-400">
                Consolidate {selectedBookings.length} requests to a single vehicle &amp; driver
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Selected Bookings Summary Card */}
          <div className="rounded-lg border border-brand/20 bg-brand-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              Selected Requests ({selectedBookings.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1 text-xs"
                >
                  <span className="font-bold text-ink">{b.bookingNo}</span>
                  <span className="text-gray-400">·</span>
                  <span className="font-medium text-brand">{b.department}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{b.requesterName}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs font-medium text-slate-700 border-t border-brand/10 pt-2">
              <span>Total Passengers: <strong className="text-brand">{totalPassengers}</strong></span>
              <span>Departments: <strong>{departments}</strong></span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border-l-4 border-danger bg-danger-light p-3 text-xs font-semibold text-danger">
              ⚠️ {error}
            </div>
          )}

          {/* Quick Select from Active Fleet */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Select from Active Vehicles">
              <Select
                value={selectedVehicleId}
                onChange={(e) => handleVehicleSelect(e.target.value)}
              >
                <option value="">-- Choose active vehicle --</option>
                {activeVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} ({v.brand} {v.model} - {v.type})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Select from Active Drivers">
              <Select
                value={selectedDriverId}
                onChange={(e) => handleDriverSelect(e.target.value)}
              >
                <option value="">-- Choose active driver --</option>
                {activeDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.phone})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="border-t border-line pt-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Vehicle &amp; Driver Details
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="License Plate *">
                <Input
                  required
                  placeholder="e.g. 1กข-1234 BKK"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                />
              </Field>

              <Field label="Vehicle Type">
                <Select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                >
                  <option value="Van">Van (รถตู้)</option>
                  <option value="Car">Sedan / SUV (รถเก๋ง)</option>
                  <option value="Pickup">Pickup (รถกระบะ)</option>
                  <option value="Bus">Bus (รถบัส)</option>
                </Select>
              </Field>

              <Field label="Driver Name *">
                <Input
                  required
                  placeholder="Driver full name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </Field>

              <Field label="Driver Phone Number">
                <Input
                  placeholder="e.g. 081-234-5678"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Batch Dispatch Notes (sent to all passengers)">
                <Textarea
                  placeholder="e.g. Shared van trip for joint training. Meeting point: Front Building A at 08:00 AM."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line bg-gray-50 px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={submitting}
            onClick={handleConfirmBatch}
            className="gap-2 bg-brand hover:bg-brand-dark"
          >
            <CheckCircle2 size={16} />
            {submitting
              ? "Assigning Batch..."
              : `Assign Vehicle to ${selectedBookings.length} Requests`}
          </Button>
        </div>
      </div>
    </div>
  );
}
