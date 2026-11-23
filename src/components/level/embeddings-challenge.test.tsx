// @vitest-environment jsdom

import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  EmbeddingsChallenge,
  type Level2Round,
} from "@/components/level/embeddings-challenge";

import "@testing-library/jest-dom/vitest";

const { refresh, checkLevel2Round, submitLevel2, getLevel2Rounds } = vi.hoisted(() => ({
  refresh: vi.fn(),
  checkLevel2Round: vi.fn(),
  submitLevel2: vi.fn(),
  getLevel2Rounds: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/server/level2-actions", () => ({
  checkLevel2Round,
  submitLevel2,
}));

vi.mock("@/server/level2-rounds", () => ({
  getLevel2Rounds,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));

const rounds: Level2Round[] = [
  {
    roundId: 1,
    target: "king",
    candidates: ["banana", "laptop", "queen", "river"],
  },
  {
    roundId: 2,
    target: "doctor",
    candidates: ["nurse", "pixel", "sweater", "volcano"],
  },
  {
    roundId: 3,
    target: "ocean",
    candidates: ["keyboard", "muffin", "sea", "tractor"],
  },
];

const roundOneDistances = [
  { text: "river", distance: 0.82 },
  { text: "queen", distance: 0.2 },
  { text: "laptop", distance: 0.64 },
  { text: "banana", distance: 0.91 },
];

const passOutcome = { correctCount: 2, passed: true, xpAwarded: 40 };
const failOutcome = { correctCount: 1, passed: false, xpAwarded: 0 };

function gradeFor(roundId: number, pick: string) {
  if (roundId === 1) {
    return {
      correct: pick === "queen",
      answer: "queen",
      distances: roundOneDistances,
    };
  }
  if (roundId === 2) {
    return {
      correct: pick === "nurse",
      answer: "nurse",
      distances: [
        { text: "nurse", distance: 0.18 },
        { text: "pixel", distance: 0.77 },
        { text: "sweater", distance: 0.55 },
        { text: "volcano", distance: 0.7 },
      ],
    };
  }
  return {
    correct: pick === "sea",
    answer: "sea",
    distances: [
      { text: "sea", distance: 0.11 },
      { text: "keyboard", distance: 0.8 },
      { text: "muffin", distance: 0.66 },
      { text: "tractor", distance: 0.73 },
    ],
  };
}

beforeEach(() => {
  refresh.mockReset();
  checkLevel2Round.mockReset();
  submitLevel2.mockReset();
  getLevel2Rounds.mockReset();
  getLevel2Rounds.mockResolvedValue(rounds);
  checkLevel2Round.mockImplementation(gradeFor);
});

afterEach(() => {
  cleanup();
});

function renderChallenge(alreadyPassed = false) {
  return render(<EmbeddingsChallenge rounds={rounds} alreadyPassed={alreadyPassed} />);
}

test("a pick enables check, presses the chip, and toggles off", async () => {
  const user = userEvent.setup();
  renderChallenge();

  expect(
    screen.getByRole("heading", { name: /Which word is closest in meaning to king/ }),
  ).toBeInTheDocument();
  expect(screen.getByText("Round 1 / 3")).toBeInTheDocument();
  const check = screen.getByRole("button", { name: "Check" });
  expect(check).toBeDisabled();

  const queen = screen.getByRole("button", { name: "queen" });
  await user.click(queen);
  expect(queen).toHaveAttribute("aria-pressed", "true");
  expect(queen).toHaveClass("bg-indigo-600");
  expect(screen.getByRole("button", { name: "banana" })).toHaveAttribute("aria-pressed", "false");
  expect(check).toBeEnabled();

  await user.click(queen);
  expect(queen).toHaveAttribute("aria-pressed", "false");
  expect(check).toBeDisabled();
});

test("check reveals a sorted distance table and locks the chips", async () => {
  const user = userEvent.setup();
  let resolveCheck: (value: ReturnType<typeof gradeFor>) => void = () => undefined;
  checkLevel2Round.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
  );
  renderChallenge();

  await user.click(screen.getByRole("button", { name: "queen" }));
  await user.click(screen.getByRole("button", { name: "Check" }));

  expect(screen.getByRole("button", { name: "Asking pgvector…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "queen" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Check" })).not.toBeInTheDocument();

  resolveCheck(gradeFor(1, "queen"));

  const table = await screen.findByRole("table", { name: "Cosine distances" });
  const body = within(table).getAllByRole("row").slice(1);
  expect(body.map((row) => within(row).getAllByRole("cell")[0]?.textContent)).toEqual([
    "queen",
    "laptop",
    "river",
    "banana",
  ]);
  expect(within(body[0]!).getAllByRole("cell")[1]).toHaveTextContent("0.20");
  expect(body[0]).toHaveClass("bg-emerald-950");
  expect(screen.getByRole("button", { name: "queen" })).toHaveTextContent("✓");
  expect(
    screen.queryByText("The closest word was queen."),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("Smaller distance means closer meaning. pgvector sorted these for you."),
  ).toBeInTheDocument();
  expect(checkLevel2Round).toHaveBeenCalledTimes(1);
  expect(checkLevel2Round).toHaveBeenCalledWith(1, "queen");
  expect(submitLevel2).not.toHaveBeenCalled();

  const hood = screen.getByText("Under the hood: the pgvector query").closest("details");
  expect(hood).not.toHaveAttribute("open");
  await user.click(screen.getByText("Under the hood: the pgvector query"));
  expect(hood).toHaveAttribute("open");
  expect(hood).toHaveTextContent(
    "SELECT text, embedding <=> (SELECT embedding FROM words WHERE round_id = $1 AND role = 'target') AS distance FROM words WHERE round_id = $1 AND role = 'candidate' ORDER BY distance;",
  );
  const last = within(hood as HTMLElement).getByRole("table", { name: "Last round distances" });
  expect(within(last).getAllByRole("row")[1]).toHaveTextContent("queen");
  expect(within(last).getAllByRole("row")[1]).toHaveTextContent("0.20");
});

test("a wrong pick names the closest word", async () => {
  const user = userEvent.setup();
  renderChallenge();

  await user.click(screen.getByRole("button", { name: "banana" }));
  await user.click(screen.getByRole("button", { name: "Check" }));

  expect(await screen.findByText("The closest word was queen.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "banana" })).toHaveTextContent("✕");
  expect(screen.getByRole("button", { name: "Next round" })).toBeInTheDocument();
});

async function playThree(
  user: ReturnType<typeof userEvent.setup>,
  picks: readonly string[],
) {
  await user.click(screen.getByRole("button", { name: picks[0]! }));
  await user.click(screen.getByRole("button", { name: "Check" }));
  await user.click(await screen.findByRole("button", { name: "Next round" }));
  expect(screen.getByText("Round 2 / 3")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /Which word is closest in meaning to doctor/ }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: picks[1]! }));
  await user.click(screen.getByRole("button", { name: "Check" }));
  await user.click(await screen.findByRole("button", { name: "Next round" }));
  expect(screen.getByText("Round 3 / 3")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: picks[2]! }));
  await user.click(screen.getByRole("button", { name: "Check" }));
}

test("round 3 submits the three picks once", async () => {
  const user = userEvent.setup();
  submitLevel2.mockResolvedValue(passOutcome);
  renderChallenge();

  await playThree(user, ["queen", "nurse", "keyboard"]);

  expect(await screen.findByText("2 of 3 right · passed · +40 XP")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to map" })).toHaveAttribute("href", "/map");
  expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
  expect(submitLevel2).toHaveBeenCalledTimes(1);
  expect(submitLevel2).toHaveBeenCalledWith([
    { roundId: 1, pick: "queen" },
    { roundId: 2, pick: "nurse" },
    { roundId: 3, pick: "keyboard" },
  ]);
  expect(checkLevel2Round).toHaveBeenCalledTimes(3);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Next round" })).not.toBeInTheDocument();
});

test("a failed attempt offers try again", async () => {
  const user = userEvent.setup();
  submitLevel2.mockResolvedValue(failOutcome);
  renderChallenge();

  await playThree(user, ["banana", "pixel", "muffin"]);

  expect(await screen.findByText("Not quite, 1 of 3. Try again.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Back to map" })).not.toBeInTheDocument();
  expect(screen.queryByText("Already passed, no new XP")).not.toBeInTheDocument();
  expect(refresh).toHaveBeenCalledTimes(1);
});

test("an already passed level with no new XP says so", async () => {
  const user = userEvent.setup();
  submitLevel2.mockResolvedValue({ correctCount: 3, passed: true, xpAwarded: 0 });
  renderChallenge(true);

  await playThree(user, ["queen", "nurse", "sea"]);

  expect(await screen.findByText("Already passed, no new XP")).toBeInTheDocument();
  expect(screen.queryByText(/of 3 right/)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to map" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
});

test("a failed check retries the same round and pick", async () => {
  const user = userEvent.setup();
  checkLevel2Round.mockReset();
  checkLevel2Round.mockRejectedValueOnce(new Error("connection reset"));
  renderChallenge();

  await user.click(screen.getByRole("button", { name: "queen" }));
  await user.click(screen.getByRole("button", { name: "Check" }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(
    "Couldn't reach the vector database. Your answer wasn't lost.",
  );
  expect(alert).not.toHaveTextContent("connection reset");
  expect(checkLevel2Round).toHaveBeenCalledTimes(1);
  expect(checkLevel2Round).toHaveBeenCalledWith(1, "queen");

  checkLevel2Round.mockImplementation(gradeFor);
  await user.click(screen.getByRole("button", { name: "Retry" }));

  expect(await screen.findByRole("table", { name: "Cosine distances" })).toBeInTheDocument();
  expect(checkLevel2Round).toHaveBeenCalledTimes(2);
  expect(checkLevel2Round).toHaveBeenLastCalledWith(1, "queen");
  expect(submitLevel2).not.toHaveBeenCalled();
});

test("a failed submit retries the same three picks", async () => {
  const user = userEvent.setup();
  submitLevel2.mockRejectedValueOnce(new Error("timeout"));
  renderChallenge();

  await playThree(user, ["queen", "nurse", "sea"]);

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(
    "Couldn't reach the vector database. Your answer wasn't lost.",
  );
  expect(alert).not.toHaveTextContent("timeout");
  expect(submitLevel2).toHaveBeenCalledTimes(1);
  const payload = [
    { roundId: 1, pick: "queen" },
    { roundId: 2, pick: "nurse" },
    { roundId: 3, pick: "sea" },
  ];
  expect(submitLevel2).toHaveBeenCalledWith(payload);
  expect(refresh).not.toHaveBeenCalled();

  submitLevel2.mockResolvedValue(passOutcome);
  await user.click(screen.getByRole("button", { name: "Retry" }));

  expect(await screen.findByText("2 of 3 right · passed · +40 XP")).toBeInTheDocument();
  expect(submitLevel2).toHaveBeenCalledTimes(2);
  expect(submitLevel2).toHaveBeenLastCalledWith(payload);
  expect(checkLevel2Round).toHaveBeenCalledTimes(3);
  expect(refresh).toHaveBeenCalledTimes(1);
});
