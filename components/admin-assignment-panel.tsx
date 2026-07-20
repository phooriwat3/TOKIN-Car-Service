'use client';
import { use, useState } from 'react';
import { BookingDetail } from './booking-detail';
import { useApp } from './app-provider';
import { Button, Card, Field, Select, Textarea } from './ui';
import { findAssignmentConflict } from '@/lib/business';
import { createClient } from '@/lib/supabase/client';

export function AdminAssignmentPanel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, updateBooking, configured } = useApp();
  const booking = data.bookings.find(x => x.id === id);
  const existing = booking?.assignment ?? booking?.assignmentDraft;
  const [vehicleId, setVehicle] = useState(existing?.vehicleId ?? '');
  const [driverId, setDriver] = useState(existing?.driverId ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const canConfirm = booking ? ['approved','assigned'].includes(booking.status) : false;
  const canPlan = booking ? ['pending_approval','changes_requested','approved','assigned'].includes(booking.status) : false;

  const saveDraft = async () => {
    if (!vehicleId || !driverId) return;
    setSaving(true); setMessage('');
    try {
      if (configured) {
        const supabase = createClient();
        if (!supabase) throw new Error('Supabase is unavailable.');
        const { error } = await supabase.rpc('save_assignment_draft', { p_booking_id:id, p_vehicle_id:vehicleId, p_driver_id:driverId, p_notes:notes || null });
        if (error) throw error;
      }
      setMessage('Planning draft saved. Assignment is still waiting for approval.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Unable to save planning draft.'); }
    finally { setSaving(false); }
  };

  const confirm = async () => {
    if (!booking || !canConfirm) return;
    const conflict = findAssignmentConflict(data.bookings,id,vehicleId,driverId);
    if (conflict) return setMessage(conflict);
    setSaving(true); setMessage('');
    try {
      await updateBooking(id,{ status:'assigned', assignment:{ vehicleId,driverId,notes,accepted:false,assignedAt:new Date().toISOString() } });
      if (!configured) {
        setMessage('Assignment confirmed.');
      } else {
        const supabase = createClient();
        if (!supabase) throw new Error('Supabase is unavailable.');
        const { data: notification, error } = await supabase.functions.invoke('notify-requester-assignment', {
          body: { requestId: id },
        });
        if (error) throw error;
        setMessage(notification?.notificationStatus === 'sent'
          ? 'Assignment confirmed and emailed to the requester.'
          : 'Assignment confirmed. Requester email delivery is not configured yet.');
      }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Assignment was saved, but the requester email could not be sent.'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-5"><BookingDetail id={id}/>{booking && canPlan && <Card className="border-l-4 border-l-accent p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Vehicle and driver planning</h2><p className="mt-1 text-sm text-gray-500">Admin can plan immediately. Final assignment unlocks after approver approval.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${canConfirm?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'}`}>{canConfirm?'Ready to assign':'Waiting for approval'}</span></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Vehicle"><Select value={vehicleId} onChange={e=>setVehicle(e.target.value)}><option value="">Select vehicle</option>{data.vehicles.filter(v=>v.active&&v.capacity>=booking.numPassengers).map(v=><option key={v.id} value={v.id}>{v.licensePlate} · {v.brand} {v.model} ({v.capacity})</option>)}</Select></Field><Field label="Driver"><Select value={driverId} onChange={e=>setDriver(e.target.value)}><option value="">Select driver</option>{data.drivers.filter(d=>d.active).map(d=><option key={d.id} value={d.id}>{d.fullName}</option>)}</Select></Field></div><div className="mt-4"><Field label="Planning notes"><Textarea value={notes} onChange={e=>setNotes(e.target.value)}/></Field></div>{message&&<p className={`mt-3 text-sm font-medium ${message.includes('saved')||message.includes('confirmed')?'text-green-700':'text-red-600'}`}>{message}</p>}<div className="mt-4 flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" disabled={saving||!vehicleId||!driverId} onClick={saveDraft}>Save planning draft</Button><Button type="button" disabled={saving||!vehicleId||!driverId||!canConfirm} title={!canConfirm?'Available after approval':undefined} onClick={confirm}>Confirm assignment</Button></div>{!canConfirm&&<p className="mt-2 text-right text-xs text-gray-500">Confirm assignment is locked until this request is approved.</p>}</Card>}</div>;
}
