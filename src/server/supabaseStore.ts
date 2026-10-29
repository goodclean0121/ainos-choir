import type { SupabaseClient } from "@supabase/supabase-js";
import { canPublish, summarize, type SongRecord, type SongStore } from "./songStore";

interface SongRow {
  id: string;
  title: string;
  xml: string;
  roles: Record<string, string>;
  status: SongRecord["status"];
  experimental: boolean;
  checked: boolean;
  created_at: string;
  updated_at: string;
}

const SUMMARY_COLUMNS = "id, title, status, experimental, checked, created_at, updated_at";

export function fromRow(row: SongRow): SongRecord {
  return {
    id: row.id,
    title: row.title,
    xml: row.xml,
    roles: row.roles ?? {},
    status: row.status,
    experimental: row.experimental,
    checked: row.checked,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(`저장소 오류: ${error.message}`);
  return data;
}

/**
 * Songs in Supabase. With the secret key it serves members (published songs only, by query);
 * with an admin's session client every call also passes the table's row-level security.
 */
export function createSupabaseStore(client: SupabaseClient): SongStore {
  const songs = () => client.from("songs");
  const summaries = (rows: Omit<SongRow, "xml" | "roles">[]) =>
    rows.map((r) => summarize(fromRow({ ...r, xml: "", roles: {} })));

  return {
    async listPublished() {
      return summaries(check(await songs().select(SUMMARY_COLUMNS).eq("status", "published").order("updated_at", { ascending: false })) ?? []);
    },
    async getPublished(id) {
      const row = check(await songs().select("*").eq("id", id).eq("status", "published").maybeSingle());
      return row ? fromRow(row as SongRow) : null;
    },
    async listAll() {
      return summaries(check(await songs().select(SUMMARY_COLUMNS).order("updated_at", { ascending: false })) ?? []);
    },
    async get(id) {
      const row = check(await songs().select("*").eq("id", id).maybeSingle());
      return row ? fromRow(row as SongRow) : null;
    },
    async create(song) {
      return fromRow(check(await songs().insert(song).select("*").single()) as SongRow);
    },
    async update(id, patch) {
      if (patch.status === "published") {
        const current = await this.get(id);
        if (!current) throw new Error("곡을 찾을 수 없어요");
        const reason = canPublish({ ...current, ...patch });
        if (reason) throw new Error(reason);
      }
      return fromRow(check(await songs().update(patch).eq("id", id).select("*").single()) as SongRow);
    },
    async remove(id) {
      check(await songs().delete().eq("id", id));
    },
    async getAccess() {
      const row = check(await client.from("choir_access").select("passcode_hash, version").eq("id", 1).maybeSingle());
      return row ? { hash: row.passcode_hash as string, version: row.version as number } : null;
    },
    async setAccess(hash) {
      // The table trigger bumps the version when the hash changes.
      const row = check(
        await client.from("choir_access").upsert({ id: 1, passcode_hash: hash }).select("passcode_hash, version").single(),
      );
      if (!row) throw new Error("암호를 저장하지 못했어요");
      return { hash: row.passcode_hash as string, version: row.version as number };
    },
  };
}
