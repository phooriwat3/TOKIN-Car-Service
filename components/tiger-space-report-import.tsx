"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, SearchCheck, Upload } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge, Button, Card } from "@/components/ui";
import {
  matchTigerSpaceReport,
  parseTigerSpaceSheet,
  type TigerSpaceMatchStatus,
  type TigerSpaceReportRow,
} from "@/lib/tiger-space-report";

const matchLabels: Record<TigerSpaceMatchStatus, string> = {
  exact: "Exact match",
  time_mismatch: "Check time",
  ambiguous: "Multiple matches",
  not_found: "Not found yet",
};

const matchTones: Record<TigerSpaceMatchStatus, string> = {
  exact: "approved",
  time_mismatch: "changes_requested",
  ambiguous: "pending_approval",
  not_found: "pending_ot_verification",
};

export function TigerSpaceReportImport() {
  const { data, updateBooking } = useApp();
  const [fileName, setFileName] = useState("");
  const [reportRows, setReportRows] = useState<TigerSpaceReportRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approvedOnlyConfirmed, setApprovedOnlyConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const matches = useMemo(
    () => matchTigerSpaceReport(data.bookings, reportRows),
    [data.bookings, reportRows],
  );
  const exactCount = matches.filter((item) => item.status === "exact").length;
  const reviewCount = matches.filter(
    (item) => item.status === "time_mismatch" || item.status === "ambiguous",
  ).length;
  const missingCount = matches.filter(
    (item) => item.status === "not_found",
  ).length;

  const loadFile = async (file: File) => {
    setLoading(true);
    setMessage("");
    setApprovedOnlyConfirmed(false);
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error("Upload a modern .xlsx Tiger Space report.");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("The report is too large. Upload a file under 10 MB.");
      }

      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const parsed = workbook.worksheets.flatMap((sheet) => {
        const rows: unknown[][] = [];
        sheet.eachRow({ includeEmpty: true }, (row) => {
          rows.push(
            Array.from({ length: Math.max(27, row.cellCount) }, (_item, index) =>
              row.getCell(index + 1).text || null,
            ),
          );
        });
        return parseTigerSpaceSheet(sheet.name, rows);
      });
      if (!parsed.length)
        throw new Error(
          "No Tiger Space OT rows were found. Check that this is the normal OT report.",
        );
      setFileName(file.name);
      setReportRows(parsed);
      const nextMatches = matchTigerSpaceReport(data.bookings, parsed);
      setSelected(
        new Set(
          nextMatches
            .filter((item) => item.status === "exact")
            .map((item) => item.booking.id),
        ),
      );
      setMessage(
        `Read ${parsed.length} approved OT rows from ${workbook.worksheets.length} sheet(s).`,
      );
    } catch (cause) {
      setFileName("");
      setReportRows([]);
      setSelected(new Set());
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to read the Tiger Space report.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggle = (bookingId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  };

  const confirmSelected = async () => {
    const chosen = matches.filter(
      (item) =>
        selected.has(item.booking.id) &&
        (item.status === "exact" || item.status === "time_mismatch"),
    );
    if (!chosen.length || !approvedOnlyConfirmed) return;

    setConfirming(true);
    setMessage("");
    try {
      await Promise.all(
        chosen.map((item) => {
          const candidate = item.candidates[0];
          return updateBooking(item.booking.id, {
            status: "approved",
            otVerificationStatus: "verified",
            otVerifiedAt: new Date().toISOString(),
            otVerificationNote:
              `HR confirmed from ${fileName}; ${candidate.employeeId} ` +
              `${candidate.otDate} ${candidate.startTime}-${candidate.endTime}` +
              (item.status === "time_mismatch"
                ? " (time difference manually accepted)"
                : ""),
          });
        }),
      );
      setSelected(new Set());
      setMessage(
        `Verified ${chosen.length} transport request(s). Remaining unmatched requests stay pending.`,
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to confirm the selected requests.",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card className="mb-6 overflow-hidden border-l-4 border-l-sky-500">
      <div className="flex flex-col gap-4 border-b border-line bg-sky-50/60 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-sky-700" size={20} />
            <h2 className="font-bold text-ink">Tiger Space report matching</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
            Upload the approved normal-OT report (.xlsx). The system
            suggests matches using employee number, OT date, and start/end time.
            HR remains the final verifier.
          </p>
        </div>
        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
          <Upload size={16} />
          {loading ? "Reading..." : "Choose report"}
          <input
            type="file"
            accept=".xlsx"
            disabled={loading || confirming}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {reportRows.length > 0 && (
        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Report rows" value={reportRows.length} />
            <Metric label="Exact matches" value={exactCount} tone="text-success" />
            <Metric label="Needs review" value={reviewCount} tone="text-amber-700" />
            <Metric label="Not found yet" value={missingCount} tone="text-sky-700" />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={approvedOnlyConfirmed}
              onChange={(event) =>
                setApprovedOnlyConfirmed(event.target.checked)
              }
              className="mt-0.5 h-4 w-4 accent-brand"
            />
            <span>
              <strong className="block">HR confirms this is an approved-OT report.</strong>
              The upload itself does not approve transport. Selected rows are
              verified only after pressing the confirmation button.
            </span>
          </label>

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Transport request</th>
                  <th className="px-4 py-3">Requested OT</th>
                  <th className="px-4 py-3">Tiger Space candidate</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {matches.map((item) => {
                  const candidate = item.candidates[0];
                  const selectable =
                    item.status === "exact" ||
                    item.status === "time_mismatch";
                  return (
                    <tr key={item.booking.id} className="align-top">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          disabled={!selectable || confirming}
                          checked={selected.has(item.booking.id)}
                          onChange={() => toggle(item.booking.id)}
                          className="h-4 w-4 accent-brand"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-ink">
                          {item.booking.bookingNo}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.booking.requesterEmployeeId} ·{" "}
                          {item.booking.requesterName}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        {item.booking.usingDate}
                        <br />
                        {item.booking.startTime}-{item.booking.endTime}
                      </td>
                      <td className="px-4 py-4">
                        {candidate ? (
                          <>
                            <p className="font-mono text-xs">
                              {candidate.otDate} · {candidate.startTime}-
                              {candidate.endTime}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {candidate.employeeId} · {candidate.employeeName}
                            </p>
                            {item.candidates.length > 1 && (
                              <p className="mt-1 text-xs font-semibold text-amber-700">
                                {item.candidates.length} possible rows
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">No candidate</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge status={matchTones[item.status]}>
                          {matchLabels[item.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/bookings/${item.booking.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <SearchCheck size={14} /> Open request
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!matches.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      No transport requests are waiting for OT verification.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {selected.size} request(s) selected from {fileName}
            </p>
            <Button
              type="button"
              disabled={
                confirming || !approvedOnlyConfirmed || selected.size === 0
              }
              onClick={confirmSelected}
            >
              <CheckCircle2 size={16} />
              {confirming ? "Confirming..." : "Confirm selected matches"}
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p className="border-t border-line bg-canvas px-5 py-3 text-sm text-gray-700">
          {message}
        </p>
      )}
    </Card>
  );
}

function Metric({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
