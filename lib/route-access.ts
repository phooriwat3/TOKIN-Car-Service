import type { Role } from "@/lib/types";

export const privilegedRoles: Role[] = [
  "admin",
  "finance",
  "executive",
  "auditor",
];

export const isPublicPath = (pathname: string) =>
  pathname === "/" ||
  pathname === "/login" ||
  pathname === "/admin/login" ||
  pathname === "/admin/recover" ||
  pathname === "/access-denied" ||
  pathname === "/api/health" ||
  pathname === "/auth/recovery" ||
  pathname.startsWith("/request") ||
  pathname.startsWith("/api/request");

export const canAccessPath = (pathname: string, role: string) => {
  if (role === "admin") return true;
  if (pathname === "/admin/reset-password")
    return ["finance", "executive", "auditor"].includes(role);
  if (pathname.startsWith("/api/v1/bookings"))
    return ["finance", "executive", "auditor"].includes(role);
  if (role === "finance")
    return pathname === "/dashboard" || pathname.startsWith("/admin/reports");
  if (role === "auditor")
    return pathname === "/dashboard" || pathname.startsWith("/admin/advanced");
  if (role === "executive")
    return pathname === "/dashboard" || pathname.startsWith("/bookings");
  return false;
};
