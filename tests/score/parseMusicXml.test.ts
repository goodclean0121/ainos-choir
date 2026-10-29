import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMusicXml } from "@/score/parseMusicXml";
import type { ScoreModel } from "@/score/types";

const load = (name: string) => parseMusicXml(readFileSync(`tests/fixtures/${name}`, "utf8"));
const notesOf = (model: ScoreModel, partId: string) => model.notes.filter((n) => n.partId === partId);
const pitches = (model: ScoreModel, partId: string, measure?: number) =>
  notesOf(model, partId)
    .filter((n) => measure === undefined || n.measure === measure)
    .map((n) => n.midi);

describe("parseMusicXml", () => {
  it("keeps four separate parts with their names", () => {
    const model = load("four-parts.musicxml");
    expect(model.title).toBe("Four Parts");
    expect(model.parts.map((p) => p.name)).toEqual(["Soprano", "Alto", "Tenor", "Bass"]);
    expect(model.parts.map((p) => p.voiceSlot)).toEqual(["only", "only", "only", "only"]);
    expect(pitches(model, "P1", 1)).toEqual([76, 74, 72, 74]);
    expect(pitches(model, "P4", 1)).toEqual([48, 43, 45, 43]);
  });

  it("plays a treble-8vb tenor an octave below the written pitch", () => {
    const model = load("four-parts.musicxml");
    expect(pitches(model, "P3", 1)[0]).toBe(60); // written C5
  });

  it("merges tied notes into one longer note", () => {
    const model = load("four-parts.musicxml");
    const m2 = notesOf(model, "P1").filter((n) => n.measure === 2);
    expect(m2.map((n) => [n.midi, n.start, n.duration])).toEqual([
      [76, 4, 2],
      [76, 6, 1],
    ]);
  });

  it("reads tempo and key", () => {
    const model = load("four-parts.musicxml");
    expect(model.tempo).toBe(90);
    expect(model.keys).toEqual([{ measure: 1, fifths: -1, mode: "major" }]);
    expect(model.measureCount).toBe(2);
  });

  it("defaults tempo to 100 when the score has none", () => {
    expect(load("repeats.musicxml").tempo).toBe(100);
  });

  it("splits one part with two staves and voices into four singing parts", () => {
    const model = load("two-staves-voices.musicxml");
    expect(model.parts.map((p) => p.id)).toEqual(["P1-s1-upper", "P1-s1-lower", "P1-s2-upper", "P1-s2-lower"]);
    expect(pitches(model, "P1-s1-upper")).toEqual([67, 69, 71, 72]);
    expect(pitches(model, "P1-s1-lower")).toEqual([64, 65, 67, 64]);
    expect(pitches(model, "P1-s2-upper")).toEqual([60, 60, 62, 60]);
    expect(pitches(model, "P1-s2-lower")).toEqual([48, 41, 43, 48]);
    expect(notesOf(model, "P1-s1-lower").map((n) => n.start)).toEqual([0, 1, 2, 3]);
  });

  it("splits chords into upper and lower voices, sharing a unison note", () => {
    const model = load("chords.musicxml");
    expect(model.parts).toHaveLength(4);
    expect(pitches(model, "P1-s1-upper")).toEqual([72, 74, 67, 72]);
    expect(pitches(model, "P1-s1-lower")).toEqual([64, 65, 67, 64]);
    expect(pitches(model, "P1-s2-upper")).toEqual([55, 53, 55, 55]);
    expect(pitches(model, "P1-s2-lower")).toEqual([48, 45, 47, 48]);
  });

  it("splits each measure by its own notation when chords and voices are mixed", () => {
    const model = load("mixed.musicxml");
    expect(pitches(model, "P1-s1-upper", 1)).toEqual([72, 74, 67, 72]);
    expect(pitches(model, "P1-s1-upper", 2)).toEqual([69, 69, 67, 67]);
    expect(pitches(model, "P1-s1-lower", 2)).toEqual([65, 65, 64, 64]);
    expect(pitches(model, "P1-s2-lower", 2)).toEqual([41, 41, 48, 48]);
    expect(notesOf(model, "P1-s1-upper").find((n) => n.measure === 2)?.start).toBe(4);
  });

  it("keeps six parts and leaves a resting part silent", () => {
    const model = load("six-parts.musicxml");
    expect(model.parts.map((p) => p.name)).toEqual(["Soprano 1", "Soprano 2", "Alto", "Tenor 1", "Tenor 2", "Bass"]);
    expect(pitches(model, "P3", 3)).toEqual([]);
    expect(pitches(model, "P4", 1)).toEqual([60]);
  });

  it("lays notes out in repeat play order", () => {
    const model = load("repeats.musicxml");
    const notes = notesOf(model, "P1");
    expect(notes.map((n) => n.measure)).toEqual([1, 2, 3, 1, 2, 4]);
    expect(notes.map((n) => n.start)).toEqual([0, 4, 8, 12, 16, 20]);
    expect(model.measureCount).toBe(4);
  });
});
