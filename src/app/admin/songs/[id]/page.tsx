import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminStore } from "@/server/admin";
import { requireAdmin } from "@/server/requireAdmin";
import { Practice } from "../../../songs/[id]/Practice";
import { AdminNav } from "../../AdminShell";
import { SongControls } from "./SongControls";

export const metadata: Metadata = { title: "곡 확인 - 아이노스 찬양연습" };

async function AdminSong({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const song = /^[0-9a-f-]{36}$/i.test(id) ? await (await getAdminStore()).get(id) : null;
  if (!song) {
    return (
      <>
        <AdminNav email={admin.email} />
        <p className="notice notice-error">곡을 찾을 수 없어요</p>
      </>
    );
  }
  return (
    <>
      <AdminNav email={admin.email} />
      <SongControls id={song.id} title={song.title} status={song.status} experimental={song.experimental} checked={song.checked} />
      <h2 className="preview-title">단원 화면 미리 보기</h2>
      <Practice songId={`admin-${song.id}`} song={{ title: song.title, xml: song.xml, roles: song.roles }} />
    </>
  );
}

export default function AdminSongPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="page page-practice">
      <Suspense fallback={<p role="status">불러오는 중…</p>}>
        <AdminSong params={params} />
      </Suspense>
    </main>
  );
}
