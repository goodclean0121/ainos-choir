import { describe, expect, it } from "vitest";
import { canvasPixelRatio, fitScale, pagesPerScreen, pdfBytes } from "@/pdf/fit";

describe("fitScale", () => {
  it("fits a portrait page to the box height when the box is wide", () => {
    expect(fitScale({ width: 600, height: 800 }, { width: 1000, height: 400 })).toBeCloseTo(0.5);
  });
  it("fits to the box width when the box is narrow", () => {
    expect(fitScale({ width: 600, height: 800 }, { width: 300, height: 2000 })).toBeCloseTo(0.5);
  });
  it("multiplies by zoom", () => {
    expect(fitScale({ width: 600, height: 800 }, { width: 300, height: 2000 }, 2)).toBeCloseTo(1);
  });
  it("is 0 for an empty box", () => {
    expect(fitScale({ width: 600, height: 800 }, { width: 0, height: 0 })).toBe(0);
  });
});

describe("canvasPixelRatio", () => {
  it("keeps the device ratio for small canvases", () => {
    expect(canvasPixelRatio(500, 700, 2)).toBe(2);
  });
  it("lowers the ratio so the canvas stays under the pixel budget", () => {
    const r = canvasPixelRatio(3000, 4000, 2, 12_000_000);
    expect(3000 * r * 4000 * r).toBeLessThanOrEqual(12_000_000 + 1);
    expect(r).toBeLessThan(2);
  });
});

describe("pdfBytes", () => {
  it("decodes a base64 data URL without fetching", async () => {
    const bytes = await pdfBytes("data:application/pdf;base64,JVBERi0=", () => {
      throw new Error("should not fetch");
    });
    expect(new TextDecoder().decode(bytes)).toBe("%PDF-");
  });
  it("fetches other URLs", async () => {
    const bytes = await pdfBytes("/scores/a.pdf", async (url) => {
      expect(url).toBe("/scores/a.pdf");
      return new Response(new Uint8Array([37, 80]));
    });
    expect(Array.from(bytes)).toEqual([37, 80]);
  });
  it("fails clearly when the download fails", async () => {
    await expect(pdfBytes("/x.pdf", async () => new Response("", { status: 404 }))).rejects.toThrow(/악보 파일/);
  });
});

describe("pagesPerScreen", () => {
  it("shows two pages side by side on a landscape tablet at the fitted size", () => {
    expect(pagesPerScreen({ width: 1150, height: 640 }, 1)).toBe(2);
  });
  it("shows one page in portrait", () => {
    expect(pagesPerScreen({ width: 760, height: 1100 }, 1)).toBe(1);
  });
  it("shows one page once the reader zooms in", () => {
    expect(pagesPerScreen({ width: 1150, height: 640 }, 1.3)).toBe(1);
  });
});
