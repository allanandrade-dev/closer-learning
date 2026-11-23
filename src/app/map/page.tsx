import { signOut } from "@/server/auth";

import { Button } from "@/components/ui/button";

export default function MapPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Level map</h1>
      <p className="mt-3 text-zinc-400">Level map coming soon</p>
      <form action={signOut} className="mt-8">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
