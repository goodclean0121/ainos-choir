import { solfege } from "./solfege";
import type { KeySignature } from "./types";

export interface NotePitch {
  step: string;
  alter: number;
  octave: number;
}

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const toMidi = ({ step, alter, octave }: NotePitch) => (octave + 1) * 12 + SEMITONES[step] + alter;

/** The key signature (in fifths) in force at a measure (1-based, in written order). */
export function fifthsAt(keys: KeySignature[], measure: number): number {
  let fifths = 0;
  for (const k of keys) if (k.measure <= measure) fifths = k.fifths;
  return fifths;
}

/** "솔 (G4)": movable-do name first, letter name for anyone who reads it. */
export function noteLabel(pitch: NotePitch, fifths: number): string {
  const accidental = pitch.alter > 0 ? "#".repeat(pitch.alter) : "♭".repeat(-pitch.alter);
  return `${solfege(pitch.step, pitch.alter, fifths)} (${pitch.step}${accidental}${pitch.octave})`;
}
