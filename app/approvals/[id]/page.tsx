'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookingDetail } from '@/components/booking-detail';
import { useApp } from '@/components/app-provider';
import { Button, Card, Textarea } from '@/components/ui';
import type { Approval } from '@/lib/types';

export default function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, updateBooking, user } = useApp();
  const router = useRouter();
  const booking = data.bookings.find(x => x.id === id);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  const act = async (action: Approval['action']) => {
    if (action !== 'approved' && !comments.trim()) return;
    setSaving(true);
    try {
      await updateBooking(id, {
        status: action,
        rejectReason: action === 'approved' ? undefined : comments,
        approval: { action, comments, actedAt: new Date().toISOString(), approverName: user.fullName },
      });
      router.push('/approvals');
    } finally { setSaving(false); }
  };

  return <div className="space-y-5">
    <BookingDetail id={id} />
    {booking?.status === 'pending_approval' && <Card className="border-l-4 border-l-brand p-5">
      <h2 className="font-bold">Approval decision</h2>
      <p className="mb-3 mt-1 text-sm text-gray-500">A comment is required when rejecting or returning the request for correction.</p>
      <Textarea placeholder="Decision comments" value={comments} onChange={e => setComments(e.target.value)} />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="danger" disabled={saving || !comments.trim()} onClick={() => act('rejected')}>Reject</Button>
        <Button variant="secondary" disabled={saving || !comments.trim()} onClick={() => act('changes_requested')}>Request changes</Button>
        <Button disabled={saving} onClick={() => act('approved')}>Approve</Button>
      </div>
    </Card>}
  </div>;
}
