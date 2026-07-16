'use client';
import { use } from 'react';
import Link from 'next/link';
import { BookingDetail } from '@/components/booking-detail';
import { RequestFormDetails } from '@/components/request-form-details';
import { useApp } from '@/components/app-provider';
import { Button } from '@/components/ui';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, user } = useApp();
  const booking = data.bookings.find(x => x.id === id);
  const canEdit = booking?.requesterId === user.id && booking.status === 'changes_requested';
  return <div className="space-y-5">
    {canEdit && <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4"><div><p className="font-semibold text-amber-900">Changes requested</p><p className="text-sm text-amber-800">{booking.rejectReason || 'Please revise and resubmit this request.'}</p></div><Link href={`/bookings/${id}/edit`}><Button>Edit request</Button></Link></div>}
    <BookingDetail id={id} />
    <RequestFormDetails id={id} />
  </div>;
}
