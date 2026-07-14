'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookingDetail } from '@/components/booking-detail';
import { useApp } from '@/components/app-provider';
import { Button, Card, Textarea } from '@/components/ui';
export default function Approval({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, updateBooking, user } = useApp();
    const router = useRouter();
    const b = data.bookings.find(x => x.id === id);
    const [comments, setComments] = useState('');
    const act = async (ok: boolean) => {
        if (!ok && !comments.trim()) return;
        await updateBooking(id, { status: ok ? 'approved' : 'rejected', rejectReason: ok ? undefined : comments, approval: { action: ok ? 'approved' : 'rejected', comments, actedAt: new Date().toISOString(), approverName: user.fullName } });
        router.push('/approvals')
    };
    return <div className="space-y-5">
        <BookingDetail id={id} />{b?.status === 'pending_approval' && <Card className="border-l-4 border-l-brand p-5"><h2 className="font-bold">Approval decision</h2><p className="mb-3 mt-1 text-sm text-gray-500">A reason is required when rejecting.</p><Textarea placeholder="Decision comments" value={comments} onChange={e => setComments(e.target.value)} /><div className="mt-3 flex justify-end gap-2"><Button variant="danger" disabled={!comments.trim()} onClick={() => act(false)}>Reject</Button><Button onClick={() => act(true)}>Approve</Button></div></Card>}</div>
}