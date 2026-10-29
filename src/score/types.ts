export type ScoreFormat = "musicxml" | "mxl" | "musescore" | "midi" | "pdf" | "image";

/** One singable line: a whole part, or one voice of a staff that carries several. */
export interface PartInfo {
  id: string;
  name: string;
  /** The score part's own name, shared by every line split from it. */
  sourceName: string;
  sourcePartId: string;
  staff: number;
  voiceSlot: "upper" | "middle" | "lower" | "only";
  /** Position among the lines split from the same staff, 0 = highest. */
  line: number;
  lineCount: number;
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
  /** How many times the section is played in total (MusicXML repeat@times); default 2. */
  times?: number;
  endings?: number[];
}
