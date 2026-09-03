"use client";

import { AdminEmailTestPanel } from "@/components/admin-email-test-panel";
import { PageHeader } from "@/components/page-header";

export default function AdminAdvancedPage() {
  return <>
    <PageHeader title="Advanced" description="Administrator testing and operational tools." />
    <AdminEmailTestPanel />
  </>;
}
