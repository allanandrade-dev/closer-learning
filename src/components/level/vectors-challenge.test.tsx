// @vitest-environment jsdom

import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { VectorsChallenge } from "@/components/level/vectors-challenge";
import { LEVEL1_TARGETS } from "@/server/level1";

import "@testing-library/jest-dom/vitest";

const { refresh, submitLevel1 } = vi.hoisted(() => ({
  refresh: vi.fn(),
  submitLevel1: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/server/level1-actions", () => ({
  submitLevel1,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));

const passResult = {
  rounds: [
    { distance: 0.71, score: 76 },
    { distance: 0, score: 100 },
    { distance: 0.5, score: 83 },
  ],
  score: 86,
  passed: true,
  xpAwarded: 100,
};

const failResult = {
  rounds: [
    { distance: 4, score: 0 },
    { distance: 4, score: 0 },
    { distance: 4, score: 0 },
  ],
  score: 40,
  passed: false,
  xpAwarded: 0,
};

function setAxis(name: "x" | "y", value: number) {
  fireEvent.change(screen.getByRole("spinbutton", { name }), {
    target: { value: String(value) },
  });
}

async function checkPoint(
  user: ReturnType<typeof userEvent.setup>,
  point: { x: number; y: number },
) {
  setAxis("x", point.x);
  setAxis("y", point.y);
  await user.click(screen.getByRole("button", { name: "Check" }));
}

beforeEach(() => {
  refresh.mockReset();
  submitLevel1.mockReset();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
});

test("number inputs move the arrow and update the readout", () => {
  render(<VectorsChallenge alreadyPassed={false} />);

  setAxis("x", 2.5);
  setAxis("y", 1.5);

  expect(screen.getByText("you = [2.5, 1.5]   distance = 0.71")).toBeInTheDocument();
  const head = screen.getByRole("slider", { name: "Arrow head" });
  expect(head).toHaveAttribute("cx", "25");
  expect(head).toHaveAttribute("cy", "-15");
});

test("arrow keys move the head by 0.5", async () => {
  const user = userEvent.setup();
  render(<VectorsChallenge alreadyPassed={false} />);

  const head = screen.getByRole("slider", { name: "Arrow head" });
  head.focus();
  await user.keyboard("{ArrowRight}{ArrowUp}");

  expect(screen.getByRole("spinbutton", { name: "x" })).toHaveValue(0.5);
  expect(screen.getByRole("spinbutton", { name: "y" })).toHaveValue(0.5);
  expect(head).toHaveAttribute("cx", "5");
  expect(head).toHaveAttribute("cy", "-5");

  setAxis("x", 5);
  setAxis("y", -5);
  head.focus();
  await user.keyboard("{ArrowRight}{ArrowDown}");
  expect(screen.getByRole("spinbutton", { name: "x" })).toHaveValue(5);
  expect(screen.getByRole("spinbutton", { name: "y" })).toHaveValue(-5);
});

test("rounds advance from 1/3 to 3/3 and submit the three answers once", async () => {
  const user = userEvent.setup();
  submitLevel1.mockResolvedValue(passResult);
  render(<VectorsChallenge alreadyPassed={false} />);

  expect(screen.getByText("Round 1 / 3")).toBeInTheDocument();
  await checkPoint(user, LEVEL1_TARGETS[0]);
  expect(screen.getByText("Preview score 100")).toBeInTheDocument();
  expect(submitLevel1).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Next target" }));
  expect(screen.getByText("Round 2 / 3")).toBeInTheDocument();
  await checkPoint(user, LEVEL1_TARGETS[1]);
  await user.click(screen.getByRole("button", { name: "Next target" }));

  expect(screen.getByText("Round 3 / 3")).toBeInTheDocument();
  await checkPoint(user, LEVEL1_TARGETS[2]);

  expect(await screen.findByText("86 / 100")).toBeInTheDocument();
  expect(screen.getByText("Passed.")).toBeInTheDocument();
  expect(screen.getByText("+100 XP")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to map" })).toHaveAttribute("href", "/map");
  expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
  expect(screen.getByText("Round 1 · distance 0.71 · score 76")).toBeInTheDocument();
  expect(screen.getByText("Round 2 · distance 0.00 · score 100")).toBeInTheDocument();
  expect(screen.getByText("Round 3 · distance 0.50 · score 83")).toBeInTheDocument();

  expect(submitLevel1).toHaveBeenCalledTimes(1);
  expect(submitLevel1).toHaveBeenCalledWith([
    { x: LEVEL1_TARGETS[0].x, y: LEVEL1_TARGETS[0].y },
    { x: LEVEL1_TARGETS[1].x, y: LEVEL1_TARGETS[1].y },
    { x: LEVEL1_TARGETS[2].x, y: LEVEL1_TARGETS[2].y },
  ]);
  expect(JSON.stringify(submitLevel1.mock.calls[0])).not.toMatch(/score|xp/i);
  expect(refresh).toHaveBeenCalledTimes(1);

  const live = screen.getByText("86 / 100").closest("[aria-live]");
  expect(live).toHaveAttribute("aria-live", "polite");
});

test("a failed attempt says not quite and offers try again", async () => {
  const user = userEvent.setup();
  submitLevel1.mockResolvedValue(failResult);
  render(<VectorsChallenge alreadyPassed={false} />);

  await checkPoint(user, { x: 0, y: 0 });
  await user.click(screen.getByRole("button", { name: "Next target" }));
  await checkPoint(user, { x: 0, y: 0 });
  await user.click(screen.getByRole("button", { name: "Next target" }));
  await checkPoint(user, { x: 0, y: 0 });

  expect(await screen.findByText("40 / 100")).toBeInTheDocument();
  expect(screen.getByText("Not quite.")).toBeInTheDocument();
  expect(screen.getByText("+0 XP")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Back to map" })).not.toBeInTheDocument();
  expect(screen.queryByText("Already passed, no new XP")).not.toBeInTheDocument();
});

test("an already passed level with no new XP says so", async () => {
  const user = userEvent.setup();
  submitLevel1.mockResolvedValue({ ...passResult, xpAwarded: 0, score: 90 });
  render(<VectorsChallenge alreadyPassed />);

  await checkPoint(user, LEVEL1_TARGETS[0]);
  await user.click(screen.getByRole("button", { name: "Next target" }));
  await checkPoint(user, LEVEL1_TARGETS[1]);
  await user.click(screen.getByRole("button", { name: "Next target" }));
  await checkPoint(user, LEVEL1_TARGETS[2]);

  expect(await screen.findByText("90 / 100")).toBeInTheDocument();
  expect(screen.getByText("Already passed, no new XP")).toBeInTheDocument();
  expect(screen.queryByText(/\+\d+ XP/)).not.toBeInTheDocument();
});

test("a thrown submit shows the error alert and retry sends the same answers", async () => {
  const user = userEvent.setup();
  const answers = [
    { x: 1, y: 1 },
    { x: -1, y: 0.5 },
    { x: 2, y: -2 },
  ];
  submitLevel1.mockRejectedValueOnce(new Error("hidden in production"));
  submitLevel1.mockResolvedValueOnce(passResult);
  render(<VectorsChallenge alreadyPassed={false} />);

  await checkPoint(user, answers[0]);
  await user.click(screen.getByRole("button", { name: "Next target" }));
  await checkPoint(user, answers[1]);
  await user.click(screen.getByRole("button", { name: "Next target" }));
  await checkPoint(user, answers[2]);

  expect(
    await screen.findByText("Couldn't reach the vector database. Your answer wasn't lost."),
  ).toBeInTheDocument();
  expect(refresh).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Retry" }));

  expect(await screen.findByText("86 / 100")).toBeInTheDocument();
  expect(submitLevel1).toHaveBeenCalledTimes(2);
  expect(submitLevel1.mock.calls[1][0]).toEqual(answers);
  expect(submitLevel1.mock.calls[0][0]).toEqual(answers);
  expect(refresh).toHaveBeenCalledTimes(1);
});
