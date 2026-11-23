"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function MapError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-svh items-center bg-zinc-950 px-6">
      <div className="mx-auto w-full max-w-2xl">
        <Alert>
          <AlertTitle>Couldn&apos;t load your progress.</AlertTitle>
          <AlertDescription className="mt-3">
            <Button type="button" variant="outline" onClick={() => reset()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </main>
  );
}
