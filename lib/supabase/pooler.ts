/**
 * Supabase Connection Pooling & Supavisor Architecture
 *
 * Mode 1: Transaction Mode (Port 6543)
 * - Optimal for short-lived Server Actions, API routes, and Edge Functions.
 * - Handles 1,000+ concurrent requests during 15:00-15:30 shift-end peaks without exhausting database connections.
 * - Connection returned to pool immediately after each query/transaction.
 *
 * Mode 2: Session Mode (Port 5432)
 * - Direct Postgres connection.
 * - Used for migrations, DDL operations, and advisory locks.
 */

export interface PoolerConfig {
  mode: "transaction" | "session";
  port: number;
  description: string;
}

export const POOLER_CONFIGS: Record<"transaction" | "session", PoolerConfig> = {
  transaction: {
    mode: "transaction",
    port: 6543,
    description: "Supavisor Transaction Pooler — recommended for serverless API endpoints and peak load.",
  },
  session: {
    mode: "session",
    port: 5432,
    description: "Direct Session Connection — for migrations and advisory locking.",
  },
};

export function getPoolerPort(mode: "transaction" | "session" = "transaction"): number {
  return POOLER_CONFIGS[mode].port;
}

export function isPoolingActive(): boolean {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return false;
  return dbUrl.includes(":6543") || dbUrl.includes("pooler");
}
