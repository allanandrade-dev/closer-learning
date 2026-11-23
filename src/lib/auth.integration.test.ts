import { test } from "vitest";

// Skipped. This VM has no Docker and no Postgres server or client, so
// `pnpm db:push` cannot run. The app's Drizzle client is
// `@neondatabase/serverless` HTTP (`neon()`), which queries Neon's
// SQL-over-HTTP endpoint rather than the Postgres wire protocol. A local
// Postgres would still be unreachable without changing `src/db`, which this
// slice does not own. The flow is not mocked.

test.skip("signs up, rejects a duplicate email, stores a scrypt password hash, and returns INVALID_EMAIL_OR_PASSWORD for a wrong password", () => {
  throw new Error(
    "Postgres is not available, and the Neon HTTP client cannot use a local server.",
  );
});
