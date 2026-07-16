export type Role = 'requester' | 'approver' | 'admin' | 'driver';
export type BookingStatus = 'draft' | 'pending_approval' | 'changes_requested' | 'approved' | 'rejected' | 'assigned' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type RequestType = 'outside_company' | 'overtime';
export type Category = 'business_trip' | 'after_hours' | 'errand' | 'overtime_transport' | 'visitor_pickup';
export type VehicleType = 'van' | 'car' | 'pickup' | 'other';
export interface User { id:string; employeeId:string; fullName:string; email:string; department:string; role:Role }
export interface Vehicle { id:string; licensePlate:string; brand:string; model:string; type:VehicleType; capacity:number; color:string; year:number; active:boolean; notes?:string }
export interface Driver { id:string; userId?:string; employeeId:string; fullName:string; phone:string; licenseNumber:string; licenseExpiry:string; active:boolean; notes?:string; lineConnection?:{ displayName:string|null; linkedAt:string } }
export interface Assignment { vehicleId:string; driverId:string; assignedAt:string; notes?:string; accepted:boolean }
export interface AssignmentDraft { vehicleId:string; driverId:string; notes?:string; plannedAt:string }
export interface Approval { action:'approved'|'rejected'|'changes_requested'; comments:string; actedAt:string; approverName:string }
export interface OvertimeEmployee { employeeId:string; employeeName:string; workDescription:string; workStart:string; workEnd:string; totalWeeklyHours:number; transportRequired:boolean; busStop:string }
export interface TripLog { actualTimeOut?:string; actualTimeIn?:string; startMileage?:number; endMileage?:number; fuelCost:number; tollFee:number; parkingFee:number; remarks?:string }
export interface Booking { id:string; bookingNo:string; requesterId:string; requesterName:string; department:string; status:BookingStatus; requestType?:RequestType; approverId?:string; approverName?:string; approverEmail?:string; category:Category; usingDate:string; startTime:string; endTime:string; pickupLocation:string; destination:string; purpose:string; numPassengers:number; passengerList:string[]; overtimeEmployees?:OvertimeEmployee[]; meetingPoint:'front_area'|'loading_area'; withStaff?:boolean; vehicleTypePref:VehicleType|'any'; driverRequired:boolean; urgent:boolean; urgentReason?:string; afterHours:boolean; overtimeTransport:boolean; createdAt:string; rejectReason?:string; approval?:Approval; assignment?:Assignment; assignmentDraft?:AssignmentDraft; tripLog?:TripLog }
export interface AppData { bookings:Booking[]; vehicles:Vehicle[]; drivers:Driver[]; approvers?:User[] }
