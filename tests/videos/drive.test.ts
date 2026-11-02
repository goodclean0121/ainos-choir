import { describe, expect, it } from "vitest";
import { driveFolderId, formatDuration, listDriveVideos } from "@/videos/drive";

describe("driveFolderId", () => {
  it("takes the id from a shared folder link", () => {
    expect(driveFolderId("https://drive.google.com/drive/folders/1AbC_d-9?usp=sharing")).toBe("1AbC_d-9");
  });
  it("accepts a bare id", () => {
    expect(driveFolderId(" 1AbC_d-9 ")).toBe("1AbC_d-9");
  });
  it("rejects other links", () => {
    expect(driveFolderId("https://example.com/x")).toBeUndefined();
  });
});

describe("formatDuration", () => {
  it("shows minutes and seconds", () => expect(formatDuration(245_000)).toBe("4:05"));
  it("shows hours when needed", () => expect(formatDuration(3_725_000)).toBe("1:02:05"));
  it("is empty when unknown", () => expect(formatDuration(undefined)).toBe(""));
});

describe("listDriveVideos", () => {
  it("asks Drive for the folder's videos, newest first, and maps them", async () => {
    let asked = "";
    const videos = await listDriveVideos("FOLDER", "KEY", async (url) => {
      asked = url;
      return Response.json({
        files: [
          {
            id: "v1",
            name: "2026 성탄 칸타타.mp4",
            createdTime: "2026-12-24T10:00:00Z",
            thumbnailLink: "https://lh3.googleusercontent.com/t=s220",
            videoMediaMetadata: { durationMillis: "245000" },
          },
        ],
      });
    });
    const q = new URL(asked);
    expect(q.origin + q.pathname).toBe("https://www.googleapis.com/drive/v3/files");
    expect(q.searchParams.get("q")).toBe("'FOLDER' in parents and mimeType contains 'video/' and trashed = false");
    expect(q.searchParams.get("orderBy")).toBe("createdTime desc");
    expect(q.searchParams.get("key")).toBe("KEY");
    expect(videos).toEqual([
      {
        id: "v1",
        title: "2026 성탄 칸타타",
        date: "2026-12-24T10:00:00Z",
        duration: "4:05",
        thumbnail: "https://lh3.googleusercontent.com/t=s640",
        embedUrl: "https://drive.google.com/file/d/v1/preview",
      },
    ]);
  });

  it("fails with a reason when Drive refuses", async () => {
    await expect(listDriveVideos("F", "K", async () => new Response("", { status: 403 }))).rejects.toThrow(/공유/);
  });
});
