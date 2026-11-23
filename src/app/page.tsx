import Link from "next/link";

import { WordField } from "@/components/landing/word-field";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex min-h-svh flex-col bg-zinc-950 px-6">
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <WordField />
        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
            Words have coordinates.
          </h1>
          <p className="mt-4 max-w-xl text-base text-zinc-400 sm:text-lg">
            Learn how vector databases think, from a single arrow to a real
            pgvector search. Three levels, real embeddings, real queries.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-indigo-500 text-white hover:bg-indigo-400"
            >
              <Link href="/sign-up">Start the journey</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-zinc-600 bg-transparent"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
      <footer className="pb-6 text-center text-sm text-zinc-500">
        Built by Allan Andrade and his AI dev squad in 2 hours.
      </footer>
    </main>
  );
}
