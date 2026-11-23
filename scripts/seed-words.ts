import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { docs, words } from "../src/db/schema";
import {
  DOCS,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  WORDS,
  buildEmbeddingBatch,
  mapEmbeddingResponse,
  rowsFromEmbeddings,
  type SeedDocRow,
  type SeedWordRow,
} from "./content-data";

loadEnv({ path: ".env.local", quiet: true });

const EMBEDDING_URL = "https://api.openai.com/v1/embeddings";
const EXPECTED_INPUTS = WORDS.length + DOCS.length;

class OpenAiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OpenAiRequestError";
    this.status = status;
  }
}

function redactSecrets(message: string): string {
  const secrets = [process.env.DATABASE_URL, process.env.OPENAI_API_KEY].filter(
    (value): value is string => Boolean(value),
  );
  let redacted = message;
  for (const secret of secrets) {
    redacted = redacted.split(secret).join("[redacted]");
  }
  return redacted;
}

function redact(message: string): string {
  return redactSecrets(message).replace(
    /(?:postgres(?:ql)?|https?):\/\/\S+/gi,
    "[redacted]",
  );
}

function requireEnv(): { apiKey: string; databaseUrl: string } {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const missing: string[] = [];

  if (!apiKey) {
    missing.push("OPENAI_API_KEY is not set. Add it to .env.local.");
  }
  if (!databaseUrl) {
    missing.push("DATABASE_URL is not set. Add it to .env.local.");
  }
  if (missing.length > 0) {
    for (const line of missing) {
      console.error(line);
    }
    process.exit(1);
  }

  return { apiKey, databaseUrl };
}

async function openAiErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error &&
      typeof body.error.message === "string"
    ) {
      return body.error.message;
    }
  } catch {
    // Status alone is enough when the body is not JSON.
  }
  return "";
}

async function requestEmbeddings(
  inputs: readonly string[],
  apiKey: string,
): Promise<unknown> {
  const response = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    throw new OpenAiRequestError(
      response.status,
      await openAiErrorMessage(response),
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error("OpenAI embeddings response was not JSON");
  }
}

async function upsertWords(
  db: ReturnType<typeof drizzle>,
  rows: readonly SeedWordRow[],
): Promise<number> {
  let count = 0;
  for (const row of rows) {
    const result = await db
      .insert(words)
      .values({
        roundId: row.roundId,
        role: row.role,
        text: row.text,
        embedding: row.embedding,
      })
      .onConflictDoUpdate({
        target: [words.roundId, words.text],
        set: {
          role: row.role,
          embedding: row.embedding,
        },
      })
      .returning({ id: words.id });
    if (result.length !== 1) {
      throw new Error(`expected to upsert 1 word, received ${result.length}`);
    }
    count += result.length;
  }
  return count;
}

async function upsertDocs(
  db: ReturnType<typeof drizzle>,
  rows: readonly SeedDocRow[],
): Promise<number> {
  let count = 0;
  for (const row of rows) {
    const result = await db
      .insert(docs)
      .values({
        title: row.title,
        body: row.body,
        embedding: row.embedding,
      })
      .onConflictDoUpdate({
        target: docs.title,
        set: {
          body: row.body,
          embedding: row.embedding,
        },
      })
      .returning({ id: docs.id });
    if (result.length !== 1) {
      throw new Error(`expected to upsert 1 doc, received ${result.length}`);
    }
    count += result.length;
  }
  return count;
}

async function main() {
  const { apiKey, databaseUrl } = requireEnv();

  const batch = buildEmbeddingBatch();
  if (batch.length !== EXPECTED_INPUTS) {
    throw new Error(
      `expected ${EXPECTED_INPUTS} embedding inputs, built ${batch.length}`,
    );
  }

  const response = await requestEmbeddings(
    batch.map((item) => item.input),
    apiKey,
  );
  const vectors = mapEmbeddingResponse(response, batch.length);
  const { words: wordRows, docs: docRows } = rowsFromEmbeddings(batch, vectors);

  const db = drizzle(neon(databaseUrl));
  const wordCount = await upsertWords(db, wordRows);
  const docCount = await upsertDocs(db, docRows);

  console.log(`words: ${wordCount} upserted`);
  console.log(`docs: ${docCount} upserted`);
}

main().catch((error: unknown) => {
  if (error instanceof OpenAiRequestError) {
    const message = redactSecrets(error.message);
    console.error(message ? `${error.status} ${message}` : String(error.status));
    process.exit(1);
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error("failed to seed words:", redact(message));
  process.exit(1);
});
