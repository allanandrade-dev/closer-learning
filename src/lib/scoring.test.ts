import { expect, test } from "vitest";
import { distanceScore } from "@/lib/scoring";

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
