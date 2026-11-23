import { JourneyList } from "@/components/map/journey-list";
import { buildJourney } from "@/components/map/journey";
import { MapHeader } from "@/components/map/map-header";
import { requireUser } from "@/server/auth";

import { getJourneySource } from "./data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your journey",
};

export default async function MapPage() {
  const session = await requireUser();
  const { levelRows, progressRows } = await getJourneySource(session.user.id);
  const journey = buildJourney(levelRows, progressRows);

  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-50">
      <MapHeader name={session.user.name} xp={journey.totalXp} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Your journey</h1>
        <p className="mt-2 text-zinc-400">From one arrow to a real vector search.</p>
        {journey.showEmptyHint ? (
          <p className="mt-4 text-sm text-zinc-400">
            Start with Level 1. It takes about 3 minutes.
          </p>
        ) : null}
        {journey.showFinishedBanner ? (
          <p className="mt-6 rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 text-sm text-zinc-100">
            You finished the current journey. More levels are coming.{" "}
            <span className="font-medium text-amber-400">⚡ {journey.totalXp} XP</span>
          </p>
        ) : null}
        <JourneyList nodes={journey.nodes} />
      </main>
    </div>
  );
}
