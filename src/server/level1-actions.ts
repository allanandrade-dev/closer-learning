"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { levels } from "@/db/schema";
import {
  applyAttempt,
  type ChallengeType,
  type LevelRules,
} from "@/lib/scoring";
import { requireUser } from "@/server/auth";
import { gradeLevel1 } from "@/server/level1";
import {
  assertLevelUnlocked,
  readProgress,
  recordAttempt,
  UserFacingError,
} from "@/server/progress";

const VECTORS_SLUG = "vectors";

const CHALLENGE_TYPES: readonly ChallengeType[] = [
  "vectors",
  "embeddings",
  "search",
];

function challengeTypeOf(value: string): ChallengeType {
  if (CHALLENGE_TYPES.includes(value as ChallengeType)) {
    return value as ChallengeType;
  }
  throw new UserFacingError("Level vectors is not available.");
}

async function loadVectorsLevel(): Promise<
  LevelRules & { id: number; order: number }
> {
  const rows = await db
    .select({
      id: levels.id,
      order: levels.order,
      challengeType: levels.challengeType,
      passMark: levels.passMark,
      xpReward: levels.xpReward,
    })
    .from(levels)
    .where(eq(levels.slug, VECTORS_SLUG))
    .limit(1);

  const level = rows[0];
  if (!level) {
    throw new UserFacingError("Level vectors is not available.");
  }

  return {
    id: level.id,
    order: level.order,
    challengeType: challengeTypeOf(level.challengeType),
    passMark: level.passMark,
    xpReward: level.xpReward,
  };
}

export async function submitLevel1(answers: { x: number; y: number }[]): Promise<{
  rounds: { distance: number; score: number }[];
  score: number;
  passed: boolean;
  xpAwarded: number;
}> {
  const session = await requireUser();
  const userId = session.user.id;
  // Validates before any query. Targets come from LEVEL1_TARGETS, not the client.
  const graded = gradeLevel1(answers);

  try {
    const level = await loadVectorsLevel();
    await assertLevelUnlocked(userId, level.order);
    const existing = await readProgress(userId, level.id);
    const attempt = applyAttempt(existing, graded.score, {
      challengeType: level.challengeType,
      passMark: level.passMark,
      xpReward: level.xpReward,
    });
    const saved = await recordAttempt({
      userId,
      levelId: level.id,
      passed: attempt.passed,
      bestScore: attempt.bestScore,
      xpEarned: attempt.xpAwarded,
    });

    return {
      rounds: graded.rounds,
      score: graded.score,
      passed: saved.passed,
      xpAwarded: saved.xpAwarded,
    };
  } catch (error) {
    if (error instanceof UserFacingError) {
      throw error;
    }
    console.error("submitLevel1 failed");
    throw new Error("Something went wrong. Try again.");
  }
}
