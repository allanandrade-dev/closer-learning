// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import type { LessonCard } from "@/content/levels";
import { LevelPlay } from "@/components/level/level-play";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/server/level1-actions", () => ({
  submitLevel1: vi.fn(),
}));

import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

const cards: LessonCard[] = [
  { title: "One", paragraphs: ["Body"] },
  { title: "Two", paragraphs: ["Body"] },
];

test("skipping the lesson enables the challenge", async () => {
  const user = userEvent.setup();
  render(
    <LevelPlay cards={cards} challengeType="search" passed bestScore={70} />,
  );

  expect(screen.getByRole("group", { name: "Challenge" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  expect(screen.getByText("Passed · Best 70/100")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Skip to challenge" }));

  expect(screen.getByRole("group", { name: "Challenge" })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  expect(screen.queryByText("Finish the lesson or skip to start.")).not.toBeInTheDocument();
  expect(screen.getByText("Challenge coming next.")).toBeInTheDocument();
});
