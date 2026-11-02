import { describe, expect, it } from "vitest";
import { findMarkings, GLOSSARY } from "@/score/glossary";

const wrap = (body: string) =>
  `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>S</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
const words = (t: string) => `<direction><direction-type><words>${t}</words></direction-type></direction>`;
const note = (notations = "") =>
  `<note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type>${notations}</note>`;

describe("glossary", () => {
  it("has about forty entries with short Korean explanations", () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(38);
    expect(new Set(GLOSSARY.map((e) => e.id)).size).toBe(GLOSSARY.length);
    expect(GLOSSARY.every((e) => e.meaning.length > 0 && !e.meaning.includes("\n"))).toBe(true);
  });

  it("finds the markings used in a score, in order, once each", () => {
    const xml = wrap(
      `<measure number="1">` +
        `<direction><direction-type><dynamics><mf/></dynamics></direction-type></direction>` +
        `<direction><direction-type><wedge type="crescendo"/></direction-type></direction>` +
        note("<notations><fermata/></notations>") +
        words("rit.") +
        words("gently") +
        `<direction><direction-type><dynamics><mf/></dynamics></direction-type></direction>` +
        `<barline location="right"><repeat direction="backward"/></barline>` +
        `</measure><measure number="2">` + words("Presto") + note() + `</measure>`,
    );
    expect(findMarkings(xml).map((e) => e.id)).toEqual(["mf", "crescendo", "fermata", "rit", "repeat", "presto"]);
  });

  it("reads several terms from one direction", () => {
    const xml = wrap(`<measure number="1">${words("molto rit.")}${words("D.C. al Fine")}</measure>`);
    expect(findMarkings(xml).map((e) => e.id)).toEqual(["molto", "rit", "dc", "fine"]);
  });

  it("does not mistake longer words for tempo terms", () => {
    const xml = wrap(`<measure number="1">${words("Allegretto")}${words("diminish")}</measure>`);
    expect(findMarkings(xml)).toEqual([]);
  });
});
