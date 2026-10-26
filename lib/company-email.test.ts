import { afterEach, describe, expect, it } from "vitest";
import { companyEmailDomains, isCompanyEmail } from "./company-email";

const originalDomains = process.env.NEXT_PUBLIC_COMPANY_EMAIL_DOMAINS;

afterEach(() => {
  if (originalDomains === undefined) {
    delete process.env.NEXT_PUBLIC_COMPANY_EMAIL_DOMAINS;
  } else {
    process.env.NEXT_PUBLIC_COMPANY_EMAIL_DOMAINS = originalDomains;
  }
});

describe("company email validation", () => {
  it("uses the TOKIN YAGEO company domain by default", () => {
    delete process.env.NEXT_PUBLIC_COMPANY_EMAIL_DOMAINS;
    expect(companyEmailDomains()).toEqual(["yageo.com"]);
    expect(isCompanyEmail("employee@yageo.com")).toBe(true);
    expect(isCompanyEmail("employee@gmail.com")).toBe(false);
  });

  it("supports an explicit comma-separated allowlist", () => {
    process.env.NEXT_PUBLIC_COMPANY_EMAIL_DOMAINS = "yageo.com, @tokin.com";
    expect(isCompanyEmail("person@TOKIN.com")).toBe(true);
    expect(isCompanyEmail("person@sub.tokin.com")).toBe(false);
  });
});
