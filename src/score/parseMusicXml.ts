import { expandRepeats } from "./repeats";
import type { KeySignature, MeasureMarks, NoteEvent, PartInfo, ScoreModel } from "./types";

const DEFAULT_TEMPO = 100;
const STEP_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A pitched note as written, positioned in quarters from the start of the unexpanded score. */
interface RawNote {
  staff: number;
  voice: string;
  measureIndex: number;
  start: number;
  duration: number;
  midi: number;
  group: number;
  tieStart: boolean;
  tieStop: boolean;
}

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

function readPart(part: Element, name: string, measureLengths: number[]): PartTimeline {
  let divisions = 1;
  let staves = 1;
  const octaveShift = new Map<number, number>();
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
        for (const clef of Array.from(el.getElementsByTagName("clef"))) {
          const staffNo = Number(clef.getAttribute("number") ?? 1);
          octaveShift.set(staffNo, childNum(clef, "clef-octave-change", 0));
        }
      } else if (el.tagName === "backup") {
        cursor -= childNum(el, "duration", 0) / divisions;
      } else if (el.tagName === "forward") {
        cursor += childNum(el, "duration", 0) / divisions;
      } else if (el.tagName === "note") {
        if (el.getElementsByTagName("grace").length) continue;
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
        if (!pitch) continue;
        const staff = childNum(el, "staff", 1);
        const ties = Array.from(el.getElementsByTagName("tie")).map((t) => t.getAttribute("type"));
        notes.push({
          staff,
          voice: childText(el, "voice") || "1",
          measureIndex,
          start,
          duration,
          midi:
            STEP_SEMITONES[childText(pitch, "step")] +
            childNum(pitch, "alter", 0) +
            (childNum(pitch, "octave", 4) + 1) * 12 +
            (octaveShift.get(staff) ?? 0) * 12,
          group,
          tieStart: ties.includes("start"),
          tieStop: ties.includes("stop"),
        });
      }
    }
    measureLengths[measureIndex] = Math.max(measureLengths[measureIndex] ?? 0, maxCursor);
  });

  return { id: part.getAttribute("id") ?? "", name, staves, notes };
}

/** Pick the notes of one staff's upper or lower line, deciding per measure between voices and chords. */
function lineOf(notes: RawNote[], slot: "upper" | "lower"): RawNote[] {
  const byMeasure = new Map<number, RawNote[]>();
  for (const n of notes) byMeasure.set(n.measureIndex, [...(byMeasure.get(n.measureIndex) ?? []), n]);

  const out: RawNote[] = [];
  for (const measureNotes of byMeasure.values()) {
    const voices = [...new Set(measureNotes.map((n) => n.voice))].sort((a, b) => Number(a) - Number(b));
    if (voices.length >= 2) {
      const voice = slot === "upper" ? voices[0] : voices[voices.length - 1];
      out.push(...measureNotes.filter((n) => n.voice === voice));
      continue;
    }
    const groups = new Map<number, RawNote[]>();
    for (const n of measureNotes) groups.set(n.group, [...(groups.get(n.group) ?? []), n]);
    for (const chord of groups.values()) {
      const sorted = [...chord].sort((a, b) => a.midi - b.midi);
      out.push(slot === "upper" ? sorted[sorted.length - 1] : sorted[0]);
    }
  }
  return out;
}

const absStart = (n: RawNote, offsets: number[]) => offsets[n.measureIndex] + n.start;

/** Join tied notes of the same pitch into one note. */
function mergeTies(line: RawNote[], offsets: number[]): RawNote[] {
  const sorted = [...line].sort((a, b) => absStart(a, offsets) - absStart(b, offsets));
  const out: RawNote[] = [];
  for (const n of sorted) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.tieStart &&
      n.tieStop &&
      prev.midi === n.midi &&
      Math.abs(absStart(prev, offsets) + prev.duration - absStart(n, offsets)) < 1e-6
    ) {
      out[out.length - 1] = { ...prev, duration: prev.duration + n.duration, tieStart: n.tieStart };
    } else {
      out.push(n);
    }
  }
  return out;
}

const sameLine = (a: RawNote[], b: RawNote[]) =>
  a.length === b.length && a.every((n, i) => n === b[i]);

function readMarks(part: Element): MeasureMarks[] {
  let endings: number[] | undefined;
  return Array.from(part.getElementsByTagName("measure")).map((measure, i) => {
    const marks: MeasureMarks = { number: i + 1 };
    for (const barline of Array.from(measure.getElementsByTagName("barline"))) {
      const repeat = barline.getElementsByTagName("repeat")[0]?.getAttribute("direction");
      if (repeat === "forward") marks.forward = true;
      if (repeat === "backward") marks.backward = true;
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

const SLOT_LABEL = { upper: "위", lower: "아래" } as const;

/** Parse a partwise MusicXML score into singable parts and note events. */
export function parseMusicXml(xml: string): ScoreModel {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length || !doc.getElementsByTagName("score-partwise").length) {
    throw new Error("MusicXML 악보를 읽을 수 없어요.");
  }

  const names = new Map(
    Array.from(doc.getElementsByTagName("score-part")).map((sp) => [sp.getAttribute("id") ?? "", childText(sp, "part-name")]),
  );
  const partEls = Array.from(doc.getElementsByTagName("part"));
  const measureLengths: number[] = [];
  const timelines = partEls.map((p) => readPart(p, names.get(p.getAttribute("id") ?? "") ?? "", measureLengths));

  const offsets: number[] = [];
  measureLengths.reduce((acc, len, i) => ((offsets[i] = acc), acc + len), 0);

  const parts: PartInfo[] = [];
  const lines = new Map<string, RawNote[]>();
  for (const tl of timelines) {
    for (let staff = 1; staff <= tl.staves; staff++) {
      const staffNotes = tl.notes.filter((n) => n.staff === staff);
      const upper = lineOf(staffNotes, "upper");
      const lower = lineOf(staffNotes, "lower");
      if (upper.length === 0) continue;
      if (sameLine(upper, lower)) {
        const id = tl.staves === 1 ? tl.id : `${tl.id}-s${staff}`;
        parts.push({ id, name: tl.name, sourcePartId: tl.id, staff, voiceSlot: "only" });
        lines.set(id, mergeTies(upper, offsets));
        continue;
      }
      for (const [slot, line] of [["upper", upper], ["lower", lower]] as const) {
        const id = `${tl.id}-s${staff}-${slot}`;
        const name = [tl.name, `${staff}단 ${SLOT_LABEL[slot]}`].filter(Boolean).join(" ");
        parts.push({ id, name, sourcePartId: tl.id, staff, voiceSlot: slot });
        lines.set(id, mergeTies(line, offsets));
      }
    }
  }

  const playOrder = partEls.length ? expandRepeats(readMarks(partEls[0])) : [];
  const notes: NoteEvent[] = [];
  let playedOffset = 0;
  for (const measureNo of playOrder) {
    const index = measureNo - 1;
    for (const part of parts) {
      for (const n of lines.get(part.id) ?? []) {
        if (n.measureIndex !== index) continue;
        notes.push({ partId: part.id, midi: n.midi, start: playedOffset + n.start, duration: n.duration, measure: measureNo });
      }
    }
    playedOffset += measureLengths[index] ?? 0;
  }
  notes.sort((a, b) => a.start - b.start);

  const tempoAttr = doc.querySelector("sound[tempo]")?.getAttribute("tempo");
  return {
    title: childText(doc.documentElement, "work-title") || childText(doc.documentElement, "movement-title"),
    parts,
    notes,
    tempo: tempoAttr ? Number(tempoAttr) : DEFAULT_TEMPO,
    keys: partEls.length ? readKeys(partEls[0]) : [],
    measureCount: measureLengths.length,
  };
}
