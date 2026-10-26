"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { BookingTable } from "@/components/booking-table";
import { PageHeader } from "@/components/page-header";
import { ErrorBoundary } from "@/components/error-boundary";
import { useBookingsQuery } from "@/lib/hooks/use-bookings-query";

export default function Bookings() {
  const { data, user } = useApp();
  const { data: queryData, isLoading } = useBookingsQuery();

  const allBookings = queryData?.data?.length ? queryData.data : data.bookings;
  const userBookings = allBookings.filter(
    (b) =>
      b.requesterId === user.id ||
      b.requesterEmployeeId === user.employeeId ||
      b.requesterEmail === user.email,
  );
  const showLoading = isLoading && !userBookings.length;

  return (
    <ErrorBoundary>
      <PageHeader
        title="My bookings"
        description="Track your requests from submission through trip completion."
        action={
          <Link
            href="/bookings/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <Plus size={17} />
            New request
          </Link>
        }
      />
      <BookingTable bookings={userBookings} isLoading={showLoading} />
    </ErrorBoundary>
  );
}
