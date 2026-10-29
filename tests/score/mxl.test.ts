import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unzipMxl } from "@/score/mxl";

const fixture = (name: string) => {
  const buf = readFileSync(`tests/fixtures/${name}`);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

describe("unzipMxl", () => {
  it("reads the root file named in META-INF/container.xml", async () => {
    const xml = await unzipMxl(fixture("four-parts.mxl"));
    expect(xml).toContain("<score-partwise");
    for (const id of ["P1", "P2", "P3", "P4"]) expect(xml).toContain(`<part id="${id}">`);
  });

  it("falls back to the first MusicXML file when there is no container", async () => {
    const xml = await unzipMxl(fixture("no-container.mxl"));
    expect(xml).toContain("<score-partwise");
  });

  it("explains when the archive holds no score", async () => {
    await expect(unzipMxl(fixture("empty.mxl"))).rejects.toThrow("압축 파일 안에 악보가 없어요");
  });
});
