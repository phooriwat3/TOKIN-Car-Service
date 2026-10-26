import { describe, expect, it } from "vitest";
import {
  adminAlertCard,
  assignmentCard,
  driverOfferCard,
  reminderCard,
  requesterConfirmationCard,
  requesterStatusCard,
} from "../supabase/functions/_shared/audience-adaptive-card.ts";
import { requesterDecisionEmail } from "../supabase/functions/_shared/email-template.ts";
import { adminNotification } from "../supabase/functions/_shared/admin-notification.ts";

const summary = {
  requestNo: "CSR-2026-000101",
  requestType: "outside_company" as const,
  usingDate: "2026-11-02",
  startTime: "08:00",
  endTime: "17:00",
  pickupLocation: "TOKIN Main Office",
  destination: "Customer factory",
};

const assertMobileSafe = (card: any) => {
  expect(card.version).toBe("1.4");
  expect(card.body[0]).toMatchObject({
    type: "Container",
    bleed: true,
  });
  expect(card.actions.length).toBeLessThanOrEqual(3);
  expect(JSON.stringify(card).length).toBeLessThan(12_000);
};

describe("Phase 5 audience Adaptive Cards", () => {
  it("builds a concise requester confirmation card with one secure action", () => {
    const card = requesterConfirmationCard({
      ...summary,
      confirmationUrl: "https://carservice.tokin.co.th/request/confirm?token=secret",
      expiresAt: "2026-11-03T10:00:00.000Z",
    }) as any;

    assertMobileSafe(card);
    expect(card.actions).toHaveLength(1);
    expect(card.actions[0]).toMatchObject({
      type: "Action.OpenUrl",
      id: "confirmRequest",
      title: "Confirm request",
    });
  });

  it("builds outcome-specific requester status cards", () => {
    const changes = requesterStatusCard({
      ...summary,
      status: "changes_requested",
      comments: "Correct the destination.",
      actionUrl: "https://carservice.tokin.co.th/request/manage?token=secret",
      expiresAt: "2026-12-01T10:00:00.000Z",
    }) as any;
    const approved = requesterStatusCard({
      ...summary,
      status: "approved",
    }) as any;

    assertMobileSafe(changes);
    assertMobileSafe(approved);
    expect(JSON.stringify(changes)).toContain("Correct the destination.");
    expect(changes.actions[0].title).toBe("Update request");
    expect(approved.actions).toEqual([]);
  });

  it("keeps assignment cards useful without exposing phone numbers", () => {
    const card = assignmentCard({
      ...summary,
      viewUrl: "https://carservice.tokin.co.th/request/assignment?token=view",
      pdfUrl: "https://carservice.tokin.co.th/api/request/assignment/pdf?token=pdf",
      expiresAt: "2026-12-01T10:00:00.000Z",
      vehicleLabel: "Toyota Commuter - 1 AB 1234",
      driverName: "Somchai Dee",
      transportUnitCount: 2,
    }) as any;

    assertMobileSafe(card);
    expect(card.actions.map((action: any) => action.id)).toEqual([
      "viewAssignment",
      "downloadAssignment",
    ]);
    expect(JSON.stringify(card)).not.toContain("081-234-5678");
  });

  it("minimizes admin and driver card data by audience", () => {
    const admin = adminAlertCard({
      ...summary,
      requesterName: "Narin Srisuk",
      requesterDepartment: "Engineering",
      reviewUrl: "https://carservice.tokin.co.th/admin/bookings/uuid",
      urgent: true,
    }) as any;
    const driver = driverOfferCard({
      ...summary,
      passengerCount: 4,
      acceptUrl: "https://carservice.tokin.co.th/request/driver/accept?token=accept",
      routeUrl: "https://carservice.tokin.co.th/request/driver/route?token=route",
      expiresAt: "2026-11-03T10:00:00.000Z",
    }) as any;

    assertMobileSafe(admin);
    assertMobileSafe(driver);
    const serialized = JSON.stringify({ admin, driver });
    expect(serialized).not.toContain("narin@yageo.com");
    expect(serialized).not.toContain("Passenger One");
    expect(serialized).not.toContain("0812345678");
  });

  it("uses the same compact pattern for reminders and escalations", () => {
    const reminder = reminderCard({
      requestNo: summary.requestNo,
      title: "Confirmation reminder",
      message: "Confirm the request before the deadline.",
      actionUrl: "https://carservice.tokin.co.th/request/confirm?token=secret",
      deadline: "2026-11-03T10:00:00.000Z",
      escalated: true,
    }) as any;

    assertMobileSafe(reminder);
    expect(reminder.body[0].style).toBe("attention");
    expect(reminder.actions[0].id).toBe("openReminder");
  });

  it("rejects insecure action URLs", () => {
    expect(() => requesterConfirmationCard({
      ...summary,
      confirmationUrl: "http://example.test/confirm",
      expiresAt: "2026-11-03T10:00:00.000Z",
    })).toThrow(/HTTPS/);
    expect(() => assignmentCard({
      ...summary,
      viewUrl: "https://carservice.tokin.co.th/request/assignment",
      pdfUrl: "http://example.test/file.pdf",
      expiresAt: "2026-11-03T10:00:00.000Z",
      vehicleLabel: "Van",
      driverName: "Driver",
    })).toThrow(/HTTPS/);
  });

  it("provides link-free email fallback for final approval decisions", () => {
    const email = requesterDecisionEmail({
      ...summary,
      event: "request.approved",
      requesterName: "Narin Srisuk",
      requesterDepartment: "Engineering",
      purpose: "Customer meeting",
    });

    expect(email.emailSubject).toBe(`[Approved] ${summary.requestNo}`);
    expect(email.emailBodyHtml).toContain("Your transport request was approved");
    expect(email.emailBodyHtml).not.toContain("href=\"undefined\"");
    expect(email.emailBodyHtml).not.toContain("expires on undefined");
  });

  it("builds a privacy-minimized GA notification for the configured recipient", () => {
    const notification = adminNotification({
      requestId: "01939d76-5144-7d35-9c4c-726c61e797aa",
      ...summary,
      requesterName: "Narin Srisuk",
      requesterDepartment: "Engineering",
      purpose: "Confidential customer visit",
      reviewUrl: "https://carservice.tokin.co.th/admin/bookings?search=CSR-2026-000101",
      recipientName: "Phooriwat Pungpech",
      recipientEmail: "Phooriwat.Pungpech@yageo.com",
      urgent: true,
    });

    expect(notification).toMatchObject({
      schemaVersion: 1,
      event: "admin.request_ready",
      audience: "admin",
      recipient: { email: "phooriwat.pungpech@yageo.com" },
      priority: "high",
    });
    const serialized = JSON.stringify(notification);
    expect(serialized).not.toContain("Confidential customer visit");
    expect(serialized).not.toContain("0812345678");
    expect(notification.emailSubject).toContain("[GA review]");
  });
});
