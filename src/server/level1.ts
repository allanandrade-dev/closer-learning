import { distanceScore, levelOneScore } from "@/lib/scoring";

/**
 * Plot targets for level 1. This module is shared with the UI, and the
 * targets are not a secret — the player can see them on the plot.
 * `src/content/levels.ts` must show these same three points.
 * Grading always uses this list. The client submits answers only.
 */
export const LEVEL1_TARGETS = [
  { x: 3, y: 2 },
  { x: -4, y: 2.5 },
  { x: 1.5, y: -3.5 },
] as const;

const PLOT_MIN = -5;
const PLOT_MAX = 5;

export type Level1Round = {
  distance: number;
  score: number;
};

export type Level1Grade = {
  rounds: Level1Round[];
  score: number;
};

function assertPlotAnswer(
  answer: { x: number; y: number } | undefined,
): asserts answer is { x: number; y: number } {
  if (
    answer == null ||
    typeof answer !== "object" ||
    typeof answer.x !== "number" ||
    typeof answer.y !== "number" ||
    !Number.isFinite(answer.x) ||
    !Number.isFinite(answer.y)
  ) {
    throw new Error("Each answer needs a finite x and y.");
  }

  if (
    answer.x < PLOT_MIN ||
    answer.x > PLOT_MAX ||
    answer.y < PLOT_MIN ||
    answer.y > PLOT_MAX
  ) {
    throw new Error("Each answer must be inside the plot, from -5 to 5.");
  }
}

/** Score three answers against `LEVEL1_TARGETS`. Distances stay unrounded. */
export function gradeLevel1(
  answers: readonly { x: number; y: number }[],
): Level1Grade {
  if (!Array.isArray(answers) || answers.length !== LEVEL1_TARGETS.length) {
    throw new Error("Level 1 expects exactly 3 answers.");
  }

  const rounds = LEVEL1_TARGETS.map((target, index) => {
    const answer = answers[index];
    assertPlotAnswer(answer);
    return distanceScore(answer, target);
  });

  return {
    rounds,
    score: levelOneScore(rounds.map((round) => round.score)),
  };
}
