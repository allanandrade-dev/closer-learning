import { expect, test } from "vitest";
import {
  applyAttempt,
  distanceScore,
  isLevelUnlocked,
  isPassing,
  levelOneScore,
  type LevelRules,
  type Progress,
} from "@/lib/scoring";

const vectors: LevelRules = {
  challengeType: "vectors",
  passMark: 70,
  xpReward: 100,
};

const embeddings: LevelRules = {
  challengeType: "embeddings",
  passMark: 2,
  xpReward: 150,
};

const search: LevelRules = {
  challengeType: "search",
  passMark: 3,
  xpReward: 200,
};

test("exact hit scores 100", () => {
  const result = distanceScore({ x: 0, y: 0 }, { x: 0, y: 0 });

  expect(result.distance).toBe(0);
  expect(result.score).toBe(100);
});

test("distance 0.5 scores 83", () => {
  const result = distanceScore({ x: 0, y: 0 }, { x: 0.5, y: 0 });

  expect(result.distance).toBeCloseTo(0.5);
  expect(result.score).toBe(83);
});

test("distance 0.71 scores 76", () => {
  const result = distanceScore({ x: 0, y: 0 }, { x: 0.71, y: 0 });

  expect(result.distance).toBeCloseTo(0.71);
  expect(result.score).toBe(76);
});

test("distance 1/sqrt(2) scores 76", () => {
  const result = distanceScore({ x: 0, y: 0 }, { x: 0.5, y: 0.5 });

  expect(result.distance).toBeCloseTo(1 / Math.sqrt(2));
  expect(result.score).toBe(76);
});

test("distance 1 scores 67", () => {
  const result = distanceScore({ x: 0, y: 0 }, { x: 1, y: 0 });

  expect(result.distance).toBeCloseTo(1);
  expect(result.score).toBe(67);
});

test("distance 3 scores 0", () => {
  const result = distanceScore({ x: 0, y: 0 }, { x: 3, y: 0 });

  expect(result.distance).toBeCloseTo(3);
  expect(result.score).toBe(0);
});

test("distance 5 scores 0", () => {
  const result = distanceScore({ x: 0, y: 0 }, { x: 5, y: 0 });

  expect(result.distance).toBeCloseTo(5);
  expect(result.score).toBe(0);
});

test("level one average of 100, 83, and 0 is 61 and fails", () => {
  const score = levelOneScore([100, 83, 0]);

  expect(score).toBe(61);
  expect(isPassing(score, vectors)).toBe(false);
});

test("level one average of 70 passes", () => {
  expect(levelOneScore([100, 70, 40])).toBe(70);
  expect(isPassing(70, vectors)).toBe(true);
});

test("levelOneScore rejects a round count other than 3", () => {
  expect(() => levelOneScore([100, 83])).toThrow();
  expect(() => levelOneScore([100, 83, 0, 40])).toThrow();
});

test("levelOneScore rejects a non-finite round", () => {
  expect(() => levelOneScore([100, Number.NaN, 0])).toThrow();
});

test("distance is unsigned, so a point on the other side scores the same", () => {
  expect(distanceScore({ x: 0, y: 0 }, { x: -1, y: 0 }).score).toBe(67);
});

test("embeddings: 2 of 3 passes and 1 of 3 fails", () => {
  expect(isPassing(2, embeddings)).toBe(true);
  expect(isPassing(3, embeddings)).toBe(true);
  expect(isPassing(1, embeddings)).toBe(false);
});

test("search rank 3 passes, rank 4 and not-found fail", () => {
  expect(isPassing(3, search)).toBe(true);
  expect(isPassing(1, search)).toBe(true);
  expect(isPassing(4, search)).toBe(false);
  expect(isPassing(Number.POSITIVE_INFINITY, search)).toBe(false);
  expect(isPassing(0, search)).toBe(false);
});

test("first pass awards the level XP", () => {
  expect(applyAttempt(null, 70, vectors)).toEqual({
    passed: true,
    bestScore: 70,
    xpAwarded: 100,
  });
  expect(applyAttempt(null, 2, embeddings)).toEqual({
    passed: true,
    bestScore: 2,
    xpAwarded: 150,
  });
});

test("a second pass awards 0 XP and keeps xpEarned", () => {
  const progress: Progress = { passed: true, bestScore: 70, xpEarned: 100 };

  const result = applyAttempt(progress, 70, vectors);

  expect(result).toEqual({ passed: true, bestScore: 70, xpAwarded: 0 });
  expect(progress.xpEarned).toBe(100);
});

test("a higher score on retry updates bestScore but not XP", () => {
  const progress: Progress = { passed: true, bestScore: 70, xpEarned: 100 };

  expect(applyAttempt(progress, 95, vectors)).toEqual({
    passed: true,
    bestScore: 95,
    xpAwarded: 0,
  });
});

test("a fail awards 0, keeps the previous best, and does not un-pass", () => {
  const progress: Progress = { passed: true, bestScore: 80, xpEarned: 100 };

  expect(applyAttempt(progress, 40, vectors)).toEqual({
    passed: true,
    bestScore: 80,
    xpAwarded: 0,
  });
});

test("a worse failing score keeps the previous best", () => {
  const progress: Progress = { passed: false, bestScore: 50, xpEarned: 0 };

  expect(applyAttempt(progress, 20, vectors)).toEqual({
    passed: false,
    bestScore: 50,
    xpAwarded: 0,
  });
});

test("a better failing score updates bestScore without XP", () => {
  const progress: Progress = { passed: false, bestScore: 40, xpEarned: 0 };

  expect(applyAttempt(progress, 61, vectors)).toEqual({
    passed: false,
    bestScore: 61,
    xpAwarded: 0,
  });
});

test("search keeps the lowest rank and stores 0 when nothing is found", () => {
  const missed = applyAttempt(null, Number.POSITIVE_INFINITY, search);
  expect(missed).toEqual({ passed: false, bestScore: 0, xpAwarded: 0 });

  const rank4 = applyAttempt(
    { passed: false, bestScore: missed.bestScore, xpEarned: 0 },
    4,
    search,
  );
  expect(rank4).toEqual({ passed: false, bestScore: 4, xpAwarded: 0 });

  const rank3 = applyAttempt(
    { passed: false, bestScore: rank4.bestScore, xpEarned: 0 },
    3,
    search,
  );
  expect(rank3).toEqual({ passed: true, bestScore: 3, xpAwarded: 200 });

  const laterMiss = applyAttempt(
    { passed: true, bestScore: rank3.bestScore, xpEarned: 200 },
    0,
    search,
  );
  expect(laterMiss).toEqual({ passed: true, bestScore: 3, xpAwarded: 0 });
});

test("a better search rank updates bestScore without paying XP again", () => {
  const progress: Progress = { passed: true, bestScore: 3, xpEarned: 200 };

  expect(applyAttempt(progress, 1, search)).toEqual({
    passed: true,
    bestScore: 1,
    xpAwarded: 0,
  });
  expect(applyAttempt(progress, 4, search)).toEqual({
    passed: true,
    bestScore: 3,
    xpAwarded: 0,
  });
});

test("applyAttempt does not mutate its input", () => {
  const progress: Progress = Object.freeze({
    passed: true,
    bestScore: 80,
    xpEarned: 100,
  });

  const result = applyAttempt(progress, 90, vectors);

  expect(progress).toEqual({ passed: true, bestScore: 80, xpEarned: 100 });
  expect(result).toEqual({ passed: true, bestScore: 90, xpAwarded: 0 });
});

test("level 1 is unlocked before anything is passed", () => {
  expect(isLevelUnlocked(1, [])).toBe(true);
  expect(isLevelUnlocked(1, new Set<number>())).toBe(true);
});

test("level 2 unlocks only after level 1 is passed", () => {
  expect(isLevelUnlocked(2, [])).toBe(false);
  expect(isLevelUnlocked(2, [1])).toBe(true);
  expect(isLevelUnlocked(2, new Set([1]))).toBe(true);
  expect(isLevelUnlocked(2, [2])).toBe(false);
});

test("level 3 unlocks only after level 2 is passed", () => {
  expect(isLevelUnlocked(3, [])).toBe(false);
  expect(isLevelUnlocked(3, [1])).toBe(false);
  expect(isLevelUnlocked(3, [2])).toBe(true);
  expect(isLevelUnlocked(3, new Set([1, 2]))).toBe(true);
});

test("isLevelUnlocked does not mutate passed orders", () => {
  const orders = [1, 2];
  const passed = new Set([1, 2]);

  expect(isLevelUnlocked(3, orders)).toBe(true);
  expect(isLevelUnlocked(3, passed)).toBe(true);
  expect(orders).toEqual([1, 2]);
  expect([...passed]).toEqual([1, 2]);
});

test("distanceScore rejects non-finite coordinates", () => {
  expect(() =>
    distanceScore({ x: Number.NaN, y: 0 }, { x: 0, y: 0 }),
  ).toThrow();
  expect(() =>
    distanceScore({ x: 0, y: Number.POSITIVE_INFINITY }, { x: 0, y: 0 }),
  ).toThrow();
  expect(() =>
    distanceScore({ x: 0, y: 0 }, { x: Number.NEGATIVE_INFINITY, y: 1 }),
  ).toThrow();
});
