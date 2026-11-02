export type Video = {
  id: string;
  title: string;
  /** When the file was added to the folder (ISO time). */
  date: string;
  duration: string;
  thumbnail?: string;
  embedUrl: string;
};

/** The folder id from a "share folder" link, or the id itself. */
export function driveFolderId(input: string): string | undefined {
  const text = input.trim();
  const fromLink = /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/.exec(text);
  if (fromLink) return fromLink[1];
  return /^[\w-]{6,}$/.test(text) ? text : undefined;
}

export function formatDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return "";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

type DriveFile = {
  id: string;
  name: string;
  createdTime: string;
  thumbnailLink?: string;
  videoMediaMetadata?: { durationMillis?: string };
};

/**
 * The videos in a Drive folder shared as "anyone with the link", newest first.
 * A video dropped into the folder shows up on the next call; nothing else needs updating.
 */
export async function listDriveVideos(
  folderId: string,
  apiKey: string,
  fetcher: (url: string) => Promise<Response> = fetch,
): Promise<Video[]> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`);
  url.searchParams.set("orderBy", "createdTime desc");
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("fields", "files(id,name,createdTime,thumbnailLink,videoMediaMetadata(durationMillis))");
  url.searchParams.set("key", apiKey);

  const res = await fetcher(url.toString());
  if (!res.ok) {
    throw new Error(`드라이브 폴더를 읽지 못했어요 (${res.status}). 폴더가 '링크가 있는 모든 사용자'에게 공유됐는지 확인해 주세요.`);
  }
  const { files = [] } = (await res.json()) as { files?: DriveFile[] };
  return files.map((f) => ({
    id: f.id,
    title: f.name.replace(/\.[^.]+$/, ""),
    date: f.createdTime,
    duration: formatDuration(Number(f.videoMediaMetadata?.durationMillis)),
    // Drive hands out a small thumbnail; the size suffix asks for a sharper one.
    thumbnail: f.thumbnailLink?.replace(/=s\d+$/, "=s640"),
    embedUrl: `https://drive.google.com/file/d/${f.id}/preview`,
  }));
}
