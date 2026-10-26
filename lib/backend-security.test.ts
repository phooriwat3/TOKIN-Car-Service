import { beforeEach, describe, expect, it } from "vitest";
import {
  checkIdempotency,
  clearExpiredIdempotencyKeys,
  hashPayload,
  resetIdempotencyStore,
  saveIdempotency,
} from "./idempotency";
import {
  checkRateLimit,
  getRateLimitHeaders,
  resetRateLimit,
} from "./rate-limit";
import {
  formatBookingNo,
  generateMockBookingNo,
  isValidBookingNo,
  parseBookingNo,
} from "./booking-sequence";

describe("Plan 04: Backend & Security Infrastructure Tests", () => {
  describe("Webhook & API Idempotency", () => {
    beforeEach(() => {
      resetIdempotencyStore();
    });

    it("detects and replays cached response for identical duplicate request", () => {
      const key = "pow-aut-retry-9988";
      const endpoint = "/api/v1/approval-callback";
      const payload = { bookingId: "bk-101", action: "approve", approver: "lead@yageo.com" };

      // First call -> not duplicate
      const firstCheck = checkIdempotency(key, endpoint, payload);
      expect(firstCheck.isDuplicate).toBe(false);

      // Save execution result
      saveIdempotency(key, endpoint, payload, 200, { success: true, bookingId: "bk-101" });

      // Duplicate retry call -> recognized and returns cached status & payload
      const secondCheck = checkIdempotency(key, endpoint, payload);
      expect(secondCheck.isDuplicate).toBe(true);
      expect(secondCheck.cachedResponse?.statusCode).toBe(200);
      expect(secondCheck.cachedResponse?.payload).toEqual({ success: true, bookingId: "bk-101" });
    });

    it("does not replay if payload differs under the same key", () => {
      const key = "pow-aut-retry-9988";
      const endpoint = "/api/v1/approval-callback";

      saveIdempotency(key, endpoint, { action: "approve" }, 200, { ok: true });

      const checkDifferent = checkIdempotency(key, endpoint, { action: "reject" });
      expect(checkDifferent.isDuplicate).toBe(false);
    });

    it("generates deterministic payload hashes", () => {
      const p1 = { a: 1, b: "test" };
      const p2 = { a: 1, b: "test" };
      expect(hashPayload(p1)).toBe(hashPayload(p2));
    });
  });

  describe("Sliding-Window Rate Limiting", () => {
    beforeEach(() => {
      resetRateLimit();
    });

    it("allows requests within threshold and throttles once limit is exceeded", () => {
      const ip = "192.168.1.105";
      const limit = 3;
      const windowMs = 5000;

      // Requests 1 to 3 should pass
      expect(checkRateLimit(ip, { limit, windowMs }).allowed).toBe(true);
      expect(checkRateLimit(ip, { limit, windowMs }).allowed).toBe(true);
      expect(checkRateLimit(ip, { limit, windowMs }).allowed).toBe(true);

      // Request 4 should be throttled
      const throttled = checkRateLimit(ip, { limit, windowMs });
      expect(throttled.allowed).toBe(false);
      expect(throttled.remaining).toBe(0);
      expect(throttled.retryAfterSeconds).toBeGreaterThan(0);

      const headers = getRateLimitHeaders(throttled);
      expect(headers["X-RateLimit-Limit"]).toBe("3");
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
      expect(headers["Retry-After"]).toBeDefined();
    });
  });

  describe("Year-Partitioned Booking Number Sequence", () => {
    it("formats year-partitioned booking numbers accurately", () => {
      expect(formatBookingNo(2026, 1)).toBe("CSR-2026-000001");
      expect(formatBookingNo(2026, 142)).toBe("CSR-2026-000142");
      expect(generateMockBookingNo(15, 2027)).toBe("CSR-2027-000016");
    });

    it("validates and parses booking number formats", () => {
      expect(isValidBookingNo("CSR-2026-000001")).toBe(true);
      expect(isValidBookingNo("CSR-2027-123456")).toBe(true);
      expect(isValidBookingNo("INVALID-123")).toBe(false);
      expect(isValidBookingNo(undefined)).toBe(false);

      const parsed = parseBookingNo("CSR-2026-000042");
      expect(parsed).toEqual({ year: 2026, sequence: 42 });
    });
  });
});
