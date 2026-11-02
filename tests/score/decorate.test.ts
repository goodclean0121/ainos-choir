import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decorateScore } from "@/score/decorate";
import { parseMusicXml } from "@/score/parseMusicXml";

const read = (name: string) => readFileSync(`tests/fixtures/${name}`, "utf8");
const notesOf = (xml: string) =>
  Array.from(new DOMParser().parseFromString(xml, "application/xml").getElementsByTagName("note"));
const partOf = (el: Element) => el.closest("part")?.getAttribute("id");
const isRest = (el: Element) => el.getElementsByTagName("rest").length > 0;
const headColor = (el: Element) => el.getElementsByTagName("notehead")[0]?.getAttribute("color") ?? null;
const solfegeText = (el: Element) =>
  Array.from(el.getElementsByTagName("lyric")).find((l) => l.getAttribute("number") === "solfege")
    ?.getElementsByTagName("text")[0]?.textContent ?? null;

describe("decorateScore", () => {
  it("dims every note outside my line and leaves mine alone", () => {
    const xml = read("four-parts.musicxml");
    const model = parseMusicXml(xml);
    const out = notesOf(decorateScore(xml, { notes: model.lineNotes.P1, solfege: false }));
    const pitched = out.filter((n) => !isRest(n));
    expect(pitched.filter((n) => partOf(n) !== "P1").every((n) => headColor(n) !== null)).toBe(true);
    expect(pitched.filter((n) => partOf(n) === "P1").every((n) => headColor(n) === null)).toBe(true);
    expect(out.every((n) => solfegeText(n) === null)).toBe(true);
  });

  it("adds movable-do names to my notes only", () => {
    const xml = read("four-parts.musicxml");
    const model = parseMusicXml(xml);
    const out = notesOf(decorateScore(xml, { notes: model.lineNotes.P1, solfege: true }));
    const p1 = out.filter((n) => partOf(n) === "P1" && !isRest(n));
    // F major: E5 D5 C5 D5 → 시 라 솔 라
    expect(p1.slice(0, 4).map(solfegeText)).toEqual(["시", "라", "솔", "라"]);
    expect(out.filter((n) => partOf(n) === "P2").every((n) => solfegeText(n) === null)).toBe(true);
  });

  it("does not repeat the name on the second half of a tie", () => {
    const xml = read("four-parts.musicxml");
    const model = parseMusicXml(xml);
    const out = notesOf(decorateScore(xml, { notes: model.lineNotes.P1, solfege: true }));
    const p1 = out.filter((n) => partOf(n) === "P1" && !isRest(n));
    expect(p1.slice(4).map(solfegeText)).toEqual(["시", null, "시"]);
  });

  it("separates chord members that share a stem", () => {
    const xml = read("chords.musicxml");
    const model = parseMusicXml(xml);
    const out = notesOf(decorateScore(xml, { notes: model.lineNotes["P1-s1-upper"], solfege: true }));
    // first chord is written E4 then C5; the upper line is C5
    expect(headColor(out[0])).not.toBeNull();
    expect(solfegeText(out[0])).toBeNull();
    expect(headColor(out[1])).toBeNull();
    expect(solfegeText(out[1])).toBe("도");
    // a dimmed chord member must not grey the shared stem
    expect(out[0].getAttribute("color")).toBeNull();
  });

  it("leaves rests untouched and keeps existing lyrics", () => {
    const xml = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>S</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key></attributes>
<note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type><lyric number="1"><text>주</text></lyric></note>
<note><rest/><duration>2</duration><type>half</type></note></measure></part></score-partwise>`;
    const mine = notesOf(decorateScore(xml, { notes: [0], solfege: true }));
    expect(Array.from(mine[0].getElementsByTagName("lyric")).map((l) => l.getElementsByTagName("text")[0].textContent)).toEqual(["주", "솔"]);
    expect(mine[1].outerHTML).toBe("<note><rest/><duration>2</duration><type>half</type></note>");
    const dim = notesOf(decorateScore(xml, { notes: [], solfege: true }));
    expect(dim[1].outerHTML).toBe("<note><rest/><duration>2</duration><type>half</type></note>");
  });

  it("starts a new do from the measure where the key changes", () => {
    const xml = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>S</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key></attributes>
<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note></measure>
<measure number="2"><attributes><key><fifths>1</fifths></key></attributes>
<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note></measure>
<measure number="3"><note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure></part></score-partwise>`;
    const out = notesOf(decorateScore(xml, { notes: [0, 1, 2], solfege: true }));
    expect(out.map(solfegeText)).toEqual(["도", "파", "도"]);
  });

  it("uses the given dim colour", () => {
    const xml = read("four-parts.musicxml");
    const out = notesOf(decorateScore(xml, { notes: [], solfege: false, dimColor: "#123456" }));
    expect(headColor(out[0])).toBe("#123456");
  });
});
