export const jsonHeaders = { 'Content-Type': 'application/json' };

export async function verifyLineSignature(body: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  try {
    const expected = Uint8Array.from(atob(signature), (character) => character.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, expected, encoder.encode(body));
  } catch {
    return false;
  }
}

export async function sha256Hex(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function lineRequest(path: string, token: string, body: unknown) {
  const response = await fetch(`https://api.line.me${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`LINE API ${response.status}: ${await response.text()}`);
  return response;
}
