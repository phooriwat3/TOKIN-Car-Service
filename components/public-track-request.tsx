"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, MailSearch, ShieldCheck } from "lucide-react";
import { PublicFrame } from "@/components/public-request-form";
import { Button, Input } from "@/components/ui";
import { extractManageToken } from "@/lib/request-tracking";
import { TransportBookingHero } from "@/components/transport-booking-ui";

export default function PublicTrackRequest() {
  const router = useRouter();
  const [secureLink, setSecureLink] = useState("");
  const [error, setError] = useState("");

  const openRequest = (event: React.FormEvent) => {
    event.preventDefault();
    const token = extractManageToken(secureLink);
    if (!token) {
      setError("Paste the complete secure management link from your company email or Teams message. A request number alone cannot open private details.");
      return;
    }
    setError("");
    router.push(`/request/manage?token=${encodeURIComponent(token)}`);
  };

  return (
    <PublicFrame>
      <div className="mx-auto max-w-5xl space-y-5">
        <TransportBookingHero
          eyebrow="TOKIN employee transport"
          title="Track your booking"
          description="Use the secure link from your latest company email or Teams message to see live progress and available actions."
          serviceLabel="Request tracking"
          origin="Company email or Teams"
          destination="Live request details"
          date="Secure access"
          time="Available anytime"
        />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <MailSearch size={23} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                  Secure ticket access
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Open your transport request</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  View the current status, next action, and editable request details.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={openRequest} className="px-5 py-6 sm:px-7">
            <label htmlFor="secure-request-link" className="text-sm font-bold text-slate-900">
              Secure management link
            </label>
            <p id="secure-link-help" className="mt-1 text-xs leading-5 text-slate-500">
              Copy the complete link from the confirmation, approval-status, or assignment message sent to your company account.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Input
                id="secure-request-link"
                value={secureLink}
                onChange={(event) => setSecureLink(event.target.value)}
                placeholder="Paste secure link here"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="secure-link-help"
                aria-invalid={Boolean(error)}
                className="min-w-0 flex-1"
              />
              <Button type="submit" className="shrink-0 sm:min-w-36">
                Open request <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </div>
            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
                {error}
              </p>
            )}
            <div className="mt-5 flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
              <ShieldCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
              <p>
                The secure link protects employee and trip information. Request numbers are safe to share with GA, but cannot be used alone to access a request.
              </p>
            </div>
          </form>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <KeyRound className="text-brand-600" size={24} aria-hidden="true" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Cannot find your link?</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <li><strong className="text-slate-800">1.</strong> Search your company email and Teams for your request number.</li>
            <li><strong className="text-slate-800">2.</strong> Open the newest TOKIN Transport message.</li>
            <li><strong className="text-slate-800">3.</strong> Use its View or Manage request button.</li>
          </ol>
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            If the link expired or the message was not delivered, contact GA and provide your request number. Never send the secure link to another person.
          </p>
          <Link href="/request" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700">
            Create a new request <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </aside>
      </div>
      </div>
    </PublicFrame>
  );
}
