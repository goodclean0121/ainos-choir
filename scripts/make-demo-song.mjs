// Writes the practice example song (not a real hymn) to public/songs/.
// Run: node scripts/make-demo-song.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "songs");

// G major, 4/4, half-note chords: I IV | V I | vi ii | V I(fermata).
const CHORDS = [
  ["B4", "G4", "D4", "G3"], ["C5", "G4", "E4", "C3"],
  ["A4", "F#4", "D4", "D3"], ["B4", "G4", "D4", "G2"],
  ["B4", "G4", "E4", "E3"], ["C5", "E4", "A3", "A2"],
  ["A4", "F#4", "D4", "D3"], ["G4", "D4", "B3", "G2"],
];
const PARTS = [
  { id: "P1", name: "Soprano", clef: "<sign>G</sign><line>2</line>" },
  { id: "P2", name: "Alto", clef: "<sign>G</sign><line>2</line>" },
  { id: "P3", name: "Tenor", clef: "<sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change>" },
  { id: "P4", name: "Bass", clef: "<sign>F</sign><line>4</line>" },
];

function pitch(p) {
  const [, step, acc, octave] = p.match(/^([A-G])(#|b)?(\d)$/);
  const alter = acc === "#" ? "<alter>1</alter>" : acc === "b" ? "<alter>-1</alter>" : "";
  return `<pitch><step>${step}</step>${alter}<octave>${octave}</octave></pitch>`;
}
const half = (p, notations = "") =>
  `<note>${pitch(p)}<duration>2</duration><voice>1</voice><type>half</type>${notations}</note>`;
const direction = (inner, placement = "below") =>
  `<direction placement="${placement}"><direction-type>${inner}</direction-type></direction>`;

const parts = PARTS.map((part, v) => {
  const measures = [];
  for (let m = 0; m < 4; m++) {
    let body = "";
    if (m === 0) {
      body +=
        `<attributes><divisions>1</divisions><key><fifths>1</fifths><mode>major</mode></key>` +
        `<time><beats>4</beats><beat-type>4</beat-type></time><clef>${part.clef}</clef></attributes>`;
      if (v === 0) body += direction("<words>Andante</words>", "above") + '<sound tempo="80"/>';
      body += direction("<dynamics><mp/></dynamics>");
    }
    if (m === 2) body += direction('<wedge type="crescendo"/>');
    if (m === 3) body += direction('<wedge type="stop"/>') + (v === 0 ? direction("<words>rit.</words>", "above") : "");
    const last = m === 3;
    body += half(CHORDS[m * 2][v]) + half(CHORDS[m * 2 + 1][v], last ? "<notations><fermata/></notations>" : "");
    if (last) body += '<barline location="right"><bar-style>light-heavy</bar-style></barline>';
    measures.push(`<measure number="${m + 1}">${body}</measure>`);
  }
  return `<part id="${part.id}">${measures.join("")}</part>`;
});

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n` +
  `<score-partwise version="3.1"><work><work-title>연습용 예제</work-title></work><part-list>` +
  PARTS.map((p) => `<score-part id="${p.id}"><part-name>${p.name}</part-name></score-part>`).join("") +
  `</part-list>\n${parts.join("\n")}\n</score-partwise>\n`;

writeFileSync(join(out, "practice-example.musicxml"), xml);
writeFileSync(
  join(out, "index.json"),
  JSON.stringify([{ id: "practice-example", title: "연습용 예제 (4성부 화음 연습)", file: "practice-example.musicxml" }], null, 2) + "\n",
);
console.log("demo song written");
