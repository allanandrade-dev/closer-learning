import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";

loadEnv({ path: ".env.local" });

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

  // drizzle-kit push does not create extensions.
  const sql = neon(url);
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log("pgvector extension is enabled");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("failed to enable pgvector:", redact(message));
  process.exit(1);
});
