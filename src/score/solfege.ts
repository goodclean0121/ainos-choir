const STEPS = ["C", "D", "E", "F", "G", "A", "B"];
const SYLLABLES = ["도", "레", "미", "파", "솔", "라", "시"];
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** The alteration the key signature itself gives a step (+1 sharp, -1 flat, 0 none). */
function keyAlter(step: string, fifths: number): number {
  if (fifths > 0 && SHARP_ORDER.slice(0, fifths).includes(step)) return 1;
  if (fifths < 0 && FLAT_ORDER.slice(0, -fifths).includes(step)) return -1;
  return 0;
}

/**
 * Movable-do syllable for a written note. "Do" is the major tonic of the key signature
 * (minor keys share it, so their tonic is "la"); notes raised or lowered against the key get # or ♭.
 */
export function solfege(step: string, alter: number, fifths: number): string {
  const tonic = mod(4 * fifths, 7); // each fifth up moves the tonic four steps
  const degree = mod(STEPS.indexOf(step) - tonic, 7);
  const diff = alter - keyAlter(step, fifths);
  const mark = diff > 0 ? "#".repeat(diff) : "♭".repeat(-diff);
  return SYLLABLES[degree] + mark;
}
