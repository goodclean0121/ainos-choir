import Link from "next/link";
import { Suspense } from "react";
import { requireMember } from "@/server/member";
import { getServerStore } from "@/server/store";

async function SongList() {
  await requireMember("/");
  const songs = await getServerStore().listPublished();
  if (songs.length === 0) return <p className="hint">아직 공개된 곡이 없어요.</p>;
  return (
    <ul className="songs">
      {songs.map((s) => (
        <li key={s.id}>
          <Link href={`/songs/${s.id}`}>{s.title}</Link>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="page">
      <h1>아이노스 찬양연습</h1>
      <p className="lead">곡을 고르고 내 파트를 정하면, 내 음만 진하게 보면서 따라 부를 수 있어요.</p>
      <Suspense fallback={<p role="status">곡 목록을 불러오고 있어요…</p>}>
        <SongList />
      </Suspense>
      <p className="home-admin">
        <Link href="/admin">관리자</Link>
      </p>
    </main>
  );
}
