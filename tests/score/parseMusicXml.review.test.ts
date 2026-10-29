import { describe, expect, it } from "vitest";
import { parseMusicXml } from "@/score/parseMusicXml";
import type { ScoreModel } from "@/score/types";

// Minimal one-part score builder: each measure is raw MusicXML children.
const ATTRS = (extra = "") =>
  `<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>${extra}</attributes>`;
const n = (step: string, octave: number, dur: number, voice = 1, extra = "") =>
  `<note>${extra}<pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${dur}</duration><voice>${voice}</voice></note>`;
const rest = (dur: number, voice = 1) => `<note><rest/><duration>${dur}</duration><voice>${voice}</voice></note>`;
const back = (d: number) => `<backup><duration>${d}</duration></backup>`;
const xml = (name: string, measures: string[], abbr = "") =>
  `<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>${name}</part-name>${abbr}</score-part></part-list>` +
  `<part id="P1">${measures.map((m, i) => `<measure number="${i + 1}">${m}</measure>`).join("")}</part></score-partwise>`;
const pitches = (model: ScoreModel, partId: string, measure?: number) =>
  model.notes.filter((x) => x.partId === partId && (measure === undefined || x.measure === measure)).map((x) => x.midi);

describe("parseMusicXml review fixes", () => {
  it("treats pitch as sounding pitch even under an octave clef (MuseScore tenor export)", () => {
    const model = parseMusicXml(
      xml("Tenor", [ATTRS("<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>") + n("C", 4, 4)]),
    );
    expect(pitches(model, "P1")).toEqual([60]);
  });

  it("applies <transpose> to reach sounding pitch", () => {
    const model = parseMusicXml(
      xml("Tenor", [ATTRS("<transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose>") + n("C", 5, 4)]),
    );
    expect(pitches(model, "P1")).toEqual([60]);
  });

  it("keeps a voice silent when it rests for a whole measure", () => {
    const model = parseMusicXml(
      xml("", [
        ATTRS() + n("E", 5, 4, 1) + back(4) + n("C", 5, 4, 2),
        n("G", 5, 4, 1) + back(4) + rest(4, 2),
        rest(4, 1) + back(4) + n("A", 4, 4, 2),
      ]),
    );
    expect(pitches(model, "P1-s1-upper")).toEqual([76, 79]);
    expect(pitches(model, "P1-s1-lower")).toEqual([72, 69]);
  });

  it("gives each of three voices on one staff its own line", () => {
    const model = parseMusicXml(xml("", [ATTRS() + n("E", 5, 4, 1) + back(4) + n("C", 5, 4, 2) + back(4) + n("A", 4, 4, 3)]));
    expect(model.parts).toHaveLength(3);
    expect(model.parts.map((p) => pitches(model, p.id))).toEqual([[76], [72], [69]]);
  });

  it("splits a chord inside one voice into separate lines next to the other voice", () => {
    const chord = n("E", 5, 4, 1) + n("G", 5, 4, 1, "<chord/>");
    const model = parseMusicXml(xml("", [ATTRS() + chord + back(4) + n("C", 5, 4, 2)]));
    expect(model.parts.map((p) => pitches(model, p.id))).toEqual([[79], [76], [72]]);
  });

  it("does not play cue notes", () => {
    const model = parseMusicXml(xml("Alto", [ATTRS() + `<note><cue/><pitch><step>G</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>` + rest(1) + n("C", 5, 2)]));
    expect(pitches(model, "P1")).toEqual([72]);
  });

  it("does not hold a tied note into the second ending", () => {
    const tieStart = "<tie type=\"start\"/>";
    const model = parseMusicXml(
      xml("Melody", [
        ATTRS() + '<barline location="left"><repeat direction="forward"/></barline>' +
          `<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration>${tieStart}<voice>1</voice></note>`,
        '<barline location="left"><ending number="1" type="start"/></barline>' +
          `<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><tie type="stop"/><voice>1</voice></note>` +
          '<barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>',
        '<barline location="left"><ending number="2" type="start"/></barline>' + n("D", 5, 4) +
          '<barline location="right"><ending number="2" type="discontinue"/></barline>',
      ]),
    );
    const notes = model.notes.map((x) => [x.midi, x.start, x.duration]);
    expect(notes).toEqual([
      [72, 0, 8],
      [72, 8, 4],
      [74, 12, 4],
    ]);
  });

  it("merges ties between chord members in a voice-separated staff", () => {
    const tied = (step: string, oct: number, type: string, chord = false) =>
      `<note>${chord ? "<chord/>" : ""}<pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>4</duration><tie type="${type}"/><voice>1</voice></note>`;
    const model = parseMusicXml(
      xml("", [
        ATTRS() + tied("E", 5, "start") + tied("G", 5, "start", true) + back(4) + n("C", 5, 4, 2),
        tied("E", 5, "stop") + tied("G", 5, "stop", true) + back(4) + n("C", 5, 4, 2),
      ]),
    );
    expect(model.notes.filter((x) => x.midi === 79).map((x) => x.duration)).toEqual([8]);
    expect(model.notes.filter((x) => x.midi === 76).map((x) => x.duration)).toEqual([8]);
  });

  it("uses the part abbreviation when the part name is hidden", () => {
    const model = parseMusicXml(xml("", [ATTRS() + n("C", 5, 4)], "<part-abbreviation>S.</part-abbreviation>"));
    expect(model.parts[0].name).toBe("S.");
  });
});
