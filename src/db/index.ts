import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

let database: Database | undefined;

function getDatabase(): Database {
  if (database) {
    return database;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local before using the database.",
    );
  }

  database = drizzle(neon(url), { schema });
  return database;
}

// Lazy so `next build` can import this module without DATABASE_URL.
// The client is created on the first query, not at import time.
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    if (prop === "then" || prop === "catch" || prop === "finally") {
      return undefined;
    }

    const instance = getDatabase();
    const value: unknown = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
