import { expect, test } from "vitest";

import { buildJourney, type MapLevel, type MapProgress } from "@/components/map/journey";

const levels: MapLevel[] = [
  { id: 1, slug: "vectors", order: 1, title: "Vectors" },
  { id: 2, slug: "embeddings", order: 2, title: "Embeddings" },
  { id: 3, slug: "search", order: 3, title: "Similarity search" },
];

function states(progress: MapProgress[]) {
  return buildJourney(levels, progress).nodes.map((node) => [node.title, node.state]);
}

test("a new user can play level 1, with later levels locked or coming soon", () => {
  const journey = buildJourney(levels, []);

  expect(states([])).toEqual([
    ["Vectors", "available"],
    ["Embeddings", "locked"],
    ["Similarity search", "locked"],
    ["Indexes (HNSW)", "coming-soon"],
    ["Hybrid search", "coming-soon"],
    ["RAG", "coming-soon"],
  ]);
  expect(journey.nodes[0]?.href).toBe("/level/vectors");
  expect(journey.nodes[1]?.href).toBeNull();
  expect(journey.nodes[1]?.unlockHint).toBe("Finish level 1 to unlock");
  expect(journey.nodes[3]?.order).toBeNull();
  expect(journey.nodes[0]?.goal).toBe("Move an arrow to hit a target.");
  expect(journey.totalXp).toBe(0);
  expect(journey.showEmptyHint).toBe(true);
  expect(journey.showFinishedBanner).toBe(false);
});

test("passing level 1 completes it and unlocks level 2", () => {
  const journey = buildJourney(levels, [
    { levelId: 1, passed: true, bestScore: 91, xpEarned: 100 },
  ]);

  expect(journey.nodes[0]).toMatchObject({
    state: "completed",
    xpEarned: 100,
    bestScore: 91,
    badge: "+100 XP",
    href: "/level/vectors",
  });
  expect(journey.nodes[1]?.state).toBe("available");
  expect(journey.nodes[1]?.href).toBe("/level/embeddings");
  expect(journey.nodes[2]?.state).toBe("locked");
  expect(journey.totalXp).toBe(100);
  expect(journey.showEmptyHint).toBe(false);
  expect(journey.showFinishedBanner).toBe(false);
});

test("passing every playable level raises the finished banner and sums XP", () => {
  const journey = buildJourney(levels, [
    { levelId: 1, passed: true, bestScore: 80, xpEarned: 100 },
    { levelId: 2, passed: true, bestScore: 90, xpEarned: 40 },
    { levelId: 3, passed: true, bestScore: 70, xpEarned: 60 },
  ]);

  expect(journey.nodes.slice(0, 3).every((node) => node.state === "completed")).toBe(
    true,
  );
  expect(journey.nodes[3]?.state).toBe("coming-soon");
  expect(journey.showFinishedBanner).toBe(true);
  expect(journey.totalXp).toBe(200);
});
