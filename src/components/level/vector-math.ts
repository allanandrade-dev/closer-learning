export const PLOT_MIN = -5;
export const PLOT_MAX = 5;
export const PLOT_STEP = 0.5;

export type PlotPoint = {
  x: number;
  y: number;
};

/** Clamp a coordinate to the plot, from -5 to 5. */
export function clampPlot(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < PLOT_MIN) return PLOT_MIN;
  if (value > PLOT_MAX) return PLOT_MAX;
  return value;
}

/** Nearest 0.5, then clamped to the plot. */
export function snapToStep(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const snapped = Math.round(value / PLOT_STEP) * PLOT_STEP;
  const clamped = clampPlot(snapped);
  return Object.is(clamped, -0) ? 0 : clamped;
}

export function euclideanDistance(from: PlotPoint, to: PlotPoint): number {
  return Math.hypot(from.x - to.x, from.y - to.y);
}

/** Client preview. The server grades the real attempt. `max(0, round(100 * (1 - d / 3)))`. */
export function previewScore(distance: number): number {
  return Math.max(0, Math.round(100 * (1 - distance / 3)));
}

export function formatCoord(value: number): string {
  const snapped = snapToStep(value);
  return Number.isInteger(snapped) ? String(snapped) : snapped.toFixed(1);
}

export function formatDistance(distance: number): string {
  if (!Number.isFinite(distance)) return "0.00";
  return distance.toFixed(2);
}
