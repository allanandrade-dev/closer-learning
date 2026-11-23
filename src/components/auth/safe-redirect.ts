const FALLBACK_PATH = "/map";

export function safeRedirectPath(next: string | null | undefined): string {
  if (!next) {
    return FALLBACK_PATH;
  }
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return FALLBACK_PATH;
  }
  if (next.includes("\\") || next.includes("://")) {
    return FALLBACK_PATH;
  }
  if (/[\u0000-\u001F\u007F\s]/.test(next)) {
    return FALLBACK_PATH;
  }
  return next;
}
