export function extractManageToken(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value, "https://transport.local");
    const token = url.searchParams.get("token")?.trim();
    if (token) return token;
  } catch {
    // The direct-token fallback below handles non-URL input.
  }

  if (/^CSR-/i.test(value) || /\s/.test(value) || value.length < 20) return null;
  return value;
}
