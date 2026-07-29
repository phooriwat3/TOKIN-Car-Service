"use client";

import { use, useState } from "react";
import { BookingDetail } from "./booking-detail";
import { useApp } from "./app-provider";
import { Button, Card, Field, Input, Select, Textarea } from "./ui";
import { findAssignmentConflict } from "@/lib/business";
import { createClient } from "@/lib/supabase/client";
import { Car, Mail, Users, ArrowRight, Plus, Trash2 } from "lucide-react";
import type { ManualTransportUnit, OvertimeEmployee } from "@/lib/types";

const newUnitId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `unit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emptyTransportUnit = (): ManualTransportUnit => ({
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
  const booking = data.bookings.find((x) => x.id === id);
  const existing = booking?.assignment ?? booking?.assignmentDraft;

  const [vehicleId, setVehicle] = useState(existing?.vehicleId ?? "");
  const [driverId, setDriver] = useState(existing?.driverId ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [manualUnits, setManualUnits] = useState<ManualTransportUnit[]>(
    booking?.assignment?.manualTransportUnits?.length
      ? booking.assignment.manualTransportUnits.map((unit) => ({
          ...unit,
          unitId: unit.unitId || newUnitId(),
          employeeIds: unit.employeeIds ?? [],
        }))
      : [emptyTransportUnit()],
  );

  const isOt =
    booking?.requestType === "overtime" ||
    (booking?.overtimeEmployees && booking.overtimeEmployees.length > 0);
  const [empAssignments, setEmpAssignments] = useState<
    Record<number, { vehicleId: string; driverId: string }>
  >(() => {
    const initial: Record<number, { vehicleId: string; driverId: string }> = {};
    booking?.overtimeEmployees?.forEach((employee, index) => {
      initial[index] = {
        vehicleId: employee.assignedVehicleId || existing?.vehicleId || "",
        driverId: employee.assignedDriverId || existing?.driverId || "",
      };
    });
    return initial;
  });
  const otEmployeesNeedingTransport =
    booking?.overtimeEmployees?.filter(
      (employee) => employee.transportRequired,
    ) ?? [];
  const assignedEmployeeIds = manualUnits.flatMap(
    (unit) => unit.employeeIds ?? [],
  );
  const assignmentsComplete =
    otEmployeesNeedingTransport.length > 0 &&
    assignedEmployeeIds.length === otEmployeesNeedingTransport.length &&
    new Set(assignedEmployeeIds).size === assignedEmployeeIds.length &&
    otEmployeesNeedingTransport.every((employee) =>
      assignedEmployeeIds.includes(employee.employeeId),
    );
  const manualUnitsValid =
    manualUnits.length > 0 &&
    manualUnits.every(
      (unit) =>
        unit.licensePlate.trim() &&
        unit.brand.trim() &&
        unit.vehicleType.trim() &&
        unit.driverName.trim() &&
        unit.employeeIds.length > 0,
    ) &&
    assignmentsComplete;

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const canConfirm = booking
    ? ["approved", "assigned"].includes(booking.status)
    : false;
  const canPlan = booking
    ? [
        "pending_approval",
        "changes_requested",
        "approved",
        "assigned",
      ].includes(booking.status)
    : false;
  const updateEmpAssignment = (
    index: number,
    key: "vehicleId" | "driverId",
    value: string,
  ) => {
    setEmpAssignments((current) => ({
      ...current,
      [index]: {
        ...current[index],
        [key]: value,
      },
    }));
  };
  const applyToAll = () => {
    if (!vehicleId || !driverId) return;
    setEmpAssignments(() => {
      const updated: Record<number, { vehicleId: string; driverId: string }> =
        {};
      booking?.overtimeEmployees?.forEach((_, index) => {
        updated[index] = { vehicleId, driverId };
      });
      return updated;
    });
  };
  const prepareUpdatedEmployees = (): OvertimeEmployee[] => {
    if (!booking?.overtimeEmployees) return [];
    return booking.overtimeEmployees.map((employee, index) => {
      const assignment = empAssignments[index] || { vehicleId, driverId };
      return {
        ...employee,
        assignedVehicleId: assignment.vehicleId || vehicleId,
        assignedDriverId: assignment.driverId || driverId,
      };
    });
  };

  const updateManualUnit = (
    index: number,
    key:
      | "licensePlate"
      | "brand"
      | "vehicleType"
      | "driverName"
      | "driverPhone",
    value: string,
  ) => {
    setManualUnits((current) =>
      current.map((unit, unitIndex) =>
        unitIndex === index ? { ...unit, [key]: value } : unit,
      ),
    );
  };

  const addManualUnit = () =>
    setManualUnits((current) => [...current, emptyTransportUnit()]);
  const removeManualUnit = (index: number) => {
    setManualUnits((current) =>
      current.length === 1
        ? current
        : current.filter((_, unitIndex) => unitIndex !== index),
    );
  };
  const assignEmployeeToUnit = (employeeId: string, unitId: string) => {
    setManualUnits((current) =>
      current.map((unit) => {
        const withoutEmployee = unit.employeeIds.filter(
          (employee) => employee !== employeeId,
        );
        return unit.unitId === unitId
          ? { ...unit, employeeIds: [...withoutEmployee, employeeId] }
          : { ...unit, employeeIds: withoutEmployee };
      }),
    );
  };

  const saveDraft = async () => {
    const primaryVehicle = vehicleId;
    const primaryDriver = driverId;
    if (!primaryVehicle || !primaryDriver) return;
    setSaving(true);
    setMessage("");
    try {
      if (configured) {
        const supabase = createClient();
        if (!supabase) throw new Error("Supabase is unavailable.");
        const { error } = await supabase.rpc("save_assignment_draft", {
          p_booking_id: id,
          p_vehicle_id: primaryVehicle,
          p_driver_id: primaryDriver,
          p_notes: notes || null,
        });
        if (error) throw error;
      }
      setMessage(
        "Planning draft saved. Assignment is still waiting for approval.",
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to save planning draft.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirm = async () => {
    if (!booking || !canConfirm) return;
    const primaryVehicle = vehicleId;
    const primaryDriver = driverId;

    if (isOt && !manualUnitsValid) {
      return setMessage(
        "Complete every vehicle and assign each employee who requested transport to exactly one vehicle.",
      );
    }
    if (!isOt && (!primaryVehicle || !primaryDriver)) {
      return setMessage("Please select a vehicle and driver for assignment.");
    }

    const conflict = !isOt
      ? findAssignmentConflict(data.bookings, id, primaryVehicle, primaryDriver)
      : null;
    if (conflict) return setMessage(conflict);

    setSaving(true);
    setMessage("");
    try {
      const normalizedManualUnits = manualUnits.map((unit) => ({
        unitId: unit.unitId,
        licensePlate: unit.licensePlate.trim(),
        brand: unit.brand.trim(),
        vehicleType: unit.vehicleType.trim(),
        driverName: unit.driverName.trim(),
        driverPhone: unit.driverPhone.trim(),
        employeeIds: unit.employeeIds,
      }));
      await updateBooking(id, {
        status: "assigned",
        overtimeEmployees: booking.overtimeEmployees,
        assignment: {
          vehicleId: isOt ? undefined : primaryVehicle,
          driverId: isOt ? undefined : primaryDriver,
          manualTransportUnits: isOt ? normalizedManualUnits : undefined,
          notes,
          accepted: false,
          assignedAt: new Date().toISOString(),
        },
      });

      if (!configured) {
        setMessage(
          "Assignment confirmed. A notification email would be sent to the requester.",
        );
      } else {
        const supabase = createClient();
        if (!supabase) throw new Error("Supabase is unavailable.");
        const { data: notification, error } = await supabase.functions.invoke(
          "notify-requester-assignment",
          {
            body: { requestId: id },
          },
        );
        if (error) throw error;
        setMessage(
          notification?.notificationStatus === "sent"
            ? "Assignment confirmed. The requester notification email has been sent."
            : "Assignment confirmed. Notification email service is not fully configured.",
        );
      }
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Assignment was saved, but email notification could not be sent.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <BookingDetail id={id} admin />

      {booking && canPlan && (
        <Card className="border-l-4 border-l-brand p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Car className="text-brand" size={20} />
                <h2 className="text-lg font-bold text-ink">
                  Vehicle and Driver Assignment
                </h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {isOt
                  ? "Enter each vehicle and driver, then assign every employee to the vehicle that will take them home."
                  : "Assign vehicle and driver for this trip request."}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                canConfirm
                  ? "bg-success-light text-success"
                  : "bg-accent-light text-amber-800"
              }`}
            >
              {canConfirm ? "Ready to assign" : "Waiting for approval"}
            </span>
          </div>

          {isOt && (
            <div className="mt-6 space-y-4 rounded-xl border border-line bg-canvas p-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Vehicles and drivers
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Enter the actual vehicles and drivers for this OT request.
                  This list is not limited by fleet records in the system.
                </p>
              </div>

              {manualUnits.map((unit, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-line bg-white p-4 shadow-panel"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-ink">
                      Vehicle and driver {index + 1}
                    </h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={manualUnits.length === 1}
                      onClick={() => removeManualUnit(index)}
                    >
                      <Trash2 size={15} /> Remove
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="License plate *">
                      <Input
                        value={unit.licensePlate}
                        onChange={(event) =>
                          updateManualUnit(
                            index,
                            "licensePlate",
                            event.target.value,
                          )
                        }
                        placeholder="e.g. 1AB-2345"
                      />
                    </Field>
                    <Field label="Brand *">
                      <Input
                        value={unit.brand}
                        onChange={(event) =>
                          updateManualUnit(index, "brand", event.target.value)
                        }
                        placeholder="e.g. Toyota"
                      />
                    </Field>
                    <Field label="Vehicle type *">
                      <Select
                        value={unit.vehicleType}
                        onChange={(event) =>
                          updateManualUnit(
                            index,
                            "vehicleType",
                            event.target.value,
                          )
                        }
                      >
                        <option value="">Select vehicle type</option>
                        <option value="Car">Car</option>
                        <option value="Van">Van</option>
                        <option value="Pickup">Pickup</option>
                        <option value="Bus">Bus</option>
                        <option value="Other">Other</option>
                      </Select>
                    </Field>
                    <Field label="Driver name *">
                      <Input
                        value={unit.driverName}
                        onChange={(event) =>
                          updateManualUnit(
                            index,
                            "driverName",
                            event.target.value,
                          )
                        }
                        placeholder="Driver full name"
                      />
                    </Field>
                    <Field label="Driver phone">
                      <Input
                        value={unit.driverPhone}
                        onChange={(event) =>
                          updateManualUnit(
                            index,
                            "driverPhone",
                            event.target.value,
                          )
                        }
                        placeholder="Optional"
                        inputMode="tel"
                      />
                    </Field>
                  </div>
                  <div className="mt-4 border-t border-line pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Assigned passengers ({unit.employeeIds.length})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {unit.employeeIds.length ? (
                        unit.employeeIds.map((employeeId) => {
                          const employee = otEmployeesNeedingTransport.find(
                            (item) => item.employeeId === employeeId,
                          );
                          return (
                            <span
                              key={employeeId}
                              className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand"
                            >
                              {employee?.employeeName || employeeId} ?{" "}
                              {employee?.busStop || "No drop-off"}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-amber-700">
                          No employees assigned yet.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addManualUnit}>
                <Plus size={16} /> Add another vehicle and driver
              </Button>

              <div className="rounded-xl border border-brand/20 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-brand" />
                  <h3 className="font-semibold text-ink">
                    Assign employees to vehicles
                  </h3>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Every employee requesting transportation must be assigned
                  once. Their drop-off point is shown for route planning.
                </p>
                <div className="mt-4 space-y-3">
                  {otEmployeesNeedingTransport.map((employee) => {
                    const selectedUnit = manualUnits.find((unit) =>
                      unit.employeeIds.includes(employee.employeeId),
                    );
                    return (
                      <div
                        key={employee.employeeId}
                        className="grid gap-3 rounded-lg border border-line p-3 md:grid-cols-[1fr_1fr] md:items-center"
                      >
                        <div>
                          <p className="font-semibold text-ink">
                            {employee.employeeName}{" "}
                            <span className="text-xs font-normal text-gray-500">
                              ({employee.employeeId})
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-gray-600">
                            Drop-off: <strong>{employee.busStop || "-"}</strong>{" "}
                            ? Work ends {employee.workEnd}
                          </p>
                        </div>
                        <Select
                          aria-label={`Vehicle for ${employee.employeeName}`}
                          value={selectedUnit?.unitId ?? ""}
                          onChange={(event) =>
                            assignEmployeeToUnit(
                              employee.employeeId,
                              event.target.value,
                            )
                          }
                        >
                          <option value="">
                            Select vehicle for this employee
                          </option>
                          {manualUnits.map((unit, index) => (
                            <option key={unit.unitId} value={unit.unitId}>
                              Vehicle {index + 1} ?{" "}
                              {unit.licensePlate || "plate not entered"} ?{" "}
                              {unit.driverName || "driver not entered"}
                            </option>
                          ))}
                        </Select>
                      </div>
                    );
                  })}
                </div>
                {!assignmentsComplete && (
                  <p className="mt-3 text-xs font-semibold text-amber-700">
                    Assign all {otEmployeesNeedingTransport.length} employees
                    before confirming.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Primary / Default Selection */}
          <div
            className={`mt-6 rounded-xl border border-line bg-canvas p-4 ${isOt ? "hidden" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-ink">
                {isOt
                  ? "Primary / Default Vehicle & Driver"
                  : "Selected Vehicle & Driver"}
              </h3>
              {isOt && otEmployeesNeedingTransport.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!vehicleId || !driverId}
                  onClick={applyToAll}
                  className="text-xs"
                >
                  Apply vehicle & driver to all (
                  {otEmployeesNeedingTransport.length} employees)
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default / Primary Vehicle">
                <Select
                  value={vehicleId}
                  onChange={(e) => setVehicle(e.target.value)}
                >
                  <option value="">Select vehicle</option>
                  {data.vehicles
                    .filter(
                      (v) =>
                        v.active &&
                        v.capacity >= (isOt ? 1 : booking.numPassengers),
                    )
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate} · {v.brand} {v.model} ({v.capacity}{" "}
                        seats)
                      </option>
                    ))}
                </Select>
              </Field>

              <Field label="Default / Primary Driver">
                <Select
                  value={driverId}
                  onChange={(e) => setDriver(e.target.value)}
                >
                  <option value="">Select driver</option>
                  {data.drivers
                    .filter((d) => d.active)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.phone})
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
          </div>

          {/* Per-Employee Individual Assignments (for OT Requests) */}
          {!isOt && otEmployeesNeedingTransport.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Users size={16} className="text-brand" />
                    Individual Employee Vehicle & Driver Assignments (
                    {otEmployeesNeedingTransport.length} passengers)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Each assigned employee will receive an assignment
                    confirmation email containing their vehicle, driver, and
                    drop-off point.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {booking.overtimeEmployees?.map((emp, index) => {
                  if (!emp.transportRequired) return null;
                  const currentAssign = empAssignments[index] || {
                    vehicleId: vehicleId,
                    driverId: driverId,
                  };
                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-line bg-white p-4 shadow-panel transition hover:border-brand/30"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                        <div>
                          <span className="font-bold text-ink">
                            {emp.employeeName}
                          </span>
                          <span className="ml-2 text-xs font-medium text-gray-500">
                            ({emp.employeeId})
                          </span>
                          {emp.employeeEmail && (
                            <span className="ml-3 inline-flex items-center gap-1 text-xs text-brand">
                              <Mail size={12} />
                              {emp.employeeEmail}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-medium bg-brand-light px-2.5 py-1 rounded-md text-brand">
                          Drop-off:{" "}
                          <strong>{emp.busStop || "Main stop"}</strong> (
                          {emp.workStart} - {emp.workEnd})
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Assigned Vehicle">
                          <Select
                            value={currentAssign.vehicleId || vehicleId}
                            onChange={(e) =>
                              updateEmpAssignment(
                                index,
                                "vehicleId",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">Select vehicle</option>
                            {data.vehicles
                              .filter((v) => v.active)
                              .map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.licensePlate} · {v.brand} {v.model} (
                                  {v.capacity} seats)
                                </option>
                              ))}
                          </Select>
                        </Field>

                        <Field label="Assigned Driver">
                          <Select
                            value={currentAssign.driverId || driverId}
                            onChange={(e) =>
                              updateEmpAssignment(
                                index,
                                "driverId",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">Select driver</option>
                            {data.drivers
                              .filter((d) => d.active)
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.fullName} ({d.phone})
                                </option>
                              ))}
                          </Select>
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Planning Notes */}
          <div className="mt-5">
            <Field label="Assignment Notes / Instructions">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes or instructions for driver/passengers..."
              />
            </Field>
          </div>

          {message && (
            <p
              className={`mt-4 rounded-lg p-3 text-sm font-medium ${
                message.includes("saved") ||
                message.includes("confirmed") ||
                message.includes("Notifications")
                  ? "bg-success-light text-success border border-success/20"
                  : "bg-danger-light text-danger border border-danger/20"
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              className={isOt ? "hidden" : undefined}
              disabled={saving || !vehicleId || !driverId}
              onClick={saveDraft}
            >
              Save planning draft
            </Button>
            <Button
              type="button"
              disabled={
                saving ||
                !canConfirm ||
                (isOt ? !manualUnitsValid : !vehicleId || !driverId)
              }
              title={!canConfirm ? "Available after approval" : undefined}
              onClick={confirm}
            >
              Confirm assignment &amp; Send Email <ArrowRight size={16} />
            </Button>
          </div>

          {!canConfirm && (
            <p className="mt-2 text-right text-xs text-gray-500">
              Confirm assignment is locked until this request is approved by the
              manager.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
