import type { ScoreFormat } from "./types";

export type DetectResult = { format: ScoreFormat } | { error: string };

const EXPORT_HINT = "악보 프로그램에서 MusicXML로 내보내 주세요.";

const EXTENSIONS: Record<string, ScoreFormat> = {
  musicxml: "musicxml",
  xml: "musicxml",
  mxl: "mxl",
  mscz: "musescore",
  mscx: "musescore",
  mid: "midi",
  midi: "midi",
  pdf: "pdf",
  png: "image",
  jpg: "image",
  jpeg: "image",
};

const PROPRIETARY: Record<string, string> = {
  sib: "Sibelius",
  musx: "Finale",
  mus: "Finale",
  nwc: "NoteWorthy Composer",
};

const startsWith = (head: Uint8Array, sig: number[]) => sig.every((b, i) => head[i] === b);

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const PDF = [0x25, 0x50, 0x44, 0x46];
const MIDI = [0x4d, 0x54, 0x68, 0x64];
const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];

function signatureMatches(format: ScoreFormat, ext: string, head: Uint8Array): boolean {
  const text = () => new TextDecoder().decode(head.slice(0, 512));
  switch (format) {
    case "mxl":
      return startsWith(head, ZIP);
    case "musescore":
      return ext === "mscz" ? startsWith(head, ZIP) : text().includes("<museScore");
    case "musicxml":
      return /<score-(partwise|timewise)/.test(text());
    case "midi":
      return startsWith(head, MIDI);
    case "pdf":
      return startsWith(head, PDF);
    case "image":
      return startsWith(head, PNG) || startsWith(head, JPEG);
  }
}

/** Decide which score format a file is, from its name and its first bytes (512 are enough). */
export function detectFormat(name: string, head: Uint8Array): DetectResult {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext in PROPRIETARY) {
    return { error: `${PROPRIETARY[ext]} 파일은 직접 읽을 수 없어요. ${EXPORT_HINT}` };
  }
  const format = EXTENSIONS[ext];
  if (!format) {
    return { error: `지원하지 않는 파일이에요(.${ext}). MusicXML, MuseScore, MIDI, PDF, 사진 파일을 올려 주세요.` };
  }
  if (!signatureMatches(format, ext, head)) {
    return { error: "파일 내용이 확장자와 맞지 않아요. 파일이 손상되었거나 다른 형식일 수 있어요." };
  }
  return { format };
}
