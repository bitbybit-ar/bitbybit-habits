import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export * from "./schema";

// Use the Neon type as the canonical DB type — postgres-js produces
// a structurally compatible instance at runtime.
type NeonDb = ReturnType<typeof drizzleNeon<typeof schema>>;

let dbInstance: NeonDb | null = null;

export function getDb(): NeonDb {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!dbInstance) {
    const sql = neon(process.env.DATABASE_URL);
    dbInstance = drizzleNeon(sql, { schema });
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;
