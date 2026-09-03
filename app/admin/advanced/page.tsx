"use client";

import { AdminEmailTestPanel } from "@/components/admin-email-test-panel";
import { AdminEmailHistory } from "@/components/admin-email-history";
import { PageHeader } from "@/components/page-header";

export default function AdminAdvancedPage() {
  return <>
    <PageHeader title="Advanced" description="Administrator testing and operational tools." />
    <div className="space-y-6"><AdminEmailTestPanel /><AdminEmailHistory /></div>
  </>;
}
