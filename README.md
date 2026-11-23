# Closer

Closer is a short, gamified course that teaches vector databases by making you play them. You sign in, walk a level map, and earn XP for passing challenges that use real distance math and a real pgvector query. Live app: https://closer-learning.vercel.app

## Stack

Next.js 15 (App Router), TypeScript in strict mode, Tailwind v4 and shadcn/ui. Auth is Better Auth with email and password, stored through the Drizzle adapter. The database is Neon Postgres with pgvector, accessed with Drizzle ORM. Seeded words use OpenAI `text-embedding-3-small` (1536 dimensions). Each pull request gets a Vercel preview. GitHub Actions runs CI on pull requests and on pushes to `main`.

## What works

Email sign-up, sign-in, and sign-out, with protected pages. The level map saves XP and unlocks. Level 1, Vectors: place a point, score by distance over 3 rounds, pass at 70, and earn 100 XP once. Level 2, Embeddings: pick the closest word. The server grades each pick with a pgvector cosine-distance query. Pass at 2 of 3 and earn 40 XP once. Replaying a level you already passed does not add XP.

## What's incomplete

Level 3 (nearest-neighbour ranking) and Levels 4–6 are not built. On the map they show as locked or coming soon. Levels 4–6 are Indexes (HNSW), Hybrid search, and RAG.

## Known issues

Notes for the next round, written down on purpose:

- Level 1 is too easy. The target point and the live distance stay visible, and the point can be dragged onto the target. Next: hide the target, drop drag, accept typed x/y only, auto-check each guess with hot/cold distance feedback, and cap attempts.
- Level 2: `checkLevel2Round` returns the correct answer for the round so the UI can reveal it. A player could read that value before submitting. The final grade is computed again on the server. The per-round reveal should happen only after submission.
- `/map` renders two nested `<main>` elements, which is an accessibility bug.
- One transient client-side exception showed up during a deploy, most likely a stale chunk. It was not reproduced.

## How to run locally

You need Node.js 20 or newer, pnpm 10.33.4 (the version in `packageManager`), and Postgres with pgvector. Neon works. Copy `.env.example` to `.env.local` and set the names below. Do not commit values.

| Name | Used for |
| --- | --- |
| `DATABASE_URL` | Neon connection string. Drizzle, seeds, and the app read it from `.env.local`. |
| `OPENAI_API_KEY` | Word and doc seed only. The app does not call OpenAI at request time. |
| `BETTER_AUTH_SECRET` | Session signing secret. |
| `BETTER_AUTH_URL` | Public base URL for Better Auth. Locally this is `http://localhost:3000`. If it is unset, auth falls back to `https://$VERCEL_URL` on Vercel, then to `http://localhost:3000`. |

`VERCEL_URL` is set by Vercel. You do not put it in `.env.local`.

```bash
pnpm install
pnpm db:setup       # db:vector (CREATE EXTENSION vector) then db:push (drizzle-kit push)
pnpm db:seed        # upsert the three levels
pnpm db:seed-words  # embed words and docs with OpenAI, then upsert them
pnpm dev
```

There is no migration script. `drizzle.config.ts` points Drizzle Kit at `src/db/schema.ts` and applies the schema with `drizzle-kit push`. `pnpm db:seed-words` calls the OpenAI embeddings API, so it needs `OPENAI_API_KEY` and spends a small amount of credit. Both seeds are safe to run again.

Other scripts:

```bash
pnpm test                 # vitest run
pnpm lint                 # eslint
pnpm exec tsc --noEmit    # typecheck; CI runs this directly (no typecheck script)
pnpm build
pnpm db:studio            # drizzle-kit studio
```

## How it was built

This is the Casper Studios take-home, built in a two-hour timebox on 2026-11-22, from 22:30 to 00:30 Brasilia time. Each slice landed as its own pull request and was merged with a merge commit (no squash), so the history is the timebox. Tests are Vitest.
