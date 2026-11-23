import { AvatarMenu } from "@/components/map/avatar-menu";
import { XpCounter } from "@/components/map/xp-counter";

export function MapHeader({ name, xp }: { name: string; xp: number }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4">
      <span className="font-mono text-sm">Closer</span>
      <div className="flex items-center gap-3">
        <XpCounter xp={xp} />
        <AvatarMenu name={name} />
      </div>
    </header>
  );
}
