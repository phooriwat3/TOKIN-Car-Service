export type Role = 'requester' | 'approver' | 'admin' | 'driver';
export type BookingStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type Category = 'business_trip' | 'after_hours' | 'errand' | 'overtime_transport' | 'visitor_pickup';
export type VehicleType = 'van' | 'car' | 'pickup' | 'other';
export interface User { id:string; employeeId:string; fullName:string; email:string; department:string; role:Role }
export interface Vehicle { id:string; licensePlate:string; brand:string; model:string; type:VehicleType; capacity:number; color:string; year:number; active:boolean; notes?:string }
export interface Driver { id:string; userId?:string; employeeId:string; fullName:string; phone:string; licenseNumber:string; licenseExpiry:string; active:boolean; notes?:string; lineConnection?:{ displayName:string|null; linkedAt:string } }
export interface Assignment { vehicleId:string; driverId:string; assignedAt:string; notes?:string; accepted:boolean }
export interface Approval { action:'approved'|'rejected'; comments:string; actedAt:string; approverName:string }
export interface TripLog { actualTimeOut?:string; actualTimeIn?:string; startMileage?:number; endMileage?:number; fuelCost:number; tollFee:number; parkingFee:number; remarks?:string }
export interface Booking { id:string; bookingNo:string; requesterId:string; requesterName:string; department:string; status:BookingStatus; category:Category; usingDate:string; startTime:string; endTime:string; pickupLocation:string; destination:string; purpose:string; numPassengers:number; passengerList:string[]; meetingPoint:'front_area'|'loading_area'; vehicleTypePref:VehicleType|'any'; driverRequired:boolean; urgent:boolean; urgentReason?:string; afterHours:boolean; overtimeTransport:boolean; createdAt:string; rejectReason?:string; approval?:Approval; assignment?:Assignment; tripLog?:TripLog }
export interface AppData { bookings:Booking[]; vehicles:Vehicle[]; drivers:Driver[] }
