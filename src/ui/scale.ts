/** Design height kept on screen at the least, so a landscape tablet still shows the full layout. */
const MIN_DESIGN_HEIGHT = 580;

/**
 * How much the phone design is enlarged on a wider screen: 1.6 from 700 wide, 2 from 1100 wide,
 * lowered when the screen is too short to keep 580 design pixels of height, and never below 1.
 */
export function uiScale(width: number, height: number): number {
  const byWidth = width >= 1100 ? 2 : width >= 700 ? 1.6 : 1;
  const byHeight = Math.floor((height / MIN_DESIGN_HEIGHT) * 20) / 20;
  return Math.max(1, Math.min(byWidth, byHeight));
}
