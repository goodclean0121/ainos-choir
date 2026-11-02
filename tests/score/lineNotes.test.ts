import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMusicXml } from "@/score/parseMusicXml";

const load = (name: string) => parseMusicXml(readFileSync(`tests/fixtures/${name}`, "utf8"));
const noteEls = (name: string) =>
  Array.from(new DOMParser().parseFromString(readFileSync(`tests/fixtures/${name}`, "utf8"), "application/xml").getElementsByTagName("note"));

describe("lineNotes and timeline", () => {
  it("lists the <note> elements that make up each line, in document order", () => {
    const model = load("four-parts.musicxml");
    const p1 = model.lineNotes.P1;
    expect(p1[0]).toBe(0);
    // m1: 4 notes, m2: 3 pitched (tied pair counts as two elements) + rest
    expect(p1).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const els = noteEls("four-parts.musicxml");
    expect(model.lineNotes.P2.every((i) => els[i].closest("part")?.getAttribute("id") === "P2")).toBe(true);
  });

  it("points a chord line at its own chord member", () => {
    const model = load("chords.musicxml");
    const els = noteEls("chords.musicxml");
    const first = els[model.lineNotes["P1-s1-upper"][0]];
    expect(first.getElementsByTagName("step")[0].textContent).toBe("C");
    const lowFirst = els[model.lineNotes["P1-s1-lower"][0]];
    expect(lowFirst.getElementsByTagName("step")[0].textContent).toBe("E");
  });

  it("gives the played timeline of measures", () => {
    const model = load("repeats.musicxml");
    expect(model.timeline.map((t) => t.measure)).toEqual([1, 2, 3, 1, 2, 4]);
    expect(model.timeline.map((t) => t.start)).toEqual([0, 4, 8, 12, 16, 20]);
    expect(model.timeline.every((t) => t.length === 4)).toBe(true);
  });
});
