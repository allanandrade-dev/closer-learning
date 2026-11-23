import { and, eq, sql } from "drizzle-orm";
import { db, type Database } from "@/db";
import { levels, progress } from "@/db/schema";
import { isLevelUnlocked, type Progress } from "@/lib/scoring";

/** Thrown for a result the UI can show. Database failures must not use this. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export type AttemptWrite = {
  userId: string;
  levelId: number;
  passed: boolean;
  bestScore: number;
  /**
   * XP to store on insert, and to add on conflict only when the stored row
   * is not already passed. Higher-is-better levels (level 1 and level 2).
   */
  xpEarned: number;
};

export type RecordedAttempt = {
  passed: boolean;
  xpAwarded: number;
};

type ProgressWriter = Pick<Database, "$with" | "with" | "insert" | "select">;

/**
 * One INSERT ... ON CONFLICT DO UPDATE. neon-http cannot run an interactive
 * transaction, so the read of the previous XP and the write share this statement.
 * `xp_awarded` is the stored XP minus the XP visible to the statement (`prev`),
 * not the pre-read and not `applyAttempt`.
 *
 * `best_score` uses GREATEST (higher is better), which is what level 1 and
 * level 2 need. Search ranks are not written here.
 */
export function buildProgressUpsert(database: ProgressWriter, attempt: AttemptWrite) {
  const prev = database.$with("prev").as(
    database
      .select({ xpEarned: progress.xpEarned })
      .from(progress)
      .where(
        and(
          eq(progress.userId, attempt.userId),
          eq(progress.levelId, attempt.levelId),
        ),
      )
      .limit(1),
  );

  return database
    .with(prev)
    .insert(progress)
    .values({
      userId: attempt.userId,
      levelId: attempt.levelId,
      passed: attempt.passed,
      bestScore: attempt.bestScore,
      xpEarned: attempt.xpEarned,
      passedAt: sql`CASE WHEN ${attempt.passed} THEN now() ELSE NULL END`,
      updatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: [progress.userId, progress.levelId],
      set: {
        passed: sql`${progress.passed} OR excluded.passed`,
        bestScore: sql`GREATEST(${progress.bestScore}, excluded.best_score)`,
        xpEarned: sql`CASE WHEN ${progress.passed} THEN ${progress.xpEarned} ELSE ${progress.xpEarned} + excluded.xp_earned END`,
        passedAt: sql`COALESCE(${progress.passedAt}, excluded.passed_at)`,
        updatedAt: sql`now()`,
      },
    })
    .returning({
      passed: progress.passed,
      xpAwarded:
        sql<number>`"progress"."xp_earned" - COALESCE((SELECT "xp_earned" FROM "prev"), 0)`.as(
          "xp_awarded",
        ),
    });
}

export async function assertLevelUnlocked(
  userId: string,
  levelOrder: number,
): Promise<void> {
  const rows = await db
    .select({ order: levels.order })
    .from(progress)
    .innerJoin(levels, eq(progress.levelId, levels.id))
    .where(and(eq(progress.userId, userId), eq(progress.passed, true)));

  if (!isLevelUnlocked(levelOrder, rows.map((row) => row.order))) {
    throw new UserFacingError("This level is locked.");
  }
}

export async function readProgress(
  userId: string,
  levelId: number,
): Promise<Progress | null> {
  const rows = await db
    .select({
      passed: progress.passed,
      bestScore: progress.bestScore,
      xpEarned: progress.xpEarned,
    })
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.levelId, levelId)))
    .limit(1);

  return rows[0] ?? null;
}

function xpAwardedFromReturning(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number(value);
  }
  throw new Error("progress upsert returned an unreadable xp award");
}

export async function recordAttempt(attempt: AttemptWrite): Promise<RecordedAttempt> {
  const rows = await buildProgressUpsert(db, attempt);
  const row = rows[0];
  if (!row || typeof row.passed !== "boolean") {
    throw new Error("progress upsert returned no row");
  }

  return {
    passed: row.passed,
    xpAwarded: xpAwardedFromReturning(row.xpAwarded),
  };
}
