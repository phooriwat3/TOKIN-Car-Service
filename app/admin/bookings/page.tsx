"use client";
import { useApp } from "@/components/app-provider";
import { BookingTable } from "@/components/booking-table";
import { PageHeader } from "@/components/page-header";
import { TigerSpaceReportImport } from "@/components/tiger-space-report-import";
export default function AllBookings() {
  const { data } = useApp();
  return (
    <>
      <PageHeader
        title="All bookings"
        description="Verify Tiger Space OT reports, monitor requests, and assign approved trips."
      />
      <TigerSpaceReportImport />
      <BookingTable basePath="/admin/bookings" bookings={data.bookings} />
    </>
  );
}
