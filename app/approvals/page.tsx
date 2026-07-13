'use client';
import { useApp } from '@/components/app-provider';
import { BookingTable } from '@/components/booking-table';
import { PageHeader } from '@/components/page-header';
export default function Approvals() {
    const { data, user } = useApp();
    return <><PageHeader title="Approval queue" description="Review pending requests from your department." /><BookingTable basePath="/approvals" bookings={data.bookings.filter(b => b.department === user.department && b.status === 'pending_approval')} /></>
}
