import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { levels, progress } from "@/db/schema";

/** Server-only read for /map. Import this from the map server component. */
export async function getJourneySource(userId: string) {
  const levelRows = await db
    .select({
      id: levels.id,
      slug: levels.slug,
      order: levels.order,
      title: levels.title,
    })
    .from(levels)
    .orderBy(asc(levels.order));

  const progressRows = await db
    .select({
      levelId: progress.levelId,
      passed: progress.passed,
      bestScore: progress.bestScore,
      xpEarned: progress.xpEarned,
      passedAt: progress.passedAt,
    })
    .from(progress)
    .where(eq(progress.userId, userId));

  return { levelRows, progressRows };
}
