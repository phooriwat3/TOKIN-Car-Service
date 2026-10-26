import { describe, expect, it } from "vitest";
import { extractManageToken } from "./request-tracking";

describe("extractManageToken", () => {
  const token = "secure-token-value-with-more-than-twenty-characters";

  it("extracts the token from a complete management link", () => {
    expect(
      extractManageToken(`https://transport.example/request/manage?token=${token}`),
    ).toBe(token);
  });

  it("accepts a direct secure token", () => {
    expect(extractManageToken(token)).toBe(token);
  });

  it("does not treat a request number as authorization", () => {
    expect(extractManageToken("CSR-2026-000017")).toBeNull();
  });

  it("rejects empty and malformed values", () => {
    expect(extractManageToken(" ")).toBeNull();
    expect(extractManageToken("not a secure link")).toBeNull();
  });
});
