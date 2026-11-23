import { tryToParsePath } from "next/dist/lib/try-to-parse-path";
import { NextRequest } from "next/server";
import { expect, test } from "vitest";
import { config, middleware } from "@/middleware";

const origin = "http://localhost:3000";

function request(path: string, cookie?: string) {
  const headers = new Headers();
  if (cookie !== undefined) {
    headers.set("cookie", cookie);
  }
  return new NextRequest(new URL(path, origin), { headers });
}

function matched(pathname: string) {
  return config.matcher.some((pattern) => {
    const { regexStr } = tryToParsePath(pattern);
    if (!regexStr) {
      throw new Error(`Could not compile matcher ${pattern}`);
    }
    return new RegExp(regexStr).test(pathname);
  });
}

test("redirects protected routes without a session cookie", () => {
  for (const path of ["/map", "/level/x"]) {
    const response = middleware(request(path));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/sign-in`);
  }
});

test("lets protected routes through when a session cookie is present", () => {
  for (const cookie of [
    "better-auth.session_token=session-token",
    "__Secure-better-auth.session_token=session-token",
  ]) {
    for (const path of ["/map", "/level/x"]) {
      const response = middleware(request(path, cookie));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  }
});

test("ignores unrelated cookies", () => {
  const response = middleware(request("/map", "theme=dark"));

  expect(response.headers.get("location")).toBe(`${origin}/sign-in`);
});

test("matcher covers /map and /level and skips other paths", () => {
  expect(config.matcher).toEqual(["/map", "/level/:path*"]);

  expect(matched("/map")).toBe(true);
  expect(matched("/level/x")).toBe(true);
  expect(matched("/level/x/y")).toBe(true);

  for (const path of [
    "/",
    "/sign-in",
    "/mapping",
    "/levels",
    "/map/extra",
    "/api/auth/sign-in/email",
    "/api/health",
  ]) {
    expect(matched(path)).toBe(false);
  }
});
