function assertFinitePoint(
  point: { x: number; y: number },
  label: string,
): void {
  if (
    point == null ||
    typeof point.x !== "number" ||
    typeof point.y !== "number" ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    throw new Error(`distanceScore requires finite ${label} coordinates`);
  }
}

/** Euclidean distance and the 0–100 closeness score. Score is 0 once d >= 3. */
export function distanceScore(
  user: { x: number; y: number },
  target: { x: number; y: number },
): { distance: number; score: number } {
  assertFinitePoint(user, "user");
  assertFinitePoint(target, "target");

  const distance = Math.hypot(user.x - target.x, user.y - target.y);
  const score = Math.max(0, Math.round(100 * (1 - distance / 3)));

  return { distance, score };
}

export type ChallengeType = "vectors" | "embeddings" | "search";

export type LevelRules = {
  challengeType: ChallengeType;
  passMark: number;
  xpReward: number;
};

/** Stored attempt summary. Pass `null` when the player has no row yet. */
export type Progress = {
  passed: boolean;
  bestScore: number;
  xpEarned: number;
};

/** Rounded mean of the three vector-round scores. */
export function levelOneScore(rounds: number[]): number {
  if (!Array.isArray(rounds) || rounds.length !== 3) {
    throw new Error("levelOneScore expects exactly 3 round scores");
  }

  for (const round of rounds) {
    if (typeof round !== "number" || !Number.isFinite(round)) {
      throw new Error("levelOneScore requires finite round scores");
    }
  }

  return Math.round((rounds[0] + rounds[1] + rounds[2]) / 3);
}

export function isPassing(score: number, level: LevelRules): boolean {
  if (level.challengeType === "search") {
    // 1-based rank. Not-found is Infinity or 0 and fails.
    // A found document passes when its rank is at least as good as passMark.
    return Number.isFinite(score) && score >= 1 && score <= level.passMark;
  }

  return Number.isFinite(score) && score >= level.passMark;
}
