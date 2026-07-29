"use client";

import { useEffect, useState } from "react";
import { Car, CheckCircle2, Clock3, Plus, Trash2 } from "lucide-react";
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
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [success, setSuccess] = useState<{
    requestNo: string;
    emailStatus: string;
    manageUrl?: string;
  } | null>(null);

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
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-ink">
              Request Transportation
            </h1>
            <p className="mt-2 text-base text-gray-500">
              No account required. Select the type of request below to get
              started.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Choice
              icon={<Clock3 />}
              title="OVERTIME / HOLIDAY WORK"
              body="Transportation for employees working overtime or on a public holiday."
              onClick={() => setRequestType("overtime")}
            />
            <Choice
              icon={<Car />}
              title="CAR SERVICE REQUISITION"
              body="Vehicle request for business travel outside the company premises."
              onClick={() => setRequestType("outside_company")}
            />
          </div>
        </div>
      </PublicFrame>
    );

  return (
    <PublicFrame>
      <div className="relative mx-auto max-w-[1500px]">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <p className="text-sm font-semibold uppercase text-brand">
                TOKIN Transport
              </p>
              <h1 className="text-2xl font-bold">
                {requestType === "overtime"
                  ? "OVERTIME / HOLIDAY WORK"
                  : "CAR SERVICE REQUISITION"}
              </h1>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40">
                <Input
                  required
                  type="date"
                  min={getTodayString()}
                  className="h-9"
                  value={usingDate}
                  onChange={(e) => setUsingDate(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-9"
                onClick={() => setRequestType(null)}
              >
                Change request type
              </Button>
            </div>
          </div>

          {requestType === "overtime" ? (
            /* Overtime form layout (stacked layout: top grid, bottom employees table) */
            <div className="space-y-5">
              {/* Top Section: Requester and Approver in grid on Desktop, stack on Mobile */}
              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-5">
                  <h2 className="mb-1 font-bold">Requester information</h2>
                  <p className="mb-4 text-xs text-gray-500">
                    Search name or email to auto-fill company directory details.
                  </p>
                  <div className="border border-line bg-canvas p-4 rounded-xl grid gap-4 sm:grid-cols-2">
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
                        placeholder="name@yageo.com"
                        value={requesterEmail}
                        onChange={(e) => setRequesterEmail(e.target.value)}
                      />
                    </Field>
                  </div>
                </Card>

                <Card className="border-blue-200 bg-blue-50/60 p-5">
                  <h2 className="font-bold text-ink">Approval routing</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    The system routes this request to the active approver(s) assigned to the selected department. You do not need to enter a manager email.
                  </p>
                </Card>
              </div>

              {/* Bottom Section: Employees List */}
              <div className="space-y-5">
                {/* Desktop View: Excel-like horizontal table */}
                <div className="hidden lg:block">
                  <Card className="p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-bold">Employees</h2>
                        <p className="text-sm text-gray-500">
                          Add everyone included in this OT request. Type
                          employee name to search directory.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto pb-3">
                      <table className="w-full text-left border-collapse min-w-[1050px]">
                        <thead>
                          <tr className="border-b border-line text-xs font-semibold text-gray-400 uppercase">
                            <th className="pb-3 pr-2 w-8 text-center">#</th>
                            <th className="pb-3 pr-2 w-[70px]">Emp No.</th>
                            <th className="pb-3 pr-2 w-[180px]">
                              Employee Name
                            </th>
                            <th className="pb-3 pr-2 w-[160px]">
                              Company Email
                            </th>
                            <th className="pb-3 pr-2 w-[130px]">
                              Work Description
                            </th>
                            <th className="pb-3 pr-2 w-[85px]">OT Start</th>
                            <th className="pb-3 pr-2 w-[85px]">OT End</th>
                            <th className="pb-3 pr-2 w-[85px]">Weekly Hours</th>
                            <th className="pb-3 pr-2 w-[100px]">Transport</th>
                            <th className="pb-3 pr-2 w-[185px]">Bus Stop</th>
                            <th className="pb-3 text-center w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {employees.map((employee, index) => (
                            <tr key={index} className="align-middle">
                              <td className="py-3 pr-2 text-sm font-semibold text-gray-400 text-center">
                                {index + 1}
                              </td>
                              <td className="py-3 pr-2">
                                <Input
                                  required
                                  className="px-2 text-center"
                                  value={employee.employeeId}
                                  onChange={(e) => {
                                    const val = e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 7);
                                    updateEmployee(index, "employeeId", val);
                                  }}
                                />
                              </td>
                              <td className="py-3 pr-2">
                                <CompanyUserField
                                  label=""
                                  required
                                  value={employee.employeeName}
                                  placeholder="Search name..."
                                  onChange={(val) =>
                                    updateEmployee(index, "employeeName", val)
                                  }
                                  onSelectUser={(person) => {
                                    updateEmployee(
                                      index,
                                      "employeeName",
                                      person.displayName,
                                    );
                                    updateEmployee(
                                      index,
                                      "employeeEmail",
                                      person.mail,
                                    );
                                    if (person.employeeId)
                                      updateEmployee(
                                        index,
                                        "employeeId",
                                        person.employeeId,
                                      );
                                  }}
                                />
                              </td>
                              <td className="py-3 pr-2">
                                <Input
                                  required={employee.transportRequired}
                                  type="email"
                                  placeholder="name@yageo.com"
                                  value={employee.employeeEmail || ""}
                                  onChange={(e) =>
                                    updateEmployee(
                                      index,
                                      "employeeEmail",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="py-3 pr-2">
                                <Input
                                  placeholder="Describe work..."
                                  value={employee.workDescription}
                                  onChange={(e) =>
                                    updateEmployee(
                                      index,
                                      "workDescription",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="py-3 pr-2">
                                <TimeMaskInput
                                  required
                                  value={employee.workStart}
                                  onChange={(val) =>
                                    updateEmployee(index, "workStart", val)
                                  }
                                  quickTimes={["08:00", "17:20"]}
                                />
                              </td>
                              <td className="py-3 pr-2">
                                <TimeMaskInput
                                  required
                                  value={employee.workEnd}
                                  onChange={(val) =>
                                    updateEmployee(index, "workEnd", val)
                                  }
                                  quickTimes={["16:45", "19:00", "20:00"]}
                                />
                              </td>
                              <td className="py-3 pr-2">
                                <WeeklyHoursInput
                                  required
                                  value={employee.totalWeeklyHours}
                                  onChange={(val) =>
                                    updateEmployee(
                                      index,
                                      "totalWeeklyHours",
                                      val,
                                    )
                                  }
                                />
                              </td>
                              <td className="py-3 pr-2">
                                <Select
                                  value={
                                    employee.transportRequired ? "yes" : "no"
                                  }
                                  onChange={(e) =>
                                    updateEmployee(
                                      index,
                                      "transportRequired",
                                      e.target.value === "yes",
                                    )
                                  }
                                >
                                  <option value="yes">Required</option>
                                  <option value="no">Not required</option>
                                </Select>
                              </td>
                              <td className="py-3 pr-2">
                                <Input
                                  required={employee.transportRequired}
                                  disabled={!employee.transportRequired}
                                  value={employee.busStop}
                                  onChange={(e) =>
                                    updateEmployee(
                                      index,
                                      "busStop",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="py-3 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={employees.length === 1}
                                  onClick={() =>
                                    setEmployees((current) =>
                                      current.filter((_, i) => i !== index),
                                    )
                                  }
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setEmployees((current) => [
                            ...current,
                            emptyEmployee(),
                          ])
                        }
                      >
                        <Plus size={16} /> Add employee
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Mobile View: Stacked separate cards (Layout 1) */}
                <div className="block lg:hidden space-y-4">
                  <Card className="p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-bold">Employees</h2>
                        <p className="text-sm text-gray-500">
                          Add everyone included in this OT request. Type
                          employee name to search directory.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {employees.map((employee, index) => (
                        <div
                          key={index}
                          className="border border-line bg-canvas p-4 shadow-panel"
                        >
                          <div className="mb-3 flex justify-between items-center">
                            <p className="font-bold text-ink text-sm">
                              Employee {index + 1}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={employees.length === 1}
                              onClick={() =>
                                setEmployees((current) =>
                                  current.filter((_, i) => i !== index),
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="Employee number">
                              <Input
                                required
                                className="px-2"
                                value={employee.employeeId}
                                onChange={(e) => {
                                  const val = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 7);
                                  updateEmployee(index, "employeeId", val);
                                }}
                              />
                            </Field>
                            <CompanyUserField
                              label="Employee name"
                              required
                              value={employee.employeeName}
                              placeholder="Search name or email..."
                              onChange={(val) =>
                                updateEmployee(index, "employeeName", val)
                              }
                              onSelectUser={(person) => {
                                updateEmployee(
                                  index,
                                  "employeeName",
                                  person.displayName,
                                );
                                updateEmployee(
                                  index,
                                  "employeeEmail",
                                  person.mail,
                                );
                                if (person.employeeId)
                                  updateEmployee(
                                    index,
                                    "employeeId",
                                    person.employeeId,
                                  );
                              }}
                            />
                            <Field label="Company email">
                              <Input
                                required={employee.transportRequired}
                                type="email"
                                placeholder="name@yageo.com"
                                value={employee.employeeEmail || ""}
                                onChange={(e) =>
                                  updateEmployee(
                                    index,
                                    "employeeEmail",
                                    e.target.value,
                                  )
                                }
                              />
                            </Field>
                          </div>
                          <div className="mt-3">
                            <Field label="Description of work">
                              <Textarea
                                className="min-h-[80px]"
                                value={employee.workDescription}
                                placeholder="Describe the work this employee will be performing during overtime..."
                                onChange={(e) =>
                                  updateEmployee(
                                    index,
                                    "workDescription",
                                    e.target.value,
                                  )
                                }
                              />
                            </Field>
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Field label="OT start">
                              <TimeMaskInput
                                required
                                value={employee.workStart}
                                onChange={(val) =>
                                  updateEmployee(index, "workStart", val)
                                }
                                quickTimes={["08:00", "17:20"]}
                              />
                            </Field>
                            <Field label="OT end">
                              <TimeMaskInput
                                required
                                value={employee.workEnd}
                                onChange={(val) =>
                                  updateEmployee(index, "workEnd", val)
                                }
                                quickTimes={["16:45", "19:00", "20:00"]}
                              />
                            </Field>
                            <Field label="Weekly hours (max 60)">
                              <WeeklyHoursInput
                                required
                                value={employee.totalWeeklyHours}
                                onChange={(val) =>
                                  updateEmployee(index, "totalWeeklyHours", val)
                                }
                              />
                            </Field>
                            <Field label="Transportation">
                              <Select
                                value={
                                  employee.transportRequired ? "yes" : "no"
                                }
                                onChange={(e) =>
                                  updateEmployee(
                                    index,
                                    "transportRequired",
                                    e.target.value === "yes",
                                  )
                                }
                              >
                                <option value="yes">Required</option>
                                <option value="no">Not required</option>
                              </Select>
                            </Field>
                            <Field label="Bus stop">
                              <Input
                                required={employee.transportRequired}
                                disabled={!employee.transportRequired}
                                value={employee.busStop}
                                onChange={(e) =>
                                  updateEmployee(
                                    index,
                                    "busStop",
                                    e.target.value,
                                  )
                                }
                              />
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setEmployees((current) => [
                            ...current,
                            emptyEmployee(),
                          ])
                        }
                      >
                        <Plus size={16} /> Add employee
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Submit actions */}
                {error && (
                  <p className="border-l-2 border-danger bg-danger-light p-3 pl-4 text-sm text-danger mt-4">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-3 pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleReset}
                    disabled={submitting}
                  >
                    Reset
                  </Button>
                  <Button disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit request"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Outside Company Requisition Form (Stacked cards layout) */
            <div className="space-y-5">
              <Card className="p-5">
                <h2 className="mb-1 font-bold">Requester information</h2>
                <p className="mb-4 text-xs text-gray-500">
                  Search name or email to auto-fill company directory details.
                </p>
                <div className="border border-line bg-canvas p-4 rounded-xl grid gap-4 sm:grid-cols-2">
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

                <Card className="border-blue-200 bg-blue-50/60 p-5">
                  <h2 className="font-bold text-ink">Approval routing</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    The system routes this request to the active approver(s) assigned to the selected department. You do not need to enter a manager email.
                  </p>
                </Card>

              <Card className="p-5">
                <h2 className="mb-4 font-bold">Request details</h2>
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
              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                  disabled={submitting}
                >
                  Reset
                </Button>
                <Button disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit request"}
                </Button>
              </div>
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
          {/* Floating Guidelines Sidebar Tab */}
          <button
            type="button"
            onClick={() => setShowGuidelines(true)}
            className="fixed bottom-6 left-4 z-40 flex items-center gap-2 border border-brand-dark bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-modal transition hover:bg-brand-dark"
          >
            <Clock3 size={17} />
            <span>OT rules</span>
          </button>

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

function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white px-4 sm:px-6 shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 items-center justify-center">
              <img src="/tokin-logo.png" alt="TOKIN Logo" className="h-10 w-auto object-contain" />
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-[15px] font-bold text-ink leading-tight">
                Transport Portal
              </p>
              <p className="text-[11px] text-gray-500 font-medium">
                Car Service Requisition
              </p>
            </div>
          </div>
          <a
            href="/admin/login"
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gray-50 hover:text-brand transition shadow-sm"
          >
            Admin Login
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">{children}</div>
    </main>
  );
}

function Choice({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-line bg-white p-8 text-left shadow-card transition-all duration-200 hover:border-brand/40 hover:shadow-card-hover hover:-translate-y-0.5"
    >
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
        {icon}
      </span>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
      <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-brand">
        <span>Get started</span>
        <svg
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
