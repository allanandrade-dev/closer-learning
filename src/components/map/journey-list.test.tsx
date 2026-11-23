// @vitest-environment jsdom

import { createElement, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { buildJourney, type MapLevel } from "@/components/map/journey";
import { JourneyList } from "@/components/map/journey-list";

import "@testing-library/jest-dom/vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => createElement("a", { href, ...props }, children),
}));

afterEach(() => {
  cleanup();
});

const levels: MapLevel[] = [
  { id: 1, slug: "vectors", order: 1, title: "Vectors" },
  { id: 2, slug: "embeddings", order: 2, title: "Embeddings" },
  { id: 3, slug: "search", order: 3, title: "Similarity search" },
];

test("locked levels are not links", () => {
  const journey = buildJourney(levels, []);
  render(<JourneyList nodes={journey.nodes} />);

  expect(screen.getAllByRole("link")).toHaveLength(1);
  for (const title of [
    "Embeddings",
    "Similarity search",
    "Indexes (HNSW)",
    "Hybrid search",
    "RAG",
  ]) {
    expect(screen.getByRole("heading", { name: title }).closest("a")).toBeNull();
  }
});

test("an available card links to the level with an accessible name", () => {
  const journey = buildJourney(levels, [
    { levelId: 1, passed: true, bestScore: 91, xpEarned: 100 },
  ]);
  render(<JourneyList nodes={journey.nodes} />);

  const link = screen.getByRole("link", { name: "Level 2, Embeddings, available" });
  expect(link).toHaveAttribute("href", "/level/embeddings");
  expect(link).toHaveTextContent("Play");
});

test("a completed level shows its best score and a replay link", () => {
  const journey = buildJourney(levels, [
    { levelId: 1, passed: true, bestScore: 91, xpEarned: 100 },
  ]);
  render(<JourneyList nodes={journey.nodes} />);

  expect(screen.getByText("Best score 91/100")).toBeInTheDocument();
  const replay = screen.getByRole("link", { name: "Level 1, Vectors, completed" });
  expect(replay).toHaveAttribute("href", "/level/vectors");
  expect(replay).toHaveTextContent("Replay");
});
