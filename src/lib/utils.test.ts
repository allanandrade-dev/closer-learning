import { expect, test } from "vitest";
import { cn } from "@/lib/utils";

test("cn merges tailwind classes and drops falsy values", () => {
  expect(cn("px-2", "px-4", false && "hidden")).toBe("px-4");
});
