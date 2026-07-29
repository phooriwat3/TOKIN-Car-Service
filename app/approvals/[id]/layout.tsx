"use client";
import { use } from "react";
import { RequestFormDetails } from "@/components/request-form-details";

export default function ApprovalDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="space-y-5">
      {children}
      <RequestFormDetails id={id} />
    </div>
  );
}
