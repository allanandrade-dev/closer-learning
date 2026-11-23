import { isLevelUnlocked } from "@/lib/scoring";

export const LEVEL_GOALS: Record<string, string> = {
  vectors: "Move an arrow to hit a target.",
  embeddings: "Guess which words live closest to each other.",
  search: "Write a query pgvector ranks in the top 3.",
};

export const COMING_SOON_LEVELS = [
  { key: "indexes", title: "Indexes (HNSW)" },
  { key: "hybrid", title: "Hybrid search" },
  { key: "rag", title: "RAG" },
] as const;

export type MapLevel = {
  id: number;
  slug: string;
  order: number;
  title: string;
};

export type MapProgress = {
  levelId: number;
  passed: boolean;
  bestScore: number;
  xpEarned: number;
};

export type NodeState = "locked" | "available" | "completed" | "coming-soon";

export type JourneyNode = {
  key: string;
  order: number | null;
  title: string;
  goal: string;
  state: NodeState;
  href: string | null;
  badge: string;
  xpEarned: number | null;
  bestScore: number | null;
  unlockHint: string | null;
  ariaLabel: string | null;
};

export type Journey = {
  nodes: JourneyNode[];
  totalXp: number;
  showEmptyHint: boolean;
  showFinishedBanner: boolean;
};

function playableNode(
  level: MapLevel,
  row: MapProgress | undefined,
  passedOrders: number[],
): JourneyNode {
  const passed = row?.passed ?? false;
  const goal = LEVEL_GOALS[level.slug] ?? "";
  const base = {
    key: level.slug,
    order: level.order,
    title: level.title,
    goal,
  };

  if (passed) {
    const xpEarned = row?.xpEarned ?? 0;
    return {
      ...base,
      state: "completed",
      href: `/level/${level.slug}`,
      badge: `+${xpEarned} XP`,
      xpEarned,
      bestScore: row?.bestScore ?? 0,
      unlockHint: null,
      ariaLabel: `Level ${level.order}, ${level.title}, completed`,
    };
  }

  if (isLevelUnlocked(level.order, passedOrders)) {
    return {
      ...base,
      state: "available",
      href: `/level/${level.slug}`,
      badge: "Start",
      xpEarned: null,
      bestScore: null,
      unlockHint: null,
      ariaLabel: `Level ${level.order}, ${level.title}, available`,
    };
  }

  return {
    ...base,
    state: "locked",
    href: null,
    badge: "Locked",
    xpEarned: null,
    bestScore: null,
    unlockHint: `Finish level ${level.order - 1} to unlock`,
    ariaLabel: null,
  };
}

function comingSoonNode(level: (typeof COMING_SOON_LEVELS)[number]): JourneyNode {
  return {
    key: level.key,
    order: null,
    title: level.title,
    goal: "",
    state: "coming-soon",
    href: null,
    badge: "Coming soon",
    xpEarned: null,
    bestScore: null,
    unlockHint: null,
    ariaLabel: null,
  };
}

/** Levels plus the signed-in user's progress, as view models for the map. */
export function buildJourney(levels: MapLevel[], progress: MapProgress[]): Journey {
  const sorted = [...levels].sort((a, b) => a.order - b.order);
  const progressByLevel = new Map(progress.map((row) => [row.levelId, row]));
  const passedOrders = sorted
    .filter((level) => progressByLevel.get(level.id)?.passed)
    .map((level) => level.order);

  const playable = sorted.map((level) =>
    playableNode(level, progressByLevel.get(level.id), passedOrders),
  );
  const nodes = [...playable, ...COMING_SOON_LEVELS.map(comingSoonNode)];

  return {
    nodes,
    totalXp: progress.reduce((sum, row) => sum + row.xpEarned, 0),
    showEmptyHint: progress.length === 0,
    showFinishedBanner:
      playable.length > 0 && playable.every((node) => node.state === "completed"),
  };
}
