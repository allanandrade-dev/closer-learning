import { createAuthClient } from "better-auth/react";

// No baseURL: the client calls the current origin, including preview deploys.
export const authClient = createAuthClient();

export const { signIn, signUp, useSession } = authClient;
