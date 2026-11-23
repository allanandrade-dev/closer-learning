import { cn } from "@/lib/utils";

import type { JourneyNode } from "@/components/map/journey";

function LockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4 text-zinc-600 sm:size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5 sm:size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5 10 17.5 19 7.5" />
    </svg>
  );
}

const nodeSize = "size-11 sm:size-14";

export function LevelNode({ node }: { node: JourneyNode }) {
  if (node.state === "completed") {
    return (
      <span
        className={cn(
          nodeSize,
          "relative z-10 flex shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white",
        )}
      >
        <CheckIcon />
      </span>
    );
  }

  if (node.state === "available") {
    return (
      <span className={cn(nodeSize, "relative z-10 flex shrink-0 items-center justify-center")}>
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse rounded-full bg-zinc-950 shadow-[0_0_18px_rgba(129,140,248,0.85)] ring-2 ring-indigo-400 motion-reduce:animate-none"
        />
        <span className="relative font-mono text-sm text-zinc-50">{node.order}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        nodeSize,
        "relative z-10 flex shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-800 bg-zinc-950",
      )}
    >
      <LockIcon />
    </span>
  );
}
