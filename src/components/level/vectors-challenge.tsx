"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/auth/spinner";
import { ResultStrip } from "@/components/level/result-strip";
import { VectorPlot } from "@/components/level/vector-plot";
import {
  euclideanDistance,
  formatCoord,
  formatDistance,
  previewScore,
  snapToStep,
  type PlotPoint,
} from "@/components/level/vector-math";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitLevel1 } from "@/server/level1-actions";
import { LEVEL1_TARGETS } from "@/server/level1";

const PASS_MARK = 70;

type Phase = "aim" | "revealed" | "checking" | "result" | "error";
type Level1Result = Awaited<ReturnType<typeof submitLevel1>>;

function AxisField({
  axis,
  value,
  disabled,
  onChange,
}: {
  axis: "x" | "y";
  value: number;
  disabled: boolean;
  onChange: (raw: string) => void;
}) {
  const id = `vector-${axis}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{axis}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={0.5}
        min={-5}
        max={5}
        value={value}
        disabled={disabled}
        className="font-mono"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function VectorsChallenge({ alreadyPassed }: { alreadyPassed: boolean }) {
  const router = useRouter();
  const busy = useRef(false);
  const [round, setRound] = useState(0);
  const [point, setPoint] = useState<PlotPoint>({ x: 0, y: 0 });
  const [answers, setAnswers] = useState<PlotPoint[]>([]);
  const [phase, setPhase] = useState<Phase>("aim");
  const [result, setResult] = useState<Level1Result | null>(null);

  const target = LEVEL1_TARGETS[round] ?? LEVEL1_TARGETS[0];
  const distance = euclideanDistance(point, target);
  const locked = phase !== "aim";
  const showPreview = phase === "revealed" || phase === "checking" || phase === "error";

  function updateAxis(axis: "x" | "y", raw: string) {
    if (raw.trim() === "" || raw === "-" || raw === "." || raw === "-.") return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setPoint((current) => ({ ...current, [axis]: snapToStep(parsed) }));
  }

  async function submit(nextAnswers: PlotPoint[]) {
    if (busy.current) return;
    busy.current = true;
    setPhase("checking");
    try {
      const graded = await submitLevel1(
        nextAnswers.map((answer) => ({ x: answer.x, y: answer.y })),
      );
      setResult(graded);
      setPhase("result");
      router.refresh();
    } catch {
      setPhase("error");
    } finally {
      busy.current = false;
    }
  }

  function onCheck() {
    const snapshot = { x: point.x, y: point.y };
    const nextAnswers = [...answers, snapshot];
    setAnswers(nextAnswers);
    if (round < LEVEL1_TARGETS.length - 1) {
      setPhase("revealed");
      return;
    }
    void submit(nextAnswers);
  }

  function onNext() {
    setRound((current) => current + 1);
    setPoint({ x: 0, y: 0 });
    setPhase("aim");
  }

  function onReplay() {
    setRound(0);
    setPoint({ x: 0, y: 0 });
    setAnswers([]);
    setResult(null);
    setPhase("aim");
  }

  const readout = `you = [${formatCoord(point.x)}, ${formatCoord(point.y)}]   distance = ${formatDistance(distance)}`;

  return (
    <div>
      {phase === "error" ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {"Couldn't reach the vector database. Your answer wasn't lost."}
          </AlertDescription>
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 bg-zinc-950 text-zinc-50"
              onClick={() => void submit(answers)}
            >
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}
      <VectorPlot
        target={target}
        value={point}
        onChange={setPoint}
        revealed={phase !== "aim"}
        disabled={locked}
        distance={distance}
      />
      <p className="mt-3 font-mono text-sm text-zinc-200">{readout}</p>
      {showPreview ? (
        <p className="mt-2 font-mono text-sm text-zinc-300">
          Preview score {previewScore(distance)}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <AxisField axis="x" value={point.x} disabled={locked} onChange={(raw) => updateAxis("x", raw)} />
        <AxisField axis="y" value={point.y} disabled={locked} onChange={(raw) => updateAxis("y", raw)} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="font-mono text-sm text-zinc-300">
          Round {round + 1} / {LEVEL1_TARGETS.length}
        </p>
        {phase === "aim" ? (
          <Button type="button" onClick={onCheck}>
            Check
          </Button>
        ) : null}
        {phase === "revealed" ? (
          <Button type="button" onClick={onNext}>
            Next target
          </Button>
        ) : null}
        {phase === "checking" ? (
          <Button type="button" disabled>
            <Spinner />
            Checking…
          </Button>
        ) : null}
      </div>
      {phase === "result" && result ? (
        <ResultStrip
          score={result.score}
          xpAwarded={result.xpAwarded}
          attemptPassed={result.score >= PASS_MARK}
          alreadyPassed={alreadyPassed}
          rounds={result.rounds}
          onReplay={onReplay}
        />
      ) : null}
    </div>
  );
}
