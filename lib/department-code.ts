const knownCodes: Record<string, string> = {
  "managing director": "MD",
  "human resources": "HR",
  sustainability: "SUST",
  "finance and accounting": "FA",
  planning: "PLN",
  procurement: "PROC",
  "process engineering": "PE",
  "information technology": "IT",
  "electrical engineering": "EE",
  facilities: "FAC",
  "quality assurance": "QA",
  "ta manufacturing": "TA MFG",
  "supply chain": "SC",
  "test engineering": "TE",
  "general affairs": "GA",
  engineering: "ENG",
  capacitor: "CAP",
};

export function departmentCode(value: string | null | undefined) {
  const department = value?.trim() ?? "";
  if (!department) return "";
  const normalized = department.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (knownCodes[normalized]) return knownCodes[normalized];
  if (/^[A-Za-z]{2,6}(?:\s+[A-Za-z]{2,6})?$/.test(department)) return department.toUpperCase();

  const initials = department
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials.length >= 2 ? initials : department.slice(0, 3).toUpperCase();
}
