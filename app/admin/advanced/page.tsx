"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminEmailTestPanel } from "@/components/admin-email-test-panel";
import { AdminEmailHistory } from "@/components/admin-email-history";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

type ActiveTab = "all" | "history" | "test";

function AdminAdvancedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as ActiveTab | null;

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    tabParam === "history" || tabParam === "test" ? tabParam : "all"
  );

  useEffect(() => {
    if (tabParam === "history" || tabParam === "test") {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab("all");
    }
  }, [tabParam]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const newUrl = tab === "all" ? "/admin/advanced" : `/admin/advanced?tab=${tab}`;
    router.replace(newUrl, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Advanced Tools"
        description="Administrator operations, email delivery verification, and notification test suite."
      />

      {/* Clean Tabs navigation bar */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={cn(
              "whitespace-nowrap pb-3 text-sm transition-all border-b-2",
              activeTab === "all"
                ? "border-brand-600 text-brand-700 font-semibold"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 font-medium"
            )}
          >
            All Tools
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("history")}
            className={cn(
              "whitespace-nowrap pb-3 text-sm transition-all border-b-2",
              activeTab === "history"
                ? "border-brand-600 text-brand-700 font-semibold"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 font-medium"
            )}
          >
            Created Emails History
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("test")}
            className={cn(
              "whitespace-nowrap pb-3 text-sm transition-all border-b-2",
              activeTab === "test"
                ? "border-brand-600 text-brand-700 font-semibold"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 font-medium"
            )}
          >
            Send Test Email
          </button>
        </nav>
      </div>

      <div className="space-y-6">
        {(activeTab === "all" || activeTab === "test") && (
          <AdminEmailTestPanel initialOpen={activeTab === "test"} />
        )}
        {(activeTab === "all" || activeTab === "history") && (
          <AdminEmailHistory />
        )}
      </div>
    </>
  );
}

export default function AdminAdvancedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-32 items-center justify-center text-sm text-slate-500">
          Loading operational tools...
        </div>
      }
    >
      <AdminAdvancedContent />
    </Suspense>
  );
}
