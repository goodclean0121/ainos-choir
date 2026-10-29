import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMusicXml } from "@/score/parseMusicXml";
import { assignRoles } from "@/score/roles";
import type { PartInfo } from "@/score/types";

const part = (id: string, name: string): PartInfo => ({ id, name, sourcePartId: id, staff: 1, voiceSlot: "only" });
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
});
