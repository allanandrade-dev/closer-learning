"use client";

import { useState } from "react";

import type { LessonCard } from "@/content/levels";
import { ChallengeSlot } from "@/components/level/challenge-slot";
import {
  EmbeddingsChallenge,
  type Level2Round,
} from "@/components/level/embeddings-challenge";
import { LessonCards } from "@/components/level/lesson-cards";
import { VectorsChallenge } from "@/components/level/vectors-challenge";

export function LevelPlay({
  cards,
  challengeType,
  passed,
  bestScore,
  rounds = [],
}: {
  cards: readonly LessonCard[];
  challengeType: string;
  passed: boolean;
  bestScore: number;
  rounds?: readonly Level2Round[];
}) {
  const [lessonDone, setLessonDone] = useState(false);

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(320px,2fr)_3fr] lg:px-10">
      <LessonCards cards={cards} done={lessonDone} onDone={() => setLessonDone(true)} />
      <ChallengeSlot
        challengeType={challengeType}
        lessonDone={lessonDone}
        passed={passed}
        bestScore={bestScore}
        prompt={challengeType === "embeddings" ? null : undefined}
      >
        {challengeType === "vectors" ? (
          <VectorsChallenge alreadyPassed={passed} />
        ) : challengeType === "embeddings" ? (
          <EmbeddingsChallenge rounds={rounds} alreadyPassed={passed} />
        ) : null}
      </ChallengeSlot>
    </main>
  );
}
