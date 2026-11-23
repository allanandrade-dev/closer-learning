import { expect, test } from "vitest";
import {
  DOCS,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  WORDS,
  buildEmbeddingBatch,
  docEmbedInput,
  mapEmbeddingResponse,
  rowsFromEmbeddings,
} from "./content-data";

const ROUNDS = [
  {
    roundId: 1,
    target: "king",
    candidates: ["queen", "banana", "laptop", "river"],
  },
  {
    roundId: 2,
    target: "doctor",
    candidates: ["nurse", "volcano", "sweater", "pixel"],
  },
  {
    roundId: 3,
    target: "ocean",
    candidates: ["sea", "keyboard", "tractor", "muffin"],
  },
] as const;

test("embeddings use text-embedding-3-small at 1536 dimensions", () => {
  expect(EMBEDDING_MODEL).toBe("text-embedding-3-small");
  expect(EMBEDDING_DIMENSIONS).toBe(1536);
});

test("words are three rounds of one target and four candidates", () => {
  expect(WORDS).toEqual(
    ROUNDS.flatMap((round) => [
      { roundId: round.roundId, role: "target", text: round.target },
      ...round.candidates.map((text) => ({
        roundId: round.roundId,
        role: "candidate" as const,
        text,
      })),
    ]),
  );

  expect(WORDS).toHaveLength(15);
  expect(new Set(WORDS.map((word) => word.roundId))).toEqual(
    new Set([1, 2, 3]),
  );

  for (const roundId of [1, 2, 3]) {
    const round = WORDS.filter((word) => word.roundId === roundId);
    expect(round.filter((word) => word.role === "target")).toHaveLength(1);
    expect(round.filter((word) => word.role === "candidate")).toHaveLength(4);
  }
});

test("every word is a single word of at most 10 characters", () => {
  for (const word of WORDS) {
    expect(word.text).toMatch(/^[a-z]{1,10}$/);
    expect(word.text.length).toBeLessThanOrEqual(10);
    expect(word.text.includes(" ")).toBe(false);
  }
});

test("word identity is unique per round and does not store a winner", () => {
  const keys = WORDS.map((word) => `${word.roundId}:${word.text}`);
  expect(new Set(keys).size).toBe(WORDS.length);

  for (const word of WORDS) {
    expect(Object.keys(word).sort()).toEqual(["role", "roundId", "text"]);
    expect(["target", "candidate"]).toContain(word.role);
  }
});

test("docs have unique titles and embed as Title. Body", () => {
  expect(DOCS).toEqual([
    {
      title: "Reusable rockets",
      body: "How orbital rockets can land their first stage and fly again, instead of throwing it away.",
    },
    {
      title: "Sourdough starter",
      body: "A flour-and-water culture of wild yeast used to bake naturally leavened bread.",
    },
    {
      title: "Coral reefs",
      body: "Warm, shallow-water ecosystems built by colonies of tiny animals that secrete calcium carbonate.",
    },
    {
      title: "Chess openings",
      body: "The first moves of a chess game, played to control the center and develop pieces safely.",
    },
    {
      title: "Espresso shots",
      body: "Forcing hot water through finely ground coffee at high pressure to make a concentrated shot.",
    },
    {
      title: "Migratory birds",
      body: "Seasonal long-distance flights some birds make between breeding and wintering grounds.",
    },
    {
      title: "Incremental backups",
      body: "A strategy that copies only the data that changed since the last backup, saving time and storage.",
    },
    {
      title: "Silk weaving",
      body: "Turning silkworm cocoons into thread and weaving that thread into fabric on a loom.",
    },
  ]);

  expect(new Set(DOCS.map((doc) => doc.title)).size).toBe(DOCS.length);

  for (const doc of DOCS) {
    expect(doc.title.endsWith(".")).toBe(false);
    expect(docEmbedInput(doc)).toBe(`${doc.title}. ${doc.body}`);
  }

  expect(docEmbedInput(DOCS[0])).toBe(
    "Reusable rockets. How orbital rockets can land their first stage and fly again, instead of throwing it away.",
  );
});

function markerVector(index: number): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  vector[0] = index;
  return vector;
}

test("batch builder emits 23 inputs in a stable order that maps back", () => {
  const batch = buildEmbeddingBatch();
  expect(batch).toHaveLength(23);
  expect(buildEmbeddingBatch()).toEqual(batch);

  expect(batch.slice(0, WORDS.length).map((item) => item.input)).toEqual(
    WORDS.map((word) => word.text),
  );
  expect(batch.slice(WORDS.length).map((item) => item.input)).toEqual(
    DOCS.map((doc) => docEmbedInput(doc)),
  );

  const shuffled = batch
    .map((_, index) => ({ index, embedding: markerVector(index) }))
    .reverse();
  const vectors = mapEmbeddingResponse({ data: shuffled }, batch.length);
  const rows = rowsFromEmbeddings(batch, vectors);

  expect(vectors.map((vector) => vector[0])).toEqual(
    batch.map((_, index) => index),
  );
  expect(rows.words).toHaveLength(15);
  expect(rows.docs).toHaveLength(8);
  expect(rows.words[0]).toEqual({
    roundId: 1,
    role: "target",
    text: "king",
    embedding: vectors[0],
  });
  expect(rows.words[1]).toMatchObject({
    roundId: 1,
    role: "candidate",
    text: "queen",
  });
  expect(rows.words[1].embedding[0]).toBe(1);
  expect(rows.words[14]).toMatchObject({
    roundId: 3,
    role: "candidate",
    text: "muffin",
  });
  expect(rows.words[14].embedding[0]).toBe(14);
  expect(rows.docs[0]).toEqual({
    title: "Reusable rockets",
    body: DOCS[0].body,
    embedding: vectors[15],
  });
  expect(rows.docs[0].embedding[0]).toBe(15);
  expect(rows.docs[7]).toMatchObject({ title: "Silk weaving" });
  expect(rows.docs[7].embedding[0]).toBe(22);
});

test("mapper restores input order when response indices are shuffled", () => {
  const data = [2, 0, 1].map((index) => ({
    index,
    embedding: markerVector(index),
  }));

  const vectors = mapEmbeddingResponse({ data }, 3);

  expect(vectors.map((vector) => vector[0])).toEqual([0, 1, 2]);
  expect(vectors.every((vector) => vector.length === 1536)).toBe(true);
});

test("mapper throws when a vector has the wrong dimension", () => {
  expect(() =>
    mapEmbeddingResponse(
      { data: [{ index: 0, embedding: new Array(1535).fill(0) }] },
      1,
    ),
  ).toThrow("embedding at index 0 has length 1535, expected 1536");

  const data = [0, 1, 2].map((index) => ({
    index,
    embedding: index === 1 ? [1, 2] : markerVector(index),
  }));

  expect(() => mapEmbeddingResponse({ data }, 3)).toThrow(
    "embedding at index 1 has length 2, expected 1536",
  );
});
