"use client";

import React, { useState } from "react";
import ExcelJS from "exceljs";
import { Booking } from "@/lib/types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface DrpFallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBookings?: Booking[];
}

export function DrpFallbackModal({
  isOpen,
  onClose,
  currentBookings = [],
}: DrpFallbackModalProps) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lineMessageCustom, setLineMessageCustom] = useState("");

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const defaultLineTemplate = `🚨 [TOKIN DRP - ประกาศคิวรถตู้กรณีระบบขัดข้อง] 🚨
📅 วันที่: ${todayStr} (รอบเลิกงาน 17:00 / 20:00)
----------------------------------------
เนื่องจากระบบเครือข่ายขัดข้องชั่วคราว ขอให้พนักงานที่ลงชื่อทำโอทีขึ้นรถตามสายด้านล่าง:

🚐 สาย 1 โรจนะ - วังน้อย (ทะเบียน ฮพ-1234)
- จุดจอด: ปากซอย 4, ตลาดสี่ขวา, โลตัสวังน้อย

🚐 สาย 2 ตัวเมืองอยุธยา (ทะเบียน นข-5678)
- จุดจอด: วงเวียนเจดีย์, ตลาดเจ้าพรหม

🚐 สาย 3 ปทุมธานี - นวนคร (ทะเบียน ฮม-9012)
- จุดจอด: บิ๊กซี นวนคร, ประตูน้ำพระอินทร์

⚠️ พนักงานที่ไม่ได้ลงชื่อ หรือมีข้อสงสัย
โปรดติดต่อจุดปล่อยรถหน้าตึก หรือ โทรเบอร์ภายใน GA: 1102, 1104
----------------------------------------`;

  const activeLineText = lineMessageCustom || defaultLineTemplate;

  const handleCopyLine = async () => {
    try {
      await navigator.clipboard.writeText(activeLineText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleExportEmergencyManifest = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "TOKIN GA Dispatch - DRP Contingency";
      const worksheet = workbook.addWorksheet("Emergency Dispatch Manifest");

      // Set columns
      worksheet.columns = [
        { header: "สายรถ (Route)", key: "route", width: 18 },
        { header: "ทะเบียน (Plate)", key: "plate", width: 14 },
        { header: "คนขับ (Driver)", key: "driver", width: 16 },
        { header: "รหัสพนักงาน (ID)", key: "empId", width: 14 },
        { header: "ชื่อ-นามสกุล (Name)", key: "name", width: 22 },
        { header: "แผนก (Dept)", key: "dept", width: 12 },
        { header: "จุดลงรถ (Drop-off)", key: "dropoff", width: 25 },
        { header: "ลงชื่อขึ้นรถ (Sign)", key: "sign", width: 18 },
        { header: "หมายเหตุ (Remarks)", key: "remarks", width: 20 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFB91C1C" }, // Alert Red for Emergency
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 28;

      let rowIndex = 2;

      // Populate current bookings if available
      if (currentBookings.length > 0) {
        currentBookings.forEach((b) => {
          if (b.overtimeEmployees && b.overtimeEmployees.length > 0) {
            b.overtimeEmployees.forEach((emp) => {
              const row = worksheet.addRow({
                route: b.destination || "สายทั่วไป",
                plate: b.assignment?.manualTransportUnits?.[0]?.licensePlate || "-",
                driver: b.assignment?.manualTransportUnits?.[0]?.driverName || "-",
                empId: emp.employeeId || "-",
                name: emp.employeeName || "-",
                dept: b.department || "-",
                dropoff: emp.busStop || b.destination || "-",
                sign: "",
                remarks: "",
              });
              row.height = 24;
              rowIndex++;
            });
          } else {
            const row = worksheet.addRow({
              route: b.destination || "สายทั่วไป",
              plate: b.assignment?.manualTransportUnits?.[0]?.licensePlate || "-",
              driver: b.assignment?.manualTransportUnits?.[0]?.driverName || "-",
              empId: b.requesterEmployeeId || "-",
              name: b.requesterName || "-",
              dept: b.department || "-",
              dropoff: b.destination || "-",
              sign: "",
              remarks: "",
            });
            row.height = 24;
            rowIndex++;
          }
        });
      }

      // Add 15 blank contingency rows for manual pen-and-paper entries
      for (let i = 0; i < 15; i++) {
        const blankRow = worksheet.addRow({
          route: "",
          plate: "",
          driver: "",
          empId: "",
          name: "",
          dept: "",
          dropoff: "",
          sign: "",
          remarks: "",
        });
        blankRow.height = 26;
      }

      // Border styling
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFD1D5DB" } },
            left: { style: "thin", color: { argb: "FFD1D5DB" } },
            bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
            right: { style: "thin", color: { argb: "FFD1D5DB" } },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const dateTag = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `TOKIN_EMERGENCY_DISPATCH_DRP_${dateTag}.xlsx`);
    } catch (err) {
      console.error("Failed to generate emergency manifest", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-xl font-bold text-red-600 dark:bg-red-950/60 dark:text-red-400">
              🛡️
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Disaster Recovery Plan (DRP) — Offline Contingency
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fallback runbook for network outage or Supabase unavailability (15:00 - 15:30)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="font-semibold">⚠️ ISO 9001 / IATF 16949 Emergency Operating Procedure:</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs">
              <li>Download the printable offline manifest below immediately.</li>
              <li>Dispatchers proceed to physical staging point with paper sheets.</li>
              <li>Post emergency LINE broadcast to supervisors to coordinate manual boarding.</li>
              <li>Retain physical signed sheets for post-outage system reconciliation.</li>
            </ol>
          </div>

          {/* Action 1: Download Emergency Excel */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                1. Printable Offline Dispatch Manifest (.xlsx)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generates a formatted sign-off sheet with cached trips + 15 blank lines for pen sign-off.
              </p>
            </div>
            <button
              onClick={handleExportEmergencyManifest}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              📄 {isExporting ? "Generating..." : "Download Excel"}
            </button>
          </div>

          {/* Action 2: LINE Emergency Broadcast */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                2. Emergency LINE Broadcast Message
              </h4>
              <button
                onClick={handleCopyLine}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                {copied ? "✅ Copied!" : "📋 Copy LINE Message"}
              </button>
            </div>
            <textarea
              rows={6}
              value={activeLineText}
              onChange={(e) => setLineMessageCustom(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
