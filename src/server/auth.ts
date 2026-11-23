"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function signOut() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/sign-in");
}

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}
