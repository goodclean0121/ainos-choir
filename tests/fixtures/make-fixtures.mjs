// Generates the small hand-designed MusicXML fixtures used by the unit and e2e tests.
// Run: node tests/fixtures/make-fixtures.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const dir = dirname(fileURLToPath(import.meta.url));

const STEP_RE = /^([A-G])(#|b)?(\d)$/;

// note("E5", 1) / note("r", 4) / note("C5", 1, { chord: true, tie: "start" })
function note(pitch, duration, opts = {}) {
  const { chord, tie, voice = 1, staff, type } = opts;
  const parts = ["<note>"];
  if (chord) parts.push("<chord/>");
  if (pitch === "r") {
    parts.push(duration === 4 && opts.measureRest ? '<rest measure="yes"/>' : "<rest/>");
  } else {
    const [, step, acc, octave] = pitch.match(STEP_RE);
    const alter = acc === "#" ? "<alter>1</alter>" : acc === "b" ? "<alter>-1</alter>" : "";
    parts.push(`<pitch><step>${step}</step>${alter}<octave>${octave}</octave></pitch>`);
  }
  parts.push(`<duration>${duration}</duration>`);
  if (tie === "start" || tie === "both") parts.push('<tie type="start"/>');
  if (tie === "stop" || tie === "both") parts.push('<tie type="stop"/>');
  parts.push(`<voice>${voice}</voice>`);
  parts.push(`<type>${type ?? { 1: "quarter", 2: "half", 4: "whole" }[duration]}</type>`);
  if (staff) parts.push(`<staff>${staff}</staff>`);
  parts.push("</note>");
  return parts.join("");
}

const backup = (d) => `<backup><duration>${d}</duration></backup>`;

function attributes({ fifths = 0, mode = "major", clefs = [["G", 2]], octaveChange, staves } = {}) {
  const clefXml = clefs
    .map(([sign, line], i) => {
      const num = clefs.length > 1 ? ` number="${i + 1}"` : "";
      const oct = octaveChange ? `<clef-octave-change>${octaveChange}</clef-octave-change>` : "";
      return `<clef${num}><sign>${sign}</sign><line>${line}</line>${oct}</clef>`;
    })
    .join("");
  return (
    `<attributes><divisions>1</divisions><key><fifths>${fifths}</fifths><mode>${mode}</mode></key>` +
    `<time><beats>4</beats><beat-type>4</beat-type></time>` +
    (staves ? `<staves>${staves}</staves>` : "") +
    clefXml +
    `</attributes>`
  );
}

function score(title, parts) {
  const list = parts
    .map((p) => `<score-part id="${p.id}"><part-name>${p.name}</part-name></score-part>`)
    .join("");
  const body = parts
    .map(
      (p) =>
        `<part id="${p.id}">` +
        p.measures.map((m, i) => `<measure number="${i + 1}">${m}</measure>`).join("") +
        `</part>`,
    )
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n` +
    `<score-partwise version="3.1"><work><work-title>${title}</work-title></work>` +
    `<part-list>${list}</part-list>\n${body}\n</score-partwise>\n`
  );
}

const q = (...pitches) => pitches.map((p) => note(p, 1)).join("");

// 1. Four separate parts, F major, tempo 90, tenor in treble-8vb, soprano tie in m2.
// Pitches are sounding pitches: MusicXML octave clefs change only the drawing (as MuseScore exports them).
const fourParts = score("Four Parts", [
  {
    id: "P1",
    name: "Soprano",
    measures: [
      attributes({ fifths: -1 }) + '<direction><sound tempo="90"/></direction>' + q("E5", "D5", "C5", "D5"),
      note("E5", 1, { tie: "start" }) + note("E5", 1, { tie: "stop" }) + note("E5", 1) + note("r", 1),
    ],
  },
  { id: "P2", name: "Alto", measures: [attributes({ fifths: -1 }) + q("C5", "B4", "A4", "B4"), q("C5", "C5", "C5") + note("r", 1)] },
  {
    id: "P3",
    name: "Tenor",
    measures: [
      attributes({ fifths: -1, octaveChange: -1 }) + q("C4", "G3", "E3", "G3"),
      q("G3", "G3", "G3") + note("r", 1),
    ],
  },
  { id: "P4", name: "Bass", measures: [attributes({ fifths: -1, clefs: [["F", 4]] }) + q("C3", "G2", "A2", "G2"), q("C3", "C3", "C3") + note("r", 1)] },
]);

// 2. One part, two staves, voices 1/2 on staff 1 and 5/6 on staff 2.
const staffVoices = (v1, v2, v5, v6) =>
  v1.map((p) => note(p, 1, { voice: 1, staff: 1 })).join("") +
  backup(4) +
  v2.map((p) => note(p, 1, { voice: 2, staff: 1 })).join("") +
  backup(4) +
  v5.map((p) => note(p, 1, { voice: 5, staff: 2 })).join("") +
  backup(4) +
  v6.map((p) => note(p, 1, { voice: 6, staff: 2 })).join("");

const twoStaffAttrs = attributes({ staves: 2, clefs: [["G", 2], ["F", 4]] });

const twoStavesVoices = score("Two Staves", [
  {
    id: "P1",
    name: "",
    measures: [twoStaffAttrs + staffVoices(["G4", "A4", "B4", "C5"], ["E4", "F4", "G4", "E4"], ["C4", "C4", "D4", "C4"], ["C3", "F2", "G2", "C3"])],
  },
]);

// 3. Chord style: each staff holds two notes per stem; beat 3 is a unison (single note).
// Chord members are deliberately written in mixed order (high first / low first).
const chordStaff = (chords, staff, voice) =>
  chords
    .map((c) => c.map((p, i) => note(p, 1, { chord: i > 0, staff, voice })).join(""))
    .join("");

const chordMeasure =
  chordStaff([["E4", "C5"], ["D5", "F4"], ["G4"], ["E4", "C5"]], 1, 1) +
  backup(4) +
  chordStaff([["C3", "G3"], ["F3", "A2"], ["B2", "G3"], ["C3", "G3"]], 2, 5);

const chords = score("Chords", [{ id: "P1", name: "", measures: [twoStaffAttrs + chordMeasure] }]);

// 4. Mixed: m1 chords, m2 voices.
const mixed = score("Mixed", [
  {
    id: "P1",
    name: "",
    measures: [twoStaffAttrs + chordMeasure, staffVoices(["A4", "A4", "G4", "G4"], ["F4", "F4", "E4", "E4"], ["C4", "C4", "C4", "C4"], ["F2", "F2", "C3", "C3"])],
  },
]);

// 5. Six parts like the test song; Alto rests through m3.
const whole = (p) => note(p, 4);
const sixParts = score("Six Parts", [
  { id: "P1", name: "Soprano 1", measures: [attributes({ fifths: -1 }) + whole("C5"), whole("D5"), whole("E5")] },
  { id: "P2", name: "Soprano 2", measures: [attributes({ fifths: -1 }) + whole("A4"), whole("B4"), whole("C5")] },
  { id: "P3", name: "Alto", measures: [attributes({ fifths: -1 }) + whole("F4"), whole("G4"), note("r", 4, { measureRest: true })] },
  { id: "P4", name: "Tenor 1", measures: [attributes({ fifths: -1, octaveChange: -1 }) + whole("C4"), whole("D4"), whole("E4")] },
  { id: "P5", name: "Tenor 2", measures: [attributes({ fifths: -1, octaveChange: -1 }) + whole("A3"), whole("B3"), whole("C4")] },
  { id: "P6", name: "Bass", measures: [attributes({ fifths: -1, clefs: [["F", 4]] }) + whole("F3"), whole("G3"), whole("C3")] },
]);

// 6. Repeats: |: m1 m2 [1. m3 :|] [2. m4]  → play order 1 2 3 1 2 4.
const repeats = score("Repeats", [
  {
    id: "P1",
    name: "Melody",
    measures: [
      attributes() + '<barline location="left"><repeat direction="forward"/></barline>' + whole("C4"),
      whole("D4"),
      '<barline location="left"><ending number="1" type="start"/></barline>' +
        whole("E4") +
        '<barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>',
      '<barline location="left"><ending number="2" type="start"/></barline>' +
        whole("F4") +
        '<barline location="right"><ending number="2" type="discontinue"/></barline>',
    ],
  },
]);

const files = {
  "four-parts.musicxml": fourParts,
  "two-staves-voices.musicxml": twoStavesVoices,
  "chords.musicxml": chords,
  "mixed.musicxml": mixed,
  "six-parts.musicxml": sixParts,
  "repeats.musicxml": repeats,
};
for (const [name, xml] of Object.entries(files)) writeFileSync(join(dir, name), xml);

const zip = new JSZip();
zip.file(
  "META-INF/container.xml",
  '<?xml version="1.0" encoding="UTF-8"?><container><rootfiles><rootfile full-path="score/four-parts.musicxml"/></rootfiles></container>',
);
zip.file("score/four-parts.musicxml", fourParts);
writeFileSync(join(dir, "four-parts.mxl"), await zip.generateAsync({ type: "nodebuffer" }));

const bare = new JSZip();
bare.file("song.musicxml", fourParts);
writeFileSync(join(dir, "no-container.mxl"), await bare.generateAsync({ type: "nodebuffer" }));

const empty = new JSZip();
empty.file("readme.txt", "no score here");
writeFileSync(join(dir, "empty.mxl"), await empty.generateAsync({ type: "nodebuffer" }));

console.log("fixtures written");
