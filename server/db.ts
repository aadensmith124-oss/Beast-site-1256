import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

export function assertDatabaseConfigured() {
  if (!databaseUrl && !process.env.PGHOST) {
    throw new Error(
      "A PostgreSQL connection string or PGHOST binding is required. Set DATABASE_URL (or POSTGRES_URL_NON_POOLING/POSTGRES_URL in Vercel).",
    );
  }
}

const usesSupabaseHost = Boolean(databaseUrl && /(?:supabase\.co|pooler\.supabase\.com)/i.test(databaseUrl));

export const pool = new Pool(databaseUrl ? {
  connectionString: databaseUrl,
  ...(usesSupabaseHost ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 1,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
} : {});
export const db = drizzle(pool, { schema });
