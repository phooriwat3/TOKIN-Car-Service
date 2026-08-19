"use client";

import Link from "next/link";
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
import { BrandLogo } from "@/components/brand";

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

/* ─── page ──────────────────────────────────────────────── */

export default function HelpPage() {
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
    <main className="min-h-screen bg-canvas">
      {/* Header — same pattern as PublicFrame */}
      <header className="border-b border-line bg-white px-4 sm:px-6 shadow-sm">
        <div className="mx-auto flex h-16 min-w-0 max-w-[1080px] items-center justify-between gap-3">
          <Link
            href="/request"
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
            href="/request"
            className="flex items-center gap-1.5 shrink-0 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:border-gray-400 hover:bg-gray-50 hover:text-brand sm:px-3 sm:text-xs"
          >
            <ArrowLeft size={12} />
            Back to form
          </Link>
        </div>
      </header>

      <div className="mx-auto min-w-0 max-w-[1080px] px-4 py-8 sm:px-6 sm:py-12 animate-fade-in">
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
                Types of transport requests
              </SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-[#f8fafc] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock3 size={15} className="text-brand shrink-0" />
                    <p className="text-sm font-bold text-ink">
                      Overtime / Holiday work
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-gray-500">
                    For employees who work{" "}
                    <strong>overtime (OT) or on a public holiday</strong> and
                    need transport home. Submit before{" "}
                    <strong>16:00 Thailand time</strong> on the day you plan to
                    work.
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    <Timer size={11} /> Deadline: 16:00 same day
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-[#f8fafc] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Car size={15} className="text-brand shrink-0" />
                    <p className="text-sm font-bold text-ink">
                      Car Service Requisition
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-gray-500">
                    For{" "}
                    <strong>business travel outside company premises</strong> —
                    client visits, meetings, government offices, etc. A company
                    vehicle and driver will be assigned.
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 rounded bg-brand-light border border-brand/20 px-2 py-1 text-[11px] font-semibold text-brand">
                    <MapPin size={11} /> Off-site trips only
                  </p>
                </div>
              </div>
            </section>

            {/* 2. How to submit */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <SectionTitle icon={<ClipboardList size={16} />}>
                How to submit a request
              </SectionTitle>
              <div className="space-y-5">
                <Step
                  number={1}
                  title="Choose the request type"
                  body='On the home screen, select "Overtime / Holiday work" or "Car Service Requisition" depending on your trip.'
                />
                <Step
                  number={2}
                  title="Fill in your details"
                  body="Search your name in the company directory, confirm your employee number, company email, and department."
                />
                <Step
                  number={3}
                  title="Enter trip information"
                  body="Provide the date, time, pickup and destination. For OT, also confirm you have submitted the request in Tiger Space."
                />
                <Step
                  number={4}
                  title="Review and confirm"
                  body='Check your details in the confirmation dialog, then click "Confirm & submit". No sign-in is required.'
                />
                <Step
                  number={5}
                  title="Save your tracking link"
                  body="After submitting you will receive a unique management link. Save it to view status, edit, or cancel your request later."
                />
              </div>
              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-success/20 bg-success-light px-4 py-3">
                <ShieldCheck
                  size={15}
                  className="mt-0.5 shrink-0 text-success"
                />
                <p className="text-xs leading-5 text-gray-700">
                  <strong>No account needed.</strong> The form is open to all
                  TOKIN employees using a company email address.
                </p>
              </div>
            </section>

            {/* 3. Approval workflow */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <SectionTitle icon={<UserCheck size={16} />}>
                Approval workflow
              </SectionTitle>
              <div className="overflow-x-auto -mx-1">
                <div className="flex min-w-[480px] items-stretch gap-0 px-1 py-2">
                  {workflow.map((node, i) => (
                    <div key={i} className="flex flex-1 items-center">
                      <div
                        className={`flex-1 rounded-lg border px-3 py-3 text-center ${node.color}`}
                      >
                        <span
                          className={`mx-auto mb-1.5 block h-2 w-2 rounded-full ${node.dot}`}
                        />
                        <p className="text-[11px] font-bold leading-tight">
                          {node.label}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight opacity-70">
                          {node.sub}
                        </p>
                      </div>
                      {i < workflow.length - 1 && (
                        <div className="w-4 shrink-0 flex items-center justify-center">
                          <div className="h-px w-full bg-gray-300" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-gray-500">
                You will receive an <strong>email notification</strong> when the
                status changes. The assigned vehicle and driver details are sent
                once GA completes the assignment.
              </p>
            </section>

            {/* 4. Manage your request */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <SectionTitle icon={<Ticket size={16} />}>
                Managing your request
              </SectionTitle>
              <p className="text-sm leading-6 text-gray-500 mb-4">
                After submitting, you receive a{" "}
                <strong>secure management link</strong> unique to your request.
                Use it to:
              </p>
              <ul className="space-y-2.5">
                {manageItems.map(({ icon, text }, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-gray-600"
                  >
                    <span className="mt-0.5 shrink-0 text-brand">{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-4 py-3">
                <AlertTriangle
                  size={15}
                  className="mt-0.5 shrink-0 text-danger"
                />
                <p className="text-xs leading-5 text-gray-700">
                  <strong>Keep your link private.</strong> Anyone with the
                  management link can view and modify your request. Do not share
                  it publicly.
                </p>
              </div>
            </section>

            {/* 5. FAQ */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <SectionTitle icon={<HelpCircle size={16} />}>
                Frequently asked questions
              </SectionTitle>
              <div>
                <FaqItem
                  question="Do I need a company account to submit?"
                  answer="No. The request form is publicly accessible to all TOKIN employees. You only need your company email address to submit."
                />
                <FaqItem
                  question="What is Tiger Space and why must I confirm it?"
                  answer="Tiger Space is the company's HR overtime tracking system. OT transport requests are only valid if the overtime has been formally recorded there. The checkbox confirms you have done this before requesting transport."
                />
                <FaqItem
                  question="What happens if I miss the 16:00 OT submission deadline?"
                  answer="The form will block submission after 16:00. Contact your department approver or the General Affairs (GA) team directly for late arrangements."
                />
                <FaqItem
                  question="Can I submit on behalf of someone else?"
                  answer="For OT transport, each employee must submit their own request and confirm it is for themselves. For car service requisitions, a manager or secretary may submit on behalf of staff if needed."
                />
                <FaqItem
                  question="How long does approval take?"
                  answer="Department approvers receive an email immediately after submission. Approval time varies by department — typically within a few hours on the same business day."
                />
                <FaqItem
                  question="I lost my management link. What do I do?"
                  answer="Check your submission confirmation email — the link is included there. If you cannot find it, contact the GA team with your request number."
                />
                <FaqItem
                  question="Can I change my request after submitting?"
                  answer="Yes, while the status is still 'Pending approval' you can edit details using your management link. Once approved or assigned, contact the GA team for changes."
                />
              </div>
            </section>
          </div>

          {/* ── RIGHT sidebar ── */}
          <div className="space-y-5 lg:sticky lg:top-6">
            {/* Status legend */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-card">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                Request status guide
              </p>
              <ul className="space-y-3">
                {statusItems.map(({ label, color, desc }) => (
                  <li key={label} className="flex flex-col gap-0.5">
                    <Badge color={color}>{label}</Badge>
                    <p className="text-[11px] text-gray-400 pl-1">{desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key rules */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-card">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                Key rules
              </p>
              <ul className="space-y-2.5">
                {[
                  "OT requests must be submitted before 16:00",
                  "OT must be recorded in Tiger Space first",
                  "Use your 7-digit employee number",
                  "Use your TOKIN company email (@yageo.com)",
                  "Car service is for off-site business trips only",
                ].map((rule) => (
                  <li
                    key={rule}
                    className="flex items-start gap-2 text-xs leading-5 text-gray-600"
                  >
                    <CheckCircle2
                      size={13}
                      className="mt-0.5 shrink-0 text-brand"
                    />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-card">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                Need more help?
              </p>
              <p className="text-xs leading-5 text-gray-500 mb-3">
                Contact the General Affairs (GA) team for urgent issues or if
                you cannot find the answer above.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail size={13} className="shrink-0 text-brand" />
                  <a
                    href="mailto:Treebuppha.Saraphan@yageo.com?subject=TOKIN%20Transport%20Inquiry"
                    className="hover:underline hover:text-brand transition-colors break-all"
                  >
                    Treebuppha.Saraphan@yageo.com
                  </a>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-600">
                  <PhoneCall size={13} className="shrink-0 text-brand" />
                  <span>Internal extension (GA desk)</span>
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-gray-400">
                Office hours: Mon–Fri 08:00–17:00
              </p>
            </div>

            {/* Back CTA */}
            <Link
              href="/request"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-btn transition hover:bg-brand-dark"
            >
              <ArrowLeft size={15} />
              Back to request form
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-line bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1080px] flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-gray-400">
            TOKIN Industrial — Internal transport service
          </p>
          <p className="text-xs text-gray-400">
            For system issues contact the IT Helpdesk
          </p>
        </div>
      </footer>
    </main>
  );
}
