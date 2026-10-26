import { Check, Circle, CircleX, Clock3 } from "lucide-react";
import type { BookingStatus, RequestType } from "@/lib/types";
import {
  requestJourneySteps,
  requestStatusPresentation,
  type RequestStatusTone,
} from "@/lib/request-status";

const toneStyles: Record<RequestStatusTone, string> = {
  active: "border-blue-200 bg-blue-50 text-blue-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-rose-200 bg-rose-50 text-rose-950",
  neutral: "border-slate-200 bg-slate-50 text-slate-800",
};

export function RequestStatusTimeline({
  status,
  requestType,
}: {
  status: BookingStatus;
  requestType: RequestType;
}) {
  const presentation = requestStatusPresentation(status, requestType);
  const steps = requestJourneySteps(requestType);

  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
      aria-labelledby="request-progress-title"
    >
      <div className={`border-b px-4 py-4 sm:px-5 ${toneStyles[presentation.tone]}`}>
        <div className="flex items-start gap-3">
          {presentation.tone === "danger" ? (
            <CircleX className="mt-0.5 shrink-0" size={21} aria-hidden="true" />
          ) : presentation.terminal ? (
            <Check className="mt-0.5 shrink-0" size={21} aria-hidden="true" />
          ) : (
            <Clock3 className="mt-0.5 shrink-0" size={21} aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">
              Current status
            </p>
            <h2 id="request-progress-title" className="mt-0.5 text-base font-bold">
              {presentation.label}
            </h2>
            <p className="mt-1 text-sm leading-5 opacity-80">{presentation.summary}</p>
          </div>
        </div>
      </div>

      <ol className="grid gap-0 px-4 py-5 sm:grid-cols-4 sm:px-5" aria-label="Request progress">
        {steps.map((step, index) => {
          const complete = index < presentation.currentStep;
          const current = index === presentation.currentStep && !presentation.terminal;
          const stopped = presentation.terminal && presentation.tone === "danger" && index === presentation.currentStep;
          return (
            <li
              key={step.title}
              className="relative flex min-w-0 gap-3 pb-5 last:pb-0 sm:block sm:pb-0 sm:pr-3"
              aria-current={current ? "step" : undefined}
            >
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 sm:left-6 sm:right-0 sm:top-[11px] sm:h-0.5 sm:w-auto ${
                    complete ? "bg-brand-500" : "bg-slate-200"
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 sm:mb-3 ${
                  stopped
                    ? "border-rose-600 bg-rose-600 text-white"
                    : complete
                      ? "border-brand-500 bg-brand-500 text-white"
                      : current
                        ? "border-brand-500 bg-white text-brand-600"
                        : "border-slate-300 bg-white text-slate-300"
                }`}
              >
                {stopped ? <CircleX size={13} /> : complete ? <Check size={13} /> : <Circle size={10} fill="currentColor" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-xs font-bold ${current ? "text-brand-700" : complete ? "text-slate-800" : "text-slate-400"}`}>
                  {step.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                  {step.description}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:px-5">
        <strong className="text-slate-900">Your next step:</strong>{" "}
        {presentation.nextAction}
      </div>
    </section>
  );
}
