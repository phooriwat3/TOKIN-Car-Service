import { email } from "./request-access.ts";

const companyDomains = () => {
  const configured = Deno.env.get("COMPANY_EMAIL_DOMAINS") ?? "yageo.com";
  return new Set(
    configured
      .split(",")
      .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean),
  );
};

const companyEmail = (value: unknown, label: string) => {
  const normalized = email(value, label);
  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  if (!companyDomains().has(domain)) {
    throw new Error(`${label} must use an approved company email domain.`);
  }
  return normalized;
};

export { companyDomains, companyEmail };
