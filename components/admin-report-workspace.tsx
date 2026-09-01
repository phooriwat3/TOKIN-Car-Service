"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, FileText, Search } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge, Button, Card, Input } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import type { Booking, Driver, Vehicle } from "@/lib/types";

type Passenger = { id: string; name: string; dropOff: string };
type Group = {
  key: string;
  plate: string;
  vehicle: string;
  driver: string;
  phone: string;
  passengers: Passenger[];
};
type Report = { booking: Booking; groups: Group[] };

export function AdminReportWorkspace() {
  const { data } = useApp();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const reports = useMemo(
    () =>
      data.bookings
        .map((booking) => ({
          booking,
          groups: groupsFor(booking, data.vehicles, data.drivers),
        }))
        .filter((item) => item.groups.length)
        .sort((a, b) =>
          String(b.booking.assignment?.assignedAt).localeCompare(
            String(a.booking.assignment?.assignedAt),
          ),
        ),
    [data.bookings, data.drivers, data.vehicles],
  );
  const filtered = useMemo(
    () =>
      reports.filter(({ booking, groups }) => {
        if (date && booking.usingDate !== date) return false;
        const q = search.trim().toLowerCase();
        return (
          !q ||
          [
            booking.bookingNo,
            booking.requesterName,
            booking.department,
            booking.destination,
            ...groups.flatMap((group) => [group.plate, group.driver]),
          ].some((value) => String(value).toLowerCase().includes(q))
        );
      }),
    [date, reports, search],
  );
  useEffect(() => {
    if (!filtered.some((item) => item.booking.id === selectedId))
      setSelectedId(filtered[0]?.booking.id ?? "");
  }, [filtered, selectedId]);
  const selected = reports.find((item) => item.booking.id === selectedId);
  const vehicleTotal = reports.reduce(
    (sum, item) => sum + item.groups.length,
    0,
  );
  const passengerTotal = reports.reduce((sum, item) => sum + count(item), 0);

  return (
    <>
      <PageHeader
        title="Transport reports"
        description="Select an assigned request, review its dispatch list, then export it for the transport provider."
      />
      <div className="grid gap-4 sm:grid-cols-3 print:hidden">
        <Metric label="Dispatch reports" value={reports.length} />
        <Metric label="Vehicles arranged" value={vehicleTotal} />
        <Metric label="Passengers arranged" value={passengerTotal} />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-3 print:hidden">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <FileText size={19} className="text-brand" />
              <div>
                <h2 className="font-bold">Assigned requests</h2>
                <p className="text-xs text-gray-500">
                  {filtered.length} reports
                </p>
              </div>
            </div>
            <div className="relative mt-4">
              <Search
                size={16}
                className="absolute left-3 top-3 text-gray-400"
              />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Request, employee, vehicle..."
              />
            </div>
            <div className="relative mt-3">
              <CalendarDays
                size={16}
                className="absolute left-3 top-3 text-gray-400"
              />
              <Input
                className="pl-9"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            {(search || date) && (
              <button
                className="mt-3 text-xs font-bold text-brand"
                onClick={() => {
                  setSearch("");
                  setDate("");
                }}
              >
                Clear filters
              </button>
            )}
          </Card>
          <div className="max-h-[660px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((item) => (
              <button
                key={item.booking.id}
                onClick={() => setSelectedId(item.booking.id)}
                className={`w-full rounded-lg border p-4 text-left transition ${selectedId === item.booking.id ? "border-brand bg-brand-light shadow-sm" : "border-line bg-white hover:border-brand/40"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{item.booking.bookingNo}</p>
                    <p className="text-xs text-gray-500">
                      {typeLabel(item.booking)}
                    </p>
                  </div>
                  <Badge status={item.booking.status}>
                    {item.booking.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-semibold">
                  {dateText(item.booking.usingDate)} ? {item.booking.startTime}-
                  {item.booking.endTime}
                </p>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {item.booking.requesterName} ? {item.booking.destination}
                </p>
                <p className="mt-3 text-xs font-semibold text-gray-600">
                  {item.groups.length} vehicles ? {count(item)} passengers
                </p>
              </button>
            ))}
            {!filtered.length && (
              <Card className="p-8 text-center text-sm text-gray-500">
                No assigned requests match the filters.
              </Card>
            )}
          </div>
        </aside>
        <main>
          {selected ? (
            <Document report={selected} />
          ) : (
            <Card className="p-12 text-center text-gray-500">
              Select an assigned request.
            </Card>
          )}
        </main>
      </div>
    </>
  );
}

function Document({ report }: { report: Report }) {
  const { booking, groups } = report;
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden print:border-0 print:shadow-none">
        <header className="border-b-4 border-orange-500 bg-brand px-6 py-5 text-white print:border-b-2 print:bg-white print:px-0 print:text-black">
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.15em] text-blue-100 print:text-gray-500">
                TOKIN Electronics (Thailand) Co., Ltd.
              </p>
              <h1 className="mt-1 text-2xl font-bold">
                Vehicle Dispatch Report
              </h1>
              <p className="text-sm text-blue-100 print:text-gray-600">
                For transport service provider
              </p>
            </div>
            <div className="h-fit rounded-lg bg-white/10 px-4 py-3 text-right print:border">
              <p className="text-xs">Request No.</p>
              <p className="font-bold">{booking.bookingNo}</p>
            </div>
          </div>
        </header>
        <div className="grid gap-4 border-b bg-gray-50 px-6 py-5 text-sm sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:px-0">
          <Info label="Service date" value={dateText(booking.usingDate)} />
          <Info
            label="Service time"
            value={`${booking.startTime} - ${booking.endTime}`}
          />
          <Info label="Request type" value={typeLabel(booking)} />
          <Info label="Requester" value={booking.requesterName} />
          <Info label="Department" value={booking.department || "-"} />
          <Info label="Purpose" value={booking.purpose || "-"} />
          <Info label="Pickup location" value={booking.pickupLocation || "-"} />
          <Info label="Destination" value={booking.destination || "-"} />
          <Info label="Confirmed vehicles" value={String(groups.length)} />
        </div>
        <div className="space-y-6 p-6 print:px-0">
          {groups.map((group, groupIndex) => (
            <article
              key={group.key}
              className="break-inside-avoid overflow-hidden rounded-lg border border-gray-300"
            >
              <div className="flex items-center justify-between gap-3 bg-blue-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-white">
                    {groupIndex + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Vehicle / License plate
                    </p>
                    <p className="font-bold">
                      {group.plate} ? {group.vehicle}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand">
                  {group.passengers.length} passengers
                </span>
              </div>
              <div className="grid gap-2 border-y px-4 py-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-gray-500">Driver:</span>{" "}
                  <strong>{group.driver}</strong>
                </p>
                <p>
                  <span className="text-gray-500">Phone:</span>{" "}
                  <strong>{group.phone || "-"}</strong>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                      <th className="px-4 py-3">No.</th>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Employee name</th>
                      <th className="px-4 py-3">Drop-off point</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.passengers.map((p, index) => (
                      <tr
                        key={`${group.key}-${p.id}-${index}`}
                        className="border-t"
                      >
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {p.id || "-"}
                        </td>
                        <td className="px-4 py-3 font-semibold">{p.name}</td>
                        <td className="px-4 py-3">{p.dropOff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
        <footer className="mx-6 mb-6 grid gap-6 border-t pt-5 text-xs text-gray-500 sm:grid-cols-3 print:mx-0">
          <p>Prepared by: __________________</p>
          <p>Provider received by: __________________</p>
          <p>Date / Time: __________________</p>
        </footer>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => exportExcel(report)}>
          <Download size={16} />
          Excel
        </Button>
        <Button onClick={() => exportPdf(report)}>
          <Download size={16} />
          PDF
        </Button>
      </div>
    </section>
  );
}

function groupsFor(
  booking: Booking,
  vehicles: Vehicle[],
  drivers: Driver[],
): Group[] {
  const assignment = booking.assignment;
  if (!assignment) return [];
  if (assignment.manualTransportUnits?.length)
    return assignment.manualTransportUnits
      .map((unit, index) => {
        const employeeIds = Array.from(
          new Set(
            (unit.employeeIds || []).map((id) => id.trim()).filter(Boolean),
          ),
        );
        return {
          key: `${booking.id}-${unit.unitId || index}`,
          plate: unit.licensePlate,
          vehicle: `${unit.brand} ${unit.vehicleType}`,
          driver: unit.driverName,
          phone: unit.driverPhone,
          passengers: employeeIds.map((id) => {
            const employee = booking.overtimeEmployees?.find(
              (item) => item.employeeId === id,
            );
            return {
              id,
              name: employee?.employeeName || id,
              dropOff: employee?.busStop || booking.destination || "-",
            };
          }),
        };
      })
      .filter((group) => group.passengers.length > 0);
  const vehicle = vehicles.find((item) => item.id === assignment.vehicleId);
  const driver = drivers.find((item) => item.id === assignment.driverId);
  if (!vehicle && !driver) return [];
  const names = (
    booking.passengerList.length
      ? booking.passengerList
      : [booking.requesterName]
  )
    .map((name) => name.trim())
    .filter(Boolean);
  return [
    {
      key: `${booking.id}-assigned`,
      plate: vehicle?.licensePlate || "-",
      vehicle: vehicle
        ? `${vehicle.brand} ${vehicle.model} (${vehicle.type})`
        : "-",
      driver: driver?.fullName || "-",
      phone: driver?.phone || "-",
      passengers: names.map((name, i) => ({
        id: i ? "" : booking.requesterEmployeeId || "",
        name,
        dropOff: booking.destination || "-",
      })),
    },
  ];
}

async function exportExcel(report: Report) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "TOKIN Transport";
  const ws = wb.addWorksheet("Vehicle Dispatch", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });
  ws.columns = [
    { width: 7 },
    { width: 18 },
    { width: 30 },
    { width: 32 },
    { width: 24 },
    { width: 22 },
  ];
  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = "TOKIN TRANSPORT - VEHICLE DISPATCH REPORT";
  styleTitle(ws.getCell("A1"));
  ws.getRow(1).height = 32;
  ws.mergeCells("A2:F2");
  ws.getCell("A2").value =
    `Request ${report.booking.bookingNo} | ${dateText(report.booking.usingDate)} | ${report.booking.startTime} - ${report.booking.endTime}`;
  ws.getCell("A2").alignment = { horizontal: "center" };
  ws.getCell("A2").font = { bold: true };
  ws.addRow([
    "Requester",
    report.booking.requesterName,
    "Department",
    report.booking.department || "-",
    "Request type",
    typeLabel(report.booking),
  ]);
  ws.addRow([
    "Pickup",
    report.booking.pickupLocation,
    "Destination",
    report.booking.destination,
    "Purpose",
    report.booking.purpose,
  ]);
  [3, 4].forEach((n) =>
    ws.getRow(n).eachCell((cell, col) => {
      cell.border = border();
      cell.alignment = { wrapText: true, vertical: "middle" };
      if (col % 2) {
        cell.font = { bold: true, color: { argb: "FF173F73" } };
        cell.fill = fill("FFEFF6FF");
      }
    }),
  );
  ws.addRow([]);
  report.groups.forEach((group, gi) => {
    const info = ws.addRow([
      `VEHICLE ${gi + 1}`,
      group.plate,
      group.vehicle,
      `Driver: ${group.driver}`,
      `Phone: ${group.phone || "-"}`,
      `Passengers: ${group.passengers.length}`,
    ]);
    info.eachCell((cell) => {
      cell.fill = fill("FFDCEBFA");
      cell.font = { bold: true, color: { argb: "FF173F73" } };
      cell.border = border();
    });
    const header = ws.addRow([
      "No.",
      "Employee ID",
      "Employee name",
      "Drop-off point",
      "Driver",
      "Driver phone",
    ]);
    header.eachCell((cell) => {
      cell.fill = fill("FF173F73");
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.border = border();
      cell.alignment = { horizontal: "center" };
    });
    group.passengers.forEach((p, i) => {
      const row = ws.addRow([
        i + 1,
        p.id || "-",
        p.name,
        p.dropOff,
        group.driver,
        group.phone || "-",
      ]);
      row.eachCell((cell) => {
        cell.border = border();
        cell.alignment = { wrapText: true, vertical: "middle" };
      });
      if (i % 2)
        row.eachCell((cell) => {
          cell.fill = fill("FFF8FAFC");
        });
    });
    ws.addRow([]);
  });
  ws.views = [{ state: "frozen", ySplit: 2 }];
  ws.headerFooter.oddFooter = `TOKIN Transport | ${report.booking.bookingNo} | Page &P of &N`;
  const buffer = await wb.xlsx.writeBuffer();
  save(new Blob([buffer]), `${safe(report.booking.bookingNo)}-dispatch.xlsx`);
}

async function exportPdf(report: Report) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  await registerPdfFont(pdf);
  const columns = [
    { title: "No.", width: 12 },
    { title: "Employee ID", width: 34 },
    { title: "Employee name", width: 62 },
    { title: "Drop-off point", width: 74 },
  ];
  let y = 36;
  const pageHeader = () => {
    pdf.setFillColor(23, 63, 115);
    pdf.rect(0, 0, 210, 27, "F");
    pdf.setTextColor(255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("TOKIN TRANSPORT", 14, 11);
    pdf.setFontSize(9);
    pdf.text("VEHICLE DISPATCH REPORT", 14, 18);
    pdf.text(report.booking.bookingNo, 196, 13, { align: "right" });
    pdf.setTextColor(30);
    y = 35;
  };
  const next = (height: number) => {
    if (y + height > 282) {
      pdf.addPage();
      pageHeader();
    }
  };
  pageHeader();
  pdf.setFont("Sarabun", "normal");
  pdf.setFontSize(8);
  pdf.text(
    `Date: ${dateText(report.booking.usingDate)}   Time: ${report.booking.startTime}-${report.booking.endTime}`,
    14,
    y,
  );
  y += 5;
  pdf.text(
    `Requester: ${pdfText(report.booking.requesterName)}   Department: ${pdfText(report.booking.department)}`,
    14,
    y,
  );
  y += 5;
  pdf.text(
    `Route: ${pdfText(report.booking.pickupLocation)} to ${pdfText(report.booking.destination)}`,
    14,
    y,
  );
  y += 8;
  report.groups.forEach((group, groupIndex) => {
    next(29 + group.passengers.length * 9);
    pdf.setFillColor(220, 235, 250);
    pdf.rect(14, y, 182, 13, "F");
    pdf.setTextColor(23, 63, 115);
    pdf.setFont("Sarabun", "normal");
    pdf.setFontSize(8);
    pdf.text(
      `VEHICLE ${groupIndex + 1}: ${pdfText(group.plate)} | ${pdfText(group.vehicle)}`,
      17,
      y + 5,
    );
    pdf.setFontSize(7.5);
    pdf.text(
      `Driver: ${pdfText(group.driver)} | Phone: ${pdfText(group.phone || "-")} | ${group.passengers.length} passengers`,
      17,
      y + 10,
    );
    y += 13;
    drawPdfRow(
      pdf,
      y,
      columns,
      columns.map((column) => column.title),
      true,
    );
    y += 9;
    group.passengers.forEach((passenger, index) => {
      next(9);
      drawPdfRow(
        pdf,
        y,
        columns,
        [
          String(index + 1),
          pdfText(passenger.id || "-"),
          pdfText(passenger.name),
          pdfText(passenger.dropOff),
        ],
        false,
        index % 2 === 1,
      );
      y += 9;
    });
    y += 6;
  });
  const total = pdf.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    pdf.setPage(page);
    pdf.setFont("Sarabun", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(100);
    pdf.text(`TOKIN Transport | Page ${page} of ${total}`, 105, 292, {
      align: "center",
    });
  }
  pdf.save(`${safe(report.booking.bookingNo)}-dispatch.pdf`);
}

function drawPdfRow(
  pdf: import("jspdf").jsPDF,
  y: number,
  columns: Array<{ title: string; width: number }>,
  values: string[],
  header: boolean,
  striped = false,
) {
  let x = 14;
  columns.forEach((column, index) => {
    if (header) pdf.setFillColor(23, 63, 115);
    else
      pdf.setFillColor(
        striped ? 248 : 255,
        striped ? 250 : 255,
        striped ? 252 : 255,
      );
    pdf.setDrawColor(200, 207, 216);
    pdf.rect(x, y, column.width, 9, "FD");
    pdf.setTextColor(header ? 255 : 30);
    pdf.setFont(header ? "helvetica" : "Sarabun", header ? "bold" : "normal");
    pdf.setFontSize(7.5);
    const fitted =
      pdf.splitTextToSize(values[index] || "-", column.width - 4)[0] || "-";
    pdf.text(fitted, x + 2, y + 5.8);
    x += column.width;
  });
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
function count(report: Report) {
  return report.groups.reduce((sum, group) => sum + group.passengers.length, 0);
}
function typeLabel(booking: Booking) {
  return booking.requestType === "overtime"
    ? "OVERTIME TRANSPORT"
    : "CAR SERVICE REQUISITION";
}
function dateText(value: string) {
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}
function safe(value: string) {
  return value.replace(/[^a-z0-9-_]/gi, "-");
}
function pdfText(value: string) {
  return String(value || "-");
}
async function registerPdfFont(pdf: import("jspdf").jsPDF) {
  const response = await fetch("/fonts/Sarabun-Regular.ttf");
  if (!response.ok) throw new Error("Unable to load the PDF font.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1)
    binary += String.fromCharCode(bytes[index]);
  pdf.addFileToVFS("Sarabun-Regular.ttf", btoa(binary));
  pdf.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
}
function fill(argb: string) {
  return {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb },
  };
}
function border() {
  const side = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
  return { top: side, right: side, bottom: side, left: side };
}
function styleTitle(cell: import("exceljs").Cell) {
  cell.fill = fill("FF173F73");
  cell.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}
function save(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
