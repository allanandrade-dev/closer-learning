import { expect, test } from "vitest";

import { decideLevelAccess, levelAccessRedirect, type LevelRecord } from "@/components/level/access";

const levels: LevelRecord[] = [
  { id: 1, slug: "vectors", order: 1, title: "Vectors", challengeType: "vectors" },
  { id: 2, slug: "embeddings", order: 2, title: "Embeddings", challengeType: "embeddings" },
  { id: 3, slug: "search", order: 3, title: "Similarity search", challengeType: "search" },
  { id: 4, slug: "indexes", order: 4, title: "Indexes", challengeType: "search" },
];

const lessons = new Set(["vectors", "embeddings", "search"]);

test("an unknown slug is not found", () => {
  const decision = decideLevelAccess("nope", levels, [], lessons);

  expect(decision).toEqual({ status: "not-found" });
  expect(levelAccessRedirect(decision)).toBeNull();
});

test("a later level stays locked until the previous one is passed", () => {
  const decision = decideLevelAccess("embeddings", levels, [], lessons);

  expect(decision).toEqual({ status: "locked", slug: "embeddings" });
  expect(levelAccessRedirect(decision)).toBe("/map?locked=embeddings");
});

test("passing the level itself does not skip the previous level", () => {
  const decision = decideLevelAccess(
    "search",
    levels,
    [{ levelId: 3, passed: true, bestScore: 100, xpEarned: 60 }],
    lessons,
  );

  expect(decision.status).toBe("locked");
});

test("level 1 is ready with no progress", () => {
  const decision = decideLevelAccess("vectors", levels, [], lessons);

  expect(decision).toEqual({
    status: "ready",
    level: levels[0],
    passed: false,
    bestScore: 0,
    totalXp: 0,
  });
  expect(levelAccessRedirect(decision)).toBeNull();
});

test("a passed level reports its best score and the user's total XP", () => {
  const decision = decideLevelAccess(
    "embeddings",
    levels,
    [
      { levelId: 1, passed: true, bestScore: 91, xpEarned: 100 },
      { levelId: 2, passed: true, bestScore: 86, xpEarned: 40 },
    ],
    lessons,
  );

  expect(decision).toMatchObject({
    status: "ready",
    passed: true,
    bestScore: 86,
    totalXp: 140,
  });
});

test("an unlocked level with no lesson content is coming soon", () => {
  const decision = decideLevelAccess(
    "indexes",
    levels,
    [
      { levelId: 1, passed: true, bestScore: 80, xpEarned: 100 },
      { levelId: 2, passed: true, bestScore: 80, xpEarned: 40 },
      { levelId: 3, passed: true, bestScore: 80, xpEarned: 60 },
    ],
    lessons,
  );

  expect(decision).toEqual({ status: "coming-soon" });
  expect(levelAccessRedirect(decision)).toBe("/map");
});
