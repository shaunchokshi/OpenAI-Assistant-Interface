import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  if (process.env.PG_HOST && process.env.PG_DB && process.env.PG_USER && process.env.PG_PASSWORD) {
    process.env.DATABASE_URL = `postgres://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT || 5432}/${process.env.PG_DB}`;
  } else {
    throw new Error(
      "DATABASE_URL or PG_* environment variables must be set",
    );
  }
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
