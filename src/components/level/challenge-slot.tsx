import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PROMPTS: Record<string, string> = {
  vectors: "Drag your arrow to land on the target.",
  embeddings: "Which word is closest in meaning to the target?",
  search: "Write a search query that puts this document in the top 3.",
};

type ChallengeSlotProps = {
  challengeType: string;
  lessonDone: boolean;
  passed: boolean;
  bestScore: number;
  /** Pass null when the challenge child renders its own prompt. */
  prompt?: string | null;
  /**
   * Real challenge UI. VDB-7 and VDB-9 pass their plot here.
   * With no children, the switch below renders a placeholder.
   */
  children?: ReactNode;
};

function ChallengePlaceholder({ challengeType }: { challengeType: string }) {
  switch (challengeType) {
    case "vectors":
    case "embeddings":
    case "search":
      return <p>Challenge coming next.</p>;
    default:
      return <p>Challenge coming next.</p>;
  }
}

export function ChallengeSlot({
  challengeType,
  lessonDone,
  passed,
  bestScore,
  prompt,
  children,
}: ChallengeSlotProps) {
  const heading =
    prompt === undefined ? (PROMPTS[challengeType] ?? "Challenge") : prompt;

  return (
    <div role="group" aria-label="Challenge" aria-disabled={!lessonDone} className="relative">
      <Card
        className={cn(
          "border-zinc-800 bg-zinc-900 p-6 text-zinc-50 motion-reduce:transition-none",
          !lessonDone && "opacity-50",
        )}
      >
        {passed ? (
          <p className="relative z-10 mb-4 inline-flex rounded-full border border-amber-400/40 px-2.5 py-0.5 text-xs text-amber-400">
            Passed · Best {bestScore}/100
          </p>
        ) : null}
        <div inert={lessonDone ? undefined : true}>
          {heading ? (
            <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
          ) : null}
          {children == null ? (
            <div className="mt-4 flex aspect-square max-h-[560px] w-full max-w-[560px] items-center justify-center rounded-lg border border-dashed border-zinc-700">
              <ChallengePlaceholder challengeType={challengeType} />
            </div>
          ) : (
            <div className="mt-4">{children}</div>
          )}
        </div>
      </Card>
      {lessonDone ? null : (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm font-medium text-zinc-50">
          Finish the lesson or skip to start.
        </p>
      )}
    </div>
  );
}
