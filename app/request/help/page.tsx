"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Car,
  CheckCircle2,
  Clock3,
  ClipboardList,
  HelpCircle,
  Info,
  Mail,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Ticket,
  Timer,
  UserCheck,
} from "lucide-react";
import { BrandLogo, PublicFooter } from "@/components/brand";

/* ─── shared primitives ─────────────────────────────────── */

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
        {icon}
      </span>
      <h2 className="text-base font-bold text-ink">{children}</h2>
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: number;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">
        {number}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-ink text-sm">{title}</p>
        <p className="mt-0.5 text-sm leading-6 text-gray-500">{body}</p>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-line py-4 last:border-0">
      <p className="font-semibold text-sm text-ink">{question}</p>
      <p className="mt-1.5 text-sm leading-6 text-gray-500">{answer}</p>
    </div>
  );
}

function Badge({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: "gray" | "amber" | "blue" | "green" | "red";
}) {
  const colorMap: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    blue: "bg-brand-light text-brand border border-brand/20",
    green: "bg-success-light text-success border border-success/20",
    red: "bg-danger-light text-danger border border-danger/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colorMap[color]}`}
    >
      {children}
    </span>
  );
}

/* ─── page content ──────────────────────────────────────── */

function HelpContent() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");

  const backUrl =
    fromParam &&
    (fromParam.startsWith("/request/overtime") ||
      fromParam.startsWith("/request/car-service") ||
      fromParam.startsWith("/request"))
      ? fromParam
      : "/request";

  const workflow = [
    {
      label: "You submit",
      sub: "Request created",
      color: "bg-brand-light border-brand/30 text-brand",
      dot: "bg-brand",
    },
    {
      label: "Approver reviews",
      sub: "Dept. head approves",
      color: "bg-amber-50 border-amber-200 text-amber-700",
      dot: "bg-amber-400",
    },
    {
      label: "GA assigns",
      sub: "Vehicle & driver set",
      color: "bg-violet-light border-violet/30 text-violet",
      dot: "bg-violet",
    },
    {
      label: "Driver picks up",
      sub: "Trip completed",
      color: "bg-success-light border-success/30 text-success",
      dot: "bg-success",
    },
  ];

  const statusItems = [
    {
      label: "Pending approval",
      color: "amber" as const,
      desc: "Waiting for department approver",
    },
    {
      label: "Approved",
      color: "blue" as const,
      desc: "Approved, GA assigning vehicle",
    },
    {
      label: "Assigned",
      color: "green" as const,
      desc: "Vehicle & driver confirmed",
    },
    { label: "Completed", color: "gray" as const, desc: "Trip finished" },
    {
      label: "Rejected",
      color: "red" as const,
      desc: "Not approved — see reason",
    },
  ];

  const manageItems = [
    {
      icon: <Info size={14} />,
      text: "View current status and assigned vehicle / driver",
    },
    {
      icon: <ClipboardList size={14} />,
      text: "Edit trip details while the request is still pending",
    },
    {
      icon: <AlertTriangle size={14} />,
      text: "Cancel the request if your plans change",
    },
    {
      icon: <CheckCircle2 size={14} />,
      text: "Resubmit if the request was returned for correction",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      {/* Header — same pattern as PublicFrame */}
      <header className="border-b border-line bg-white px-4 sm:px-6 shadow-sm">
        <div className="mx-auto flex h-16 min-w-0 max-w-[1080px] items-center justify-between gap-3">
          <Link
            href={backUrl}
            className="flex min-w-0 items-center gap-3 sm:gap-4 transition-opacity hover:opacity-90"
            aria-label="Back to transport request"
          >
            <BrandLogo />
            <div className="hidden h-8 w-px bg-gray-200 sm:block" />
            <div>
              <p className="text-[15px] font-bold text-ink leading-tight">
                TOKIN Transport
              </p>
              <p className="hidden text-[11px] font-medium text-gray-500 sm:block">
                Employee transportation request
              </p>
            </div>
          </Link>
          <Link
            href={backUrl}
            className="flex items-center gap-1.5 shrink-0 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:border-gray-400 hover:bg-gray-50 hover:text-brand sm:px-3 sm:text-xs"
          >
            <ArrowLeft size={12} />
            Back to form
          </Link>
        </div>
      </header>

      <div className="mx-auto flex-1 min-w-0 max-w-[1080px] px-4 py-8 sm:px-6 sm:py-12 animate-fade-in">
        {/* Page heading */}
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            User guide
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl">
            Help &amp; How-to
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500 sm:text-base">
            Everything you need to know about submitting and tracking a
            transport request with TOKIN Transport.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {/* ── LEFT / MAIN column ── */}
          <div className="space-y-6 lg:col-span-2">
            {/* 1. Request types */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <SectionTitle icon={<Car size={16} />}>
                Request types &amp; when to use
              </SectionTitle>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* OT Transport */}
                <div className="rounded-lg border border-line bg-[#fafbfc] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-light text-brand">
                      <Clock3 size={15} />
                    </span>
                    <Badge color="amber">Cut-off 15:30</Badge>
                  </div>
                  <p className="font-bold text-ink text-sm">
                    Overtime Transport
                  </p>
                  <p className="text-xs text-gray-500 leading-5">
                    For employees staying late for approved OT or working on a
                    public holiday shift. One request per employee.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1.5 pt-1 border-t border-line">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-success shrink-0" />
                      Must submit OT in Tiger OpenSpace first
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-success shrink-0" />
                      Normal cut-off: 15:30 (Window closes 16:00)
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-success shrink-0" />
                      Drop-off at your usual bus stop / route
                    </li>
                  </ul>
                </div>

                {/* Car Service */}
                <div className="rounded-lg border border-line bg-[#fafbfc] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-light text-brand">
                      <Car size={15} />
                    </span>
                    <Badge color="blue">24h Advance Notice</Badge>
                  </div>
                  <p className="font-bold text-ink text-sm">
                    Off-site Business Transport
                  </p>
                  <p className="text-xs text-gray-500 leading-5">
                    For official off-site company travel (customer visits,
                    government offices, suppliers, inter-plant trips).
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1.5 pt-1 border-t border-line">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-success shrink-0" />
                      Submit at least 24 hours (1 working day) prior
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-success shrink-0" />
                      Requires Department Approver email approval
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-success shrink-0" />
                      Specify meeting point &amp; passenger details
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 2. Step-by-step submission guide */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <SectionTitle icon={<ClipboardList size={16} />}>
                How to submit a request (5 simple steps)
              </SectionTitle>

              <div className="space-y-5">
                <Step
                  number={1}
                  title="Select request type"
                  body="Choose 'Overtime Transport' for OT rides or 'Off-site Business Transport' for official business travel."
                />
                <Step
                  number={2}
                  title="Search & select your name from directory"
                  body="Type your English name in the 'Employee name' field and select your record from the dropdown. Your email, ID, and department will fill automatically."
                />
                <Step
                  number={3}
                  title="Fill trip details & approver"
                  body="For OT: select date, shift hours, and bus stop. For Off-site Business Transport: select travel date, hours, pickup/destination, purpose, and choose your Department Approver."
                />
                <Step
                  number={4}
                  title="Review & submit"
                  body="Click 'Review request', verify all information on the summary screen, then click 'Submit request'."
                />
                <Step
                  number={5}
                  title="Save your manage link & track vehicle"
                  body="Copy your unique Manage Link shown on the confirmation screen to check real-time status and assigned driver details."
                />
              </div>
            </section>

            {/* 3. Approval & Assignment Workflow */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <SectionTitle icon={<ShieldCheck size={16} />}>
                Approval &amp; vehicle assignment process
              </SectionTitle>

              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                {workflow.map((item, idx) => (
                  <div
                    key={item.label}
                    className={`rounded-lg border p-3 ${item.color} flex flex-col items-center justify-between text-center`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      Step 0{idx + 1}
                    </span>
                    <p className="mt-1.5 font-bold text-xs leading-tight">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[11px] opacity-80 leading-tight">
                      {item.sub}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3.5 text-xs text-blue-900 space-y-2">
                <p className="font-semibold flex items-center gap-1.5 text-sm">
                  <ShieldCheck size={15} className="text-brand shrink-0" />
                  Dual Verification &amp; Approval System
                </p>
                <div className="grid gap-2 sm:grid-cols-2 pt-1">
                  <div className="rounded border border-blue-200/60 bg-white/70 p-2.5">
                    <p className="font-bold text-ink text-xs">Off-site Business Transport</p>
                    <p className="mt-1 text-slate-600 leading-normal">
                      A 1-click approval email is sent directly to your selected Department Approver. GA assigns vehicles after manager approval.
                    </p>
                  </div>
                  <div className="rounded border border-blue-200/60 bg-white/70 p-2.5">
                    <p className="font-bold text-ink text-xs">Overtime Transport</p>
                    <p className="mt-1 text-slate-600 leading-normal">
                      Transport-only booking. GA verifies your approved hours against the <strong>Tiger OpenSpace</strong> report before van dispatch.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. FAQ */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <SectionTitle icon={<HelpCircle size={16} />}>
                Frequently Asked Questions (FAQ)
              </SectionTitle>

              <div className="divide-y divide-line">
                <FaqItem
                  question="What if I cannot find my name in the employee directory?"
                  answer="You can manually type your English full name, company email, 7-digit employee ID, and department in the form fields."
                />
                <FaqItem
                  question="Do I need to submit OT in Tiger OpenSpace before requesting transport?"
                  answer="Yes, transport requests for overtime are cross-verified against Tiger OpenSpace approved reports by HR/GA. You may submit this transport booking immediately, and GA will verify records prior to vehicle dispatch."
                />
                <FaqItem
                  question="What is the daily cutoff time for OT transport requests?"
                  answer="Standard requests should be submitted by 15:30 Thailand time to enter normal batch planning. Submissions between 15:30–16:00 are allocated subject to available van capacity, and the window closes at 16:00."
                />
                <FaqItem
                  question="How far in advance should I request off-site business transport?"
                  answer="Off-site business transport requests should be submitted at least 24 hours (1 working day) in advance to allow GA to allocate fleet vehicles and schedule drivers."
                />
                <FaqItem
                  question="Who approves my off-site business transport request?"
                  answer="Select your active Department Manager/Approver from the directory search in the form. An email notification with a 1-click approval button will be sent to them directly."
                />
                <FaqItem
                  question="Can I edit or cancel my request after submitting?"
                  answer="Yes. Open your unique Manage Request link (or find it in your confirmation email) to edit details or cancel before the cutoff time."
                />
                <FaqItem
                  question="How do I know which driver or vehicle was assigned to me?"
                  answer="Once GA assigns a vehicle, you will receive an email notification. You can also view the driver's name, phone number, and vehicle license plate on your Manage Request page."
                />
                <FaqItem
                  question="Why does my OT request say 'Waiting for HR/GA verification'?"
                  answer="This is normal for Tiger OpenSpace OT requests. GA verifies OT hours against the daily Tiger OpenSpace report before finalizing vehicle dispatch."
                />
              </div>
            </section>
          </div>

          {/* ── RIGHT Sidebar ── */}
          <div className="space-y-6 lg:col-span-1">
            {/* Status Guide */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-card">
              <p className="font-bold text-ink text-sm mb-3">
                Request Status Guide
              </p>
              <div className="space-y-2.5 text-xs">
                {statusItems.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-start justify-between gap-2 border-b border-line pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <Badge color={s.color}>{s.label}</Badge>
                      <p className="mt-1 text-gray-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Management */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-card">
              <p className="font-bold text-ink text-sm mb-3">
                Managing Your Request
              </p>
              <div className="space-y-3">
                {manageItems.map((m, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-0.5 text-brand shrink-0">
                      {m.icon}
                    </span>
                    <span className="text-gray-600 leading-5">{m.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Rules Card */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-xs space-y-2 text-amber-950">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <Timer size={14} />
                Key Operating Rules
              </p>
              <ul className="space-y-1.5 leading-5 text-amber-900/90 list-disc pl-4">
                <li><strong>OT:</strong> Submit by 15:30 (Closes 16:00)</li>
                <li><strong>OT:</strong> Submit in Tiger OpenSpace first</li>
                <li><strong>Off-site transport:</strong> 24-hr advance notice</li>
                <li><strong>Off-site transport:</strong> Manager email approval</li>
                <li>Save your Manage Link to track driver &amp; vehicle</li>
              </ul>
            </div>

            {/* GA Admin Portal / Contact */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-card space-y-3">
              <p className="font-bold text-ink text-sm">Need Further Assistance?</p>
              <p className="text-xs text-gray-500 leading-5">
                Contact General Affairs (GA) for urgent fleet management or special transport requests.
              </p>
              <a
                href="https://outlook.office.com/mail/deeplink/compose?to=Treebuppha.Saraphan@yageo.com&subject=TOKIN%20Transport%20Inquiry"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
              >
                <Mail size={14} />
                Contact GA Admin (Email)
              </a>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}

export default function HelpPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-canvas p-4 text-center">
          <p className="text-sm text-gray-500">Loading user guide…</p>
        </main>
      }
    >
      <HelpContent />
    </Suspense>
  );
}
