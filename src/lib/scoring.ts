function assertFinitePoint(
  point: { x: number; y: number },
  label: string,
): void {
  if (
    point == null ||
    typeof point.x !== "number" ||
    typeof point.y !== "number" ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    throw new Error(`distanceScore requires finite ${label} coordinates`);
  }
}

/** Euclidean distance and the 0–100 closeness score. Score is 0 once d >= 3. */
export function distanceScore(
  user: { x: number; y: number },
  target: { x: number; y: number },
): { distance: number; score: number } {
  assertFinitePoint(user, "user");
  assertFinitePoint(target, "target");

  const distance = Math.hypot(user.x - target.x, user.y - target.y);
  const score = Math.max(0, Math.round(100 * (1 - distance / 3)));

  return { distance, score };
}
