import { expect, test } from "vitest";
import {
  distanceScore,
  isPassing,
  levelOneScore,
  type LevelRules,
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
