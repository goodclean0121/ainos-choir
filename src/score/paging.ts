/** Score sizes offered by the zoom buttons, as OSMD zoom factors. */
export const ZOOM_STEPS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];

/** The page shown at a horizontal scroll position, when every page is `width` wide. */
export function pageAt(scrollLeft: number, width: number, pages: number): number {
  if (width <= 0 || pages <= 0) return 0;
  return Math.min(pages - 1, Math.max(0, Math.round(scrollLeft / width)));
}

/** The next size up (direction 1) or down (-1), staying within ZOOM_STEPS. */
export function stepZoom(current: number, direction: 1 | -1): number {
  const steps = direction > 0 ? ZOOM_STEPS : [...ZOOM_STEPS].reverse();
  return steps.find((z) => (direction > 0 ? z > current + 1e-6 : z < current - 1e-6)) ?? steps.at(-1)!;
}

/** Phones get a smaller staff so a line holds more than one bar. */
export function defaultZoom(width: number): number {
  return width < 600 ? 0.6 : 1;
}

/** The largest listed size, up to `current`, at which content `needed` px tall at `current` fits in `available` px. */
export function fitZoom(current: number, available: number, needed: number): number {
  if (needed <= available) return current;
  const target = (current * available) / needed;
  return [...ZOOM_STEPS].reverse().find((z) => z <= target + 1e-6) ?? ZOOM_STEPS[0];
}
