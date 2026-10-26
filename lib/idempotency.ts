/**
 * Webhook & API Idempotency Management
 * Prevents duplicate actions from webhook retries (Power Automate, LINE, Email 1-click links).
 */

export interface IdempotencyRecord {
  key: string;
  endpoint: string;
  payloadHash: string;
  statusCode: number;
  responsePayload: unknown;
  createdAt: number;
}

// In-memory registry for local development, tests, and Edge API fallback
const memoryStore = new Map<string, IdempotencyRecord>();

export function hashPayload(payload: unknown): string {
  if (payload == null) return "null";
  try {
    const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
    // Fast deterministic non-cryptographic string hash
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  } catch {
    return "unhashable";
  }
}

export function checkIdempotency(
  key: string,
  endpoint: string,
  payload: unknown,
): { isDuplicate: boolean; cachedResponse?: { statusCode: number; payload: unknown } } {
  if (!key || !key.trim()) {
    return { isDuplicate: false };
  }

  const record = memoryStore.get(key);
  if (!record) {
    return { isDuplicate: false };
  }

  const currentHash = hashPayload(payload);
  if (record.endpoint === endpoint && record.payloadHash === currentHash) {
    return {
      isDuplicate: true,
      cachedResponse: {
        statusCode: record.statusCode,
        payload: record.responsePayload,
      },
    };
  }

  return { isDuplicate: false };
}

export function saveIdempotency(
  key: string,
  endpoint: string,
  payload: unknown,
  statusCode: number,
  responsePayload: unknown,
): void {
  if (!key || !key.trim()) return;

  memoryStore.set(key, {
    key,
    endpoint,
    payloadHash: hashPayload(payload),
    statusCode,
    responsePayload,
    createdAt: Date.now(),
  });
}

export function clearExpiredIdempotencyKeys(maxAgeMs = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  memoryStore.forEach((record, key) => {
    if (record.createdAt < cutoff) {
      memoryStore.delete(key);
      removed++;
    }
  });
  return removed;
}

export function resetIdempotencyStore(): void {
  memoryStore.clear();
}
