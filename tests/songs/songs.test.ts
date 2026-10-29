import { afterEach, describe, expect, it, vi } from "vitest";
import { IMPORTED_KEY, loadSong, saveImported } from "@/songs/loadSong";
import { recallPart, rememberPart } from "@/songs/myPart";

const index = [{ id: "demo", title: "연습용 예제", file: "demo.musicxml" }];

function fakeFetch(files: Record<string, string>) {
  const calls: string[] = [];
  const fetch = (async (url: string) => {
    calls.push(url);
    const body = files[url];
    return body === undefined
      ? new Response("missing", { status: 404 })
      : new Response(body, { status: 200 });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe("loadSong", () => {
  it("reads the song list, then the song file", async () => {
    const f = fakeFetch({ "/songs/index.json": JSON.stringify(index), "/songs/demo.musicxml": "<score/>" });
    await expect(loadSong("demo", { fetch: f.fetch })).resolves.toEqual({ title: "연습용 예제", xml: "<score/>" });
    expect(f.calls).toEqual(["/songs/index.json", "/songs/demo.musicxml"]);
  });

  it("says when a song does not exist", async () => {
    const f = fakeFetch({ "/songs/index.json": JSON.stringify(index) });
    await expect(loadSong("nope", { fetch: f.fetch })).rejects.toThrow("곡을 찾을 수 없어요");
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
