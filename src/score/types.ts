export type ScoreFormat = "musicxml" | "mxl" | "musescore" | "midi" | "pdf" | "image";

/** One singable line: a whole part, or the upper/lower voice of one staff. */
export interface PartInfo {
  id: string;
  name: string;
  sourcePartId: string;
  staff: number;
  voiceSlot: "upper" | "lower" | "only";
}

/** start/duration are in quarter notes (quarter = 1), on the played (repeat-expanded) timeline. */
export interface NoteEvent {
  partId: string;
  midi: number;
  start: number;
  duration: number;
  measure: number;
}

export interface KeySignature {
  measure: number;
  fifths: number;
  mode: "major" | "minor";
}

export interface ScoreModel {
  title: string;
  parts: PartInfo[];
  notes: NoteEvent[];
  tempo: number;
  keys: KeySignature[];
  measureCount: number;
}

export interface MeasureMarks {
  number: number;
  forward?: boolean;
  backward?: boolean;
  endings?: number[];
}
