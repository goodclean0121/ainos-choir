const key = (songId: string) => `ainos:part:${songId}`;

/** Remembers my part for a song on this device. Private browsing may block storage; that is fine. */
export function rememberPart(songId: string, partId: string) {
  try {
    localStorage.setItem(key(songId), partId);
  } catch {
    // ignore
  }
}

export function recallPart(songId: string): string | undefined {
  try {
    return localStorage.getItem(key(songId)) ?? undefined;
  } catch {
    return undefined;
  }
}
