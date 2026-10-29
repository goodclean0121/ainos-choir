import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMusicXml } from "@/score/parseMusicXml";
import { assignRoles } from "@/score/roles";
import type { PartInfo } from "@/score/types";

const part = (id: string, name: string): PartInfo => ({ id, name, sourceName: name, sourcePartId: id, staff: 1, voiceSlot: "only", line: 0, lineCount: 1 });
const load = (name: string) => parseMusicXml(readFileSync(`tests/fixtures/${name}`, "utf8"));

describe("assignRoles", () => {
  it("reads roles from English and Korean part names", () => {
    const parts = [
      part("a", "Soprano 1"),
      part("b", "소프라노"),
      part("c", "Alto"),
      part("d", "알토"),
      part("e", "Tenor 2"),
      part("f", "T 2"),
      part("g", "Bass"),
      part("h", "베이스"),
      part("i", "S1"),
      part("j", "Baritone"),
    ];
    expect(assignRoles(parts)).toEqual({ a: "S1", b: "S", c: "A", d: "A", e: "T2", f: "T2", g: "B", h: "B", i: "S1", j: "B" });
  });

  it("labels the six-part test song", () => {
    const model = load("six-parts.musicxml");
    expect(Object.values(assignRoles(model.parts))).toEqual(["S1", "S2", "A", "T1", "T2", "B"]);
  });

  it("labels four unnamed lines top to bottom as S A T B", () => {
    const model = load("two-staves-voices.musicxml");
    expect(Object.values(assignRoles(model.parts))).toEqual(["S", "A", "T", "B"]);
  });

  it("leaves unnamed lines for the admin to label when there are not exactly four", () => {
    const parts = [part("a", ""), part("b", ""), part("c", "")];
    expect(assignRoles(parts)).toEqual({ a: "?", b: "?", c: "?" });
  });

  it("reads Roman numerals and dotted abbreviations", () => {
    const parts = [part("a", "Soprano I"), part("b", "Soprano II"), part("c", "S."), part("d", "A."), part("e", "T. 1"), part("f", "B. 2")];
    expect(assignRoles(parts)).toEqual({ a: "S1", b: "S2", c: "S", d: "A", e: "T1", f: "B2" });
  });

  it("gives each line of a shared staff the role its part name lists", () => {
    const line = (id: string, sourceName: string, i: number, count = 2): PartInfo => ({
      id,
      name: `${sourceName} ${i}`,
      sourceName,
      sourcePartId: sourceName,
      staff: 1,
      voiceSlot: i === 0 ? "upper" : "lower",
      line: i,
      lineCount: count,
    });
    const parts = [line("sa1", "Soprano Alto", 0), line("sa2", "Soprano Alto", 1), line("tb1", "TB", 0), line("tb2", "TB", 1), line("s1", "Soprano", 0), line("s2", "Soprano", 1)];
    expect(assignRoles(parts)).toEqual({ sa1: "S", sa2: "A", tb1: "T", tb2: "B", s1: "S1", s2: "S2" });
  });
});
