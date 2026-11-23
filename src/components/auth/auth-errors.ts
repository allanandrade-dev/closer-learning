import { EMAIL_ERROR, PASSWORD_ERROR } from "@/components/auth/validation";

export const DUPLICATE_EMAIL_MESSAGE = "That email is already registered.";
export const SIGN_IN_ERROR_MESSAGE = "Email or password is wrong.";
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Try again.";

export type AuthErrorInput = {
  status?: number;
  code?: string;
  message?: string;
};

export type MappedAuthError = {
  alert: string | null;
  email?: string;
  password?: string;
};

export function mapAuthError(error: AuthErrorInput): MappedAuthError {
  if (
    error.status === 422 &&
    error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
  ) {
    return { alert: null, email: DUPLICATE_EMAIL_MESSAGE };
  }

  if (error.status === 401 && error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return { alert: SIGN_IN_ERROR_MESSAGE };
  }

  if (error.status === 400 && error.code === "INVALID_EMAIL") {
    return { alert: null, email: EMAIL_ERROR };
  }

  if (
    error.status === 400 &&
    error.code === "VALIDATION_ERROR" &&
    error.message?.toLowerCase().includes("email")
  ) {
    return { alert: null, email: EMAIL_ERROR };
  }

  if (error.status === 400 && error.code === "PASSWORD_TOO_SHORT") {
    return { alert: null, password: PASSWORD_ERROR };
  }

  return { alert: GENERIC_ERROR_MESSAGE };
}

export function welcomeName(
  fromServer: string | null | undefined,
  fallback?: string,
): string {
  const name = fromServer?.trim() || fallback?.trim();
  return name ? name : "there";
}
