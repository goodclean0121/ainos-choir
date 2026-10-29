import { describe, expect, it } from "vitest";
import { detectFormat } from "@/score/detectFormat";

const bytes = (s: string) => new TextEncoder().encode(s);
const ZIP = "PK\x03\x04rest-of-zip";

describe("detectFormat", () => {
  it("recognises compressed MusicXML with Korean name and upper-case extension", () => {
    expect(detectFormat("곡 이름.MXL", bytes(ZIP))).toEqual({ format: "mxl" });
  });

  it("recognises MuseScore files", () => {
    expect(detectFormat("song.mscz", bytes(ZIP))).toEqual({ format: "musescore" });
    expect(detectFormat("song.mscx", bytes('<?xml version="1.0"?><museScore version="3.02">'))).toEqual({ format: "musescore" });
  });

  it("accepts .xml only when it is a MusicXML score", () => {
    expect(detectFormat("a.xml", bytes('<?xml version="1.0"?><score-partwise version="3.1">'))).toEqual({ format: "musicxml" });
    expect(detectFormat("a.musicxml", bytes('<?xml version="1.0"?>\n<!DOCTYPE x>\n<score-timewise>'))).toEqual({ format: "musicxml" });
    const result = detectFormat("a.xml", bytes('<?xml version="1.0"?><html>'));
    expect(result).toHaveProperty("error");
  });

  it("recognises PDF, images and MIDI by extension and signature", () => {
    expect(detectFormat("score.pdf", bytes("%PDF-1.7"))).toEqual({ format: "pdf" });
    expect(detectFormat("photo.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toEqual({ format: "image" });
    expect(detectFormat("photo.JPEG", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toEqual({ format: "image" });
    expect(detectFormat("scan.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toEqual({ format: "image" });
    expect(detectFormat("song.mid", bytes("MThd\0\0\0\x06"))).toEqual({ format: "midi" });
  });

  it("rejects proprietary notation formats with export guidance", () => {
    for (const name of ["a.sib", "a.musx", "a.mus", "a.nwc"]) {
      const result = detectFormat(name, bytes("whatever"));
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("MusicXML로 내보내");
    }
  });

  it("rejects a file whose content does not match its extension", () => {
    expect(detectFormat("score.pdf", bytes(ZIP))).toHaveProperty("error");
    expect(detectFormat("song.mxl", bytes("%PDF"))).toHaveProperty("error");
  });

  it("rejects unknown extensions", () => {
    expect(detectFormat("notes.txt", bytes("hello"))).toHaveProperty("error");
  });
});
