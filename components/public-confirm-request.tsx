"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { PublicFrame } from "@/components/public-request-form";
import { Button } from "@/components/ui";
import {
  BookingJourney,
  DigitalTransportTicket,
  TransportBookingHero,
} from "@/components/transport-booking-ui";

type Confirmation = {
  requestNo: string;
  status: string;
  manageUrl: string;
  alreadyConfirmed?: boolean;
};

export default function PublicConfirmRequest({
  initialToken,
}: {
  initialToken?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(
    initialToken ? "" : "The confirmation link is missing.",
  );
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const confirm = async () => {
    if (!initialToken || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !publishableKey)
        throw new Error("Confirmation service is not configured.");

      const response = await fetch(
        `${supabaseUrl}/functions/v1/public-confirm-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: publishableKey,
          },
          body: JSON.stringify({ token: initialToken }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.error || "Unable to confirm this request.");
      setConfirmation(body as Confirmation);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to confirm request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <PublicFrame>
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-950">
            <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={21} />
            <div>
              <h1 className="font-bold">
                {confirmation.alreadyConfirmed
                  ? "This booking was already confirmed"
                  : "Your booking is confirmed"}
              </h1>
              <p className="mt-0.5 text-sm text-emerald-800">
                It can now continue through company approval and GA planning.
              </p>
            </div>
          </div>
          <DigitalTransportTicket
            requestNo={confirmation.requestNo}
            serviceLabel="TOKIN employee transport"
            statusLabel="Confirmed"
            origin="Requester confirmation"
            destination="Approval / verification queue"
            footer={
              <a
                href={confirmation.manageUrl}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white shadow-btn hover:bg-brand-dark"
              >
                View and manage booking
              </a>
            }
          >
            <p className="text-sm leading-6 text-slate-600">
              This verified link is your secure way to view status, edit trip
              details, or cancel the request when the workflow permits.
            </p>
            <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs text-blue-900">
              Do not forward the management link. It provides access to your request.
            </p>
          </DigitalTransportTicket>
        </div>
      </PublicFrame>
    );
  }

  return (
    <PublicFrame>
      <div className="mx-auto max-w-4xl space-y-5">
        <TransportBookingHero
          eyebrow="TOKIN employee transport"
          title="Confirm your booking"
          description="Verify that you created this request, then send it into the company approval or OT verification workflow."
          serviceLabel="Secure confirmation"
          origin="Submitted request"
          destination="Approval queue"
          date="One-click verification"
          time="Secure company link"
        />
        <BookingJourney
          activeStep={2}
          steps={[
            { label: "Request submitted", complete: true },
            { label: "Confirm booking" },
            { label: "Approval & planning" },
          ]}
        />
      <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-card sm:p-9">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-light text-brand">
            <MailCheck size={23} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
              Email verification
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink">
              Confirm your transport request
            </h1>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600">
          Confirm only if you submitted this request. The request will enter
          the appropriate approval or OT verification queue after confirmation.
        </p>
        <div className="mt-5 flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} />
          <span>This link verifies access to the company email or Teams message that received it.</span>
        </div>
        {error && (
          <div role="alert" className="mt-5 rounded-lg border border-danger/20 bg-danger-light p-4 text-sm text-danger">
            {error}
          </div>
        )}
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          onClick={confirm}
          disabled={!initialToken || submitting}
        >
          {submitting ? "Confirming..." : "Confirm request"}
        </Button>
        <Link href="/request" className="mt-4 block text-center text-sm font-semibold text-slate-500 hover:text-brand">
          Return to request form
        </Link>
      </section>
      </div>
    </PublicFrame>
  );
}
