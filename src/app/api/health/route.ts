import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

function redact(message: string): string {
  const url = process.env.DATABASE_URL;
  const withoutUrl = url ? message.split(url).join("[redacted]") : message;
  return withoutUrl.replace(/(?:postgres(?:ql)?|https?):\/\/\S+/gi, "[redacted]");
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "t" || value === "true" || value === 1) {
    return true;
  }
  if (value === "f" || value === "false" || value === 0) {
    return false;
  }
  return undefined;
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    console.error("health check failed: DATABASE_URL is not set");
    return NextResponse.json({ ok: false, vector: false }, { status: 503 });
  }

  try {
    await db.execute(sql`SELECT 1`);
    const probe = await db.execute<{ vector: unknown }>(
      sql`SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector`,
    );
    const vector = asBoolean(probe.rows[0]?.vector);
    if (vector === undefined) {
      throw new Error("vector extension probe did not return a boolean");
    }
    return NextResponse.json({ ok: true, vector });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("health check failed:", redact(message));
    return NextResponse.json({ ok: false, vector: false }, { status: 503 });
  }
}
