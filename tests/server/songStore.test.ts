import { describe, expect, it } from "vitest";
import { canPublish, type SongRecord } from "@/server/songStore";
import { createMemoryStore } from "@/server/memoryStore";

const input = { title: "곡", xml: "<x/>", roles: { P1: "S" }, experimental: false };

describe("canPublish", () => {
  const base: SongRecord = {
    id: "a", title: "곡", xml: "<x/>", roles: {}, status: "draft",
    experimental: false, checked: false, createdAt: "", updatedAt: "",
  };
  it("allows exact scores", () => expect(canPublish(base)).toBeNull());
  it("asks for a listening check on auto-recognised scores", () => {
    expect(canPublish({ ...base, experimental: true })).toMatch("들어 보고");
    expect(canPublish({ ...base, experimental: true, checked: true })).toBeNull();
  });
});

describe("memory store", () => {
  it("keeps drafts away from members", async () => {
    const store = createMemoryStore();
    const song = await store.create(input);
    expect(song.status).toBe("draft");
    expect(await store.listPublished()).toEqual([]);
    expect(await store.getPublished(song.id)).toBeNull();
    expect((await store.listAll()).map((s) => s.id)).toEqual([song.id]);

    await store.update(song.id, { status: "published" });
    expect((await store.listPublished()).map((s) => s.title)).toEqual(["곡"]);
    expect((await store.getPublished(song.id))?.xml).toBe("<x/>");
  });

  it("refuses to publish an unchecked auto-recognised score", async () => {
    const store = createMemoryStore();
    const song = await store.create({ ...input, experimental: true });
    await expect(store.update(song.id, { status: "published" })).rejects.toThrow("들어 보고");
    await store.update(song.id, { checked: true });
    await expect(store.update(song.id, { status: "published" })).resolves.toMatchObject({ status: "published" });
  });

  it("removes songs", async () => {
    const store = createMemoryStore();
    const song = await store.create(input);
    await store.remove(song.id);
    expect(await store.get(song.id)).toBeNull();
  });

  it("bumps the passcode version on every change", async () => {
    const store = createMemoryStore();
    expect(await store.getAccess()).toBeNull();
    await store.setAccess("h1");
    expect(await store.getAccess()).toEqual({ hash: "h1", version: 1 });
    await store.setAccess("h2");
    expect(await store.getAccess()).toEqual({ hash: "h2", version: 2 });
  });

  it("can start with seed songs", async () => {
    const store = createMemoryStore({ songs: [{ ...input, title: "예제", status: "published" }] });
    expect((await store.listPublished()).map((s) => s.title)).toEqual(["예제"]);
  });
});
