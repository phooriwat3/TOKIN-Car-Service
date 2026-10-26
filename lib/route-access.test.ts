import { describe, expect, it } from "vitest";
import { canAccessPath, isPublicPath } from "./route-access";

describe("route access model", () => {
  it("keeps public form and signed-link routes public", () => {
    expect(isPublicPath("/request")).toBe(true);
    expect(isPublicPath("/request/confirm")).toBe(true);
    expect(isPublicPath("/request/manage")).toBe(true);
    expect(isPublicPath("/admin/login")).toBe(true);
    expect(isPublicPath("/admin/bookings")).toBe(false);
  });

  it("rejects employee, approver, and driver accounts from privileged pages", () => {
    for (const role of ["requester", "approver", "driver"]) {
      expect(canAccessPath("/dashboard", role)).toBe(false);
      expect(canAccessPath("/admin/bookings", role)).toBe(false);
    }
  });

  it("limits each privileged specialist role", () => {
    expect(canAccessPath("/admin/reports", "finance")).toBe(true);
    expect(canAccessPath("/api/v1/bookings", "finance")).toBe(true);
    expect(canAccessPath("/admin/reset-password", "finance")).toBe(true);
    expect(canAccessPath("/admin/bookings", "finance")).toBe(false);
    expect(canAccessPath("/admin/advanced", "auditor")).toBe(true);
    expect(canAccessPath("/admin/reports", "auditor")).toBe(false);
    expect(canAccessPath("/bookings/123", "executive")).toBe(true);
    expect(canAccessPath("/admin/advanced", "executive")).toBe(false);
    expect(canAccessPath("/admin/vehicles", "admin")).toBe(true);
  });
});
