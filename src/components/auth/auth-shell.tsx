import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-zinc-950 px-6">
      <Card className="w-full max-w-sm rounded-2xl border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-zinc-400">{description}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </Card>
    </main>
  );
}
