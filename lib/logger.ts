/**
 * Enterprise Structured Logging & Telemetry
 * Standardized JSON logger with correlation trace IDs and automatic PII/credential redaction.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "authorization",
  "apikey",
  "secret",
  "cookie",
  "publishablekey",
]);

export function generateTraceId(): string {
  return `trace-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

export function sanitizeMeta(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj == null) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMeta(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMeta(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  traceId?: string;
  meta?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function logMessage(level: LogLevel, message: string, meta?: unknown, error?: unknown, traceId?: string) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    traceId,
  };

  if (meta !== undefined) {
    entry.meta = sanitizeMeta(meta);
  }

  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  if (process.env.NODE_ENV === "test") {
    // Suppress verbose test stdout unless explicitly debugging
    return;
  }

  const jsonStr = JSON.stringify(entry);
  if (level === "ERROR") {
    console.error(jsonStr);
  } else if (level === "WARN") {
    console.warn(jsonStr);
  } else {
    console.log(jsonStr);
  }
}

export const logger = {
  debug: (message: string, meta?: unknown, traceId?: string) =>
    logMessage("DEBUG", message, meta, undefined, traceId),
  info: (message: string, meta?: unknown, traceId?: string) =>
    logMessage("INFO", message, meta, undefined, traceId),
  warn: (message: string, meta?: unknown, traceId?: string) =>
    logMessage("WARN", message, meta, undefined, traceId),
  error: (message: string, error?: unknown, meta?: unknown, traceId?: string) =>
    logMessage("ERROR", message, meta, error, traceId),
};
