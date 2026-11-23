import { beforeEach, expect, test, vi } from "vitest";

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
    for (const method of ["from", "where", "limit", "innerJoin", "orderBy"]) {
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
import { checkLevel2Round, submitLevel2 } from "@/server/level2-actions";

const userId = "user-1";

function levelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 8,
    order: 2,
    challengeType: "embeddings",
    passMark: 2,
    xpReward: 40,
    ...overrides,
  };
}

function queueLevel(level: ReturnType<typeof levelRow> = levelRow()) {
  dbMocks.results.push([level]);
  return level;
}

function queueUnlocked(level?: ReturnType<typeof levelRow>) {
  queueLevel(level);
  dbMocks.results.push([{ order: 1 }]);
}

function candidates(
  answer: string,
  others: string[],
  closest: number | string = 0.1,
) {
  return [
    { text: answer, distance: closest },
    ...others.map((text, index) => ({ text, distance: 0.5 + index })),
  ];
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

test("unauthenticated check redirects to /sign-in before validation or any query", async () => {
  vi.mocked(requireUser).mockImplementation(async () => {
    redirect("/sign-in");
    return undefined as never;
  });

  await expect(checkLevel2Round(0, "")).rejects.toThrow(
    "NEXT_REDIRECT:/sign-in",
  );
  expect(redirect).toHaveBeenCalledWith("/sign-in");
  expect(dbMocks.select).not.toHaveBeenCalled();
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("unauthenticated submit redirects to /sign-in before any query", async () => {
  vi.mocked(requireUser).mockImplementation(async () => {
    redirect("/sign-in");
    return undefined as never;
  });

  await expect(submitLevel2([])).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  expect(redirect).toHaveBeenCalledWith("/sign-in");
  expect(dbMocks.select).not.toHaveBeenCalled();
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("checkLevel2Round rejects invalid input before any database call", async () => {
  const cases: [number, string][] = [
    [0, "queen"],
    [-2, "queen"],
    [1.5, "queen"],
    [Number.NaN, "queen"],
    [Number.POSITIVE_INFINITY, "queen"],
    ["1" as unknown as number, "queen"],
    [1, ""],
    [1, "   "],
    [1, "a".repeat(65)],
    [1, 4 as unknown as string],
  ];

  for (const [roundId, pick] of cases) {
    await expect(checkLevel2Round(roundId, pick)).rejects.toThrow(Error);
    expect(dbMocks.select).not.toHaveBeenCalled();
    expect(dbMocks.insert).not.toHaveBeenCalled();
  }
});

test("submitLevel2 rejects invalid input before any database call", async () => {
  const cases: unknown[] = [
    [],
    [{ roundId: 1, pick: "queen" }, { roundId: 2, pick: "nurse" }],
    [
      { roundId: 1, pick: "queen" },
      { roundId: 1, pick: "nurse" },
      { roundId: 3, pick: "sea" },
    ],
    [
      { roundId: 1, pick: "" },
      { roundId: 2, pick: "nurse" },
      { roundId: 3, pick: "sea" },
    ],
    [
      { roundId: 0, pick: "queen" },
      { roundId: 2, pick: "nurse" },
      { roundId: 3, pick: "sea" },
    ],
  ];

  for (const results of cases) {
    await expect(
      submitLevel2(results as { roundId: number; pick: string }[]),
    ).rejects.toThrow(Error);
    expect(dbMocks.select).not.toHaveBeenCalled();
    expect(dbMocks.insert).not.toHaveBeenCalled();
  }
});

test("a missing embeddings level rejects before writing progress", async () => {
  dbMocks.results.push([]);
  dbMocks.results.push([]);

  await expect(checkLevel2Round(1, "queen")).rejects.toThrow(
    "Level embeddings is not available.",
  );
  await expect(
    submitLevel2([
      { roundId: 1, pick: "queen" },
      { roundId: 2, pick: "nurse" },
      { roundId: 3, pick: "sea" },
    ]),
  ).rejects.toThrow("Level embeddings is not available.");
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("a locked level rejects when level 1 has not been passed", async () => {
  queueLevel();
  dbMocks.results.push([]);
  queueLevel();
  dbMocks.results.push([{ order: 3 }]);

  await expect(checkLevel2Round(1, "queen")).rejects.toThrow(
    "This level is locked.",
  );
  await expect(
    submitLevel2([
      { roundId: 1, pick: "queen" },
      { roundId: 2, pick: "nurse" },
      { roundId: 3, pick: "sea" },
    ]),
  ).rejects.toThrow("This level is locked.");
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("checkLevel2Round returns the ordered distances and writes nothing", async () => {
  queueUnlocked();
  dbMocks.results.push([
    { text: "river", distance: "0.2" },
    { text: "banana", distance: 0.5 },
    { text: "queen", distance: 0.8 },
  ]);

  const result = await checkLevel2Round(1, "  River  ");

  expect(result).toEqual({
    correct: true,
    answer: "river",
    distances: [
      { text: "river", distance: 0.2 },
      { text: "banana", distance: 0.5 },
      { text: "queen", distance: 0.8 },
    ],
  });
  expect(result.distances.every((row) => typeof row.distance === "number")).toBe(
    true,
  );
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("checkLevel2Round reports a wrong pick without writing progress", async () => {
  queueUnlocked();
  dbMocks.results.push(candidates("queen", ["banana", "laptop", "river"]));

  const result = await checkLevel2Round(1, "banana");

  expect(result.correct).toBe(false);
  expect(result.answer).toBe("queen");
  expect(result.distances.map((row) => row.text)).toEqual([
    "queen",
    "banana",
    "laptop",
    "river",
  ]);
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("a round with no candidates is an unavailable round and writes nothing", async () => {
  queueUnlocked();
  dbMocks.results.push([]);

  await expect(checkLevel2Round(9, "queen")).rejects.toThrow(
    "This round is not available.",
  );
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("a round with no target distance is an unavailable round", async () => {
  queueUnlocked();
  dbMocks.results.push([{ text: "queen", distance: null }]);

  await expect(checkLevel2Round(1, "queen")).rejects.toThrow(
    "This round is not available.",
  );
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("submitLevel2 re-grades, ignores client correct flags, and passes 2 of 3", async () => {
  const level = levelRow();
  queueUnlocked(level);
  dbMocks.results.push(candidates("queen", ["banana"]));
  dbMocks.results.push(candidates("nurse", ["volcano"]));
  dbMocks.results.push(candidates("sea", ["keyboard"]));
  dbMocks.results.push([]);
  dbMocks.results.push([{ passed: true, xpAwarded: level.xpReward }]);

  const results: {
    roundId: number;
    pick: string;
    correct: boolean;
  }[] = [
    { roundId: 1, pick: "  QUEEN ", correct: false },
    { roundId: 2, pick: "nurse", correct: false },
    { roundId: 3, pick: "keyboard", correct: true },
  ];

  const result = await submitLevel2(results);

  expect(result).toEqual({
    correctCount: 2,
    passed: true,
    xpAwarded: level.xpReward,
  });
  expect(dbMocks.writes[0]).toMatchObject({
    userId,
    levelId: level.id,
    passed: true,
    bestScore: 2,
    xpEarned: level.xpReward,
  });
  expect(dbMocks.insert).toHaveBeenCalledTimes(1);
});

test("submitLevel2 fails 1 of 3 even when every client correct flag is true", async () => {
  const level = levelRow();
  queueUnlocked(level);
  dbMocks.results.push(candidates("queen", ["banana"]));
  dbMocks.results.push(candidates("nurse", ["volcano"]));
  dbMocks.results.push(candidates("sea", ["keyboard"]));
  dbMocks.results.push([]);
  dbMocks.results.push([{ passed: false, xpAwarded: 0 }]);

  const results: {
    roundId: number;
    pick: string;
    correct: boolean;
  }[] = [
    { roundId: 1, pick: "queen", correct: true },
    { roundId: 2, pick: "pixel", correct: true },
    { roundId: 3, pick: "muffin", correct: true },
  ];

  const result = await submitLevel2(results);

  expect(result).toEqual({
    correctCount: 1,
    passed: false,
    xpAwarded: 0,
  });
  expect(dbMocks.writes[0]).toMatchObject({
    userId,
    levelId: level.id,
    passed: false,
    bestScore: 1,
    xpEarned: 0,
  });
});

test("an already-passed row returns xpAwarded 0", async () => {
  const level = levelRow();
  queueUnlocked(level);
  dbMocks.results.push(candidates("queen", ["banana"]));
  dbMocks.results.push(candidates("nurse", ["volcano"]));
  dbMocks.results.push(candidates("sea", ["keyboard"]));
  dbMocks.results.push([{ passed: true, bestScore: 3, xpEarned: 40 }]);
  dbMocks.results.push([{ passed: true, xpAwarded: 0 }]);

  const result = await submitLevel2([
    { roundId: 1, pick: "queen" },
    { roundId: 2, pick: "nurse" },
    { roundId: 3, pick: "keyboard" },
  ]);

  expect(result).toEqual({
    correctCount: 2,
    passed: true,
    xpAwarded: 0,
  });
  expect(dbMocks.writes[0]).toMatchObject({
    userId,
    levelId: level.id,
    passed: true,
    bestScore: 3,
    xpEarned: 0,
  });
});

test("passed and xpAwarded come from the upsert result", async () => {
  const level = levelRow({ xpReward: 40 });
  queueUnlocked(level);
  dbMocks.results.push(candidates("queen", ["banana"]));
  dbMocks.results.push(candidates("nurse", ["volcano"]));
  dbMocks.results.push(candidates("sea", ["keyboard"]));
  dbMocks.results.push([]);
  dbMocks.results.push([{ passed: true, xpAwarded: 0 }]);

  const result = await submitLevel2([
    { roundId: 1, pick: "queen" },
    { roundId: 2, pick: "nurse" },
    { roundId: 3, pick: "keyboard" },
  ]);

  expect(result.correctCount).toBe(2);
  expect(result.passed).toBe(true);
  expect(result.xpAwarded).toBe(0);
  expect(dbMocks.writes[0]).toMatchObject({ xpEarned: level.xpReward });
});

test("a higher pass mark on the level row fails 2 of 3", async () => {
  const level = levelRow({ passMark: 3 });
  queueUnlocked(level);
  dbMocks.results.push(candidates("queen", ["banana"]));
  dbMocks.results.push(candidates("nurse", ["volcano"]));
  dbMocks.results.push(candidates("sea", ["keyboard"]));
  dbMocks.results.push([]);
  dbMocks.results.push([{ passed: false, xpAwarded: 0 }]);

  const result = await submitLevel2([
    { roundId: 1, pick: "queen" },
    { roundId: 2, pick: "nurse" },
    { roundId: 3, pick: "keyboard" },
  ]);

  expect(result).toEqual({
    correctCount: 2,
    passed: false,
    xpAwarded: 0,
  });
  expect(dbMocks.writes[0]).toMatchObject({
    passed: false,
    bestScore: 2,
    xpEarned: 0,
  });
});

test("an invalid round during submit does not write progress", async () => {
  queueUnlocked();
  dbMocks.results.push(candidates("queen", ["banana"]));
  dbMocks.results.push([]);

  await expect(
    submitLevel2([
      { roundId: 1, pick: "queen" },
      { roundId: 2, pick: "nurse" },
      { roundId: 3, pick: "sea" },
    ]),
  ).rejects.toThrow("This round is not available.");
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("a database failure is logged without the error text and rethrown generically", async () => {
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  const secret =
    "connect failed postgres://role:secret-token@ep-example.neon.tech/db";
  dbMocks.select.mockImplementationOnce(() => {
    throw new Error(secret);
  });

  await expect(checkLevel2Round(1, "queen")).rejects.toThrow(
    "Something went wrong. Try again.",
  );

  dbMocks.select.mockImplementationOnce(() => {
    throw new Error(secret);
  });
  await expect(
    submitLevel2([
      { roundId: 1, pick: "queen" },
      { roundId: 2, pick: "nurse" },
      { roundId: 3, pick: "sea" },
    ]),
  ).rejects.toThrow("Something went wrong. Try again.");

  expect(errorLog).toHaveBeenCalledTimes(2);
  expect(errorLog).toHaveBeenNthCalledWith(1, "checkLevel2Round failed");
  expect(errorLog).toHaveBeenNthCalledWith(2, "submitLevel2 failed");
  expect(JSON.stringify(errorLog.mock.calls)).not.toContain("secret-token");
  expect(JSON.stringify(errorLog.mock.calls)).not.toContain("DATABASE_URL");

  errorLog.mockRestore();
});
