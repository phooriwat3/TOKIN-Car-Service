'use client';

import { useMemo } from 'react';
import { Download, Printer, Users } from 'lucide-react';
import { useApp } from '@/components/app-provider';
import { Button, Card } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { totalCost } from '@/lib/business';
import { AdminReportWorkspace } from '@/components/admin-report-workspace';

type DispatchGroup = {
  key: string;
  requestNo: string;
  usingDate: string;
  startTime: string;
  endTime: string;
  licensePlate: string;
  brand: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  passengers: Array<{ employeeId: string; employeeName: string; busStop: string }>;
};

function LegacyReports() {
  const { data } = useApp();
  const dispatchGroups = useMemo<DispatchGroup[]>(() => data.bookings.flatMap((booking) => {
    if (booking.requestType !== 'overtime' || !booking.assignment?.manualTransportUnits?.length) return [];
    return booking.assignment.manualTransportUnits.map((unit, index) => ({
      key: booking.id + '-' + (unit.unitId || index),
      requestNo: booking.bookingNo,
      usingDate: booking.usingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      licensePlate: unit.licensePlate,
      brand: unit.brand,
      vehicleType: unit.vehicleType,
      driverName: unit.driverName,
      driverPhone: unit.driverPhone,
      passengers: (unit.employeeIds ?? []).map((employeeId) => {
        const employee = booking.overtimeEmployees?.find((item) => item.employeeId === employeeId);
        return {
          employeeId,
          employeeName: employee?.employeeName || employeeId,
          busStop: employee?.busStop || '-',
        };
      }),
    }));
  }), [data.bookings]);

  const exportExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const bookings = workbook.addWorksheet('Bookings');
    bookings.columns = [
      ['Booking No', 'bookingNo'], ['Date', 'date'], ['Requester', 'requester'],
      ['Department', 'department'], ['Destination', 'destination'], ['Status', 'status'],
      ['Fuel Cost', 'fuel'], ['Toll Fee', 'toll'], ['Parking Fee', 'parking'], ['Total Cost', 'total'],
    ].map(([header, key]) => ({ header, key, width: 20 }));
    data.bookings.forEach((booking) => bookings.addRow({
      bookingNo: booking.bookingNo, date: booking.usingDate, requester: booking.requesterName,
      department: booking.department, destination: booking.destination, status: booking.status,
      fuel: booking.tripLog?.fuelCost || 0, toll: booking.tripLog?.tollFee || 0,
      parking: booking.tripLog?.parkingFee || 0, total: totalCost(booking),
    }));

    const dispatch = workbook.addWorksheet('OT Vehicle Dispatch');
    dispatch.columns = [
      ['Request No', 'requestNo'], ['Date', 'date'], ['Time', 'time'], ['License plate', 'plate'],
      ['Vehicle', 'vehicle'], ['Driver', 'driver'], ['Driver phone', 'phone'], ['Employee ID', 'employeeId'],
      ['Employee name', 'employeeName'], ['Drop-off point', 'busStop'],
    ].map(([header, key]) => ({ header, key, width: 22 }));
    dispatchGroups.forEach((group) => group.passengers.forEach((passenger) => dispatch.addRow({
      requestNo: group.requestNo, date: group.usingDate, time: group.startTime + ' - ' + group.endTime,
      plate: group.licensePlate, vehicle: group.brand + ' ' + group.vehicleType,
      driver: group.driverName, phone: group.driverPhone,
      employeeId: passenger.employeeId, employeeName: passenger.employeeName, busStop: passenger.busStop,
    })));
    [bookings, dispatch].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173F73' } };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    });
    const buffer = await workbook.xlsx.writeBuffer();
    download(new Blob([buffer]), 'tokin-transport-report.xlsx');
  };

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    let y = 18;
    pdf.setFontSize(16);
    pdf.text('TOKIN Transport - OT Vehicle Dispatch', 14, y);
    dispatchGroups.forEach((group) => {
      const requiredHeight = 28 + group.passengers.length * 7;
      if (y + requiredHeight > 280) {
        pdf.addPage();
        y = 18;
      }
      y += 10;
      pdf.setFontSize(11);
      pdf.text(group.licensePlate + ' | ' + group.brand + ' ' + group.vehicleType, 14, y);
      y += 6;
      pdf.setFontSize(9);
      pdf.text(group.usingDate + ' ' + group.startTime + '-' + group.endTime + ' | Driver: ' + group.driverName + ' ' + group.driverPhone, 14, y);
      group.passengers.forEach((passenger, index) => {
        y += 7;
        pdf.text((index + 1) + '. ' + passenger.employeeId + ' ' + passenger.employeeName + ' | Drop-off: ' + passenger.busStop, 18, y);
      });
      y += 3;
    });
    pdf.save('tokin-ot-vehicle-dispatch.pdf');
  };

  return (
    <>
      <PageHeader
        title="Transport reports"
        description="Grouped vehicle dispatch lists for the transport provider, plus booking and cost data."
        action={<div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}><Printer size={16} />Print</Button>
          <Button variant="secondary" onClick={exportExcel}><Download size={16} />Excel</Button>
          <Button variant="secondary" onClick={exportPdf}><Download size={16} />PDF</Button>
        </div>}
      />
      <div className="grid gap-4 sm:grid-cols-3 print:hidden">
        <Metric label="Total bookings" value={String(data.bookings.length)} />
        <Metric label="OT vehicles arranged" value={String(dispatchGroups.length)} />
        <Metric label="OT passengers arranged" value={String(dispatchGroups.reduce((sum, group) => sum + group.passengers.length, 0))} />
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Users size={20} className="text-brand" />
          <div><h2 className="font-bold text-ink">OT vehicle dispatch list</h2><p className="text-sm text-gray-500">One list per vehicle for the transport service provider.</p></div>
        </div>
        <div className="space-y-5">
          {dispatchGroups.length ? dispatchGroups.map((group) => (
            <Card key={group.key} className="overflow-hidden break-inside-avoid">
              <div className="flex flex-wrap justify-between gap-3 bg-brand px-5 py-4 text-white">
                <div><p className="text-xs font-semibold uppercase text-blue-100">Vehicle</p><h3 className="text-xl font-bold">{group.licensePlate}</h3><p className="text-sm text-blue-100">{group.brand} {group.vehicleType}</p></div>
                <div className="text-right text-sm"><p>{group.usingDate} ? {group.startTime} - {group.endTime}</p><p className="mt-1 text-blue-100">{group.requestNo}</p></div>
              </div>
              <div className="grid gap-3 border-b border-line bg-blue-50 px-5 py-3 text-sm sm:grid-cols-2">
                <p><span className="text-gray-500">Driver:</span> <strong>{group.driverName}</strong></p>
                <p><span className="text-gray-500">Phone:</span> <strong>{group.driverPhone || '-'}</strong></p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">No.</th><th className="px-5 py-3">Employee ID</th><th className="px-5 py-3">Employee name</th><th className="px-5 py-3">Drop-off point</th></tr></thead>
                  <tbody>{group.passengers.map((passenger, index) => <tr key={passenger.employeeId} className="border-t border-line"><td className="px-5 py-3">{index + 1}</td><td className="px-5 py-3">{passenger.employeeId}</td><td className="px-5 py-3 font-semibold">{passenger.employeeName}</td><td className="px-5 py-3">{passenger.busStop}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Total passengers: {group.passengers.length}</div>
            </Card>
          )) : <Card className="p-8 text-center text-sm text-gray-500">No confirmed OT vehicle assignments yet.</Card>}
        </div>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card className="p-5"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>;
}

function download(blob: Blob, name: string) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

export default AdminReportWorkspace;
