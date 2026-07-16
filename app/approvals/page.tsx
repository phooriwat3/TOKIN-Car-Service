'use client';
import { useApp } from '@/components/app-provider';
import { BookingTable } from '@/components/booking-table';
import { PageHeader } from '@/components/page-header';

export default function Approvals() {
  const { data, user } = useApp();
  const assigned = data.bookings.filter(booking =>
    booking.status === 'pending_approval' &&
    (booking.approverId ? booking.approverId === user.id : booking.department === user.department),
  );
  return <>
    <PageHeader title="Approval queue" description="Review requests assigned to your account." />
    <BookingTable basePath="/approvals" bookings={assigned} />
  </>;
}
