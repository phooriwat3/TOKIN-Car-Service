'use client';

import { use, useState } from 'react';
import { BookingDetail } from './booking-detail';
import { useApp } from './app-provider';
import { Button, Card, Field, Select, Textarea } from './ui';
import { findAssignmentConflict } from '@/lib/business';
import { createClient } from '@/lib/supabase/client';
import { Car, Mail, Users, ArrowRight } from 'lucide-react';
import type { OvertimeEmployee } from '@/lib/types';

export function AdminAssignmentPanel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, updateBooking, configured } = useApp();
  const booking = data.bookings.find((x) => x.id === id);
  const existing = booking?.assignment ?? booking?.assignmentDraft;

  const [vehicleId, setVehicle] = useState(existing?.vehicleId ?? '');
  const [driverId, setDriver] = useState(existing?.driverId ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  // Per-employee assignment state for OT requests
  const isOt = booking?.requestType === 'overtime' || (booking?.overtimeEmployees && booking.overtimeEmployees.length > 0);
  const [empAssignments, setEmpAssignments] = useState<Record<number, { vehicleId: string; driverId: string }>>(() => {
    const initial: Record<number, { vehicleId: string; driverId: string }> = {};
    booking?.overtimeEmployees?.forEach((emp, index) => {
      initial[index] = {
        vehicleId: emp.assignedVehicleId || existing?.vehicleId || '',
        driverId: emp.assignedDriverId || existing?.driverId || '',
      };
    });
    return initial;
  });

  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const canConfirm = booking ? ['approved', 'assigned'].includes(booking.status) : false;
  const canPlan = booking ? ['pending_approval', 'changes_requested', 'approved', 'assigned'].includes(booking.status) : false;

  const updateEmpAssignment = (index: number, key: 'vehicleId' | 'driverId', val: string) => {
    setEmpAssignments((current) => ({
      ...current,
      [index]: {
        ...current[index],
        [key]: val,
      },
    }));
  };

  const applyToAll = () => {
    if (!vehicleId || !driverId) return;
    setEmpAssignments((current) => {
      const updated: Record<number, { vehicleId: string; driverId: string }> = {};
      booking?.overtimeEmployees?.forEach((_, i) => {
        updated[i] = { vehicleId, driverId };
      });
      return updated;
    });
  };

  const prepareUpdatedEmployees = (): OvertimeEmployee[] => {
    if (!booking?.overtimeEmployees) return [];
    return booking.overtimeEmployees.map((emp, index) => {
      const assign = empAssignments[index] || { vehicleId, driverId };
      return {
        ...emp,
        assignedVehicleId: assign.vehicleId || vehicleId,
        assignedDriverId: assign.driverId || driverId,
      };
    });
  };

  const saveDraft = async () => {
    const primaryVehicle = vehicleId || empAssignments[0]?.vehicleId;
    const primaryDriver = driverId || empAssignments[0]?.driverId;
    if (!primaryVehicle || !primaryDriver) return;
    setSaving(true);
    setMessage('');
    try {
      if (configured) {
        const supabase = createClient();
        if (!supabase) throw new Error('Supabase is unavailable.');
        const { error } = await supabase.rpc('save_assignment_draft', {
          p_booking_id: id,
          p_vehicle_id: primaryVehicle,
          p_driver_id: primaryDriver,
          p_notes: notes || null,
        });
        if (error) throw error;
      }
      setMessage('Planning draft saved. Assignment is still waiting for approval.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to save planning draft.');
    } finally {
      setSaving(false);
    }
  };

  const confirm = async () => {
    if (!booking || !canConfirm) return;
    const primaryVehicle = vehicleId || empAssignments[0]?.vehicleId;
    const primaryDriver = driverId || empAssignments[0]?.driverId;

    if (!primaryVehicle || !primaryDriver) {
      return setMessage('Please select a vehicle and driver for assignment.');
    }

    const conflict = findAssignmentConflict(data.bookings, id, primaryVehicle, primaryDriver);
    if (conflict) return setMessage(conflict);

    setSaving(true);
    setMessage('');
    try {
      const updatedEmployees = prepareUpdatedEmployees();
      await updateBooking(id, {
        status: 'assigned',
        overtimeEmployees: updatedEmployees.length > 0 ? updatedEmployees : booking.overtimeEmployees,
        assignment: {
          vehicleId: primaryVehicle,
          driverId: primaryDriver,
          notes,
          accepted: false,
          assignedAt: new Date().toISOString(),
        },
      });

      if (!configured) {
        setMessage('Assignment confirmed. Notification emails would be dispatched to assigned employees.');
      } else {
        const supabase = createClient();
        if (!supabase) throw new Error('Supabase is unavailable.');
        const { data: notification, error } = await supabase.functions.invoke('notify-requester-assignment', {
          body: { requestId: id },
        });
        if (error) throw error;
        setMessage(
          notification?.notificationStatus === 'sent'
            ? 'Assignment confirmed! Notifications have been sent to each assigned employee.'
            : 'Assignment confirmed. Notification email service is not fully configured.',
        );
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Assignment was saved, but email notification could not be sent.');
    } finally {
      setSaving(false);
    }
  };

  const otEmployeesNeedingTransport = booking?.overtimeEmployees?.filter((e) => e.transportRequired) ?? [];

  return (
    <div className="space-y-5">
      <BookingDetail id={id} admin />

      {booking && canPlan && (
        <Card className="border-l-4 border-l-brand p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Car className="text-brand" size={20} />
                <h2 className="text-lg font-bold text-ink">Vehicle and Driver Assignment</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {isOt
                  ? 'Assign vehicles and drivers to OT employees. You can assign different vehicles/drivers if employees drop off at different stops.'
                  : 'Assign vehicle and driver for this trip request.'}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                canConfirm ? 'bg-success-light text-success' : 'bg-accent-light text-amber-800'
              }`}
            >
              {canConfirm ? 'Ready to assign' : 'Waiting for approval'}
            </span>
          </div>

          {/* Primary / Default Selection */}
          <div className="mt-6 rounded-xl border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-ink">
                {isOt ? 'Primary / Default Vehicle & Driver' : 'Selected Vehicle & Driver'}
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
                  Apply vehicle & driver to all ({otEmployeesNeedingTransport.length} employees)
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default / Primary Vehicle">
                <Select value={vehicleId} onChange={(e) => setVehicle(e.target.value)}>
                  <option value="">Select vehicle</option>
                  {data.vehicles
                    .filter((v) => v.active && v.capacity >= (isOt ? 1 : booking.numPassengers))
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate} · {v.brand} {v.model} ({v.capacity} seats)
                      </option>
                    ))}
                </Select>
              </Field>

              <Field label="Default / Primary Driver">
                <Select value={driverId} onChange={(e) => setDriver(e.target.value)}>
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
          {isOt && otEmployeesNeedingTransport.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Users size={16} className="text-brand" />
                    Individual Employee Vehicle & Driver Assignments ({otEmployeesNeedingTransport.length} passengers)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Each assigned employee will receive an assignment confirmation email containing their vehicle, driver, and drop-off point.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {booking.overtimeEmployees?.map((emp, index) => {
                  if (!emp.transportRequired) return null;
                  const currentAssign = empAssignments[index] || { vehicleId: vehicleId, driverId: driverId };
                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-line bg-white p-4 shadow-panel transition hover:border-brand/30"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                        <div>
                          <span className="font-bold text-ink">{emp.employeeName}</span>
                          <span className="ml-2 text-xs font-medium text-gray-500">({emp.employeeId})</span>
                          {emp.employeeEmail && (
                            <span className="ml-3 inline-flex items-center gap-1 text-xs text-brand">
                              <Mail size={12} />
                              {emp.employeeEmail}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-medium bg-brand-light px-2.5 py-1 rounded-md text-brand">
                          Drop-off: <strong>{emp.busStop || 'Main stop'}</strong> ({emp.workStart} - {emp.workEnd})
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Assigned Vehicle">
                          <Select
                            value={currentAssign.vehicleId || vehicleId}
                            onChange={(e) => updateEmpAssignment(index, 'vehicleId', e.target.value)}
                          >
                            <option value="">Select vehicle</option>
                            {data.vehicles
                              .filter((v) => v.active)
                              .map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.licensePlate} · {v.brand} {v.model} ({v.capacity} seats)
                                </option>
                              ))}
                          </Select>
                        </Field>

                        <Field label="Assigned Driver">
                          <Select
                            value={currentAssign.driverId || driverId}
                            onChange={(e) => updateEmpAssignment(index, 'driverId', e.target.value)}
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
                message.includes('saved') || message.includes('confirmed') || message.includes('Notifications')
                  ? 'bg-success-light text-success border border-success/20'
                  : 'bg-danger-light text-danger border border-danger/20'
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={saving || (!vehicleId && !empAssignments[0]?.vehicleId)}
              onClick={saveDraft}
            >
              Save planning draft
            </Button>
            <Button
              type="button"
              disabled={saving || (!vehicleId && !empAssignments[0]?.vehicleId) || !canConfirm}
              title={!canConfirm ? 'Available after approval' : undefined}
              onClick={confirm}
            >
              Confirm assignment & Send Emails <ArrowRight size={16} />
            </Button>
          </div>

          {!canConfirm && (
            <p className="mt-2 text-right text-xs text-gray-500">
              Confirm assignment is locked until this request is approved by the manager.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

