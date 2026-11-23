import { notFound, redirect } from "next/navigation";

import { getJourneySource } from "@/app/map/data";
import { decideLevelAccess, levelAccessRedirect } from "@/components/level/access";
import { LevelHeader } from "@/components/level/level-header";
import { LevelPlay } from "@/components/level/level-play";
import { getLesson, lessonsBySlug } from "@/content/levels";
import { requireUser } from "@/server/auth";
import { getLevel2Rounds } from "@/server/level2-rounds";

export const dynamic = "force-dynamic";

const lessonSlugs = new Set(Object.keys(lessonsBySlug));

export default async function LevelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireUser();
  const { levelRows, progressRows } = await getJourneySource(session.user.id);
  const decision = decideLevelAccess(slug, levelRows, progressRows, lessonSlugs);
  const redirectTo = levelAccessRedirect(decision);

  if (decision.status === "not-found") notFound();
  if (redirectTo) redirect(redirectTo);
  if (decision.status !== "ready") notFound();

  const cards = getLesson(decision.level.slug);
  if (!cards) redirect("/map");

  const rounds =
    decision.level.slug === "embeddings" ? await getLevel2Rounds() : [];

  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-50">
      <LevelHeader
        order={decision.level.order}
        title={decision.level.title}
        xp={decision.totalXp}
      />
      <LevelPlay
        cards={cards}
        challengeType={decision.level.challengeType}
        passed={decision.passed}
        bestScore={decision.bestScore}
        rounds={rounds}
      />
    </div>
  );
}
