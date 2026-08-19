"use client";
import { formatUsDate } from "@/lib/date-format";

import { Check, Clock3 } from "lucide-react";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  TimeMaskInput,
} from "@/components/ui";
import {
  CompanyUserField,
  type CompanyUser,
} from "@/components/company-user-field";
import type { OvertimeEmployee } from "@/lib/types";
import { overtimeDuration } from "@/lib/overtime";
import {
  OT_NORMAL_REQUEST_CUTOFF,
  OT_REQUEST_END,
  OT_REQUEST_START,
  bangkokTime,
} from "@/lib/request-window";

const DEPARTMENTS = [
  "MD",
  "HR",
  "SUST",
  "FA",
  "PLN",
  "PROC",
  "PE",
  "IT",
  "EE",
  "FAC",
  "QA",
  "TA MFG",
  "SC",
  "TE",
];

export type RequesterField = "name" | "email" | "employeeId" | "department";

export type PublicOvertimeRequestFormProps = {
  requesterName: string;
  requesterEmail: string;
  employeeId: string;
  department: string;
  directorySelected: boolean;
  confirmedSelf: boolean;
  tigerSpaceConfirmed: boolean;
  usingDate: string;
  employee: OvertimeEmployee;
  reviewing: boolean;
  submitting: boolean;
  error: string;
  errorField?: string;
  minimumDate: string;
  onRequesterChange: (field: RequesterField, value: string) => void;
  onDirectorySelect: (person: CompanyUser) => void;
  onConfirmedSelfChange: (value: boolean) => void;
  onTigerSpaceConfirmedChange: (value: boolean) => void;
  onUsingDateChange: (value: string) => void;
  onEmployeeChange: <K extends keyof OvertimeEmployee>(
    field: K,
    value: OvertimeEmployee[K],
  ) => void;
  onBackToType: () => void;
  onBackToEdit: () => void;
  onReset: () => void;
  onShowGuidelines: () => void;
  onConfirmSubmit: () => void;
};

export function PublicOvertimeRequestForm(
  props: PublicOvertimeRequestFormProps,
) {
  const duration = overtimeDuration(
    props.employee.workStart,
    props.employee.workEnd,
  );
  const employeeComplete = Boolean(
    props.requesterName.trim() &&
    props.requesterEmail.trim() &&
    props.employeeId.trim() &&
    props.department.trim() &&
    props.confirmedSelf,
  );
  const detailsComplete = Boolean(
    props.usingDate &&
    duration &&
    props.tigerSpaceConfirmed &&
    props.employee.busStop.trim(),
  );
  const activeStep = props.reviewing ? 3 : employeeComplete ? 2 : 1;

  if (props.reviewing) {
    return (
      <div className="space-y-5">
        <Progress
          activeStep={activeStep}
          employeeComplete={employeeComplete}
          detailsComplete={detailsComplete}
        />
        {props.error && (
          <ErrorSummary message={props.error} fieldId={props.errorField} />
        )}
        <section
          className="overflow-hidden rounded-lg border border-line bg-white"
          aria-labelledby="review-heading"
        >
          <div className="border-b border-line bg-[#f7f8fa] px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
              Step 3 of 3
            </p>
            <h2
              id="review-heading"
              className="mt-1 text-lg font-semibold text-ink"
            >
              Review and submit
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Confirm that the details below are correct before submission.
            </p>
          </div>
          <dl className="grid gap-x-8 gap-y-4 px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
            <Summary
              label="Employee"
              value={`${props.requesterName} (${props.employeeId})`}
            />
            <Summary label="Department" value={props.department} />
            <Summary label="Company email" value={props.requesterEmail} />
            <Summary
              label="OT source"
              value="Tiger Space (no duplicate OT approval)"
            />
            <Summary
              label="OT verification"
              value="Waiting for HR/GA verification"
            />
            <Summary
              label="OT / holiday work date"
              value={formatUsDate(props.usingDate)}
            />
            <Summary
              label="Work description"
              value={props.employee.workDescription.trim() || "Not provided"}
            />
            <Summary
              label="OT time"
              value={`${props.employee.workStart}–${props.employee.workEnd}`}
            />
            <Summary
              label="OT duration"
              value={duration ?? "Invalid time range"}
            />
            <Summary label="Transportation" value="Transportation required" />
            <Summary label="Drop-off location" value={props.employee.busStop} />
          </dl>
          <div className="flex flex-col-reverse gap-3 border-t border-line bg-[#fafbfc] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="secondary"
              disabled={props.submitting}
              onClick={props.onBackToEdit}
            >
              Back to edit
            </Button>
            <Button
              type="button"
              disabled={props.submitting}
              onClick={props.onConfirmSubmit}
            >
              {props.submitting ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Employee transportation request
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-[-0.02em] text-ink sm:text-[30px]">
            OVERTIME / HOLIDAY WORK
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500">
            Submit an individual transportation request for overtime or holiday
            work.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={props.onBackToType}
        >
          Change request type
        </Button>
      </div>

      <div className="grid gap-3 border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 shrink-0 text-amber-700" size={18} />
          <div>
            <p className="font-semibold">
              Submission window: {OT_REQUEST_START} until {OT_REQUEST_END}{" "}
              Thailand time
            </p>
            <p className="mt-0.5 text-xs leading-5 text-amber-800">
              Requests received by {OT_NORMAL_REQUEST_CUTOFF} enter the normal
              transport-planning batch. OT verification may continue after this
              cutoff. Current Thailand time: {bangkokTime()}.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={props.onShowGuidelines}
          className="min-h-10 justify-self-start text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950 sm:justify-self-end"
        >
          View OT rules
        </button>
      </div>

      <div className="border-l-[3px] border-brand bg-brand-light/60 px-4 py-3 text-sm text-gray-700">
        <p>
          <strong className="text-ink">Before you begin:</strong> Submit your OT
          request in Tiger Space, then submit this transport request for
          yourself. You do not need to wait for OT approval before requesting
          transport.
        </p>
      </div>

      <Progress
        activeStep={activeStep}
        employeeComplete={employeeComplete}
        detailsComplete={detailsComplete}
      />

      <section
        className="rounded-lg border border-line bg-white"
        aria-labelledby="employee-section-heading"
      >
        <SectionHeader
          step="1"
          title="Employee information"
          description="Search by your English name and select your company directory record."
          id="employee-section-heading"
        />
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
          <div>
            <CompanyUserField
              inputId="employee-search"
              label="Employee name"
              required
              value={props.requesterName}
              onChange={(value) => props.onRequesterChange("name", value)}
              placeholder="Start typing your English name"
              onSelectUser={props.onDirectorySelect}
              describedBy="employee-search-help"
            />
            {props.errorField === "employee-search" ? (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                ⚠️ {props.error}
              </p>
            ) : (
              <p
                id="employee-search-help"
                className="mt-1.5 text-xs text-gray-500"
              >
                Select your directory result to fill your employee details.
              </p>
            )}
          </div>
          <Field label="Company email">
            <Input
              id="company-email"
              required
              type="email"
              className={
                props.errorField === "company-email"
                  ? "border-danger ring-2 ring-danger/20"
                  : ""
              }
              value={props.requesterEmail}
              readOnly={
                props.directorySelected && Boolean(props.requesterEmail)
              }
              onChange={(event) =>
                props.onRequesterChange("email", event.target.value)
              }
            />
            {props.errorField === "company-email" && (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                ⚠️ {props.error}
              </p>
            )}
          </Field>
          <Field label="Employee number">
            <Input
              id="employee-number"
              required
              inputMode="numeric"
              maxLength={7}
              pattern="[0-9]{7}"
              className={
                props.errorField === "employee-number"
                  ? "border-danger ring-2 ring-danger/20"
                  : ""
              }
              placeholder="7-digit employee number"
              value={props.employeeId}
              onChange={(event) =>
                props.onRequesterChange(
                  "employeeId",
                  event.target.value.replace(/\D/g, "").slice(0, 7),
                )
              }
            />
            {props.errorField === "employee-number" && (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                ⚠️ {props.error}
              </p>
            )}
          </Field>
          <Field label="Department">
            <Select
              id="department"
              required
              className={
                props.errorField === "department"
                  ? "border-danger ring-2 ring-danger/20"
                  : ""
              }
              value={props.department}
              onChange={(event) =>
                props.onRequesterChange("department", event.target.value)
              }
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              {props.department && !DEPARTMENTS.includes(props.department) && (
                <option value={props.department}>{props.department}</option>
              )}
            </Select>
            {props.errorField === "department" ? (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                ⚠️ {props.error}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-500"></p>
            )}
          </Field>
          <div className="sm:col-span-2">
            <label
              className={`flex min-h-11 cursor-pointer items-start gap-3 border px-3.5 py-3 text-sm text-gray-700 transition-colors ${
                props.errorField === "confirm-self"
                  ? "border-danger bg-danger-light/40 text-danger ring-2 ring-danger/20"
                  : "border-line bg-[#fafbfc]"
              }`}
            >
              <input
                id="confirm-self"
                type="checkbox"
                checked={props.confirmedSelf}
                onChange={(event) =>
                  props.onConfirmedSelfChange(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
              />
              <span>
                <strong className="font-semibold text-ink">
                  I confirm that this request is for me.
                </strong>{" "}
                The employee information above will be used for approval and
                transportation notifications.
              </span>
            </label>
            {props.errorField === "confirm-self" && (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                ⚠️ {props.error}
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border border-line bg-white"
        aria-labelledby="ot-section-heading"
      >
        <SectionHeader
          step="2"
          title="OT and transportation details"
          description="Enter the Tiger Space OT schedule and the drop-off point for this transport request."
          id="ot-section-heading"
        />
        <div className="space-y-6 px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="OT / holiday work date">
              <Input
                id="using-date"
                required
                type="date"
                lang="en-US"
                className={
                  props.errorField === "using-date"
                    ? "border-danger ring-2 ring-danger/20"
                    : ""
                }
                min={props.minimumDate}
                value={props.usingDate}
                onChange={(event) =>
                  props.onUsingDateChange(event.target.value)
                }
              />
              {props.errorField === "using-date" && (
                <p className="mt-1.5 text-xs font-semibold text-danger">
                  ⚠️ {props.error}
                </p>
              )}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Work description (optional)">
                <Textarea
                  id="work-description"
                  className="min-h-24"
                  placeholder="Optional: briefly describe the overtime or holiday work"
                  value={props.employee.workDescription}
                  onChange={(event) =>
                    props.onEmployeeChange(
                      "workDescription",
                      event.target.value,
                    )
                  }
                />
              </Field>
            </div>
            <Field label="OT start time">
              <TimeMaskInput
                id="ot-start"
                required
                value={props.employee.workStart}
                onChange={(value) => props.onEmployeeChange("workStart", value)}
                quickTimes={["08:00", "17:20"]}
              />
              {props.errorField === "ot-start" && (
                <p className="mt-1.5 text-xs font-semibold text-danger">
                  ⚠️ {props.error}
                </p>
              )}
            </Field>
            <Field label="OT end time">
              <TimeMaskInput
                id="ot-end"
                required
                value={props.employee.workEnd}
                onChange={(value) => props.onEmployeeChange("workEnd", value)}
                quickTimes={["16:45", "19:00", "20:00"]}
              />
              {props.errorField === "ot-end" && (
                <p className="mt-1.5 text-xs font-semibold text-danger">
                  ⚠️ {props.error}
                </p>
              )}
            </Field>
          </div>
          <div className="flex items-center justify-between border-y border-line bg-[#fafbfc] px-3.5 py-3 text-sm">
            <span className="text-gray-600">Calculated OT duration</span>
            <strong className={duration ? "text-ink" : "text-danger"}>
              {duration ?? "Check the time range"}
            </strong>
          </div>

          <div
            className={`rounded-lg border p-4 text-sm transition-colors ${
              props.errorField === "tiger-space-confirmed"
                ? "border-danger bg-danger-light/40 text-danger ring-2 ring-danger/20"
                : "border-blue-200 bg-blue-50 text-blue-950"
            }`}
          >
            <p className="font-semibold">Transport request only</p>
            <p className="mt-1 text-xs leading-5 text-blue-800">
              Tiger Space remains the source of truth for OT. Submit this form
              only when you need transportation.
            </p>
            <label className="mt-3 flex items-start gap-2 cursor-pointer">
              <input
                id="tiger-space-confirmed"
                type="checkbox"
                checked={props.tigerSpaceConfirmed}
                onChange={(event) =>
                  props.onTigerSpaceConfirmedChange(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 accent-brand shrink-0"
              />
              <span>
                I confirm that I have submitted this OT in Tiger Space and I
                require transportation. The transport request will remain
                pending until HR/GA can verify the approved OT from the Tiger
                Space report.
              </span>
            </label>
            {props.errorField === "tiger-space-confirmed" && (
              <p className="mt-2 text-xs font-semibold text-danger">
                ⚠️ {props.error}
              </p>
            )}
          </div>

          <Field label="Drop-off location / bus stop">
            <Input
              id="drop-off-location"
              required
              className={
                props.errorField === "drop-off-location"
                  ? "border-danger ring-2 ring-danger/20"
                  : ""
              }
              placeholder="Enter your usual bus stop or drop-off point"
              value={props.employee.busStop}
              onChange={(event) =>
                props.onEmployeeChange("busStop", event.target.value)
              }
            />
            {props.errorField === "drop-off-location" && (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                ⚠️ {props.error}
              </p>
            )}
          </Field>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={props.submitting}
          onClick={props.onReset}
        >
          Reset form
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <p className="self-center text-xs text-gray-500">
            Review is required before submission.
          </p>
          <Button type="submit" disabled={props.submitting}>
            Review request
          </Button>
        </div>
      </div>
    </div>
  );
}

function Progress({
  activeStep,
  employeeComplete,
  detailsComplete,
}: {
  activeStep: number;
  employeeComplete: boolean;
  detailsComplete: boolean;
}) {
  const steps = [
    { label: "Employee information", complete: employeeComplete },
    { label: "OT and transportation", complete: detailsComplete },
    { label: "Review and submit", complete: false },
  ];
  return (
    <nav
      aria-label="Request progress"
      className="border-y border-line bg-white px-2 py-3 sm:px-4"
    >
      <ol className="grid grid-cols-3 gap-1">
        {steps.map((step, index) => {
          const number = index + 1;
          const active = number === activeStep;
          const complete = number < activeStep || step.complete;
          return (
            <li
              key={step.label}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 items-center gap-2 px-1 sm:px-3"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${active ? "border-brand bg-brand text-white" : complete ? "border-brand bg-brand-light text-brand" : "border-gray-300 bg-white text-gray-500"}`}
              >
                {complete && !active ? <Check size={13} /> : number}
              </span>
              <span
                className={`min-w-0 text-[11px] leading-4 sm:text-xs ${active ? "font-semibold text-ink" : "text-gray-500"}`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SectionHeader({
  step,
  title,
  description,
  id,
}: {
  step: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line bg-[#f7f8fa] px-5 py-4 sm:px-6">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#102d44] text-xs font-semibold text-white">
        {step}
      </span>
      <div>
        <h2 id={id} className="font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-0.5 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function QuickTime({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
      <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        Quick time
      </span>
      {options.map((time) => (
        <button
          key={time}
          type="button"
          onClick={() => onSelect(time)}
          className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          {time}
        </button>
      ))}
    </div>
  );
}
function RadioCard({
  checked,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex min-h-[76px] cursor-pointer gap-3 border p-3.5 transition-colors ${checked ? "border-brand bg-brand-light/60" : "border-gray-300 bg-white hover:border-gray-400"}`}
    >
      <input
        type="radio"
        name="transportation-required"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 shrink-0 accent-brand"
      />
      <span>
        <strong className="block text-sm font-semibold text-ink">
          {title}
        </strong>
        <span className="mt-1 block text-xs leading-5 text-gray-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 break-words font-medium text-ink">{value}</dd>
    </div>
  );
}

function ErrorSummary({
  message,
  fieldId,
}: {
  message: string;
  fieldId?: string;
}) {
  return (
    <div
      id="validation-summary"
      role="alert"
      tabIndex={-1}
      className="border-l-[3px] border-danger bg-danger-light px-4 py-3 text-sm text-danger"
    >
      <p className="font-semibold">Please correct the following issue</p>
      <p className="mt-1">{message}</p>
      {fieldId && (
        <button
          type="button"
          className="mt-2 font-semibold underline underline-offset-2"
          onClick={() => document.getElementById(fieldId)?.focus()}
        >
          Go to field
        </button>
      )}
    </div>
  );
}
