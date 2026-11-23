import { asc } from "drizzle-orm";
import { beforeEach, expect, test, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

const dbMocks = vi.hoisted(() => {
  const results: unknown[] = [];
  const fromArgs: unknown[] = [];
  const orderByArgs: unknown[][] = [];
  const selectProjections: unknown[] = [];

  function selectChain(take: () => unknown) {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    for (const method of ["where", "limit", "innerJoin"]) {
      chain[method] = vi.fn(self);
    }
    chain.from = vi.fn((table: unknown) => {
      fromArgs.push(table);
      return chain;
    });
    chain.orderBy = vi.fn((...args: unknown[]) => {
      orderByArgs.push(args);
      return chain;
    });
    chain.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(take()).then(onFulfilled, onRejected);
    return chain;
  }

  const select = vi.fn((projection: unknown) => {
    selectProjections.push(projection);
    return selectChain(() => results.shift());
  });
  const insert = vi.fn(() => {
    const rows = results.shift();
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.values = vi.fn(self);
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

  return {
    results,
    fromArgs,
    orderByArgs,
    selectProjections,
    select,
    insert,
    database,
  };
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

import { words } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { getLevel2Rounds } from "@/server/level2-rounds";
import { UserFacingError } from "@/server/progress";

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

function wordRow(
  roundId: number,
  role: "target" | "candidate",
  text: string,
) {
  return {
    roundId,
    role,
    text,
    embedding: [roundId, text.length],
    distance: roundId,
  };
}

function completeRound(roundId: number, target: string, candidates: string[]) {
  return [
    wordRow(roundId, "target", target),
    ...candidates.map((text) => wordRow(roundId, "candidate", text)),
  ];
}

beforeEach(() => {
  dbMocks.results.length = 0;
  dbMocks.fromArgs.length = 0;
  dbMocks.orderByArgs.length = 0;
  dbMocks.selectProjections.length = 0;
  vi.clearAllMocks();
  dbMocks.database.with.mockImplementation(() => dbMocks.database);
  vi.mocked(requireUser).mockResolvedValue({
    user: { id: userId },
  } as Awaited<ReturnType<typeof requireUser>>);
});

test("getLevel2Rounds returns three rounds sorted by roundId with four sorted candidates and no embedding fields", async () => {
  queueUnlocked();
  dbMocks.results.push([
    wordRow(2, "candidate", "volcano"),
    wordRow(1, "candidate", "river"),
    wordRow(3, "target", "ocean"),
    wordRow(1, "target", "king"),
    wordRow(2, "candidate", "sweater"),
    wordRow(3, "candidate", "muffin"),
    wordRow(1, "candidate", "queen"),
    wordRow(2, "target", "doctor"),
    wordRow(3, "candidate", "keyboard"),
    wordRow(1, "candidate", "laptop"),
    wordRow(2, "candidate", "pixel"),
    wordRow(3, "candidate", "tractor"),
    wordRow(1, "candidate", "banana"),
    wordRow(2, "candidate", "nurse"),
    wordRow(3, "candidate", "sea"),
  ]);

  const result = await getLevel2Rounds();

  expect(result).toEqual([
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
  ]);
  expect(result).toHaveLength(3);
  for (const round of result) {
    expect(Object.keys(round).sort()).toEqual([
      "candidates",
      "roundId",
      "target",
    ]);
    expect(round.candidates).toHaveLength(4);
    expect(round.candidates.every((item) => typeof item === "string")).toBe(
      true,
    );
  }
  expect(JSON.stringify(result)).not.toMatch(/embedding|distance/i);
  expect(dbMocks.fromArgs.filter((table) => table === words)).toHaveLength(1);
  expect(dbMocks.orderByArgs).toEqual([[asc(words.roundId), asc(words.text)]]);
  const wordSelect = dbMocks.selectProjections.find(
    (projection): projection is Record<string, unknown> =>
      typeof projection === "object" &&
      projection !== null &&
      "roundId" in projection,
  );
  expect(Object.keys(wordSelect ?? {})).toEqual(["roundId", "role", "text"]);
});

test("unauthenticated getLevel2Rounds redirects before any database call", async () => {
  vi.mocked(requireUser).mockImplementation(async () => {
    redirect("/sign-in");
    return undefined as never;
  });

  await expect(getLevel2Rounds()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  expect(redirect).toHaveBeenCalledWith("/sign-in");
  expect(dbMocks.select).not.toHaveBeenCalled();
  expect(dbMocks.insert).not.toHaveBeenCalled();
});

test("a locked level throws and does not query words", async () => {
  queueLevel();
  dbMocks.results.push([]);

  await expect(getLevel2Rounds()).rejects.toThrow("This level is locked.");
  expect(dbMocks.fromArgs).not.toContain(words);
  expect(
    dbMocks.selectProjections.some(
      (projection) =>
        typeof projection === "object" &&
        projection !== null &&
        "text" in projection &&
        "role" in projection,
    ),
  ).toBe(false);
});

test("missing target or wrong candidate count throws UserFacingError", async () => {
  queueUnlocked();
  dbMocks.results.push([
    ...completeRound(1, "king", ["banana", "laptop", "queen", "river"]),
    ...["nurse", "pixel", "sweater", "volcano"].map((text) =>
      wordRow(2, "candidate", text),
    ),
    ...completeRound(3, "ocean", ["keyboard", "muffin", "sea", "tractor"]),
  ]);

  const missingTarget = await getLevel2Rounds().then(
    () => null,
    (error: unknown) => error,
  );
  expect(missingTarget).toBeInstanceOf(UserFacingError);
  expect(missingTarget).toMatchObject({
    message: "Level 2 rounds are not available.",
  });

  dbMocks.results.length = 0;
  queueUnlocked();
  dbMocks.results.push([
    ...completeRound(1, "king", ["banana", "laptop", "queen"]),
    ...completeRound(2, "doctor", ["nurse", "pixel", "sweater", "volcano"]),
    ...completeRound(3, "ocean", ["keyboard", "muffin", "sea", "tractor"]),
  ]);

  const wrongCount = await getLevel2Rounds().then(
    () => null,
    (error: unknown) => error,
  );
  expect(wrongCount).toBeInstanceOf(UserFacingError);
  expect(wrongCount).toMatchObject({
    message: "Level 2 rounds are not available.",
  });
});
