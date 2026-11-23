import Link from "next/link";

import type { JourneyNode } from "@/components/map/journey";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function StateBadge({ node }: { node: JourneyNode }) {
  return (
    <span className="group/badge relative inline-flex shrink-0">
      <span
        className={cn(
          "rounded-full border px-2 py-0.5 text-xs",
          node.state === "completed" && "border-amber-400/40 text-amber-400",
          node.state === "available" && "border-indigo-400/50 text-indigo-300",
          (node.state === "locked" || node.state === "coming-soon") &&
            "border-zinc-800 text-zinc-500",
        )}
      >
        {node.badge}
      </span>
      {node.unlockHint ? (
        <span
          role="tooltip"
          className="invisible pointer-events-none absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 group-hover/badge:visible"
        >
          {node.unlockHint}
        </span>
      ) : null}
    </span>
  );
}

function CardBody({ node }: { node: JourneyNode }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {node.order != null ? (
            <p className="font-mono text-xs text-zinc-500">Level {node.order}</p>
          ) : null}
          <h2 className="mt-1 text-base font-medium first:mt-0">{node.title}</h2>
        </div>
        <StateBadge node={node} />
      </div>
      {node.goal ? <p className="mt-2 text-sm">{node.goal}</p> : null}
      {node.unlockHint ? <span className="sr-only">{node.unlockHint}</span> : null}
      {node.state === "completed" && node.bestScore != null ? (
        <p className="mt-3 text-sm text-zinc-300">Best score {node.bestScore}/100</p>
      ) : null}
      {node.state === "available" ? (
        <span
          className={cn(
            buttonVariants(),
            "mt-4 bg-indigo-500 text-white hover:bg-indigo-400",
          )}
        >
          Play
        </span>
      ) : null}
      {node.state === "completed" ? (
        <span
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 border-zinc-700 bg-transparent",
          )}
        >
          Replay
        </span>
      ) : null}
    </>
  );
}

const cardClass = {
  available:
    "border-indigo-400/70 bg-zinc-900 text-zinc-50 shadow-[0_0_24px_rgba(99,102,241,0.18)]",
  completed: "border-zinc-800 bg-zinc-900 text-zinc-50",
  locked: "border-zinc-800 text-zinc-600",
  "coming-soon": "border-zinc-800 text-zinc-600",
} as const;

export function LevelCard({ node }: { node: JourneyNode }) {
  const className = cn(
    "relative block min-w-0 flex-1 rounded-xl border p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
    cardClass[node.state],
  );

  if (node.href && node.ariaLabel) {
    return (
      <Link href={node.href} aria-label={node.ariaLabel} className={className}>
        <CardBody node={node} />
      </Link>
    );
  }

  return (
    <div className={className}>
      <CardBody node={node} />
    </div>
  );
}
