import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { levels } from "../src/db/schema";

loadEnv({ path: ".env.local" });

const LEVELS = [
  {
    order: 1,
    slug: "vectors",
    title: "Vectors",
    challengeType: "vectors",
    xpReward: 100,
    passMark: 70,
  },
  {
    order: 2,
    slug: "embeddings",
    title: "Embeddings",
    challengeType: "embeddings",
    xpReward: 40,
    passMark: 2,
  },
  {
    order: 3,
    slug: "search",
    title: "Similarity search",
    challengeType: "search",
    xpReward: 60,
    passMark: 3,
  },
] as const;

function redact(message: string): string {
  const url = process.env.DATABASE_URL;
  const withoutUrl = url ? message.split(url).join("[redacted]") : message;
  return withoutUrl.replace(/(?:postgres(?:ql)?|https?):\/\/\S+/gi, "[redacted]");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env.local.");
    process.exit(1);
  }

  const db = drizzle(neon(url));

  for (const level of LEVELS) {
    await db
      .insert(levels)
      .values(level)
      .onConflictDoUpdate({
        target: levels.slug,
        set: {
          order: level.order,
          title: level.title,
          challengeType: level.challengeType,
          xpReward: level.xpReward,
          passMark: level.passMark,
        },
      });
  }

  console.log(`seeded ${LEVELS.length} levels`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("failed to seed levels:", redact(message));
  process.exit(1);
});
