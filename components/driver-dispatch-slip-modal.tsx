"use client";

import { useRef } from "react";
import { format } from "date-fns";
import {
  Car,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MapPin,
  Phone,
  Printer,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import type { Booking, Driver, Vehicle } from "@/lib/types";
import { Button } from "./ui";

export function DriverDispatchSlipModal({
  booking,
  vehicle,
  driver,
  onClose,
}: {
  booking: Booking;
  vehicle?: Vehicle;
  driver?: Driver;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const isOt =
    booking.requestType === "overtime" ||
    (booking.overtimeEmployees && booking.overtimeEmployees.length > 0) ||
    booking.category === "overtime_transport";

  const assignedUnit = booking.assignment?.manualTransportUnits?.[0];
  const plate = assignedUnit?.licensePlate || vehicle?.licensePlate || "N/A";
  const vehicleBrand = assignedUnit?.brand || (vehicle ? `${vehicle.brand} ${vehicle.model}` : "Company Fleet");
  const driverName = assignedUnit?.driverName || driver?.fullName || "Company Assigned Driver";
  const driverPhone = assignedUnit?.driverPhone || driver?.phone || "—";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="font-bold text-ink text-base">
                Driver Dispatch Slip &amp; Trip Log
              </h3>
              <p className="text-xs text-gray-500">
                Official dispatch sheet for driver handover and expense recording.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 bg-brand text-xs font-semibold hover:bg-brand-dark"
            >
              <Printer size={14} />
              <span>Print A4 Slip</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Sheet Container */}
        <div className="max-h-[80vh] overflow-y-auto p-6 sm:p-8 print:max-h-none print:overflow-visible print:p-0">
          <div
            ref={printRef}
            className="mx-auto rounded-xl border border-line bg-white p-8 text-slate-800 shadow-xs print:border-none print:p-0 print:shadow-none"
          >
            {/* Header / Brand */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 font-black text-xs text-white">
                    TT
                  </div>
                  <h1 className="font-black text-xl tracking-tight text-slate-900">
                    TOKIN TRANSPORT
                  </h1>
                </div>
                <p className="mt-1 font-semibold text-xs text-slate-500 uppercase tracking-wider">
                  Business Transport Requisition System
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block rounded border border-slate-300 bg-slate-50 px-2.5 py-1 font-mono font-extrabold text-sm text-slate-900">
                  {booking.bookingNo}
                </span>
                <p className="mt-1 text-[11px] text-slate-500">
                  Issued: {format(new Date(), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div className="my-4 text-center">
              <h2 className="font-bold text-base text-slate-900 uppercase tracking-wide">
                ใบสั่งงานและบันทึกการใช้ยานพาหนะ (DRIVER DISPATCH SLIP)
              </h2>
              <span className="mt-0.5 inline-block text-xs text-slate-500">
                {isOt ? "[ OT Transport / บริการรับส่งล่วงเวลา ]" : "[ Off-site Business Transport / บริการรถยนต์ส่วนกลาง ]"}
              </span>
            </div>

            {/* Section 1: Trip & Route Details */}
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="mb-2 font-bold text-xs uppercase tracking-wider text-slate-600">
                1. ข้อมูลการเดินทาง (Trip &amp; Itinerary)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-500">วันที่ใช้งาน (Date):</span>
                  <p className="font-bold text-slate-900">{booking.usingDate}</p>
                </div>
                <div>
                  <span className="text-slate-500">เวลา (Time):</span>
                  <p className="font-bold text-slate-900">
                    {booking.startTime} – {booking.endTime}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">จุดนัดพบ (Pickup):</span>
                  <p className="font-semibold text-slate-900">
                    {booking.pickupLocation} ({booking.meetingPoint === "front_area" ? "หน้าบริษัท" : "จุดโหลดสินค้า"})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">ปลายทาง (Destination):</span>
                  <p className="font-bold text-brand">{booking.destination}</p>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-2 text-xs">
                <span className="text-slate-500">วัตถุประสงค์ (Purpose):</span>{" "}
                <span className="font-medium text-slate-900">{booking.purpose || "—"}</span>
              </div>
            </div>

            {/* Section 2: Fleet & Driver Details */}
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="mb-2 font-bold text-xs uppercase tracking-wider text-slate-600">
                2. ข้อมูลยานพาหนะและพนักงานขับรถ (Fleet &amp; Driver Assigned)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-500">ทะเบียนรถ (Plate):</span>
                  <p className="font-black text-sm text-slate-900">{plate}</p>
                </div>
                <div>
                  <span className="text-slate-500">ยี่ห้อ/ประเภท (Vehicle):</span>
                  <p className="font-semibold text-slate-900">{vehicleBrand}</p>
                </div>
                <div>
                  <span className="text-slate-500">พนักงานขับรถ (Driver):</span>
                  <p className="font-bold text-slate-900">{driverName}</p>
                </div>
                <div>
                  <span className="text-slate-500">เบอร์โทรศัพท์ (Phone):</span>
                  <p className="font-mono font-semibold text-slate-900">{driverPhone}</p>
                </div>
              </div>
            </div>

            {/* Section 3: Passenger Manifest */}
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                  3. รายชื่อผู้โดยสาร (Passenger Manifest)
                </h3>
                <span className="font-bold text-xs text-slate-900">
                  จำนวนผู้โดยสาร: {booking.numPassengers || 1} ท่าน
                </span>
              </div>

              <div className="text-xs">
                <p className="font-medium text-slate-900">
                  ผู้ขอใช้บริการหลัก:{" "}
                  <strong>{booking.requesterName}</strong> ({booking.requesterEmployeeId || "—"}) · แผนก:{" "}
                  <strong>{booking.department}</strong>
                </p>

                {booking.overtimeEmployees && booking.overtimeEmployees.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="font-semibold text-slate-600">พนักงาน OT:</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                      {booking.overtimeEmployees.map((emp, idx) => (
                        <div key={idx} className="rounded bg-white p-1.5 border border-slate-200">
                          <span className="font-bold">{emp.employeeName}</span> ({emp.employeeId})
                          {emp.busStop && <p className="text-slate-500">จุดลง: {emp.busStop}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Driver Log Sheet (Fill in during trip) */}
            <div className="mb-5 rounded-lg border-2 border-dashed border-slate-300 p-4">
              <h3 className="mb-3 font-bold text-xs uppercase tracking-wider text-slate-800 text-center">
                4. ใบบันทึกการใช้งานและค่าใช้จ่าย (Driver Mileage &amp; Expense Log)
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div className="rounded border border-slate-300 bg-white p-2.5 text-center">
                  <span className="text-slate-500">เลขไมล์เริ่มต้น (Start KM)</span>
                  <p className="mt-3 font-mono font-bold text-slate-400">
                    {booking.tripLog?.startMileage ? `${booking.tripLog.startMileage} km` : "................... km"}
                  </p>
                </div>
                <div className="rounded border border-slate-300 bg-white p-2.5 text-center">
                  <span className="text-slate-500">เลขไมล์สิ้นสุด (End KM)</span>
                  <p className="mt-3 font-mono font-bold text-slate-400">
                    {booking.tripLog?.endMileage ? `${booking.tripLog.endMileage} km` : "................... km"}
                  </p>
                </div>
                <div className="rounded border border-slate-300 bg-white p-2.5 text-center">
                  <span className="text-slate-500">ค่าน้ำมัน (Fuel Baht)</span>
                  <p className="mt-3 font-mono font-bold text-slate-400">
                    {booking.tripLog?.fuelCost ? `฿${booking.tripLog.fuelCost}` : "................... บาท"}
                  </p>
                </div>
                <div className="rounded border border-slate-300 bg-white p-2.5 text-center">
                  <span className="text-slate-500">ค่าทางด่วน (Toll Baht)</span>
                  <p className="mt-3 font-mono font-bold text-slate-400">
                    {booking.tripLog?.tollFee ? `฿${booking.tripLog.tollFee}` : "................... บาท"}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5: Signature Blocks */}
            <div className="grid grid-cols-3 gap-6 pt-4 text-center text-xs">
              <div className="space-y-10 border-t border-slate-300 pt-3">
                <div className="h-6 font-script font-semibold text-slate-600">
                  {driverName}
                </div>
                <div>
                  <p className="font-bold text-slate-800">พนักงานขับรถ (Driver)</p>
                  <p className="text-[10px] text-slate-400">วันที่ ...../...../..........</p>
                </div>
              </div>

              <div className="space-y-10 border-t border-slate-300 pt-3">
                <div className="h-6 font-script font-semibold text-slate-600">
                  GA Fleet Officer
                </div>
                <div>
                  <p className="font-bold text-slate-800">เจ้าหน้าที่ฝ่ายยานพาหนะ (GA)</p>
                  <p className="text-[10px] text-slate-400">วันที่ ...../...../..........</p>
                </div>
              </div>

              <div className="space-y-10 border-t border-slate-300 pt-3">
                <div className="h-6 font-script font-semibold text-slate-600">
                  {booking.requesterName}
                </div>
                <div>
                  <p className="font-bold text-slate-800">ผู้แทนผู้โดยสาร (Passenger)</p>
                  <p className="text-[10px] text-slate-400">วันที่ ...../...../..........</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
