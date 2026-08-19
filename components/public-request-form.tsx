"use client";
import { formatUsDate, getBangkokDateString } from "@/lib/date-format";

const getTodayString = () => getBangkokDateString();

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  WeeklyHoursInput,
  TimeMaskInput,
} from "@/components/ui";
import { OtGuidelines } from "@/components/ot-guidelines";
import { GoogleMapLinks } from "@/components/google-map-links";
import {
  CompanyUserField,
  type CompanyUser,
} from "@/components/company-user-field";
import type { OvertimeEmployee, RequestType } from "@/lib/types";
import { isOtRequestWindowOpen } from "@/lib/request-window";
import {
  PublicOvertimeRequestForm,
  type RequesterField,
} from "@/components/public-overtime-request-form";
import { overtimeDuration } from "@/lib/overtime";
import { BrandLogo } from "@/components/brand";

const emptyEmployee = (): OvertimeEmployee => ({
  employeeId: "",
  employeeName: "",
  employeeEmail: "",
  workDescription: "",
  workStart: "17:20",
  workEnd: "20:00",
  totalWeeklyHours: 0,
  transportRequired: true,
  busStop: "",
});

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

const normalizeDepartment = (
  dept: string | undefined,
  jobTitle?: string,
): string => {
  const d = (dept || "").trim().toLowerCase();
  const j = (jobTitle || "").trim().toLowerCase();

  if (
    /\bga\b/i.test(j) ||
    j.includes("general affairs") ||
    d === "general affairs"
  )
    return "HR";
  if (j.includes("ta mfg") || d.includes("ta mfg")) return "TA MFG";
  if (
    /\bpe\b/i.test(j) ||
    j.includes("production engineering") ||
    /\bpe\b/i.test(d)
  )
    return "PE";
  if (
    /\bit\b/i.test(j) ||
    j.includes("information technology") ||
    /\bit\b/i.test(d)
  )
    return "IT";
  if (/\bqa\b/i.test(j) || j.includes("quality assurance") || /\bqa\b/i.test(d))
    return "QA";
  if (
    j.includes("managing director") ||
    /\bmd\b/i.test(j) ||
    d.includes("managing director")
  )
    return "MD";

  if (d === "information technology" || d === "it") return "IT";
  if (d === "human resources" || d === "hr") return "HR";
  if (d === "md") return "MD";
  if (d === "sustainability" || d === "sust") return "SUST";
  if (
    d === "finance & accounting" ||
    d === "fa" ||
    d === "finance" ||
    d === "accounting"
  )
    return "FA";
  if (d === "planning" || d === "pln") return "PLN";
  if (d === "procurement" || d === "proc") return "PROC";
  if (d === "production engineering" || d === "pe") return "PE";
  if (d === "electrical engineering" || d === "ee") return "EE";
  if (d === "facilities" || d === "fac") return "FAC";
  if (d === "quality assurance" || d === "qa") return "QA";
  if (d === "ta mfg" || d === "manufacturing") return "TA MFG";
  if (d === "supply chain" || d === "sc") return "SC";
  if (d === "testing engineering" || d === "te") return "TE";

  const match = DEPARTMENTS.find((x) => x.toLowerCase() === d);
  if (match) return match;
  return dept || "";
};



export default function PublicRequestForm() {
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [directorySelected, setDirectorySelected] = useState(false);
  const [confirmedSelf, setConfirmedSelf] = useState(false);
  const [tigerSpaceConfirmed, setTigerSpaceConfirmed] = useState(true);
  const [requesterEmail, setRequesterEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [usingDate, setUsingDate] = useState(getTodayString);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [pickupLocation, setPickupLocation] = useState("TOKIN Main Office");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [meetingPoint, setMeetingPoint] = useState<
    "front_area" | "loading_area"
  >("front_area");
  const [withStaff, setWithStaff] = useState(false);
  const [passengers, setPassengers] = useState("");
  const [employees, setEmployees] = useState<OvertimeEmployee[]>([
    emptyEmployee(),
  ]);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<string>();
  const [copiedLink, setCopiedLink] = useState(false);
  const submitLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [success, setSuccess] = useState<{
    requestNo: string;
    emailStatus: string;
    manageUrl?: string;
    submittedAt: string;
  } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [requestType]);
  const updateEmployee = <K extends keyof OvertimeEmployee>(
    index: number,
    key: K,
    value: OvertimeEmployee[K],
  ) =>
    setEmployees((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    );

  const reset = () => {
    setRequestType(null);
    setUsingDate(getTodayString());
    setDestination("");
    setPurpose("");
    setPassengers("");
    setEmployees([emptyEmployee()]);
    setDirectorySelected(false);
    setConfirmedSelf(false);
    setSuccess(null);
    setShowSubmitConfirmation(false);
    setError("");
  };

  const handleReset = () => {
    setUsingDate(getTodayString());
    setRequesterName("");
    setRequesterEmail("");
    setEmployeeId("");
    setDepartment("");
    setStartTime("08:00");
    setEndTime("17:00");
    setPickupLocation("Tokin factory");
    setDestination("");
    setMeetingPoint("front_area");
    setPurpose("");
    setPassengers("");
    setWithStaff(false);
    setEmployees([emptyEmployee()]);
    setDirectorySelected(false);
    setConfirmedSelf(false);
    setShowSubmitConfirmation(false);
    setError("");
  };

  const failValidation = (message: string, fieldId?: string) => {
    setError(message);
    setErrorField(fieldId);
    if (fieldId) {
      window.setTimeout(() => {
        const target = document.getElementById(fieldId);
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    }
  };

  const submit = async (event?: React.FormEvent, confirmed = false) => {
    event?.preventDefault();
    if (submitting || submitLock.current) return;
    setError("");
    setErrorField(undefined);
    if (!requestType) return;
    const employee = employees[0] ?? emptyEmployee();

    if (!requesterName.trim())
      return failValidation(
        "Select your English name from the company directory, or enter it if the directory is unavailable.",
        "employee-search",
      );
    if (!employeeId.trim())
      return failValidation("Employee number is required.", "employee-number");
    if (!/^\d{7}$/.test(employeeId.trim()))
      return failValidation(
        "Employee number must contain exactly 7 digits.",
        "employee-number",
      );
    if (!requesterEmail.trim())
      return failValidation("Company email is required.", "company-email");
    if (!department.trim())
      return failValidation("Department is required.", "department");

    if (requestType === "overtime") {
      if (!confirmedSelf)
        return failValidation(
          "Confirm that this request is for you.",
          "confirm-self",
        );
      if (!isOtRequestWindowOpen())
        return failValidation(
          "OT requests can be submitted only from 08:00 to 16:00 (Thailand time).",
        );
      if (!usingDate)
        return failValidation(
          "OT / holiday work date is required.",
          "using-date",
        );
      if (usingDate < getTodayString())
        return failValidation(
          "OT / holiday work date cannot be in the past.",
          "using-date",
        );
      if (!employee.workStart)
        return failValidation("OT start time is required.", "ot-start");
      if (!employee.workEnd)
        return failValidation("OT end time is required.", "ot-end");
      if (!overtimeDuration(employee.workStart, employee.workEnd))
        return failValidation(
          "OT end time must be after the start time.",
          "ot-end",
        );

      if (employee.transportRequired && !employee.busStop.trim())
        return failValidation(
          "Drop-off location is required when transportation is requested.",
          "drop-off-location",
        );
      if (!tigerSpaceConfirmed)
        return failValidation(
          "Please confirm that you have submitted this OT in Tiger Space by checking the box.",
          "tiger-space-confirmed",
        );
    } else if (!purpose.trim()) {
      return failValidation("Purpose is required.");
    }

    if (!confirmed) {
      setShowSubmitConfirmation(true);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !publishableKey)
        throw new Error("Public request service is not configured.");
      const passengerList = passengers
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      const overtimeEmployee = {
        ...employee,
        employeeId: employeeId.trim(),
        employeeName: requesterName.trim(),
        employeeEmail: requesterEmail.trim(),
        workDescription: employee.workDescription.trim() || "Transport Request",
      };
      const response = await fetch(
        `${supabaseUrl}/functions/v1/public-submit-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: publishableKey,
          },
          body: JSON.stringify({
            requestType,
            requester: {
              name: requesterName,
              email: requesterEmail,
              employeeId,
              department,
            },
            usingDate,
            startTime:
              requestType === "overtime"
                ? overtimeEmployee.workStart
                : startTime,
            endTime:
              requestType === "overtime" ? overtimeEmployee.workEnd : endTime,
            pickupLocation,
            destination:
              requestType === "overtime" ? "Employee bus stops" : destination,
            purpose:
              requestType === "overtime"
                ? (employee.workDescription.trim()
                    ? `Overtime / Holiday Work: ${employee.workDescription.trim()}`
                    : "Overtime / Holiday Work"
                  ).slice(0, 2000)
                : purpose,
            meetingPoint,
            withStaff,
            passengers: requestType === "outside_company" ? passengerList : [],
            overtimeEmployees:
              requestType === "overtime" ? [overtimeEmployee] : [],
            tigerSpaceConfirmed: tigerSpaceConfirmed ?? true,
            website,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to submit request.");
      setSuccess({
        requestNo: result.requestNo,
        emailStatus: result.approvalEmailStatus,
        manageUrl: result.manageUrl,
        submittedAt: new Date().toISOString(),
      });
      setShowSubmitConfirmation(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to submit request.",
      );
      window.setTimeout(
        () => document.getElementById("validation-summary")?.focus(),
        0,
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };
  if (success)
    return (
      <PublicFrame>
        <section
          className="mx-auto max-w-2xl overflow-hidden rounded-lg border border-line bg-white"
          aria-labelledby="success-title"
        >
          <div className="border-b border-line bg-[#f7f8fa] px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-success"
                size={24}
              />
              <div>
                <h1
                  id="success-title"
                  className="text-xl font-semibold text-ink"
                >
                  Request submitted
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Keep the request number and management link for future
                  changes.
                </p>
              </div>
            </div>
          </div>
          <dl className="grid gap-x-8 gap-y-4 px-5 py-5 text-sm sm:grid-cols-2 sm:px-7">
            <Info label="Request number" value={success.requestNo} />
            <Info label="Current status" value="Pending department approval" />
            <Info
              label="Submitted"
              value={new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Bangkok",
              }).format(new Date(success.submittedAt))}
            />
            <Info label="Department" value={department} />
            <Info
              label="Approver"
              value={`${department} department approver`}
            />
            <Info
              label="Expected next step"
              value="After approval, Admin assigns the vehicle and driver and emails the employee."
            />
          </dl>
          {success.emailStatus === "queued" && (
            <p className="mx-5 mb-5 border-l-[3px] border-brand bg-brand-light px-3.5 py-3 text-sm text-gray-700 sm:mx-7">
              This request is queued for the {department} department approval
              summary.
            </p>
          )}
          {success.emailStatus !== "sent" &&
            success.emailStatus !== "queued" && (
              <p className="mx-5 mb-5 border-l-[3px] border-amber-500 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 sm:mx-7">
                The request was saved, but the approval email service is not
                ready. Admin and department approvers can still view it.
              </p>
            )}
          {success.manageUrl && (
            <div className="border-t border-line bg-[#fafbfc] px-5 py-5 sm:px-7">
              <p className="text-sm font-semibold text-ink">
                Manage this request
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Use this secure link to view, edit, cancel, or resubmit while
                permitted.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <a
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                  href={success.manageUrl}
                >
                  Manage request
                </a>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      success.manageUrl ?? "",
                    );
                    setCopiedLink(true);
                  }}
                >
                  {copiedLink ? "Tracking link copied" : "Copy tracking link"}
                </Button>
              </div>
              <p className="mt-3 text-xs font-medium text-danger">
                Do not share this management link. Anyone with the link may be
                able to access your request.
              </p>
            </div>
          )}
          <div className="border-t border-line px-5 py-4 sm:px-7">
            <Button type="button" variant="ghost" onClick={reset}>
              Create another request
            </Button>
          </div>
        </section>
      </PublicFrame>
    );
  if (!requestType)
    return (
      <PublicFrame showAdminLink>
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 border-b border-line pb-7 sm:mb-10 sm:flex sm:items-end sm:justify-between sm:gap-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Employee transport service
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-ink sm:text-[42px] sm:leading-tight">
                Where do you need to go?
              </h1>
              <p className="mt-3 text-sm leading-6 text-gray-500 sm:text-base">
                Start with the type of transport you need. Your company details
                route the request to the right approver automatically.
              </p>
            </div>
            <div className="mt-5 shrink-0 text-sm sm:mt-0 sm:text-right">
              <p className="inline-flex items-center gap-2 font-semibold text-success">
                <ShieldCheck size={16} /> No sign-in required
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Use your company email to submit
              </p>
            </div>
          </div>
          <div className="grid min-w-0 gap-5 md:grid-cols-2">
            <Choice
              icon={<Clock3 />}
              eyebrow="Daily employee transport"
              title="OVERTIME / HOLIDAY WORK"
              body="Transportation for employees working overtime or on a public holiday."
              note="Submit by 16:00"
              onClick={() => setRequestType("overtime")}
            />
            <Choice
              icon={<Car />}
              eyebrow="Business travel"
              title="CAR SERVICE REQUISITION"
              body="Vehicle request for business travel outside the company premises."
              note="For off-site company trips"
              onClick={() => setRequestType("outside_company")}
            />
          </div>
          <RequestProgress />
        </div>
      </PublicFrame>
    );

  return (
    <PublicFrame>
      <div className="relative mx-auto max-w-[1080px]">
        <form
          onSubmit={submit}
          noValidate={requestType === "overtime"}
          className="space-y-5 pb-20 sm:pb-0"
        >
          {requestType !== "overtime" && (
            <div className="flex min-w-0 flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase text-brand">
                  TOKIN Transport
                </p>
                <h1 className="mt-1 break-words text-xl font-bold leading-tight sm:text-2xl">
                  CAR SERVICE REQUISITION
                </h1>
              </div>
              <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex sm:w-auto sm:gap-3">
                <Field label="Using date">
                  <Input
                    required
                    type="date"
                    lang="en-US"
                    min={getTodayString()}
                    className="h-10 sm:w-44"
                    value={usingDate}
                    onChange={(e) => setUsingDate(e.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 whitespace-nowrap px-3"
                  onClick={() => setRequestType(null)}
                >
                  Change type
                </Button>
              </div>
            </div>
          )}

          {requestType === "overtime" ? (
            <PublicOvertimeRequestForm
              requesterName={requesterName}
              requesterEmail={requesterEmail}
              employeeId={employeeId}
              department={department}
              directorySelected={directorySelected}
              confirmedSelf={confirmedSelf}
              tigerSpaceConfirmed={tigerSpaceConfirmed}
              usingDate={usingDate}
              employee={employees[0] ?? emptyEmployee()}
              reviewing={showSubmitConfirmation}
              submitting={submitting}
              error={error}
              errorField={errorField}
              minimumDate={getTodayString()}
              onTigerSpaceConfirmedChange={setTigerSpaceConfirmed}
              onRequesterChange={(field: RequesterField, value: string) => {
                if (field === "name") {
                  setRequesterName(value);
                  setDirectorySelected(false);
                } else if (field === "email") setRequesterEmail(value);
                else if (field === "employeeId") setEmployeeId(value);
                else setDepartment(value);
              }}
              onDirectorySelect={(person) => {
                setRequesterName(person.displayName);
                setRequesterEmail(person.mail);
                setEmployeeId(person.employeeId ?? "");
                setDepartment(
                  normalizeDepartment(person.department, person.jobTitle),
                );
                setDirectorySelected(true);
              }}
              onConfirmedSelfChange={setConfirmedSelf}
              onUsingDateChange={setUsingDate}
              onEmployeeChange={(field, value) =>
                updateEmployee(0, field, value)
              }
              onBackToType={() => setRequestType(null)}
              onBackToEdit={() => {
                setShowSubmitConfirmation(false);
                setError("");
                setErrorField(undefined);
              }}
              onReset={handleReset}
              onShowGuidelines={() => setShowGuidelines(true)}
              onConfirmSubmit={() => void submit(undefined, true)}
            />
          ) : (
            /* Outside Company Requisition Form (Stacked cards layout) */
            <div className="space-y-5 pb-20 sm:pb-0">
              <Card className="p-5">
                <SectionHeading
                  number="1"
                  title="Request owner"
                  description="Enter the employee responsible for this request."
                />
                <p className="mb-4 text-xs text-gray-500">
                  Search name or email to auto-fill company directory details.
                </p>
                <div className="grid gap-4 rounded-xl border border-line bg-canvas p-4 sm:grid-cols-2">
                  <Field label="Employee number">
                    <Input
                      required
                      value={employeeId}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 7);
                        setEmployeeId(val);
                      }}
                    />
                  </Field>
                  <Field label="Department">
                    <Select
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="">Select Dept</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                      {department && !DEPARTMENTS.includes(department) && (
                        <option value={department}>{department}</option>
                      )}
                    </Select>
                  </Field>
                  <CompanyUserField
                    label="Employee name"
                    required
                    value={requesterName}
                    onChange={setRequesterName}
                    placeholder="Search name..."
                    onSelectUser={(person) => {
                      setRequesterName(person.displayName);
                      setRequesterEmail(person.mail);
                      if (person.department)
                        setDepartment(
                          normalizeDepartment(
                            person.department,
                            person.jobTitle,
                          ),
                        );
                      if (person.employeeId) setEmployeeId(person.employeeId);
                    }}
                  />
                  <Field label="Company email">
                    <Input
                      required
                      type="email"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
              <ApprovalRouteNotice department={department} />

              <Card className="p-5">
                <SectionHeading
                  number="2"
                  title="Trip details"
                  description="Provide the schedule, route, and purpose for this trip."
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Start time">
                    <Input
                      required
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </Field>
                  <Field label="End time">
                    <Input
                      required
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </Field>
                  <Field label="Pickup location">
                    <Input
                      required
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                    />
                  </Field>
                  <Field label="Destination">
                    <Input
                      required
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </Field>
                  <Field label="Meeting point">
                    <Select
                      value={meetingPoint}
                      onChange={(e) =>
                        setMeetingPoint(
                          e.target.value as "front_area" | "loading_area",
                        )
                      }
                    >
                      <option value="front_area">Front area</option>
                      <option value="loading_area">Loading area</option>
                    </Select>
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Purpose / work summary">
                    <Textarea
                      required
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                    />
                  </Field>
                </div>
                {destination.trim() && (
                  <div className="mt-4">
                    <GoogleMapLinks
                      origin={pickupLocation}
                      destination={destination}
                    />
                  </div>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Passenger names (one per line)">
                    <Textarea
                      value={passengers}
                      onChange={(e) => setPassengers(e.target.value)}
                    />
                  </Field>
                  <label className="flex items-center gap-3 self-start pt-8 text-sm">
                    <input
                      type="checkbox"
                      checked={withStaff}
                      onChange={(e) => setWithStaff(e.target.checked)}
                      className="h-4 w-4 accent-brand"
                    />
                    Travel with GA staff
                  </label>
                </div>
              </Card>

              {error && (
                <p className="border-l-2 border-danger bg-danger-light p-3 pl-4 text-sm text-danger mt-4">
                  {error}
                </p>
              )}
              <FormActions submitting={submitting} onReset={handleReset} />
            </div>
          )}

          <div className="hidden" aria-hidden="true">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>
        </form>
      </div>

      {showSubmitConfirmation && requestType === "outside_company" && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-confirmation-title"
        >
          <div className="w-full max-w-md border border-line bg-white shadow-modal">
            <div className="border-b border-line px-5 py-4">
              <h2
                id="submit-confirmation-title"
                className="text-lg font-semibold text-ink"
              >
                Confirm request submission
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Please review the details before sending this request.
              </p>
            </div>

            <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 px-5 py-4 text-sm">
              <dt className="text-gray-500">Request type</dt>
              <dd className="font-medium text-ink">Car Service Requisition</dd>
              <dt className="text-gray-500">Requester</dt>
              <dd className="font-medium text-ink">{requesterName || "—"}</dd>
              <dt className="text-gray-500">Using date </dt>
              <dd className="font-medium text-ink">
                {usingDate ? formatUsDate(usingDate) : "—"}
              </dd>
              <dt className="text-gray-500">Approval route</dt>
              <dd className="font-medium text-ink">
                {department || "—"} department approver(s)
              </dd>
            </dl>

            <div className="flex justify-end gap-3 border-t border-line bg-gray-50 px-5 py-3">
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => setShowSubmitConfirmation(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void submit(undefined, true)}
              >
                {submitting ? "Submitting..." : "Confirm and submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {requestType === "overtime" && (
        <>
          {/* Guidelines Modal Popup */}
          {showGuidelines && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 animate-fade-in">
              <div className="relative w-full max-w-5xl overflow-hidden border border-white/20 bg-white shadow-modal">
                <button
                  type="button"
                  onClick={() => setShowGuidelines(false)}
                  aria-label="Close OT rules"
                  className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center border border-white/20 bg-black/10 text-xl font-medium leading-none text-white transition hover:bg-white/15"
                >
                  &times;
                </button>

                <div className="max-h-[82vh] overflow-y-auto">
                  <OtGuidelines />
                </div>

                <div className="flex justify-end border-t border-line bg-white px-5 py-3 sm:px-7">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowGuidelines(false)}
                    className="px-5"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PublicFrame>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 break-words font-medium text-ink">{value}</dd>
    </div>
  );
}
function RequestProgress() {
  const steps = [
    {
      icon: <MailCheck size={17} />,
      title: "Submit request",
      body: "Enter company and trip details",
    },
    {
      icon: <ShieldCheck size={17} />,
      title: "Department approval",
      body: "Sent to your department approver",
    },
    {
      icon: <Car size={17} />,
      title: "Transport assigned",
      body: "Receive vehicle details by email",
    },
  ];

  return (
    <section className="mt-8 border-t border-line px-1 py-6 sm:px-0">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
        What happens next
      </p>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-0">
        {steps.map((step, index) => (
          <li key={step.title} className="relative flex min-w-0 gap-3 sm:px-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
              {step.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {index + 1}. {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">
                {step.body}
              </p>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight
                className="absolute right-0 top-2 hidden text-gray-300 sm:block"
                size={16}
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
        {number}
      </span>
      <div>
        <h2 className="font-bold text-ink">{title}</h2>
        <p className="mt-0.5 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function ApprovalRouteNotice({ department }: { department: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
      <ShieldCheck className="mt-0.5 shrink-0 text-brand" size={19} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          Approval is routed automatically
        </p>
        <p className="mt-0.5 text-xs leading-5 text-gray-600">
          {department
            ? `This request will be sent to the active approver(s) for ${department}.`
            : "Select a department and the system will send this request to its active approver(s)."}{" "}
          You do not need to enter a manager email.
        </p>
      </div>
    </div>
  );
}

function FormActions({
  submitting,
  onReset,
}: {
  submitting: boolean;
  onReset: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:pt-3 sm:shadow-none">
      <p className="hidden text-xs text-gray-500 sm:mr-auto sm:block">
        Review your information before submitting.
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={onReset}
        disabled={submitting}
      >
        Reset
      </Button>
      <Button className="min-w-36" disabled={submitting}>
        {submitting ? "Submitting..." : "Review request"}
      </Button>
    </div>
  );
}
function PublicFrame({
  children,
  showAdminLink = false,
}: {
  children: React.ReactNode;
  showAdminLink?: boolean;
}) {
  return (
    <main className="min-h-screen bg-canvas">
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
                Employee transportation request
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/request/help"
              aria-label="Help & user guide"
              title="Help & user guide"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-gray-400 transition hover:border-gray-400 hover:bg-gray-50 hover:text-brand"
            >
              <HelpCircle size={16} />
            </a>
            {showAdminLink && (
              <a
                href="/admin/login"
                className="shrink-0 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:border-gray-400 hover:bg-gray-50 hover:text-brand sm:px-3 sm:text-xs"
              >
                Admin portal
              </a>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto min-w-0 max-w-[1080px] px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </main>
  );
}

function Choice({
  icon,
  eyebrow,
  title,
  body,
  note,
  onClick,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-0 flex-col rounded-xl border border-line bg-white p-6 text-left shadow-card transition-colors duration-150 hover:border-brand/50 hover:bg-[#fbfdff] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:h-14 sm:w-14">
          {icon}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
          {note}
        </span>
      </div>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
        {eyebrow}
      </p>
      <h2 className="mt-1 break-words text-lg font-bold leading-snug text-ink">
        {title}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">{body}</p>
      <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-brand">
        <span>Start request</span>
        <ArrowRight
          size={15}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </button>
  );
}
