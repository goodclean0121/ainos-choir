export interface SongEntry {
  id: string;
  title: string;
  file: string;
}

export interface Song {
  title: string;
  xml: string;
  /** Roles picked on the import screen; songs from the list work them out from part names. */
  roles?: Record<string, string>;
}

export const IMPORTED_ID = "imported";
export const IMPORTED_KEY = "ainos:imported";
const NOT_FOUND = "곡을 찾을 수 없어요";

export async function listSongs(fetchFn: typeof fetch = fetch): Promise<SongEntry[]> {
  const res = await fetchFn("/songs/index.json");
  if (!res.ok) throw new Error("곡 목록을 불러오지 못했어요");
  return res.json();
}

/** Hands a freshly imported score to the practice screen (this tab only, until songs are saved on the server). */
export function saveImported(song: Song) {
  sessionStorage.setItem(IMPORTED_KEY, JSON.stringify(song));
}

export async function loadSong(id: string, deps: { fetch?: typeof fetch } = {}): Promise<Song> {
  if (id === IMPORTED_ID) {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(IMPORTED_KEY);
    } catch {
      // storage blocked: fall through to "not found"
    }
    if (!saved) throw new Error(NOT_FOUND);
    return JSON.parse(saved) as Song;
  }
  const fetchFn = deps.fetch ?? fetch;
  const entry = (await listSongs(fetchFn)).find((s) => s.id === id);
  if (!entry) throw new Error(NOT_FOUND);
  const res = await fetchFn(`/songs/${entry.file}`);
  if (!res.ok) throw new Error("악보 파일을 불러오지 못했어요");
  return { title: entry.title, xml: await res.text() };
}
