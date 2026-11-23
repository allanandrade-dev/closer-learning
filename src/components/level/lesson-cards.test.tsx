// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import type { LessonCard } from "@/content/levels";
import { LessonCards } from "@/components/level/lesson-cards";

import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

const cards: LessonCard[] = [
  { title: "One", paragraphs: ["First body"] },
  { title: "Two", paragraphs: ["Second body"] },
  { title: "Three", paragraphs: ["Third body"] },
  { title: "Four", paragraphs: ["Fourth body"] },
];

test("Next and Back step through the cards and show the count", async () => {
  const user = userEvent.setup();
  render(<LessonCards cards={cards} done={false} onDone={() => {}} />);

  expect(screen.getByRole("heading", { level: 2, name: "One" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  expect(screen.getByText("Card 1 of 4")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Next" }));

  expect(screen.getByRole("heading", { level: 2, name: "Two" })).toBeInTheDocument();
  expect(screen.getByText("2 / 4")).toBeInTheDocument();
  expect(screen.getByText("Card 2 of 4")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();

  await user.click(screen.getByRole("button", { name: "Back" }));

  expect(screen.getByRole("heading", { level: 2, name: "One" })).toBeInTheDocument();
  expect(screen.getByText("1 / 4")).toBeInTheDocument();
});

test("the last card turns Next into Try it and marks the lesson done", async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  render(<LessonCards cards={cards} done={false} onDone={onDone} />);

  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByRole("button", { name: "Next" }));

  expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try it" }));

  expect(onDone).toHaveBeenCalledOnce();
});

test("Skip to challenge marks the lesson done", async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  render(<LessonCards cards={cards} done={false} onDone={onDone} />);

  await user.click(screen.getByRole("button", { name: "Skip to challenge" }));

  expect(onDone).toHaveBeenCalledOnce();
});
