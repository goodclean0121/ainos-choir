import { expandRepeats } from "./repeats";
import type { KeySignature, MeasureMarks, NoteEvent, PartInfo, ScoreModel } from "./types";

const DEFAULT_TEMPO = 100;
const MAX_LINES_PER_STAFF = 6;
const STEP_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A note or rest as written, positioned in quarters from the start of its measure. */
interface RawNote {
  staff: number;
  voice: string;
  measureIndex: number;
  start: number;
  duration: number;
  /** undefined for rests: they only mark a voice as present in the measure. */
  midi?: number;
  group: number;
  tieStart: boolean;
  tieStop: boolean;
  /** Position of this <note> among all <note> elements of the document. */
  xmlIndex: number;
}

type PitchedNote = RawNote & { midi: number };

interface PartTimeline {
  id: string;
  name: string;
  staves: number;
  notes: RawNote[];
}

const childText = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
const childNum = (el: Element, tag: string, fallback: number) => {
  const text = childText(el, tag);
  return text === "" ? fallback : Number(text);
};
const isPitched = (n: RawNote): n is PitchedNote => n.midi !== undefined;

function readPart(part: Element, name: string, measureLengths: number[], noteCounter: { next: number }): PartTimeline {
  let divisions = 1;
  let staves = 1;
  // MusicXML <pitch> is the written pitch; octave clefs only change the drawing, <transpose> changes the sound.
  let transpose = 0;
  const notes: RawNote[] = [];
  let group = 0;

  Array.from(part.getElementsByTagName("measure")).forEach((measure, measureIndex) => {
    let cursor = 0;
    let maxCursor = 0;
    let lastStart = 0;

    for (const el of Array.from(measure.children)) {
      if (el.tagName === "attributes") {
        divisions = childNum(el, "divisions", divisions);
        staves = childNum(el, "staves", staves);
        const tr = el.getElementsByTagName("transpose")[0];
        if (tr) transpose = childNum(tr, "chromatic", 0) + 12 * childNum(tr, "octave-change", 0);
      } else if (el.tagName === "backup") {
        cursor -= childNum(el, "duration", 0) / divisions;
      } else if (el.tagName === "forward") {
        cursor += childNum(el, "duration", 0) / divisions;
      } else if (el.tagName === "note") {
        const xmlIndex = noteCounter.next++;
        if (el.getElementsByTagName("grace").length || el.getElementsByTagName("cue").length) continue;
        const isChord = el.getElementsByTagName("chord").length > 0;
        const duration = childNum(el, "duration", 0) / divisions;
        const start = isChord ? lastStart : cursor;
        if (!isChord) {
          lastStart = cursor;
          cursor += duration;
          group++;
        }
        maxCursor = Math.max(maxCursor, cursor);

        const pitch = el.getElementsByTagName("pitch")[0];
        const ties = Array.from(el.getElementsByTagName("tie")).map((t) => t.getAttribute("type"));
        notes.push({
          staff: childNum(el, "staff", 1),
          voice: childText(el, "voice") || "1",
          measureIndex,
          start,
          duration,
          midi: pitch
            ? STEP_SEMITONES[childText(pitch, "step")] +
              childNum(pitch, "alter", 0) +
              (childNum(pitch, "octave", 4) + 1) * 12 +
              transpose
            : undefined,
          group,
          tieStart: ties.includes("start"),
          tieStop: ties.includes("stop"),
          xmlIndex,
        });
      }
    }
    measureLengths[measureIndex] = Math.max(measureLengths[measureIndex] ?? 0, maxCursor);
  });

  return { id: part.getAttribute("id") ?? "", name, staves, notes };
}

/**
 * The singable sub-lines of one staff in one measure, highest first.
 * Each voice is one sub-line (a resting voice is an empty one); a voice written in chords
 * contributes one sub-line per chord member, top to bottom.
 */
function subLines(measureNotes: RawNote[]): PitchedNote[][] {
  const voices = [...new Set(measureNotes.map((n) => n.voice))].sort((a, b) => Number(a) - Number(b));
  const lines: PitchedNote[][] = [];
  for (const voice of voices) {
    const groups = new Map<number, PitchedNote[]>();
    for (const n of measureNotes) {
      if (n.voice === voice && isPitched(n)) groups.set(n.group, [...(groups.get(n.group) ?? []), n]);
    }
    const chords = [...groups.values()].map((c) => [...c].sort((a, b) => b.midi - a.midi));
    const width = Math.max(1, ...chords.map((c) => c.length));
    for (let r = 0; r < width; r++) lines.push(chords.map((c) => c[Math.min(r, c.length - 1)]));
  }
  return lines;
}

/** Split one staff into lines, deciding per measure how its notation maps onto them. */
function staffLines(notes: RawNote[]): PitchedNote[][] {
  const byMeasure = new Map<number, RawNote[]>();
  for (const n of notes) byMeasure.set(n.measureIndex, [...(byMeasure.get(n.measureIndex) ?? []), n]);
  const perMeasure = [...byMeasure.values()].map(subLines);
  const lineCount = Math.min(MAX_LINES_PER_STAFF, Math.max(0, ...perMeasure.map((l) => l.length)));

  return Array.from({ length: lineCount }, (_, i) =>
    perMeasure.flatMap((sub) => {
      if (sub.length === 0) return [];
      // Fewer sub-lines than lines (e.g. a unison measure): neighbouring lines share one.
      const k = sub.length >= lineCount ? i : Math.floor((i * sub.length) / lineCount);
      return sub[k];
    }),
  );
}

const sameLine = (a: PitchedNote[], b: PitchedNote[]) => a.length === b.length && a.every((n, i) => n === b[i]);

interface PlayedNote extends NoteEvent {
  tieStart: boolean;
  tieStop: boolean;
}

/** Join tied notes of the same pitch on the played timeline (so a tie never crosses into a different ending). */
function mergeTies(notes: PlayedNote[]): NoteEvent[] {
  const out: PlayedNote[] = [];
  for (const n of [...notes].sort((a, b) => a.start - b.start)) {
    const held = n.tieStop
      ? out.findLast((p) => p.tieStart && p.midi === n.midi && Math.abs(p.start + p.duration - n.start) < 1e-6)
      : undefined;
    if (held) {
      held.duration += n.duration;
      held.tieStart = n.tieStart;
    } else {
      out.push({ ...n });
    }
  }
  return out.map(({ partId, midi, start, duration, measure }) => ({ partId, midi, start, duration, measure }));
}

function readMarks(part: Element): MeasureMarks[] {
  let endings: number[] | undefined;
  return Array.from(part.getElementsByTagName("measure")).map((measure, i) => {
    const marks: MeasureMarks = { number: i + 1 };
    for (const barline of Array.from(measure.getElementsByTagName("barline"))) {
      const repeat = barline.getElementsByTagName("repeat")[0];
      const direction = repeat?.getAttribute("direction");
      if (direction === "forward") marks.forward = true;
      if (direction === "backward") {
        marks.backward = true;
        const times = Number(repeat?.getAttribute("times"));
        if (times > 1) marks.times = times;
      }
      const ending = barline.getElementsByTagName("ending")[0];
      if (ending?.getAttribute("type") === "start") {
        endings = (ending.getAttribute("number") ?? "1").split(/[,\s]+/).filter(Boolean).map(Number);
      }
    }
    if (endings) marks.endings = endings;
    const closes = Array.from(measure.getElementsByTagName("ending")).some((e) =>
      ["stop", "discontinue"].includes(e.getAttribute("type") ?? ""),
    );
    if (closes) endings = undefined;
    return marks;
  });
}

function readKeys(part: Element): KeySignature[] {
  const keys: KeySignature[] = [];
  Array.from(part.getElementsByTagName("measure")).forEach((measure, i) => {
    const key = measure.getElementsByTagName("key")[0];
    if (!key) return;
    const entry: KeySignature = {
      measure: i + 1,
      fifths: childNum(key, "fifths", 0),
      mode: childText(key, "mode") === "minor" ? "minor" : "major",
    };
    const last = keys[keys.length - 1];
    if (!last || last.fifths !== entry.fifths || last.mode !== entry.mode) keys.push(entry);
  });
  return keys;
}

function partDisplayName(scorePart: Element): string {
  const nameEl = scorePart.getElementsByTagName("part-name")[0];
  const name = nameEl?.textContent?.trim() ?? "";
  if (name && nameEl?.getAttribute("print-object") !== "no") return name;
  return childText(scorePart, "part-abbreviation") || name;
}

function lineLabel(staff: number, line: number, lineCount: number): string {
  if (lineCount === 2) return `${staff}단 ${line === 0 ? "위" : "아래"}`;
  return `${staff}단 ${line + 1}성부`;
}

/** Parse a partwise MusicXML score into singable parts and note events. */
export function parseMusicXml(xml: string): ScoreModel {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length || !doc.getElementsByTagName("score-partwise").length) {
    throw new Error("MusicXML 악보를 읽을 수 없어요.");
  }

  const names = new Map(
    Array.from(doc.getElementsByTagName("score-part")).map((sp) => [sp.getAttribute("id") ?? "", partDisplayName(sp)]),
  );
  const partEls = Array.from(doc.getElementsByTagName("part"));
  const measureLengths: number[] = [];
  const noteCounter = { next: 0 };
  const timelines = partEls.map((p) => readPart(p, names.get(p.getAttribute("id") ?? "") ?? "", measureLengths, noteCounter));

  const parts: PartInfo[] = [];
  const lines = new Map<string, PitchedNote[]>();
  for (const tl of timelines) {
    for (let staff = 1; staff <= tl.staves; staff++) {
      const staffNotes = staffLines(tl.notes.filter((n) => n.staff === staff)).filter((l) => l.length > 0);
      if (staffNotes.length === 0) continue;
      const base = { sourceName: tl.name, sourcePartId: tl.id, staff };
      if (staffNotes.every((l) => sameLine(l, staffNotes[0]))) {
        const id = tl.staves === 1 ? tl.id : `${tl.id}-s${staff}`;
        parts.push({ ...base, id, name: tl.name, voiceSlot: "only", line: 0, lineCount: 1 });
        lines.set(id, staffNotes[0]);
        continue;
      }
      const count = staffNotes.length;
      staffNotes.forEach((line, i) => {
        const slot = i === 0 ? "upper" : i === count - 1 ? "lower" : "middle";
        const id = count === 2 ? `${tl.id}-s${staff}-${slot}` : `${tl.id}-s${staff}-v${i + 1}`;
        const name = [tl.name, lineLabel(staff, i, count)].filter(Boolean).join(" ");
        parts.push({ ...base, id, name, voiceSlot: slot, line: i, lineCount: count });
        lines.set(id, line);
      });
    }
  }

  const playOrder = partEls.length ? expandRepeats(readMarks(partEls[0])) : [];
  const played: PlayedNote[] = [];
  const timeline: ScoreModel["timeline"] = [];
  let playedOffset = 0;
  for (const measureNo of playOrder) {
    const index = measureNo - 1;
    timeline.push({ measure: measureNo, start: playedOffset, length: measureLengths[index] ?? 0 });
    for (const part of parts) {
      for (const n of lines.get(part.id) ?? []) {
        if (n.measureIndex !== index) continue;
        played.push({
          partId: part.id,
          midi: n.midi,
          start: playedOffset + n.start,
          duration: n.duration,
          measure: measureNo,
          tieStart: n.tieStart,
          tieStop: n.tieStop,
        });
      }
    }
    playedOffset += measureLengths[index] ?? 0;
  }
  const notes = parts.flatMap((p) => mergeTies(played.filter((n) => n.partId === p.id))).sort((a, b) => a.start - b.start);

  const tempoAttr = doc.querySelector("sound[tempo]")?.getAttribute("tempo");
  return {
    title: childText(doc.documentElement, "work-title") || childText(doc.documentElement, "movement-title"),
    parts,
    notes,
    tempo: tempoAttr ? Number(tempoAttr) : DEFAULT_TEMPO,
    keys: partEls.length ? readKeys(partEls[0]) : [],
    measureCount: measureLengths.length,
    lineNotes: Object.fromEntries(
      parts.map((p) => {
        const line = lines.get(p.id) ?? [];
        return [p.id, [...line].sort((a, b) => a.measureIndex - b.measureIndex || a.start - b.start).map((n) => n.xmlIndex)];
      }),
    ),
    timeline,
  };
}
