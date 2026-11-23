import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { expect, test } from "vitest";
import * as schema from "@/db/schema";
import { buildProgressUpsert, type AttemptWrite } from "@/server/progress";

// Compiled only. The URL is never opened: neon-http connects on query, and
// `toSQL()` does not query. This VM has no Postgres.
const database = drizzle(neon("postgres://user:pass@127.0.0.1:5432/db"), {
  schema,
});

const attempt: AttemptWrite = {
  userId: "user-1",
  levelId: 4,
  passed: true,
  bestScore: 100,
  xpEarned: 80,
};

test("progress upsert is one statement and returns the awarded XP", () => {
  const query = buildProgressUpsert(database, attempt).toSQL();

  expect(query.sql.includes(";")).toBe(false);
  expect(query.sql).toContain(
    'with "prev" as (select "xp_earned" from "progress"',
  );
  expect(query.sql).toContain(
    'on conflict ("user_id","level_id") do update set "passed" = "progress"."passed" OR excluded.passed',
  );
  expect(query.sql).toContain(
    '"best_score" = GREATEST("progress"."best_score", excluded.best_score)',
  );
  expect(query.sql).toContain(
    '"xp_earned" = CASE WHEN "progress"."passed" THEN "progress"."xp_earned" ELSE "progress"."xp_earned" + excluded.xp_earned END',
  );
  expect(query.sql).toContain(
    '"passed_at" = COALESCE("progress"."passed_at", excluded.passed_at)',
  );
  expect(query.sql).toContain('"updated_at" = now()');
  expect(query.sql).toContain(
    'returning "passed", "progress"."xp_earned" - COALESCE((SELECT "xp_earned" FROM "prev"), 0) as "xp_awarded"',
  );
  expect(query.params).toContain("user-1");
  expect(query.params).toContain(4);
  expect(query.params).toContain(80);
});
