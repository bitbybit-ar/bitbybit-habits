import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export * from "./schema";

// Use the Neon type as the canonical DB type — postgres-js produces
// a structurally compatible instance at runtime.
type NeonDb = ReturnType<typeof drizzleNeon<typeof schema>>;

let dbInstance: NeonDb | null = null;

function isLocalDb(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

export function getDb(): NeonDb {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!dbInstance) {
    if (isLocalDb(process.env.DATABASE_URL)) {
      // Local PostgreSQL via postgres.js
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const postgres = require("postgres");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { drizzle } = require("drizzle-orm/postgres-js");
      const client = postgres(process.env.DATABASE_URL);
      dbInstance = drizzle(client, { schema }) as NeonDb;
    } else {
      // Neon serverless (production)
      const sql = neon(process.env.DATABASE_URL);
      dbInstance = drizzleNeon(sql, { schema });
    }
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;
