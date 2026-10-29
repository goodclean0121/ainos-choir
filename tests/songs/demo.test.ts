import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMusicXml } from "@/score/parseMusicXml";
import { assignRoles } from "@/score/roles";
import { findMarkings } from "@/score/glossary";

describe("the bundled practice example", () => {
  const index = JSON.parse(readFileSync("public/songs/index.json", "utf8"));
  const xml = readFileSync(`public/songs/${index[0].file}`, "utf8");

  it("parses into four named parts", () => {
    const model = parseMusicXml(xml);
    expect(Object.values(assignRoles(model.parts))).toEqual(["S", "A", "T", "B"]);
    expect(model.measureCount).toBe(4);
    expect(model.tempo).toBe(80);
  });

  it("uses a few markings from the glossary", () => {
    expect(findMarkings(xml).map((e) => e.id)).toEqual(["andante", "mp", "crescendo", "rit", "fermata"]);
  });
});
