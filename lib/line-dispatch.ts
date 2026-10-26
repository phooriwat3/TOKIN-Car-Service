import type { Booking, ManualTransportUnit } from "./types";

export const DEFAULT_LINE_VAN_CAPACITY = 10;

const clean = (value: string | undefined, fallback = "-") => {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || fallback;
};

const displayDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match ? `${match[3]}/${match[2]}/${match[1]}` : clean(value);
};

const isOvertime = (booking: Booking) =>
  booking.requestType === "overtime" || booking.overtimeTransport;

type DispatchPassenger = {
  name: string;
  department: string;
  phone: string;
  dropOff: string;
};

const passengersFor = (
  booking: Booking,
  employeeIds?: ReadonlySet<string>,
): DispatchPassenger[] => {
  if (isOvertime(booking) && booking.overtimeEmployees?.length) {
    return booking.overtimeEmployees
      .filter(
        (employee) =>
          employee.transportRequired &&
          (!employeeIds?.size || employeeIds.has(employee.employeeId)),
      )
      .map((employee) => ({
        name: clean(employee.employeeName),
        department: clean(booking.department),
        phone: clean(employee.employeePhone || booking.requesterPhone),
        dropOff: clean(employee.busStop || booking.destination),
      }));
  }

  const names = booking.passengerList.length
    ? booking.passengerList
    : Array.from(
        { length: Math.max(1, booking.numPassengers) },
        (_, index) => index === 0 ? booking.requesterName : `Passenger ${index + 1}`,
      );
  return names
    .map((name, index) => ({ id: `passenger:${index}`, name }))
    .filter(({ id }) => !employeeIds?.size || employeeIds.has(id))
    .map(({ name }, index) => ({
      name: clean(name),
      department: clean(booking.department),
      phone: index === 0 ? clean(booking.requesterPhone) : "-",
      dropOff: clean(booking.destination),
    }));
};

export type LineDispatchInput = {
  bookings: Booking[];
  unit: Pick<
    ManualTransportUnit,
    | "licensePlate"
    | "brand"
    | "vehicleType"
    | "driverName"
    | "driverPhone"
    | "contractorName"
    | "employeeIds"
  >;
  notes?: string;
  capacity?: number;
};

export type LineCancellationInput = {
  booking: Booking;
  reason: string;
  vehicleLabel?: string;
  driverName?: string;
};

export function createLineCancellationMessage({
  booking,
  reason,
  vehicleLabel,
  driverName,
}: LineCancellationInput) {
  return [
    "TOKIN TRANSPORT - TRIP CANCELLED",
    "--------------------------------",
    `Request: ${clean(booking.bookingNo)}`,
    `Date: ${displayDate(booking.usingDate)}`,
    `Time: ${clean(booking.startTime)} - ${clean(booking.endTime)}`,
    `Route: ${clean(booking.pickupLocation)} -> ${clean(booking.destination)}`,
    `Vehicle: ${clean(vehicleLabel)}`,
    `Driver: ${clean(driverName)}`,
    `Reason: ${clean(reason)}`,
    "Please do not proceed with this trip. Contact GA if clarification is needed.",
  ].join("\n");
}

export function createLineDispatchMessage({
  bookings,
  unit,
  notes,
  capacity,
}: LineDispatchInput) {
  if (!bookings.length) return "";

  const first = bookings[0];
  const employeeIds = unit.employeeIds.length
    ? new Set(unit.employeeIds)
    : undefined;
  const filterByUnit = bookings.length === 1 ? employeeIds : undefined;
  const passengers = bookings.flatMap((booking) =>
    passengersFor(booking, filterByUnit),
  );
  const requestNumbers = bookings.map((booking) => booking.bookingNo).join(", ");
  const destinations = Array.from(
    new Set(bookings.map((booking) => clean(booking.destination))),
  ).join(" / ");
  const pickupLocations = Array.from(
    new Set(bookings.map((booking) => clean(booking.pickupLocation))),
  ).join(" / ");
  const departureTimes = Array.from(
    new Set(
      bookings.map((booking) =>
        clean(
          isOvertime(booking) ? booking.endTime : booking.startTime,
        ),
      ),
    ),
  ).join(" / ");
  const overtime = bookings.some(isOvertime);
  const seatsRemaining = capacity == null
    ? null
    : Math.max(0, capacity - passengers.length);
  const vehicle = [clean(unit.licensePlate), clean(unit.vehicleType), clean(unit.brand)]
    .filter((value, index, values) => value !== "-" && values.indexOf(value) === index)
    .join(" · ");
  const driver = [clean(unit.driverName), clean(unit.driverPhone)]
    .filter((value) => value !== "-")
    .join(" · ");

  const passengerLines = passengers.length
    ? passengers.map(
        (passenger, index) =>
          `${index + 1}. ${passenger.name} (${passenger.department}) · ${passenger.phone} ➜ ลง: ${passenger.dropOff}`,
      )
    : ["- ไม่มีรายชื่อผู้โดยสาร -"];

  return [
    `🚐 ${overtime ? "ใบสั่งงานรถรับส่ง OT" : "ใบสั่งงานรถบริษัท"} - TOKIN TRANSPORT`,
    "━━━━━━━━━━━━━━━━━━━",
    `🧾 เลขที่คำขอ: ${requestNumbers}`,
    `📅 วันที่: ${displayDate(first.usingDate)}`,
    `⏰ เวลารถออก: ${departureTimes} น.`,
    `📍 จุดขึ้นรถ: ${pickupLocations}`,
    `🏁 เส้นทาง/จุดหมาย: ${destinations}`,
    `🚐 รถ: ${vehicle || "-"}`,
    `👤 คนขับ: ${driver || "-"}`,
    unit.contractorName ? `🏢 ผู้ให้บริการ: ${clean(unit.contractorName)}` : "",
    `👥 จำนวนผู้โดยสาร: ${passengers.length} ท่าน${
      seatsRemaining == null ? "" : ` (ว่าง ${seatsRemaining} ที่นั่ง)`
    }`,
    notes?.trim() ? `📝 หมายเหตุจาก GA: ${clean(notes)}` : "",
    "",
    "รายชื่อผู้โดยสารและจุดลงรถ:",
    ...passengerLines,
    "━━━━━━━━━━━━━━━━━━━",
    "โปรดตรวจสอบรายชื่อ จุดรับ-ส่ง และโทรติดต่อผู้โดยสารเมื่อหาไม่พบที่จุดนัดพบ",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export const createLineShareUrl = (message: string) =>
  `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
