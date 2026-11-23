export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export type WordRole = "target" | "candidate";

export type WordSeed = {
  roundId: number;
  role: WordRole;
  text: string;
};

export type DocSeed = {
  title: string;
  body: string;
};

// Bare words only. The closer candidate is whatever the embedding says, so
// these rows do not store a winner.
export const WORDS = [
  { roundId: 1, role: "target", text: "king" },
  { roundId: 1, role: "candidate", text: "queen" },
  { roundId: 1, role: "candidate", text: "banana" },
  { roundId: 1, role: "candidate", text: "laptop" },
  { roundId: 1, role: "candidate", text: "river" },
  { roundId: 2, role: "target", text: "doctor" },
  { roundId: 2, role: "candidate", text: "nurse" },
  { roundId: 2, role: "candidate", text: "volcano" },
  { roundId: 2, role: "candidate", text: "sweater" },
  { roundId: 2, role: "candidate", text: "pixel" },
  { roundId: 3, role: "target", text: "ocean" },
  { roundId: 3, role: "candidate", text: "sea" },
  { roundId: 3, role: "candidate", text: "keyboard" },
  { roundId: 3, role: "candidate", text: "tractor" },
  { roundId: 3, role: "candidate", text: "muffin" },
] as const satisfies readonly WordSeed[];

export const DOCS = [
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
] as const satisfies readonly DocSeed[];

export type EmbeddingBatchItem =
  | {
      kind: "word";
      roundId: number;
      role: WordRole;
      text: string;
      input: string;
    }
  | {
      kind: "doc";
      title: string;
      body: string;
      input: string;
    };

export type SeedWordRow = WordSeed & { embedding: number[] };
export type SeedDocRow = DocSeed & { embedding: number[] };

// Title is stored without a trailing period. The embed string joins them.
export function docEmbedInput(doc: Pick<DocSeed, "title" | "body">): string {
  return `${doc.title}. ${doc.body}`;
}

export function buildEmbeddingBatch(
  words: readonly WordSeed[] = WORDS,
  docs: readonly DocSeed[] = DOCS,
): EmbeddingBatchItem[] {
  return [
    ...words.map((word) => ({
      kind: "word" as const,
      roundId: word.roundId,
      role: word.role,
      text: word.text,
      input: word.text,
    })),
    ...docs.map((doc) => ({
      kind: "doc" as const,
      title: doc.title,
      body: doc.body,
      input: docEmbedInput(doc),
    })),
  ];
}

function assertEmbedding(
  value: unknown,
  index: number,
  dimensions: number,
): number[] {
  const length = Array.isArray(value) ? value.length : undefined;
  if (!Array.isArray(value) || length !== dimensions) {
    throw new Error(
      `embedding at index ${index} has length ${length ?? "invalid"}, expected ${dimensions}`,
    );
  }

  for (const component of value) {
    if (typeof component !== "number" || !Number.isFinite(component)) {
      throw new Error(
        `embedding at index ${index} contains a non-finite number`,
      );
    }
  }

  return value;
}

// OpenAI may return `data` in any order. Place each vector at `data[i].index`.
export function mapEmbeddingResponse(
  response: unknown,
  expectedCount: number,
  dimensions: number = EMBEDDING_DIMENSIONS,
): number[][] {
  if (
    typeof response !== "object" ||
    response === null ||
    !("data" in response) ||
    !Array.isArray(response.data)
  ) {
    throw new Error("embeddings response is missing data");
  }

  if (response.data.length !== expectedCount) {
    throw new Error(
      `expected ${expectedCount} embeddings, received ${response.data.length}`,
    );
  }

  const ordered: Array<number[] | undefined> = new Array(expectedCount);
  const seen = new Set<number>();

  for (const entry of response.data) {
    if (typeof entry !== "object" || entry === null) {
      throw new Error("embeddings response entry is not an object");
    }

    const index = "index" in entry ? entry.index : undefined;
    if (typeof index !== "number" || !Number.isInteger(index)) {
      throw new Error("embeddings response entry is missing an integer index");
    }
    if (index < 0 || index >= expectedCount) {
      throw new Error(
        `embedding index ${index} is outside 0..${expectedCount - 1}`,
      );
    }
    if (seen.has(index)) {
      throw new Error(`duplicate embedding index ${index}`);
    }

    seen.add(index);
    const embedding = "embedding" in entry ? entry.embedding : undefined;
    ordered[index] = assertEmbedding(embedding, index, dimensions);
  }

  return ordered.map((vector, index) => {
    if (!vector) {
      throw new Error(`missing embedding for index ${index}`);
    }
    return vector;
  });
}

export function rowsFromEmbeddings(
  batch: readonly EmbeddingBatchItem[],
  vectors: readonly number[][],
): { words: SeedWordRow[]; docs: SeedDocRow[] } {
  if (vectors.length !== batch.length) {
    throw new Error(
      `expected ${batch.length} embeddings, received ${vectors.length}`,
    );
  }

  const words: SeedWordRow[] = [];
  const docs: SeedDocRow[] = [];

  batch.forEach((item, index) => {
    const embedding = assertEmbedding(
      vectors[index],
      index,
      EMBEDDING_DIMENSIONS,
    );
    if (item.kind === "word") {
      words.push({
        roundId: item.roundId,
        role: item.role,
        text: item.text,
        embedding,
      });
      return;
    }

    docs.push({
      title: item.title,
      body: item.body,
      embedding,
    });
  });

  return { words, docs };
}
