"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/auth/spinner";
import { EmbeddingsResultStrip } from "@/components/level/result-strip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { checkLevel2Round, submitLevel2 } from "@/server/level2-actions";

const PGVECTOR_SQL =
  "SELECT text, embedding <=> (SELECT embedding FROM words WHERE round_id = $1 AND role = 'target') AS distance FROM words WHERE round_id = $1 AND role = 'candidate' ORDER BY distance;";

export type Level2Round = {
  roundId: number;
  target: string;
  candidates: readonly string[];
};

type DistanceRow = {
  text: string;
  distance: number;
};

type Grade = {
  correct: boolean;
  answer: string;
  distances: DistanceRow[];
};

type Pick = {
  roundId: number;
  pick: string;
};

type Outcome = {
  correctCount: number;
  passed: boolean;
  xpAwarded: number;
};

type Phase = "pick" | "checking" | "revealed" | "submitting" | "result" | "error";
type Failure = "check" | "submit";

function byDistance(rows: readonly DistanceRow[]): DistanceRow[] {
  return [...rows].sort((left, right) => left.distance - right.distance);
}

function DistanceTable({
  rows,
  caption,
}: {
  rows: readonly DistanceRow[];
  caption: string;
}) {
  const sorted = byDistance(rows);

  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-zinc-800 text-zinc-400">
          <th scope="col" className="py-2 pr-4 font-medium">
            word
          </th>
          <th scope="col" className="py-2 font-medium">
            cosine distance
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, index) => (
          <tr
            key={row.text}
            className={cn(
              "border-b border-zinc-800/80 font-mono",
              index === 0 && "bg-emerald-950 text-emerald-300",
            )}
          >
            <td className="py-2 pr-4">{row.text}</td>
            <td className="py-2">{row.distance.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EmbeddingsChallenge({
  rounds,
  alreadyPassed,
}: {
  rounds: readonly Level2Round[];
  alreadyPassed: boolean;
}) {
  const router = useRouter();
  const checkBusy = useRef(false);
  const submitBusy = useRef(false);
  const resultsRef = useRef<Pick[]>([]);
  const submissionRef = useRef<Pick[]>([]);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [lastGrade, setLastGrade] = useState<Grade | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [failure, setFailure] = useState<Failure>("check");
  const [result, setResult] = useState<Outcome | null>(null);

  const round = rounds[index];
  const locked = phase !== "pick";
  const revealedGrade = phase === "pick" ? null : grade;

  async function finish(picks: readonly Pick[]) {
    if (submitBusy.current) return;
    submitBusy.current = true;
    const payload = picks.map((item) => ({
      roundId: item.roundId,
      pick: item.pick,
    }));
    submissionRef.current = payload;
    setPhase("submitting");
    try {
      const outcome = await submitLevel2(payload);
      setResult(outcome);
      setPhase("result");
      router.refresh();
    } catch {
      setFailure("submit");
      setPhase("error");
    } finally {
      submitBusy.current = false;
    }
  }

  async function onCheck() {
    if (checkBusy.current || pick == null || !round) return;
    checkBusy.current = true;
    setPhase("checking");
    const roundId = round.roundId;
    const chosen = pick;
    try {
      const graded = await checkLevel2Round(roundId, chosen);
      const next = [...resultsRef.current, { roundId, pick: chosen }];
      resultsRef.current = next;
      setGrade(graded);
      setLastGrade(graded);
      if (index < rounds.length - 1) {
        setPhase("revealed");
        return;
      }
      await finish(next);
    } catch {
      setFailure("check");
      setPhase("error");
    } finally {
      checkBusy.current = false;
    }
  }

  function onNext() {
    setIndex((current) => current + 1);
    setPick(null);
    setGrade(null);
    setPhase("pick");
  }

  function onReplay() {
    resultsRef.current = [];
    submissionRef.current = [];
    setIndex(0);
    setPick(null);
    setGrade(null);
    setLastGrade(null);
    setResult(null);
    setFailure("check");
    setPhase("pick");
  }

  function onRetry() {
    if (failure === "submit") {
      void finish(submissionRef.current);
      return;
    }
    void onCheck();
  }

  if (!round) {
    return <p>This round is not available.</p>;
  }

  return (
    <div>
      {phase === "error" ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Couldn&apos;t reach the vector database. Your answer wasn&apos;t lost.
          </AlertDescription>
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 bg-zinc-950 text-zinc-50"
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}
      <h2 className="text-xl font-semibold tracking-tight">
        Which word is closest in meaning to <strong>{round.target}</strong>?
      </h2>
      <p className="mt-2 font-mono text-sm text-zinc-300">
        Round {index + 1} / {rounds.length}
      </p>
      <div role="group" aria-label="Candidate words" className="mt-4 flex flex-wrap gap-2">
        {round.candidates.map((word) => {
          const selected = pick === word;
          return (
            <button
              key={word}
              type="button"
              aria-pressed={selected}
              disabled={locked}
              onClick={() => setPick((current) => (current === word ? null : word))}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-sm",
                selected
                  ? "border-indigo-400 bg-indigo-600 text-white"
                  : "border-zinc-700 bg-zinc-950 text-zinc-100",
              )}
            >
              {word}
              {revealedGrade && selected ? (
                <span aria-hidden="true" className="ml-2">
                  {revealedGrade.correct ? "✓" : "✕"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {phase === "pick" ? (
          <Button type="button" disabled={pick == null} onClick={() => void onCheck()}>
            Check
          </Button>
        ) : null}
        {phase === "revealed" ? (
          <Button type="button" onClick={onNext}>
            Next round
          </Button>
        ) : null}
        {phase === "checking" || phase === "submitting" ? (
          <Button type="button" disabled>
            <Spinner />
            Asking pgvector…
          </Button>
        ) : null}
      </div>
      {revealedGrade ? (
        <div aria-live="polite" className="mt-4">
          {revealedGrade.correct ? null : (
            <p className="text-sm text-zinc-200">
              The closest word was {revealedGrade.answer}.
            </p>
          )}
          <div className="mt-4">
            <DistanceTable rows={revealedGrade.distances} caption="Cosine distances" />
          </div>
          <p className="mt-4 text-sm text-zinc-300">
            Smaller distance means closer meaning. pgvector sorted these for you.
          </p>
        </div>
      ) : null}
      {phase === "result" && result ? (
        <EmbeddingsResultStrip
          correctCount={result.correctCount}
          passed={result.passed}
          xpAwarded={result.xpAwarded}
          alreadyPassed={alreadyPassed}
          onReplay={onReplay}
        />
      ) : null}
      <details className="mt-6 rounded-md border border-zinc-800">
        <summary className="cursor-pointer px-3 py-2 text-sm text-zinc-200">
          Under the hood: the pgvector query
        </summary>
        <div className="space-y-3 px-3 pb-3">
          <pre className="overflow-x-auto font-mono text-sm text-zinc-100">
            <code>{PGVECTOR_SQL}</code>
          </pre>
          {lastGrade ? (
            <DistanceTable rows={lastGrade.distances} caption="Last round distances" />
          ) : null}
        </div>
      </details>
    </div>
  );
}
