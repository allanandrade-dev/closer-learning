import { and, cosineDistance, eq, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { db, type Database } from "@/db";
import { words } from "@/db/schema";
import { UserFacingError } from "@/server/progress";

const PICK_MAX_LENGTH = 64;
const SUBMISSION_LENGTH = 3;

export type Level2Distance = {
  text: string;
  distance: number;
};

export type GradedRound = {
  answer: string;
  distances: Level2Distance[];
};

export type Level2Pick = {
  roundId: number;
  pick: string;
};

type GradeDatabase = Pick<Database, "select">;

function assertRoundId(roundId: unknown): asserts roundId is number {
  if (
    typeof roundId !== "number" ||
    !Number.isSafeInteger(roundId) ||
    roundId <= 0
  ) {
    throw new Error("roundId must be a positive integer.");
  }
}

function normalizePick(pick: unknown): string {
  if (typeof pick !== "string") {
    throw new Error("pick must be a non-empty string.");
  }

  const trimmed = pick.trim();
  if (trimmed.length === 0) {
    throw new Error("pick must be a non-empty string.");
  }
  if (trimmed.length > PICK_MAX_LENGTH) {
    throw new Error("pick must be at most 64 characters.");
  }

  return trimmed;
}

/** Validate one round id and pick. Trims the pick. Does not touch the database. */
export function parseLevel2Pick(roundId: unknown, pick: unknown): Level2Pick {
  assertRoundId(roundId);
  return { roundId, pick: normalizePick(pick) };
}

/**
 * Validate a level 2 submission. Exactly three results, three distinct rounds.
 * Extra fields, including a client `correct` flag, are ignored.
 */
export function parseLevel2Submission(results: unknown): Level2Pick[] {
  if (!Array.isArray(results) || results.length !== SUBMISSION_LENGTH) {
    throw new Error("Level 2 expects exactly 3 results.");
  }

  const picks = results.map((result) => {
    if (result == null || typeof result !== "object") {
      throw new Error("Each result needs a roundId and a pick.");
    }
    const row = result as { roundId?: unknown; pick?: unknown };
    return parseLevel2Pick(row.roundId, row.pick);
  });

  const roundIds = new Set(picks.map((pick) => pick.roundId));
  if (roundIds.size !== picks.length) {
    throw new Error("Level 2 expects 3 distinct rounds.");
  }

  return picks;
}

/** Case-insensitive match after trimming both sides. */
export function picksMatch(pick: string, answer: string): boolean {
  return pick.trim().toLowerCase() === answer.trim().toLowerCase();
}

function targetEmbedding(roundId: number) {
  const builder = new QueryBuilder();
  return builder
    .select({ embedding: words.embedding })
    .from(words)
    .where(and(eq(words.roundId, roundId), eq(words.role, "target")));
}

/**
 * Candidates for one round, closest first.
 * `<=>` is pgvector cosine distance (smaller is closer). `roundId` is bound
 * through the query builder and is never concatenated into the SQL text.
 */
export function buildGradeRoundQuery(database: GradeDatabase, roundId: number) {
  const distance = cosineDistance(words.embedding, targetEmbedding(roundId));

  return database
    .select({
      text: words.text,
      distance: distance.as("distance"),
    })
    .from(words)
    .where(and(eq(words.roundId, roundId), eq(words.role, "candidate")))
    .orderBy(sql`distance`);
}

function distanceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function toGradedRound(rows: readonly unknown[]): GradedRound {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new UserFacingError("This round is not available.");
  }

  const distances = rows.map((row) => {
    if (row == null || typeof row !== "object") {
      throw new UserFacingError("This round is not available.");
    }

    const record = row as { text?: unknown; distance?: unknown };
    const distance = distanceNumber(record.distance);
    if (
      typeof record.text !== "string" ||
      record.text.length === 0 ||
      distance == null
    ) {
      throw new UserFacingError("This round is not available.");
    }

    return { text: record.text, distance };
  });

  return { answer: distances[0].text, distances };
}

/** Grade one round. The first row is the correct answer. Does not write progress. */
export async function gradeRound(roundId: number): Promise<GradedRound> {
  const rows = await buildGradeRoundQuery(db, roundId);
  return toGradedRound(rows);
}
