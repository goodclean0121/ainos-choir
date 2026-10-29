export type SongStatus = "draft" | "published";

export interface SongRecord {
  id: string;
  title: string;
  xml: string;
  /** Part id → role (S, A, T1, …) as confirmed by the admin. */
  roles: Record<string, string>;
  status: SongStatus;
  /** Made by automatic recognition (PDF, photo): needs a listening check before publishing. */
  experimental: boolean;
  /** The admin listened and confirmed the notes. */
  checked: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SongSummary = Omit<SongRecord, "xml" | "roles">;

export interface NewSong {
  title: string;
  xml: string;
  roles: Record<string, string>;
  experimental: boolean;
}

export type SongPatch = Partial<Pick<SongRecord, "title" | "roles" | "status" | "checked">>;

export interface ChoirAccess {
  hash: string;
  version: number;
}

export interface SongStore {
  listPublished(): Promise<SongSummary[]>;
  getPublished(id: string): Promise<SongRecord | null>;
  listAll(): Promise<SongSummary[]>;
  get(id: string): Promise<SongRecord | null>;
  create(song: NewSong): Promise<SongRecord>;
  update(id: string, patch: SongPatch): Promise<SongRecord>;
  remove(id: string): Promise<void>;
  getAccess(): Promise<ChoirAccess | null>;
  /** Stores a new passcode hash and bumps the version, signing every device out. */
  setAccess(hash: string): Promise<ChoirAccess>;
}

/** Why a song cannot be published yet, or null when it can. */
export function canPublish(song: Pick<SongRecord, "experimental" | "checked">): string | null {
  if (song.experimental && !song.checked) return "자동 인식한 악보예요. 파트마다 들어 보고 확인한 뒤에 공개할 수 있어요.";
  return null;
}

export function summarize(song: SongRecord): SongSummary {
  const { id, title, status, experimental, checked, createdAt, updatedAt } = song;
  return { id, title, status, experimental, checked, createdAt, updatedAt };
}
