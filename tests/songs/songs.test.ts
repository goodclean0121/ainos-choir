import { afterEach, describe, expect, it, vi } from "vitest";
import { IMPORTED_KEY, loadSong, saveImported } from "@/songs/loadSong";
import { recallPart, rememberPart } from "@/songs/myPart";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe("loadSong", () => {
  it("does not load saved songs in the browser", async () => {
    await expect(loadSong("some-id")).rejects.toThrow("곡을 찾을 수 없어요");
  });

  it("opens the score handed over from the import screen", async () => {
    saveImported({ title: "가져온 곡", xml: "<x/>", roles: { P1: "S" } });
    expect(sessionStorage.getItem(IMPORTED_KEY)).not.toBeNull();
    await expect(loadSong("imported")).resolves.toEqual({ title: "가져온 곡", xml: "<x/>", roles: { P1: "S" } });
  });

  it("says when there is no imported score", async () => {
    await expect(loadSong("imported")).rejects.toThrow("곡을 찾을 수 없어요");
  });
});

describe("my part", () => {
  it("remembers my part for each song", () => {
    rememberPart("demo", "P2");
    expect(recallPart("demo")).toBe("P2");
    expect(recallPart("other")).toBeUndefined();
  });

  it("keeps working when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberPart("demo", "P2")).not.toThrow();
    expect(recallPart("demo")).toBeUndefined();
  });
});
