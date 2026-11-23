// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { ChallengeSlot } from "@/components/level/challenge-slot";

import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

test("the challenge is disabled until the lesson is done", () => {
  const { rerender } = render(
    <ChallengeSlot challengeType="vectors" lessonDone={false} passed={false} bestScore={0} />,
  );

  const region = screen.getByRole("group", { name: "Challenge" });
  expect(region).toHaveAttribute("aria-disabled", "true");
  expect(region.querySelector("[inert]")).not.toBeNull();
  expect(region.firstElementChild).toHaveClass("opacity-50");
  expect(screen.getByText("Finish the lesson or skip to start.")).toBeInTheDocument();

  rerender(
    <ChallengeSlot challengeType="vectors" lessonDone passed={false} bestScore={0} />,
  );

  expect(screen.getByRole("group", { name: "Challenge" })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  expect(screen.getByRole("group", { name: "Challenge" }).querySelector("[inert]")).toBeNull();
  expect(screen.getByRole("group", { name: "Challenge" }).firstElementChild).not.toHaveClass(
    "opacity-50",
  );
  expect(screen.queryByText("Finish the lesson or skip to start.")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Drag your arrow to land on the target." })).toBeInTheDocument();
  expect(screen.getByText("Challenge coming next.")).toBeInTheDocument();
});

test("a passed level shows its best score", () => {
  render(
    <ChallengeSlot challengeType="embeddings" lessonDone passed bestScore={86} />,
  );

  expect(screen.getByText("Passed · Best 86/100")).toBeInTheDocument();
});
