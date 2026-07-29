"use client";
import { use } from "react";
import { RequestFormDetails } from "@/components/request-form-details";
import { AdminAssignmentPanel } from "@/components/admin-assignment-panel";

export default function AdminBookingDetailLayout({
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="space-y-5">
      <AdminAssignmentPanel params={params} />
      <RequestFormDetails id={id} />
    </div>
  );
}
