"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function LevelError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-svh items-center bg-zinc-950 px-6">
      <div className="mx-auto w-full max-w-xl">
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load this level.</AlertTitle>
          <AlertDescription className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 bg-zinc-950 text-zinc-50"
              onClick={() => reset()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </main>
  );
}
