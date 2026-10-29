import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { importScore, EXPERIMENTAL_WARNING } from "@/score/importScore";

const fixtureFile = (name: string, as = name) => new File([readFileSync(`tests/fixtures/${name}`)], as);
const pdfFile = () => new File(["%PDF-1.7 scanned"], "악보.pdf");

describe("importScore", () => {
  it("reads MusicXML in the browser without the converter", async () => {
    const fetch = vi.fn();
    const result = await importScore(fixtureFile("six-parts.musicxml"), { fetch });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.format).toBe("musicxml");
    expect(result.model.parts).toHaveLength(6);
    expect(Object.values(result.roles)).toEqual(["S1", "S2", "A", "T1", "T2", "B"]);
    expect(result.warnings).toEqual([]);
  });

  it("reads compressed MusicXML in the browser", async () => {
    const fetch = vi.fn();
    const result = await importScore(fixtureFile("four-parts.mxl"), { fetch });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.format).toBe("mxl");
    expect(result.xml).toContain("<score-partwise");
    expect(result.model.parts).toHaveLength(4);
  });

  it("sends a PDF to the converter and warns that recognition may be wrong", async () => {
    const xml = readFileSync("tests/fixtures/four-parts.musicxml");
    const fetch = vi.fn().mockResolvedValue(new Response(xml, { status: 200, headers: { "x-experimental": "1" } }));
    const result = await importScore(pdfFile(), { converterUrl: "http://conv", fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://conv/convert");
    expect(init.method).toBe("POST");
    expect(init.headers["x-filename"]).toBe(encodeURIComponent("악보.pdf"));
    expect(result.format).toBe("pdf");
    expect(result.warnings).toContain(EXPERIMENTAL_WARNING);
    expect(EXPERIMENTAL_WARNING).toBe("자동 인식 결과라 틀린 음이 있을 수 있어요. 꼭 들어보고 확인하세요.");
    expect(result.model.parts).toHaveLength(4);
  });

  it("unzips a converter reply that is compressed MusicXML", async () => {
    const mxl = readFileSync("tests/fixtures/four-parts.mxl");
    const fetch = vi.fn().mockResolvedValue(new Response(mxl, { status: 200, headers: { "x-experimental": "1" } }));
    const result = await importScore(pdfFile(), { converterUrl: "http://conv/", fetch });
    expect(fetch.mock.calls[0][0]).toBe("http://conv/convert");
    expect(result.xml).toContain("<score-partwise");
  });

  it("needs a converter for formats the browser cannot read", async () => {
    await expect(importScore(pdfFile(), { fetch: vi.fn() })).rejects.toThrow("이 형식은 변환 서버가 필요해요");
  });

  it("explains when the converter cannot be reached", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(importScore(pdfFile(), { converterUrl: "http://conv", fetch })).rejects.toThrow("변환 서버에 연결할 수 없어요");
  });

  it("explains when the converter takes too long", async () => {
    const fetch = vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(importScore(pdfFile(), { converterUrl: "http://conv", fetch })).rejects.toThrow("변환 시간이 너무 오래 걸려요");
  });

  it("passes on the converter's own error message", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: "변환에 실패했어요" }, { status: 500 }));
    await expect(importScore(pdfFile(), { converterUrl: "http://conv", fetch })).rejects.toThrow("변환에 실패했어요");
  });

  it("rejects unsupported files with the detector's guidance", async () => {
    await expect(importScore(new File(["x"], "a.sib"), { fetch: vi.fn() })).rejects.toThrow("MusicXML로 내보내");
  });

  it("stops when the caller cancels", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
      controller.abort();
      return Promise.reject(init.signal?.reason ?? new DOMException("aborted", "AbortError"));
    });
    await expect(importScore(pdfFile(), { converterUrl: "http://conv", fetch, signal: controller.signal })).rejects.toThrow(
      "변환을 취소했어요",
    );
  });
});
