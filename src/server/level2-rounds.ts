import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { levels, words } from "@/db/schema";
import { requireUser } from "@/server/auth";
import {
  assertLevelUnlocked,
  UserFacingError,
} from "@/server/progress";

const EMBEDDINGS_SLUG = "embeddings";
const ROUND_COUNT = 3;
const CANDIDATE_COUNT = 4;

type EmbeddingsLevel = {
  id: number;
  order: number;
  challengeType: "embeddings";
  passMark: number;
  xpReward: number;
};

type Level2Round = {
  roundId: number;
  target: string;
  candidates: string[];
};

type WordReadRow = {
  roundId: number;
  role: string;
  text: string;
};

function failLevel2(error: unknown, label: string): never {
  if (error instanceof UserFacingError) {
    throw error;
  }
  console.error(label);
  throw new Error("Something went wrong. Try again.");
}

async function loadEmbeddingsLevel(): Promise<EmbeddingsLevel> {
  const rows = await db
    .select({
      id: levels.id,
      order: levels.order,
      challengeType: levels.challengeType,
      passMark: levels.passMark,
      xpReward: levels.xpReward,
    })
    .from(levels)
    .where(eq(levels.slug, EMBEDDINGS_SLUG))
    .limit(1);

  const level = rows[0];
  if (!level || level.challengeType !== "embeddings") {
    throw new UserFacingError("Level embeddings is not available.");
  }

  return {
    id: level.id,
    order: level.order,
    challengeType: "embeddings",
    passMark: level.passMark,
    xpReward: level.xpReward,
  };
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function unavailable(): never {
  throw new UserFacingError("Level 2 rounds are not available.");
}

function groupRounds(rows: readonly WordReadRow[]): Level2Round[] {
  const byRound = new Map<
    number,
    { targets: string[]; candidates: string[] }
  >();

  for (const row of rows) {
    const round = byRound.get(row.roundId) ?? { targets: [], candidates: [] };
    if (row.role === "target") {
      round.targets.push(row.text);
    } else if (row.role === "candidate") {
      round.candidates.push(row.text);
    } else {
      unavailable();
    }
    byRound.set(row.roundId, round);
  }

  if (byRound.size !== ROUND_COUNT) {
    unavailable();
  }

  return [...byRound.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([roundId, round]) => {
      const target = round.targets[0];
      if (
        round.targets.length !== 1 ||
        target === undefined ||
        round.candidates.length !== CANDIDATE_COUNT
      ) {
        unavailable();
      }

      return {
        roundId,
        target,
        candidates: [...round.candidates].sort(compareText),
      };
    });
}

export async function getLevel2Rounds(): Promise<Level2Round[]> {
  const session = await requireUser();
  const userId = session.user.id;

  try {
    const level = await loadEmbeddingsLevel();
    await assertLevelUnlocked(userId, level.order);
    const rows = await db
      .select({
        roundId: words.roundId,
        role: words.role,
        text: words.text,
      })
      .from(words)
      .orderBy(asc(words.roundId), asc(words.text));

    return groupRounds(rows);
  } catch (error) {
    failLevel2(error, "getLevel2Rounds failed");
  }
}
