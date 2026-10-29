import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminStore } from "@/server/admin";
import { requireAdmin } from "@/server/requireAdmin";
import { AdminNav } from "./AdminShell";

export const metadata: Metadata = { title: "곡 관리 - 아이노스 찬양연습" };

const dateFormat = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });

async function Songs() {
  const admin = await requireAdmin();
  const songs = await (await getAdminStore()).listAll();
  return (
    <>
      <AdminNav email={admin.email} />
      <h1>곡 관리</h1>
      {songs.length === 0 ? (
        <p className="hint">
          아직 곡이 없어요. <Link href="/admin/new">새 곡 올리기</Link>로 시작하세요.
        </p>
      ) : (
        <ul className="songs admin-songs">
          {songs.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/songs/${s.id}`}>
                <span>{s.title}</span>
                <span className={`badge badge-${s.status}`}>{s.status === "published" ? "공개" : "초안"}</span>
              </Link>
              <span className="song-meta">{dateFormat.format(new Date(s.updatedAt))} 수정</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AdminHome() {
  return (
    <main className="page">
      <Suspense fallback={<p role="status">불러오는 중…</p>}>
        <Songs />
      </Suspense>
    </main>
  );
}
