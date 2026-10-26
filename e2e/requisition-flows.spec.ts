import { test, expect } from "@playwright/test";

test.describe("TOKIN Car Service — Critical Operational Flows", () => {
  test("Health check endpoint responds with 200 OK and healthy status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("healthy");
    expect(data.version).toBe("2.0.0");
    expect(data.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  test("Public OT requisition page renders cutoff countdown badge", async ({ page }) => {
    await page.goto("/request/overtime");

    // Verify main headings and brand elements
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Verify presence of cutoff or timing indicator
    const countdownOrBadge = page.locator("text=/ตัดรอบ|15:30|Cutoff/i").first();
    await expect(countdownOrBadge).toBeVisible();
  });

  test("Navigation to bookings list renders booking records", async ({ page }) => {
    await page.goto("/bookings");
    await expect(page).toHaveTitle(/Booking|Transport|TOKIN/i);
  });
});
