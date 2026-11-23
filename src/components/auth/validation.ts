export const EMAIL_ERROR = "Enter a valid email";
export const PASSWORD_ERROR = "Use at least 8 characters";
export const NAME_ERROR = "Name is required";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(value: string): string | undefined {
  if (!EMAIL_PATTERN.test(value.trim())) {
    return EMAIL_ERROR;
  }
  return undefined;
}

export function passwordError(value: string): string | undefined {
  if (value.length < 8) {
    return PASSWORD_ERROR;
  }
  return undefined;
}

export function nameError(value: string): string | undefined {
  if (value.trim().length === 0) {
    return NAME_ERROR;
  }
  return undefined;
}
