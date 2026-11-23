import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";

function authBaseURL(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

function createAuth() {
  return betterAuth({
    baseURL: authBaseURL(),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      // Default sign-up still rejects an existing email with
      // USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL. Do not set autoSignIn: false
      // or requireEmailVerification here; both switch that response to a
      // generic success and hide the duplicate.
      minPasswordLength: 8,
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user,
        session,
        account,
        verification,
      },
    }),
    plugins: [
      // Must stay last so server actions can write the session cookie.
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

let authInstance: Auth | undefined;

function getAuth(): Auth {
  authInstance ??= createAuth();
  return authInstance;
}

const lazySkip = new Set<string | symbol>(["then", "catch", "finally"]);

// Created on first use. Importing this module must not throw when
// BETTER_AUTH_SECRET and DATABASE_URL are unset, which is how `next build` runs.
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (lazySkip.has(prop)) {
      return undefined;
    }
    const instance = getAuth();
    const value: unknown = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, prop) {
    if (lazySkip.has(prop)) {
      return false;
    }
    return prop in getAuth();
  },
});
