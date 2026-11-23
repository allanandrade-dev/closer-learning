"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { formatDistance } from "@/components/level/vector-math";
import { Button } from "@/components/ui/button";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCountUp(target: number): number {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const duration = 600;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    setValue(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

export type ResultRound = {
  distance: number;
  score: number;
};

type ResultStripProps = {
  score: number;
  xpAwarded: number;
  attemptPassed: boolean;
  alreadyPassed: boolean;
  rounds: readonly ResultRound[];
  onReplay: () => void;
};

export function ResultStrip({
  score,
  xpAwarded,
  attemptPassed,
  alreadyPassed,
  rounds,
  onReplay,
}: ResultStripProps) {
  const shownScore = useCountUp(score);
  const shownXp = useCountUp(xpAwarded);
  const verdict = attemptPassed ? "Passed." : "Not quite.";
  const repeatClear = alreadyPassed && xpAwarded === 0;

  return (
    <div className="mt-6 space-y-4 border-t border-zinc-800 pt-4">
      <div aria-live="polite" className="space-y-3">
        <p className="font-mono text-3xl tracking-tight">{shownScore} / 100</p>
        <p className="text-sm text-zinc-200">{verdict}</p>
        {repeatClear ? (
          <p className="text-sm text-zinc-300">Already passed, no new XP</p>
        ) : (
          <p className="inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 font-mono text-sm text-amber-300">
            +{shownXp} XP
          </p>
        )}
        <ul className="space-y-1 font-mono text-sm text-zinc-300">
          {rounds.map((round, index) => (
            <li key={`${index}-${round.score}`}>
              Round {index + 1} · distance {formatDistance(round.distance)} · score {round.score}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-3">
        {attemptPassed ? (
          <>
            <Button asChild>
              <Link href="/map">Back to map</Link>
            </Button>
            <Button type="button" variant="outline" onClick={onReplay}>
              Replay
            </Button>
          </>
        ) : (
          <Button type="button" onClick={onReplay}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

type EmbeddingsResultStripProps = {
  correctCount: number;
  passed: boolean;
  xpAwarded: number;
  alreadyPassed: boolean;
  onReplay: () => void;
};

/** Level 2 verdict. Plain text from the server result, with no count-up. */
export function EmbeddingsResultStrip({
  correctCount,
  passed,
  xpAwarded,
  alreadyPassed,
  onReplay,
}: EmbeddingsResultStripProps) {
  const repeatClear = alreadyPassed && xpAwarded === 0;
  const message = repeatClear
    ? "Already passed, no new XP"
    : passed
      ? `${correctCount} of 3 right · passed · +${xpAwarded} XP`
      : `Not quite, ${correctCount} of 3. Try again.`;

  return (
    <div className="mt-6 space-y-4 border-t border-zinc-800 pt-4">
      <p aria-live="polite" className="text-sm text-zinc-100">
        {message}
      </p>
      <div className="flex flex-wrap gap-3">
        {passed ? (
          <>
            <Button asChild>
              <Link href="/map">Back to map</Link>
            </Button>
            <Button type="button" variant="outline" onClick={onReplay}>
              Replay
            </Button>
          </>
        ) : (
          <Button type="button" onClick={onReplay}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
