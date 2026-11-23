import { beforeEach, expect, test, vi } from "vitest";
import { LEVEL1_TARGETS } from "@/server/level1";

const redirect = vi.hoisted(() =>
  vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

const dbMocks = vi.hoisted(() => {
  const results: unknown[] = [];
  const writes: Record<string, unknown>[] = [];

  function selectChain(take: () => unknown) {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    for (const method of ["from", "where", "limit", "innerJoin"]) {
      chain[method] = vi.fn(self);
    }
    chain.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(take()).then(onFulfilled, onRejected);
    return chain;
  }

  const select = vi.fn(() => selectChain(() => results.shift()));
  const insert = vi.fn(() => {
    const rows = results.shift();
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.values = vi.fn((row: Record<string, unknown>) => {
      writes.push(row);
      return chain;
    });
    chain.onConflictDoUpdate = vi.fn(self);
    chain.returning = vi.fn(self);
    chain.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(rows).then(onFulfilled, onRejected);
    return chain;
  });

  const database = {
    select,
    insert,
    $with: vi.fn(() => ({ as: vi.fn(() => ({})) })),
    with: vi.fn(),
  };
  database.with.mockImplementation(() => database);

  return { results, writes, select, insert, database };
});

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/server/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: dbMocks.database,
}));

import { requireUser } from "@/server/auth";
import { submitLevel1 } from "@/server/level1-actions";

const userId = "user-1";

function exactAnswers(): { x: number; y: number }[] {
  return LEVEL1_TARGETS.map((point) => ({ x: point.x, y: point.y }));
}

function levelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    order: 1,
    challengeType: "vectors",
    passMark: 70,
    xpReward: 100,
    ...overrides,
  };
}

beforeEach(() => {
  dbMocks.results.length = 0;
  dbMocks.writes.length = 0;
  vi.clearAllMocks();
  dbMocks.database.with.mockImplementation(() => dbMocks.database);
  vi.mocked(requireUser).mockResolvedValue({
    user: { id: userId },
  } as Awaited<ReturnType<typeof requireUser>>);
});

test("unauthenticated submit redirects to /sign-in before any query", async () => {
  vi.mocked(requireUser).mockImplementation(async () => {
    redirect("/sign-in");
    return undefined as never;
  });

  await expect(submitLevel1(exactAnswers())).rejects.toThrow(
    "NEXT_REDIRECT:/sign-in",
  );
  expect(redirect).toHaveBeenCalledWith("/sign-in");
  expect(dbMocks.select).not.toHaveBeenCalled();
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("invalid input rejects before any database call", async () => {
  const [first, second, third] = exactAnswers();
  const cases: { x: number; y: number }[][] = [
    [first, second],
    [first, second, third, first],
    [
      { x: Number.NaN, y: 0 },
      second,
      third,
    ],
    [
      { x: Number.POSITIVE_INFINITY, y: 0 },
      second,
      third,
    ],
    [{ x: "3" as unknown as number, y: 2 }, second, third],
    [{ x: 5.1, y: 0 }, second, third],
    [{ x: -5.1, y: 0 }, second, third],
  ];

  for (const answers of cases) {
    await expect(submitLevel1(answers)).rejects.toThrow(Error);
    expect(dbMocks.select).not.toHaveBeenCalled();
    expect(dbMocks.insert).not.toHaveBeenCalled();
  }
});

test("a missing vectors level rejects before writing progress", async () => {
  dbMocks.results.push([]);

  await expect(submitLevel1(exactAnswers())).rejects.toThrow(
    "Level vectors is not available.",
  );
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("a locked level rejects before writing progress", async () => {
  dbMocks.results.push([levelRow({ order: 2 })]);
  dbMocks.results.push([]);

  await expect(submitLevel1(exactAnswers())).rejects.toThrow(
    "This level is locked.",
  );
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("a passing first attempt returns xpAwarded equal to the level xp_reward", async () => {
  const level = levelRow({ xpReward: 100, passMark: 70 });
  dbMocks.results.push([level]);
  dbMocks.results.push([]);
  dbMocks.results.push([]);
  dbMocks.results.push([{ passed: true, xpAwarded: level.xpReward }]);

  const result = await submitLevel1(exactAnswers());

  expect(result).toEqual({
    rounds: [
      { distance: 0, score: 100 },
      { distance: 0, score: 100 },
      { distance: 0, score: 100 },
    ],
    score: 100,
    passed: true,
    xpAwarded: level.xpReward,
  });
  expect(dbMocks.writes[0]).toMatchObject({
    userId,
    levelId: level.id,
    passed: true,
    bestScore: 100,
    xpEarned: level.xpReward,
  });
  expect(dbMocks.insert).toHaveBeenCalledTimes(1);
});

test("an already-passed row returns xpAwarded 0", async () => {
  const level = levelRow();
  dbMocks.results.push([level]);
  dbMocks.results.push([{ order: 1 }]);
  dbMocks.results.push([{ passed: true, bestScore: 90, xpEarned: 100 }]);
  dbMocks.results.push([{ passed: true, xpAwarded: 0 }]);

  const result = await submitLevel1(exactAnswers());

  expect(result.passed).toBe(true);
  expect(result.xpAwarded).toBe(0);
  expect(result.score).toBe(100);
  expect(dbMocks.writes[0]).toMatchObject({
    userId,
    levelId: level.id,
    passed: true,
    xpEarned: 0,
  });
});

test("passed and xpAwarded come from the upsert result", async () => {
  const level = levelRow({ xpReward: 100 });
  dbMocks.results.push([level]);
  dbMocks.results.push([]);
  dbMocks.results.push([]);
  dbMocks.results.push([{ passed: true, xpAwarded: 0 }]);

  const result = await submitLevel1(exactAnswers());

  expect(result.passed).toBe(true);
  expect(result.xpAwarded).toBe(0);
  expect(dbMocks.writes[0]).toMatchObject({ xpEarned: level.xpReward });
});

test("a database failure is logged without the error text and rethrown generically", async () => {
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  dbMocks.select.mockImplementationOnce(() => {
    throw new Error(
      "connect failed postgres://role:secret-token@ep-example.neon.tech/db",
    );
  });

  await expect(submitLevel1(exactAnswers())).rejects.toThrow(
    "Something went wrong. Try again.",
  );
  expect(errorLog).toHaveBeenCalledTimes(1);
  expect(errorLog).toHaveBeenCalledWith("submitLevel1 failed");
  expect(JSON.stringify(errorLog.mock.calls)).not.toContain("secret-token");
  expect(JSON.stringify(errorLog.mock.calls)).not.toContain("DATABASE_URL");

  errorLog.mockRestore();
});
