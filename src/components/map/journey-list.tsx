import { LevelCard } from "@/components/map/level-card";
import { LevelNode } from "@/components/map/level-node";
import type { JourneyNode } from "@/components/map/journey";
import { cn } from "@/lib/utils";

export function JourneyList({ nodes }: { nodes: JourneyNode[] }) {
  return (
    <ol aria-label="Levels" className="mt-10">
      {nodes.map((node, index) => {
        const previous = index > 0 ? nodes[index - 1] : undefined;
        const hasLineIn = index > 0;
        const hasLineOut = index < nodes.length - 1;

        return (
          <li key={node.key} className="relative flex gap-4 pb-6 last:pb-0">
            <div className="relative w-11 shrink-0 sm:w-14">
              <div className="min-h-11 sm:min-h-14" aria-hidden />
              {hasLineIn ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-1/2 top-0 h-[calc(50%-1.375rem)] w-0.5 -translate-x-1/2 sm:h-[calc(50%-1.75rem)]",
                    previous?.state === "completed" ? "bg-indigo-400" : "bg-zinc-800",
                  )}
                />
              ) : null}
              {hasLineOut ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-1/2 top-[calc(50%+1.375rem)] -bottom-6 w-0.5 -translate-x-1/2 sm:top-[calc(50%+1.75rem)]",
                    node.state === "completed" ? "bg-indigo-400" : "bg-zinc-800",
                  )}
                />
              ) : null}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <LevelNode node={node} />
              </div>
            </div>
            <LevelCard node={node} />
          </li>
        );
      })}
    </ol>
  );
}
