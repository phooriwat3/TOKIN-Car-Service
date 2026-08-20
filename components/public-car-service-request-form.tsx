"use client";

import { formatUsDate } from "@/lib/date-format";
import { Car, Check, Clock3, MapPin, ShieldCheck, UserCheck } from "lucide-react";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  CompanyUserField,
  type CompanyUser,
} from "@/components/company-user-field";
import { GoogleMapLinks } from "@/components/google-map-links";

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
export type ApproverField = "name" | "email";

export type PublicCarServiceRequestFormProps = {
  requesterName: string;
  requesterEmail: string;
  employeeId: string;
  department: string;
  directorySelected: boolean;
  confirmedSelf: boolean;
  approverName: string;
  approverEmail: string;
  approverDirectorySelected: boolean;
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  meetingPoint: "front_area" | "loading_area";
  withStaff: boolean;
  passengers: string;
  reviewing: boolean;
  submitting: boolean;
  error: string;
  errorField?: string;
  minimumDate: string;
  onRequesterChange: (field: RequesterField, value: string) => void;
  onDirectorySelect: (person: CompanyUser) => void;
  onConfirmedSelfChange: (value: boolean) => void;
  onApproverChange: (field: ApproverField, value: string) => void;
  onApproverDirectorySelect: (person: CompanyUser) => void;
  onUsingDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onPickupLocationChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onMeetingPointChange: (value: "front_area" | "loading_area") => void;
  onWithStaffChange: (value: boolean) => void;
  onPassengersChange: (value: string) => void;
  onBackToType: () => void;
  onBackToEdit: () => void;
  onReset: () => void;
  onShowGuidelines?: () => void;
  onProceedToReview: () => void;
  onConfirmSubmit: () => void;
};

export function PublicCarServiceRequestForm(
  props: PublicCarServiceRequestFormProps,
) {
  const employeeComplete = Boolean(
    props.requesterName.trim() &&
      props.requesterEmail.trim() &&
      props.employeeId.trim() &&
      props.department.trim() &&
      props.approverName.trim() &&
      props.approverEmail.trim() &&
      props.confirmedSelf,
  );

  const detailsComplete = Boolean(
    props.usingDate &&
      props.startTime &&
      props.endTime &&
      props.pickupLocation.trim() &&
      props.destination.trim() &&
      props.purpose.trim(),
  );

  const activeStep = props.reviewing ? 3 : employeeComplete ? 2 : 1;

  if (props.reviewing) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Progress
          activeStep={activeStep}
          employeeComplete={employeeComplete}
          detailsComplete={detailsComplete}
        />
        {props.error && (
          <ErrorSummary message={props.error} fieldId={props.errorField} />
        )}
        <section
          className="overflow-hidden rounded-lg border border-line bg-white shadow-card"
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
              label="Requester"
              value={`${props.requesterName} (${props.employeeId})`}
            />
            <Summary label="Department" value={props.department} />
            <Summary label="Company email" value={props.requesterEmail} />
            <Summary
              label="Approver"
              value={`${props.approverName} (${props.approverEmail})`}
            />
            <Summary
              label="Request type"
              value="Car Service Requisition (Off-site Business)"
            />
            <Summary
              label="Using date"
              value={formatUsDate(props.usingDate)}
            />
            <Summary
              label="Trip schedule"
              value={`${props.startTime} – ${props.endTime}`}
            />
            <Summary label="Pickup location" value={props.pickupLocation} />
            <Summary label="Destination" value={props.destination} />
            <Summary
              label="Meeting point"
              value={
                props.meetingPoint === "loading_area"
                  ? "Loading area"
                  : "Front area"
              }
            />
            <Summary
              label="Purpose / Work summary"
              value={props.purpose.trim() || "Not provided"}
            />
            <Summary
              label="Travel with GA staff"
              value={props.withStaff ? "Yes" : "No"}
            />
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
    <div className="space-y-5 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Business Travel / Car Service
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-[-0.02em] text-ink sm:text-[30px]">
            CAR SERVICE REQUISITION
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500">
            Request a company vehicle and driver for official off-site business travel.
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

      {/* Top Banner Notice */}
      <div className="grid gap-3 border border-brand-200 bg-brand-50/70 px-4 py-3.5 text-sm text-brand-950 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-start gap-3">
          <Car className="mt-0.5 shrink-0 text-brand" size={18} />
          <div>
            <p className="font-semibold text-ink">
              Official Off-Site Business Travel
            </p>
            <p className="mt-0.5 text-xs leading-5 text-gray-600">
              Submitted requests require approval from your specified supervisor/manager before GA assigns a vehicle.
            </p>
          </div>
        </div>
        {props.onShowGuidelines && (
          <button
            type="button"
            onClick={props.onShowGuidelines}
            className="min-h-10 justify-self-start text-xs font-semibold text-brand underline underline-offset-2 hover:text-brand-dark sm:justify-self-end"
          >
            View car service rules
          </button>
        )}
      </div>

      {props.error && (
        <ErrorSummary message={props.error} fieldId={props.errorField} />
      )}

      {/* Stepper Progress Bar */}
      <Progress
        activeStep={activeStep}
        employeeComplete={employeeComplete}
        detailsComplete={detailsComplete}
      />

      {/* Step 1: Employee & Approver Information */}
      <section
        className="rounded-lg border border-line bg-white shadow-card"
        aria-labelledby="employee-section-heading"
      >
        <SectionHeader
          step="1"
          title="Employee & Approver information"
          description="Search by English name to select your company directory record and your designated approver."
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
              placeholder="7-digit employee ID"
              className={
                props.errorField === "employee-number"
                  ? "border-danger ring-2 ring-danger/20"
                  : ""
              }
              value={props.employeeId}
              onChange={(event) => {
                const val = event.target.value.replace(/\D/g, "").slice(0, 7);
                props.onRequesterChange("employeeId", val);
              }}
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
              <option value="">Select Dept</option>
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

          {/* Approver Selection Sub-section */}
          <div className="sm:col-span-2 border-t border-line pt-4 mt-1">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand mb-3">
              Approver Information (Chief / Supervisor / Sect.Manager / Dept.Manager)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <CompanyUserField
                  inputId="approver-search"
                  label="Approver name"
                  required
                  value={props.approverName}
                  onChange={(value) => props.onApproverChange("name", value)}
                  placeholder="Type approver's English name"
                  onSelectUser={props.onApproverDirectorySelect}
                  describedBy="approver-search-help"
                />
                {props.errorField === "approver-search" ? (
                  <p className="mt-1.5 text-xs font-semibold text-danger">
                    ⚠️ {props.error}
                  </p>
                ) : (
                  <p
                    id="approver-search-help"
                    className="mt-1.5 text-xs text-gray-500"
                  >
                    Select approver from directory to auto-fill their company email.
                  </p>
                )}
              </div>

              <Field label="Approver email">
                <Input
                  id="approver-email"
                  required
                  type="email"
                  className={
                    props.errorField === "approver-email"
                      ? "border-danger ring-2 ring-danger/20"
                      : ""
                  }
                  placeholder="approver@yageo.com"
                  value={props.approverEmail}
                  readOnly={
                    props.approverDirectorySelected &&
                    Boolean(props.approverEmail)
                  }
                  onChange={(event) =>
                    props.onApproverChange("email", event.target.value)
                  }
                />
                {props.errorField === "approver-email" && (
                  <p className="mt-1.5 text-xs font-semibold text-danger">
                    ⚠️ {props.error}
                  </p>
                )}
              </Field>
            </div>
          </div>

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
                  I confirm that this request is for official business travel.
                </strong>{" "}
                The employee information above will be used for approval and transportation notifications.
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

      {/* Step 2: Trip & Schedule Details */}
      <section
        className="rounded-lg border border-line bg-white shadow-card"
        aria-labelledby="trip-section-heading"
      >
        <SectionHeader
          step="2"
          title="Trip & schedule details"
          description="Provide the date, schedule, pickup, destination, and purpose for this trip."
          id="trip-section-heading"
        />
        <div className="space-y-6 px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Using date">
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

            <div>
              <Field label="Start time">
                <Input
                  id="start-time"
                  required
                  type="time"
                  value={props.startTime}
                  onChange={(e) => props.onStartTimeChange(e.target.value)}
                />
              </Field>
              <div className="mt-2">
                <QuickTime
                  options={["08:00", "09:00", "10:00", "13:00", "14:00"]}
                  onSelect={props.onStartTimeChange}
                />
              </div>
            </div>

            <div>
              <Field label="End time">
                <Input
                  id="end-time"
                  required
                  type="time"
                  value={props.endTime}
                  onChange={(e) => props.onEndTimeChange(e.target.value)}
                />
              </Field>
              <div className="mt-2">
                <QuickTime
                  options={["12:00", "15:00", "16:00", "17:00", "18:00"]}
                  onSelect={props.onEndTimeChange}
                />
              </div>
            </div>

            <Field label="Pickup location">
              <Input
                id="pickup-location"
                required
                placeholder="e.g. Tokin factory / Main office"
                value={props.pickupLocation}
                onChange={(e) => props.onPickupLocationChange(e.target.value)}
              />
            </Field>

            <Field label="Destination">
              <Input
                id="destination"
                required
                placeholder="e.g. Customer site, Airport, Office"
                value={props.destination}
                onChange={(e) => props.onDestinationChange(e.target.value)}
              />
            </Field>

            <Field label="Meeting point">
              <Select
                id="meeting-point"
                value={props.meetingPoint}
                onChange={(e) =>
                  props.onMeetingPointChange(
                    e.target.value as "front_area" | "loading_area",
                  )
                }
              >
                <option value="front_area">Front area</option>
                <option value="loading_area">Loading area</option>
              </Select>
            </Field>
          </div>

          <div>
            <Field label="Purpose / work summary">
              <Textarea
                id="purpose"
                required
                className="min-h-24"
                placeholder="Describe the purpose of this business trip (e.g., Client meeting, On-site service, Document delivery)"
                value={props.purpose}
                onChange={(e) => props.onPurposeChange(e.target.value)}
              />
            </Field>
          </div>

          {props.destination.trim() && (
            <div>
              <GoogleMapLinks
                origin={props.pickupLocation}
                destination={props.destination}
              />
            </div>
          )}

          <div>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-[#fafbfc] px-4 py-3.5 text-sm text-gray-700 transition hover:border-gray-300 w-full">
              <input
                type="checkbox"
                checked={props.withStaff}
                onChange={(e) => props.onWithStaffChange(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-brand"
              />
              <div>
                <strong className="font-semibold text-ink block">
                  Travel with GA staff
                </strong>
                <span className="text-xs text-gray-500">
                  Check if GA staff will accompany this trip
                </span>
              </div>
            </label>
          </div>

          <ApprovalRouteNotice
            approverName={props.approverName}
            approverEmail={props.approverEmail}
          />
        </div>
      </section>

      {/* Action Buttons */}
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
          <Button
            type="button"
            disabled={props.submitting}
            onClick={props.onProceedToReview}
          >
            Review request
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Helper Components ── */

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
    { label: "Employee & Approver", complete: employeeComplete },
    { label: "Trip & schedule details", complete: detailsComplete },
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
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                  active
                    ? "border-brand bg-brand text-white"
                    : complete
                      ? "border-brand bg-brand-light text-brand"
                      : "border-gray-300 bg-white text-gray-500"
                }`}
              >
                {complete && !active ? <Check size={13} /> : number}
              </span>
              <span
                className={`min-w-0 text-[11px] leading-4 sm:text-xs ${
                  active ? "font-semibold text-ink" : "text-gray-500"
                }`}
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

function ApprovalRouteNotice({
  approverName,
  approverEmail,
}: {
  approverName: string;
  approverEmail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
      <ShieldCheck className="mt-0.5 shrink-0 text-brand" size={19} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          Approval notification target
        </p>
        <p className="mt-0.5 text-xs leading-5 text-gray-600">
          {approverEmail
            ? `An email with a 1-click approval link will be sent to ${approverName || approverEmail} (${approverEmail}).`
            : "Search and select your designated approver above. The approval notification will be emailed directly to them."}
        </p>
      </div>
    </div>
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
