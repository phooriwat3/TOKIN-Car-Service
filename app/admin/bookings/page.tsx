"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { BookingTable } from "@/components/booking-table";
import { PageHeader } from "@/components/page-header";
import { TigerSpaceReportImport } from "@/components/tiger-space-report-import";
import { Button } from "@/components/ui";
export default function AllBookings() {
  const { data } = useApp();
  return (
    <>
      <PageHeader
        title="All bookings"
        description="Verify Tiger Space OT reports, monitor requests, and assign approved trips."
        action={
          <Link href="/admin/bookings/new">
            <Button><Plus size={16} /> Create employee OT ride</Button>
          </Link>
        }
      />
      <TigerSpaceReportImport />
      <BookingTable basePath="/admin/bookings" bookings={data.bookings} />
    </>
  );
}
