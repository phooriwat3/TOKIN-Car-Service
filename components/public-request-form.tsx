"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock3,
  Copy,
  MailCheck,
  MapPin,
  Plus,
  ShieldCheck,
  Users,
  Trash2,
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
import type {
  OvertimeEmployee,
  RequestType,
} from "@/lib/types";
import { isOtRequestWindowOpen } from "@/lib/request-window";

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

const normalizeDepartment = (dept: string | undefined, jobTitle?: string): string => {
  const d = (dept || "").trim().toLowerCase();
  const j = (jobTitle || "").trim().toLowerCase();

  if (j.includes("ta mfg") || d.includes("ta mfg")) return "TA MFG";
  if (/\bpe\b/i.test(j) || j.includes("production engineering") || /\bpe\b/i.test(d)) return "PE";
  if (/\bit\b/i.test(j) || j.includes("information technology") || /\bit\b/i.test(d)) return "IT";
  if (/\bqa\b/i.test(j) || j.includes("quality assurance") || /\bqa\b/i.test(d)) return "QA";
  if (j.includes("managing director") || /\bmd\b/i.test(j) || d.includes("managing director")) return "MD";

  if (d === "information technology" || d === "it") return "IT";
  if (d === "human resources" || d === "hr") return "HR";
  if (d === "medical" || d === "md") return "MD";
  if (d === "sustainability" || d === "sust") return "SUST";
  if (d === "finance & accounting" || d === "fa" || d === "finance" || d === "accounting") return "FA";
  if (d === "planning" || d === "pln") return "PLN";
  if (d === "procurement" || d === "proc") return "PROC";
  if (d === "production engineering" || d === "pe") return "PE";
  if (d === "electrical engineering" || d === "ee") return "EE";
  if (d === "facilities" || d === "fac") return "FAC";
  if (d === "quality assurance" || d === "qa") return "QA";
  if (d === "ta mfg" || d === "manufacturing") return "TA MFG";
  if (d === "supply chain" || d === "sc") return "SC";
  if (d === "testing engineering" || d === "te") return "TE";

  if (d === "capacitor") return "MD";

  const match = DEPARTMENTS.find((x) => x.toLowerCase() === d);
  if (match) return match;
  return dept || "";
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
};

export default function PublicRequestForm() {
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [requesterName, setRequesterName] = useState("");
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
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [success, setSuccess] = useState<{
    requestNo: string;
    emailStatus: string;
    manageUrl?: string;
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

  const addEmployee = () => {
    setEmployees((current) => {
      const schedule = current[current.length - 1] ?? emptyEmployee();
      return [
        ...current,
        {
          ...emptyEmployee(),
          workStart: schedule.workStart,
          workEnd: schedule.workEnd,
          totalWeeklyHours: schedule.totalWeeklyHours,
        },
      ];
    });
  };

  const copyRequesterToEmployee = (index = 0) => {
    setEmployees((current) =>
      current.map((item, employeeIndex) =>
        employeeIndex === index
          ? {
              ...item,
              employeeId,
              employeeName: requesterName,
              employeeEmail: requesterEmail,
            }
          : item,
      ),
    );
  };

  const applyFirstScheduleToAll = () => {
    const schedule = employees[0];
    if (!schedule) return;
    setEmployees((current) =>
      current.map((item) => ({
        ...item,
        workStart: schedule.workStart,
        workEnd: schedule.workEnd,
        totalWeeklyHours: schedule.totalWeeklyHours,
      })),
    );
  };
  const reset = () => {
    setRequestType(null);
    setUsingDate(getTodayString());
    setDestination("");
    setPurpose("");
    setPassengers("");
    setEmployees([emptyEmployee()]);
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
    setShowSubmitConfirmation(false);
    setError("");
  };

  const submit = async (event?: React.FormEvent, confirmed = false) => {
    event?.preventDefault();
    setError("");
    if (!requestType) return;
    if (!employeeId.trim())
      return setError("Requester employee number is required.");
    if (requestType === "overtime" && !isOtRequestWindowOpen()) {
      return setError(
        "OT requests can be submitted only from 08:00 to 16:00 (Thailand time).",
      );
    }
    if (requestType === "outside_company" && !purpose.trim())
      return setError("Purpose is required.");
    if (
      requestType === "overtime" &&
      employees.some(
        (item) =>
          !item.employeeId ||
          !item.employeeName ||
          (item.transportRequired && (!item.employeeEmail || !item.busStop)),
      )
    ) {
      return setError(
        "Complete every OT employee row, including employee email and bus stop when transportation is required.",
      );
    }

    if (!confirmed) {
      setShowSubmitConfirmation(true);
      return;
    }

    setShowSubmitConfirmation(false);
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
              requestType === "overtime" ? employees[0].workStart : startTime,
            endTime:
              requestType === "overtime" ? employees[0].workEnd : endTime,
            pickupLocation,
            destination:
              requestType === "overtime" ? "Employee bus stops" : destination,
            purpose:
              requestType === "overtime"
                ? (
                    "Overtime / Holiday Work: " +
                    employees
                      .map((e) => e.workDescription.trim())
                      .filter(Boolean)
                      .join(", ")
                  ).slice(0, 2000)
                : purpose,
            meetingPoint,
            withStaff,
            passengers: requestType === "outside_company" ? passengerList : [],
            overtimeEmployees:
              requestType === "overtime"
                ? employees.map((emp) => ({
                    ...emp,
                    workDescription:
                      emp.workDescription.trim() || "Overtime Work",
                  }))
                : [],
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
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to submit request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success)
    return (
      <PublicFrame>
        <Card className="mx-auto max-w-xl p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
          <h1 className="mt-4 text-2xl font-bold">Request submitted</h1>
          <p className="mt-2 text-gray-600">
            Request number: <strong>{success.requestNo}</strong>
          </p>
          <p className="mt-4 text-sm text-gray-500">
            The request has been routed to the active approver(s) for your department.
            You will receive another email after Admin assigns the vehicle and driver.
          </p>
          {success.manageUrl && (
            <a
              className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-[#194786]"
              href={success.manageUrl}
            >
              Manage this request
            </a>
          )}
          {success.emailStatus === "queued" && (
            <p className="mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
              This OT request will be included in the department approval summary at 15:30.
            </p>
          )}
          {success.emailStatus !== "sent" && success.emailStatus !== "queued" && (
            <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              The request was saved, but the approval email service is not ready.
              Admin and department approvers can still see this request in the portal.
            </p>
          )}
          <Button className="mt-6" onClick={reset}>
            Create another request
          </Button>
        </Card>
      </PublicFrame>
    );

  if (!requestType)
    return (
      <PublicFrame>
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Employee self-service
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Request transportation
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
              Choose the request that matches your trip. No account is required;
              use your company information to submit.
            </p>
            <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-medium text-green-800">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} /> No sign-in required
              </span>
              <span className="hidden h-3 w-px bg-green-200 sm:block" />
              <span>Company email required</span>
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
      <div className="relative mx-auto max-w-[1500px]">
        <form onSubmit={submit} className="space-y-5 pb-20 sm:pb-0">
          <div className="flex min-w-0 flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-brand">
                TOKIN Transport
              </p>
              <h1 className="mt-1 break-words text-xl font-bold leading-tight sm:text-2xl">
                {requestType === "overtime"
                  ? "OVERTIME / HOLIDAY WORK"
                  : "CAR SERVICE REQUISITION"}
              </h1>
            </div>
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex sm:w-auto sm:gap-3">
              <Field label="Using date">
                <Input
                  required
                  type="date"
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

          {requestType === "overtime" ? (
            <div className="space-y-5 pb-20 sm:pb-0">
              <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 shrink-0 text-amber-700" size={19} />
                  <div>
                    <p className="text-sm font-semibold">Submit today&apos;s OT transportation by 16:00</p>
                    <p className="mt-0.5 text-xs leading-5 text-amber-800">
                      Requests submitted today are grouped by department and sent for approval at 15:30.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuidelines(true)}
                  className="shrink-0 self-start text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950 sm:self-auto"
                >
                  View OT rules
                </button>
              </div>

              <Card className="p-5 sm:p-6">
                <SectionHeading
                  number="1"
                  title="Request owner"
                  description="Search your company name first. Directory information will be filled automatically."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <CompanyUserField
                    label="Employee name"
                    required
                    value={requesterName}
                    onChange={setRequesterName}
                    placeholder="Type name or company email..."
                    onSelectUser={(person) => {
                      setRequesterName(person.displayName);
                      setRequesterEmail(person.mail);
                      if (person.department)
                        setDepartment(
                          normalizeDepartment(person.department, person.jobTitle),
                        );
                      if (person.employeeId) setEmployeeId(person.employeeId);
                    }}
                  />
                  <Field label="Company email">
                    <Input
                      required
                      type="email"
                      placeholder="name@yageo.com"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                    />
                  </Field>
                  <Field label="Employee number">
                    <Input
                      required
                      inputMode="numeric"
                      placeholder="7-digit employee number"
                      value={employeeId}
                      onChange={(e) =>
                        setEmployeeId(
                          e.target.value.replace(/\D/g, "").slice(0, 7),
                        )
                      }
                    />
                  </Field>
                  <Field label="Department">
                    <Select
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="">Select department</option>
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
                </div>
                <div className="mt-4">
                  <ApprovalRouteNotice department={department} />
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <SectionHeading
                    number="2"
                    title="Employees requesting transport"
                    description="Add one card per employee. New cards reuse the previous OT schedule."
                  />
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex h-9 items-center rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700">
                      <Users size={15} className="mr-1.5" /> {employees.length} employee{employees.length > 1 ? "s" : ""}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copyRequesterToEmployee(0)}
                      disabled={!requesterName && !requesterEmail && !employeeId}
                    >
                      <Copy size={14} /> Use request owner
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {employees.map((employee, index) => (
                    <section
                      key={index}
                      className="overflow-hidden rounded-xl border border-line bg-white shadow-panel"
                    >
                      <div className="flex items-center justify-between border-b border-line bg-slate-50 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {employee.employeeName || `Employee ${index + 1}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {employee.transportRequired
                                ? "Transportation required"
                                : "No transportation required"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyRequesterToEmployee(index)}
                              title="Use request owner information"
                            >
                              <Copy size={15} />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={employees.length === 1}
                            onClick={() =>
                              setEmployees((current) =>
                                current.filter((_, employeeIndex) => employeeIndex !== index),
                              )
                            }
                            title="Remove employee"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-5 p-4 sm:p-5">
                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-gray-400">
                            Employee information
                          </p>
                          <div className="grid gap-3 md:grid-cols-[140px_minmax(190px,1.2fr)_minmax(210px,1fr)]">
                            <Field label="Employee number">
                              <Input
                                required
                                inputMode="numeric"
                                placeholder="7 digits"
                                value={employee.employeeId}
                                onChange={(e) =>
                                  updateEmployee(
                                    index,
                                    "employeeId",
                                    e.target.value.replace(/\D/g, "").slice(0, 7),
                                  )
                                }
                              />
                            </Field>
                            <CompanyUserField
                              label="Employee name"
                              required
                              value={employee.employeeName}
                              placeholder="Search name or email..."
                              onChange={(value) =>
                                updateEmployee(index, "employeeName", value)
                              }
                              onSelectUser={(person) => {
                                updateEmployee(index, "employeeName", person.displayName);
                                updateEmployee(index, "employeeEmail", person.mail);
                                if (person.employeeId)
                                  updateEmployee(index, "employeeId", person.employeeId);
                              }}
                            />
                            <Field label="Company email">
                              <Input
                                required={employee.transportRequired}
                                type="email"
                                placeholder="name@yageo.com"
                                value={employee.employeeEmail || ""}
                                onChange={(e) =>
                                  updateEmployee(index, "employeeEmail", e.target.value)
                                }
                              />
                            </Field>
                          </div>
                        </div>

                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-gray-400">
                            OT work
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_130px_130px_150px]">
                            <Field label="Description of work">
                              <Input
                                placeholder="e.g. Customer support"
                                value={employee.workDescription}
                                onChange={(e) =>
                                  updateEmployee(index, "workDescription", e.target.value)
                                }
                              />
                            </Field>
                            <Field label="OT start">
                              <TimeMaskInput
                                required
                                value={employee.workStart}
                                onChange={(value) =>
                                  updateEmployee(index, "workStart", value)
                                }
                                quickTimes={["08:00", "17:20"]}
                              />
                            </Field>
                            <Field label="OT end">
                              <TimeMaskInput
                                required
                                value={employee.workEnd}
                                onChange={(value) =>
                                  updateEmployee(index, "workEnd", value)
                                }
                                quickTimes={["16:45", "19:00", "20:00"]}
                              />
                            </Field>
                            <Field label="Weekly hours (max 60)">
                              <WeeklyHoursInput
                                required
                                value={employee.totalWeeklyHours}
                                onChange={(value) =>
                                  updateEmployee(index, "totalWeeklyHours", value)
                                }
                              />
                            </Field>
                          </div>
                          {index === 0 && employees.length > 1 && (
                            <button
                              type="button"
                              onClick={applyFirstScheduleToAll}
                              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                            >
                              <Copy size={13} /> Apply this time and weekly hours to all employees
                            </button>
                          )}
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4">
                          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-blue-700">
                            <MapPin size={15} /> Transportation
                          </p>
                          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                            <Field label="Need transportation?">
                              <Select
                                value={employee.transportRequired ? "yes" : "no"}
                                onChange={(e) =>
                                  updateEmployee(
                                    index,
                                    "transportRequired",
                                    e.target.value === "yes",
                                  )
                                }
                              >
                                <option value="yes">Yes, request transport</option>
                                <option value="no">No transport needed</option>
                              </Select>
                            </Field>
                            {employee.transportRequired ? (
                              <Field label="Drop-off point / bus stop">
                                <Input
                                  required
                                  placeholder="Enter the employee's drop-off point"
                                  value={employee.busStop}
                                  onChange={(e) =>
                                    updateEmployee(index, "busStop", e.target.value)
                                  }
                                />
                              </Field>
                            ) : (
                              <div className="flex items-end pb-2 text-xs text-blue-700">
                                This employee will not be included in vehicle assignment.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addEmployee}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/40 bg-brand-light/40 px-4 py-3 text-sm font-semibold text-brand transition hover:border-brand hover:bg-brand-light"
                >
                  <Plus size={16} /> Add another employee
                </button>
              </Card>

              {error && (
                <p className="rounded-lg border border-danger/20 bg-danger-light p-3 text-sm text-danger">
                  {error}
                </p>
              )}
              <FormActions submitting={submitting} onReset={handleReset} />
            </div>          ) : (
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
                      if (person.department) setDepartment(normalizeDepartment(person.department, person.jobTitle));
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

      {showSubmitConfirmation && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-confirmation-title"
        >
          <div className="w-full max-w-md border border-line bg-white shadow-modal">
            <div className="border-b border-line px-5 py-4">
              <h2 id="submit-confirmation-title" className="text-lg font-semibold text-ink">
                Confirm request submission
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Please review the details before sending this request.
              </p>
            </div>

            <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 px-5 py-4 text-sm">
              <dt className="text-gray-500">Request type</dt>
              <dd className="font-medium text-ink">
                {requestType === "overtime" ? "Overtime / Holiday Work" : "Car Service Requisition"}
              </dd>
              <dt className="text-gray-500">Requester</dt>
              <dd className="font-medium text-ink">{requesterName || "—"}</dd>
              <dt className="text-gray-500">Using date</dt>
              <dd className="font-medium text-ink">{usingDate || "—"}</dd>
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

function RequestProgress() {
  const steps = [
    { icon: <MailCheck size={17} />, title: "Submit request", body: "Enter company and trip details" },
    { icon: <ShieldCheck size={17} />, title: "Department approval", body: "Sent to your department approver" },
    { icon: <Car size={17} />, title: "Transport assigned", body: "Receive vehicle details by email" },
  ];

  return (
    <section className="mt-8 rounded-2xl border border-line bg-white px-5 py-5 shadow-panel sm:px-6">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
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
              <p className="mt-0.5 text-xs leading-5 text-gray-500">{step.body}</p>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="absolute right-0 top-2 hidden text-gray-300 sm:block" size={16} />
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
        <p className="text-sm font-semibold text-ink">Approval is routed automatically</p>
        <p className="mt-0.5 text-xs leading-5 text-gray-600">
          {department
            ? `This request will be sent to the active approver(s) for ${department}.`
            : "Select a department and the system will send this request to its active approver(s)."}
          {" "}You do not need to enter a manager email.
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
function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white px-4 sm:px-6 shadow-sm">
        <div className="mx-auto flex h-16 min-w-0 max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-12 items-center justify-center">
              <img src="/tokin-logo.png" alt="TOKIN Logo" className="h-8 w-auto object-contain sm:h-10" />
            </div>
            <div className="hidden h-8 w-px bg-gray-200 sm:block" />
            <div>
              <p className="text-[15px] font-bold text-ink leading-tight">
                Transport Portal
              </p>
              <p className="hidden text-[11px] font-medium text-gray-500 sm:block">
                Car Service Requisition
              </p>
            </div>
          </div>
          <a
            href="/admin/login"
            className="shrink-0 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink shadow-sm transition hover:bg-gray-50 hover:text-brand sm:px-3 sm:text-xs"
          >
            Admin portal
          </a>
        </div>
      </header>
      <div className="mx-auto min-w-0 max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
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
      className="group flex min-w-0 flex-col rounded-2xl border border-line bg-white p-6 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:h-14 sm:w-14">
          {icon}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
          {note}
        </span>
      </div>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
        {eyebrow}
      </p>
      <h2 className="mt-1 break-words text-lg font-bold leading-snug text-ink">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">{body}</p>
      <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-brand">
        <span>Start request</span>
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
