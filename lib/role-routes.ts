import type { Role } from "@/lib/types";

export const landingPathForRole: Record<Role, string> = {
  requester: "/bookings/new",
  approver: "/request",
  admin: "/admin/bookings",
  driver: "/driver/trips",
};
