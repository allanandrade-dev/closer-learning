import { isLevelUnlocked } from "@/lib/scoring";

export type LevelRecord = {
  id: number;
  slug: string;
  order: number;
  title: string;
  challengeType: string;
};

export type ProgressRecord = {
  levelId: number;
  passed: boolean;
  bestScore: number;
  xpEarned: number;
};

export type LevelDecision =
  | { status: "not-found" }
  | { status: "locked"; slug: string }
  | { status: "coming-soon" }
  | {
      status: "ready";
      level: LevelRecord;
      passed: boolean;
      bestScore: number;
      totalXp: number;
    };

/**
 * Same unlock rule as the map (`isLevelUnlocked`): level 1 is open, and level
 * n opens only after level n − 1 is passed. A slug missing from `levels` is
 * not found. An unlocked level with no lesson cards is coming soon.
 */
export function decideLevelAccess(
  slug: string,
  levels: readonly LevelRecord[],
  progress: readonly ProgressRecord[],
  lessonSlugs: ReadonlySet<string>,
): LevelDecision {
  const level = levels.find((row) => row.slug === slug);
  if (!level) return { status: "not-found" };

  const passedOrders = levels
    .filter((row) => progress.some((entry) => entry.levelId === row.id && entry.passed))
    .map((row) => row.order);

  if (!isLevelUnlocked(level.order, passedOrders)) {
    return { status: "locked", slug };
  }

  if (!lessonSlugs.has(slug)) return { status: "coming-soon" };

  const row = progress.find((entry) => entry.levelId === level.id);
  return {
    status: "ready",
    level,
    passed: row?.passed ?? false,
    bestScore: row?.bestScore ?? 0,
    totalXp: progress.reduce((sum, entry) => sum + entry.xpEarned, 0),
  };
}

/** Where the level page should send the player, or null when the level can render. */
export function levelAccessRedirect(decision: LevelDecision): string | null {
  if (decision.status === "locked") {
    return `/map?locked=${encodeURIComponent(decision.slug)}`;
  }
  if (decision.status === "coming-soon") return "/map";
  return null;
}
