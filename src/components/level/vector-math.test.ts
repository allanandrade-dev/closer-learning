import { expect, test } from "vitest";

import {
  clampPlot,
  euclideanDistance,
  formatCoord,
  formatDistance,
  previewScore,
  snapToStep,
} from "@/components/level/vector-math";

test("snap rounds to 0.5 and clamp keeps the point on the plot", () => {
  expect(snapToStep(0.2)).toBe(0);
  expect(snapToStep(0.3)).toBe(0.5);
  expect(snapToStep(1.2)).toBe(1);
  expect(snapToStep(1.25)).toBe(1.5);
  expect(snapToStep(-1.2)).toBe(-1);
  expect(snapToStep(-1.3)).toBe(-1.5);
  expect(snapToStep(0)).toBe(0);
  expect(snapToStep(5)).toBe(5);
  expect(snapToStep(-5)).toBe(-5);
  expect(snapToStep(5.4)).toBe(5);
  expect(snapToStep(-5.4)).toBe(-5);
  expect(snapToStep(9)).toBe(5);
  expect(snapToStep(-9)).toBe(-5);
  expect(snapToStep(Number.NaN)).toBe(0);

  expect(clampPlot(1.2)).toBe(1.2);
  expect(clampPlot(9)).toBe(5);
  expect(clampPlot(-9)).toBe(-5);
});

test("distance is Euclidean", () => {
  expect(euclideanDistance({ x: 2.5, y: 1.5 }, { x: 3, y: 2 })).toBeCloseTo(
    Math.hypot(0.5, 0.5),
  );
  expect(euclideanDistance({ x: 0, y: 0 }, { x: 0.71, y: 0 })).toBeCloseTo(0.71);
  expect(euclideanDistance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
});

test("preview score matches the plan formula", () => {
  expect(previewScore(0)).toBe(100);
  expect(previewScore(0.71)).toBe(76);
  expect(previewScore(3)).toBe(0);
  expect(previewScore(5)).toBe(0);
});

test("coordinates and distances format for the readout", () => {
  expect(formatCoord(3)).toBe("3");
  expect(formatCoord(-4)).toBe("-4");
  expect(formatCoord(2.5)).toBe("2.5");
  expect(formatCoord(1.24)).toBe("1");
  expect(formatDistance(Math.hypot(0.5, 0.5))).toBe("0.71");
  expect(formatDistance(0)).toBe("0.00");
});
