import { Skeleton } from "@/components/ui/skeleton";

export default function MapLoading() {
  return (
    <div className="min-h-svh bg-zinc-950" aria-busy="true">
      <header className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
        <span className="font-mono text-sm text-zinc-50">Closer</span>
        <Skeleton className="h-4 w-16" aria-hidden />
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="size-11 shrink-0 rounded-full sm:size-14" />
              <Skeleton className="h-28 flex-1 rounded-xl" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
