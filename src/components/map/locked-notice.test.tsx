// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { buildJourney, type MapLevel } from "@/components/map/journey";
import { LockedNotice } from "@/components/map/locked-notice";

import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

const levels: MapLevel[] = [
  { id: 1, slug: "vectors", order: 1, title: "Vectors" },
  { id: 2, slug: "embeddings", order: 2, title: "Embeddings" },
  { id: 3, slug: "search", order: 3, title: "Similarity search" },
];

test("renders Finish level N to unlock using the previous level's order", () => {
  const journey = buildJourney(levels, []);

  const { unmount } = render(<LockedNotice slug="embeddings" nodes={journey.nodes} />);
  expect(screen.getByRole("status")).toHaveTextContent("Finish level 1 to unlock");
  expect(screen.getByRole("status")).toHaveTextContent(
    journey.nodes.find((node) => node.key === "embeddings")?.unlockHint ?? "",
  );
  unmount();

  render(<LockedNotice slug="search" nodes={journey.nodes} />);
  expect(screen.getByRole("status")).toHaveTextContent("Finish level 2 to unlock");
  expect(screen.getByRole("status")).toHaveTextContent(
    journey.nodes.find((node) => node.key === "search")?.unlockHint ?? "",
  );
});
