export const DUPLICATE_EMAIL_MESSAGE = "That email is already registered.";
export const SIGN_IN_ERROR_MESSAGE = "Email or password is wrong.";
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Try again.";

type AuthFailure = {
  code?: string;
  message?: string;
};

export function signUpErrorMessage(error: AuthFailure): string {
  const code = error.code?.toUpperCase() ?? "";
  if (code.includes("USER_ALREADY_EXISTS")) {
    return DUPLICATE_EMAIL_MESSAGE;
  }

  const message = error.message?.toLowerCase() ?? "";
  if (
    message.includes("already exists") ||
    message.includes("already registered") ||
    message.includes("use another email")
  ) {
    return DUPLICATE_EMAIL_MESSAGE;
  }

  return GENERIC_ERROR_MESSAGE;
}

export function welcomeName(
  fromServer: string | null | undefined,
  fallback?: string,
): string {
  const name = fromServer?.trim() || fallback?.trim();
  return name ? name : "there";
}
