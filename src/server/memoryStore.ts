import { randomUUID } from "node:crypto";
import { canPublish, summarize, type ChoirAccess, type NewSong, type SongRecord, type SongStatus, type SongStore } from "./songStore";

interface Seed {
  songs?: (NewSong & { status?: SongStatus; checked?: boolean })[];
  access?: ChoirAccess;
}

/** In-memory store for tests and the e2e test mode. Not used in production. */
export function createMemoryStore(seed: Seed = {}): SongStore {
  const songs = new Map<string, SongRecord>();
  let access: ChoirAccess | null = seed.access ?? null;
  const now = () => new Date().toISOString();

  for (const s of seed.songs ?? []) {
    const id = randomUUID();
    songs.set(id, { status: "draft", checked: false, ...s, id, createdAt: now(), updatedAt: now() });
  }

  const byNewest = (a: SongRecord, b: SongRecord) => b.updatedAt.localeCompare(a.updatedAt);

  return {
    async listPublished() {
      return [...songs.values()].filter((s) => s.status === "published").sort(byNewest).map(summarize);
    },
    async getPublished(id) {
      const song = songs.get(id);
      return song?.status === "published" ? song : null;
    },
    async listAll() {
      return [...songs.values()].sort(byNewest).map(summarize);
    },
    async get(id) {
      return songs.get(id) ?? null;
    },
    async create(input) {
      const song: SongRecord = { ...input, id: randomUUID(), status: "draft", checked: false, createdAt: now(), updatedAt: now() };
      songs.set(song.id, song);
      return song;
    },
    async update(id, patch) {
      const song = songs.get(id);
      if (!song) throw new Error("곡을 찾을 수 없어요");
      const next = { ...song, ...patch, updatedAt: now() };
      if (patch.status === "published") {
        const reason = canPublish(next);
        if (reason) throw new Error(reason);
      }
      songs.set(id, next);
      return next;
    },
    async remove(id) {
      songs.delete(id);
    },
    async getAccess() {
      return access;
    },
    async setAccess(hash) {
      access = { hash, version: (access?.version ?? 0) + 1 };
      return access;
    },
  };
}
