import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { expect, test } from "vitest";
import * as schema from "@/db/schema";
import {
  buildGradeRoundQuery,
  parseLevel2Pick,
  parseLevel2Submission,
  picksMatch,
} from "@/server/level2";

// Compiled only. neon-http connects on query, and `toSQL()` does not query.
// This does not run the pgvector statement against Postgres.
const database = drizzle(neon("postgres://user:pass@127.0.0.1:5432/db"), {
  schema,
});

test("parseLevel2Pick accepts a positive integer and a trimmed pick", () => {
  expect(parseLevel2Pick(2, "  Queen  ")).toEqual({
    roundId: 2,
    pick: "Queen",
  });
  expect(parseLevel2Pick(1, "a".repeat(64))).toEqual({
    roundId: 1,
    pick: "a".repeat(64),
  });
});

test("parseLevel2Pick rejects a round id that is not a positive integer", () => {
  const rejected: unknown[] = [
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "1",
    null,
    undefined,
  ];

  for (const roundId of rejected) {
    expect(() => parseLevel2Pick(roundId, "queen")).toThrow(
      "roundId must be a positive integer.",
    );
  }
});

test("parseLevel2Pick rejects an empty, non-string, or overlong pick", () => {
  expect(() => parseLevel2Pick(1, "")).toThrow(
    "pick must be a non-empty string.",
  );
  expect(() => parseLevel2Pick(1, "   ")).toThrow(
    "pick must be a non-empty string.",
  );
  expect(() => parseLevel2Pick(1, 1)).toThrow(
    "pick must be a non-empty string.",
  );
  expect(() => parseLevel2Pick(1, null)).toThrow(
    "pick must be a non-empty string.",
  );
  expect(() => parseLevel2Pick(1, "a".repeat(65))).toThrow(
    "pick must be at most 64 characters.",
  );
});

test("parseLevel2Submission requires exactly 3 distinct rounds and drops extra fields", () => {
  expect(
    parseLevel2Submission([
      { roundId: 1, pick: " queen ", correct: true },
      { roundId: 2, pick: "nurse", correct: false },
      { roundId: 3, pick: " sea ", correct: true },
    ]),
  ).toEqual([
    { roundId: 1, pick: "queen" },
    { roundId: 2, pick: "nurse" },
    { roundId: 3, pick: "sea" },
  ]);
});

test("parseLevel2Submission rejects the wrong shape and duplicate rounds", () => {
  expect(() => parseLevel2Submission(null)).toThrow(
    "Level 2 expects exactly 3 results.",
  );
  expect(() =>
    parseLevel2Submission([
      { roundId: 1, pick: "queen" },
      { roundId: 2, pick: "nurse" },
    ]),
  ).toThrow("Level 2 expects exactly 3 results.");
  expect(() =>
    parseLevel2Submission([
      { roundId: 1, pick: "queen" },
      { roundId: 2, pick: "nurse" },
      { roundId: 3, pick: "sea" },
      { roundId: 4, pick: "river" },
    ]),
  ).toThrow("Level 2 expects exactly 3 results.");
  expect(() =>
    parseLevel2Submission([
      { roundId: 1, pick: "queen" },
      null,
      { roundId: 3, pick: "sea" },
    ]),
  ).toThrow("Each result needs a roundId and a pick.");
  expect(() =>
    parseLevel2Submission([
      { roundId: 1, pick: "queen" },
      { roundId: 1, pick: "nurse" },
      { roundId: 3, pick: "sea" },
    ]),
  ).toThrow("Level 2 expects 3 distinct rounds.");
});

test("picksMatch compares trimmed case-insensitive text", () => {
  expect(picksMatch("  Queen ", "queen")).toBe(true);
  expect(picksMatch("queen", "  QUEEN")).toBe(true);
  expect(picksMatch("queen", "queens")).toBe(false);
});

test("grading query uses a parameterized pgvector cosine distance", () => {
  const roundId = 481516;
  const query = buildGradeRoundQuery(database, roundId).toSQL();

  expect(query.sql.includes(";")).toBe(false);
  expect(query.sql).toContain("<=>");
  expect(query.sql).toContain("order by distance");
  expect(query.sql.includes("desc")).toBe(false);
  expect(query.sql.includes(String(roundId))).toBe(false);
  expect(query.params).toEqual([roundId, "target", roundId, "candidate"]);
});
