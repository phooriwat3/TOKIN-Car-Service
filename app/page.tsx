import Link from "next/link";
import {
  ArrowRight,
  Car,
  Clock3,
  HelpCircle,
  Search,
  ShieldCheck,
  Building2,
  FileCheck2,
} from "lucide-react";
import { BrandLogo, PublicFooter } from "@/components/brand";

export const metadata = {
  title: "TOKIN Transport System | Employee Transportation & Fleet Management",
  description:
    "Official TOKIN Electronics Thailand portal for overtime transportation requests, car service requisitions, and fleet management.",
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      {/* Navigation Header */}
      <header className="border-b border-line bg-white px-4 sm:px-6 shadow-sm">
        <div className="mx-auto flex h-16 min-w-0 max-w-[1080px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <BrandLogo />
            <div className="hidden h-8 w-px bg-gray-200 sm:block" />
            <div>
              <p className="text-[15px] font-bold text-ink leading-tight">
                TOKIN Transport
              </p>
              <p className="hidden text-[11px] font-medium text-gray-500 sm:block">
                Internal Operations — Transport &amp; Fleet Management
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/request/help"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand"
            >
              <HelpCircle size={15} />
              <span className="hidden sm:inline">User Guide &amp; Help</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="mx-auto flex-1 min-w-0 max-w-[1080px] px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-8">
          {/* Hero Banner */}
          <div className="rounded-2xl border border-line bg-gradient-to-br from-[#102d44] via-[#1a3d5a] to-[#0d2335] p-6 text-white shadow-xl sm:p-10">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-light backdrop-blur border border-white/15">
                <Building2 size={13} />
                TOKIN Electronics (Thailand) Co., Ltd.
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-4xl text-white">
                TOKIN Transport System
              </h1>
              <p className="text-sm leading-6 text-slate-300 sm:text-base">
                Welcome to the employee transportation and fleet requisition portal. Select a service below to submit an OT ride request, book a company vehicle for business travel, or track your existing request.
              </p>
            </div>
          </div>

          {/* Quick Action Cards Grid */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
                Select Service
              </h2>
              <span className="text-xs text-gray-500">
                Choose a request type to continue
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Card 1: Overtime / Holiday Work */}
              <Link
                href="/request/overtime"
                className="group flex min-w-0 flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg sm:p-7"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:h-14 sm:w-14">
                      <Clock3 size={24} />
                    </span>
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-700">
                      Submit by 16:00
                    </span>
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-brand">
                    Daily Employee Transport
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-ink">
                    OVERTIME / HOLIDAY WORK
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Individual transportation request for employees working overtime or on a public holiday shift. Verified automatically via Tiger Space.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-brand border-t border-line pt-4">
                  <span>Start OT Ride Request</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>

              {/* Card 2: Car Service Requisition */}
              <Link
                href="/request/car-service"
                className="group flex min-w-0 flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg sm:p-7"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:h-14 sm:w-14">
                      <Car size={24} />
                    </span>
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700">
                      Off-Site Travel
                    </span>
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-brand">
                    Business Travel
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-ink">
                    CAR SERVICE REQUISITION
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Company vehicle and driver request for official business travel outside company premises. Emailed directly to your designated approver.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-brand border-t border-line pt-4">
                  <span>Book Business Vehicle</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>

              {/* Card 3: Track My Request */}
              <Link
                href="/request/manage"
                className="group flex min-w-0 flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg sm:p-7"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white sm:h-14 sm:w-14">
                      <Search size={24} />
                    </span>
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-700">
                      Request Lookup
                    </span>
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                    Self Service
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-ink">
                    TRACK MY REQUEST
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Check your request approval status, assigned driver details, vehicle license plate, or cancel your submitted request.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-slate-800 border-t border-line pt-4">
                  <span>Check Status &amp; Driver Details</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>

              {/* Card 4: User Guide & Help */}
              <Link
                href="/request/help"
                className="group flex min-w-0 flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg sm:p-7"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white sm:h-14 sm:w-14">
                      <FileCheck2 size={24} />
                    </span>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700">
                      Help Center
                    </span>
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                    Documentation
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-ink">
                    USER GUIDE &amp; FAQ
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Learn how the transport system works, step-by-step submission guides, approval workflows, key rules, and GA contact info.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 border-t border-line pt-4">
                  <span>View Guide &amp; Support Info</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}
