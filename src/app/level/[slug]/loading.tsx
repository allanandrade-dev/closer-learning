import { Skeleton } from "@/components/ui/skeleton";

export default function LevelLoading() {
  return (
    <div className="min-h-svh bg-zinc-950" aria-busy="true" aria-live="polite">
      <header className="h-14 border-b border-zinc-800" />
      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(320px,2fr)_3fr] lg:px-10">
        <Skeleton className="h-80 rounded-xl motion-reduce:animate-none" />
        <Skeleton className="aspect-square max-h-[560px] w-full max-w-[560px] rounded-xl motion-reduce:animate-none" />
      </main>
    </div>
  );
}
