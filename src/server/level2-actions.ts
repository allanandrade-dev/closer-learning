"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { levels } from "@/db/schema";
import { applyAttempt } from "@/lib/scoring";
import { requireUser } from "@/server/auth";
import {
  gradeRound,
  parseLevel2Pick,
  parseLevel2Submission,
  picksMatch,
} from "@/server/level2";
import {
  assertLevelUnlocked,
  readProgress,
  recordAttempt,
  UserFacingError,
} from "@/server/progress";

const EMBEDDINGS_SLUG = "embeddings";

type EmbeddingsLevel = {
  id: number;
  order: number;
  challengeType: "embeddings";
  passMark: number;
  xpReward: number;
};

function failLevel2(error: unknown, label: string): never {
  if (error instanceof UserFacingError) {
    throw error;
  }
  console.error(label);
  throw new Error("Something went wrong. Try again.");
}

async function loadEmbeddingsLevel(): Promise<EmbeddingsLevel> {
  const rows = await db
    .select({
      id: levels.id,
      order: levels.order,
      challengeType: levels.challengeType,
      passMark: levels.passMark,
      xpReward: levels.xpReward,
    })
    .from(levels)
    .where(eq(levels.slug, EMBEDDINGS_SLUG))
    .limit(1);

  const level = rows[0];
  if (!level || level.challengeType !== "embeddings") {
    throw new UserFacingError("Level embeddings is not available.");
  }

  return {
    id: level.id,
    order: level.order,
    challengeType: "embeddings",
    passMark: level.passMark,
    xpReward: level.xpReward,
  };
}

export async function checkLevel2Round(
  roundId: number,
  pick: string,
): Promise<{
  correct: boolean;
  answer: string;
  distances: { text: string; distance: number }[];
}> {
  const session = await requireUser();
  const userId = session.user.id;
  const parsed = parseLevel2Pick(roundId, pick);

  try {
    const level = await loadEmbeddingsLevel();
    await assertLevelUnlocked(userId, level.order);
    const graded = await gradeRound(parsed.roundId);

    return {
      correct: picksMatch(parsed.pick, graded.answer),
      answer: graded.answer,
      distances: graded.distances,
    };
  } catch (error) {
    failLevel2(error, "checkLevel2Round failed");
  }
}

export async function submitLevel2(
  results: readonly { roundId: number; pick: string }[],
): Promise<{
  correctCount: number;
  passed: boolean;
  xpAwarded: number;
}> {
  const session = await requireUser();
  const userId = session.user.id;
  const picks = parseLevel2Submission(results);

  try {
    const level = await loadEmbeddingsLevel();
    await assertLevelUnlocked(userId, level.order);

    let correctCount = 0;
    for (const pick of picks) {
      const graded = await gradeRound(pick.roundId);
      if (picksMatch(pick.pick, graded.answer)) {
        correctCount += 1;
      }
    }

    const existing = await readProgress(userId, level.id);
    const attempt = applyAttempt(existing, correctCount, {
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
      correctCount,
      passed: saved.passed,
      xpAwarded: saved.xpAwarded,
    };
  } catch (error) {
    failLevel2(error, "submitLevel2 failed");
  }
}
