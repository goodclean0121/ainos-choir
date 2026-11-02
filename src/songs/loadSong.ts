export interface Song {
  title: string;
  xml: string;
  /** Roles confirmed by the admin; without them they are worked out from part names. */
  roles?: Record<string, string>;
}

export const IMPORTED_ID = "imported";
export const IMPORTED_KEY = "ainos:imported";
const NOT_FOUND = "곡을 찾을 수 없어요";

/** Hands a freshly imported score to the practice screen (this tab only, until songs are saved on the server). */
export function saveImported(song: Song) {
  sessionStorage.setItem(IMPORTED_KEY, JSON.stringify(song));
}

/** Loads a song in the browser. Only imported scores live here; saved songs come from the server. */
export async function loadSong(id: string): Promise<Song> {
  if (id !== IMPORTED_ID) throw new Error(NOT_FOUND);
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(IMPORTED_KEY);
  } catch {
    // storage blocked: fall through to "not found"
  }
  if (!saved) throw new Error(NOT_FOUND);
  return JSON.parse(saved) as Song;
}
