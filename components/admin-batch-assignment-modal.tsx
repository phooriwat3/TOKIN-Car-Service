"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useApp } from "./app-provider";
import { Button, Card, Field, Input, Select, Textarea } from "./ui";
import { LineDispatchActions } from "./line-dispatch-actions";
import {
  createLineDispatchMessage,
  DEFAULT_LINE_VAN_CAPACITY,
} from "@/lib/line-dispatch";
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
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand">
                          {group.bookings.length} Requests Combined
                        </p>
                        {group.shiftEndTime && (
                          <span className="inline-flex items-center rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                            เลิกกะ {group.shiftEndTime} น.
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-ink">
                        {group.destination}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {group.occupancyStatus === "available" && (
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        🟢 {group.totalPassengers} / {group.capacity} Seats
                      </span>
                    )}
                    {group.occupancyStatus === "full" && (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        🟡 10 / 10 Full
                      </span>
                    )}
                    {group.occupancyStatus === "overflow" && (
                      <span className="rounded-full bg-rose-100 border border-rose-300 px-2 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                        🔴 {group.totalPassengers} / 10 Overflow!
                      </span>
                    )}
                    {unassignedCount > 0 && (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {unassignedCount} Needs Vehicle
                      </span>
                    )}
                  </div>
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
}: {
  selectedBookings: Booking[];
  onClose: () => void;
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
  const [contractorName, setContractorName] = useState("");
  const [tripRateThb, setTripRateThb] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [assignmentConfirmed, setAssignmentConfirmed] = useState(false);
  const [dispatchUnitId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `batch-${crypto.randomUUID()}`
      : `batch-${Date.now()}`,
  );

  const markAssignmentChanged = () => setAssignmentConfirmed(false);

  // Auto-fill when active vehicle is selected
  const handleVehicleSelect = (id: string) => {
    markAssignmentChanged();
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
    markAssignmentChanged();
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
      if (b.requestType === "overtime" || b.overtimeTransport) {
        count +=
          (b.overtimeEmployees ?? []).filter((e) => e.transportRequired).length ||
          1;
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

  const lineMessage = createLineDispatchMessage({
    bookings: selectedBookings,
    unit: {
      licensePlate,
      brand,
      vehicleType,
      driverName,
      driverPhone,
      contractorName,
      employeeIds: [],
    },
    notes,
    capacity: DEFAULT_LINE_VAN_CAPACITY,
  });

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
      const rateNumber = tripRateThb ? Number(tripRateThb) : undefined;

      // Batch update every selected booking with the SAME vehicle & driver dispatch
      await Promise.all(
        selectedBookings.map((b) =>
          updateBooking(b.id, {
            status: "assigned",
            assignment: {
              vehicleId: selectedVehicleId || undefined,
              driverId: selectedDriverId || undefined,
              contractorName: contractorName.trim() || undefined,
              tripRateThb: rateNumber,
              assignedAt: nowIso,
              accepted: false,
              notes:
                notes ||
                `Batch consolidated dispatch for ${selectedBookings.length} requests`,
              manualTransportUnits: [
                {
                  unitId: `${dispatchUnitId}:${b.id}`,
                  licensePlate: licensePlate.trim(),
                  brand: brand.trim(),
                  vehicleType: vehicleType.trim(),
                  driverName: driverName.trim(),
                  driverPhone: driverPhone.trim(),
                  contractorName: contractorName.trim() || undefined,
                  tripRateThb: rateNumber,
                  employeeIds:
                    b.overtimeEmployees?.filter((employee) => employee.transportRequired)
                      .map((employee) => employee.employeeId) ??
                    (b.passengerList.length
                      ? b.passengerList.map((_, index) => `passenger:${index}`)
                      : Array.from(
                          { length: Math.max(1, b.numPassengers) },
                          (_, index) => `passenger:${index}`,
                        )),
                },
              ],
            },
          }),
        ),
      );

      setAssignmentConfirmed(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to assign vehicle in batch.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const occupancyPercent = Math.min(100, Math.round((totalPassengers / 10) * 100));

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
                Batch Vehicle Assignment &amp; LINE Dispatch
              </h2>
              <p className="text-xs text-slate-400">
                Consolidate {selectedBookings.length} requests to a single contractor van &amp; driver
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
          {/* Selected Bookings Summary Card & 10-Seat Meter */}
          <div className="rounded-lg border border-brand/20 bg-brand-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                Selected Requests ({selectedBookings.length})
              </p>
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {totalPassengers < 10 && (
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-emerald-800">
                    🟢 {totalPassengers} / 10 ที่นั่ง (ว่าง {10 - totalPassengers} ที่นั่ง)
                  </span>
                )}
                {totalPassengers === 10 && (
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-amber-800">
                    🟡 เต็มพอดี (10 / 10 ที่นั่ง)
                  </span>
                )}
                {totalPassengers > 10 && (
                  <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-rose-800 flex items-center gap-1">
                    <AlertTriangle size={12} /> เกินความจุ ({totalPassengers} / 10 ที่นั่ง)
                  </span>
                )}
              </div>
            </div>

            {/* Visual Seat Capacity Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-300 ${
                  totalPassengers < 10
                    ? "bg-emerald-500"
                    : totalPassengers === 10
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
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

            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 border-t border-brand/10 pt-2">
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
              Contractor &amp; Van Details
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contractor / Service Provider (ผู้ให้บริการรถตู้)">
                <Input
                  placeholder="e.g. หจก. นครหลวงยานยนต์ หรือ พี่สมควร รถตู้"
                  value={contractorName}
                  onChange={(e) => {
                    markAssignmentChanged();
                    setContractorName(e.target.value);
                  }}
                />
              </Field>

              <Field label="Trip Rate (THB) (ค่าบริการต่อเที่ยว)">
                <Input
                  type="number"
                  placeholder="e.g. 800"
                  value={tripRateThb}
                  onChange={(e) => {
                    markAssignmentChanged();
                    setTripRateThb(e.target.value);
                  }}
                />
              </Field>

              <Field label="License Plate * (ทะเบียนรถ)">
                <Input
                  required
                  placeholder="e.g. 1กข-1234 อยุธยา"
                  value={licensePlate}
                  onChange={(e) => {
                    markAssignmentChanged();
                    setLicensePlate(e.target.value);
                  }}
                />
              </Field>

              <Field label="Vehicle Type">
                <Select
                  value={vehicleType}
                  onChange={(e) => {
                    markAssignmentChanged();
                    setVehicleType(e.target.value);
                  }}
                >
                  <option value="Van">Van (รถตู้ 10-12 ที่นั่ง)</option>
                  <option value="Car">Sedan / SUV (รถเก๋ง)</option>
                  <option value="Pickup">Pickup (รถกระบะ)</option>
                  <option value="Bus">Bus (รถบัส)</option>
                </Select>
              </Field>

              <Field label="Driver Name * (ชื่อคนขับ)">
                <Input
                  required
                  placeholder="Driver full name"
                  value={driverName}
                  onChange={(e) => {
                    markAssignmentChanged();
                    setDriverName(e.target.value);
                  }}
                />
              </Field>

              <Field label="Driver Phone Number (เบอร์โทรคนขับ)">
                <Input
                  placeholder="e.g. 081-234-5678"
                  value={driverPhone}
                  onChange={(e) => {
                    markAssignmentChanged();
                    setDriverPhone(e.target.value);
                  }}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Batch Dispatch Notes (บันทึกแจ้งผู้โดยสาร)">
                <Textarea
                  placeholder="e.g. รถตู้ออกหน้าบริษัทตรงเวลา 20:00 น. กรุณารอที่ Front Area"
                  value={notes}
                  onChange={(e) => {
                    markAssignmentChanged();
                    setNotes(e.target.value);
                  }}
                />
              </Field>
            </div>
          </div>

          {assignmentConfirmed && (
            <div className="rounded-lg border border-success/30 bg-success-light p-3 text-sm font-semibold text-success">
              Assignment saved. Review the dispatch message, choose the correct driver chat, and press Send in LINE.
            </div>
          )}
          <LineDispatchActions
            message={lineMessage}
            bookingIds={selectedBookings.map((booking) => booking.id)}
            transportUnitId={dispatchUnitId}
            disabled={!assignmentConfirmed}
            title="LINE dispatch coordination (ส่งงานคนขับรถ)"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line bg-gray-50 px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
          >
            {assignmentConfirmed ? "Done" : "Cancel"}
          </Button>

          <Button
            type="button"
            disabled={submitting || assignmentConfirmed}
            onClick={handleConfirmBatch}
            className="gap-2 bg-brand hover:bg-brand-dark"
          >
            <CheckCircle2 size={16} />
            {submitting
              ? "Assigning Batch..."
              : assignmentConfirmed
                ? "Assignment saved"
                : `Save Assignment for ${selectedBookings.length} Requests`}
          </Button>
        </div>
      </div>
    </div>
  );
}
