import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireMember } from "@/server/member";
import { getServerStore } from "@/server/store";
import { IMPORTED_ID } from "@/songs/loadSong";
import { Practice } from "./Practice";

export const metadata: Metadata = { title: "연습하기 - 아이노스 찬양연습" };

async function Song({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  // A score handed over from the import screen lives only in this browser tab.
  if (id === IMPORTED_ID) return <Practice songId={id} />;
  await requireMember(`/songs/${encodeURIComponent(id)}`);
  const song = /^[0-9a-f-]{36}$/i.test(id) ? await getServerStore().getPublished(id) : null;
  if (!song) {
    return (
      <div className="notice notice-error" role="alert">
        <p>곡을 찾을 수 없어요</p>
      </div>
    );
  }
  return <Practice songId={id} song={{ title: song.title, xml: song.xml, roles: song.roles }} />;
}

export default function SongPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="page page-practice">
      <p className="back">
        <Link href="/">← 곡 목록</Link>
      </p>
      <Suspense fallback={<p role="status">곡을 불러오고 있어요…</p>}>
        <Song params={params} />
      </Suspense>
    </main>
  );
}
