import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Ensure we have a valid database connection string
if (!process.env.DATABASE_URL) {
  if (process.env.PG_HOST && process.env.PG_DB && process.env.PG_USER && process.env.PG_PASSWORD) {
    process.env.DATABASE_URL = `postgres://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT || 5432}/${process.env.PG_DB}`;
  } else {
    throw new Error(
      "DATABASE_URL or PG_* environment variables must be set",
    );
  }
}

// Create a connection pool using node-postgres
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set a reasonable connection timeout
  connectionTimeoutMillis: 5000
});

// Create a Drizzle instance with the node-postgres adapter
export const db = drizzle(pool, { schema });
