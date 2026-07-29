"use client";
import { useApp } from "@/components/app-provider";
import { BookingTable } from "@/components/booking-table";
import { PageHeader } from "@/components/page-header";

export default function Approvals() {
  const { data, user } = useApp();
  const assigned = data.bookings.filter(
    (booking) => booking.status === "pending_approval",
  );
  return (
    <>
      <PageHeader
        title="Approval queue"
        description={`Review pending requests for ${user.department}.`}
      />
      <BookingTable basePath="/approvals" bookings={assigned} />
    </>
  );
}
