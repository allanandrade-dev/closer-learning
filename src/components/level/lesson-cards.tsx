"use client";

import { useEffect, useState } from "react";

import type { LessonCard } from "@/content/levels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LessonCardsProps = {
  cards: readonly LessonCard[];
  done: boolean;
  onDone: () => void;
};

function useIsLg() {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isLg;
}

function CardBody({ card }: { card: LessonCard }) {
  const split = card.formula != null ? (card.formulaAfter ?? card.paragraphs.length) : card.paragraphs.length;
  const before = card.paragraphs.slice(0, split);
  const after = card.paragraphs.slice(split);

  return (
    <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-300">
      {before.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {card.formula ? (
        <pre className="overflow-x-auto rounded-md bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100">
          <code>{card.formula}</code>
        </pre>
      ) : null}
      {after.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function LessonStepper({
  cards,
  onDone,
}: {
  cards: readonly LessonCard[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const card = cards[index] ?? cards[0];
  const last = index === cards.length - 1;

  if (!card) return null;

  return (
    <Card className="border-zinc-800 bg-zinc-900 p-6 text-zinc-50 motion-reduce:transition-none">
      <h2 className="text-xl font-semibold tracking-tight">{card.title}</h2>
      <CardBody card={card} />
      <p aria-live="polite" className="sr-only">
        Card {index + 1} of {cards.length}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <div aria-hidden="true" className="flex items-center gap-1.5">
          {cards.map((item, dot) => (
            <span
              key={item.title}
              className={cn(
                "size-2 rounded-full",
                dot === index ? "bg-indigo-400" : "bg-zinc-700",
              )}
            />
          ))}
        </div>
        <span className="font-mono text-sm text-zinc-400">
          {index + 1} / {cards.length}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={index === 0}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
        >
          Back
        </Button>
        <Button
          type="button"
          variant={last ? "default" : "outline"}
          onClick={() => {
            if (last) {
              onDone();
              return;
            }
            setIndex((current) => current + 1);
          }}
        >
          {last ? "Try it" : "Next"}
        </Button>
      </div>
      <Button type="button" variant="ghost" className="mt-2 px-0" onClick={onDone}>
        Skip to challenge
      </Button>
    </Card>
  );
}

export function LessonCards({ cards, done, onDone }: LessonCardsProps) {
  const isLg = useIsLg();
  const stepper = <LessonStepper cards={cards} onDone={onDone} />;

  if (done && !isLg) {
    return (
      <details className="rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Lesson
        </summary>
        <div className="px-4 pb-4">{stepper}</div>
      </details>
    );
  }

  return stepper;
}
