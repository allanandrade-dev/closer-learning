import type { JourneyNode } from "@/components/map/journey";

/** Inline note for /map?locked=<slug>. Uses the locked node's tooltip copy. */
export function LockedNotice({
  slug,
  nodes,
}: {
  slug?: string;
  nodes: readonly JourneyNode[];
}) {
  if (!slug) return null;
  const hint = nodes.find((node) => node.key === slug)?.unlockHint;
  if (!hint) return null;

  return (
    <p role="status" className="mt-4 text-sm text-zinc-300">
      {hint}
    </p>
  );
}
