import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Practice } from "./Practice";

export const metadata: Metadata = { title: "연습하기 - 아이노스 찬양연습" };

export default function SongPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="page page-practice">
      <p className="back">
        <Link href="/">← 곡 목록</Link>
      </p>
      <Suspense fallback={<p role="status">곡을 불러오고 있어요…</p>}>
        <Practice params={params} />
      </Suspense>
    </main>
  );
}
