import { expect, test } from "vitest";
import { isPassing } from "@/lib/scoring";
import { gradeLevel1, LEVEL1_TARGETS } from "@/server/level1";

const vectors = {
  challengeType: "vectors" as const,
  passMark: 70,
  xpReward: 100,
};

function exactAnswers(): { x: number; y: number }[] {
  return LEVEL1_TARGETS.map((point) => ({ x: point.x, y: point.y }));
}

test("exact hits on all 3 targets score 100", () => {
  const graded = gradeLevel1(exactAnswers());

  expect(graded.score).toBe(100);
  expect(graded.rounds).toEqual([
    { distance: 0, score: 100 },
    { distance: 0, score: 100 },
    { distance: 0, score: 100 },
  ]);
});

test("a miss of distance 0.5 scores 83 for that round", () => {
  const answers = exactAnswers();
  answers[1] = { x: LEVEL1_TARGETS[1].x + 0.5, y: LEVEL1_TARGETS[1].y };

  const graded = gradeLevel1(answers);

  expect(graded.rounds[1].distance).toBeCloseTo(0.5);
  expect(graded.rounds[1].score).toBe(83);
  expect(graded.rounds[0].score).toBe(100);
  expect(graded.rounds[2].score).toBe(100);
});

test("an answer 3 or more away scores 0 for that round", () => {
  const answers = exactAnswers();
  answers[2] = { x: LEVEL1_TARGETS[2].x, y: LEVEL1_TARGETS[2].y + 3 };

  const graded = gradeLevel1(answers);

  expect(graded.rounds[2].distance).toBeCloseTo(3);
  expect(graded.rounds[2].score).toBe(0);

  answers[0] = { x: LEVEL1_TARGETS[0].x, y: LEVEL1_TARGETS[0].y - 4 };
  const farther = gradeLevel1(answers);
  expect(farther.rounds[0].distance).toBeGreaterThan(3);
  expect(farther.rounds[0].score).toBe(0);
});

test("rounds 100, 83, and 0 average 61 and fail pass mark 70", () => {
  const answers = exactAnswers();
  answers[1] = { x: LEVEL1_TARGETS[1].x + 0.5, y: LEVEL1_TARGETS[1].y };
  answers[2] = { x: LEVEL1_TARGETS[2].x, y: LEVEL1_TARGETS[2].y + 3 };

  const graded = gradeLevel1(answers);

  expect(graded.rounds.map((round) => round.score)).toEqual([100, 83, 0]);
  expect(graded.score).toBe(61);
  expect(isPassing(graded.score, vectors)).toBe(false);
});

test("gradeLevel1 rejects the wrong number of answers", () => {
  const [first, second, third] = exactAnswers();

  expect(() => gradeLevel1([first, second])).toThrow(
    "Level 1 expects exactly 3 answers.",
  );
  expect(() => gradeLevel1([first, second, third, first])).toThrow(
    "Level 1 expects exactly 3 answers.",
  );
});

test("gradeLevel1 rejects non-finite coordinates", () => {
  const answers = exactAnswers();

  answers[0] = { x: Number.NaN, y: 0 };
  expect(() => gradeLevel1(answers)).toThrow(
    "Each answer needs a finite x and y.",
  );

  answers[0] = { x: 0, y: Number.POSITIVE_INFINITY };
  expect(() => gradeLevel1(answers)).toThrow(
    "Each answer needs a finite x and y.",
  );

  answers[0] = { x: Number.NEGATIVE_INFINITY, y: 0 };
  expect(() => gradeLevel1(answers)).toThrow(
    "Each answer needs a finite x and y.",
  );
});

test("gradeLevel1 rejects strings", () => {
  const answers = exactAnswers();
  answers[0] = { x: "3" as unknown as number, y: 2 };

  expect(() => gradeLevel1(answers)).toThrow(
    "Each answer needs a finite x and y.",
  );
});

test("gradeLevel1 rejects coordinates outside -5 to 5", () => {
  const answers = exactAnswers();

  answers[0] = { x: 5.1, y: 0 };
  expect(() => gradeLevel1(answers)).toThrow(
    "Each answer must be inside the plot, from -5 to 5.",
  );

  answers[0] = { x: -5.1, y: 0 };
  expect(() => gradeLevel1(answers)).toThrow(
    "Each answer must be inside the plot, from -5 to 5.",
  );

  answers[0] = { x: 0, y: 5.1 };
  expect(() => gradeLevel1(answers)).toThrow(
    "Each answer must be inside the plot, from -5 to 5.",
  );
});

test("gradeLevel1 accepts the plot boundary", () => {
  expect(() =>
    gradeLevel1([
      { x: -5, y: -5 },
      { x: 5, y: 5 },
      { x: -5, y: 5 },
    ]),
  ).not.toThrow();
});
