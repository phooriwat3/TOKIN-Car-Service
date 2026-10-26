const defaultCompanyDomains = ["yageo.com"];

export function companyEmailDomains() {
  const configured = process.env.NEXT_PUBLIC_COMPANY_EMAIL_DOMAINS;
  const domains = (configured ? configured.split(",") : defaultCompanyDomains)
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

  return Array.from(new Set(domains));
}

export function isCompanyEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return false;

  const domain = normalized.slice(at + 1);
  return companyEmailDomains().includes(domain);
}

export function companyEmailHint() {
  return companyEmailDomains().map((domain) => `@${domain}`).join(" or ");
}
