import { solfege as solfegeName } from "./solfege";

export interface DecorateOptions {
  notes: number[]; // <note> document-order indices of my line
  solfege: boolean;
  dimColor?: string;
}

const DEFAULT_DIM = "#a9b4b9";
// MusicXML <note> child order: a new <notehead> goes before these, a new <lyric> before the last two.
const AFTER_NOTEHEAD = ["notehead-text", "staff", "beam", "notations", "lyric", "play", "listen"];
const AFTER_LYRIC = ["play", "listen"];

const child = (el: Element, name: string) =>
  Array.from(el.children).find((c) => c.tagName === name) ?? null;

function insertBefore(note: Element, el: Element, followers: string[]) {
  const next = Array.from(note.children).find((c) => followers.includes(c.tagName));
  note.insertBefore(el, next ?? null);
}

function dim(note: Element, color: string, stemToo: boolean) {
  const doc = note.ownerDocument;
  let head = child(note, "notehead");
  if (!head) {
    head = doc.createElement("notehead");
    head.textContent = "normal";
    insertBefore(note, head, AFTER_NOTEHEAD);
  }
  head.setAttribute("color", color);
  // <note color> also greys the stem; skip it when the stem is shared with one of my notes.
  if (stemToo) note.setAttribute("color", color);
}

function addSolfege(note: Element, fifths: number) {
  const pitch = child(note, "pitch");
  if (!pitch) return;
  const ties = Array.from(note.children).filter((c) => c.tagName === "tie").map((t) => t.getAttribute("type"));
  if (ties.includes("stop") && !ties.includes("start")) return;
  const step = child(pitch, "step")?.textContent?.trim() ?? "";
  const alter = Math.round(Number(child(pitch, "alter")?.textContent ?? 0));
  const doc = note.ownerDocument;
  const lyric = doc.createElement("lyric");
  lyric.setAttribute("number", "solfege");
  const syllabic = doc.createElement("syllabic");
  syllabic.textContent = "single";
  const text = doc.createElement("text");
  text.textContent = solfegeName(step, alter, fifths);
  lyric.append(syllabic, text);
  insertBefore(note, lyric, AFTER_LYRIC);
}

/** Greys every note outside my line and, optionally, writes movable-do names under my notes. */
export function decorateScore(xml: string, opts: DecorateOptions): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const mine = new Set(opts.notes);
  const color = opts.dimColor ?? DEFAULT_DIM;
  let index = 0;

  for (const part of Array.from(doc.getElementsByTagName("part"))) {
    let fifths = 0;
    for (const measure of Array.from(part.children).filter((c) => c.tagName === "measure")) {
      // Collect chord groups (notes sharing a stem) in order, tracking the key as it changes.
      const groups: { note: Element; index: number; fifths: number }[][] = [];
      for (const el of Array.from(measure.children)) {
        if (el.tagName === "attributes") {
          const f = el.getElementsByTagName("fifths")[0]?.textContent;
          if (f != null && f.trim() !== "") fifths = Number(f);
        } else if (el.tagName === "note") {
          const entry = { note: el, index: index++, fifths };
          if (child(el, "chord") && groups.length) groups[groups.length - 1].push(entry);
          else groups.push([entry]);
        }
      }
      for (const group of groups) {
        const shared = group.some((e) => mine.has(e.index));
        for (const e of group) {
          if (child(e.note, "rest")) continue;
          if (mine.has(e.index)) {
            if (opts.solfege) addSolfege(e.note, e.fifths);
          } else {
            dim(e.note, color, !shared);
          }
        }
      }
    }
  }
  return new XMLSerializer().serializeToString(doc);
}
