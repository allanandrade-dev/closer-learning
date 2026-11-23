"use client";

import { useEffect, useId, useRef, useState } from "react";

import { signOut } from "@/server/auth";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function AvatarMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full py-1 pl-1 text-sm text-zinc-100 outline-none hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-indigo-400 sm:pr-3"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full bg-zinc-800 font-mono text-xs"
        >
          {initials(name)}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{name}</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={name}
          className="absolute right-0 z-30 mt-2 min-w-44 rounded-md border border-zinc-800 bg-zinc-900 p-1 text-sm shadow-lg"
        >
          <p className="truncate px-2 py-1.5 text-zinc-200">{name}</p>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-sm px-2 py-1.5 text-left text-zinc-100 hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
