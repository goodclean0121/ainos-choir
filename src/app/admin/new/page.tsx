import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/server/requireAdmin";
import { AdminNav } from "../AdminShell";
import { saveDraft } from "../actions";
import { ImportScore } from "../../import/ImportScore";

export const metadata: Metadata = { title: "새 곡 올리기 - 아이노스 찬양연습" };

async function NewSong() {
  const admin = await requireAdmin();
  return (
    <>
      <AdminNav email={admin.email} />
      <h1>새 곡 올리기</h1>
      <p className="lead">악보 파일을 올리면 파트를 나눠서 보여 드려요. 파트 역할을 확인하고 들어 본 뒤 저장하세요.</p>
      <ImportScore converterUrl={process.env.NEXT_PUBLIC_CONVERTER_URL} onSave={saveDraft} />
    </>
  );
}

export default function NewSongPage() {
  return (
    <main className="page">
      <Suspense fallback={<p role="status">불러오는 중…</p>}>
        <NewSong />
      </Suspense>
    </main>
  );
}
