"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Zap } from "lucide-react";
import { Badge, Button, Card, Field, Textarea } from "@/components/ui";
import { BrandLogo } from "@/components/brand";
import { approverPositionLabel, getApproverBadgeClass } from "@/lib/business";
import { destinationStops } from "@/lib/route-stops";
import { DigitalTransportTicket } from "@/components/transport-booking-ui";

type ApprovalRequest = {
  requestNo: string;
  status: string;
  revisionNo: number;
  requestType: string;
  urgent?: boolean;
  urgentReason?: string;
  requester: {
    name: string;
    email: string;
    employeeId?: string;
    department: string;
  };
  approver: { name: string; email: string; position?: string };
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  meetingPoint: string;
  withStaff?: boolean;
  numPassengers: number;
  passengers: Array<{ name: string; seq: number }>;
  overtimeEmployees: Array<{
    employee_id: string;
    employee_name: string;
    work_description: string;
    work_start: string;
    work_end: string;
    transport_required: boolean;
    bus_stop?: string;
    seq: number;
  }>;
};

const apiConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey)
    throw new Error("Approval service is not configured.");
  return { supabaseUrl, publishableKey };
};
const readResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text } as Record<string, unknown>;
  }
};

const responseError = (body: Record<string, unknown>, fallback: string) => {
  if (typeof body.error === "string" && body.error) return body.error;
  if (typeof body.message === "string" && body.message) return body.message;
  return fallback;
};

export default function PublicApproveRequest({
  initialToken,
  initialRequest,
  initialError,
}: {
  initialToken?: string;
  initialRequest?: ApprovalRequest;
  initialError?: string;
}) {
  const [request, setRequest] = useState<ApprovalRequest | null>(
    initialRequest ?? null,
  );
  const [state, setState] = useState<
    "loading" | "ready" | "error" | "complete"
  >(
    initialRequest
      ? "ready"
      : initialError
        ? "error"
        : initialToken
          ? "loading"
          : "error",
  );
  const [message, setMessage] = useState(
    initialError || (initialToken ? "" : "Approval link is missing."),
  );
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    if (!initialToken || initialRequest || initialError) return;
    void load();
  }, [initialToken, initialRequest, initialError]);

  async function load() {
    try {
      const { supabaseUrl, publishableKey } = apiConfig();
      const response = await fetch(
        `${supabaseUrl}/functions/v1/public-approval-access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: publishableKey,
          },
          body: JSON.stringify({ token: initialToken }),
        },
      );
      const body = await readResponse(response);
      if (!response.ok)
        throw new Error(
          responseError(
            body,
            `Unable to open approval (HTTP ${response.status}).`,
          ),
        );
      setRequest(body.request as ApprovalRequest);
      setState("ready");
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Unable to open approval.",
      );
      setState("error");
    }
  }

  async function decide(action: "approve" | "reject" | "request_changes") {
    if (!initialToken || saving) return;
    if (action !== "approve" && !comments.trim()) {
      setMessage(
        "Please enter comments before rejecting or requesting changes.",
      );
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const { supabaseUrl, publishableKey } = apiConfig();
      const response = await fetch(
        `${supabaseUrl}/functions/v1/public-approval-action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: publishableKey,
          },
          body: JSON.stringify({ token: initialToken, action, comments }),
        },
      );
      const body = await readResponse(response);
      if (!response.ok)
        throw new Error(
          responseError(
            body,
            `Unable to record decision (HTTP ${response.status}).`,
          ),
        );
      setResult(String(body.status || "updated"));
      setState("complete");
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Unable to record decision.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading")
    return (
      <Page>
        <Card className="p-10 text-center">
          <Loader2 className="mx-auto animate-spin text-brand" />
          <p className="mt-3 text-sm text-gray-600">Loading request...</p>
        </Card>
      </Page>
    );
  if (state === "error")
    return (
      <Page>
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto text-amber-600" />
          <h1 className="mt-3 text-xl font-bold">Approval unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </Card>
      </Page>
    );
  if (state === "complete")
    return (
      <Page>
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto text-green-600" size={40} />
          <h1 className="mt-3 text-xl font-bold">Decision recorded</h1>
          <p className="mt-2 text-sm text-gray-600">
            Request {request?.requestNo} is now {result.replace("_", " ")}. This
            link cannot be used again.
          </p>
        </Card>
      </Page>
    );
  if (!request) return null;

  const passengerNames =
    request.requestType === "overtime"
      ? request.overtimeEmployees
          .filter((item) => item.transport_required)
          .map(
            (item) =>
              `${item.employee_name}${item.bus_stop ? ` - ${item.bus_stop}` : ""}`,
          )
      : request.passengers
          .sort((a, b) => a.seq - b.seq)
          .map((item) => item.name);

  const stops = destinationStops(request.destination);

  return (
    <Page>
      {/* Urgent Priority Banner */}
      {request.urgent && (
        <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <Zap className="h-5 w-5 fill-red-600 text-red-600" />
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-xs text-red-800">
                Priority Review Required · Urgent Trip
              </p>
              <p className="mt-1 text-sm font-semibold text-red-950">
                {request.urgentReason || "Requester flagged this trip as high urgency. Immediate decision requested."}
              </p>
            </div>
          </div>
        </div>
      )}

      <DigitalTransportTicket
        requestNo={request.requestNo}
        serviceLabel={request.requestType === "overtime" ? "Overtime transport approval" : "Off-site transport approval"}
        statusLabel="Decision required"
        origin={request.pickupLocation}
        destination={request.destination}
        date={request.usingDate}
        time={`${request.startTime} – ${request.endTime}`}
      >
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {request.approver.position && (
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${getApproverBadgeClass(
                request.approver.position,
              )}`}
            >
              {approverPositionLabel(request.approver.position)}
            </span>
          )}
          <Badge status={request.status}>
            Revision {request.revisionNo} - Pending approval
          </Badge>
        </div>
        <h2 className="font-bold">Request details</h2>
        <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Info label="Requester" value={request.requester.name} />
          <Info label="Department" value={request.requester.department} />
          <Info
            label="Request type"
            value={
              request.requestType === "overtime"
                ? "OVERTIME TRANSPORT"
                : "OFF-SITE BUSINESS TRANSPORT"
            }
          />
          <Info
            label="Date and time"
            value={`${request.usingDate} - ${request.startTime} to ${request.endTime}`}
          />
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase text-gray-500">Route & Itinerary</p>
            {stops.length > 1 ? (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink font-medium">
                  <span className="rounded bg-slate-100 px-2 py-0.5 border border-slate-200 text-slate-700">
                    {request.pickupLocation} (Pickup)
                  </span>
                  {stops.map((stop, idx) => (
                    <span key={idx} className="flex items-center gap-1.5">
                      <span className="text-brand font-bold">➔</span>
                      <span
                        className={`rounded px-2 py-0.5 border ${
                          idx === stops.length - 1
                            ? "bg-brand text-white border-brand font-semibold shadow-xs"
                            : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        {stop}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-amber-700">
                  ⚠️ Multi-stop trip ({stops.length} destinations scheduled)
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm font-medium text-ink">
                {request.pickupLocation} to {request.destination}
              </p>
            )}
          </div>
          <Info label="Passengers" value={String(request.numPassengers)} />
          <Info
            label="Meeting point"
            value={
              request.meetingPoint === "loading_area"
                ? "Loading area"
                : "Front area"
            }
          />
        </div>
        <div className="mt-5 border-t border-line pt-5">
          <Info label="Purpose" value={request.purpose} />
        </div>
        {passengerNames.length > 0 && (
          <div className="mt-5 border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Passenger details
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              {passengerNames.map((name, index) => (
                <li key={index}>{name}</li>
              ))}
            </ul>
          </div>
        )}
      </DigitalTransportTicket>
      <Card className="mt-5 p-6">
        <Field label="Comments (required for Reject or Request changes)">
          <Textarea
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            placeholder="Add a reason or instruction for the requester..."
          />
        </Field>
        {message && (
          <p className="mt-3 text-sm font-medium text-red-600">{message}</p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => decide("request_changes")}
          >
            Request changes
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={saving}
            onClick={() => decide("reject")}
          >
            Reject
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => decide("approve")}
          >
            {saving ? "Saving..." : "Approve"}
          </Button>
        </div>
      </Card>
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen border-t-4 border-t-brand-900 bg-[radial-gradient(circle_at_top_right,rgba(218,234,249,0.72),transparent_34%),var(--canvas)] px-4 py-6 text-ink sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-white px-2 shadow-xs">
            <BrandLogo compact />
          </div>
          <div>
            <p className="font-bold">TOKIN Transport</p>
            <p className="text-xs text-gray-500">Secure approval page</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm">{value || "-"}</p>
    </div>
  );
}
