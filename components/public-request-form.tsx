"use client";
import { formatUsDate, getBangkokDateString } from "@/lib/date-format";

const getTodayString = () => getBangkokDateString();

const isPickupWithinOneHour = (usingDate: string, startTime: string) => {
  if (usingDate !== getTodayString() || !/^\d{2}:\d{2}$/.test(startTime)) return false;
  const current = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const nowMinutes = Number(current.find((part) => part.type === "hour")?.value ?? 0) * 60 +
    Number(current.find((part) => part.type === "minute")?.value ?? 0);
  const [hour, minute] = startTime.split(":").map(Number);
  const pickupMinutes = hour * 60 + minute;
  return pickupMinutes >= nowMinutes && pickupMinutes - nowMinutes <= 60;
};

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MailCheck,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { CarServiceGuidelines } from "@/components/car-service-guidelines";
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
import { PublicCarServiceRequestForm } from "@/components/public-car-service-request-form";
import { overtimeDuration } from "@/lib/overtime";
import { BrandLogo, PublicFooter } from "@/components/brand";

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



export default function PublicRequestForm({
  initialType,
}: {
  initialType?: RequestType;
} = {}) {
  const [requestType, setRequestType] = useState<RequestType | null>(
    initialType ?? null,
  );
  const [requesterName, setRequesterName] = useState("");
  const [directorySelected, setDirectorySelected] = useState(false);
  const [confirmedSelf, setConfirmedSelf] = useState(false);
  const [tigerSpaceConfirmed, setTigerSpaceConfirmed] = useState(true);
  const [requesterEmail, setRequesterEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [approverName, setApproverName] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [approverDirectorySelected, setApproverDirectorySelected] = useState(false);
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
  const [immediateReason, setImmediateReason] = useState("");
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
    setImmediateReason("");
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
    setApproverName("");
    setApproverEmail("");
    setApproverDirectorySelected(false);
    setStartTime("08:00");
    setEndTime("17:00");
    setPickupLocation("Tokin factory");
    setDestination("");
    setMeetingPoint("front_area");
    setPurpose("");
    setPassengers("");
    setImmediateReason("");
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
    const isImmediateOffsite = requestType === "outside_company" &&
      isPickupWithinOneHour(usingDate, startTime);

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
          "OT requests can be submitted only from 08:00 to 16:00.",
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
    } else {
      if (!approverName.trim())
        return failValidation(
          "Select your approver's English name from the company directory, or enter it.",
          "approver-search",
        );
      if (!approverEmail.trim())
        return failValidation(
          "Approver company email is required.",
          "approver-email",
        );
      if (!confirmedSelf)
        return failValidation(
          "Confirm that this request is for official business travel.",
          "confirm-self",
        );
      if (!usingDate)
        return failValidation("Using date is required.", "using-date");
      if (usingDate < getTodayString())
        return failValidation(
          "Using date cannot be in the past.",
          "using-date",
        );
      if (!startTime)
        return failValidation("Start time is required.", "start-time");
      if (!endTime) return failValidation("End time is required.", "end-time");
      if (endTime <= startTime)
        return failValidation(
          "End time must be after the start time.",
          "end-time",
        );
      if (!pickupLocation.trim())
        return failValidation(
          "Pickup location is required.",
          "pickup-location",
        );
      if (!destination.trim())
        return failValidation("Destination is required.", "destination");
      if (!purpose.trim())
        return failValidation("Purpose is required.", "purpose");
      if (isImmediateOffsite && !immediateReason.trim())
        return failValidation(
          "Provide a short business reason for this immediate transport request.",
          "immediate-reason",
        );
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
            approver: {
              name: approverName,
              email: approverEmail,
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
              requestType === "overtime" ? employee.busStop.trim() : destination,
            purpose:
              requestType === "overtime"
                ? (employee.workDescription.trim()
                    ? `Overtime / Holiday Work: ${employee.workDescription.trim()}`
                    : "Overtime / Holiday Work"
                  ).slice(0, 2000)
                : purpose,
            meetingPoint,
            withStaff,
            immediateReason: isImmediateOffsite ? immediateReason.trim() : "",
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
              eyebrow="Daily employee transport"
              title="OVERTIME TRANSPORT"
              body="Request company transport for approved overtime or holiday work."
              note="Submit by 16:00"
              href="/request/overtime"
              onClick={() => setRequestType("overtime")}
            />
            <Choice
              eyebrow="Business travel"
              title="OFF-SITE BUSINESS TRANSPORT"
              body="Vehicle request for business travel outside the company premises."
              note="For off-site company trips"
              href="/request/car-service"
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
                } else if (field === "email") {
                  setRequesterEmail(value);
                  setDirectorySelected(false);
                }
                else if (field === "employeeId") setEmployeeId(value);
                else setDepartment(value);
              }}
              onDirectorySelect={(person) => {
                setRequesterName(person.displayName);
                setRequesterEmail(person.mail);
                setEmployeeId(person.employeeId ?? "");
                setDepartment("");
                setDirectorySelected(true);
              }}
              onConfirmedSelfChange={setConfirmedSelf}
              onUsingDateChange={setUsingDate}
              onEmployeeChange={(field, value) =>
                updateEmployee(0, field, value)
              }
              onBackToType={() => {
                window.location.href = "/request";
              }}
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
            <PublicCarServiceRequestForm
              requesterName={requesterName}
              requesterEmail={requesterEmail}
              employeeId={employeeId}
              department={department}
              directorySelected={directorySelected}
              confirmedSelf={confirmedSelf}
              approverName={approverName}
              approverEmail={approverEmail}
              approverDirectorySelected={approverDirectorySelected}
              usingDate={usingDate}
              startTime={startTime}
              endTime={endTime}
              pickupLocation={pickupLocation}
              destination={destination}
              purpose={purpose}
              meetingPoint={meetingPoint}
              withStaff={withStaff}
              passengers={passengers}
              immediateRequest={isPickupWithinOneHour(usingDate, startTime)}
              immediateReason={immediateReason}
              reviewing={showSubmitConfirmation}
              submitting={submitting}
              error={error}
              errorField={errorField}
              minimumDate={getTodayString()}
              onRequesterChange={(field: RequesterField, value: string) => {
                if (field === "name") {
                  setRequesterName(value);
                  setDirectorySelected(false);
                } else if (field === "email") {
                  setRequesterEmail(value);
                  setDirectorySelected(false);
                }
                else if (field === "employeeId") setEmployeeId(value);
                else setDepartment(value);
              }}
              onDirectorySelect={(person) => {
                setRequesterName(person.displayName);
                setRequesterEmail(person.mail);
                setEmployeeId(person.employeeId ?? "");
                setDepartment("");
                setDirectorySelected(true);
              }}
              onConfirmedSelfChange={setConfirmedSelf}
              onApproverChange={(field, value) => {
                if (field === "name") {
                  setApproverName(value);
                  setApproverDirectorySelected(false);
                } else {
                  setApproverEmail(value);
                }
              }}
              onApproverDirectorySelect={(person) => {
                setApproverName(person.displayName);
                setApproverEmail(person.mail);
                setApproverDirectorySelected(true);
              }}
              onUsingDateChange={setUsingDate}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              onPickupLocationChange={setPickupLocation}
              onDestinationChange={setDestination}
              onPurposeChange={setPurpose}
              onMeetingPointChange={setMeetingPoint}
              onWithStaffChange={setWithStaff}
              onPassengersChange={setPassengers}
              onImmediateReasonChange={setImmediateReason}
              onBackToType={() => {
                window.location.href = "/request";
              }}
              onBackToEdit={() => {
                setShowSubmitConfirmation(false);
                setError("");
                setErrorField(undefined);
              }}
              onReset={handleReset}
              onShowGuidelines={() => setShowGuidelines(true)}
              onProceedToReview={() => void submit(undefined, false)}
              onConfirmSubmit={() => void submit(undefined, true)}
            />
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
              <dd className="font-medium text-ink">Off-site Business Transport</dd>
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

      {/* Guidelines Modal Popup (OT & Car Service) */}
      {showGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setShowGuidelines(false)}
              aria-label="Close rules dialog"
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="max-h-[82vh] overflow-y-auto">
              {requestType === "overtime" ? (
                <OtGuidelines />
              ) : (
                <CarServiceGuidelines />
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowGuidelines(false)}
                className="px-5 font-semibold text-xs"
              >
                I understand, continue
              </Button>
            </div>
          </div>
        </div>
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
      step: "1",
      title: "Submit request",
      desc: "Fill in employee & trip details",
    },
    {
      step: "2",
      title: "Verification & Approval",
      desc: "Manager approval or Tiger OpenSpace sync",
    },
    {
      step: "3",
      title: "Vehicle dispatch",
      desc: "GA assigns fleet & sends confirmation",
    },
  ];

  return (
    <section className="mt-12 border-t border-slate-200/80 pt-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        How it works
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        {steps.map((item) => (
          <div key={item.step} className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
              {item.step}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">{item.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
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
export function PublicFrame({
  children,
  showAdminLink,
}: {
  children: React.ReactNode;
  showAdminLink?: boolean;
}) {
  const pathname = usePathname();
  const helpHref = `/request/help?from=${encodeURIComponent(pathname || "/request")}`;

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-white px-4 sm:px-6 shadow-sm">
        <div className="mx-auto flex h-16 min-w-0 max-w-[1080px] items-center justify-between gap-3">
          <a
            href="/request"
            className="flex min-w-0 items-center gap-3 sm:gap-4 transition hover:opacity-85"
            title="TOKIN Transport Home"
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
          </a>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={helpHref}
              aria-label="Help & user guide"
              title="Help & user guide"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-gray-400 transition hover:border-gray-400 hover:bg-gray-50 hover:text-brand"
            >
              <HelpCircle size={16} />
            </a>
          </div>
        </div>
      </header>
      <div className="mx-auto flex-1 min-w-0 max-w-[1080px] px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
      <PublicFooter />
    </main>
  );
}

function Choice({
  eyebrow,
  title,
  body,
  note,
  href,
  onClick,
}: {
  eyebrow: string;
  title: string;
  body: string;
  note: string;
  href?: string;
  onClick: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {eyebrow}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
          {note}
        </span>
      </div>
      <h2 className="mt-4 break-words text-lg font-bold leading-snug text-slate-900">
        {title}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-6 flex items-center justify-start border-t border-slate-100 pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 transition-colors group-hover:text-brand-700">
          Start request <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </>
  );

  const containerClasses = "group flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-7";

  if (href) {
    return (
      <a href={href} className={containerClasses}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={containerClasses}>
      {content}
    </button>
  );
}
