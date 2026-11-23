import Link from "next/link";

import { XpCounter } from "@/components/map/xp-counter";

function BackArrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 6 9 12l6 6" />
    </svg>
  );
}

export function LevelHeader({
  order,
  title,
  xp,
}: {
  order: number;
  title: string;
  xp: number;
}) {
  return (
    <header className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4">
      <Link
        href="/map"
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BackArrow />
        Map
      </Link>
      <p className="truncate text-center font-mono text-sm">
        LEVEL {order} · {title.toUpperCase()}
      </p>
      <div className="justify-self-end">
        <XpCounter xp={xp} />
      </div>
    </header>
  );
}
