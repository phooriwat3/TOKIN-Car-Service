export type Role = "requester" | "approver" | "admin" | "driver";
export type BookingStatus =
  | "draft"
  | "pending_approval"
  | "pending_ot_verification"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "assigned"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type RequestType = "outside_company" | "overtime";
export type RequestOrigin = "employee" | "hr_direct";
export type OtVerificationMode = "tiger_space" | "manager_exception";
export type OtVerificationStatus =
  | "not_required"
  | "pending"
  | "verified"
  | "not_found"
  | "rejected";
export type Category =
  | "business_trip"
  | "after_hours"
  | "errand"
  | "overtime_transport"
  | "visitor_pickup";
export type VehicleType = "van" | "car" | "pickup" | "other";
export interface User {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  role: Role;
}
export interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  type: VehicleType;
  capacity: number;
  color: string;
  year: number;
  active: boolean;
  notes?: string;
}
export interface Driver {
  id: string;
  userId?: string;
  employeeId: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  active: boolean;
  notes?: string;
}
export interface ManualTransportUnit {
  unitId: string;
  licensePlate: string;
  brand: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  employeeIds: string[];
}
export interface TransportUnitMemory {
  id: string;
  licensePlate: string;
  brand: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  timesUsed: number;
  lastUsedAt: string;
}
export interface Assignment {
  vehicleId?: string;
  driverId?: string;
  manualTransportUnits?: ManualTransportUnit[];
  assignedAt: string;
  notes?: string;
  accepted: boolean;
}
export interface AssignmentDraft {
  vehicleId: string;
  driverId: string;
  notes?: string;
  plannedAt: string;
}
export interface Approval {
  action: "approved" | "rejected" | "changes_requested";
  comments: string;
  actedAt: string;
  approverName: string;
}
export interface OvertimeEmployee {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  workDescription: string;
  workStart: string;
  workEnd: string;
  totalWeeklyHours: number;
  transportRequired: boolean;
  busStop: string;
  assignedVehicleId?: string;
  assignedDriverId?: string;
  assignedNotes?: string;
}
export type ApproverPosition =
  | "Chief"
  | "Supervisor"
  | "Sect.Manager"
  | "Dept.Manager"
  | "AGM.up";

export interface ApproverItem {
  position: ApproverPosition;
  name: string;
  email: string;
}

export interface TripLog {
  actualTimeOut?: string;
  actualTimeIn?: string;
  startMileage?: number;
  endMileage?: number;
  fuelCost: number;
  tollFee: number;
  parkingFee: number;
  remarks?: string;
}
export interface Booking {
  id: string;
  bookingNo: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterEmployeeId?: string;
  department: string;
  status: BookingStatus;
  requestType?: RequestType;
  approverId?: string;
  approverName?: string;
  approverEmail?: string;
  approversList?: ApproverItem[];
  category: Category;
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  numPassengers: number;
  passengerList: string[];
  overtimeEmployees?: OvertimeEmployee[];
  meetingPoint: "front_area" | "loading_area";
  withStaff?: boolean;
  vehicleTypePref: VehicleType | "any";
  driverRequired: boolean;
  urgent: boolean;
  urgentReason?: string;
  afterHours: boolean;
  overtimeTransport: boolean;
  sourceSystem?: "transport_portal" | "tiger_space";
  sourceReference?: string;
  sourceConfirmed?: boolean;
  requestOrigin?: RequestOrigin;
  createdByName?: string;
  otVerificationStatus?: OtVerificationStatus;
  otVerificationMode?: OtVerificationMode;
  otVerifiedAt?: string;
  otVerificationNote?: string;
  createdAt: string;
  rejectReason?: string;
  approval?: Approval;
  assignment?: Assignment;
  assignmentDraft?: AssignmentDraft;
  tripLog?: TripLog;
}
export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  actorId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changedFields?: string[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  bookingId?: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AppData {
  bookings: Booking[];
  vehicles: Vehicle[];
  drivers: Driver[];
  transportMemories?: TransportUnitMemory[];
  approvers?: User[];
  notifications?: AppNotification[];
  auditLogs?: AuditLog[];
}
